const express = require("express");
const conexion = require("./database");

const router = express.Router();


// ========================================
// ESTADÍSTICAS DE INGRESOS
// ========================================

router.get("/ingresos", (req, res) => {

    const periodo =
        req.query.periodo || "mes";

    let filtroFecha = "";


    // ========================================
    // FILTRO HOY
    // ========================================

    if (periodo === "hoy") {

        filtroFecha = `
            AND r.fecha = CURDATE()
        `;

    }


    // ========================================
    // FILTRO SEMANA
    // ========================================

    else if (periodo === "semana") {

        filtroFecha = `
            AND YEARWEEK(r.fecha, 1)
                = YEARWEEK(CURDATE(), 1)
        `;

    }


    // ========================================
    // FILTRO MES
    // ========================================

    else if (periodo === "mes") {

        filtroFecha = `
            AND YEAR(r.fecha) =
                YEAR(CURDATE())

            AND MONTH(r.fecha) =
                MONTH(CURDATE())
        `;

    }


    // ========================================
    // TODO
    // ========================================

    else if (periodo === "todo") {

        filtroFecha = "";

    }


    // ========================================
    // PERIODO NO VÁLIDO
    // ========================================

    else {

        return res.status(400).json({

            error:
                "Periodo no válido. Usa hoy, semana, mes o todo."

        });

    }


    // ======================================================
    // CONSULTA
    // ======================================================
    //
    // IMPORTANTE:
    //
    // 1. Adelantos:
    //    Se cuentan cuando adelanto_pagado = 1.
    //
    // 2. Saldos:
    //    Se cuentan mientras la reserva NO esté cancelada.
    //
    // 3. Ingresos:
    //    Se cuentan solamente cuando la reserva
    //    está completada.
    //
    // 4. Reservas:
    //    Se cuentan todas las reservas NO canceladas.
    //
    // ======================================================

    const sql = `

        SELECT

            b.id_barbero,

            b.nombre,

            b.foto,


            /* ======================================
               RESERVAS
            ====================================== */

            COUNT(
                CASE

                    WHEN r.id_reserva IS NOT NULL
                    AND r.estado <> 'cancelada'

                    THEN r.id_reserva

                END
            ) AS total_reservas,


            /* ======================================
               SERVICIOS COMPLETADOS
            ====================================== */

            COUNT(
                CASE

                    WHEN r.estado = 'completada'

                    THEN r.id_reserva

                END
            ) AS reservas_completadas,


            /* ======================================
               INGRESOS DE SERVICIOS COMPLETADOS
            ====================================== */

            COALESCE(

                SUM(

                    CASE

                        WHEN r.estado = 'completada'

                        THEN COALESCE(
                            r.total_servicio,
                            s.precio,
                            0
                        )

                        ELSE 0

                    END

                ),

                0

            ) AS ingresos_completados,


            /* ======================================
               ADELANTOS RECIBIDOS
            ====================================== */

            COALESCE(

                SUM(

                    CASE

                        WHEN
                            r.estado <> 'cancelada'

                            AND r.adelanto_pagado = 1

                        THEN COALESCE(
                            r.adelanto,
                            0
                        )

                        ELSE 0

                    END

                ),

                0

            ) AS adelantos_recibidos,


            /* ======================================
               SALDOS PENDIENTES
            ====================================== */

            COALESCE(

                SUM(

                    CASE

                        WHEN
                            r.estado <> 'cancelada'

                        THEN COALESCE(
                            r.saldo,
                            0
                        )

                        ELSE 0

                    END

                ),

                0

            ) AS saldos_pendientes,


            /* ======================================
               TOTAL DE SERVICIOS RESERVADOS
            ====================================== */

            COALESCE(

                SUM(

                    CASE

                        WHEN
                            r.estado <> 'cancelada'

                        THEN COALESCE(
                            r.total_servicio,
                            s.precio,
                            0
                        )

                        ELSE 0

                    END

                ),

                0

            ) AS total_servicios


        FROM barberos b


        LEFT JOIN reservas r

            ON r.id_barbero =
               b.id_barbero

            ${filtroFecha}


        LEFT JOIN servicios s

            ON s.id_servicio =
               r.id_servicio


        WHERE

            b.estado = 1


        GROUP BY

            b.id_barbero,

            b.nombre,

            b.foto


        ORDER BY

            adelantos_recibidos DESC,

            ingresos_completados DESC

    `;


    // ======================================================
    // EJECUTAR CONSULTA
    // ======================================================

    conexion.query(

        sql,

        [],

        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener estadísticas:",
                    error
                );

                return res.status(500).json({

                    error:
                        "No se pudieron obtener las estadísticas."

                });

            }


            // ======================================================
            // TOTALES GENERALES
            // ======================================================

            let totalReservas = 0;

            let totalCompletadas = 0;

            let totalIngresos = 0;

            let totalAdelantos = 0;

            let totalSaldos = 0;

            let totalServicios = 0;


            // ======================================================
            // PROCESAR BARBEROS
            // ======================================================

            const barberos =

                resultados.map(barbero => {


                    const reservas =

                        Number(
                            barbero.total_reservas || 0
                        );


                    const completadas =

                        Number(
                            barbero.reservas_completadas || 0
                        );


                    const ingresos =

                        Number(
                            barbero.ingresos_completados || 0
                        );


                    const adelantos =

                        Number(
                            barbero.adelantos_recibidos || 0
                        );


                    const saldos =

                        Number(
                            barbero.saldos_pendientes || 0
                        );


                    const servicios =

                        Number(
                            barbero.total_servicios || 0
                        );


                    totalReservas +=
                        reservas;


                    totalCompletadas +=
                        completadas;


                    totalIngresos +=
                        ingresos;


                    totalAdelantos +=
                        adelantos;


                    totalSaldos +=
                        saldos;


                    totalServicios +=
                        servicios;


                    return {

                        id_barbero:
                            barbero.id_barbero,

                        nombre:
                            barbero.nombre,

                        foto:
                            barbero.foto,


                        reservas:
                            reservas,


                        reservasCompletadas:
                            completadas,


                        ingresos:
                            Number(
                                ingresos.toFixed(2)
                            ),


                        adelantos:
                            Number(
                                adelantos.toFixed(2)
                            ),


                        saldos:
                            Number(
                                saldos.toFixed(2)
                            ),


                        totalServicios:
                            Number(
                                servicios.toFixed(2)
                            )

                    };

                });


            // ======================================================
            // RESPUESTA FINAL
            // ======================================================

            res.json({

                periodo:
                    periodo,


                // ==========================================
                // RESERVAS
                // ==========================================

                totalReservas:
                    totalReservas,


                // ==========================================
                // RESERVAS COMPLETADAS
                // ==========================================

                totalCompletadas:
                    totalCompletadas,


                // ==========================================
                // INGRESOS DE SERVICIOS COMPLETADOS
                // ==========================================

                totalIngresos:
                    Number(
                        totalIngresos.toFixed(2)
                    ),


                // ==========================================
                // ADELANTOS RECIBIDOS
                // ==========================================

                totalAdelantos:
                    Number(
                        totalAdelantos.toFixed(2)
                    ),


                // ==========================================
                // SALDOS PENDIENTES
                // ==========================================

                totalSaldos:
                    Number(
                        totalSaldos.toFixed(2)
                    ),


                // ==========================================
                // TOTAL DE SERVICIOS RESERVADOS
                // ==========================================

                totalServicios:
                    Number(
                        totalServicios.toFixed(2)
                    ),


                // ==========================================
                // INFORMACIÓN POR BARBERO
                // ==========================================

                barberos:
                    barberos

            });

        }

    );

});


module.exports = router;