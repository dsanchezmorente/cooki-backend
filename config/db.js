const mysql = require('mysql2');


/**
  const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
*/

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'temporal',
  database: 'cooki'
});

module.exports = connection;

