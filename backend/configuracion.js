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


const subirArchivos =
    multer({

        storage:
            almacenamiento,

        limits: {

            fileSize:
                10 * 1024 * 1024

        },

        fileFilter:
            (req, file, cb) => {

                const extensiones = [

                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp"

                ];


                const extension =
                    "." +
                    file.originalname
                        .split(".")
                        .pop()
                        .toLowerCase();


                if (
                    extensiones.includes(
                        extension
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
                            "Solo se permiten imágenes JPG, JPEG, PNG o WEBP"
                        )
                    );

                }

            }

    });


// ========================================
// SUBIR IMAGEN A CLOUDINARY
// ========================================

function subirACloudinary(
    archivo,
    carpeta
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
                            carpeta,

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

                        }
                        else {

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
// OBTENER CONFIGURACIÓN
// ========================================

router.get(
    "/",
    (req, res) => {

        const sql = `

            SELECT

                id_configuracion,

                nombre_barberia,

                descripcion,

                logo,

                telefono,

                whatsapp,

                direccion,

                google_maps,

                instagram,

                facebook,

                tiktok,

                horario_general,

                qr_pago,

                adelanto_obligatorio,

                monto_adelanto,

                fecha_actualizacion

            FROM configuracion

            ORDER BY
                id_configuracion ASC

            LIMIT 1

        `;


        conexion.query(

            sql,

            (
                error,
                resultados
            ) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener configuración:",
                        error
                    );


                    return res
                        .status(500)
                        .json({

                            error:
                                "No se pudo obtener la configuración"

                        });

                }


                if (
                    resultados.length === 0
                ) {

                    return res.json({

                        id_configuracion:
                            null,

                        nombre_barberia:
                            "CLUB PONTE PERRO",

                        descripcion:
                            "",

                        logo:
                            "",

                        telefono:
                            "",

                        whatsapp:
                            "",

                        direccion:
                            "",

                        google_maps:
                            "",

                        instagram:
                            "",

                        facebook:
                            "",

                        tiktok:
                            "",

                        horario_general:
                            "",

                        qr_pago:
                            "",

                        adelanto_obligatorio:
                            1,

                        monto_adelanto:
                            20.00

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
// GUARDAR CONFIGURACIÓN
// ========================================

router.put(

    "/",

    subirArchivos.fields([

        {
            name:
                "logo",

            maxCount:
                1
        },

        {
            name:
                "qr_pago",

            maxCount:
                1
        }

    ]),

    async (
        req,
        res
    ) => {

        try {

            const {

                nombre_barberia,

                descripcion,

                telefono,

                whatsapp,

                direccion,

                google_maps,

                instagram,

                facebook,

                tiktok,

                horario_general,

                monto_adelanto,

                eliminar_qr

            } = req.body;


            // ========================================
            // VALIDAR NOMBRE
            // ========================================

            if (

                !nombre_barberia ||

                !nombre_barberia.trim()

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El nombre de la barbería es obligatorio"

                    });

            }


            // ========================================
            // ADELANTO OBLIGATORIO
            // ========================================

            const adelanto =
                1;


            const monto =
                Number(
                    monto_adelanto
                );


            if (

                !Number.isFinite(
                    monto
                ) ||

                monto <= 0

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "El monto del adelanto debe ser mayor a Bs 0"

                    });

            }


            // ========================================
            // ARCHIVO LOGO
            // ========================================

            const archivoLogo =

                req.files &&

                req.files.logo &&

                req.files.logo[0]

                    ? req.files.logo[0]

                    : null;


            // ========================================
            // ARCHIVO QR
            // ========================================

            const archivoQR =

                req.files &&

                req.files.qr_pago &&

                req.files.qr_pago[0]

                    ? req.files.qr_pago[0]

                    : null;


            // ========================================
            // BUSCAR CONFIGURACIÓN EXISTENTE
            // ========================================

            const buscar = `

                SELECT

                    id_configuracion,

                    logo,

                    qr_pago

                FROM configuracion

                ORDER BY
                    id_configuracion ASC

                LIMIT 1

            `;


            conexion.query(

                buscar,

                async (
                    error,
                    resultados
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error al buscar configuración:",
                            error
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    "No se pudo verificar la configuración"

                            });

                    }


                    try {

                        let logo =

                            resultados.length > 0

                                ? resultados[0].logo

                                : null;


                        let qrPago =

                            resultados.length > 0

                                ? resultados[0].qr_pago

                                : null;


                        // ========================================
                        // SUBIR NUEVO LOGO
                        // ========================================

                        if (
                            archivoLogo
                        ) {

                            const resultadoLogo =
                                await subirACloudinary(
                                    archivoLogo,
                                    "barberia/configuracion/logo"
                                );


                            logo =
                                resultadoLogo.secure_url;

                        }


                        // ========================================
                        // SUBIR NUEVO QR
                        // ========================================

                        if (
                            archivoQR
                        ) {

                            const resultadoQR =
                                await subirACloudinary(
                                    archivoQR,
                                    "barberia/configuracion/qr"
                                );


                            qrPago =
                                resultadoQR.secure_url;

                        }


                        // ========================================
                        // ELIMINAR QR
                        // ========================================

                        if (

                            eliminar_qr === "1" &&

                            !archivoQR

                        ) {

                            qrPago =
                                null;

                        }


                        // ========================================
                        // ACTUALIZAR CONFIGURACIÓN EXISTENTE
                        // ========================================

                        if (

                            resultados.length > 0

                        ) {

                            const id =
                                resultados[0]
                                    .id_configuracion;


                            const actualizar = `

                                UPDATE configuracion

                                SET

                                    nombre_barberia = ?,

                                    descripcion = ?,

                                    logo = ?,

                                    telefono = ?,

                                    whatsapp = ?,

                                    direccion = ?,

                                    google_maps = ?,

                                    instagram = ?,

                                    facebook = ?,

                                    tiktok = ?,

                                    horario_general = ?,

                                    qr_pago = ?,

                                    adelanto_obligatorio = ?,

                                    monto_adelanto = ?,

                                    fecha_actualizacion =
                                        CURRENT_TIMESTAMP

                                WHERE

                                    id_configuracion = ?

                            `;


                            conexion.query(

                                actualizar,

                                [

                                    nombre_barberia.trim(),

                                    descripcion ||
                                        null,

                                    logo,

                                    telefono ||
                                        null,

                                    whatsapp ||
                                        null,

                                    direccion ||
                                        null,

                                    google_maps ||
                                        null,

                                    instagram ||
                                        null,

                                    facebook ||
                                        null,

                                    tiktok ||
                                        null,

                                    horario_general ||
                                        null,

                                    qrPago,

                                    adelanto,

                                    monto.toFixed(2),

                                    id

                                ],

                                (
                                    error
                                ) => {

                                    if (error) {

                                        console.error(
                                            "❌ Error al actualizar configuración:",
                                            error
                                        );


                                        return res
                                            .status(500)
                                            .json({

                                                error:
                                                    "No se pudo actualizar la configuración"

                                            });

                                    }


                                    return res.json({

                                        mensaje:
                                            "Configuración actualizada correctamente",

                                        id_configuracion:
                                            id,

                                        logo:
                                            logo,

                                        qr_pago:
                                            qrPago,

                                        adelanto_obligatorio:
                                            adelanto,

                                        monto_adelanto:
                                            Number(
                                                monto.toFixed(2)
                                            )

                                    });

                                }

                            );


                            return;

                        }


                        // ========================================
                        // CREAR CONFIGURACIÓN
                        // ========================================

                        const insertar = `

                            INSERT INTO configuracion

                            (

                                nombre_barberia,

                                descripcion,

                                logo,

                                telefono,

                                whatsapp,

                                direccion,

                                google_maps,

                                instagram,

                                facebook,

                                tiktok,

                                horario_general,

                                qr_pago,

                                adelanto_obligatorio,

                                monto_adelanto

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

                                ?,

                                ?,

                                ?,

                                ?,

                                ?,

                                ?

                            )

                        `;


                        conexion.query(

                            insertar,

                            [

                                nombre_barberia.trim(),

                                descripcion ||
                                    null,

                                logo,

                                telefono ||
                                    null,

                                whatsapp ||
                                    null,

                                direccion ||
                                    null,

                                google_maps ||
                                    null,

                                instagram ||
                                    null,

                                facebook ||
                                    null,

                                tiktok ||
                                    null,

                                horario_general ||
                                    null,

                                qrPago,

                                adelanto,

                                monto.toFixed(2)

                            ],

                            (
                                error,
                                resultado
                            ) => {

                                if (error) {

                                    console.error(
                                        "❌ Error al crear configuración:",
                                        error
                                    );


                                    return res
                                        .status(500)
                                        .json({

                                            error:
                                                "No se pudo crear la configuración"

                                        });

                                }


                                return res
                                    .status(201)
                                    .json({

                                        mensaje:
                                            "Configuración creada correctamente",

                                        id_configuracion:
                                            resultado.insertId,

                                        logo:
                                            logo,

                                        qr_pago:
                                            qrPago,

                                        adelanto_obligatorio:
                                            adelanto,

                                        monto_adelanto:
                                            Number(
                                                monto.toFixed(2)
                                            )

                                    });

                            }

                        );

                    }

                    catch (errorInterno) {

                        console.error(
                            "❌ Error procesando imágenes de configuración:",
                            errorInterno
                        );


                        return res
                            .status(500)
                            .json({

                                error:
                                    errorInterno.message ||
                                    "No se pudieron procesar las imágenes"

                            });

                    }

                }

            );

        }

        catch (error) {

            console.error(
                "❌ Error general en configuración:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Error al guardar configuración"

                });

        }

    }

);


// ========================================
// MANEJAR ERRORES DE MULTER
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
                            "La imagen supera el tamaño máximo permitido de 10 MB."

                    });

            }


            if (

                error.code ===
                "LIMIT_UNEXPECTED_FILE"

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Se recibió un archivo en un campo no permitido."

                    });

            }


            return res
                .status(400)
                .json({

                    error:
                        `Error al subir el archivo: ${error.message}`

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