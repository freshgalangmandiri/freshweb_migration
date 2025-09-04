const mysql = require("mysql2/promise");
const { database } = require("../config.json");

const connection = mysql.createPool({
  host: database.host,
  user: database.user,
  password: database.password,
  database: database.database,
});

async function query(...sql) {
  try {
    const [rows] = await connection.query(...sql);
    return rows;
  } catch (error) {
    throw error;
  }
}

module.exports = { connection, query };
