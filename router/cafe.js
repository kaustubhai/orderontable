const cafeController = require("../controller/CafeController");
const auth = require("../middleware/auth");
const multer = require("../middleware/multer");
const express = require("express");
const Router = express.Router();

Router.get("/", auth, cafeController.getCafe);
Router.post("/register", auth, cafeController.registerCafe);
Router.patch(
  "/image",
  auth,
  multer.single("image"),
  cafeController.addCafeImage
);
Router.patch("/email", auth, cafeController.updateEmail);
Router.patch("/phone", auth, cafeController.updatePhone);
Router.patch("/name", auth, cafeController.updateName);
Router.patch(
  "/fssai-certificate",
  auth,
  multer.single("image"),
  cafeController.updateFssaiCertificate
);
Router.patch(
  "/upi-qr-code",
  auth,
  multer.single("image"),
  cafeController.updateUpiQRCode
);
Router.get("/upi-qr-code", auth, cafeController.fetchUpiQRCode);
Router.patch("/fssai", auth, cafeController.updateFssai);
Router.get("/item/detail/:id", auth, cafeController.fetchItem);
Router.patch(
  "/item/detail/:id",
  auth,
  multer.single("image"),
  cafeController.updateItem
);
Router.patch("/item/stock/:id", auth, cafeController.toggleItemInStock);
Router.patch("/items", auth, multer.single("image"), cafeController.addItems);
Router.patch("/shutter", auth, cafeController.toggleAcceptingOrder);
Router.patch("/upi", auth, cafeController.updateUpiId);
Router.patch("/review", auth, cafeController.updateReviewLink);
Router.get("/items", auth, cafeController.itemsByCategory);
Router.get(
  "/analytics/dashboard",
  auth,
  cafeController.fetchDashboardAnalytics
);
Router.post("/analytics", auth, cafeController.fetchAnalytics);
Router.get("/orders", auth, cafeController.fetchOrders);
Router.get("/order/:id", cafeController.fetchOrder);
Router.post("/order/status", auth, cafeController.orderStatusUpdate);
Router.get("/orders/status/:status", auth, cafeController.getOrderByStatus);
Router.post("/notification/push", auth, cafeController.sendTopicNotification);
Router.get("/notification/fetch", auth, cafeController.fetchNotifications);
module.exports = Router;
