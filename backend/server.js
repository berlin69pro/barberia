require("dotenv").config();

const express = require("express");
const path = require("path");
const conexion = require("./database");

const authRoutes = require("./auth");
const barberosRoutes = require("./barberos");
const serviciosRoutes = require("./servicios");
const horariosRoutes = require("./horarios");
const reservasRoutes = require("./reservas");
const clientesRoutes = require("./clientes");
const galeriaRoutes = require("./galeria");
const promocionesRoutes = require("./promociones");
const configuracionRoutes = require("./configuracion");
const estadisticasRoutes = require("./estadisticas");
const pagosRoutes = require("./pagos");

const app = express();

const PORT = 3000;


// ========================================
// CONFIGURACIÓN
// ========================================

app.use(express.json());


// ========================================
// ARCHIVOS FRONTEND
// ========================================

app.use(
    express.static(
        path.join(
            __dirname,
            "../frontend"
        )
    )
);


// ========================================
// ARCHIVOS SUBIDOS
// ========================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "../uploads"
        )
    )
);

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "../frontend/uploads"
        )
    )
);


// ========================================
// AUTENTICACIÓN
// ========================================

app.use(
    "/api/auth",
    authRoutes
);


// ========================================
// BARBEROS
// ========================================

app.use(
    "/api/barberos",
    barberosRoutes
);


// ========================================
// SERVICIOS
// ========================================

app.use(
    "/api/servicios",
    serviciosRoutes
);


// ========================================
// HORARIOS
// ========================================

app.use(
    "/api/horarios",
    horariosRoutes
);


// ========================================
// RESERVAS
// ========================================

app.use(
    "/api/reservas",
    reservasRoutes
);


// ========================================
// CLIENTES
// ========================================

app.use(
    "/api/clientes",
    clientesRoutes
);


// ========================================
// PAGOS
// ========================================

app.use(
    "/api/pagos",
    pagosRoutes
);


// ========================================
// GALERÍA
// ========================================

app.use(
    "/api/galeria",
    galeriaRoutes
);


// ========================================
// PROMOCIONES
// ========================================

app.use(
    "/api/promociones",
    promocionesRoutes
);


// ========================================
// CONFIGURACIÓN
// ========================================

app.use(
    "/api/configuracion",
    configuracionRoutes
);


// ========================================
// ESTADÍSTICAS
// ========================================

app.use(
    "/api/estadisticas",
    estadisticasRoutes
);


// ========================================
// RUTA PRINCIPAL
// ========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend/index.html"
        )
    );

});


// ========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ========================================

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith("/api/")
        ) {

            return res.status(404).json({

                error:
                    "Ruta API no encontrada"

            });

        }

        next();

    }
);


// ========================================
// MANEJO GENERAL DE ERRORES
// ========================================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Error del servidor:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(error);

        }


        res.status(500).json({

            error:
                error.message ||
                "Error interno del servidor"

        });

    }
);


// ========================================
// SERVIDOR
// ========================================

// En local inicia el servidor.
// En Vercel se exporta la aplicación.

if (require.main === module) {

    app.listen(
        PORT,
        () => {

            console.log(
                `Servidor funcionando en http://localhost:${PORT}`
            );

        }
    );

}


// ========================================
// EXPORTAR APLICACIÓN
// ========================================

module.exports = app;