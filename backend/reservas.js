const express = require("express");
const conexion = require("./database");

const router = express.Router();


// ======================================================
// LISTAR RESERVAS
// ======================================================

router.get("/", (req, res) => {

    const sql = `
        SELECT
            r.id_reserva,
            r.id_cliente,
            r.id_barbero,
            r.id_servicio,

            r.fecha,
            r.hora,

            r.estado,
            r.observaciones,

            r.total_servicio,
            r.adelanto,
            r.saldo,
            r.adelanto_pagado,

            r.fecha_creacion,

            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono,

            b.nombre AS barbero_nombre,

            s.nombre AS servicio_nombre,

            r.total_servicio AS servicio_precio,

            s.duracion AS servicio_duracion

        FROM reservas r

        LEFT JOIN clientes c
            ON r.id_cliente = c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero = b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio = s.id_servicio

        ORDER BY
            r.fecha DESC,
            r.hora DESC
    `;

    conexion.query(sql, (error, resultados) => {

        if (error) {

            console.error(
                "❌ Error al obtener reservas:",
                error
            );

            return res.status(500).json({
                error: "Error al obtener las reservas"
            });
        }

        res.json(resultados);
    });
});


// ======================================================
// OBTENER RESERVA POR ID
// ======================================================

router.get("/:id", (req, res) => {

    const sql = `
        SELECT
            r.*,

            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono,
            c.correo AS cliente_correo,

            b.nombre AS barbero_nombre,

            s.nombre AS servicio_nombre,

            r.total_servicio AS servicio_precio,

            s.duracion AS servicio_duracion

        FROM reservas r

        LEFT JOIN clientes c
            ON r.id_cliente = c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero = b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio = s.id_servicio

        WHERE r.id_reserva = ?
    `;

    conexion.query(
        sql,
        [req.params.id],
        (error, resultados) => {

            if (error) {

                console.error(
                    "❌ Error al obtener reserva:",
                    error
                );

                return res.status(500).json({
                    error: "Error al obtener la reserva"
                });
            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    error: "Reserva no encontrada"
                });
            }

            res.json(resultados[0]);
        }
    );
});


// ======================================================
// CREAR RESERVA
// ======================================================

