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
            s.precio AS servicio_precio,
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

                    error:
                        "Error al obtener las reservas"

                });

            }


            res.json(
                resultados
            );

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
            s.precio AS servicio_precio,
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

                    error:
                        "Error al obtener la reserva"

                });

            }


            if (
                resultados.length === 0
            ) {

                return res.status(404).json({

                    error:
                        "Reserva no encontrada"

                });

            }


            res.json(
                resultados[0]
            );

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

        // ==========================================
        // DATOS DEL ADELANTO
        // ==========================================

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

            error:
                "Barbero, servicio y fecha son obligatorios"

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

            error:
                "El nombre y teléfono del cliente son obligatorios"

        });

    }


    // ======================================================
    // VALIDAR ADELANTO
    // ======================================================

    const pagoConfirmado =

        adelanto_pagado === true ||

        adelanto_pagado === 1 ||

        adelanto_pagado === "1" ||

        adelanto_pagado === "true";


    if (!pagoConfirmado) {

        return res.status(400).json({

            error:
                "El adelanto es obligatorio para confirmar la reserva"

        });

    }


    // ======================================================
    // OBTENER HORA
    // ======================================================

    function continuarConHora(
        horaReserva
    ) {

        if (!horaReserva) {

            return res.status(400).json({

                error:
                    "Debe seleccionar un horario"

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

                        error:
                            "No se pudo verificar el barbero"

                    });

                }


                if (
                    barberos.length === 0
                ) {

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

                        id_servicio,
                        precio,
                        duracion

                    FROM servicios

                    WHERE

                        id_servicio = ?

                        AND estado = 1

                `;


                conexion.query(

                    verificarServicio,

                    [id_servicio],

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


                        if (
                            servicios.length === 0
                        ) {

                            return res.status(400).json({

                                error:
                                    "El servicio seleccionado no está disponible"

                            });

                        }


                        const servicio =
                            servicios[0];


                        const precioTotal =
                            Number(
                                servicio.precio
                            );


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


                                if (
                                    configuraciones.length === 0
                                ) {

                                    return res.status(400).json({

                                        error:
                                            "La configuración de adelanto no está disponible"

                                    });

                                }


                                const configuracion =
                                    configuraciones[0];


                                // ==================================================
                                // ADELANTO OBLIGATORIO
                                // ==================================================

                                const montoAdelanto =
                                    Number(
                                        configuracion.monto_adelanto
                                    );


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


                                // ==================================================
                                // QR OBLIGATORIO
                                // ==================================================

                                if (
                                    !configuracion.qr_pago
                                ) {

                                    return res.status(400).json({

                                        error:
                                            "El dueño todavía no configuró el QR de pago"

                                    });

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

                                            saldo

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
                        "❌ Error al obtener horario:",
                        error
                    );

                    return res.status(500).json({

                        error:
                            "No se pudo obtener el horario"

                    });

                }


                if (
                    horarios.length === 0
                ) {

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

        saldo

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

                saldo

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

                if (
                    clientes.length > 0
                ) {

                    const cliente =
                        clientes[0];


                    insertarReserva(

                        cliente.id_cliente,

                        horaReserva,

                        precioTotal,

                        montoAdelanto,

                        saldo

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

                            saldo

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

        saldo

    ) {


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

                1

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

                precioTotal,

                montoAdelanto,

                saldo

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

                res.status(201).json({

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
                        Number(
                            precioTotal
                        ),

                    adelanto:
                        Number(
                            montoAdelanto
                        ),

                    saldo:
                        Number(
                            saldo
                        ),

                    adelanto_pagado:
                        1

                });

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

                error:
                    "Estado de reserva no válido"

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