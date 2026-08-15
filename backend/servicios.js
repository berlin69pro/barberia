const express = require("express");
const path = require("path");
const multer = require("multer");
const conexion = require("./database");

const router = express.Router();


// ========================================
// CONFIGURACIÓN DE IMÁGENES
// ========================================

const almacenamiento = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            path.join(
                __dirname,
                "../frontend/uploads"
            )
        );

    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(file.originalname);

        const nombreArchivo =
            "servicio-" +
            Date.now() +
            extension;

        cb(
            null,
            nombreArchivo
        );

    }

});


const filtroImagen = (req, file, cb) => {

    const permitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (permitidos.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Solo se permiten imágenes JPG, PNG o WEBP"
            )
        );

    }

};


const subirImagen = multer({

    storage: almacenamiento,

    fileFilter: filtroImagen,

    limits: {
        fileSize: 5 * 1024 * 1024
    }

});


// ========================================
// LISTAR SERVICIOS
// ========================================

router.get("/", (req, res) => {

    const sql = `
        SELECT *
        FROM servicios
        ORDER BY id_servicio DESC
    `;

    conexion.query(sql, (error, resultados) => {

        if (error) {

            console.error(
                "❌ Error al obtener servicios:",
                error
            );

            return res.status(500).json({
                error: "Error al obtener los servicios"
            });

        }

        res.json(resultados);

    });

});


// ========================================
// OBTENER UN SERVICIO
// ========================================

router.get("/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM servicios
        WHERE id_servicio = ?
    `;

    conexion.query(
        sql,
        [id],
        (error, resultados) => {

            if (error) {

                return res.status(500).json({
                    error: "Error al obtener el servicio"
                });

            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    error: "Servicio no encontrado"
                });

            }

            res.json(resultados[0]);

        }
    );

});


// ========================================
// CREAR SERVICIO
// ========================================

router.post(
    "/",
    subirImagen.single("foto"),
    (req, res) => {

        const {
            nombre,
            descripcion,
            precio,
            duracion
        } = req.body;


        if (!nombre || !nombre.trim()) {

            return res.status(400).json({
                error: "El nombre del servicio es obligatorio"
            });

        }


        if (
            precio === undefined ||
            precio === "" ||
            Number(precio) < 0
        ) {

            return res.status(400).json({
                error: "El precio no es válido"
            });

        }


        if (
            duracion === undefined ||
            duracion === "" ||
            Number(duracion) <= 0
        ) {

            return res.status(400).json({
                error: "La duración no es válida"
            });

        }


        const foto = req.file
            ? "/uploads/" + req.file.filename
            : null;


        const sql = `
            INSERT INTO servicios
            (
                nombre,
                descripcion,
                precio,
                duracion,
                foto,
                estado
            )
            VALUES (?, ?, ?, ?, ?, TRUE)
        `;


        conexion.query(
            sql,
            [
                nombre.trim(),
                descripcion || null,
                Number(precio),
                Number(duracion),
                foto
            ],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al crear servicio:",
                        error
                    );

                    return res.status(500).json({
                        error: "No se pudo crear el servicio"
                    });

                }


                res.status(201).json({

                    mensaje:
                        "Servicio creado correctamente",

                    id_servicio:
                        resultado.insertId,

                    foto:
                        foto

                });

            }
        );

    }
);


// ========================================
// EDITAR SERVICIO
// ========================================

router.put(
    "/:id",
    subirImagen.single("foto"),
    (req, res) => {

        const id = req.params.id;

        const {
            nombre,
            descripcion,
            precio,
            duracion,
            estado
        } = req.body;


        if (!nombre || !nombre.trim()) {

            return res.status(400).json({
                error: "El nombre del servicio es obligatorio"
            });

        }


        if (
            precio === undefined ||
            precio === "" ||
            Number(precio) < 0
        ) {

            return res.status(400).json({
                error: "El precio no es válido"
            });

        }


        if (
            duracion === undefined ||
            duracion === "" ||
            Number(duracion) <= 0
        ) {

            return res.status(400).json({
                error: "La duración no es válida"
            });

        }


        let sql;
        let valores;


        if (req.file) {

            const foto =
                "/uploads/" +
                req.file.filename;


            sql = `
                UPDATE servicios

                SET
                    nombre = ?,
                    descripcion = ?,
                    precio = ?,
                    duracion = ?,
                    foto = ?,
                    estado = ?

                WHERE id_servicio = ?
            `;


            valores = [

                nombre.trim(),

                descripcion || null,

                Number(precio),

                Number(duracion),

                foto,

                estado ? 1 : 0,

                id

            ];

        } else {

            sql = `
                UPDATE servicios

                SET
                    nombre = ?,
                    descripcion = ?,
                    precio = ?,
                    duracion = ?,
                    estado = ?

                WHERE id_servicio = ?
            `;


            valores = [

                nombre.trim(),

                descripcion || null,

                Number(precio),

                Number(duracion),

                estado ? 1 : 0,

                id

            ];

        }


        conexion.query(
            sql,
            valores,
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al editar servicio:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo editar el servicio"
                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Servicio no encontrado"
                    });

                }


                res.json({

                    mensaje:
                        "Servicio actualizado correctamente"

                });

            }
        );

    }
);


// ========================================
// ACTIVAR / DESACTIVAR
// ========================================

router.patch(
    "/:id/estado",
    (req, res) => {

        const id = req.params.id;

        const { estado } = req.body;


        const nuevoEstado =
            estado === true ||
            estado === 1
                ? 1
                : 0;


        const sql = `
            UPDATE servicios
            SET estado = ?
            WHERE id_servicio = ?
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
                        error:
                            "No se pudo cambiar el estado"
                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Servicio no encontrado"
                    });

                }


                res.json({

                    mensaje:
                        nuevoEstado === 1
                            ? "Servicio activado correctamente"
                            : "Servicio desactivado correctamente",

                    estado:
                        nuevoEstado

                });

            }
        );

    }
);


// ========================================
// ELIMINAR SERVICIO
// ========================================

router.delete(
    "/:id",
    (req, res) => {

        const id = req.params.id;


        const sql = `
            DELETE FROM servicios
            WHERE id_servicio = ?
        `;


        conexion.query(
            sql,
            [id],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar servicio:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo eliminar el servicio. Puede tener reservas asociadas."
                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Servicio no encontrado"
                    });

                }


                res.json({

                    mensaje:
                        "Servicio eliminado correctamente"

                });

            }
        );

    }
);


module.exports = router;