router.post("/", (req, res) => {

    const {
        nombre_cliente,
        telefono,

        id_cliente,

        id_barbero,
        id_servicio,

        fecha,

        id_horario,
        hora,

        observaciones,

        adelanto_pagado
    } = req.body;


    // ==================================================
    // VALIDAR DATOS
    // ==================================================

    if (
        !id_barbero ||
        !id_servicio ||
        !fecha
    ) {

        return res.status(400).json({
            error: "Barbero, servicio y fecha son obligatorios"
        });
    }


    // ==================================================
    // VALIDAR CLIENTE
    // ==================================================

    if (
        !id_cliente &&
        (
            !nombre_cliente ||
            !telefono
        )
    ) {

        return res.status(400).json({
            error: "El nombre y teléfono del cliente son obligatorios"
        });
    }


    // ==================================================
    // CONVERTIR PAGO
    // ==================================================

    const pagoConfirmado =
        adelanto_pagado === true ||
        adelanto_pagado === 1 ||
        adelanto_pagado === "1" ||
        adelanto_pagado === "true";


    // ==================================================
    // CONTINUAR CON HORA
    // ==================================================

    function continuarConHora(horaReserva) {

        if (!horaReserva) {

            return res.status(400).json({
                error: "Debe seleccionar un horario"
            });
        }


        // ==================================================
        // VERIFICAR BARBERO
        // ==================================================

        const verificarBarbero = `
            SELECT id_barbero
            FROM barberos
            WHERE
                id_barbero = ?
                AND estado = 1
            LIMIT 1
        `;

        conexion.query(
            verificarBarbero,
            [id_barbero],
            (error, barberos) => {

                if (error) {

                    console.error(
                        "❌ Error al verificar barbero:",
                        error
                    );

                    return res.status(500).json({
                        error: "No se pudo verificar el barbero"
                    });
                }

                if (barberos.length === 0) {

                    return res.status(400).json({
                        error:
                            "El barbero seleccionado no está disponible"
                    });
                }


                // ==================================================
                // VERIFICAR SERVICIO
                // ==================================================

                const verificarServicio = `
                    SELECT
                        s.id_servicio,
                        s.precio AS precio_general,
                        s.duracion,

                        bs.precio AS precio_barbero,
                        bs.estado AS estado_barbero_servicio

                    FROM servicios s

                    LEFT JOIN barbero_servicio bs
                        ON bs.id_barbero = ?
                        AND bs.id_servicio = s.id_servicio

                    WHERE
                        s.id_servicio = ?
                        AND s.estado = 1

                    LIMIT 1
                `;

                conexion.query(
                    verificarServicio,
                    [
                        id_barbero,
                        id_servicio
                    ],
                    (error, servicios) => {

                        if (error) {

                            console.error(
                                "❌ Error al verificar servicio:",
                                error
                            );

                            return res.status(500).json({
                                error:
                                    "No se pudo verificar el servicio"
                            });
                        }

                        if (servicios.length === 0) {

                            return res.status(400).json({
                                error:
                                    "El servicio seleccionado no está disponible"
                            });
                        }


                        const servicio = servicios[0];


                        // ==================================================
                        // PRECIO NORMAL DEL BARBERO
                        // ==================================================

                        let precioNormal;

                        if (
                            servicio.precio_barbero !== null &&
                            servicio.precio_barbero !== undefined &&
                            Number.isFinite(
                                Number(servicio.precio_barbero)
                            )
                        ) {

                            precioNormal =
                                Number(servicio.precio_barbero);

                        } else {

                            precioNormal =
                                Number(servicio.precio_general);
                        }


                        if (
                            !Number.isFinite(precioNormal) ||
                            precioNormal <= 0
                        ) {

                            return res.status(400).json({
                                error:
                                    "El precio del servicio no es válido"
                            });
                        }


                        // ==================================================
                        // BUSCAR PROMOCIÓN
                        //
                        // IMPORTANTE:
                        // La promoción es OPCIONAL.
                        //
                        // Si no existe promoción:
                        // se utiliza el precio normal.
                        //
                        // Si la tabla promoción tiene algún problema:
                        // NO se bloquea la reserva.
                        // ==================================================

                        const buscarPromocion = `
                            SELECT
                                id_promocion,
                                titulo,
                                precio_promocion,
                                fecha_inicio,
                                fecha_fin

                            FROM promociones

                            WHERE
                                id_servicio = ?
                                AND estado = 1
                                AND fecha_inicio <= ?
                                AND fecha_fin >= ?

                            ORDER BY id_promocion DESC

                            LIMIT 1
                        `;


                        conexion.query(
                            buscarPromocion,
                            [
                                id_servicio,
                                fecha,
                                fecha
                            ],
                            (error, promociones) => {


                                // ==================================================
                                // SI HAY ERROR EN PROMOCIONES
                                //
                                // NO CANCELAMOS LA RESERVA.
                                // USAMOS PRECIO NORMAL.
                                // ==================================================

                                if (error) {

                                    console.warn(
                                        "⚠️ No se pudo consultar promociones. Se utilizará el precio normal del servicio."
                                    );

                                    continuarConPrecio(
                                        precioNormal,
                                        null
                                    );

                                    return;
                                }


                                // ==================================================
                                // NO HAY PROMOCIÓN
                                // ==================================================

                                if (
                                    !promociones ||
                                    promociones.length === 0
                                ) {

                                    continuarConPrecio(
                                        precioNormal,
                                        null
                                    );

                                    return;
                                }


                                // ==================================================
                                // EXISTE PROMOCIÓN
                                // ==================================================

                                const promocion =
                                    promociones[0];

                                const precioPromocion =
                                    Number(
                                        promocion.precio_promocion
                                    );


                                // ==================================================
                                // PROMOCIÓN VÁLIDA
                                // ==================================================

                                if (
                                    Number.isFinite(
                                        precioPromocion
                                    ) &&
                                    precioPromocion > 0
                                ) {

                                    continuarConPrecio(
                                        precioPromocion,
                                        promocion
                                    );

                                    return;
                                }


                                // ==================================================
                                // PROMOCIÓN INVÁLIDA
                                //
                                // VOLVER AL PRECIO NORMAL
                                // ==================================================

                                console.warn(
                                    "⚠️ La promoción encontrada tiene un precio inválido. Se utilizará el precio normal."
                                );

                                continuarConPrecio(
                                    precioNormal,
                                    null
                                );
                            }
                        );


                        // ==================================================
                        // CONTINUAR CON PRECIO
                        // ==================================================

                        function continuarConPrecio(
                            precioTotal,
                            promocionAplicada
                        ) {

                            if (
                                !Number.isFinite(
                                    precioTotal
                                ) ||
                                precioTotal <= 0
                            ) {

                                return res.status(400).json({
                                    error:
                                        "El precio final del servicio no es válido"
                                });
                            }


                            // ==================================================
                            // CONFIGURACIÓN ADELANTO
                            // ==================================================

                            const obtenerConfiguracion = `
                                SELECT
                                    qr_pago,
                                    adelanto_obligatorio,
                                    monto_adelanto

                                FROM configuracion

                                ORDER BY id_configuracion ASC

                                LIMIT 1
                            `;


                            conexion.query(
                                obtenerConfiguracion,
                                (error, configuraciones) => {

                                    if (error) {

                                        console.error(
                                            "❌ Error al obtener configuración de pago:",
                                            error
                                        );

                                        return res.status(500).json({
                                            error:
                                                "No se pudo verificar la configuración del adelanto"
                                        });
                                    }


                                    // ==================================================
                                    // VALORES POR DEFECTO
                                    // ==================================================

                                    let adelantoObligatorio = 0;
                                    let montoAdelanto = 0;
                                    let qrPago = null;


                                    if (
                                        configuraciones.length > 0
                                    ) {

                                        const configuracion =
                                            configuraciones[0];


                                        adelantoObligatorio =
                                            Number(
                                                configuracion.adelanto_obligatorio
                                            ) === 1
                                                ? 1
                                                : 0;


                                        qrPago =
                                            configuracion.qr_pago ||
                                            null;


                                        if (
                                            adelantoObligatorio === 1
                                        ) {

                                            montoAdelanto =
                                                Number(
                                                    configuracion.monto_adelanto
                                                );
                                        }
                                    }


                                    // ==================================================
                                    // ADELANTO ACTIVADO
                                    // ==================================================

                                    if (
                                        adelantoObligatorio === 1
                                    ) {

                                        if (
                                            !Number.isFinite(
                                                montoAdelanto
                                            ) ||
                                            montoAdelanto <= 0
                                        ) {

                                            return res.status(400).json({
                                                error:
                                                    "El monto del adelanto no está configurado correctamente"
                                            });
                                        }


                                        if (
                                            montoAdelanto >
                                            precioTotal
                                        ) {

                                            return res.status(400).json({
                                                error:
                                                    "El adelanto no puede ser mayor al precio del servicio"
                                            });
                                        }


                                        if (!qrPago) {

                                            return res.status(400).json({
                                                error:
                                                    "El dueño todavía no configuró el QR de pago"
                                            });
                                        }


                                        if (!pagoConfirmado) {

                                            return res.status(400).json({
                                                error:
                                                    "El adelanto es obligatorio para confirmar la reserva"
                                            });
                                        }

                                    }

                                    // ==================================================
                                    // ADELANTO DESACTIVADO
                                    // ==================================================

                                    else {

                                        montoAdelanto = 0;
                                    }


                                    // ==================================================
                                    // VERIFICAR RESERVA DUPLICADA
                                    // ==================================================

                                    const verificarReserva = `
                                        SELECT id_reserva
                                        FROM reservas

                                        WHERE
                                            id_barbero = ?
                                            AND fecha = ?
                                            AND hora = ?
                                            AND estado <> 'cancelada'

                                        LIMIT 1
                                    `;


                                    conexion.query(
                                        verificarReserva,
                                        [
                                            id_barbero,
                                            fecha,
                                            horaReserva
                                        ],
                                        (error, existentes) => {

                                            if (error) {

                                                console.error(
                                                    "❌ Error al verificar disponibilidad:",
                                                    error
                                                );

                                                return res.status(500).json({
                                                    error:
                                                        "No se pudo verificar la disponibilidad"
                                                });
                                            }


                                            if (
                                                existentes.length > 0
                                            ) {

                                                return res.status(409).json({
                                                    error:
                                                        "El horario seleccionado ya está ocupado para este barbero"
                                                });
                                            }


                                            // ==================================================
                                            // CALCULAR SALDO
                                            // ==================================================

                                            const saldo =
                                                Number(
                                                    (
                                                        precioTotal -
                                                        montoAdelanto
                                                    ).toFixed(2)
                                                );


                                            // ==================================================
                                            // CONTINUAR CLIENTE
                                            // ==================================================

                                            continuarConCliente(
                                                horaReserva,
                                                precioTotal,
                                                montoAdelanto,
                                                saldo,
                                                adelantoObligatorio,
                                                promocionAplicada
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    }
                );
            }
        );
    }


    // ======================================================
    // OBTENER HORA
    // ======================================================

    if (id_horario) {

        const buscarHorario = `
            SELECT
                id_horario,
                dia_semana,
                hora_inicio,
                hora_fin,
                estado

            FROM horarios

            WHERE
                id_horario = ?
                AND estado = 1
        `;


        conexion.query(
            buscarHorario,
            [id_horario],
            (error, horarios) => {

                if (error) {

                    console.error(
                        "❌ Error al obtener el horario:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo obtener el horario"
                    });
                }


                if (horarios.length === 0) {

                    return res.status(400).json({
                        error:
                            "El horario seleccionado no está disponible"
                    });
                }


                continuarConHora(
                    horarios[0].hora_inicio
                );
            }
        );

    } else {

        continuarConHora(hora);
    }


    // ======================================================
    // BUSCAR / CREAR CLIENTE
    // ======================================================

    function continuarConCliente(
        horaReserva,
        precioTotal,
        montoAdelanto,
        saldo,
        adelantoObligatorio,
        promocionAplicada
    ) {


        // ==================================================
        // CLIENTE EXISTENTE POR ID
        // ==================================================

        if (id_cliente) {

            insertarReserva(
                id_cliente,
                horaReserva,
                precioTotal,
                montoAdelanto,
                saldo,
                adelantoObligatorio,
                promocionAplicada
            );

            return;
        }


        // ==================================================
        // BUSCAR CLIENTE POR TELÉFONO
        // ==================================================

        const buscarCliente = `
            SELECT id_cliente
            FROM clientes
            WHERE telefono = ?
            LIMIT 1
        `;


        conexion.query(
            buscarCliente,
            [telefono],
            (error, clientes) => {

                if (error) {

                    console.error(
                        "❌ Error al buscar cliente:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo verificar el cliente"
                    });
                }


                // ==================================================
                // CLIENTE EXISTE
                // ==================================================

                if (clientes.length > 0) {

                    insertarReserva(
                        clientes[0].id_cliente,
                        horaReserva,
                        precioTotal,
                        montoAdelanto,
                        saldo,
                        adelantoObligatorio,
                        promocionAplicada
                    );

                    return;
                }


                // ==================================================
                // CREAR CLIENTE
                // ==================================================

                const crearCliente = `
                    INSERT INTO clientes
                    (
                        nombre,
                        telefono
                    )
                    VALUES
                    (?, ?)
                `;


                conexion.query(
                    crearCliente,
                    [
                        nombre_cliente,
                        telefono
                    ],
                    (error, resultado) => {

                        if (error) {

                            console.error(
                                "❌ Error al crear cliente:",
                                error
                            );

                            return res.status(500).json({
                                error:
                                    "No se pudo registrar el cliente"
                            });
                        }


                        insertarReserva(
                            resultado.insertId,
                            horaReserva,
                            precioTotal,
                            montoAdelanto,
                            saldo,
                            adelantoObligatorio,
                            promocionAplicada
                        );
                    }
                );
            }
        );
    }


    // ======================================================
    // INSERTAR RESERVA
    // ======================================================

    function insertarReserva(
        clienteId,
        horaReserva,
        precioTotal,
        montoAdelanto,
        saldo,
        adelantoObligatorio,
        promocionAplicada
    ) {


        const adelantoPagado =
            adelantoObligatorio === 1
                ? 1
                : 0;


        const sql = `
            INSERT INTO reservas
            (
                id_cliente,
                id_barbero,
                id_servicio,
                fecha,
                hora,
                estado,
                observaciones,
                total_servicio,
                adelanto,
                saldo,
                adelanto_pagado
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                'pendiente',
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `;


        conexion.query(
            sql,
            [
                clienteId,
                id_barbero,
                id_servicio,
                fecha,
                horaReserva,
                observaciones || null,

                // PRECIO REAL:
                // promoción o precio normal
                precioTotal,

                montoAdelanto,
                saldo,
                adelantoPagado
            ],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al crear reserva:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo crear la reserva"
                    });
                }


                // ==================================================
                // RESPUESTA
                // ==================================================

                const respuesta = {

                    mensaje:
                        "Reserva creada correctamente",

                    id_reserva:
                        resultado.insertId,

                    id_cliente:
                        clienteId,

                    id_barbero:
                        id_barbero,

                    id_servicio:
                        id_servicio,

                    fecha:
                        fecha,

                    hora:
                        horaReserva,

                    estado:
                        "pendiente",

                    total_servicio:
                        Number(precioTotal),

                    adelanto:
                        Number(montoAdelanto),

                    saldo:
                        Number(saldo),

                    adelanto_pagado:
                        adelantoPagado,

                    promocion_aplicada:
                        false
                };


                // ==================================================
                // SI SE APLICÓ PROMOCIÓN
                // ==================================================

                if (promocionAplicada) {

                    respuesta.promocion_aplicada = true;

                    respuesta.promocion = {

                        id_promocion:
                            promocionAplicada.id_promocion,

                        titulo:
                            promocionAplicada.titulo,

                        precio:
                            Number(
                                promocionAplicada.precio_promocion
                            )
                    };
                }


                res.status(201).json(respuesta);
            }
        );
    }
});


