const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../utils/connectDB");
const createResponse = require("../utils/createResponse");
const Joi = require("joi");

const AdminDB = "admin";

const userSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  type: Joi.string().min(1).max(100),
  provider: Joi.string().min(1).max(100),
  phone: Joi.string().min(10).max(15).required(),
  email: Joi.string().min(1).max(100),
  password: Joi.string().min(8).max(100).required(),
  pin: Joi.number().required(),
  image: Joi.string().min(1).max(100000),
});
const userLoginWithPinSchema = Joi.object({
  phone: Joi.string().min(10).max(15).required(),
  pin: Joi.number().required(),
});
const userLoginWithPasswordSchema = Joi.object({
  phone: Joi.string().min(10).max(15).required(),
  password: Joi.string().required(),
});

module.exports = {
  register: async (req, res) => {
    try {
      const { name, phone, password, pin } = req.body;
      const { error } = userSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      let { rows } = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      if (rows.length > 0)
        return res
          .status(400)
          .json(createResponse(400, "User Already Exists", null));
      if (!phone.match(/^\+?[1-9]\d{1,14}$/))
        return res.status(400).json(createResponse(400, "Invalid Phone", null));
      const user = { name, phone, password, pin };
      user.password = await bcrypt.hash(user.password, 8);
      user.pin = await bcrypt.hash(user.pin, 4);
      const userInserted = await pool.query(
        `INSERT INTO ${AdminDB}(name, phone, password, pin) VALUES ($1, $2, $3, $4) RETURNING phone`,
        [user.name, user.phone, user.password, user.pin]
      );
      const User = userInserted.rows[0];
      res.json(createResponse(200, "User Created", User.phone));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },

  loginWithPin: async (req, res) => {
    try {
      const { error } = userLoginWithPinSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      const { phone, pin } = req.body;
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      const user = result.rows[0];
      if (!user)
        return res.status(400).json(createResponse(400, "No User", null));
      if (!(await bcrypt.compare(pin, user.pin)))
        return res
          .status(400)
          .json(createResponse(400, "Pin Mismatched", null));
      const token = jwt.sign(
        { user: user._id.toString() },
        process.env.SECURITY_KEY,
        {
          expiresIn: 360000,
        }
      );
      res
        .cookie("token", token, { httpOnly: true })
        .json(createResponse(200, user.cafe, token));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },

  loginWithPassword: async (req, res) => {
    try {
      const { error } = userLoginWithPasswordSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json(createResponse(400, "Invalid payload passed", error.message));
      const { phone, password } = req.body;
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      const user = result.rows[0];
      if (!user)
        return res.status(400).json(createResponse(400, "No User", null));
      if (!(await bcrypt.compare(password, user.password)))
        return res
          .status(400)
          .json(createResponse(400, "Password Mismatched", null));
      const token = jwt.sign(
        { user: user._id.toString() },
        process.env.SECURITY_KEY,
        {
          expiresIn: 360000,
        }
      );
      res
        .cookie("token", token, { httpOnly: true })
        .json(createResponse(200, user.cafe, token));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },

  forgotPasswordRequest: async (req, res) => {
    try {
      const { phone } = req.body;
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      const user = result.rows[0];
      if (!user)
        return res.status(400).json(createResponse(400, "No User", null));
      const payload = {
        password: user.password,
      };
      const token = jwt.sign(payload, user.password, {
        expiresIn: 3600,
      });
      res.json(createResponse(200, "Token Created", token));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(createResponse(500, "Internal Server Error", error.message));
    }
  },

  resetPassword: async (req, res) => {
    let tokenValid = true;
    try {
      const { phone, password } = req.body;
      const result = await pool.query(
        `SELECT * FROM ${AdminDB} WHERE phone = $1`,
        [phone]
      );
      const user = result.rows[0];
      const token = req.params.requestId;
      jwt.verify(token, user.password, (err) => {
        if (err) {
          tokenValid = false;
          return res
            .status(400)
            .json(createResponse(400, "Invalid Token", null));
        }
      });
      if (tokenValid) {
        const passwordHashed = await bcrypt.hash(password, 8);
        await pool.query(`UPDATE ${AdminDB} SET password = $1`, [
          passwordHashed,
        ]);
        res.json(createResponse(200, "Password Updated", "Password Updated"));
      }
    } catch (error) {
      console.log(error);
      if (tokenValid)
        res
          .status(500)
          .json(createResponse(500, "Internal Server Error", error.message));
    }
  },
};
