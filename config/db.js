const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST,
  user: process.env.DB_USER || process.env.MYSQL_USER,
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
  port: process.env.DB_PORT || process.env.MYSQL_PORT,
  connectTimeout: 10000
};

let connection;

function createConnection() {
  connection = mysql.createConnection(dbConfig);

  console.log('Conectando a la base de datos...', {
    host: connection.config.host,
    port: connection.config.port,
    user: connection.config.user,
    database: connection.config.database
  });

  connection.connect(err => {
    if (err) {
      console.error('Error al conectar a MySQL:', err.code, err.message);
      setTimeout(createConnection, 2000);
      return;
    }
    console.log('Conexión MySQL establecida.');
  });

  connection.on('error', err => {
    console.error('Error de MySQL en tiempo de ejecución:', err.code, err.message);

    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
      console.log('Reconectando a MySQL después de pérdida de conexión...');
      createConnection();
    }
  });
}

createConnection();

const db = {
  query(...args) {
    if (!connection) {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        return callback(new Error('Conexión MySQL no disponible'));
      }
      return;
    }
    return connection.query(...args);
  },
  beginTransaction(cb) {
    if (!connection) {
      return cb(new Error('Conexión MySQL no disponible'));
    }
    return connection.beginTransaction(cb);
  },
  commit(cb) {
    if (!connection) {
      return cb(new Error('Conexión MySQL no disponible'));
    }
    return connection.commit(cb);
  },
  rollback(cb) {
    if (!connection) {
      return cb(new Error('Conexión MySQL no disponible'));
    }
    return connection.rollback(cb);
  },
  end(cb) {
    if (!connection) {
      return cb && cb(new Error('Conexión MySQL no disponible'));
    }
    return connection.end(cb);
  }
};

module.exports = db;