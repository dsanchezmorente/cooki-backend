const mysql = require('mysql2');

  const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE
});

/*
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'temporal',
  database: 'cooki'
});
*/

module.exports = connection;

