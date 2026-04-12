const mysql = require('mysql2');
  const connection = mysql.createConnection({
  host: process.env.MYSQL_PUBLIC_URL || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'temporal',
  database: process.env.MYSQL_DATABASE || 'cooki'
});

console.log('Conectando a la base de datos...'+connection.config.host);

module.exports = connection;