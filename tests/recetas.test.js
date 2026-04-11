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
const recetasRouter = require('../routes/recetas');

// Mock del middleware auth
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1 };
  next();
});

const app = express();
app.use(express.json());
app.use('/recetas', recetasRouter);

describe('Rutas de Recetas - Pruebas de Unidad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Crear Receta', () => {
    test('Debería retornar 201 al crear receta exitosamente', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null, { insertId: 1 }))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null));
      db.commit.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .post('/recetas')
        .set('Authorization', 'Bearer token')
        .send({
          nombre: 'Receta Test',
          imagen: 'img.jpg',
          calorias: 100,
          grasas: 10,
          azucares: 5,
          ingredientes: [{ orden: 1, cantidad: 1, unidad: 'kg', ingrediente: 'Tomate' }],
          pasos: [{ numero: 1, descripcion: 'Cortar' }],
          alergenos: [1],
          categorias: [1]
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Receta creada correctamente');
    });

    test('Debería manejar error en inserción de receta', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query.mockImplementation((sql, params, callback) => callback(new Error('DB Error')));

      const response = await request(app)
        .post('/recetas')
        .set('Authorization', 'Bearer token')
        .send({
          nombre: 'Receta Test',
          imagen: 'img.jpg',
          calorias: 100,
          grasas: 10,
          azucares: 5
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Obtener Recetas Recientes', () => {
    test('Debería retornar lista de recetas recientes', async () => {
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null, [
          { id_receta: 1, nombre: 'Receta 1', imagen: 'img1.jpg' }
        ]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [{ id_categoria: 1 }]));

      const response = await request(app)
        .get('/recetas/recientes')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Receta 1');
    });

    test('Debería retornar array vacío si no hay recetas', async () => {
      db.query.mockImplementation((sql, params, callback) => callback(null, []));

      const response = await request(app)
        .get('/recetas/recientes')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('Obtener Categorías', () => {
    test('Debería retornar lista de categorías', async () => {
      db.query.mockImplementation((sql, callback) => callback(null, [
        { id_categoria: 1, nombre: 'Vegetariana' }
      ]));

      const response = await request(app)
        .get('/recetas/categorias')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('Planificar Receta', () => {
    test('Debería planificar receta exitosamente', async () => {
      db.query.mockImplementation((sql, params, callback) => callback(null, { insertId: 1 }));

      const response = await request(app)
        .post('/recetas/planificar')
        .set('Authorization', 'Bearer token')
        .send({ fecha: '2023-01-01', id_receta: 1 });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Receta planificada correctamente');
    });
  });

  describe('Obtener Recetas Planificadas', () => {
    test('Debería retornar recetas planificadas', async () => {
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null, [
          { id_receta: 1, nombre: 'Receta 1', imagen: 'img1.jpg', fecha: '2023-01-01' }
        ]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [{ id_categoria: 1 }]));

      const response = await request(app)
        .get('/recetas/planificadas')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('Obtener Receta por ID', () => {
    test('Debería retornar receta completa', async () => {
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null, [
          { nombre: 'Receta 1', imagen: 'img.jpg', calorias: 100, grasas: 10, azucares: 5 }
        ]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [
          { orden: 1, cantidad: 1, unidad: 'kg', ingrediente: 'Tomate' }
        ]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [
          { numero: 1, descripcion: 'Cortar' }
        ]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [{ id_alergeno: 1 }]))
        .mockImplementationOnce((sql, params, callback) => callback(null, [{ id_categoria: 1 }]));

      const response = await request(app)
        .get('/recetas/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.nombre).toBe('Receta 1');
      expect(response.body.ingredientes).toHaveLength(1);
    });

    test('Debería retornar 404 si receta no encontrada', async () => {
      db.query.mockImplementation((sql, params, callback) => callback(null, []));

      const response = await request(app)
        .get('/recetas/999')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Receta no encontrada');
    });
  });
});