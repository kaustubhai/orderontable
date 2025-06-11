const jwt = require("jsonwebtoken");
const pool = require("../utils/connectDB");
const createResponse = require("../utils/createResponse");
const { models } = require("../utils/databaseSchema");

const { Orders } = models;

module.exports = async function (req, res, next) {
  const token = req.headers["x-auth-token"] || req.headers["authorization"];
  if (!token) return res.status(401).json({ msg: "Unathorised Access" });
  try {
    const decoded = jwt.verify(token, process.env.SECURITY_KEY);
    const result = await pool.query(
      `SELECT * FROM ${Orders.name} WHERE _id = $1`,
      [decoded.order]
    );
    const order = result.rows[0];
    if (!order)
      return res.status(401).json(createResponse(401, "No Order found", null));
    req.cafe = order.cafe;
    req.order = decoded.order;
    next();
  } catch (error) {
    console.log(error);
    res.status(500).json(createResponse(500, "Session Expired", null));
  }
};
