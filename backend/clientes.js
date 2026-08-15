const express = require("express");
const conexion = require("./database");

const router = express.Router();


// ======================================================
// OBTENER TODOS LOS CLIENTES + RESUMEN
// ======================================================

router.get("/", (req, res) => {

    const sql = `
        SELECT
            c.id_cliente,
            c.nombre,
            c.telefono,
            c.correo,
            c.fecha_registro,

            COUNT(r.id_reserva) AS total_reservas,

            SUM(
                CASE
                    WHEN r.estado <> 'cancelada'
                    THEN 1
                    ELSE 0
                END
            ) AS reservas_activas,

            SUM(
                CASE
                    WHEN r.estado = 'completada'
                    THEN 1
                    ELSE 0
                END
            ) AS reservas_completadas,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.total_servicio,
                            s.precio,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS total_servicios,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.adelanto,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS total_adelantos,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.saldo,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS saldo_pendiente

        FROM clientes c

        LEFT JOIN reservas r
            ON r.id_cliente = c.id_cliente

        LEFT JOIN servicios s
            ON s.id_servicio = r.id_servicio

        GROUP BY
            c.id_cliente,
            c.nombre,
            c.telefono,
            c.correo,
            c.fecha_registro

        ORDER BY
            c.nombre ASC
    `;


    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener clientes:",
                    error
                );

                return res.status(500).json({
                    error:
                        "Error al obtener clientes"
                });

            }

            res.json(resultados);

        }
    );

});


// ======================================================
// OBTENER CLIENTE POR ID + HISTORIAL
// ======================================================

router.get("/:id", (req, res) => {

    const sqlCliente = `
        SELECT

            c.id_cliente,
            c.nombre,
            c.telefono,
            c.correo,
            c.fecha_registro,

            COUNT(r.id_reserva)
                AS total_reservas,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.total_servicio,
                            s.precio,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS total_servicios,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.adelanto,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS total_adelantos,

            COALESCE(
                SUM(
                    CASE
                        WHEN r.estado <> 'cancelada'
                        THEN COALESCE(
                            r.saldo,
                            0
                        )
                        ELSE 0
                    END
                ),
                0
            ) AS saldo_pendiente

        FROM clientes c

        LEFT JOIN reservas r
            ON r.id_cliente =
               c.id_cliente

        LEFT JOIN servicios s
            ON s.id_servicio =
               r.id_servicio

        WHERE
            c.id_cliente = ?

        GROUP BY

            c.id_cliente,
            c.nombre,
            c.telefono,
            c.correo,
            c.fecha_registro
    `;


    const sqlHistorial = `
        SELECT

            r.id_reserva,
            r.fecha,
            r.hora,
            r.estado,
            r.observaciones,

            COALESCE(
                r.total_servicio,
                s.precio,
                0
            ) AS total_servicio,

            COALESCE(
                r.adelanto,
                0
            ) AS adelanto,

            COALESCE(
                r.saldo,
                0
            ) AS saldo,

            COALESCE(
                r.adelanto_pagado,
                0
            ) AS adelanto_pagado,

            s.nombre AS servicio_nombre,

            b.nombre AS barbero_nombre

        FROM reservas r

        LEFT JOIN servicios s
            ON s.id_servicio =
               r.id_servicio

        LEFT JOIN barberos b
            ON b.id_barbero =
               r.id_barbero

        WHERE
            r.id_cliente = ?

        ORDER BY
            r.fecha DESC,
            r.hora DESC
    `;


    conexion.query(
        sqlCliente,
        [req.params.id],
        (error, clientes) => {

            if (error) {

                console.error(
                    "❌ Error al obtener cliente:",
                    error
                );

                return res.status(500).json({
                    error:
                        "Error al obtener cliente"
                });

            }


            if (
                clientes.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Cliente no encontrado"
                });

            }


            conexion.query(
                sqlHistorial,
                [req.params.id],
                (
                    errorHistorial,
                    historial
                ) => {

                    if (errorHistorial) {

                        console.error(
                            "❌ Error al obtener historial:",
                            errorHistorial
                        );

                        return res.status(500).json({
                            error:
                                "Error al obtener historial del cliente"
                        });

                    }


                    res.json({

                        ...clientes[0],

                        historial:
                            historial

                    });

                }
            );

        }
    );

});


// ======================================================
// CREAR CLIENTE
// ======================================================

router.post("/", (req, res) => {

    const {
        nombre,
        telefono,
        correo
    } = req.body;


    if (
        !nombre ||
        !nombre.trim()
    ) {

        return res.status(400).json({

            error:
                "El nombre del cliente es obligatorio"

        });

    }


    const sql = `
        INSERT INTO clientes
        (
            nombre,
            telefono,
            correo
        )
        VALUES (?, ?, ?)
    `;


    conexion.query(
        sql,
        [
            nombre.trim(),

            telefono
                ? telefono.trim()
                : null,

            correo
                ? correo.trim()
                : null
        ],
        (
            error,
            resultado
        ) => {

            if (error) {

                console.error(
                    "❌ Error al crear cliente:",
                    error
                );

                return res.status(500).json({

                    error:
                        "No se pudo crear el cliente"

                });

            }


            res.status(201).json({

                mensaje:
                    "Cliente creado correctamente",

                id_cliente:
                    resultado.insertId

            });

        }
    );

});


// ======================================================
// EDITAR CLIENTE
// ======================================================

router.put("/:id", (req, res) => {

    const {
        nombre,
        telefono,
        correo
    } = req.body;


    if (
        !nombre ||
        !nombre.trim()
    ) {

        return res.status(400).json({

            error:
                "El nombre del cliente es obligatorio"

        });

    }


    const sql = `
        UPDATE clientes

        SET
            nombre = ?,
            telefono = ?,
            correo = ?

        WHERE
            id_cliente = ?
    `;


    conexion.query(
        sql,
        [
            nombre.trim(),

            telefono
                ? telefono.trim()
                : null,

            correo
                ? correo.trim()
                : null,

            req.params.id
        ],
        (
            error,
            resultado
        ) => {

            if (error) {

                console.error(
                    "❌ Error al editar cliente:",
                    error
                );

                return res.status(500).json({

                    error:
                        "No se pudo editar el cliente"

                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({

                    error:
                        "Cliente no encontrado"

                });

            }


            res.json({

                mensaje:
                    "Cliente actualizado correctamente"

            });

        }
    );

});


// ======================================================
// ELIMINAR CLIENTE
// ======================================================

router.delete("/:id", (req, res) => {

    const sql = `
        DELETE FROM clientes
        WHERE id_cliente = ?
    `;


    conexion.query(
        sql,
        [req.params.id],
        (
            error,
            resultado
        ) => {

            if (error) {

                console.error(
                    "❌ Error al eliminar cliente:",
                    error
                );


                if (
                    error.code ===
                    "ER_ROW_IS_REFERENCED_2"
                    ||
                    error.code ===
                    "ER_ROW_IS_REFERENCED"
                ) {

                    return res.status(409).json({

                        error:
                            "No se puede eliminar este cliente porque tiene reservas registradas."

                    });

                }


                return res.status(500).json({

                    error:
                        "No se pudo eliminar el cliente"

                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({

                    error:
                        "Cliente no encontrado"

                });

            }


            res.json({

                mensaje:
                    "Cliente eliminado correctamente"

            });

        }
    );

});


module.exports = router;