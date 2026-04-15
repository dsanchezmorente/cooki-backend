const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret';

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
      db.rollback.mockImplementation((callback) => callback(null));

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

  describe('Obtener Alergenos', () => {
    test('Debería retornar lista de alérgenos', async () => {
      db.query.mockImplementation((sql, paramsOrCallback, maybeCallback) => {
        const callback = typeof paramsOrCallback === 'function' ? paramsOrCallback : maybeCallback;
        callback(null, [{ id_alergeno: 1, nombre: 'Gluten' }]);
      });

      const response = await request(app)
        .get('/recetas/alergenos')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].nombre).toBe('Gluten');
    });
  });

  describe('Crear Alergeno', () => {
    test('Debería crear un alérgeno nuevo correctamente', async () => {
      db.query.mockImplementation((sql, params, callback) => callback(null, { insertId: 2 }));

      const response = await request(app)
        .post('/recetas/alergenos')
        .set('Authorization', 'Bearer token')
        .send({ nombre: 'Lácteos' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Alergeno creado correctamente');
      expect(response.body.id_alergeno).toBe(2);
    });

    test('Debería retornar 400 si falta el nombre', async () => {
      const response = await request(app)
        .post('/recetas/alergenos')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El nombre del alérgeno es obligatorio');
    });
  });

  describe('Eliminar Alergeno', () => {
    test('Debería eliminar alérgeno y registros relacionados', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 1 }));
      db.commit.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .delete('/recetas/alergenos/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Alergeno eliminado correctamente');
    });

    test('Debería retornar 404 si el alérgeno no existe', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 0 }));
      db.rollback.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .delete('/recetas/alergenos/999')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Alergeno no encontrado');
    });
  });

  describe('Eliminar Categoría', () => {
    test('Debería eliminar categoría y registros relacionados', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 1 }));
      db.commit.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .delete('/recetas/categorias/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Categoría eliminada correctamente');
    });

    test('Debería retornar 404 si la categoría no existe', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 0 }));
      db.rollback.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .delete('/recetas/categorias/999')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Categoría no encontrada');
    });
  });

  describe('Obtener Categorías', () => {
    test('Debería retornar lista de categorías', async () => {
      db.query.mockImplementation((sql, paramsOrCallback, maybeCallback) => {
        const callback = typeof paramsOrCallback === 'function' ? paramsOrCallback : maybeCallback;
        callback(null, [{ id_categoria: 1, nombre: 'Vegetariana' }]);
      });

      const response = await request(app)
        .get('/recetas/categorias')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('Crear Categoría', () => {
    test('Debería crear una categoría nueva correctamente', async () => {
      db.query.mockImplementation((sql, params, callback) => callback(null, { insertId: 2 }));

      const response = await request(app)
        .post('/recetas/categorias')
        .set('Authorization', 'Bearer token')
        .send({ nombre: 'Postre', icono: 'cake', color: '#FF00FF' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Categoría creada correctamente');
      expect(response.body.id_categoria).toBe(2);
    });

    test('Debería retornar 400 si faltan datos', async () => {
      const response = await request(app)
        .post('/recetas/categorias')
        .set('Authorization', 'Bearer token')
        .send({ nombre: 'Postre', icono: 'cake' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Nombre, icono y color son obligatorios');
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

  describe('Actualizar Receta', () => {
    test('Debería actualizar receta correctamente', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 1 }))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null));
      db.commit.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .put('/recetas/1')
        .set('Authorization', 'Bearer token')
        .send({
          nombre: 'Receta Actualizada',
          imagen: 'img_new.jpg',
          calorias: 120,
          grasas: 12,
          azucares: 6,
          ingredientes: [{ orden: 1, cantidad: 2, unidad: 'kg', ingrediente: 'Pimiento' }],
          pasos: [{ numero: 1, descripcion: 'Mezclar' }],
          alergenos: [2],
          categorias: [2]
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Receta actualizada correctamente');
    });
  });

  describe('Eliminar Receta', () => {
    test('Debería eliminar receta correctamente', async () => {
      db.beginTransaction.mockImplementation((callback) => callback(null));
      db.query
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null))
        .mockImplementationOnce((sql, params, callback) => callback(null, { affectedRows: 1 }));
      db.commit.mockImplementation((callback) => callback(null));

      const response = await request(app)
        .delete('/recetas/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Receta eliminada correctamente');
    });
  });
});