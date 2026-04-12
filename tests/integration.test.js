const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock de db
jest.mock('../config/db', () => ({
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
}));

const db = require('../config/db');

// Importar rutas
const usuariosRouter = require('../routes/usuarios');
const recetasRouter = require('../routes/recetas');

// Mock del middleware auth para simular token válido
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1 };
  next();
});

const app = express();
app.use(express.json());
app.use('/usuarios', usuariosRouter);
app.use('/recetas', recetasRouter);

describe('Prueba de Integración: Flujo Completo de Usuario y Receta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Debería permitir registrar usuario, hacer login y crear receta', async () => {
    // Mock registro
    db.query
      .mockImplementationOnce((sql, params, callback) => {
        if (sql.includes('SELECT id_usuario FROM usuario')) {
          callback(null, []);
        }
      })
      .mockImplementationOnce((sql, params, callback) => {
        callback(null, { insertId: 1 });
      });

    // Registro
    const registroResponse = await request(app)
      .post('/usuarios/registro')
      .send({
        nombre: 'Usuario',
        apellidos: 'Test',
        telefono: '123456789',
        email: 'usuario@test.com',
        password: 'password123'
      });

    expect(registroResponse.status).toBe(201);

    // Mock login
    db.query.mockImplementation((sql, params, callback) => {
      callback(null, [{
        id_usuario: 1,
        email: 'usuario@test.com',
        password: '$2b$10$hashedpassword', // Simular hash
        admin: false
      }]);
    });

    // Login
    const loginResponse = await request(app)
      .post('/usuarios/login')
      .send({
        email: 'usuario@test.com',
        password: 'password123'
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    // Mock creación de receta
    db.beginTransaction.mockImplementation((callback) => callback(null));
    db.query
      .mockImplementationOnce((sql, params, callback) => callback(null, { insertId: 1 }))
      .mockImplementationOnce((sql, params, callback) => callback(null))
      .mockImplementationOnce((sql, params, callback) => callback(null))
      .mockImplementationOnce((sql, params, callback) => callback(null));
    db.commit.mockImplementation((callback) => callback(null));

    // Crear receta
    const recetaResponse = await request(app)
      .post('/recetas')
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .send({
        nombre: 'Receta Integración',
        imagen: 'receta.jpg',
        calorias: 200,
        grasas: 15,
        azucares: 10,
        ingredientes: [{ orden: 1, cantidad: 2, unidad: 'kg', ingrediente: 'Papa' }],
        pasos: [{ numero: 1, descripcion: 'Pelar y cocinar' }],
        alergenos: [],
        categorias: [1]
      });

    expect(recetaResponse.status).toBe(201);
    expect(recetaResponse.body.message).toBe('Receta creada correctamente');
  });
});