const express = require("express");
const conexion = require("./database");

const router = express.Router();


// =====================================================
// CREAR TABLA CAJA SI NO EXISTE
// =====================================================

const sqlCrearTabla = `

    CREATE TABLE IF NOT EXISTS caja (

        id_caja INT NOT NULL AUTO_INCREMENT,

        fecha DATE NOT NULL,

        total_adelantos DECIMAL(10,2) NOT NULL DEFAULT 0,

        total_saldos DECIMAL(10,2) NOT NULL DEFAULT 0,

        total_completos DECIMAL(10,2) NOT NULL DEFAULT 0,

        total_recibido DECIMAL(10,2) NOT NULL DEFAULT 0,

        estado ENUM(
            'abierta',
            'cerrada'
        ) NOT NULL DEFAULT 'abierta',

        fecha_cierre DATETIME NULL,

        PRIMARY KEY (
            id_caja
        ),

        UNIQUE KEY unica_fecha (
            fecha
        )

    )

`;


// =====================================================
// CREAR TABLA AL CARGAR EL MÓDULO
// =====================================================

conexion.query(
    sqlCrearTabla,
    (error) => {

        if (error) {

            console.error(
                "❌ Error al crear tabla caja:",
                error
            );

            return;

        }


        console.log(
            "✅ Tabla caja lista"
        );

    }
);


// =====================================================
// CREAR CAJA DEL DÍA SI NO EXISTE
// =====================================================

function crearCajaDelDia(callback) {

    const sql = `

        INSERT INTO caja (

            fecha,
            total_adelantos,
            total_saldos,
            total_completos,
            total_recibido,
            estado

        )

        VALUES (

            CURDATE(),
            0,
            0,
            0,
            0,
            'abierta'

        )

        ON DUPLICATE KEY UPDATE
            id_caja = id_caja

    `;


    conexion.query(
        sql,
        (error) => {

            if (error) {

                console.error(
                    "❌ Error al crear caja del día:",
                    error
                );

                return callback(error);

            }


            callback(null);

        }
    );

}


// =====================================================
// CALCULAR PAGOS DEL DÍA
// =====================================================

function obtenerTotalesDelDia(callback) {

    const sql = `

        SELECT

            COALESCE(
                SUM(
                    CASE
                        WHEN tipo_pago = 'adelanto'
                        THEN monto
                        ELSE 0
                    END
                ),
                0
            ) AS total_adelantos,


            COALESCE(
                SUM(
                    CASE
                        WHEN tipo_pago = 'saldo'
                        THEN monto
                        ELSE 0
                    END
                ),
                0
            ) AS total_saldos,


            COALESCE(
                SUM(
                    CASE
                        WHEN tipo_pago = 'completo'
                        THEN monto
                        ELSE 0
                    END
                ),
                0
            ) AS total_completos,


            COALESCE(
                SUM(monto),
                0
            ) AS total_recibido


        FROM pagos


        WHERE
            DATE(fecha_pago) = CURDATE()

    `;


    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al calcular caja:",
                    error
                );

                return callback(
                    error
                );

            }


            const datos =
                resultados[0] || {};


            callback(
                null,
                {

                    total_adelantos:
                        Number(
                            datos.total_adelantos || 0
                        ),

                    total_saldos:
                        Number(
                            datos.total_saldos || 0
                        ),

                    total_completos:
                        Number(
                            datos.total_completos || 0
                        ),

                    total_recibido:
                        Number(
                            datos.total_recibido || 0
                        )

                }
            );

        }
    );

}


// =====================================================
// ACTUALIZAR CAJA ABIERTA CON LOS PAGOS DEL DÍA
// =====================================================

function actualizarCajaDelDia(
    totales,
    callback
) {

    const sql = `

        UPDATE caja

        SET

            total_adelantos = ?,

            total_saldos = ?,

            total_completos = ?,

            total_recibido = ?

        WHERE

            fecha = CURDATE()

            AND estado = 'abierta'

    `;


    conexion.query(
        sql,
        [

            totales.total_adelantos,

            totales.total_saldos,

            totales.total_completos,

            totales.total_recibido

        ],
        (error) => {

            if (error) {

                console.error(
                    "❌ Error al actualizar caja:",
                    error
                );

                return callback(
                    error
                );

            }


            callback(null);

        }
    );

}


