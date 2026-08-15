const express = require("express");
const path = require("path");
const multer = require("multer");
const conexion = require("./database");

const router = express.Router();


// ========================================
// CONFIGURACIÓN DE MULTER
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
            "barbero-" +
            Date.now() +
            extension;

        cb(
            null,
            nombreArchivo
        );

    }

});


// ========================================
// FILTRO DE IMÁGENES
// ========================================

const filtroImagen = (
    req,
    file,
    cb
) => {

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (
        tiposPermitidos.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Solo se permiten imágenes JPG, PNG o WEBP"
            )
        );

    }

};


const subirImagen =
    multer({

        storage:
            almacenamiento,

        fileFilter:
            filtroImagen,

        limits: {

            fileSize:
                5 * 1024 * 1024

        }

    });


// ========================================
// OBTENER TODOS LOS BARBEROS
// ========================================

router.get("/", (req, res) => {

    const sql = `
        SELECT *
        FROM barberos
        ORDER BY id_barbero DESC
    `;

    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener barberos:",
                    error
                );

                return res.status(500).json({

                    error:
                        "Error al obtener los barberos"

                });

            }

            res.json(
                resultados
            );

        }
    );

});


// ========================================
// OBTENER UN BARBERO
// ========================================

router.get("/:id", (req, res) => {

    const id =
        req.params.id;

    const sql = `
        SELECT *
        FROM barberos
        WHERE id_barbero = ?
    `;

    conexion.query(
        sql,
        [id],
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener barbero:",
                    error
                );

                return res.status(500).json({

                    error:
                        "Error al obtener el barbero"

                });

            }

            if (
                resultados.length === 0
            ) {

                return res.status(404).json({

                    error:
                        "Barbero no encontrado"

                });

            }

            res.json(
                resultados[0]
            );

        }
    );

});


// ========================================
// AGREGAR BARBERO
// ========================================

router.post(
    "/",
    subirImagen.single("foto"),
    (req, res) => {

        const {
            nombre,
            descripcion,
            especialidad,
            telefono,
            instagram,
            tiktok,
            facebook,
            whatsapp
        } = req.body;


        if (
            !nombre ||
            !nombre.trim()
        ) {

            return res.status(400).json({

                error:
                    "El nombre del barbero es obligatorio"

            });

        }


        const foto =
            req.file
                ? "/uploads/" +
                  req.file.filename
                : null;


        const sql = `
            INSERT INTO barberos
            (
                nombre,
                descripcion,
                especialidad,
                telefono,
                instagram,
                tiktok,
                facebook,
                whatsapp,
                foto,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;


        conexion.query(
            sql,
            [
                nombre.trim(),
                descripcion || null,
                especialidad || null,
                telefono || null,
                instagram || null,
                tiktok || null,
                facebook || null,
                whatsapp || null,
                foto
            ],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al agregar barbero:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo agregar el barbero"

                    });

                }


                res.status(201).json({

                    mensaje:
                        "Barbero agregado correctamente",

                    id_barbero:
                        resultado.insertId,

                    foto:
                        foto

                });

            }
        );

    }
);


// ========================================
// EDITAR BARBERO
// ========================================

router.put(
    "/:id",
    subirImagen.single("foto"),
    (req, res) => {

        const id =
            req.params.id;


        const {
            nombre,
            descripcion,
            especialidad,
            telefono,
            instagram,
            tiktok,
            facebook,
            whatsapp,
            estado
        } = req.body;


        if (
            !nombre ||
            !nombre.trim()
        ) {

            return res.status(400).json({

                error:
                    "El nombre del barbero es obligatorio"

            });

        }


        let sql;

        let valores;


        if (req.file) {

            const foto =
                "/uploads/" +
                req.file.filename;


            sql = `
                UPDATE barberos

                SET
                    nombre = ?,
                    descripcion = ?,
                    especialidad = ?,
                    telefono = ?,
                    instagram = ?,
                    tiktok = ?,
                    facebook = ?,
                    whatsapp = ?,
                    foto = ?,
                    estado = ?

                WHERE id_barbero = ?
            `;


            valores = [

                nombre.trim(),

                descripcion || null,

                especialidad || null,

                telefono || null,

                instagram || null,

                tiktok || null,

                facebook || null,

                whatsapp || null,

                foto,

                estado ? 1 : 0,

                id

            ];

        } else {

            sql = `
                UPDATE barberos

                SET
                    nombre = ?,
                    descripcion = ?,
                    especialidad = ?,
                    telefono = ?,
                    instagram = ?,
                    tiktok = ?,
                    facebook = ?,
                    whatsapp = ?,
                    estado = ?

                WHERE id_barbero = ?
            `;


            valores = [

                nombre.trim(),

                descripcion || null,

                especialidad || null,

                telefono || null,

                instagram || null,

                tiktok || null,

                facebook || null,

                whatsapp || null,

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
                        "❌ Error al editar barbero:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo editar el barbero"

                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Barbero no encontrado"

                    });

                }


                res.json({

                    mensaje:
                        "Barbero actualizado correctamente"

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

        const id =
            req.params.id;

        const {
            estado
        } = req.body;


        const nuevoEstado =
            estado === true ||
            estado === 1
                ? 1
                : 0;


        const sql = `
            UPDATE barberos
            SET estado = ?
            WHERE id_barbero = ?
        `;


        conexion.query(
            sql,
            [
                nuevoEstado,
                id
            ],
            (error, resultado) => {

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
                            "Barbero no encontrado"

                    });

                }


                res.json({

                    mensaje:
                        nuevoEstado === 1
                            ? "Barbero activado correctamente"
                            : "Barbero desactivado correctamente",

                    estado:
                        nuevoEstado

                });

            }
        );

    }
);


// ========================================
// ELIMINAR BARBERO
// ========================================

router.delete(
    "/:id",
    (req, res) => {

        const id =
            req.params.id;


        const sql = `
            DELETE FROM barberos
            WHERE id_barbero = ?
        `;


        conexion.query(
            sql,
            [id],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar barbero:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo eliminar el barbero. Puede tener reservas asociadas."

                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Barbero no encontrado"

                    });

                }


                res.json({

                    mensaje:
                        "Barbero eliminado correctamente"

                });

            }
        );

    }
);


module.exports = router;