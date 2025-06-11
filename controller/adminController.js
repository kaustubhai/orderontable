const bcrypt = require("bcryptjs");
const pool = require("../utils/connectDB");
const createResponse = require("../utils/createResponse");
const Joi = require("joi");
const { models } = require("../utils/databaseSchema");

const { Admin } = models;

const AdminDB = "admin";
const CafeDB = "cafe";

const updateProfileSchema = Joi.object({
  type: Joi.string().min(1).max(100),
  image: Joi.string().min(1).max(100000),
});
const resetPinSchema = Joi.object({
  newPin: Joi.number().required(),
  password: Joi.string().min(8).max(100).required(),
});

module.exports = {
  getUser: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT ${Admin.columns.join(", ")} FROM ${AdminDB} WHERE _id = $1`,
        [req.user]
      );
      const user = result.rows[0];
      if (!user)
        return res.status(400).json(createResponse(400, "No User", null));
      const cafes = await pool.query(`SELECT * FROM ${CafeDB} WHERE _id = $1`, [
        user.cafe,
      ]);
      const cafe = cafes.rows[0];
      res.json(createResponse(200, "User Found", { user, cafe }));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  updateProfile: async (req, res) => {
    try {
      const { error } = updateProfileSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      const { type = "", image = "" } = req.body;
      const userUpdated = await pool.query(
        `UPDATE ${AdminDB} SET type = $1, image = $2 WHERE _id = $3 RETURNING ${Admin.columns.join(
          ", "
        )}`,
        [type, image, req.user]
      );
      const user = userUpdated.rows[0];
      res.json(createResponse(200, "Profile Updated", user));
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
      const userUpdated = await pool.query(
        `UPDATE ${AdminDB} SET name = $1 WHERE _id = $2 RETURNING name`,
        [name, req.user]
      );
      const user = userUpdated.rows[0];
      res.json(createResponse(200, "Name Updated", user.name));
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
      const userUpdated = await pool.query(
        "UPDATE admin SET email = $1 WHERE _id = $2 RETURNING email",
        [email, req.user]
      );
      const user = userUpdated.rows[0];
      res.json(createResponse(200, "Email Updated", user.email));
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
      let result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      let user = result.rows[0];
      if (user)
        return res.status(400).json(createResponse(400, "Phone Exists", null));
      if (!phone.match(/^\+?[1-9]\d{1,14}$/))
        return res.status(400).json(createResponse(400, "Invalid Phone", null));
      const userUpdated = await pool.query(
        `UPDATE ${AdminDB} SET phone = $1 WHERE _id = $2 RETURNING phone`,
        [phone, req.user]
      );
      const userPhone = userUpdated.rows[0];
      res.json(createResponse(200, "Phone Updated", userPhone.phone));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  resetPin: async (req, res) => {
    try {
      const { error } = resetPinSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      const { newPin, password } = req.body;
      if (newPin.length !== 4)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Pin", "Pin should have 4 digits"));
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE _id = $1`,
        [req.user]
      );
      const user = result.rows[0];
      if (!(await bcrypt.compare(password, user.password)))
        return res
          .status(400)
          .json(createResponse(400, "Invalid Password", null));
      const hashed = await bcrypt.hash(newPin, 4);
      await pool.query(`UPDATE ${AdminDB} SET pin = $1`, [hashed]);
      res.json(createResponse(200, "Pin Updated", "Pin Updated Successfully"));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { password, newPassword } = req.body;
      if (newPassword.length < 8)
        return res
          .status(400)
          .json(createResponse(400, "Invalid Password", "Password too short"));
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE _id = $1`,
        [req.user]
      );
      const user = result.rows[0];
      if (!(await bcrypt.compare(password, user.password)))
        return res
          .status(400)
          .json(createResponse(400, "Invalid Password", null));
      const hashed = await bcrypt.hash(newPassword, 8);
      await pool.query(`UPDATE ${AdminDB} SET password = $1`, [hashed]);
      res.json(
        createResponse(200, "Password Updated", "Password Updated Successfully")
      );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
  logoutUser: async (req, res) => {
    try {
      res.clearCookie("token");
      res.json(createResponse(200, "Logged Out", "Logged Out Successfully"));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
};
