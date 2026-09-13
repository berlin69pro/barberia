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

                p.id_promocion,
                p.id_servicio,

                p.titulo,
                p.descripcion,

                p.precio_anterior,
                p.precio_promocion,

                p.fecha_inicio,
                p.fecha_fin,

                p.imagen,
                p.estado,
                p.fecha_creacion,

                s.nombre AS servicio_nombre

            FROM promociones p

            LEFT JOIN servicios s
                ON p.id_servicio = s.id_servicio

            ORDER BY
                p.fecha_creacion DESC

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

                p.id_promocion,
                p.id_servicio,

                p.titulo,
                p.descripcion,

                p.precio_anterior,
                p.precio_promocion,

                p.fecha_inicio,
                p.fecha_fin,

                p.imagen,
                p.estado,
                p.fecha_creacion,

                s.nombre AS servicio_nombre

            FROM promociones p

            LEFT JOIN servicios s
                ON p.id_servicio = s.id_servicio

            WHERE
                p.id_promocion = ?

        `;


        conexion.query(
            sql,
            [req.params.id],
            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener promoción:",
                        error
                    );

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

        try {

            // ========================================
            // DATOS
            // ========================================

            const idServicio =
                req.body.id_servicio
                    ? Number(
                        req.body.id_servicio
                    )
                    : NaN;


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
            // VALIDAR SERVICIO
            // ========================================

            if (
                !Number.isInteger(
                    idServicio
                ) ||
                idServicio <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Debes seleccionar un servicio"

                    });

            }


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
            // VALIDAR PRECIO
            // ========================================

            if (

                !Number.isFinite(
                    precioPromocion
                ) ||

                precioPromocion <= 0

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El precio de promoción debe ser mayor a 0"

                    });

            }


            // ========================================
            // VALIDAR FECHAS
            // ========================================

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
            // VALIDAR IMAGEN
            // ========================================

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Debes seleccionar una imagen"

                    });

            }


            // ========================================
            // VERIFICAR SERVICIO
            // ========================================

            const verificarServicio = `

                SELECT

                    id_servicio,
                    nombre,
                    precio,
                    estado

                FROM servicios

                WHERE
                    id_servicio = ?

                LIMIT 1

            `;


            conexion.query(

                verificarServicio,

                [idServicio],

                async (
                    error,
                    servicios
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al verificar servicio:",
                            error
                        );

                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo verificar el servicio"

                            });

                    }


                    if (
                        servicios.length === 0
                    ) {

                        return res
                            .status(400)
                            .json({

                                error:
                                    "El servicio seleccionado no existe"

                            });

                    }


                    const servicio =
                        servicios[0];


                    if (
                        Number(
                            servicio.estado
                        ) !== 1
                    ) {

                        return res
                            .status(400)
                            .json({

                                error:
                                    "El servicio seleccionado está desactivado"

                            });

                    }


                    // ========================================
                    // EVITAR PROMOCIONES ACTIVAS DUPLICADAS
                    // ========================================

                    const verificarPromocion = `

                        SELECT

                            id_promocion

                        FROM promociones

                        WHERE

                            id_servicio = ?

                            AND estado = 1

                            AND fecha_inicio <= ?

                            AND fecha_fin >= ?

                        LIMIT 1

                    `;


                    conexion.query(

                        verificarPromocion,

                        [
                            idServicio,
                            fechaFin,
                            fechaInicio
                        ],

                        async (
                            error,
                            promocionesExistentes
                        ) => {

                            if (error) {

                                console.error(
                                    "❌ Error al verificar promociones:",
                                    error
                                );

                                return res
                                    .status(500)
                                    .json({

                                        error:
                                            "No se pudo verificar las promociones existentes"

                                    });

                            }


                            if (
                                promocionesExistentes.length > 0
                            ) {

                                return res
                                    .status(400)
                                    .json({

                                        error:
                                            "Ya existe una promoción activa para este servicio durante esas fechas"

                                    });

                            }


                            // ========================================
                            // SUBIR IMAGEN
                            // ========================================

                            let resultadoCloudinary;


                            try {

                                resultadoCloudinary =
                                    await subirACloudinary(
                                        req.file
                                    );

                            }
                            catch (error) {

                                console.error(
                                    "❌ Error al subir imagen:",
                                    error
                                );

                                return res
                                    .status(500)
                                    .json({

                                        error:
                                            "No se pudo subir la imagen"

                                    });

                            }


                            const rutaImagen =
                                resultadoCloudinary.secure_url;


                            // ========================================
                            // GUARDAR PROMOCIÓN
                            // ========================================

                            const sql = `

                                INSERT INTO promociones

                                (
                                    id_servicio,

                                    titulo,
                                    descripcion,

                                    precio_anterior,
                                    precio_promocion,

                                    fecha_inicio,
                                    fecha_fin,

                                    imagen,
                                    estado
                                )

                                VALUES

                                (
                                    ?,

                                    ?,
                                    ?,

                                    ?,
                                    ?,

                                    ?,
                                    ?,

                                    ?,
                                    TRUE
                                )

                            `;


                            conexion.query(

                                sql,

                                [

                                    idServicio,

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

                                            id_servicio:
                                                idServicio,

                                            servicio:
                                                servicio.nombre,

                                            precio_promocion:
                                                precioPromocion,

                                            imagen:
                                                rutaImagen

                                        });

                                }

                            );

                        }

                    );

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

            SET
                estado = ?

            WHERE
                id_promocion = ?

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

                    console.error(
                        "❌ Error al cambiar estado:",
                        error
                    );

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

            SELECT
                imagen

            FROM promociones

            WHERE
                id_promocion = ?

        `;


        conexion.query(

            buscarSql,

            [req.params.id],

            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al buscar promoción:",
                        error
                    );

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

                    WHERE
                        id_promocion = ?

                `;


                conexion.query(

                    eliminarSql,

                    [req.params.id],

                    (
                        error
                    ) => {

                        if (error) {

                            console.error(
                                "❌ Error al eliminar promoción:",
                                error
                            );

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