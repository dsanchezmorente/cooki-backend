const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/usuarios', require('./routes/usuarios'));
app.use('/recetas', require('./routes/recetas'));

app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ message: 'Internal server error' });
});

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', reason => {
  console.error('[UNHANDLED REJECTION]', reason);
});

app.listen(PORT, () => {
  console.log(`COOKI server running on port ${PORT}`);
});