const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'temporal',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'cooki',
  port: process.env.DB_PORT || process.env.MYSQL_PORT || undefined
});

console.log('Conectando a la base de datos...', {
  host: connection.config.host,
  port: connection.config.port,
  user: connection.config.user,
  database: connection.config.database
});

connection.connect(err => {
  if (err) {
    console.error('Error al conectar a MySQL:', err.code, err.message);
    return;
  }
  console.log('Conexión MySQL establecida.');
});

connection.on('error', err => {
  console.error('Error de MySQL en tiempo de ejecución:', err.code, err.message);
});

module.exports = connection;