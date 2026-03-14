const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

router.post('/registro', async (req, res) => {

  const { nombre, apellidos, telefono, email, password } = req.body;

  if (!nombre || !apellidos || !email || !password) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {


    // Verificar si el email ya existe
    db.query(
      "SELECT id_usuario FROM USUARIO WHERE email = ?",
      [email],
      async (err, results) => {

        if (results.length > 0) {
          return res.status(409).json({ message: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          `INSERT INTO USUARIO 
           (nombre, apellidos, telefono, email, password, admin)
           VALUES (?, ?, ?, ?, ?, FALSE)`,
          [nombre, apellidos, telefono, email, hashedPassword],
          (err, result) => {

            if (err) {
              return res.status(500).json({ message: `Error al registrar usuario: ${err}` });
            }

            res.status(201).json({ message: 'Usuario registrado correctamente' });
          }
        );
      }
    );

  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }

});

const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {

  const { email, password } = req.body;

  db.query(
    "SELECT * FROM USUARIO WHERE email = ?",
    [email],
    async (err, results) => {

      if (results.length === 0) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const user = results[0];

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      // GENERACIÓN DEL TOKEN
      const token = jwt.sign(
        {
          id: user.id_usuario,
          email: user.email,
          admin: user.admin
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      res.json({ token });
    }
  );
});

module.exports = router;