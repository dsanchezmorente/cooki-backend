const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Mock del middleware auth
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1 };
  next();
});

// Mock de db
jest.mock('../config/db', () => ({
  query: jest.fn()
}));

const db = require('../config/db');
const usuariosRouter = require('../routes/usuarios');

// Para pruebas de rutas, usar supertest
const request = require('supertest');
const express = require('express');
const app = express();
app.use(express.json());
app.use('/usuarios', usuariosRouter);

describe('Rutas de Usuarios - Pruebas de Unidad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registro', () => {
    test('Debería hashear la contraseña correctamente', async () => {
      const password = 'password123';
      const hashed = await bcrypt.hash(password, 10);
      expect(await bcrypt.compare(password, hashed)).toBe(true);
    });

    test('Debería retornar 400 si faltan campos obligatorios', async () => {
      const response = await request(app)
        .post('/usuarios/registro')
        .send({ nombre: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Faltan campos obligatorios');
    });

    test('Debería retornar 409 si el email ya existe', async () => {
      db.query.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT id_usuario FROM usuario')) {
          callback(null, [{ id_usuario: 1 }]);
        }
      });

      const response = await request(app)
        .post('/usuarios/registro')
        .send({ nombre: 'Test', apellidos: 'User', email: 'test@example.com', password: 'pass' });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('El email ya está registrado');
    });

    test('Debería registrar usuario exitosamente', async () => {
      db.query
        .mockImplementationOnce((sql, params, callback) => {
          if (sql.includes('SELECT id_usuario FROM usuario')) {
            callback(null, []);
          }
        })
        .mockImplementationOnce((sql, params, callback) => {
          callback(null, { insertId: 1 });
        });

      const response = await request(app)
        .post('/usuarios/registro')
        .send({ nombre: 'Test', apellidos: 'User', telefono: '123', email: 'test@example.com', password: 'pass' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Usuario registrado correctamente');
    });
  });

  describe('Login', () => {
    test('Debería generar JWT correctamente', () => {
      const user = { id_usuario: 1, email: 'test@example.com', admin: false };
      const token = jwt.sign({ id: user.id_usuario, email: user.email, admin: user.admin }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
      expect(token).toBeDefined();
    });

    test('Debería retornar 401 si credenciales incorrectas', async () => {
      db.query.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .post('/usuarios/login')
        .send({ email: 'wrong@example.com', password: 'pass' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Credenciales incorrectas');
    });

    test('Debería retornar token si login exitoso', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);
      db.query.mockImplementation((sql, params, callback) => {
        callback(null, [{ id_usuario: 1, email: 'test@example.com', password: hashedPassword, admin: false }]);
      });

      const response = await request(app)
        .post('/usuarios/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Cambiar Contraseña', () => {
    test('Debería retornar 400 si faltan campos', async () => {
      const response = await request(app)
        .put('/usuarios/cambiar-password')
        .send({ currentPassword: 'oldpass' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Se requieren currentPassword y newPassword');
    });

    test('Debería retornar 401 si la contraseña actual es incorrecta', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);
      db.query.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT password FROM usuario')) {
          callback(null, [{ password: hashedPassword }]);
        }
      });

      const response = await request(app)
        .put('/usuarios/cambiar-password')
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Contraseña actual incorrecta');
    });

    test('Debería actualizar la contraseña correctamente', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);
      db.query
        .mockImplementationOnce((sql, params, callback) => {
          callback(null, [{ password: hashedPassword }]);
        })
        .mockImplementationOnce((sql, params, callback) => {
          callback(null, { affectedRows: 1 });
        });

      const response = await request(app)
        .put('/usuarios/cambiar-password')
        .send({ currentPassword: 'password', newPassword: 'newpass123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Contraseña actualizada correctamente');
    });
  });

  describe('Alergenos de usuario', () => {
    test('Debería retornar 400 si el body no es un array', async () => {
      const response = await request(app)
        .put('/usuarios/alergenos/1')
        .send({ alergenos: 'not-array' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El campo alergenos debe ser un array');
    });

    test('Debería actualizar la lista de alérgenos del usuario', async () => {
      db.query
        .mockImplementationOnce((sql, params, callback) => {
          if (sql.includes('DELETE FROM usuario_alergeno')) {
            callback(null, { affectedRows: 2 });
          }
        })
        .mockImplementationOnce((sql, params, callback) => {
          callback(null, { affectedRows: 2 });
        });

      const response = await request(app)
        .put('/usuarios/alergenos/1')
        .send({ alergenos: [1, 2] });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Alergenos actualizados correctamente');
      expect(response.body.alergenos).toEqual([1, 2]);
    });

    test('Debería permitir actualizar a lista vacía', async () => {
      db.query.mockImplementationOnce((sql, params, callback) => {
        if (sql.includes('DELETE FROM usuario_alergeno')) {
          callback(null, { affectedRows: 3 });
        }
      });

      const response = await request(app)
        .put('/usuarios/alergenos/1')
        .send({ alergenos: [] });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Alergenos actualizados correctamente');
      expect(response.body.alergenos).toEqual([]);
    });
  });
});