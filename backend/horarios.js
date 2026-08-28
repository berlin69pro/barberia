const express = require("express");
const conexion = require("./database");

const router = express.Router();


// =====================================================
// ORDEN DE DÍAS
// =====================================================

const ORDEN_DIAS = `
    CASE
        WHEN dia_semana = 'Lunes' THEN 1
        WHEN dia_semana = 'Martes' THEN 2
        WHEN dia_semana IN ('Miércoles', 'Miercoles') THEN 3
        WHEN dia_semana = 'Jueves' THEN 4
        WHEN dia_semana = 'Viernes' THEN 5
        WHEN dia_semana IN ('Sábado', 'Sabado') THEN 6
        WHEN dia_semana = 'Domingo' THEN 7
        ELSE 8
    END
`;


// =====================================================
// OBTENER TODOS LOS HORARIOS
//
// /api/horarios
//
// También permite:
//
// /api/horarios?id_barbero=6
//
// En ese caso devuelve los horarios del barbero
// y también los horarios generales antiguos (NULL).
// =====================================================

router.get("/", (req, res) => {

    const id = req.query.id_barbero;

    let sql = `
        SELECT
            id_horario,
            id_barbero,
            dia_semana,
            hora_inicio,
            hora_fin,
            estado
        FROM horarios
    `;

    const parametros = [];


    // ---------------------------------------------
    // FILTRAR POR BARBERO
    // ---------------------------------------------

    if (
        id !== undefined &&
        id !== null &&
        String(id).trim() !== ""
    ) {

        const idBarbero = Number(id);

        if (!Number.isInteger(idBarbero)) {

            return res.status(400).json({
                error: "id_barbero inválido"
            });

        }

        sql += `
            WHERE
                id_barbero = ?
                OR id_barbero IS NULL
        `;

        parametros.push(idBarbero);

    }


    sql += `
        ORDER BY
            ${ORDEN_DIAS},
            hora_inicio ASC
    `;


    conexion.query(
        sql,
        parametros,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener horarios:",
                    error
                );

                return res.status(500).json({
                    error:
                        "Error al obtener los horarios"
                });

            }


            res.json(resultados);

        }
    );

});


// =====================================================
// OBTENER HORARIO POR ID
// =====================================================

router.get("/:id", (req, res) => {

    const id =
        Number(req.params.id);


    if (!Number.isInteger(id)) {

        return res.status(400).json({
            error: "ID de horario inválido"
        });

    }


    const sql = `
        SELECT
            id_horario,
            id_barbero,
            dia_semana,
            hora_inicio,
            hora_fin,
            estado
        FROM horarios
        WHERE id_horario = ?
    `;


    conexion.query(
        sql,
        [id],
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener horario:",
                    error
                );

                return res.status(500).json({
                    error:
                        "Error al obtener el horario"
                });

            }


            if (
                resultados.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Horario no encontrado"
                });

            }


            res.json(
                resultados[0]
            );

        }
    );

});


// =====================================================
// CREAR HORARIO
//
// Ejemplo:
//
// {
//     "id_barbero": 6,
//     "dia_semana": "Lunes",
//     "hora_inicio": "09:00",
//     "hora_fin": "18:00",
//     "estado": 1
// }
//
// id_barbero es opcional.
// Si no se manda, queda NULL y conserva el sistema
// de horarios generales.
// =====================================================

router.post("/", (req, res) => {

    const {
        id_barbero,
        dia_semana,
        hora_inicio,
        hora_fin,
        estado
    } = req.body;


    // ---------------------------------------------
    // VALIDACIONES
    // ---------------------------------------------

    if (
        !dia_semana ||
        !hora_inicio ||
        !hora_fin
    ) {

        return res.status(400).json({
            error:
                "Día, hora de inicio y hora de fin son obligatorios"
        });

    }


    if (
        hora_inicio >= hora_fin
    ) {

        return res.status(400).json({
            error:
                "La hora de inicio debe ser menor que la hora de cierre"
        });

    }


    // ---------------------------------------------
    // ID BARBERO
    // ---------------------------------------------

    let idBarbero = null;


    if (
        id_barbero !== undefined &&
        id_barbero !== null &&
        String(id_barbero).trim() !== ""
    ) {

        idBarbero =
            Number(id_barbero);


        if (
            !Number.isInteger(idBarbero)
        ) {

            return res.status(400).json({
                error:
                    "id_barbero inválido"
            });

        }

    }


    // ---------------------------------------------
    // ESTADO
    // ---------------------------------------------

    const nuevoEstado =
        estado === false ||
        estado === 0 ||
        estado === "0"
            ? 0
            : 1;


    // ---------------------------------------------
    // EVITAR DUPLICADOS
    // ---------------------------------------------

    const comprobar = `
        SELECT
            id_horario
        FROM horarios
        WHERE
            (
                id_barbero = ?
                OR (
                    id_barbero IS NULL
                    AND ? IS NULL
                )
            )
            AND dia_semana = ?
            AND hora_inicio = ?
            AND hora_fin = ?
        LIMIT 1
    `;


    conexion.query(
        comprobar,
        [
            idBarbero,
            idBarbero,
            dia_semana,
            hora_inicio,
            hora_fin
        ],
        (error, existentes) => {

            if (error) {

                console.error(
                    "❌ Error verificando horario:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudo verificar el horario"
                });

            }


            if (
                existentes.length > 0
            ) {

                return res.status(409).json({
                    error:
                        "Ese horario ya existe para este barbero y día",

                    id_horario:
                        existentes[0].id_horario
                });

            }


            // -----------------------------------------
            // INSERTAR
            // -----------------------------------------

            const sql = `
                INSERT INTO horarios
                (
                    id_barbero,
                    dia_semana,
                    hora_inicio,
                    hora_fin,
                    estado
                )
                VALUES (?, ?, ?, ?, ?)
            `;


            conexion.query(
                sql,
                [
                    idBarbero,
                    dia_semana,
                    hora_inicio,
                    hora_fin,
                    nuevoEstado
                ],
                (
                    insertError,
                    resultado
                ) => {

                    if (insertError) {

                        console.error(
                            "❌ Error al crear horario:",
                            insertError
                        );

                        return res.status(500).json({
                            error:
                                "No se pudo crear el horario"
                        });

                    }


                    res.status(201).json({

                        mensaje:
                            "Horario creado correctamente",

                        id_horario:
                            resultado.insertId,

                        id_barbero:
                            idBarbero,

                        dia_semana,

                        hora_inicio,

                        hora_fin,

                        estado:
                            nuevoEstado

                    });

                }
            );

        }
    );

});


