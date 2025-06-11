const jwt = require("jsonwebtoken");
const createResponse = require("../utils/createResponse");
const pool = require("../utils/connectDB");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
const Joi = require("joi");
const clients = [];
const http = require("http");
const { fetchOrder } = require("./CafeController");

const orderItemSchema = Joi.object({
  id: Joi.string().min(3).max(100).required(),
  variant: Joi.string().min(1).max(100),
  quantity: Joi.number().required(),
});

wss.on("connection", (ws) => {
  clients.push(ws);
  ws.on("close", () => {
    clients.splice(clients.indexOf(ws), 1);
  });
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running!");
});

const wss2 = new WebSocket.Server({ server });

const connectedClients = {};

wss2.on("connection", (ws, req) => {
  const url = new URL(req.url, process.env.WEBSOCKET_ORDER);
  const page = url.searchParams.get("page");

  connectedClients[page] = connectedClients[page] || [];
  connectedClients[page].push(ws);

  ws.on("message", (message) => {
    if (connectedClients[page]) {
      connectedClients[page].forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  ws.on("close", () => {
    if (connectedClients[page]) {
      connectedClients[page] = connectedClients[page].filter(
        (client) => client !== ws
      );
    }
    wss2.emit("connection", ws, req);
  });

  // retry connection on disconnection and error
  ws.on("error", () => {
    ws.terminate();
    setTimeout(() => {
      wss2.emit("connection", ws, req);
    }, 5000);
  });
});

server.listen(8081, () => {
  console.log(`WebSocket server listening on ${process.env.WEBSOCKET_ORDER}`);
});

function broadcastOrderToCafeAdmin(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const OrderDB = "orders";
const ItemDB = "item";
const OrderItemDB = "orderitem";
const UserDB = "userbase";
const CafeDB = "cafe";
const RepeatOrderDB = "repeatorders";
module.exports = {
  createSession: async function (req, res) {
    try {
      const { cafe } = req.params;
      const { table } = req.query;
      if (!table || !cafe)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Request", null));

      const cafeInDB = await pool.query(
        `SELECT openStatus FROM ${CafeDB} WHERE _id = $1`,
        [cafe]
      );
      const cafeIsOpen = cafeInDB.rows[0].openstatus;
      if (!cafeIsOpen)
        return res
          .status(400)
          .json(createResponse(400, "Cafe is Closed", null));

      const createOrder = await pool.query(
        `INSERT INTO ${OrderDB} (tableNumber, cafe) VALUES ($1, $2) RETURNING _id`,
        [table, cafe]
      );
      const order = createOrder.rows[0];
      jwt.sign(
        { order: order._id },
        process.env.SECURITY_KEY,
        {
          expiresIn: 360000,
        },
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { httpOnly: true })
            .json(createResponse(200, "Session Created", token));
        }
      );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  placeOrder: async function (req, res) {
    const { order, cafe } = req;
    let { items, orderType, note, lastOrderId } = req.body;

    if(lastOrderId === 'undefined' || lastOrderId === 'null') {
      lastOrderId = null;
    }

    if (!items || !items.length) {
      return res.status(400).json(createResponse(400, "No Items", null));
    }

    try {
      let totalAmount = 0;
      let ids = [];
      for (item of items) {
        const { error } = orderItemSchema.validate(item);
        if (error)
          return res
            .status(400)
            .json(createResponse(400, "Invalid Payload", error.message));
      }
      let itemsData = [];
      for (item of items) {
        const itemFromDB = await pool.query(
          `SELECT name, price FROM ${ItemDB} WHERE _id = $1`,
          [item.id]
        );

        if (!itemFromDB.rows[0]) {
          return res
            .status(400)
            .json(createResponse(400, "No Items Found", null));
        }

        itemsData.push({
          name: itemFromDB.rows[0].name,
          price: itemFromDB.rows[0].price,
          quantity: item.quantity,
          variant: item.variant,
        });

        const createItem = await pool.query(
          `INSERT INTO ${OrderItemDB} (item, quantity, variant, price) VALUES ($1, $2, $3, $4) RETURNING _id`,
          [item.id, item.quantity, item.variant, itemFromDB.rows[0].price]
        );

        ids.push(createItem.rows[0]._id);
        totalAmount += itemFromDB.rows[0].price * item.quantity;
      }

      const createOrder = await pool.query(
        `UPDATE ${OrderDB} SET items = $1, cafe = $2, amount = $3, status = $4, orderType = $5, note = $6 WHERE _id = $7 returning *`,
        [
          ids,
          cafe,
          totalAmount,
          "ORDERED",
          orderType || "DINEIN",
          note,
          order,
        ]
      );

      const lastOrder = await pool.query(
        `SELECT _id, orders FROM ${RepeatOrderDB} WHERE $1 = ANY(orders)`,
        [lastOrderId]
      );
      if (lastOrder.rows[0]) {
        const orders = lastOrder.rows[0].orders;
        orders.push(order);
        pool.query(
          `UPDATE ${RepeatOrderDB} SET orders = $1 WHERE _id = $2`,
          [orders, lastOrder.rows[0]._id]
        );
      } else {
        pool.query(
          `INSERT INTO ${RepeatOrderDB} (cafe, orders) VALUES ($1, $2)`,
          [cafe, [order]]
        );
      }


      const newOrder = createOrder.rows[0];
      const brodcastMessage = {
        items: itemsData,
        orderId: order,
        tablenumber: newOrder.tablenumber,
        orderType: newOrder.ordertype,
        status: "ORDERED"
      };
      broadcastOrderToCafeAdmin(JSON.stringify(brodcastMessage));
      res.json(createResponse(200, "Order Placed", newOrder));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchOrder: async function (req, res) {
    try {
      const { order: id } = req;
      const result = await pool.query(
        `SELECT * FROM ${OrderDB} WHERE _id = $1`,
        [id]
      );
      const order = result.rows[0];
      if (!order)
        return res
          .status(400)
          .json(createResponse(400, "No Order", "Invalid Order ID"));
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const itemRequest = await pool.query(
          `SELECT * FROM ${OrderItemDB} RIGHT OUTER JOIN item ON item._id = orderitem.item WHERE orderitem._id = $1`,
          [item]
        );
        const itemDetails = itemRequest.rows[0];
        order.items[i] = itemDetails;
      }
      res.json(createResponse(200, "Order Fetched", order));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  userSignup: async function (req, res) {
    try {
      const { name, phone, city, token = "" } = req.body;
      const userRow = await pool.query(
        `SELECT * FROM ${UserDB} WHERE phone = $1`,
        [phone]
      );
      if (userRow.rows[0]) {
        // user already exists
        await pool.query(`UPDATE ${OrderDB} SET customer = $1 WHERE _id = $2`, [
          userRow.rows[0].phone,
          req.order,
        ]);
        const cafeVisited = userRow.rows[0].cafevisited;
        const orders = userRow.rows[0].orders;
        const topics = userRow.rows[0].topics;
        orders.push(req.order);
        topics.push(req.order);
        if (!cafeVisited.includes(req.cafe)) {
          cafeVisited.push(req.cafe);
          topics.push(req.cafe);
        }
        const tokenToUpdate = token || userRow.rows[0].vapidpublickey;
        await pool.query(
          `UPDATE ${UserDB} SET cafevisited = $1, orders = $2, vapidpublickey = $3 WHERE phone = $4`,
          [cafeVisited, orders, tokenToUpdate, phone]
        );
      } else {
        const userRow = await pool.query(
          `INSERT INTO ${UserDB} (name, phone, city, cafevisited, orders, topics, vapidpublickey) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING phone`,
          [
            name,
            phone,
            city,
            [req.cafe],
            [req.order],
            [req.cafe, req.order],
            token,
          ]
        );
        await pool.query(`UPDATE ${OrderDB} SET customer = $1 WHERE _id = $2`, [
          userRow.rows[0].phone,
          req.order,
        ]);
      }
      res.json(createResponse(200, "User Updated", null));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  getOrderStatus: async function (req, res) {
    try {
      const result = await pool.query(
        `SELECT status FROM ${OrderDB} WHERE _id = $1`,
        [req.order]
      );
      res.json(
        createResponse(200, "Order Status fetched", result.rows[0].status)
      );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  review: {
    getOrderForReview: async function (req, res) {
      try {
        const { orderId } = req.params;
        console.log({ orderId });
        const result = await pool.query(
          `SELECT items FROM ${OrderDB} WHERE _id = $1 AND rating IS NULL AND array_length(items, 1) > 0`,
          [orderId]
        );
        const order = result.rows[0];
        if (!order)
          return res
            .status(400)
            .json(createResponse(400, "No Order Found", null));
        const orderItems = order.items;
        const itemsToReview = [];
        for (item of orderItems) {
          const orderItems = await pool.query(
            `SELECT * FROM ${OrderItemDB} WHERE _id = $1`,
            [item]
          );
          const orderItem = orderItems.rows[0];
          const itemRow = await pool.query(
            `SELECT name, image FROM ${ItemDB} WHERE _id = $1`,
            [orderItem.item]
          );
          const itemFromDb = itemRow.rows[0];
          itemsToReview.push({
            name: itemFromDb.name,
            image: itemFromDb.image,
            id: item,
            rating: orderItem.rating,
          });
        }
        res.json(
          createResponse(200, "Order Fetched", {
            itemsToReview,
            order: order._id,
          })
        );
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
      }
    },
    addOrderRating: async function (req, res) {
      try {
        const { rating } = req.body;
        const { order } = req.params;
        if (rating < 1 || rating > 5)
          return res
            .status(400)
            .json(createResponse(400, "Invalid Rating", null));
        const orderFromDB = await pool.query(
          `UPDATE ${OrderDB} SET rating = $1 WHERE _id = $2 RETURNING cafe`,
          [rating, order]
        );
        const cafeFromDB = orderFromDB.rows[0].cafe;

        const ratingFromDB = await pool.query(
          `SELECT rating, ratingCount FROM ${CafeDB} WHERE _id = $1`,
          [cafeFromDB]
        );
        const ratingDB = ratingFromDB.rows[0].rating;
        const ratingCountDB = ratingFromDB.rows[0].ratingcount;

        const newRating =
          (ratingDB * ratingCountDB + rating) / (ratingCountDB + 1);

        await pool.query(
          `UPDATE ${CafeDB} SET rating = $1, ratingcount = $2 WHERE _id = $3`,
          [newRating, ratingCountDB + 1, cafeFromDB]
        );
        res.json(createResponse(200, "Rating Added", newRating));
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
      }
    },
    addOrderReview: async function (req, res) {
      try {
        const { review } = req.body;
        const { order } = req.params;
        const result = await pool.query(
          `UPDATE ${OrderDB} SET review = $1 WHERE _id = $2 RETURNING review`,
          [review, order]
        );
        res.json(createResponse(200, "Review Added", result.rows[0].review));
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
      }
    },
    addItemRating: async function (req, res) {
      try {
        const { rating } = req.body;
        const { item } = req.params;
        if (rating < 1 || rating > 5)
          return res
            .status(400)
            .json(createResponse(400, "Invalid Rating", null));
        const itemsFromDB = await pool.query(
          `UPDATE ${OrderItemDB} SET rating = $1 WHERE _id = $2 RETURNING item`,
          [rating, item]
        );
        if (!itemsFromDB.rows[0])
          return res
            .status(400)
            .json(createResponse(400, "No Item Found", null));
        const itemFromDB = itemsFromDB.rows[0].item;
        const ratingFromDB = await pool.query(
          `SELECT rating, ratingcount FROM ${ItemDB} WHERE _id = $1`,
          [itemFromDB]
        );
        const ratingDB = ratingFromDB.rows[0].rating;
        const ratingCountDB = ratingFromDB.rows[0].ratingcount;

        const newRating =
          (ratingDB * ratingCountDB + rating) / (ratingCountDB + 1);

        await pool.query(
          `UPDATE ${ItemDB} SET rating = $1, ratingCount = $2 WHERE _id = $3`,
          [newRating, ratingCountDB + 1, itemFromDB]
        );

        res.json(createResponse(200, "Rating Added", newRating));
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
      }
    },
    addItemReview: async function (req, res) {
      try {
        const { review } = req.body;
        const { item } = req.params;
        const result = await pool.query(
          `UPDATE ${OrderItemDB} SET review = $1 WHERE _id = $2 RETURNING review`,
          [review, item]
        );
        res.json(createResponse(200, "Review Added", result.rows[0].review));
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
      }
    },
  },
  subscribeToNotifications: async function (req, res) {
    try {
      const { token } = req.body;
      if (!token)
        return res.status(400).json(createResponse(400, "Invalid Token", null));
      const { order, cafe } = req;
      await getMessaging().subscribeToTopic(token, order);
      await getMessaging().subscribeToTopic(token, cafe);
      res.json(createResponse(200, "Subscribed", null));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  getCafeFromAlert: async function (req, res) {
    try {
      const { cafe } = req.params;

      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [cafe]
      );
      const cafeDetails = result.rows[0];
      if (!cafeDetails)
        return res.status(400).json(createResponse(400, "No Cafe Found", null));

      const alertsResult = await pool.query(
        `SELECT * FROM alerts WHERE cafe = $1`,
        [cafe]
      );
      const alerts = alertsResult.rows;
      res.json(createResponse(200, "Cafe Found", { cafeDetails, alerts }));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchAllOrders: async function (req, res) {
    try {
      const { orderId } = req.params;
      const result = await pool.query(
        `SELECT orders FROM ${RepeatOrderDB} WHERE $1 = ANY(orders)`,
        [orderId]
      );
      const orderIds = result.rows[0].orders;
      let orders = [];
      for (order of orderIds) {
        const orderResult = await pool.query(
          `SELECT * FROM ${OrderDB} WHERE _id = $1`,
          [order]
        );
        orders.push(orderResult.rows[0]);
      }
      for (order of orders) {
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          const itemRequest = await pool.query(
            `SELECT * FROM ${OrderItemDB} RIGHT OUTER JOIN item ON item._id = orderitem.item WHERE orderitem._id = $1`,
            [item]
          );
          const itemDetails = itemRequest.rows[0];
          order.items[i] = itemDetails;
        }
      }
      res.json(createResponse(200, "Orders Fetched", orders));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
};
