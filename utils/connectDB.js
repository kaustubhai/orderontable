const pg = require("pg");
const Pool = pg.Pool;
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  port: 5432,
  password: "kaustubh229",
  database: "postgres",
});

module.exports = pool;
