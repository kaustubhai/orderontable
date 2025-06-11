const pool = require("../utils/connectDB");
const createResponse = require("../utils/createResponse");
const { models } = require("../utils/databaseSchema");

const { Cafe } = models;

module.exports = async function (req, res, next) {
    try {
        const result = await pool.query(
            `SELECT * FROM ${Cafe.name} WHERE _id = $1`,
            [req.cafe]
        );
        const cafe = result.rows[0];
        if (!cafe)
            return res.status(401).json(createResponse(401, "No cafe founded", null));
        if (!cafe.openstatus)
            return res.status(403).json(createResponse(403, "Cafe is closed", null));
        next();
    } catch (error) {
        console.log(error);
        res.status(500).json(createResponse(500, "Token is not Valid", null));
    }
};
