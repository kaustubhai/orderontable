const CafeController = require("../controller/CafeController");
const userController = require("../controller/UserController");
const session = require("../middleware/session");
const cafeClosed = require("../middleware/cafeClosed");
const express = require("express");
const Router = express.Router();

Router.post("/createSession/:cafe", userController.createSession);
Router.get("/cafe/items", session, cafeClosed, CafeController.itemsByCategory);
Router.get("/cafe", session, CafeController.getCafe);
Router.post("/order/place", session, cafeClosed, userController.placeOrder);
Router.get("/order/fetchAll/:orderId", userController.fetchAllOrders);
Router.get("/order/fetch", session, userController.fetchOrder);
Router.post("/order/register", session, userController.userSignup);
Router.get("/order/status", session, cafeClosed, userController.getOrderStatus);
Router.get(
  "/review/fetchOrder/:orderId",
  userController.review.getOrderForReview
);
Router.get("/rating/order/:order", CafeController.fetchOrder);
Router.post("/rating/order/:order", userController.review.addOrderRating);
Router.post("/review/order/:order", userController.review.addOrderReview);
Router.post("/rating/item/:item", userController.review.addItemRating);
Router.post("/review/item/:item", userController.review.addItemReview);
Router.post("/subscribe", session, userController.subscribeToNotifications);
Router.get("/alert/:cafe", userController.getCafeFromAlert);

module.exports = Router;
