const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const conexion = require("./database");

const router = express.Router();

const JWT_SECRET = "BARBERIA_CLAVE_SECRETA_2026";

// LOGIN
router.post("/login", (req, res) => {

    const { usuario, password } = req.body;

    // Verificar que llegaron los datos
    if (!usuario || !password) {
        return res.status(400).json({
            error: "Usuario y contraseña son obligatorios"
        });
    }

    const sql = `
        SELECT *
        FROM usuarios
        WHERE usuario = ?
        AND estado = TRUE
        LIMIT 1
    `;

    conexion.query(sql, [usuario], async (error, resultados) => {

        if (error) {
            console.error("❌ Error al consultar usuario:", error);

            return res.status(500).json({
                error: "Error interno del servidor"
            });
        }

        // Usuario no encontrado
        if (resultados.length === 0) {
            return res.status(401).json({
                error: "Usuario o contraseña incorrectos"
            });
        }

        const usuarioBD = resultados[0];

        try {

            // Comprobar contraseña
            const passwordCorrecta = await bcrypt.compare(
                password,
                usuarioBD.password
            );

            if (!passwordCorrecta) {
                return res.status(401).json({
                    error: "Usuario o contraseña incorrectos"
                });
            }

            // Crear token
            const token = jwt.sign(
                {
                    id_usuario: usuarioBD.id_usuario,
                    usuario: usuarioBD.usuario,
                    rol: usuarioBD.rol
                },
                JWT_SECRET,
                {
                    expiresIn: "8h"
                }
            );

            res.json({
                mensaje: "Inicio de sesión correcto",
                token: token,
                usuario: {
                    id_usuario: usuarioBD.id_usuario,
                    nombre: usuarioBD.nombre,
                    usuario: usuarioBD.usuario,
                    rol: usuarioBD.rol
                }
            });

        } catch (error) {

            console.error("❌ Error al verificar contraseña:", error);

            res.status(500).json({
                error: "Error al procesar el inicio de sesión"
            });

        }

    });

});

module.exports = router;