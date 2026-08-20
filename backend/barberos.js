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
                            "barberia/barberos",

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
// OBTENER TODOS LOS BARBEROS
// ========================================

router.get(
    "/",
    (req, res) => {

        const sql = `
            SELECT *
            FROM barberos
            ORDER BY id_barbero DESC
        `;

        conexion.query(
            sql,
            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener barberos:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener los barberos"

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
// OBTENER UN BARBERO
// ========================================

router.get(
    "/:id",
    (req, res) => {

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
            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener barbero:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener el barbero"

                        });

                }

                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Barbero no encontrado"

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
// AGREGAR BARBERO
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
                especialidad,
                telefono,
                instagram,
                tiktok,
                facebook,
                whatsapp
            } = req.body;

            // ========================================
            // VALIDAR NOMBRE
            // ========================================

            if (
                !nombre ||
                !nombre.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El nombre del barbero es obligatorio"

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

                    descripcion ||
                        null,

                    especialidad ||
                        null,

                    telefono ||
                        null,

                    instagram ||
                        null,

                    tiktok ||
                        null,

                    facebook ||
                        null,

                    whatsapp ||
                        null,

                    foto

                ],
                (
                    error,
                    resultado
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al agregar barbero:",
                            error
                        );

                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo agregar el barbero"

                            });

                    }

                    res
                        .status(201)
                        .json({

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

        catch (error) {

            console.error(
                "❌ Error al subir imagen del barbero:",
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
// EDITAR BARBERO
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
                especialidad,
                telefono,
                instagram,
                tiktok,
                facebook,
                whatsapp,
                estado
            } = req.body;

            // ========================================
            // VALIDAR NOMBRE
            // ========================================

            if (
                !nombre ||
                !nombre.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El nombre del barbero es obligatorio"

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

                const valores = [

                    nombre.trim(),

                    descripcion ||
                        null,

                    especialidad ||
                        null,

                    telefono ||
                        null,

                    instagram ||
                        null,

                    tiktok ||
                        null,

                    facebook ||
                        null,

                    whatsapp ||
                        null,

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
                                "❌ Error al editar barbero:",
                                error
                            );

                            return res
                                .status(500)
                                .json({

                                    error:
                                        "No se pudo editar el barbero"

                                });

                        }

                        if (
                            resultadoSQL.affectedRows === 0
                        ) {

                            return res
                                .status(404)
                                .json({

                                    error:
                                        "Barbero no encontrado"

                                });

                        }

                        res.json({

                            mensaje:
                                "Barbero actualizado correctamente",

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

            const valores = [

                nombre.trim(),

                descripcion ||
                    null,

                especialidad ||
                    null,

                telefono ||
                    null,

                instagram ||
                    null,

                tiktok ||
                    null,

                facebook ||
                    null,

                whatsapp ||
                    null,

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
                            "❌ Error al editar barbero:",
                            error
                        );

                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo editar el barbero"

                            });

                    }

                    if (
                        resultado.affectedRows === 0
                    ) {

                        return res
                            .status(404)
                            .json({

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

        catch (error) {

            console.error(
                "❌ Error al editar barbero:",
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


// ======================================================
// SERVICIOS Y PRECIOS PERSONALIZADOS DEL BARBERO
// ======================================================


// ========================================
// OBTENER SERVICIOS DE UN BARBERO
// ========================================

router.get(
    "/:id/servicios",
    (req, res) => {

        const id_barbero =
            req.params.id;

        const sql = `
            SELECT
                bs.id,
                bs.id_barbero,
                bs.id_servicio,
                bs.precio,
                bs.estado,
                s.nombre,
                s.descripcion,
                s.duracion,
                s.foto

            FROM barbero_servicio bs

            INNER JOIN servicios s
                ON bs.id_servicio = s.id_servicio

            WHERE
                bs.id_barbero = ?

            ORDER BY
                s.nombre ASC
        `;

        conexion.query(
            sql,
            [id_barbero],
            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener servicios del barbero:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "Error al obtener los servicios del barbero"

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
// ASIGNAR SERVICIO + PRECIO A BARBERO
// ========================================

router.post(
    "/:id/servicios",
    (req, res) => {

        const id_barbero =
            req.params.id;

        const {
            id_servicio,
            precio
        } = req.body;

        if (
            !id_servicio ||
            precio === undefined ||
            precio === null ||
            precio === ""
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "El servicio y el precio son obligatorios"

                });

        }

        const precioNumerico =
            Number(precio);

        if (
            isNaN(precioNumerico) ||
            precioNumerico < 0
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "El precio no es válido"

                });

        }

        const sql = `
            INSERT INTO barbero_servicio
            (
                id_barbero,
                id_servicio,
                precio,
                estado
            )

            VALUES (?, ?, ?, 1)

            ON DUPLICATE KEY UPDATE

                precio = VALUES(precio),
                estado = 1
        `;

        conexion.query(
            sql,
            [
                id_barbero,
                id_servicio,
                precioNumerico
            ],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al asignar servicio al barbero:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo asignar el servicio al barbero"

                        });

                }

                res
                    .status(201)
                    .json({

                        mensaje:
                            "Servicio y precio asignados correctamente",

                        id:
                            resultado.insertId,

                        id_barbero:
                            Number(id_barbero),

                        id_servicio:
                            Number(id_servicio),

                        precio:
                            precioNumerico,

                        estado:
                            1

                    });

            }
        );

    }
);


// ========================================
// ACTUALIZAR PRECIO
// ========================================

router.put(
    "/:id/servicios/:idServicio",
    (req, res) => {

        const id_barbero =
            req.params.id;

        const id_servicio =
            req.params.idServicio;

        const {
            precio,
            estado
        } = req.body;

        if (
            precio === undefined ||
            precio === null ||
            precio === ""
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "El precio es obligatorio"

                });

        }

        const precioNumerico =
            Number(precio);

        if (
            isNaN(precioNumerico) ||
            precioNumerico < 0
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "El precio no es válido"

                });

        }

        const sql = `
            UPDATE barbero_servicio

            SET
                precio = ?,
                estado = ?

            WHERE
                id_barbero = ?
                AND id_servicio = ?
        `;

        conexion.query(
            sql,
            [
                precioNumerico,

                estado === undefined
                    ? 1
                    : (estado ? 1 : 0),

                id_barbero,
                id_servicio
            ],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al actualizar precio:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo actualizar el precio"

                        });

                }

                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "El servicio no está asignado a este barbero"

                        });

                }

                res.json({

                    mensaje:
                        "Precio actualizado correctamente",

                    precio:
                        precioNumerico,

                    estado:
                        estado === undefined
                            ? 1
                            : (estado ? 1 : 0)

                });

            }
        );

    }
);


