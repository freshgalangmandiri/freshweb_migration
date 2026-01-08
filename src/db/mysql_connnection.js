const mysql = require("mysql2/promise");
const { database } = require("../config.json");

const connection = () => {
  try {
    return mysql.createPool({
      host: database.host,
      user: database.user,
      port: database.port,
      password: database.password,
      database: database.database,
    });
  } catch (error) {
    throw error;
  }
};

async function query(...sql) {
  try {
    const [rows] = await connection().query(...sql);
    return rows;
  } catch (error) {
    throw error;
  }
}

module.exports = { connection, query };
