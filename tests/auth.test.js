const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');

// Mock de response
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
};

const mockNext = jest.fn();

describe('Middleware de Autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Debería llamar a next() con token válido', () => {
    const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET || 'secret');
    const mockReq = {
      headers: { authorization: `Bearer ${token}` }
    };

    verificarToken(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
  });

  test('Debería retornar 403 si no hay header de autorización', () => {
    const mockReq = { headers: {} };

    verificarToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token requerido' });
  });

  test('Debería retornar 401 si el token es inválido', () => {
    const mockReq = { headers: { authorization: 'Bearer invalidtoken' } };

    verificarToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' });
  });
});