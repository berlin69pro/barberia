const bcrypt = require("bcrypt");
const conexion = require("./database");

const usuario = "admin";
const nuevaPassword = "Barberia2026";

async function cambiarPassword() {
    try {

        const passwordHash = await bcrypt.hash(nuevaPassword, 10);

        const sql = `
            UPDATE usuarios
            SET password = ?
            WHERE usuario = ?
        `;

        conexion.query(
            sql,
            [passwordHash, usuario],
            (error, resultado) => {

                if (error) {
                    console.error("❌ Error al cambiar contraseña:", error);
                    conexion.end();
                    return;
                }

                if (resultado.affectedRows === 0) {
                    console.log("❌ No se encontró el usuario admin");
                } else {
                    console.log("✅ Contraseña del administrador actualizada");
                    console.log("Usuario:", usuario);
                    console.log("Contraseña:", nuevaPassword);
                }

                conexion.end();
            }
        );

    } catch (error) {
        console.error("❌ Error:", error);
        conexion.end();
    }
}

cambiarPassword();