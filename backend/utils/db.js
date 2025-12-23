const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "db",
  port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "homenetwork",
  max: Number(process.env.DB_POOL_SIZE || 10),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
