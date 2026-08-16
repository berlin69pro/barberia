const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const conexion = require("./database");

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

// La imagen se mantiene temporalmente en memoria
// y luego se envía a Cloudinary.

const almacenamiento =
    multer.memoryStorage();


const filtroImagen = (
    req,
    file,
    cb
) => {

    const permitidos = [

        "image/jpeg",
        "image/png",
        "image/webp"

    ];


    if (
        permitidos.includes(
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
                            "barberia/servicios",

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
// LISTAR SERVICIOS
// ========================================

router.get(
    "/",
    (req, res) => {

        const sql = `
            SELECT *
            FROM servicios
            ORDER BY id_servicio DESC
        `;


        conexion.query(
            sql,
            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener servicios:",
                        error
                    );


                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener los servicios"

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
// OBTENER UN SERVICIO
// ========================================

router.get(
    "/:id",
    (req, res) => {

        const id =
            req.params.id;


        const sql = `
            SELECT *
            FROM servicios
            WHERE id_servicio = ?
        `;


        conexion.query(
            sql,
            [id],
            (
                error,
                resultados
            ) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener el servicio"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Servicio no encontrado"

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
// CREAR SERVICIO
// ========================================

router.post(
    "/",
    subirImagen.single("foto"),
    async (
        req,
        res
    ) => {

        try {

            const {
                nombre,
                descripcion,
                precio,
                duracion
            } = req.body;


            // ========================================
            // VALIDACIONES
            // ========================================

            if (
                !nombre ||
                !nombre.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El nombre del servicio es obligatorio"

                    });

            }


            if (
                precio === undefined ||
                precio === "" ||
                Number(precio) < 0
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El precio no es válido"

                    });

            }


            if (
                duracion === undefined ||
                duracion === "" ||
                Number(duracion) <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La duración no es válida"

                    });

            }


            // ========================================
            // SUBIR FOTO
            // ========================================

            let foto = null;


            if (req.file) {

                const resultado =
                    await subirACloudinary(
                        req.file
                    );


                foto =
                    resultado.secure_url;

            }


            // ========================================
            // GUARDAR EN AIVEN
            // ========================================

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

                    descripcion ||
                        null,

                    Number(
                        precio
                    ),

                    Number(
                        duracion
                    ),

                    foto

                ],
                (
                    error,
                    resultado
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al crear servicio:",
                            error
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo crear el servicio"

                            });

                    }


                    res
                        .status(201)
                        .json({

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

        catch (error) {

            console.error(
                "❌ Error al subir imagen del servicio:",
                error
            );


            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "No se pudo procesar la imagen"

                });

        }

    }
);


// ========================================
// EDITAR SERVICIO
// ========================================

router.put(
    "/:id",
    subirImagen.single("foto"),
    async (
        req,
        res
    ) => {

        try {

            const id =
                req.params.id;


            const {
                nombre,
                descripcion,
                precio,
                duracion,
                estado
            } = req.body;


            // ========================================
            // VALIDACIONES
            // ========================================

            if (
                !nombre ||
                !nombre.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El nombre del servicio es obligatorio"

                    });

            }


            if (
                precio === undefined ||
                precio === "" ||
                Number(precio) < 0
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El precio no es válido"

                    });

            }


            if (
                duracion === undefined ||
                duracion === "" ||
                Number(duracion) <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "La duración no es válida"

                    });

            }


            // ========================================
            // SI HAY NUEVA FOTO
            // ========================================

            if (req.file) {

                const resultado =
                    await subirACloudinary(
                        req.file
                    );


                const foto =
                    resultado.secure_url;


                const sql = `
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


                const valores = [

                    nombre.trim(),

                    descripcion ||
                        null,

                    Number(
                        precio
                    ),

                    Number(
                        duracion
                    ),

                    foto,

                    estado ? 1 : 0,

                    id

                ];


                conexion.query(
                    sql,
                    valores,
                    (
                        error,
                        resultadoSQL
                    ) => {

                        if (error) {

                            console.error(
                                "❌ Error al editar servicio:",
                                error
                            );


                            return res
                                .status(500)
                                .json({

                                    error:
                                        "No se pudo editar el servicio"

                                });

                        }


                        if (
                            resultadoSQL.affectedRows === 0
                        ) {

                            return res
                                .status(404)
                                .json({

                                    error:
                                        "Servicio no encontrado"

                                });

                        }


                        res.json({

                            mensaje:
                                "Servicio actualizado correctamente",

                            foto:
                                foto

                        });

                    }
                );


                return;

            }


            // ========================================
            // EDITAR SIN CAMBIAR FOTO
            // ========================================

            const sql = `
                UPDATE servicios

                SET
                    nombre = ?,
                    descripcion = ?,
                    precio = ?,
                    duracion = ?,
                    estado = ?

                WHERE id_servicio = ?
            `;


            const valores = [

                nombre.trim(),

                descripcion ||
                    null,

                Number(
                    precio
                ),

                Number(
                    duracion
                ),

                estado ? 1 : 0,

                id

            ];


            conexion.query(
                sql,
                valores,
                (
                    error,
                    resultado
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al editar servicio:",
                            error
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo editar el servicio"

                            });

                    }


                    if (
                        resultado.affectedRows === 0
                    ) {

                        return res
                            .status(404)
                            .json({

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

        catch (error) {

            console.error(
                "❌ Error al editar servicio:",
                error
            );


            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "No se pudo procesar la imagen"

                });

        }

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

        const id =
            req.params.id;


        const sql = `
            DELETE FROM servicios
            WHERE id_servicio = ?
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
                        "❌ Error al eliminar servicio:",
                        error
                    );


                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo eliminar el servicio. Puede tener reservas asociadas."

                        });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

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