// =====================================================
// EDITAR HORARIO
// =====================================================

router.put("/:id", (req, res) => {

    const id =
        Number(req.params.id);


    if (
        !Number.isInteger(id)
    ) {

        return res.status(400).json({
            error:
                "ID de horario inválido"
        });

    }


    const {
        id_barbero,
        dia_semana,
        hora_inicio,
        hora_fin,
        estado
    } = req.body;


    if (
        !dia_semana ||
        !hora_inicio ||
        !hora_fin
    ) {

        return res.status(400).json({
            error:
                "Día, hora de inicio y hora de fin son obligatorios"
        });

    }


    if (
        hora_inicio >= hora_fin
    ) {

        return res.status(400).json({
            error:
                "La hora de inicio debe ser menor que la hora de cierre"
        });

    }


    // ---------------------------------------------
    // ID BARBERO
    // ---------------------------------------------

    let idBarbero = null;


    if (
        id_barbero !== undefined &&
        id_barbero !== null &&
        String(id_barbero).trim() !== ""
    ) {

        idBarbero =
            Number(id_barbero);


        if (
            !Number.isInteger(idBarbero)
        ) {

            return res.status(400).json({
                error:
                    "id_barbero inválido"
            });

        }

    }


    // ---------------------------------------------
    // ESTADO
    // ---------------------------------------------

    const nuevoEstado =
        estado === false ||
        estado === 0 ||
        estado === "0"
            ? 0
            : 1;


    const sql = `
        UPDATE horarios
        SET
            id_barbero = ?,
            dia_semana = ?,
            hora_inicio = ?,
            hora_fin = ?,
            estado = ?
        WHERE
            id_horario = ?
    `;


    conexion.query(
        sql,
        [
            idBarbero,
            dia_semana,
            hora_inicio,
            hora_fin,
            nuevoEstado,
            id
        ],
        (
            error,
            resultado
        ) => {

            if (error) {

                console.error(
                    "❌ Error al editar horario:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudo editar el horario"
                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({
                    error:
                        "Horario no encontrado"
                });

            }


            res.json({

                mensaje:
                    "Horario actualizado correctamente"

            });

        }
    );

});


// =====================================================
// ACTIVAR / DESACTIVAR
// =====================================================

router.patch(
    "/:id/estado",
    (req, res) => {

        const id =
            Number(req.params.id);


        if (
            !Number.isInteger(id)
        ) {

            return res.status(400).json({
                error:
                    "ID de horario inválido"
            });

        }


        const nuevoEstado =
            req.body.estado === true ||
            req.body.estado === 1 ||
            req.body.estado === "1"
                ? 1
                : 0;


        const sql = `
            UPDATE horarios
            SET estado = ?
            WHERE id_horario = ?
        `;


        conexion.query(
            sql,
            [
                nuevoEstado,
                id
            ],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al cambiar estado:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo cambiar el estado"
                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Horario no encontrado"
                    });

                }


                res.json({

                    mensaje:
                        nuevoEstado === 1
                            ? "Horario activado correctamente"
                            : "Horario desactivado correctamente",

                    estado:
                        nuevoEstado

                });

            }
        );

    }
);


// =====================================================
// ELIMINAR HORARIO
// =====================================================

router.delete(
    "/:id",
    (req, res) => {

        const id =
            Number(req.params.id);


        if (
            !Number.isInteger(id)
        ) {

            return res.status(400).json({
                error:
                    "ID de horario inválido"
            });

        }


        const sql = `
            DELETE FROM horarios
            WHERE id_horario = ?
        `;


        conexion.query(
            sql,
            [id],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar horario:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo eliminar el horario"
                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Horario no encontrado"
                    });

                }


                res.json({

                    mensaje:
                        "Horario eliminado correctamente"

                });

            }
        );

    }
);


// =====================================================
// EXPORTAR
// =====================================================

module.exports = router;