// =====================================================
// VER CAJA DE HOY
// =====================================================

router.get(
    "/",
    (req, res) => {

        crearCajaDelDia(
            (error) => {

                if (error) {

                    return res.status(500).json({

                        error:
                            "No se pudo preparar la caja del día"

                    });

                }


                obtenerTotalesDelDia(
                    (error, totales) => {

                        if (error) {

                            return res.status(500).json({

                                error:
                                    "No se pudieron calcular los pagos del día"

                            });

                        }


                        // ------------------------------------------
                        // ACTUALIZAR SOLO SI LA CAJA SIGUE ABIERTA
                        // ------------------------------------------

                        actualizarCajaDelDia(
                            totales,
                            (error) => {

                                if (error) {

                                    return res.status(500).json({

                                        error:
                                            "No se pudo actualizar la caja"

                                    });

                                }


                                const sql = `

                                    SELECT

                                        id_caja,
                                        fecha,

                                        total_adelantos,

                                        total_saldos,

                                        total_completos,

                                        total_recibido,

                                        estado,

                                        fecha_cierre

                                    FROM caja

                                    WHERE
                                        fecha = CURDATE()

                                    LIMIT 1

                                `;


                                conexion.query(
                                    sql,
                                    (error, resultados) => {

                                        if (error) {

                                            console.error(
                                                "❌ Error al obtener caja:",
                                                error
                                            );

                                            return res.status(500).json({

                                                error:
                                                    "No se pudo obtener la caja"

                                            });

                                        }


                                        if (
                                            resultados.length === 0
                                        ) {

                                            return res.status(404).json({

                                                error:
                                                    "No existe la caja de hoy"

                                            });

                                        }


                                        const caja =
                                            resultados[0];


                                        res.json({

                                            id_caja:
                                                caja.id_caja,

                                            fecha:
                                                caja.fecha,

                                            total_adelantos:
                                                Number(
                                                    caja.total_adelantos
                                                ),

                                            total_saldos:
                                                Number(
                                                    caja.total_saldos
                                                ),

                                            total_completos:
                                                Number(
                                                    caja.total_completos
                                                ),

                                            total_recibido:
                                                Number(
                                                    caja.total_recibido
                                                ),

                                            estado:
                                                caja.estado,

                                            fecha_cierre:
                                                caja.fecha_cierre

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// =====================================================
// CERRAR CAJA DEL DÍA
// =====================================================

router.post(
    "/cerrar",
    (req, res) => {

        crearCajaDelDia(
            (error) => {

                if (error) {

                    return res.status(500).json({

                        error:
                            "No se pudo preparar la caja"

                    });

                }


                // ------------------------------------------
                // VERIFICAR SI YA ESTÁ CERRADA
                // ------------------------------------------

                const sqlVerificar = `

                    SELECT

                        id_caja,
                        fecha,
                        estado,
                        total_recibido,
                        fecha_cierre

                    FROM caja

                    WHERE
                        fecha = CURDATE()

                    LIMIT 1

                `;


                conexion.query(
                    sqlVerificar,
                    (error, resultados) => {

                        if (error) {

                            console.error(
                                "❌ Error al verificar caja:",
                                error
                            );

                            return res.status(500).json({

                                error:
                                    "No se pudo verificar la caja"

                            });

                        }


                        const caja =
                            resultados[0];


                        if (
                            caja &&
                            caja.estado ===
                            "cerrada"
                        ) {

                            return res.status(409).json({

                                error:
                                    "La caja de hoy ya está cerrada."

                            });

                        }


                        // ------------------------------------------
                        // CALCULAR TOTAL FINAL
                        // ------------------------------------------

                        obtenerTotalesDelDia(
                            (error, totales) => {

                                if (error) {

                                    return res.status(500).json({

                                        error:
                                            "No se pudieron calcular los totales finales"

                                    });

                                }


                                // ------------------------------------------
                                // CERRAR
                                // ------------------------------------------

                                const sqlCerrar = `

                                    UPDATE caja

                                    SET

                                        total_adelantos = ?,

                                        total_saldos = ?,

                                        total_completos = ?,

                                        total_recibido = ?,

                                        estado = 'cerrada',

                                        fecha_cierre = NOW()

                                    WHERE

                                        fecha = CURDATE()

                                        AND estado = 'abierta'

                                `;


                                conexion.query(
                                    sqlCerrar,
                                    [

                                        totales.total_adelantos,

                                        totales.total_saldos,

                                        totales.total_completos,

                                        totales.total_recibido

                                    ],
                                    (error, resultado) => {

                                        if (error) {

                                            console.error(
                                                "❌ Error al cerrar caja:",
                                                error
                                            );

                                            return res.status(500).json({

                                                error:
                                                    "No se pudo cerrar la caja"

                                            });

                                        }


                                        if (
                                            resultado.affectedRows ===
                                            0
                                        ) {

                                            return res.status(409).json({

                                                error:
                                                    "La caja ya fue cerrada o no está disponible."

                                            });

                                        }


                                        res.json({

                                            mensaje:
                                                "Caja cerrada correctamente",

                                            fecha:
                                                new Date()
                                                    .toISOString()
                                                    .slice(
                                                        0,
                                                        10
                                                    ),

                                            total_adelantos:
                                                totales.total_adelantos,

                                            total_saldos:
                                                totales.total_saldos,

                                            total_completos:
                                                totales.total_completos,

                                            total_recibido:
                                                totales.total_recibido,

                                            estado:
                                                "cerrada"

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// =====================================================
// HISTORIAL DE CAJAS
// =====================================================

router.get(
    "/historial",
    (req, res) => {

        const sql = `

            SELECT

                id_caja,
                fecha,

                total_adelantos,

                total_saldos,

                total_completos,

                total_recibido,

                estado,

                fecha_cierre

            FROM caja

            ORDER BY
                fecha DESC

        `;


        conexion.query(
            sql,
            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener historial de caja:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo obtener el historial"

                    });

                }


                res.json(

                    resultados.map(
                        caja => ({

                            id_caja:
                                caja.id_caja,

                            fecha:
                                caja.fecha,

                            total_adelantos:
                                Number(
                                    caja.total_adelantos
                                ),

                            total_saldos:
                                Number(
                                    caja.total_saldos
                                ),

                            total_completos:
                                Number(
                                    caja.total_completos
                                ),

                            total_recibido:
                                Number(
                                    caja.total_recibido
                                ),

                            estado:
                                caja.estado,

                            fecha_cierre:
                                caja.fecha_cierre

                        })
                    )

                );

            }
        );

    }
);


// =====================================================
// VER UNA CAJA ESPECÍFICA
// =====================================================

router.get(
    "/:id",
    (req, res) => {

        const idCaja =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(idCaja) ||
            idCaja <= 0
        ) {

            return res.status(400).json({

                error:
                    "ID de caja no válido"

            });

        }


        const sql = `

            SELECT

                id_caja,
                fecha,

                total_adelantos,

                total_saldos,

                total_completos,

                total_recibido,

                estado,

                fecha_cierre

            FROM caja

            WHERE
                id_caja = ?

            LIMIT 1

        `;


        conexion.query(
            sql,
            [idCaja],
            (error, resultados) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener caja:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo obtener la caja"

                    });

                }


                if (
                    resultados.length === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Caja no encontrada"

                    });

                }


                const caja =
                    resultados[0];


                res.json({

                    id_caja:
                        caja.id_caja,

                    fecha:
                        caja.fecha,

                    total_adelantos:
                        Number(
                            caja.total_adelantos
                        ),

                    total_saldos:
                        Number(
                            caja.total_saldos
                        ),

                    total_completos:
                        Number(
                            caja.total_completos
                        ),

                    total_recibido:
                        Number(
                            caja.total_recibido
                        ),

                    estado:
                        caja.estado,

                    fecha_cierre:
                        caja.fecha_cierre

                });

            }
        );

    }
);


// =====================================================
// EXPORTAR
// =====================================================

module.exports = router;