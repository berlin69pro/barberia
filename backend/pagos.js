const express = require("express");
const conexion = require("./database");

const router = express.Router();


// ======================================================
// LISTAR TODOS LOS PAGOS
// ======================================================

router.get("/", (req, res) => {

    const sql = `

        SELECT

            p.id_pago,
            p.id_reserva,
            p.tipo_pago,
            p.monto,
            p.metodo_pago,
            p.referencia,
            p.observaciones,
            p.fecha_pago,

            r.fecha AS fecha_reserva,
            r.hora AS hora_reserva,
            r.estado AS estado_reserva,
            r.total_servicio,
            r.adelanto,
            r.saldo,

            c.id_cliente,
            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono,

            b.id_barbero,
            b.nombre AS barbero_nombre,
            b.foto AS barbero_foto,

            s.id_servicio,
            s.nombre AS servicio_nombre,
            s.precio AS servicio_precio

        FROM pagos p

        INNER JOIN reservas r
            ON p.id_reserva = r.id_reserva

        LEFT JOIN clientes c
            ON r.id_cliente = c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero = b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio = s.id_servicio

        ORDER BY
            p.fecha_pago DESC,
            p.id_pago DESC

    `;


    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener pagos:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudieron obtener los pagos"
                });

            }

            res.json(resultados);

        }
    );

});


// ======================================================
// RESUMEN GENERAL
// ======================================================

router.get("/resumen", (req, res) => {

    // ==================================================
    // PAGOS REALMENTE REGISTRADOS
    // ==================================================

    const sqlPagos = `

        SELECT

            COUNT(*) AS cantidad_pagos,

            COALESCE(
                SUM(monto),
                0
            ) AS total_pagado,

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
            ) AS total_saldos

        FROM pagos

    `;


    // ==================================================
    // SERVICIOS COMPLETAMENTE PAGADOS
    //
    // IMPORTANTE:
    // Una reserva puede pagarse mediante:
    //
    // adelanto + saldo
    //
    // Por eso NO buscamos solamente
    // tipo_pago = 'completo'.
    // ==================================================

    const sqlCompletos = `

        SELECT

            COALESCE(
                SUM(
                    r.total_servicio
                ),
                0
            ) AS total_completos

        FROM reservas r

        WHERE

            r.estado <> 'cancelada'

            AND COALESCE(
                r.saldo,
                0
            ) <= 0

    `;


    // ==================================================
    // SALDOS PENDIENTES
    // ==================================================

    const sqlPendientes = `

        SELECT

            COALESCE(
                SUM(
                    CASE

                        WHEN
                            r.total_servicio -
                            COALESCE(
                                (
                                    SELECT
                                        SUM(p2.monto)

                                    FROM pagos p2

                                    WHERE
                                        p2.id_reserva =
                                        r.id_reserva

                                ),
                                0
                            ) > 0

                        THEN

                            r.total_servicio -
                            COALESCE(
                                (
                                    SELECT
                                        SUM(p3.monto)

                                    FROM pagos p3

                                    WHERE
                                        p3.id_reserva =
                                        r.id_reserva

                                ),
                                0
                            )

                        ELSE 0

                    END
                ),
                0
            ) AS saldo_pendiente

        FROM reservas r

        WHERE
            r.estado <> 'cancelada'

    `;


    // ==================================================
    // EJECUTAR PAGOS
    // ==================================================

    conexion.query(
        sqlPagos,
        (error, pagos) => {

            if (error) {

                console.error(
                    "❌ Error en resumen de pagos:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudo obtener el resumen"
                });

            }


            // ==================================================
            // EJECUTAR COMPLETOS
            // ==================================================

            conexion.query(
                sqlCompletos,
                (error, completos) => {

                    if (error) {

                        console.error(
                            "❌ Error en pagos completos:",
                            error
                        );

                        return res.status(500).json({
                            error:
                                "No se pudieron obtener los pagos completos"
                        });

                    }


                    // ==================================================
                    // EJECUTAR PENDIENTES
                    // ==================================================

                    conexion.query(
                        sqlPendientes,
                        (error, pendientes) => {

                            if (error) {

                                console.error(
                                    "❌ Error en saldos pendientes:",
                                    error
                                );

                                return res.status(500).json({
                                    error:
                                        "No se pudieron obtener los saldos pendientes"
                                });

                            }


                            const p =
                                pagos[0] || {};

                            const c =
                                completos[0] || {};

                            const s =
                                pendientes[0] || {};


                            res.json({

                                cantidadPagos:
                                    Number(
                                        p.cantidad_pagos || 0
                                    ),


                                totalPagado:
                                    Number(
                                        Number(
                                            p.total_pagado || 0
                                        ).toFixed(2)
                                    ),


                                totalAdelantos:
                                    Number(
                                        Number(
                                            p.total_adelantos || 0
                                        ).toFixed(2)
                                    ),


                                totalSaldos:
                                    Number(
                                        Number(
                                            p.total_saldos || 0
                                        ).toFixed(2)
                                    ),


                                totalCompletos:
                                    Number(
                                        Number(
                                            c.total_completos || 0
                                        ).toFixed(2)
                                    ),


                                saldoPendiente:
                                    Number(
                                        Number(
                                            s.saldo_pendiente || 0
                                        ).toFixed(2)
                                    )

                            });

                        }
                    );

                }
            );

        }
    );

});


