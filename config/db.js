const mysql = require('mysql2');
  const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'temporal',
  database: process.env.DB_NAME || 'cooki'
});

console.log('Conectando a la base de datos...'+connection.config.host);

module.exports = connection;