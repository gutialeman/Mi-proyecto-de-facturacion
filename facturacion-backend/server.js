// -----------------------------------------------------------
// Dependencias
// -----------------------------------------------------------
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { log } = require('console');

const app = express();
const PORT = 3000;
const saltRounds = 10; // Para el hashing de contraseñas

// -----------------------------------------------------------
// Configuración de la Base de Datos
// -----------------------------------------------------------
// Abre la base de datos de forma síncrona
const db = new sqlite3.Database('SQLite.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.db.');
        
        // ** CREACIÓN DE LA TABLA DE USUARIOS (EMPRESAS) **
        // Aseguramos que la tabla 'empresas' exista con las columnas requeridas
        db.run(`CREATE TABLE IF NOT EXISTS empresas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_empresa TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error("Error al crear la tabla 'empresas':", err.message);
            } else {
                console.log("Tabla 'empresas' asegurada (creada si no existía).");
            }
        });
    }
});

// -----------------------------------------------------------
// Middlewares
// -----------------------------------------------------------

// Configuración CORS - AJUSTAR PARA PRODUCCIÓN
// NOTA: Usar '*' solo para desarrollo. Cambiar a la URL específica del frontend en producción (ej. 'https://mi-facturacion.com')
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

app.use(express.json()); // Para parsear el body de las peticiones JSON

// -----------------------------------------------------------
// Rutas de Autenticación
// -----------------------------------------------------------

// 1. Ruta de REGISTRO (Crear Nueva Empresa)
app.post('/api/register', async (req, res) => {
    const { nombre_empresa, password } = req.body;

    // Validación básica de datos
    if (!nombre_empresa || !password) {
        return res.status(400).json({ error: 'Faltan datos de empresa o contraseña.' });
    }

    try {
        // 1. Verificar si la empresa ya existe
        db.get('SELECT nombre_empresa FROM empresas WHERE nombre_empresa = ?', [nombre_empresa], async (err, row) => {
            if (err) {
                // Error de la base de datos
                console.error("Error al verificar existencia de empresa:", err.message);
                return res.status(500).json({ error: 'Error interno del servidor al verificar la empresa.' });
            }
            
            if (row) {
                // La empresa ya existe
                return res.status(409).json({ error: 'La empresa con ese nombre ya está registrada.' });
            }

            // 2. Hashear la contraseña
            const password_hash = await bcrypt.hash(password, saltRounds);

            // 3. Insertar nuevo usuario
            db.run('INSERT INTO empresas (nombre_empresa, password_hash) VALUES (?, ?)', 
                [nombre_empresa, password_hash], 
                function(err) {
                if (err) {
                    // Este error capturará problemas como UNIQUE constraint fallido (aunque ya lo verificamos) o problemas de esquema.
                    console.error("Error al insertar nueva empresa:", err.message);
                    return res.status(500).json({ error: 'Error interno del servidor al registrar.' });
                }
                
                // Registro exitoso
                res.status(201).json({ 
                    message: 'Empresa registrada con éxito!', 
                    id: this.lastID,
                    nombre_empresa: nombre_empresa
                });
            });
        });

    } catch (error) {
        // Error general (ej. falla en bcrypt)
        console.error('Error general en el registro:', error);
        res.status(500).json({ error: 'Error interno inesperado.' });
    }
});

// 2. Ruta de LOGIN (Autenticar Empresa)
app.post('/api/login', (req, res) => {
    const { nombre_empresa, password } = req.body;

    if (!nombre_empresa || !password) {
        return res.status(400).json({ error: 'Faltan datos de empresa o contraseña.' });
    }

    db.get('SELECT password_hash FROM empresas WHERE nombre_empresa = ?', [nombre_empresa], async (err, row) => {
        if (err) {
            console.error("Error al buscar empresa en login:", err.message);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }

        if (!row) {
            // Empresa no encontrada
            return res.status(401).json({ error: 'Empresa o contraseña incorrecta.' });
        }

        // Comparar la contraseña hasheada
        const match = await bcrypt.compare(password, row.password_hash);

        if (match) {
            // Contraseña correcta
            res.status(200).json({ 
                message: 'Login exitoso', 
                nombre_empresa: nombre_empresa,
                // En una app real, aquí se generaría un JWT (JSON Web Token)
            });
        } else {
            // Contraseña incorrecta
            res.status(401).json({ error: 'Empresa o contraseña incorrecta.' });
        }
    });
});

// -----------------------------------------------------------
// Inicio del Servidor
// -----------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en: http://localhost:${PORT}`);
    console.log(`Rutas disponibles: /api/register (POST) y /api/login (POST)`);
});

// -----------------------------------------------------------
// Cierre Elegante de la Base de Datos
// -----------------------------------------------------------
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\nConexión a la base de datos cerrada. Servidor apagado.');
        process.exit(0);
    });
});