// ======================================================
// SALDOS PENDIENTES
// ======================================================

router.get("/pendientes", (req, res) => {

    const sql = `

        SELECT

            r.id_reserva,

            r.fecha,
            r.hora,
            r.estado,

            r.total_servicio,
            r.adelanto,

            COALESCE(
                SUM(p.monto),
                0
            ) AS total_pagado,

            GREATEST(

                r.total_servicio -

                COALESCE(
                    SUM(p.monto),
                    0
                ),

                0

            ) AS saldo_pendiente,

            c.id_cliente,
            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono,

            b.id_barbero,
            b.nombre AS barbero_nombre,

            s.id_servicio,
            s.nombre AS servicio_nombre,
            s.precio AS servicio_precio

        FROM reservas r

        LEFT JOIN pagos p
            ON p.id_reserva =
               r.id_reserva

        LEFT JOIN clientes c
            ON c.id_cliente =
               r.id_cliente

        LEFT JOIN barberos b
            ON b.id_barbero =
               r.id_barbero

        LEFT JOIN servicios s
            ON s.id_servicio =
               r.id_servicio

        WHERE
            r.estado <> 'cancelada'

        GROUP BY

            r.id_reserva,
            r.fecha,
            r.hora,
            r.estado,
            r.total_servicio,
            r.adelanto,

            c.id_cliente,
            c.nombre,
            c.telefono,

            b.id_barbero,
            b.nombre,

            s.id_servicio,
            s.nombre,
            s.precio

        HAVING
            saldo_pendiente > 0

        ORDER BY
            r.fecha DESC,
            r.hora DESC,
            r.id_reserva DESC

    `;


    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener saldos pendientes:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudieron obtener los saldos pendientes"
                });

            }


            res.json(
                resultados
            );

        }
    );

});


// ======================================================
// PAGOS DE UNA RESERVA
// ======================================================

router.get("/reserva/:id", (req, res) => {

    const sql = `

        SELECT

            p.id_pago,
            p.id_reserva,
            p.tipo_pago,
            p.monto,
            p.metodo_pago,
            p.referencia,
            p.observaciones,
            p.fecha_pago,

            c.nombre AS cliente_nombre,

            b.nombre AS barbero_nombre,

            s.nombre AS servicio_nombre

        FROM pagos p

        INNER JOIN reservas r
            ON p.id_reserva =
               r.id_reserva

        LEFT JOIN clientes c
            ON r.id_cliente =
               c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero =
               b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio =
               s.id_servicio

        WHERE
            p.id_reserva = ?

        ORDER BY
            p.fecha_pago ASC,
            p.id_pago ASC

    `;


    conexion.query(
        sql,
        [req.params.id],
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener pagos de reserva:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudieron obtener los pagos"
                });

            }


            res.json(
                resultados
            );

        }
    );

});


