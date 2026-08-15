const express = require("express");
const conexion = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();


// ========================================
// CONFIGURACIÓN DE CARPETA
// ========================================

const carpetaUploads = path.join(
    __dirname,
    "../uploads"
);


if (!fs.existsSync(carpetaUploads)) {

    fs.mkdirSync(
        carpetaUploads,
        {
            recursive: true
        }
    );

}


// ========================================
// CONFIGURACIÓN MULTER
// ========================================

const almacenamiento =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    carpetaUploads
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                const nombre =
                    "foto-" +
                    Date.now() +
                    "-" +
                    Math.round(
                        Math.random() * 100000
                    ) +
                    extension;


                cb(
                    null,
                    nombre
                );

            }

    });


const filtroImagen =
    function (
        req,
        file,
        cb
    ) {

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg"
        ];


        if (
            tiposPermitidos.includes(
                file.mimetype
            )
        ) {

            cb(
                null,
                true
            );

        }

        else {

            cb(
                new Error(
                    "Solo se permiten imágenes JPG, PNG o WEBP"
                )
            );

        }

    };


const upload =
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
// LISTAR GALERÍA
// ========================================

router.get(
    "/",
    (req, res) => {

        const sql = `
            SELECT
                id_foto,
                titulo,
                descripcion,
                ruta_imagen,
                estado,
                fecha_creacion
            FROM galeria
            ORDER BY fecha_creacion DESC
        `;


        conexion.query(
            sql,
            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener galería:",
                        error
                    );


                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener la galería"

                        });

                }


                res.json(
                    resultados
                );

            }
        );

    }
);


// ========================================
// OBTENER FOTO
// ========================================

router.get(
    "/:id",
    (req, res) => {

        const sql = `
            SELECT
                id_foto,
                titulo,
                descripcion,
                ruta_imagen,
                estado,
                fecha_creacion
            FROM galeria
            WHERE id_foto = ?
        `;


        conexion.query(
            sql,
            [req.params.id],
            (error, resultados) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener la foto"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Foto no encontrada"

                        });

                }


                res.json(
                    resultados[0]
                );

            }
        );

    }
);


// ========================================
// SUBIR FOTOGRAFÍA
// ========================================

router.post(
    "/upload",
    upload.single("imagen"),
    (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Debes seleccionar una imagen"

                    });

            }


            const titulo =
                req.body.titulo
                    ? req.body.titulo.trim()
                    : "";


            const descripcion =
                req.body.descripcion
                    ? req.body.descripcion.trim()
                    : null;


            if (!titulo) {

                fs.unlinkSync(
                    req.file.path
                );


                return res
                    .status(400)
                    .json({

                        error:
                            "El título es obligatorio"

                    });

            }


            const rutaImagen =
                "/uploads/" +
                req.file.filename;


            const sql = `
                INSERT INTO galeria
                (
                    titulo,
                    descripcion,
                    ruta_imagen,
                    estado
                )
                VALUES (?, ?, ?, TRUE)
            `;


            conexion.query(
                sql,
                [
                    titulo,
                    descripcion,
                    rutaImagen
                ],
                (error, resultado) => {

                    if (error) {

                        try {

                            fs.unlinkSync(
                                req.file.path
                            );

                        }
                        catch (e) {}


                        console.error(
                            "❌ Error al guardar fotografía:",
                            error
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo guardar la fotografía"

                            });

                    }


                    res
                        .status(201)
                        .json({

                            mensaje:
                                "Fotografía subida correctamente",

                            id_foto:
                                resultado.insertId,

                            ruta_imagen:
                                rutaImagen

                        });

                }
            );

        }

        catch (error) {

            console.error(
                "❌ Error al subir imagen:",
                error
            );


            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Error al subir la imagen"

                });

        }

    }
);


// ========================================
// CAMBIAR ESTADO
// ========================================

router.patch(
    "/:id/estado",
    (req, res) => {

        const {
            estado
        } = req.body;


        const valor =
            estado === true ||
            estado === 1 ||
            estado === "1"
                ? 1
                : 0;


        const sql = `
            UPDATE galeria
            SET estado = ?
            WHERE id_foto = ?
        `;


        conexion.query(
            sql,
            [
                valor,
                req.params.id
            ],
            (error, resultado) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo cambiar el estado"

                        });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Foto no encontrada"

                        });

                }


                res.json({

                    mensaje:
                        "Estado actualizado correctamente"

                });

            }
        );

    }
);


// ========================================
// ELIMINAR FOTO
// ========================================

router.delete(
    "/:id",
    (req, res) => {

        const buscarSql = `
            SELECT ruta_imagen
            FROM galeria
            WHERE id_foto = ?
        `;


        conexion.query(
            buscarSql,
            [req.params.id],
            (error, resultados) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al buscar la fotografía"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Foto no encontrada"

                        });

                }


                const ruta =
                    resultados[0]
                        .ruta_imagen;


                const eliminarSql = `
                    DELETE FROM galeria
                    WHERE id_foto = ?
                `;


                conexion.query(
                    eliminarSql,
                    [req.params.id],
                    (error) => {

                        if (error) {

                            return res
                                .status(500)
                                .json({

                                    error:
                                        "No se pudo eliminar la fotografía"

                                });

                        }


                        // Intentar eliminar archivo físico

                        if (
                            ruta &&
                            ruta.startsWith(
                                "/uploads/"
                            )
                        ) {

                            const archivo =
                                path.join(
                                    __dirname,
                                    "..",
                                    ruta
                                );


                            if (
                                fs.existsSync(
                                    archivo
                                )
                            ) {

                                try {

                                    fs.unlinkSync(
                                        archivo
                                    );

                                }
                                catch (e) {

                                    console.error(
                                        "No se pudo eliminar archivo:",
                                        e
                                    );

                                }

                            }

                        }


                        res.json({

                            mensaje:
                                "Fotografía eliminada correctamente"

                        });

                    }
                );

            }
        );

    }
);


module.exports = router;