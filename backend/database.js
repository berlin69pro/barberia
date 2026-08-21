const mysql = require("mysql2");


// =====================================================
// CONFIGURACIÓN MYSQL
// =====================================================

const configuracion = {

    host:
        process.env.DB_HOST ||
        "localhost",

    port:
        Number(
            process.env.DB_PORT ||
            3306
        ),

    user:
        process.env.DB_USER ||
        "root",

    password:
        process.env.DB_PASSWORD ||
        "",

    database: "barberia",
        
    // SSL para Aiven
    ssl:
        process.env.DB_HOST
            ? {
                rejectUnauthorized: false
            }
            : undefined

};


// =====================================================
// POOL DE CONEXIONES
// =====================================================

const conexion = mysql.createPool({

    ...configuracion,

    waitForConnections:
        true,

    connectionLimit:
        5,

    maxIdle:
        5,

    idleTimeout:
        60000,

    queueLimit:
        0

});


// =====================================================
// VERIFICAR CONEXIÓN
// =====================================================

conexion.getConnection(
    (error, connection) => {

        if (error) {

            console.error(
                "❌ Error al conectar con MySQL:",
                error
            );

            return;

        }


        console.log(
            "✅ Conexión con MySQL establecida correctamente"
        );


        connection.release();

    }
);


// =====================================================
// MANEJO DE ERRORES DEL POOL
// =====================================================

conexion.on(
    "error",
    (error) => {

        console.error(
            "❌ Error en el pool MySQL:",
            error
        );

    }
);


// =====================================================
// EXPORTAR CONEXIÓN
// =====================================================

module.exports = conexion;