// ========================================
// ACTIVAR / DESACTIVAR SERVICIO DEL BARBERO
// ========================================

router.patch(
    "/:id/servicios/:idServicio/estado",
    (req, res) => {

        const id_barbero =
            req.params.id;

        const id_servicio =
            req.params.idServicio;

        const nuevoEstado =
            req.body.estado === true ||
            req.body.estado === 1
                ? 1
                : 0;

        const sql = `
            UPDATE barbero_servicio

            SET
                estado = ?

            WHERE
                id_barbero = ?
                AND id_servicio = ?
        `;

        conexion.query(
            sql,
            [
                nuevoEstado,
                id_barbero,
                id_servicio
            ],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al cambiar estado del servicio:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo cambiar el estado del servicio"

                        });

                }

                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Servicio no encontrado para este barbero"

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
// ELIMINAR SERVICIO DEL BARBERO
// ========================================

router.delete(
    "/:id/servicios/:idServicio",
    (req, res) => {

        const id_barbero =
            req.params.id;

        const id_servicio =
            req.params.idServicio;

        const sql = `
            DELETE FROM barbero_servicio

            WHERE
                id_barbero = ?
                AND id_servicio = ?
        `;

        conexion.query(
            sql,
            [
                id_barbero,
                id_servicio
            ],
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar servicio del barbero:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo eliminar el servicio del barbero"

                        });

                }

                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            error:
                                "Servicio no encontrado para este barbero"

                        });

                }

                res.json({

                    mensaje:
                        "Servicio eliminado del barbero correctamente"

                });

            }
        );

    }
);


// ========================================
// ACTIVAR / DESACTIVAR BARBERO
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
            (
                error,
                resultado
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar barbero:",
                        error
                    );

                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo eliminar el barbero. Puede tener reservas asociadas."

                        });

                }

                if (
                    resultado.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

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