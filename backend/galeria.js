const express = require("express");
const conexion = require("./database");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const router = express.Router();


// ========================================
// CONFIGURACIÓN CLOUDINARY
// ========================================

cloudinary.config({

    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
        process.env.CLOUDINARY_API_KEY,

    api_secret:
        process.env.CLOUDINARY_API_SECRET

});


// ========================================
// MULTER - MEMORIA
// ========================================

const almacenamiento =
    multer.memoryStorage();


const filtroImagen = (
    req,
    file,
    cb
) => {

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

    } else {

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
// SUBIR IMAGEN A CLOUDINARY
// ========================================

function subirACloudinary(
    archivo
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const stream =
                cloudinary.uploader.upload_stream(

                    {
                        folder:
                            "barberia/galeria",

                        resource_type:
                            "image"

                    },

                    (
                        error,
                        resultado
                    ) => {

                        if (error) {

                            reject(
                                error
                            );

                        } else {

                            resolve(
                                resultado
                            );

                        }

                    }

                );


            stream.end(
                archivo.buffer
            );

        }
    );

}


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
            (
                error,
                resultados
            ) => {

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
            (
                error,
                resultados
            ) => {

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
    async (
        req,
        res
    ) => {

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


            // ========================================
            // VALIDAR TÍTULO
            // ========================================

            if (!titulo) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El título es obligatorio"

                    });

            }


            // ========================================
            // SUBIR A CLOUDINARY
            // ========================================

            const resultado =
                await subirACloudinary(
                    req.file
                );


            const rutaImagen =
                resultado.secure_url;


            // ========================================
            // GUARDAR EN AIVEN
            // ========================================

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
                (
                    error,
                    resultadoSQL
                ) => {

                    if (error) {

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
                                resultadoSQL.insertId,

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
            (
                error,
                resultado
            ) => {

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
            (
                error,
                resultados
            ) => {

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


// ========================================
// MANEJO DE ERRORES DE MULTER
// ========================================

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La imagen supera el tamaño máximo permitido de 5 MB."

                    });

            }


            return res
                .status(400)
                .json({

                    error:
                        error.message

                });

        }


        if (error) {

            return res
                .status(400)
                .json({

                    error:
                        error.message

                });

        }


        next();

    }
);


module.exports = router;