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

            /* IMPORTANTE:
               mostrar el precio guardado en la reserva */
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


    conexion.query(
        sql,
        (error, resultados) => {

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

        }
    );

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

            /* IMPORTANTE:
               mostrar el precio real guardado */
            r.total_servicio AS servicio_precio,

            s.duracion AS servicio_duracion

        FROM reservas r

        LEFT JOIN clientes c
            ON r.id_cliente = c.id_cliente

        LEFT JOIN barberos b
            ON r.id_barbero = b.id_barbero

        LEFT JOIN servicios s
            ON r.id_servicio = s.id_servicio

        WHERE
            r.id_reserva = ?

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


    // ======================================================
    // VALIDAR DATOS PRINCIPALES
    // ======================================================

    if (
        !id_barbero ||
        !id_servicio ||
        !fecha
    ) {

        return res.status(400).json({
            error: "Barbero, servicio y fecha son obligatorios"
        });

    }


    // ======================================================
    // VALIDAR CLIENTE
    // ======================================================

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


    // ======================================================
    // CONVERTIR ESTADO DEL PAGO
    // ======================================================

    const pagoConfirmado =

        adelanto_pagado === true ||
        adelanto_pagado === 1 ||
        adelanto_pagado === "1" ||
        adelanto_pagado === "true";


    // ======================================================
    // OBTENER HORA
    // ======================================================

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

            SELECT
                id_barbero

            FROM barberos

            WHERE
                id_barbero = ?
                AND estado = 1

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
                        error: "El barbero seleccionado no está disponible"
                    });

                }


                // ==================================================
                // VERIFICAR SERVICIO Y PRECIO DEL BARBERO
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
                                error: "No se pudo verificar el servicio"
                            });

                        }


                        if (servicios.length === 0) {

                            return res.status(400).json({
                                error: "El servicio seleccionado no está disponible"
                            });

                        }


                        const servicio = servicios[0];


                        // ==================================================
                        // PRECIO NORMAL
                        // ==================================================

                        const precioNormal =

                            servicio.precio_barbero !== null &&
                            servicio.precio_barbero !== undefined &&
                            Number.isFinite(
                                Number(servicio.precio_barbero)
                            )

                                ? Number(servicio.precio_barbero)

                                : Number(servicio.precio_general);


                        if (

                            !Number.isFinite(precioNormal) ||
                            precioNormal <= 0

                        ) {

                            return res.status(400).json({
                                error: "El precio del servicio no es válido"
                            });

                        }


                        // ==================================================
                        // BUSCAR PROMOCIÓN ACTIVA
                        //
                        // La promoción pertenece al SERVICIO,
                        // no al barbero.
                        //
                        // Por eso todos los barberos tendrán
                        // el mismo precio promocional.
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

                            ORDER BY
                                id_promocion DESC

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

                                if (error) {

                                    console.error(
                                        "❌ Error al buscar promoción:",
                                        error
                                    );

                                    return res.status(500).json({
                                        error: "No se pudo verificar la promoción"
                                    });

                                }


                                // ==================================================
                                // DETERMINAR PRECIO FINAL
                                // ==================================================

                                let precioTotal = precioNormal;

                                let promocionAplicada = null;


                                // ==================================================
                                // SI EXISTE PROMOCIÓN
                                // ==================================================

                                if (promociones.length > 0) {

                                    const promocion =
                                        promociones[0];

                                    const precioPromocion =
                                        Number(
                                            promocion.precio_promocion
                                        );


                                    if (

                                        Number.isFinite(
                                            precioPromocion
                                        ) &&

                                        precioPromocion > 0

                                    ) {

                                        precioTotal =
                                            precioPromocion;

                                        promocionAplicada =
                                            promocion;

                                    }

                                }


                                // ==================================================
                                // VALIDAR PRECIO FINAL
                                // ==================================================

                                if (

                                    !Number.isFinite(
                                        precioTotal
                                    ) ||

                                    precioTotal <= 0

                                ) {

                                    return res.status(400).json({
                                        error: "El precio final del servicio no es válido"
                                    });

                                }


                                // ==================================================
                                // OBTENER CONFIGURACIÓN DEL ADELANTO
                                // ==================================================

                                const obtenerConfiguracion = `

                                    SELECT

                                        qr_pago,

                                        adelanto_obligatorio,

                                        monto_adelanto

                                    FROM configuracion

                                    ORDER BY
                                        id_configuracion ASC

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
                                        // SI EL ADELANTO ESTÁ ACTIVADO
                                        // ==================================================

                                        if (
                                            adelantoObligatorio === 1
                                        ) {

                                            // ------------------------------------------
                                            // VALIDAR MONTO
                                            // ------------------------------------------

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


                                            // ------------------------------------------
                                            // NO PUEDE SUPERAR EL PRECIO
                                            // ------------------------------------------

                                            if (
                                                montoAdelanto >
                                                precioTotal
                                            ) {

                                                return res.status(400).json({
                                                    error:
                                                        "El adelanto no puede ser mayor al precio del servicio"
                                                });

                                            }


                                            // ------------------------------------------
                                            // DEBE HABER QR
                                            // ------------------------------------------

                                            if (!qrPago) {

                                                return res.status(400).json({
                                                    error:
                                                        "El dueño todavía no configuró el QR de pago"
                                                });

                                            }


                                            // ------------------------------------------
                                            // DEBE CONFIRMAR PAGO
                                            // ------------------------------------------

                                            if (!pagoConfirmado) {

                                                return res.status(400).json({
                                                    error:
                                                        "El adelanto es obligatorio para confirmar la reserva"
                                                });

                                            }

                                        }


                                        // ==================================================
                                        // SI EL ADELANTO ESTÁ DESACTIVADO
                                        // ==================================================

                                        else {

                                            montoAdelanto = 0;

                                        }


                                        // ==================================================
                                        // VERIFICAR RESERVA DUPLICADA
                                        // ==================================================

                                        const verificarReserva = `

                                            SELECT
                                                id_reserva

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


                                                // ==================================================
                                                // HORARIO OCUPADO
                                                // ==================================================

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
                                                // CONTINUAR CON CLIENTE
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

                        );

                    }

                );

            }

        );

    }


    // ======================================================
    // OBTENER HORA DESDE HORARIO
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
                        error: "No se pudo obtener el horario"
                    });

                }


                if (horarios.length === 0) {

                    return res.status(400).json({
                        error:
                            "El horario seleccionado no está disponible"
                    });

                }


                const horario =
                    horarios[0];


                continuarConHora(
                    horario.hora_inicio
                );

            }

        );

    }

    else {

        continuarConHora(
            hora
        );

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
        // SI YA TENEMOS ID DEL CLIENTE
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

            SELECT
                id_cliente

            FROM clientes

            WHERE
                telefono = ?

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

                    const cliente =
                        clientes[0];


                    insertarReserva(

                        cliente.id_cliente,

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

                // ESTE ES EL PRECIO REAL:
                // normal del barbero o promoción
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
                // RESERVA CREADA
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
                        adelantoPagado

                };


                // ==================================================
                // INFORMAR SI SE APLICÓ PROMOCIÓN
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

                else {

                    respuesta.promocion_aplicada = false;

                }


                res.status(201).json(
                    respuesta
                );

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

        const id =
            req.params.id;

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
                error: "Estado de reserva no válido"
            });

        }


        const sql = `

            UPDATE reservas

            SET
                estado = ?

            WHERE
                id_reserva = ?

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

            WHERE
                id_reserva = ?

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