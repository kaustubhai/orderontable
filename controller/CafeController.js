const Joi = require("joi");
const pool = require("../utils/connectDB");
const createResponse = require("../utils/createResponse");
const sharp = require("sharp");
const { sendNotification } = require("web-push");

const CafeDB = "cafe";
const AdminDB = "admin";
const ItemDB = "item";
const OrderItemDB = "orderitem";
const OrdersDB = "orders";
const UserDB = "userbase";

const cafeSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  address: Joi.string().min(3).max(100).required(),
  city: Joi.string().min(3).max(100).required(),
  state: Joi.string().min(3).max(100).required(),
  pincode: Joi.number().required(),
  openStatus: Joi.boolean(),
  image: Joi.string().min(1).max(100000),
  email: Joi.string().min(10).max(100),
  upiId: Joi.string().min(3).max(100),
  reviewLink: Joi.string().min(3).max(100),
  phone: Joi.string().min(10).max(15).required(),
});

const itemSchema = Joi.object({
  category: Joi.string().max(100).required(),
  subCategory: Joi.string(),
  name: Joi.string().min(3).max(100).required(),
  price: Joi.number().required(),
  description: Joi.string().min(3).max(1000).required(),
  foodChoice: Joi.string().max(100),
  recommended: Joi.boolean(),
  inStock: Joi.boolean(),
  variant: Joi.string().min(3).max(100),
  servingInfo: Joi.string().max(100),
  portionSize: Joi.string().max(100),
  tags: Joi.string().min(3).max(100),
  image: Joi.string().min(1).max(100000),
  veg: Joi.boolean(),
});

const updateItemSchema = Joi.object({
  category: Joi.string().max(100),
  subCategory: Joi.string().max(100),
  name: Joi.string().min(3).max(100),
  price: Joi.number(),
  description: Joi.string().min(3).max(1000),
  foodChoice: Joi.string().max(100),
  recommended: Joi.boolean(),
  inStock: Joi.boolean(),
  variant: Joi.string().min(3).max(100),
  servingInfo: Joi.string().max(100),
  portionSize: Joi.string().max(100),
  tags: Joi.string().min(3).max(100),
  image: Joi.string().min(1).max(100000),
  veg: Joi.boolean(),
});

