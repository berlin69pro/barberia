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
            ) AS total_completos

        FROM pagos

    `;


    const sqlPendientes = `

        SELECT

            COUNT(*) AS cantidad_pendientes,

            COALESCE(
                SUM(saldo),
                0
            ) AS saldo_pendiente

        FROM reservas

        WHERE
            saldo > 0

            AND estado <> 'cancelada'

    `;


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


            conexion.query(
                sqlPendientes,
                (error2, pendientes) => {

                    if (error2) {

                        console.error(
                            "❌ Error en pagos pendientes:",
                            error2
                        );

                        return res.status(500).json({
                            error:
                                "No se pudo obtener los pendientes"
                        });

                    }


                    const datosPagos =
                        pagos[0] || {};

                    const datosPendientes =
                        pendientes[0] || {};


                    res.json({

                        cantidad_pagos:
                            Number(
                                datosPagos.cantidad_pagos || 0
                            ),

                        total_pagado:
                            Number(
                                datosPagos.total_pagado || 0
                            ),

                        total_adelantos:
                            Number(
                                datosPagos.total_adelantos || 0
                            ),

                        total_saldos:
                            Number(
                                datosPagos.total_saldos || 0
                            ),

                        total_completos:
                            Number(
                                datosPagos.total_completos || 0
                            ),

                        cantidad_pendientes:
                            Number(
                                datosPendientes.cantidad_pendientes || 0
                            ),

                        saldo_pendiente:
                            Number(
                                datosPendientes.saldo_pendiente || 0
                            )

                    });

                }
            );

        }
    );

});


// ======================================================
// PAGOS PENDIENTES
// ======================================================

router.get("/pendientes", (req, res) => {

    const sql = `

        SELECT

            r.id_reserva,

            r.fecha,
            r.hora,

            r.total_servicio,
            r.adelanto,
            r.saldo,
            r.adelanto_pagado,
            r.estado,

            c.id_cliente,
            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono,

            b.id_barbero,
            b.nombre AS barbero_nombre,

            s.id_servicio,
            s.nombre AS servicio_nombre

        FROM reservas r

        LEFT JOIN clientes c
            ON r.id_cliente = c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero = b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio = s.id_servicio

        WHERE
            r.saldo > 0

            AND r.estado <> 'cancelada'

        ORDER BY
            r.fecha ASC,
            r.hora ASC

    `;


    conexion.query(
        sql,
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener pagos pendientes:",
                    error
                );

                return res.status(500).json({
                    error:
                        "No se pudieron obtener los pagos pendientes"
                });

            }


            res.json(resultados);

        }
    );

});


// ======================================================
// PAGOS DE UNA RESERVA
// ======================================================

router.get("/reserva/:id", (req, res) => {

    const idReserva =
        Number(req.params.id);


    if (
        !Number.isInteger(idReserva) ||
        idReserva <= 0
    ) {

        return res.status(400).json({
            error:
                "ID de reserva no válido"
        });

    }


    const sql = `

        SELECT

            id_pago,
            id_reserva,
            tipo_pago,
            monto,
            metodo_pago,
            referencia,
            observaciones,
            fecha_pago

        FROM pagos

        WHERE
            id_reserva = ?

        ORDER BY
            fecha_pago ASC,
            id_pago ASC

    `;


    conexion.query(
        sql,
        [idReserva],
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


            res.json(resultados);

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


    const montoPago =
        Number(monto);


    // ==================================================
    // VALIDAR RESERVA
    // ==================================================

    if (
        !Number.isInteger(reservaId) ||
        reservaId <= 0
    ) {

        return res.status(400).json({
            error:
                "Debes indicar una reserva válida"
        });

    }


    // ==================================================
    // VALIDAR TIPO DE PAGO
    // ==================================================

    if (
        ![
            "adelanto",
            "saldo",
            "completo"
        ].includes(tipo_pago)
    ) {

        return res.status(400).json({
            error:
                "Tipo de pago no válido"
        });

    }


    // ==================================================
    // VALIDAR MÉTODO
    // ==================================================

    if (
        ![
            "qr",
            "efectivo",
            "transferencia",
            "otro"
        ].includes(metodo_pago)
    ) {

        return res.status(400).json({
            error:
                "Método de pago no válido"
        });

    }


    // ==================================================
    // VALIDAR MONTO
    // ==================================================

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


            // ==================================================
            // RESERVA CANCELADA
            // ==================================================

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
            // CONSULTAR CONFIGURACIÓN
            // ==================================================

            const sqlConfiguracion = `

                SELECT

                    adelanto_obligatorio,
                    monto_adelanto

                FROM configuracion

                ORDER BY
                    id_configuracion ASC

                LIMIT 1

            `;


            conexion.query(
                sqlConfiguracion,
                (error, configuraciones) => {

                    if (error) {

                        console.error(
                            "❌ Error al consultar configuración:",
                            error
                        );

                        return res.status(500).json({
                            error:
                                "No se pudo verificar la configuración de pagos"
                        });

                    }


                    const configuracion =
                        configuraciones[0] || {};


                    const adelantoObligatorio =
                        Number(
                            configuracion.adelanto_obligatorio
                        ) === 1;


                    // ==================================================
                    // ADELANTO DESACTIVADO
                    // ==================================================

                    if (
                        tipo_pago === "adelanto" &&
                        !adelantoObligatorio
                    ) {

                        return res.status(400).json({

                            error:
                                "El adelanto está desactivado. Puedes cobrar directamente el saldo o el pago completo."

                        });

                    }


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
                                        WHEN tipo_pago = 'adelanto'
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
                            // YA ESTÁ PAGADO
                            // ==================================================

                            if (
                                pendiente <= 0
                            ) {

                                return res.status(400).json({

                                    error:
                                        "Esta reserva ya está completamente pagada."

                                });

                            }


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
                                            "Esta reserva ya tiene registrado un adelanto."

                                    });

                                }


                                if (
                                    montoPago >=
                                    totalServicio
                                ) {

                                    return res.status(400).json({

                                        error:
                                            "El adelanto debe ser menor al precio total. Para cobrar todo utiliza 'completo'."

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

                                // Si el adelanto está activado,
                                // primero debe existir un adelanto.

                                if (
                                    adelantoObligatorio &&
                                    totalAdelantos <= 0
                                ) {

                                    return res.status(400).json({

                                        error:
                                            "Primero debe existir un adelanto registrado."

                                    });

                                }

                            }


                            // ==================================================
                            // PAGO COMPLETO
                            // ==================================================

                            if (
                                tipo_pago ===
                                "completo"
                            ) {

                                // El pago completo debe cubrir
                                // todo lo que falta.

                                if (
                                    Math.abs(
                                        montoPago -
                                        pendiente
                                    ) > 0.01
                                ) {

                                    return res.status(400).json({

                                        error:
                                            `Para "pago completo" debes registrar exactamente Bs ${pendiente.toFixed(2)}.`

                                    });

                                }

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


                            // ==================================================
                            // REGISTRANDO ADELANTO
                            // ==================================================

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
                            // SI EL ADELANTO ESTÁ DESACTIVADO
                            // LA RESERVA DEBE QUEDAR CON ADELANTO 0
                            // ==================================================

                            if (
                                !adelantoObligatorio
                            ) {

                                nuevoAdelanto =
                                    0;

                                nuevoAdelantoPagado =
                                    0;

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

                                (

                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    ?

                                )

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

                                                adelanto:
                                                    nuevoAdelanto,

                                                saldo:
                                                    nuevoSaldo,

                                                adelanto_pagado:
                                                    nuevoAdelantoPagado

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


    // ==================================================
    // BUSCAR PAGO
    // ==================================================

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

                console.error(
                    "❌ Error al buscar pago:",
                    error
                );

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


            // ==================================================
            // ELIMINAR
            // ==================================================

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
                    // RECALCULAR
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
                                        WHEN p.tipo_pago = 'adelanto'
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

                                console.error(
                                    "❌ Error al recalcular:",
                                    error
                                );

                                return res.status(500).json({

                                    error:
                                        "Pago eliminado, pero no se pudo recalcular la reserva"

                                });

                            }


                            const datos =
                                resultados[0] || {};


                            const totalServicio =
                                Number(
                                    datos.total_servicio || 0
                                );


                            const totalPagado =
                                Number(
                                    datos.total_pagado || 0
                                );


                            const totalAdelantos =
                                Number(
                                    datos.total_adelantos || 0
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

                                    totalAdelantos,

                                    saldo,

                                    totalAdelantos > 0
                                        ? 1
                                        : 0,

                                    idReserva

                                ],
                                (error) => {

                                    if (error) {

                                        console.error(
                                            "❌ Error al actualizar reserva:",
                                            error
                                        );

                                        return res.status(500).json({

                                            error:
                                                "Pago eliminado, pero no se pudo actualizar la reserva"

                                        });

                                    }


                                    res.json({

                                        mensaje:
                                            "Pago eliminado correctamente",

                                        id_reserva:
                                            idReserva,

                                        total_pagado:
                                            totalPagado,

                                        adelanto:
                                            totalAdelantos,

                                        saldo:
                                            saldo

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
// EXPORTAR
// ======================================================

module.exports = router;