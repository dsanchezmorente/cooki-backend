const express = require('express');
const cors = require('cors');
const PORT = 3000;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/usuarios', require('./routes/usuarios'));
app.use('/recetas', require('./routes/recetas'));

app.listen(PORT, () => {
  console.log(`Servidor COOKI corriendo en puerto ${PORT}`);
});