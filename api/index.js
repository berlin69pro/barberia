try {

    const app = require("../backend/server");

    module.exports = app;

} catch (error) {

    console.error("❌ ERROR AL CARGAR BARBERIA:");
    console.error(error);

    module.exports = (req, res) => {

        res.status(500).json({

            error: "Error al iniciar la aplicación",

            mensaje: error.message,

            stack: error.stack

        });

    };

}