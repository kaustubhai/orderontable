const pg = require("pg");
const Pool = pg.Pool;
const dotenv = require("dotenv");
dotenv.config();
console.log(process.env.DB_HOST);
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

module.exports = pool;