// ======================================================
// REGISTRAR PAGO
// ======================================================

router.post("/", (req, res) => {

    const {
        id_reserva,
        tipo_pago,
        monto,
        metodo_pago,
        referencia,
        observaciones
    } = req.body;


    const reservaId =
        Number(id_reserva);


    if (
        !Number.isInteger(reservaId) ||
        reservaId <= 0
    ) {

        return res.status(400).json({
            error:
                "La reserva es obligatoria"
        });

    }


    const tiposPermitidos = [
        "adelanto",
        "saldo",
        "completo"
    ];


    if (
        !tiposPermitidos.includes(
            tipo_pago
        )
    ) {

        return res.status(400).json({
            error:
                "Tipo de pago no válido"
        });

    }


    const metodosPermitidos = [
        "qr",
        "efectivo",
        "transferencia",
        "otro"
    ];


    if (
        !metodosPermitidos.includes(
            metodo_pago
        )
    ) {

        return res.status(400).json({
            error:
                "Método de pago no válido"
        });

    }


    const montoPago =
        Number(monto);


    if (
        !Number.isFinite(montoPago) ||
        montoPago <= 0
    ) {

        return res.status(400).json({
            error:
                "El monto debe ser mayor a 0"
        });

    }


    // ==================================================
    // BUSCAR RESERVA
    // ==================================================

    const sqlReserva = `

        SELECT

            id_reserva,
            total_servicio,
            adelanto,
            saldo,
            adelanto_pagado,
            estado

        FROM reservas

        WHERE
            id_reserva = ?

        LIMIT 1

    `;


    conexion.query(
        sqlReserva,
        [reservaId],
        (error, reservas) => {

            if (error) {

                console.error(
                    "❌ Error al buscar reserva:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudo verificar la reserva"
                });

            }


            if (
                reservas.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "La reserva no existe"
                });

            }


            const reserva =
                reservas[0];


            if (
                reserva.estado ===
                "cancelada"
            ) {

                return res.status(400).json({
                    error:
                        "No se puede registrar un pago de una reserva cancelada"
                });

            }


            const totalServicio =
                Number(
                    reserva.total_servicio || 0
                );


            // ==================================================
            // PAGOS EXISTENTES
            // ==================================================

            const sqlPagado = `

                SELECT

                    COALESCE(
                        SUM(monto),
                        0
                    ) AS total_pagado,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN tipo_pago =
                                    'adelanto'
                                THEN monto
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_adelantos

                FROM pagos

                WHERE
                    id_reserva = ?

            `;


            conexion.query(
                sqlPagado,
                [reservaId],
                (error, resultados) => {

                    if (error) {

                        console.error(
                            "❌ Error al consultar pagos:",
                            error
                        );

                        return res.status(500).json({
                            error:
                                "No se pudieron verificar los pagos"
                        });

                    }


                    const totalPagado =
                        Number(
                            resultados[0]
                                ?.total_pagado || 0
                        );


                    const totalAdelantos =
                        Number(
                            resultados[0]
                                ?.total_adelantos || 0
                        );


                    const pendiente =
                        Number(
                            (
                                totalServicio -
                                totalPagado
                            ).toFixed(2)
                        );


                    // ==================================================
                    // NO SOBREPASAR EL TOTAL
                    // ==================================================

                    if (
                        montoPago >
                        pendiente + 0.001
                    ) {

                        return res.status(400).json({

                            error:
                                `El monto supera el saldo pendiente. Pendiente: Bs ${pendiente.toFixed(2)}`

                        });

                    }


                    // ==================================================
                    // ADELANTO
                    // ==================================================

                    if (
                        tipo_pago ===
                        "adelanto"
                    ) {

                        if (
                            totalAdelantos > 0
                        ) {

                            return res.status(409).json({

                                error:
                                    "Esta reserva ya tiene registrado un adelanto"

                            });

                        }


                        if (
                            montoPago >=
                            totalServicio
                        ) {

                            return res.status(400).json({

                                error:
                                    "Para un pago completo utiliza el tipo 'completo'."

                            });

                        }

                    }


                    // ==================================================
                    // SALDO
                    // ==================================================

                    if (
                        tipo_pago ===
                        "saldo"
                    ) {

                        if (
                            totalAdelantos <= 0
                        ) {

                            return res.status(400).json({

                                error:
                                    "Primero debe existir un adelanto registrado."

                            });

                        }

                    }


                    // ==================================================
                    // COMPLETO
                    // ==================================================

                    if (
                        tipo_pago ===
                        "completo"
                    ) {

                        if (
                            pendiente <= 0
                        ) {

                            return res.status(400).json({

                                error:
                                    "Esta reserva ya está completamente pagada."

                            });

                        }

                    }


                    // ==================================================
                    // INSERTAR PAGO
                    // ==================================================

                    const sqlInsertar = `

                        INSERT INTO pagos

                        (
                            id_reserva,
                            tipo_pago,
                            monto,
                            metodo_pago,
                            referencia,
                            observaciones
                        )

                        VALUES
                        (?, ?, ?, ?, ?, ?)

                    `;


                    conexion.query(
                        sqlInsertar,
                        [

                            reservaId,

                            tipo_pago,

                            montoPago,

                            metodo_pago,

                            referencia
                                ? String(
                                    referencia
                                ).trim()
                                : null,

                            observaciones
                                ? String(
                                    observaciones
                                ).trim()
                                : null

                        ],
                        (error, resultado) => {

                            if (error) {

                                console.error(
                                    "❌ Error al insertar pago:",
                                    error
                                );

                                return res.status(500).json({
                                    error:
                                        "No se pudo registrar el pago"
                                });

                            }


                            // ==================================================
                            // NUEVOS VALORES
                            // ==================================================

                            const nuevoTotalPagado =
                                Number(
                                    (
                                        totalPagado +
                                        montoPago
                                    ).toFixed(2)
                                );


                            const nuevoSaldo =
                                Math.max(

                                    0,

                                    Number(
                                        (
                                            totalServicio -
                                            nuevoTotalPagado
                                        ).toFixed(2)
                                    )

                                );


                            let nuevoAdelanto =
                                Number(
                                    reserva.adelanto || 0
                                );


                            let nuevoAdelantoPagado =
                                Number(
                                    reserva.adelanto_pagado || 0
                                );


                            if (
                                tipo_pago ===
                                "adelanto"
                            ) {

                                nuevoAdelanto =
                                    Number(
                                        (
                                            nuevoAdelanto +
                                            montoPago
                                        ).toFixed(2)
                                    );


                                nuevoAdelantoPagado =
                                    1;

                            }


                            // ==================================================
                            // ACTUALIZAR RESERVA
                            // ==================================================

                            const sqlActualizar = `

                                UPDATE reservas

                                SET

                                    adelanto = ?,

                                    saldo = ?,

                                    adelanto_pagado = ?

                                WHERE
                                    id_reserva = ?

                            `;


                            conexion.query(
                                sqlActualizar,
                                [

                                    nuevoAdelanto,

                                    nuevoSaldo,

                                    nuevoAdelantoPagado,

                                    reservaId

                                ],
                                (error) => {

                                    if (error) {

                                        console.error(
                                            "❌ Error actualizando reserva:",
                                            error
                                        );

                                        return res.status(500).json({

                                            error:
                                                "El pago se registró, pero no se pudo actualizar la reserva."

                                        });

                                    }


                                    res.status(201).json({

                                        mensaje:
                                            "Pago registrado correctamente",

                                        id_pago:
                                            resultado.insertId,

                                        id_reserva:
                                            reservaId,

                                        tipo_pago:
                                            tipo_pago,

                                        monto:
                                            montoPago,

                                        total_pagado:
                                            nuevoTotalPagado,

                                        saldo:
                                            nuevoSaldo

                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


// ======================================================
// ELIMINAR PAGO
// ======================================================

router.delete("/:id", (req, res) => {

    const pagoId =
        Number(req.params.id);


    if (
        !Number.isInteger(pagoId) ||
        pagoId <= 0
    ) {

        return res.status(400).json({
            error:
                "ID de pago no válido"
        });

    }


    const sqlBuscar = `

        SELECT

            id_pago,
            id_reserva

        FROM pagos

        WHERE
            id_pago = ?

        LIMIT 1

    `;


    conexion.query(
        sqlBuscar,
        [pagoId],
        (error, pagos) => {

            if (error) {

                return res.status(500).json({
                    error:
                        "No se pudo obtener el pago"
                });

            }


            if (
                pagos.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Pago no encontrado"
                });

            }


            const idReserva =
                pagos[0].id_reserva;


            const sqlEliminar = `

                DELETE FROM pagos

                WHERE
                    id_pago = ?

            `;


            conexion.query(
                sqlEliminar,
                [pagoId],
                (error) => {

                    if (error) {

                        console.error(
                            "❌ Error al eliminar pago:",
                            error
                        );

                        return res.status(500).json({
                            error:
                                "No se pudo eliminar el pago"
                        });

                    }


                    // ==================================================
                    // RECALCULAR RESERVA
                    // ==================================================

                    const sqlRecalcular = `

                        SELECT

                            r.total_servicio,

                            COALESCE(
                                SUM(p.monto),
                                0
                            ) AS total_pagado,

                            COALESCE(
                                SUM(
                                    CASE
                                        WHEN p.tipo_pago =
                                            'adelanto'
                                        THEN p.monto
                                        ELSE 0
                                    END
                                ),
                                0
                            ) AS total_adelantos

                        FROM reservas r

                        LEFT JOIN pagos p
                            ON p.id_reserva =
                               r.id_reserva

                        WHERE
                            r.id_reserva = ?

                        GROUP BY
                            r.id_reserva,
                            r.total_servicio

                    `;


                    conexion.query(
                        sqlRecalcular,
                        [idReserva],
                        (error, resultados) => {

                            if (error) {

                                return res.status(500).json({
                                    error:
                                        "Pago eliminado, pero no se pudo recalcular la reserva"
                                });

                            }


                            const datos =
                                resultados[0];


                            const totalServicio =
                                Number(
                                    datos?.total_servicio || 0
                                );


                            const totalPagado =
                                Number(
                                    datos?.total_pagado || 0
                                );


                            const totalAdelantos =
                                Number(
                                    datos?.total_adelantos || 0
                                );


                            const saldo =
                                Math.max(
                                    0,
                                    Number(
                                        (
                                            totalServicio -
                                            totalPagado
                                        ).toFixed(2)
                                    )
                                );


                            const adelantoPagado =
                                totalAdelantos > 0
                                    ? 1
                                    : 0;


                            const sqlActualizar = `

                                UPDATE reservas

                                SET

                                    adelanto = ?,

                                    saldo = ?,

                                    adelanto_pagado = ?

                                WHERE
                                    id_reserva = ?

                            `;


                            conexion.query(
                                sqlActualizar,
                                [

                                    totalAdelantos,

                                    saldo,

                                    adelantoPagado,

                                    idReserva

                                ],
                                (error) => {

                                    if (error) {

                                        return res.status(500).json({
                                            error:
                                                "Pago eliminado, pero no se pudo actualizar la reserva"
                                        });

                                    }


                                    res.json({

                                        mensaje:
                                            "Pago eliminado correctamente"

                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


module.exports = router;