const express = require("express");
const conexion = require("./database");

const router = express.Router();


// ========================================
// OBTENER TODOS LOS HORARIOS
// ========================================

router.get("/", (req, res) => {

    const sql = `
        SELECT *
        FROM horarios
        ORDER BY
            CASE dia_semana
                WHEN 'Lunes' THEN 1
                WHEN 'Martes' THEN 2
                WHEN 'Miércoles' THEN 3
                WHEN 'Jueves' THEN 4
                WHEN 'Viernes' THEN 5
                WHEN 'Sábado' THEN 6
                WHEN 'Domingo' THEN 7
            END
    `;

    conexion.query(sql, (error, resultados) => {

        if (error) {

            console.error(
                "❌ Error al obtener horarios:",
                error
            );

            return res.status(500).json({
                error: "Error al obtener los horarios"
            });

        }

        res.json(resultados);

    });

});


// ========================================
// OBTENER HORARIO POR ID
// ========================================

router.get("/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM horarios
        WHERE id_horario = ?
    `;

    conexion.query(
        sql,
        [id],
        (error, resultados) => {

            if (error) {

                return res.status(500).json({
                    error: "Error al obtener el horario"
                });

            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    error: "Horario no encontrado"
                });

            }

            res.json(resultados[0]);

        }
    );

});


// ========================================
// CREAR HORARIO
// ========================================

router.post("/", (req, res) => {

    const {
        dia_semana,
        hora_inicio,
        hora_fin
    } = req.body;


    if (
        !dia_semana ||
        !hora_inicio ||
        !hora_fin
    ) {

        return res.status(400).json({
            error: "Todos los campos son obligatorios"
        });

    }


    if (hora_inicio >= hora_fin) {

        return res.status(400).json({
            error: "La hora de inicio debe ser menor que la hora de cierre"
        });

    }


    const sql = `
        INSERT INTO horarios
        (
            dia_semana,
            hora_inicio,
            hora_fin,
            estado
        )
        VALUES (?, ?, ?, TRUE)
    `;


    conexion.query(
        sql,
        [
            dia_semana,
            hora_inicio,
            hora_fin
        ],
        (error, resultado) => {

            if (error) {

                console.error(
                    "❌ Error al crear horario:",
                    error
                );

                return res.status(500).json({
                    error: "No se pudo crear el horario"
                });

            }


            res.status(201).json({

                mensaje:
                    "Horario creado correctamente",

                id_horario:
                    resultado.insertId

            });

        }
    );

});


// ========================================
// EDITAR HORARIO
// ========================================

router.put("/:id", (req, res) => {

    const id = req.params.id;

    const {
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
            error: "Todos los campos son obligatorios"
        });

    }


    if (hora_inicio >= hora_fin) {

        return res.status(400).json({
            error: "La hora de inicio debe ser menor que la hora de cierre"
        });

    }


    const sql = `
        UPDATE horarios

        SET
            dia_semana = ?,
            hora_inicio = ?,
            hora_fin = ?,
            estado = ?

        WHERE id_horario = ?
    `;


    conexion.query(
        sql,
        [
            dia_semana,
            hora_inicio,
            hora_fin,
            estado ? 1 : 0,
            id
        ],
        (error, resultado) => {

            if (error) {

                console.error(
                    "❌ Error al editar horario:",
                    error
                );

                return res.status(500).json({
                    error: "No se pudo editar el horario"
                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({
                    error: "Horario no encontrado"
                });

            }


            res.json({

                mensaje:
                    "Horario actualizado correctamente"

            });

        }
    );

});


// ========================================
// ACTIVAR / DESACTIVAR
// ========================================

router.patch("/:id/estado", (req, res) => {

    const id = req.params.id;

    const {
        estado
    } = req.body;


    const nuevoEstado =
        estado === true ||
        estado === 1
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
        (error, resultado) => {

            if (error) {

                return res.status(500).json({
                    error: "No se pudo cambiar el estado"
                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({
                    error: "Horario no encontrado"
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

});


// ========================================
// ELIMINAR HORARIO
// ========================================

router.delete("/:id", (req, res) => {

    const id = req.params.id;


    const sql = `
        DELETE FROM horarios
        WHERE id_horario = ?
    `;


    conexion.query(
        sql,
        [id],
        (error, resultado) => {

            if (error) {

                console.error(
                    "❌ Error al eliminar horario:",
                    error
                );

                return res.status(500).json({
                    error: "No se pudo eliminar el horario"
                });

            }


            if (
                resultado.affectedRows === 0
            ) {

                return res.status(404).json({
                    error: "Horario no encontrado"
                });

            }


            res.json({

                mensaje:
                    "Horario eliminado correctamente"

            });

        }
    );

});


module.exports = router;