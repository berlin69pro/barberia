const express = require("express");
const conexion = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();


// ========================================
// DETECTAR ENTORNO
// ========================================

const esVercel = process.env.VERCEL === "1";


// ========================================
// CARPETA DE IMÁGENES
// ========================================

const carpetaUploads = path.join(
    __dirname,
    "../uploads/promociones"
);


// ========================================
// CREAR CARPETA SOLO EN LOCAL
// ========================================

if (!esVercel) {

    if (!fs.existsSync(carpetaUploads)) {

        fs.mkdirSync(
            carpetaUploads,
            {
                recursive: true
            }
        );

    }

}


// ========================================
// CONFIGURACIÓN MULTER
// ========================================

let almacenamiento;

if (esVercel) {

    // En Vercel no escribimos archivos en /uploads.
    almacenamiento = multer.memoryStorage();

} else {

    // En la computadora continúa funcionando
    // exactamente con la carpeta uploads.

    almacenamiento = multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                carpetaUploads
            );

        },

        filename: function (
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();


            const nombre =
                "promocion-" +
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

}


// ========================================
// FILTRO DE IMÁGENES
// ========================================

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
            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener promociones:",
                        error
                    );


                    return res.status(500).json({

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
            (error, resultados) => {

                if (error) {

                    return res.status(500).json({

                        error:
                            "Error al obtener la promoción"

                    });

                }


                if (
                    resultados.length === 0
                ) {

                    return res.status(404).json({

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
    (req, res) => {

        let archivoSubido = null;


        try {

            archivoSubido =
                req.file;


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

                if (
                    archivoSubido &&
                    archivoSubido.path
                ) {

                    try {

                        fs.unlinkSync(
                            archivoSubido.path
                        );

                    } catch (e) {}

                }


                return res.status(400).json({

                    error:
                        "El título es obligatorio"

                });

            }


            if (
                Number.isNaN(
                    precioPromocion
                )
            ) {

                if (
                    archivoSubido &&
                    archivoSubido.path
                ) {

                    try {

                        fs.unlinkSync(
                            archivoSubido.path
                        );

                    } catch (e) {}

                }


                return res.status(400).json({

                    error:
                        "El precio de promoción es obligatorio"

                });

            }


            if (!fechaInicio) {

                if (
                    archivoSubido &&
                    archivoSubido.path
                ) {

                    try {

                        fs.unlinkSync(
                            archivoSubido.path
                        );

                    } catch (e) {}

                }


                return res.status(400).json({

                    error:
                        "La fecha de inicio es obligatoria"

                });

            }


            if (!fechaFin) {

                if (
                    archivoSubido &&
                    archivoSubido.path
                ) {

                    try {

                        fs.unlinkSync(
                            archivoSubido.path
                        );

                    } catch (e) {}

                }


                return res.status(400).json({

                    error:
                        "La fecha de fin es obligatoria"

                });

            }


            if (!archivoSubido) {

                return res.status(400).json({

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

                if (
                    archivoSubido.path
                ) {

                    try {

                        fs.unlinkSync(
                            archivoSubido.path
                        );

                    } catch (e) {}

                }


                return res.status(400).json({

                    error:
                        "La fecha final no puede ser anterior a la fecha inicial"

                });

            }


            // ========================================
            // VERCEL
            // ========================================

            if (esVercel) {

                return res.status(503).json({

                    error:
                        "La carga de imágenes de promociones necesita almacenamiento externo en producción."

                });

            }


            // ========================================
            // RUTA IMAGEN
            // ========================================

            const rutaImagen =
                "/uploads/promociones/" +
                archivoSubido.filename;


            // ========================================
            // INSERTAR
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
                (error, resultado) => {

                    if (error) {

                        if (
                            archivoSubido.path
                        ) {

                            try {

                                fs.unlinkSync(
                                    archivoSubido.path
                                );

                            } catch (e) {}

                        }


                        console.error(
                            "❌ Error al crear promoción:",
                            error
                        );


                        return res.status(500).json({

                            error:
                                "No se pudo guardar la promoción"

                        });

                    }


                    res.status(201).json({

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

            if (
                archivoSubido &&
                archivoSubido.path
            ) {

                try {

                    fs.unlinkSync(
                        archivoSubido.path
                    );

                } catch (e) {}

            }


            console.error(
                "❌ Error al crear promoción:",
                error
            );


            res.status(500).json({

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
            (error, resultados) => {

                if (error) {

                    return res.status(500).json({

                        error:
                            "Error al buscar la promoción"

                    });

                }


                if (
                    resultados.length === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Promoción no encontrada"

                    });

                }


                const imagen =
                    resultados[0].imagen;


                const eliminarSql = `
                    DELETE FROM promociones
                    WHERE id_promocion = ?
                `;


                conexion.query(
                    eliminarSql,
                    [req.params.id],
                    (error) => {

                        if (error) {

                            return res.status(500).json({

                                error:
                                    "No se pudo eliminar la promoción"

                            });

                        }


                        // ========================================
                        // ELIMINAR ARCHIVO SOLO EN LOCAL
                        // ========================================

                        if (
                            !esVercel &&
                            imagen &&
                            imagen.startsWith(
                                "/uploads/"
                            )
                        ) {

                            const archivo =
                                path.join(
                                    __dirname,
                                    "..",
                                    imagen
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
                                        "No se pudo eliminar imagen:",
                                        e
                                    );

                                }

                            }

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


module.exports = router;