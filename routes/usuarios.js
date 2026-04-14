const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const verificarToken = require('../middleware/auth');

router.post('/registro', async (req, res) => {

  const { nombre, apellidos, telefono, email, password } = req.body;
  console.log('Registro request body:', req.body);
  if (!nombre || !apellidos || !email || !password) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {

    // Verificar si el email ya existe
    db.query(
      "SELECT id_usuario FROM usuario WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Error al verificar email' });
        }

        if (!results || results.length > 0) {
          return res.status(409).json({ message: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          `INSERT INTO usuario 
           (nombre, apellidos, telefono, email, password, admin)
           VALUES (?, ?, ?, ?, ?, FALSE)`,
          [nombre, apellidos, telefono, email, hashedPassword],
          (err, result) => {
console.log('Resultado de la inserción:', result);
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
  console.log('Login request body:', req.body);

  db.query(
    "SELECT * FROM usuario WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error('Error en consulta de usuario:', err);
        return res.status(500).json({ message: 'Error al consultar el usuario' });
      }

      if (!results || results.length === 0) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const user = results[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET no configurado en el entorno');
        return res.status(500).json({ message: 'Error interno: JWT_SECRET no configurado' });
      }

      try {
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
      } catch (error) {
        console.error('Error generando JWT:', error);
        res.status(500).json({ message: 'Error al generar el token' });
      }
    }
  );
});

router.put('/cambiar-password', verificarToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const id_usuario = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Se requieren currentPassword y newPassword' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  db.query(
    'SELECT password FROM usuario WHERE id_usuario = ?',
    [id_usuario],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error al verificar usuario' });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const user = results[0];
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.query(
        'UPDATE usuario SET password = ? WHERE id_usuario = ?',
        [hashedNewPassword, id_usuario],
        (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error al actualizar la contraseña' });
          }

          res.status(200).json({ message: 'Contraseña actualizada correctamente' });
        }
      );
    }
  );
});

router.get('/alergenos/:idUsuario', (req, res) => {
  const { idUsuario } = req.params;
  const usuarioId = Number(idUsuario);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ message: 'idUsuario inválido' });
  }

  db.query(
    'SELECT id_alergeno FROM usuario_alergeno WHERE id_usuario = ?',
    [usuarioId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error al obtener los alérgenos del usuario' });
      }

      res.json({ alergenos: results });
    }
  );
});

router.post('/alergenos/:idUsuario', (req, res) => {
  const { idUsuario } = req.params;
  const { id_alergeno } = req.body;
  const usuarioId = Number(idUsuario);
  const alergenoId = Number(id_alergeno);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ message: 'idUsuario inválido' });
  }

  if (!Number.isInteger(alergenoId) || alergenoId <= 0) {
    return res.status(400).json({ message: 'id_alergeno inválido' });
  }

  db.query(
    'INSERT INTO usuario_alergeno (id_usuario, id_alergeno) VALUES (?, ?)',
    [usuarioId, alergenoId],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'El alérgeno ya está asignado al usuario' });
        }
        return res.status(500).json({ message: 'Error al añadir el alérgeno al usuario' });
      }

      res.status(201).json({ message: 'Alérgeno añadido correctamente' });
    }
  );
});

router.delete('/alergenos/:idUsuario/:idAlergeno', (req, res) => {
  const { idUsuario, idAlergeno } = req.params;
  const usuarioId = Number(idUsuario);
  const alergenoId = Number(idAlergeno);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ message: 'idUsuario inválido' });
  }

  if (!Number.isInteger(alergenoId) || alergenoId <= 0) {
    return res.status(400).json({ message: 'idAlergeno inválido' });
  }

  db.query(
    'DELETE FROM usuario_alergeno WHERE id_usuario = ? AND id_alergeno = ?',
    [usuarioId, alergenoId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al eliminar el alérgeno del usuario' });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ message: 'No se encontró el alérgeno para ese usuario' });
      }

      res.json({ message: 'Alérgeno eliminado correctamente' });
    }
  );
});

module.exports = router;