// ======================================================
// CAMBIAR ESTADO
// ======================================================

router.patch(
    "/:id/estado",
    (req, res) => {

        const id = req.params.id;

        const {
            estado
        } = req.body;


        const estadosPermitidos = [
            "pendiente",
            "confirmada",
            "completada",
            "cancelada"
        ];


        if (
            !estadosPermitidos.includes(
                estado
            )
        ) {

            return res.status(400).json({
                error:
                    "Estado de reserva no válido"
            });
        }


        const sql = `
            UPDATE reservas
            SET estado = ?
            WHERE id_reserva = ?
        `;


        conexion.query(
            sql,
            [
                estado,
                id
            ],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al cambiar estado:",
                        error
                    );

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
                            "Reserva no encontrada"
                    });
                }


                res.json({
                    mensaje:
                        "Estado actualizado correctamente",

                    estado:
                        estado
                });
            }
        );
    }
);


// ======================================================
// ELIMINAR RESERVA
// ======================================================

router.delete(
    "/:id",
    (req, res) => {

        const sql = `
            DELETE FROM reservas
            WHERE id_reserva = ?
        `;


        conexion.query(
            sql,
            [req.params.id],
            (error, resultado) => {

                if (error) {

                    console.error(
                        "❌ Error al eliminar reserva:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo eliminar la reserva"
                    });
                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        error:
                            "Reserva no encontrada"
                    });
                }


                res.json({
                    mensaje:
                        "Reserva eliminada correctamente"
                });
            }
        );
    }
);


module.exports = router;