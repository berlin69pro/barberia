const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const conexion = require("./database");

const router = express.Router();


// ========================================
// CARPETA DE SUBIDA
// ========================================

const carpetaUploads = path.join(
    __dirname,
    "../uploads"
);

if (!fs.existsSync(carpetaUploads)) {

    fs.mkdirSync(
        carpetaUploads,
        { recursive: true }
    );

}


// ========================================
// CONFIGURACIÓN DE MULTER
// ========================================

const almacenamiento = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            carpetaUploads
        );

    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(
                file.originalname
            ).toLowerCase();

        const prefijo =
            file.fieldname === "qr_pago"
                ? "qr"
                : "logo";

        const nombre =
            `${prefijo}-${Date.now()}${extension}`;

        cb(
            null,
            nombre
        );

    }

});


const subirArchivos = multer({

    storage:
        almacenamiento,

    limits: {

        // Permitimos imágenes de hasta 10 MB.
        fileSize:
            10 * 1024 * 1024

    },

    fileFilter:
        (req, file, cb) => {

            const extensiones =
                [
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp"
                ];

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

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

            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener configuración:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo obtener la configuración"

                    });

                }


                // ========================================
                // SI NO EXISTE CONFIGURACIÓN
                // ========================================

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

    (req, res) => {


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

            return res.status(400).json({

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

            return res.status(400).json({

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

            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al buscar configuración:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo verificar la configuración"

                    });

                }


                // ========================================
                // VALORES ACTUALES
                // ========================================

                let logo =

                    resultados.length > 0

                        ? resultados[0].logo

                        : null;


                let qrPago =

                    resultados.length > 0

                        ? resultados[0].qr_pago

                        : null;


                // ========================================
                // NUEVO LOGO
                // ========================================

                if (
                    archivoLogo
                ) {

                    logo =
                        `/uploads/${archivoLogo.filename}`;

                }


                // ========================================
                // NUEVO QR
                // ========================================

                if (
                    archivoQR
                ) {

                    qrPago =
                        `/uploads/${archivoQR.filename}`;

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
                // ACTUALIZAR CONFIGURACIÓN
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

                        (error) => {

                            if (error) {

                                console.error(
                                    "❌ Error al actualizar configuración:",
                                    error
                                );

                                return res.status(500).json({

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

                    (error, resultado) => {

                        if (error) {

                            console.error(
                                "❌ Error al crear configuración:",
                                error
                            );

                            return res.status(500).json({

                                error:
                                    "No se pudo crear la configuración"

                            });

                        }


                        return res.status(201).json({

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

        );

    }

);


// ========================================
// MANEJAR ERRORES DE MULTER
// ========================================

router.use(

    (error, req, res, next) => {


        if (

            error instanceof
            multer.MulterError

        ) {


            if (

                error.code ===
                "LIMIT_FILE_SIZE"

            ) {

                return res.status(400).json({

                    error:
                        "La imagen supera el tamaño máximo permitido de 10 MB."

                });

            }


            if (

                error.code ===
                "LIMIT_UNEXPECTED_FILE"

            ) {

                return res.status(400).json({

                    error:
                        "Se recibió un archivo en un campo no permitido."

                });

            }


            return res.status(400).json({

                error:
                    `Error al subir el archivo: ${error.message}`

            });

        }


        if (error) {

            return res.status(400).json({

                error:
                    error.message

            });

        }


        next();

    }

);


module.exports = router;