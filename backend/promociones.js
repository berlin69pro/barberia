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
                            "barberia/promociones",

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
// LISTAR PROMOCIONES
// ========================================

router.get(
    "/",
    (req, res) => {

        const sql = `
            SELECT
                id_promocion,
                titulo,
                descripcion,
                precio_anterior,
                precio_promocion,
                fecha_inicio,
                fecha_fin,
                imagen,
                estado,
                fecha_creacion
            FROM promociones
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
                        "❌ Error al obtener promociones:",
                        error
                    );


                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener promociones"

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
// OBTENER UNA PROMOCIÓN
// ========================================

router.get(
    "/:id",
    (req, res) => {

        const sql = `
            SELECT
                id_promocion,
                titulo,
                descripcion,
                precio_anterior,
                precio_promocion,
                fecha_inicio,
                fecha_fin,
                imagen,
                estado,
                fecha_creacion
            FROM promociones
            WHERE id_promocion = ?
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
                                "Error al obtener la promoción"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Promoción no encontrada"

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
// CREAR PROMOCIÓN
// ========================================

router.post(
    "/upload",
    upload.single("imagen"),
    async (
        req,
        res
    ) => {

        let resultadoCloudinary = null;


        try {

            const titulo =
                req.body.titulo
                    ? req.body.titulo.trim()
                    : "";


            const descripcion =
                req.body.descripcion
                    ? req.body.descripcion.trim()
                    : null;


            const precioAnterior =
                req.body.precio_anterior
                    ? Number(
                        req.body.precio_anterior
                    )
                    : null;


            const precioPromocion =
                req.body.precio_promocion
                    ? Number(
                        req.body.precio_promocion
                    )
                    : NaN;


            const fechaInicio =
                req.body.fecha_inicio
                    ? req.body.fecha_inicio
                    : "";


            const fechaFin =
                req.body.fecha_fin
                    ? req.body.fecha_fin
                    : "";


            // ========================================
            // VALIDACIONES
            // ========================================

            if (!titulo) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El título es obligatorio"

                    });

            }


            if (
                Number.isNaN(
                    precioPromocion
                )
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El precio de promoción es obligatorio"

                    });

            }


            if (!fechaInicio) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La fecha de inicio es obligatoria"

                    });

            }


            if (!fechaFin) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La fecha de fin es obligatoria"

                    });

            }


            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Debes seleccionar una imagen"

                    });

            }


            // ========================================
            // VALIDAR FECHAS
            // ========================================

            if (
                fechaFin <
                fechaInicio
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La fecha final no puede ser anterior a la fecha inicial"

                    });

            }


            // ========================================
            // SUBIR A CLOUDINARY
            // ========================================

            resultadoCloudinary =
                await subirACloudinary(
                    req.file
                );


            const rutaImagen =
                resultadoCloudinary.secure_url;


            // ========================================
            // INSERTAR EN AIVEN
            // ========================================

            const sql = `
                INSERT INTO promociones
                (
                    titulo,
                    descripcion,
                    precio_anterior,
                    precio_promocion,
                    fecha_inicio,
                    fecha_fin,
                    imagen,
                    estado
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
            `;


            conexion.query(
                sql,
                [
                    titulo,
                    descripcion,
                    precioAnterior,
                    precioPromocion,
                    fechaInicio,
                    fechaFin,
                    rutaImagen
                ],
                (
                    error,
                    resultado
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al crear promoción:",
                            error
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo guardar la promoción"

                            });

                    }


                    res
                        .status(201)
                        .json({

                            mensaje:
                                "Promoción creada correctamente",

                            id_promocion:
                                resultado.insertId,

                            imagen:
                                rutaImagen

                        });

                }
            );

        }

        catch (error) {

            console.error(
                "❌ Error al crear promoción:",
                error
            );


            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Error al crear promoción"

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

        const estado =
            req.body.estado === true ||
            req.body.estado === 1 ||
            req.body.estado === "1"
                ? 1
                : 0;


        const sql = `
            UPDATE promociones
            SET estado = ?
            WHERE id_promocion = ?
        `;


        conexion.query(
            sql,
            [
                estado,
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
                                "Promoción no encontrada"

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
// ELIMINAR PROMOCIÓN
// ========================================

router.delete(
    "/:id",
    (req, res) => {

        const buscarSql = `
            SELECT imagen
            FROM promociones
            WHERE id_promocion = ?
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
                                "Error al buscar la promoción"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Promoción no encontrada"

                        });

                }


                const eliminarSql = `
                    DELETE FROM promociones
                    WHERE id_promocion = ?
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
                                        "No se pudo eliminar la promoción"

                                });

                        }


                        res.json({

                            mensaje:
                                "Promoción eliminada correctamente"

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