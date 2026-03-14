const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'temporal',
  database: 'cooki'
});

module.exports = connection;