module.exports = {
  getCafe: async (req, res) => {
    try {
      let { cafe } = req;
      if (!cafe) cafe = req.query.cafe;
      console.log(cafe);
      if (!cafe)
        return res.status(400).json(createResponse(400, "No Cafe", null));
      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [cafe]
      );
      const cafeInDB = result.rows[0];
      if (!cafeInDB)
        return res
          .status(400)
          .json(createResponse(400, "No Cafe in database", null));

      res.json(createResponse(200, "Cafe Found", cafeInDB));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },

  registerCafe: async (req, res) => {
    try {
      const { error } = cafeSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      const { name, address, phone, city, state, pincode } = req.body;
      const cafeInserted = await pool.query(
        `INSERT INTO ${CafeDB} (name, address, phone, city, state, pincode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING _id, name`,
        [name, address, phone, city, state, pincode]
      );
      const cafe = cafeInserted.rows[0];
      await pool.query(`UPDATE ${AdminDB} SET cafe = $1 WHERE _id = $2`, [
        cafe._id,
        req.user,
      ]);
      res.json(createResponse(200, "Cafe Created!", cafe.name));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  addCafeImage: async (req, res) => {
    try {
      const cafeRequest = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = cafeRequest.rows[0];
      if (!cafe)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Cafe", "Token Expired"));
      let image = "";
      if (req.file) {
        const buffer = req.file.buffer;
        image = await sharp(buffer).resize(500, 500).webp().toBuffer();
      }
      const cafeUpdated = await pool.query(
        `UPDATE ${CafeDB} SET image = $1 WHERE _id = $2 RETURNING *`,
        [image.toString("base64"), req.cafe]
      );
      res.json(createResponse(200, "Image Updated!", cafeUpdated.rows[0]));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateEmail: async (req, res) => {
    try {
      const { email } = req.body;
      await pool.query(`UPDATE ${CafeDB} SET email = $1 WHERE _id = $2`, [
        email,
        req.cafe,
      ]);
      res.json(createResponse(200, "Email Updated!", email));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updatePhone: async (req, res) => {
    try {
      const { phone } = req.body;
      await pool.query(`UPDATE ${CafeDB} SET phone = $1 WHERE _id = $2`, [
        phone,
        req.cafe,
      ]);
      res.json(createResponse(200, "Phone Updated!", phone));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateName: async (req, res) => {
    try {
      const { name } = req.body;
      await pool.query(`UPDATE ${CafeDB} SET name = $1 WHERE _id = $2`, [
        name,
        req.cafe,
      ]);
      res.json(createResponse(200, "Name Updated!", name));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  addItems: async (req, res) => {
    const { error } = itemSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json(createResponse(400, "Invalid payload passed", error.message));
    try {
      const cafeRequest = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = cafeRequest.rows[0];
      if (!cafe)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Cafe", "Token Expired"));

      if (req.file) {
        const buffer = req.file.buffer;
        const image = await sharp(buffer).resize(500, 500).webp().toBuffer();
        req.body.image = image.toString("base64");
      }
      const toInsertKeys = Object.keys(req.body);
      toInsertKeys.push("cafe");
      const toInsertValues = Object.values(req.body);
      toInsertValues.push(req.cafe);
      const itemInserted = await pool.query(
        `INSERT INTO ${ItemDB} (${toInsertKeys.join(
          ", "
        )}) VALUES (${toInsertKeys
          .map((_, i) => `$${i + 1}`)
          .join(", ")}) RETURNING *`,
        [...toInsertValues]
      );
      const item = itemInserted.rows[0];
      if (!cafe.items) cafe.items = [];
      const cafeItems = [...cafe.items, item._id];
      await pool.query(`UPDATE ${CafeDB} SET items = $1 WHERE _id = $2`, [
        cafeItems,
        req.cafe,
      ]);
      res.json(createResponse(200, "Item Created!", item));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchItem: async (req, res) => {
    try {
      const itemRequest = await pool.query(
        `SELECT * FROM ${ItemDB} WHERE cafe = $1 AND _id = $2`,
        [req.cafe, req.params.id]
      );
      const items = itemRequest.rows[0];
      if (!items)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Item", "Token Expired"));
      res.json(createResponse(200, "Item Found!", items));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateItem: async (req, res) => {
    try {
      const { error } = updateItemSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));

      if (req.file) {
        const buffer = req.file.buffer;
        const image = await sharp(buffer).resize(500, 500).webp().toBuffer();
        req.body.image = image.toString("base64");
      }
      const { id } = req.params;
      const itemFromDB = await pool.query(
        `SELECT * FROM ${ItemDB} WHERE _id = $1`,
        [id]
      );
      const itemDB = itemFromDB.rows[0];
      if (!itemDB)
        return res
          .status(400)
          .json(createResponse(400, "No Item", "Invalid ID passed in params"));
      const toUpdateKeys = Object.keys(req.body);
      const toUpdateValues = Object.values(req.body);
      const updatedItem = await pool.query(
        `UPDATE ${ItemDB} SET ${toUpdateKeys
          .map((key, i) => `${key} = $${i + 1}`)
          .join(", ")} WHERE _id = $${toUpdateValues.length + 1} RETURNING *`,
        [...toUpdateValues, id]
      );
      const item = updatedItem.rows[0];
      res.json(createResponse(200, "Item Updated!", item));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  toggleItemInStock: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${ItemDB} WHERE _id = $1`,
        [req.params.id]
      );
      const item = result.rows[0];
      if (!item)
        return res
          .status(400)
          .json(createResponse(400, "No Item", "Invalid ID passed"));
      const itemUpdated = await pool.query(
        `UPDATE ${ItemDB} SET inStock = $1 WHERE _id = $2 RETURNING *`,
        [!item.instock, req.params.id]
      );
      const Item = itemUpdated.rows[0];
      res.json(createResponse(200, "Item Updated!", Item));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  toggleAcceptingOrder: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = result.rows[0];
      const itemUpdated = await pool.query(
        `UPDATE ${CafeDB} SET openstatus = $1 WHERE _id = $2 RETURNING *`,
        [!cafe.openstatus, req.cafe]
      );
      const Cafe = itemUpdated.rows[0];
      res.json(createResponse(200, "Shutter changed", Cafe));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateUpiId: async (req, res) => {
    try {
      const { upiId } = req.body;
      const itemUpdated = await pool.query(
        `UPDATE ${CafeDB} SET upiId = $1 WHERE _id = $2 RETURNING *`,
        [upiId, req.cafe]
      );
      const Cafe = itemUpdated.rows[0];
      res.json(createResponse(200, "UPI ID Updated", Cafe));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateReviewLink: async (req, res) => {
    try {
      const { reviewLink } = req.body;
      const itemUpdated = await pool.query(
        `UPDATE ${CafeDB} SET reviewLink = $1 WHERE _id = $2 RETURNING *`,
        [reviewLink, req.cafe]
      );
      const Cafe = itemUpdated.rows[0];
      res.json(createResponse(200, "Review link updated", Cafe));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchItems: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = result.rows[0];
      if (!cafe)
        return res.status(400).json(createResponse(400, "No Cafe", null));
      let items;
      if (cafe.items && cafe.items.length > 0) {
        const itemsFromDB = await pool.query(
          `SELECT * FROM ${ItemDB} WHERE _id = ANY($1) ORDER BY instock DESC`,
          [cafe.items]
        );
        items = itemsFromDB.rows;
      }
      res.json(createResponse(200, "Items Found!", items));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  itemsByCategory: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = result.rows[0];
      if (!cafe)
        return res.status(400).json(createResponse(400, "No Cafe", null));
      let items;
      if (cafe.items && cafe.items.length > 0) {
        const itemsFromDB = await pool.query(
          `SELECT * FROM ${ItemDB} WHERE _id = ANY($1) ORDER BY instock DESC`,
          [cafe.items]
        );
        items = itemsFromDB.rows;
      }

      const itemsAndCategory = {
        All: [],
        Recommended: [],
      };

      items?.forEach((item) => {
        itemsAndCategory["All"].push(item);
        if (item.recommended) {
          itemsAndCategory["Recommended"].push(item);
        }
        if (itemsAndCategory[item.category]) {
          itemsAndCategory[item.category].push(item);
        } else {
          itemsAndCategory[item.category] = [item];
        }
      });

      res.json(createResponse(200, "Items Found!", itemsAndCategory));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchDashboardAnalytics: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = result.rows[0];
      if (!cafe)
        return res.status(400).json(createResponse(400, "No Cafe", null));
      const items = await pool.query(
        `SELECT recommended FROM ${ItemDB} WHERE _id = ANY($1)`,
        [cafe.items]
      );
      const recommended = items.rows.filter((item) => item.recommended).length;
      const total = items.rows.length;
      const analytics = {
        totalItems: total,
        recommendedItems: recommended,
      };
      res.json(createResponse(200, "Analytics Found!", analytics));
    } catch (error) { }
  },
  fetchAnalytics: async (req, res) => {
    try {
      const cafeId = req.cafe;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json(createResponse(400, "Start date and end date are required", null));
      }

      const result = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [cafeId]
      );
      const cafe = result.rows[0];
      if (!cafe) return res.status(400).json(createResponse(400, "No Cafe", null));

      const orders = await pool.query(
        `SELECT * FROM ${OrdersDB} WHERE cafe = $1 AND createdat >= $2 AND createdat < $3`,
        [cafeId, new Date(startDate), new Date(endDate)]
      );

      const analytics = {
        totalSales: 0,
        totalOrders: 0,
        totalUniqueCustomers: 0,
        totalCustomers: {
          newCustomers: 0,
          repeatCustomers: 0
        },
        customerFrequency: {}
      };

      const customerSet = new Set();

      for (const order of orders.rows) {
        analytics.totalSales += order.amount;
        analytics.totalOrders++;
        const customerId = order.customer;
        if (customerId) {
          if (!customerSet.has(customerId)) {
            customerSet.add(customerId);
            analytics.totalUniqueCustomers++;
            analytics.totalCustomers.newCustomers++;
            analytics.customerFrequency[customerId] = 1;
          } else {
            analytics.totalCustomers.repeatCustomers++;
            const frequency = analytics.customerFrequency[customerId];
            analytics.customerFrequency[customerId] = frequency + 1;
          }
        }
      }

      analytics.totalCustomers.totalCustomers = analytics.totalCustomers.newCustomers + analytics.totalCustomers.repeatCustomers;

      return res.status(200).json(createResponse(200, "Success", analytics));
    } catch (error) {
      console.error(error);
      return res.status(500).json(createResponse(500, "Internal Server Error", null));
    }
  },
  
  
  fetchOrders: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT orders._id, status, tablenumber, amount, ordertype, orders.createdat, paymentstatus, userbase.name AS user, userbase.phone AS userPhone, array_length(items, 1) AS items FROM ${OrdersDB} RIGHT OUTER JOIN USERBASE ON orders.customer = userbase.phone WHERE cafe = $1 ORDER BY createdat DESC`,
        [req.cafe]
      );
      const orders = result.rows;
      if (!orders || orders.length === 0)
        return res
          .status(400)
          .json(createResponse(400, "No Orders In Progress", null));
      const orderByDate = {};
      orders.forEach((order) => {
        const date = new Date(order.createdat)
          .toDateString()
          .split(" ")
          .slice(1)
          .join(" ");
        if (orderByDate[date]) {
          if (orderByDate[date][order.status]) {
            orderByDate[date][order.status].push(order);
          } else {
            orderByDate[date][order.status] = [order];
          }
        } else {
          orderByDate[date] = {};
          orderByDate[date][order.status] = [order];
        }
      });

      res.json(createResponse(200, "Orders Found!", orderByDate));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT * FROM ${OrdersDB} WHERE _id = $1`,
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
          `SELECT orderitem.variant, orderitem.quantity, orderitem.price, item.name FROM ${OrderItemDB} RIGHT OUTER JOIN item ON item._id = orderitem.item WHERE orderitem._id = $1`,
          [item]
        );
        const itemDetails = itemRequest.rows[0];
        order.items[i] = itemDetails;
      }
      res.json(createResponse(200, "Order Found!", order));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  orderStatusUpdate: async function (req, res) {
    try {
      const { status, order } = req.body;
      if (
        !status ||
        (status !== "PREPARING" &&
          status != "REJECTED" &&
          status !== "PREPARED" &&
          status != "SERVED" &&
          status !== "COMPLETED")
      )
        return res
          .status(400)
          .json(createResponse(400, "Invalid Status", null));

      const updateOrder = await pool.query(
        `UPDATE ${OrdersDB} SET status = $1 WHERE _id = $2 RETURNING status`,
        [status, order]
      );
      res.json(
        createResponse(200, "Order Status Updated", updateOrder.rows[0].status)
      );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  getOrderByStatus: async function (req, res) {
    try {
      const { status } = req.params;
      if (
        !status ||
        (status !== "ORDERED" &&
          status !== "PREPARING" &&
          status != "REJECTED" &&
          status !== "PREPARED" &&
          status != "SERVED" &&
          status !== "COMPLETED")
      )
        return res
          .status(400)
          .json(createResponse(400, "Invalid Status", null));

      // orders from today
      const result = await pool.query(
        `SELECT orders._id, status, tablenumber, amount, ordertype, orders.createdat, paymentstatus, userbase.name AS user, userbase.phone AS userPhone, items FROM ${OrdersDB} RIGHT OUTER JOIN USERBASE ON orders.customer = userbase.phone WHERE cafe = $1 AND status = $2 AND orders.createdat >= NOW()::DATE ORDER BY orders.createdat DESC`,
        [req.cafe, status]
      );
      const orders = result.rows;
      if (!orders || orders.length === 0)
        return res
          .status(400)
          .json(createResponse(400, "No Orders In Progress", null));

      // combine order on table number
      const orderByTable = [];
      orders.forEach((order) => {
        const table = order.tablenumber;
        if (orderByTable[table]) {
          orderByTable[table].push(order);
        } else {
          orderByTable[table] = [order];
        }
      });

      // populating items in order
      for (let i = 0; i < orderByTable.length; i++) {
        if (orderByTable[i]) {
          for (let j = 0; j < orderByTable[i].length; j++) {
            const order = orderByTable[i][j];
            for (let k = 0; k < order.items.length; k++) {
              const item = order.items[k];
              const itemRequest = await pool.query(
                `SELECT * FROM ${OrderItemDB} RIGHT OUTER JOIN item ON item._id = orderitem.item WHERE orderitem._id = $1`,
                [item]
              );
              const itemDetails = itemRequest.rows[0];
              order.items[k] = itemDetails;
            }
          }
        }
      }

      // remove null from order by table
      const orderByTableFiltered = orderByTable.filter((order) => order);

      res.json(createResponse(200, "Orders Found!", orderByTableFiltered));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateFssaiCertificate: async (req, res) => {
    try {
      const cafeRequest = await pool.query(
        `SELECT * FROM ${CafeDB} WHERE _id = $1`,
        [req.cafe]
      );
      const cafe = cafeRequest.rows[0];
      if (!cafe)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Cafe", "Token Expired"));
      let image = "";
      if (req.file) {
        const buffer = req.file.buffer;
        image = await sharp(buffer).resize(500, 500).webp().toBuffer();
      }
      const cafeUpdated = await pool.query(
        `UPDATE ${CafeDB} SET fssaicertificate = $1 WHERE _id = $2 RETURNING * `,
        [image.toString("base64"), req.cafe]
      );
      res.json(
        createResponse(200, "Fssai Certificate Updated!", cafeUpdated.rows[0])
      );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateFssai: async (req, res) => {
    try {
      const { fssai } = req.body;
      const cafeUpdated = await pool.query(
        `UPDATE ${CafeDB} SET fssai = $1 WHERE _id = $2 RETURNING * `,
        [fssai, req.cafe]
      );
      res.json(createResponse(200, "Fssai Updated!", cafeUpdated.rows[0]));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  sendTopicNotification: async function (req, res) {
    let { title, body, topic, discount, expiry } = req.body;
    if (!title || !body || !expiry)
      return res.status(400).json(createResponse(400, "Invalid Payload", null));
    const { cafe } = req;

    // parsing string expiry to sql timestamp
    expiry = new Date(expiry).toISOString();

    const message = JSON.stringify({
      title,
      body,
      data: {
        topic,
        cafe,
        discount,
        expiry,
      },
    });
    topic = topic || cafe;
    const usersInDB = await pool.query(
      `SELECT vapidpublickey FROM ${UserDB} WHERE $1 = ANY(topics)`,
      [topic]
    );
    const users = usersInDB.rows;
    const tokens = users.map((user) => user.vapidpublickey);
    const promises = tokens.map((subscription) => {
      if (!subscription) {
        return Promise.resolve(); // Resolve with an empty promise if subscription is missing
      }
      return sendNotification(JSON.parse(subscription), message).catch(
        (error) => {
          console.error("Error sending notification:", error);
          // Continue execution by resolving with undefined
          return undefined;
        }
      );
    });
    Promise.all(promises)
      .then(() => {
        pool.query(
          `INSERT INTO alerts(title, body, topics, discount, expiry, cafe) VALUES($1, $2, $3, $4, $5, $6)`,
          [title, body, [topic], discount, expiry, cafe]
        );
      })
      .catch((error) => {
        console.error("Error sending notifications:", error);
      });
    res.json(createResponse(200, "Notification Sent", null));
  },
  fetchNotifications: async function (req, res) {
    try {
      const result = await pool.query(`SELECT * FROM alerts WHERE cafe = $1`, [
        req.cafe,
      ]);
      const alerts = result.rows;
      res.json(createResponse(200, "Notifications Found", alerts));
    } catch (error) {
      console.log(error);
      res.status(500).json(createResponse(500, "Internal Server Error", null));
    }
  },
  updateUpiQRCode: async (req, res) => {
    try {
      let image = "";
      if (req.file) {
        const buffer = req.file.buffer;
        image = await sharp(buffer).webp().toBuffer();
      }
      const cafeUpdated = await pool.query(
        `UPDATE ${CafeDB} SET upiQRCode = $1 WHERE _id = $2 RETURNING * `,
        [image.toString("base64"), req.cafe]
      );
      res.json(createResponse(200, "Upi QR Code Updated!", cafeUpdated.rows[0]));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  fetchUpiQRCode: async (req, res) => {
    try {
      const result = await pool.query(`SELECT upiqrcode FROM ${CafeDB} WHERE _id = $1`, [req.cafe]);
      const upiQRCode = result.rows[0];
      res.json(createResponse(200, "Upi QR Code Found!", upiQRCode.upiqrcode));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
};
