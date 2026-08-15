const mysql = require("mysql2");


// =====================================================
// CONFIGURACIÓN MYSQL
// =====================================================

const conexion = mysql.createConnection({

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

    database:
        process.env.DB_NAME ||
        "barberia",

    // SSL para Aiven
    ssl:
        process.env.DB_HOST
            ? {
                rejectUnauthorized: false
            }
            : undefined

});


// =====================================================
// CONEXIÓN
// =====================================================

conexion.connect(
    (error) => {

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

    }
);


module.exports = conexion;