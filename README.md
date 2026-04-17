# Cooki Backend

Backend de la aplicación Cooki - Sistema de gestión de recetas y usuarios.

## Tabla de Contenidos
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecutar el Proyecto](#ejecutar-el-proyecto)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Variables de Entorno](#variables-de-entorno)
- [Rutas Disponibles](#rutas-disponibles)

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes programas:

- **Node.js** (v16 o superior) - [Descargar](https://nodejs.org/)
- **npm** (incluido con Node.js)
- **MySQL** (v5.7 o superior) - [Descargar](https://www.mysql.com/downloads/)
- **Git** (opcional, para clonar el repositorio)

### Verificar Instalación

```bash
node --version
npm --version
mysql --version
```

## Instalación

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd cooki-backend
```

### 2. Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las dependencias definidas en `package.json`:
- **Express**: Framework web
- **MySQL2**: Cliente MySQL
- **dotenv**: Gestión de variables de entorno
- **bcrypt**: Encriptación de contraseñas
- **jsonwebtoken**: Autenticación JWT
- **cors**: Control de acceso de origen cruzado
- **jest** y **supertest**: Testing

## Configuración

### 1. Crear la Base de Datos

Abre MySQL en tu máquina y ejecuta el fichero .sql proporcionado.
El cual creará la base de datos COOKI , con sus tablas y algunos datos relacionados con categorías y alérgenos.

### 2. Crear Archivo de Variables de Entorno

En la raíz del proyecto, crea un archivo `.env`:

```bash
# En Windows (PowerShell)
echo $null > .env
```

```bash
# En Linux/Mac
touch .env
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` y añade la siguiente configuración:

```env
# Puerto del servidor
PORT=3000

# Base de datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=cooki
DB_PORT=3306

# JWT Secret (usa una cadena aleatoria segura)
JWT_SECRET=???

# Environment
NODE_ENV=development
```

> **Importante**: 
> - Reemplaza `tu_contraseña_mysql` con tu contraseña real de MySQL
> - No commits el archivo `.env` (ya está en `.gitignore`)

## Ejecutar el Proyecto

### Modo Desarrollo

```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

Deberías ver un mensaje como:
```
Conectando a la base de datos...
Conexión MySQL establecida.
```

### Probar el Servidor

Para verificar que el servidor está funcionando:

```bash
curl http://localhost:3000/health
```

Deberías recibir:
```json
{"status":"ok"}
```

## Ejecutar Tests

Para ejecutar la suite de tests:

```bash
npm test
```

### Tests Disponibles

- `auth.test.js` - Tests de autenticación
- `usuarios.test.js` - Tests de usuarios
- `recetas.test.js` - Tests de recetas
- `integration.test.js` - Tests de integración

## Estructura del Proyecto

```
cooki-backend/
├── config/
│   └── db.js                 # Configuración de base de datos MySQL
├── middleware/
│   └── auth.js               # Middleware de autenticación JWT
├── routes/
│   ├── usuarios.js           # Rutas de gestión de usuarios
│   └── recetas.js            # Rutas de gestión de recetas
├── tests/
│   ├── auth.test.js
│   ├── usuarios.test.js
│   ├── recetas.test.js
│   └── integration.test.js
├── server.js                 # Punto de entrada principal
├── package.json              # Dependencias del proyecto
├── .env.example              # Ejemplo de variables de entorno
├── .gitignore                # Archivos ignorados por Git
└── README.md                 # Este archivo
```

## Rutas Disponibles

### Health Check
- `GET /health` - Verifica que el servidor esté funcionando

### Usuarios
- `POST /usuarios/registro` - Registrar nuevo usuario (sin autenticación)
- `POST /usuarios/login` - Iniciar sesión (sin autenticación)
- `PUT /usuarios/cambiar-password` - Cambiar contraseña (requiere token)
- `GET /usuarios/alergenos/:idUsuario` - Obtener alergenos del usuario
- `PUT /usuarios/alergenos/:idUsuario` - Actualizar alergenos del usuario

### Recetas
- `POST /recetas` - Crear nueva receta (requiere token)
- `GET /recetas/:id` - Obtener receta por ID (requiere token)
- `PUT /recetas/:id` - Actualizar receta (requiere token)
- `DELETE /recetas/:id` - Eliminar receta (requiere token)
- `GET /recetas/recientes` - Obtener recetas recientes (requiere token)
- `GET /recetas/planificadas` - Obtener recetas planificadas (requiere token)
- `POST /recetas/planificar` - Planificar una receta (requiere token)

### Alergenos
- `GET /recetas/alergenos` - Obtener alergenos (requiere token)
- `POST /recetas/alergenos` - Crear alergeno (requiere token)
- `DELETE /recetas/alergenos/:id` - Eliminar alergeno (requiere token)

### Categorías
- `GET /recetas/categorias` - Obtener categorías (requiere token)
- `POST /recetas/categorias` - Crear categoría (requiere token)
- `DELETE /recetas/categorias/:id` - Eliminar categoría (requiere token)

## Solución de Problemas

### Error: "MYSQL_HOST is not recognized"
- Asegúrate de tener MySQL instalado y ejecutándose
- Verifica que las variables de entorno en `.env` sean correctas

### Error: "Cannot find module 'bcrypt'"
- Ejecuta `npm install` nuevamente
- En Windows, puede ser necesario: `npm install --build-from-source`

### Error: "Port 3000 is already in use"
- Cambia el puerto en `.env`: `PORT=3001`
- O termina el proceso que usa el puerto


---

**¿Necesitas ayuda?** Contacta con Daniel Sánchez-Gil Morente.
