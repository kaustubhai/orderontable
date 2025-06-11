const adminController = require("../controller/adminController");
const auth = require("../middleware/auth");
const express = require("express");
const Router = express.Router();

Router.get("/", auth, adminController.getUser);
Router.patch("/updateProfile", auth, adminController.updateProfile);
Router.patch("/updateName", auth, adminController.updateName);
Router.patch("/updateEmail", auth, adminController.updateEmail);
Router.patch("/updatePhone", auth, adminController.updatePhone);
Router.patch("/reset/pin", auth, adminController.resetPin);
Router.patch("/reset/password", auth, adminController.resetPassword);
Router.post("/logout", auth, adminController.logoutUser);

module.exports = Router;
