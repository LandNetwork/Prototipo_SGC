require('dotenv').config();
const { Pool } = require('pg');
const format = require('pg-format');

const PG_CRIPTO_KEY = process.env.PG_CRIPTO_KEY;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});


let eventCallbacks = {};

// permite a otros módulos registrar callbacks
function on(event, callback) {
    if (!eventCallbacks[event]) {
        eventCallbacks[event] = [];
    }
    eventCallbacks[event].push(callback);
}


function connect() {
    pool.connect((err, client, done) => {
        if (err) {
            console.error('Error acquiring client', err.stack);
            return;
        }
        console.log('db connection initialized');
        createTables(client);

        // Escucha los eventos NOTIFY de PostgreSQL
        client.query('LISTEN messages_changes');
        client.on('notification', (msg) => {
            // aquí, en lugar de emitir directamente a los clientes,
            // llama a todos los callbacks registrados para este evento
            const callbacks = eventCallbacks['messages_changes'];
            if (callbacks) {
                callbacks.forEach(callback => callback(msg.payload));
            }
        });
    });
}

function createTables(client) {
    console.log('creating tables');
    client.query(`

    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    --INSERT INTO gestion.gp_usuario(t_basket, tipo_documento, numero_documento, correo_electronico, primer_nombre, primer_apellido, llave)
    --   VALUES (550, 526, 1, 1, 'admin', 'admin',  crypt('a', gen_salt('bf')) );

    --Example how to set an user password:
    --update  gestion.gp_usuario set llave = crypt('1', gen_salt('bf')) where t_id = 1;

      `, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log('DB is ready!');
            insertData(client);
        }
    });
}



function insertData(client) {
    console.log('Inserting Data');
    client.query(`
    --SETTING DEFAULT BASKETS IF NOT EXISTS
    -- topic 'Gestion_Catastral_V0_1.Gestion_Catastral'
    UPDATE gestion.t_ili2db_basket
    SET attachmentkey = 'Default_basket'
    WHERE t_id = (
        SELECT t_id
        FROM gestion.t_ili2db_basket
        WHERE topic = 'Gestion_Catastral_V0_1.Gestion_Catastral'
        AND attachmentkey != 'Default_basket'
        AND NOT EXISTS (
            SELECT 1
            FROM gestion.t_ili2db_basket
            WHERE topic = 'Gestion_Catastral_V0_1.Gestion_Catastral'
            AND attachmentkey = 'Default_basket'
        )
        LIMIT 1
    );
    
    -- topic 'Gestion_Procesos_V0_1.Gestion_Procesos'
    UPDATE gestion.t_ili2db_basket
    SET attachmentkey = 'Default_basket'
    WHERE t_id = (
        SELECT t_id
        FROM gestion.t_ili2db_basket
        WHERE topic = 'Gestion_Procesos_V0_1.Gestion_Procesos'
        AND attachmentkey != 'Default_basket'
        AND NOT EXISTS (
            SELECT 1
            FROM gestion.t_ili2db_basket
            WHERE topic = 'Gestion_Procesos_V0_1.Gestion_Procesos'
            AND attachmentkey = 'Default_basket'
        )
        LIMIT 1
    );
    



    /*
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM gestion.gp_tipoproceso
            WHERE nombre = 'Mutación de 2da'
        ) THEN
            INSERT INTO gestion.gp_tipoproceso (t_basket, nombre, descripcion)
            VALUES (70, 'Mutación de 2da', 'Proceso de Englobes y Desenglobes');

            INSERT INTO gestion.gp_tipoactividad (t_basket, nombre, descripcion, tiempo_estimado)
            VALUES
            (70, 'Recepción de Solicitud', 'Inicio del proceso de mutación catastral', 1), 
            (70, 'Verificación de Documentos', '', 1), 
            (70, 'Subsanación documental', 'Solicitud de documentos adicionales / correcciones', 1), 
            (70, 'Inspección predial', '', 1), 
            (70, 'Edición alfanumérica', '', 1), 
            (70, 'Edición cartográfica', '', 1), 
            (70, 'Cálculo de avalúos', '', 1), 
            (70, 'Aprobación', '', 1), 
            (70, 'Expedición de resolución', '', 1), 
            (70, 'Notificación', '', 1), 
            (70, 'Registro en firme', '', 1), 
            (70, 'Fin', '', 1);

            INSERT INTO gestion.gp_flujo_tipoactividad( t_basket, siguiente, predecesora, condicion_transicion)
            VALUES
            (70,76,75,'Ejecución Exitosa'),
            (70,77,76,'Requiere Subsanación'),
            (70,76,77,'Subsanación Completa'),
            (70,82,76,'Desistimiento'),
            (70,78,76,'Requiere Inspección Predial'),
            (70,79,76,'Edición alfanumérica'),
            (70,79,78,'Edición alfanumérica'),
            (70,80,79,'Edición cartográfica'),
            (70,81,80,'Cálculo de avalúos'),
            (70,82,81,'Ejecución Exitosa'),
            (70,83,82,'Aprobación Finalizada'),
            (70,77,82,'Requiere Subsanación documental'),
            (70,78,82,'Requiere Inspección Predial'),
            (70,79,82,'Requiere Edición Alfanumérica'),
            (70,80,82,'Requiere Edición Cartográfica'),
            (70,84,83,'Resolución Emitida'),
            (70,85,84,'Notificación Realizada'),
            (70,86,85,'Registro Confirmado'),
            (70,81,82,'Requiere ajuste en cálculo de avalúo');
        END IF;
    END
    $$; 

    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM gestion.gp_predio
        ) THEN
            INSERT INTO gestion.gp_predio(
                t_basket, numero_predial_nacional, id_operacion, condicion_predio, tipo, codigo_orip, matricula_inmobiliaria)
                VALUES
                (70,'857320101010100010001000000000', '', 1, 56, '321', 23287982),
                (70,'857320101010100010002000000000', '', 1, 56, '321', 77296218),
                (70,'857320101010100010003000000000', '', 1, 56, '321', 31240841),
                (70,'857320101010100010004000000000', '', 1, 56, '321', 92273000),
                (70,'857320101010100010005000000000', '', 1, 56, '321', 38108570),
                (70,'857320101010100010006000000000', '', 1, 56, '321', 87428715),
                (70,'857320101010100010007000000000', '', 1, 56, '321', 48964087),
                (70,'857320101010100010008000000000', '', 1, 56, '321', 55205228),
                (70,'857320101010100010009000000000', '', 1, 56, '321', 22609744),
                (70,'857320101010100010010000000000', '', 1, 56, '321', 66828839),
                (70,'857320101010100010011000000000', '', 1, 56, '321', 33098922),
                (70,'857320101010100010012000000000', '', 1, 56, '321', 15548422),
                (70,'857320101010100010013000000000', '', 1, 56, '321', 15973687),
                (70,'857320101010100010014000000000', '', 1, 56, '321', 18532312);

        END IF;
    END
    $$; 
                */
      `, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Data Inserted!');
        }
    });
}


async function validateUser(user, password) {

    const sql = `
        SELECT t_id as id
        FROM gestion.gp_usuario
        WHERE correo_electronico = $1
        AND llave = crypt($2, llave);
    `;

    try {
        const res = await pool.query(sql, [user, password]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}


async function getUserById(id) {
    try {
        const res = await pool.query('SELECT t_id as id , * FROM gestion.gp_usuario WHERE t_id = $1', [id]);
        if (res.rows.length > 0) {
            return res.rows[0];
        } else {
            return null;
        }
    } catch (err) {
        console.log(err.stack);
        return null;
    }
}

//ejemlo consulta para generar arbol de actividades: pendiente filtrar por tipo de proceso
/*
WITH nodos AS (
    SELECT
        t_id AS id,
        nombre AS label
    FROM
        gestion.gp_tipoactividad
),
aristas AS (
    SELECT
        predecesora AS source,
        siguiente AS target,
        condicion_transicion AS label
    FROM
        gestion.gp_flujo_tipoactividad
)
SELECT json_build_object(
    'elements', json_agg(json_build_object('data', content))
) 
FROM (
    SELECT 'data', json_build_object('id', id::text, 'label', label) AS content FROM nodos
    UNION ALL
    SELECT 'data', json_build_object('source', source::text, 'target', target::text, 'label', label) FROM aristas
) AS combined_results;
*/


async function apiSearchParcel(data) {
    const sql = `
        SELECT
            gc_predio.t_ili_tid,
            numero_predial_nacional,
            codigo_orip || '-' || CAST(matricula_inmobiliaria AS TEXT) AS matricula,
            nombre_predio
        FROM
            gestion.gc_predio
            LEFT JOIN gestion.gc_direccionvalor ON gc_predio_direccion = gc_predio.t_id
        WHERE
            numero_predial_nacional ILIKE '%' || $1 || '%'
            OR (codigo_orip || '-' || CAST(matricula_inmobiliaria AS TEXT)) ILIKE '%' || $1 || '%'
            OR nombre_predio ILIKE '%' || $1 || '%'
        limit 1000;
    `;

    try {
        const res = await pool.query(sql, [data.id]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}



async function apiSearchParty(data) {
    const sql = `
        SELECT
            *
        FROM
            gestion.gc_interesado
        WHERE
            tipo_documento = $1
            AND
            documento_identidad = $2
        limit 1;
    `;

    try {
        const res = await pool.query(sql, [data.tipo_documento, data.documento_identidad]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiSearchTransactionType(data) {
    const sql = `
        SELECT
            t_id as value, nombre as text, descripcion as desc
        FROM
            gestion.gp_tipotransaccion;
    `;

    try {
        const res = await pool.query(sql, []);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiSearchRequesterType(data) {
    const sql = `
        SELECT
            t_id as value, dispname as text
        FROM
            gestion.gp_tiposolicitante
    `;

    try {
        const res = await pool.query(sql, []);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiSearchPartyDocumentType(data) {
    const sql = `
        SELECT
            t_id as value, dispname as text
        FROM
            gestion.gc_interesadodocumentotipo
    `;

    try {
        const res = await pool.query(sql, []);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiSearchPartyType(data) {
    const sql = `
        SELECT
            t_id as value, dispname as text
        FROM
            gestion.gc_interesadotipo
    `;

    try {
        const res = await pool.query(sql, []);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}


async function apiGetBasketByProccessId(processId) {
    const sql = `
        SELECT
            t_ili_tid
        FROM
            gestion.t_ili2db_basket
        WHERE attachmentkey = (SELECT t_id::text FROM gestion.gp_solicitud where t_ili_tid = $1 Limit 1);
    `;

    try {
        const res = await pool.query(sql, [processId]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0].t_ili_tid || null;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}



async function apiSearchProcess(data) {
    const sql = `
        SELECT
            gp_solicitud.t_ili_tid,
            gp_solicitud.t_id,
            numero_radicado,
            TO_CHAR(fecha_radicacion, 'YYYY/MM/DD') AS fecha_radicacion,
            coalesce( gc_interesado.razon_social,
                gc_interesado.primer_nombre || 
                    coalesce(' ' || gc_interesado.segundo_nombre, '' ) || 
                    coalesce(' ' || gc_interesado.primer_apellido, '' ) || 
                    coalesce(' ' || gc_interesado.segundo_apellido, '' ) 
            ) as solicitante,
            ARRAY_AGG(DISTINCT gc_predio.numero_predial_nacional) AS codigos_prediales,
            ARRAY_AGG(DISTINCT gc_predio.t_ili_tid) AS predios_t_ili_tids,
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM gestion.t_ili2db_basket b
                    WHERE b.attachmentkey = gp_solicitud.t_id::text
                ) THEN true 
                ELSE false 
            END AS exists_in_basket
        FROM
            gestion.gp_solicitud
            JOIN gestion.gc_interesado on gc_interesado.t_id = gp_solicitud.gc_interesado
            LEFT JOIN gestion.gp_transaccion ON gp_transaccion.solicitud = gp_solicitud.t_id
            LEFT JOIN gestion.gp_gc_predio_gp_transaccion ON gp_gc_predio_gp_transaccion.gp_transaccion = gp_transaccion.t_id
            LEFT JOIN gestion.gc_predio ON gc_predio.t_id = gp_gc_predio_gp_transaccion.gc_predio
        WHERE
            numero_radicado ILIKE '%' || $1 || '%'
            OR (
                COALESCE(gc_interesado.razon_social, '') ILIKE '%' || $1 || '%'
                OR (
                    gc_interesado.primer_nombre || 
                    COALESCE(' ' || gc_interesado.segundo_nombre, '') || 
                    COALESCE(' ' || gc_interesado.primer_apellido, '') || 
                    COALESCE(' ' || gc_interesado.segundo_apellido, '')
                ) ILIKE '%' || $1 || '%'
            )
            OR (
                gc_predio.numero_predial_nacional ILIKE '%' || $1 || '%'
                OR gc_predio.numero_predial_nacional IS NULL
            )
        GROUP BY
            gp_solicitud.t_ili_tid,
            gp_solicitud.t_id,
            numero_radicado,
            fecha_radicacion,
            solicitante
        limit 1000;
    `;

    try {
        const res = await pool.query(sql, [data.id]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiSearchProcessById(data) {
    const sql = `
        WITH defaultGPTopic AS (
            SELECT t_id FROM gestion.t_ili2db_basket 
            WHERE attachmentkey = 'Default_basket' 
              AND topic = 'Gestion_Procesos_V0_1.Gestion_Procesos'
        ),
        request AS (
            SELECT 
                t_id,
                t_ili_tid,
                tipo_solicitante,
                TO_CHAR(fecha_radicacion, 'DD/MM/YYYY') AS fecha_radicacion,
                numero_radicado,
                descripcion_solicitud,
                gc_interesado
            FROM gestion.gp_solicitud
            WHERE t_ili_tid = $1
        ),
        interested_party AS (
            SELECT 
                t_id,
                t_ili_tid,
                tipo,
                tipo_documento,
                documento_identidad,
                primer_nombre,
                segundo_nombre,
                primer_apellido,
                segundo_apellido,
                sexo,
                grupo_etnico,
                razon_social
            FROM gestion.gc_interesado
            WHERE t_id = (SELECT gc_interesado FROM request)
        ),
        transactions AS (
            SELECT 
                t_ili_tid AS transaccion_t_ili_tid,
                tipo_transaccion,
                solicitud
            FROM gestion.gp_transaccion
            WHERE solicitud = (SELECT t_id FROM request)
        ),
        related_parcels AS (
            SELECT 
                gt.t_ili_tid AS transaccion_t_ili_tid,
                json_agg(gc.t_ili_tid) AS predios
            FROM gestion.gp_gc_predio_gp_transaccion pgp
            JOIN gestion.gc_predio gc ON pgp.gc_predio = gc.t_id
            JOIN gestion.gp_transaccion gt ON pgp.gp_transaccion = gt.t_id
            WHERE gt.solicitud = (SELECT t_id FROM request)
            GROUP BY gt.t_ili_tid
        )
        SELECT
            r.t_ili_tid AS solicitud_t_ili_tid,
            r.tipo_solicitante,
            r.fecha_radicacion,
            r.numero_radicado,
            r.descripcion_solicitud,
            ip.t_ili_tid as interesado_t_ili_tid,
            ip.tipo_documento as tipo_documento,
            ip.documento_identidad,
            ip.tipo as tipo_interesado,
            ip.primer_nombre,
            ip.segundo_nombre,
            ip.primer_apellido,
            ip.segundo_apellido,
            ip.razon_social,
            json_agg(
                json_build_object(
                    'transaccion_t_ili_tid', t.transaccion_t_ili_tid,
                    'tipo_transaccion', t.tipo_transaccion,
                    'predios', rp.predios
                )
            ) AS transacciones
        FROM request r
        JOIN interested_party ip ON r.gc_interesado = ip.t_id
        LEFT JOIN transactions t ON r.t_id = t.solicitud
        LEFT JOIN related_parcels rp ON t.transaccion_t_ili_tid = rp.transaccion_t_ili_tid
        GROUP BY 
            r.t_ili_tid, 
            r.tipo_solicitante, 
            r.fecha_radicacion, 
            r.numero_radicado, 
            r.descripcion_solicitud, 
            ip.t_id, 
            ip.t_ili_tid, 
            ip.tipo, 
            ip.tipo_documento, 
            ip.documento_identidad, 
            ip.primer_nombre, 
            ip.segundo_nombre, 
            ip.primer_apellido, 
            ip.segundo_apellido, 
            ip.sexo, 
            ip.grupo_etnico, 
            ip.razon_social
        ;
    `;

    try {
        const res = await pool.query(sql, [data.id]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}



async function apiInsertRequest(data) {
    const sql = `
        WITH defaultGCTopic AS (
            Select t_id FROM gestion.t_ili2db_basket WHERE attachmentkey = 'Default_basket' and topic = 'Gestion_Catastral_V0_1.Gestion_Catastral'
        ),
        defaultGPTopic AS (
            Select t_id FROM gestion.t_ili2db_basket WHERE attachmentkey = 'Default_basket' and topic = 'Gestion_Procesos_V0_1.Gestion_Procesos'    
        ),


        partyUpdated AS (
            SELECT t_id, t_ili_tid from gestion.gc_interesado where t_ili_tid = $1
        ),
        partyInserted AS (
            INSERT INTO gestion.gc_interesado (t_basket, tipo, tipo_documento, documento_identidad, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, sexo, grupo_etnico, razon_social)
            SELECT 
                (  Select t_id FROM defaultGCTopic ),
                $2,
                $3, $4, $5, $6, $7, $8, $9, $10, $11
            WHERE NOT EXISTS (SELECT 1 FROM partyUpdated)
            RETURNING t_id,t_ili_tid
        ),
        partyUpserted AS (
            SELECT COALESCE (
                (SELECT t_ili_tid::UUID FROM partyInserted),
                (SELECT t_ili_tid::UUID FROM partyUpdated)
            )  as interesado_t_ili_tid,
            COALESCE (
                (SELECT t_id FROM partyInserted),
                (SELECT t_id FROM partyUpdated)
            )  as t_id

        ),


        updatedRequest AS (
            UPDATE gestion.gp_solicitud SET
                tipo_solicitante = $12,
                fecha_radicacion = COALESCE(TO_TIMESTAMP($13, 'DD/MM/YYYY'), NOW()),
                numero_radicado = $14,
                descripcion_solicitud = $15,
                gc_interesado = (SELECT t_id FROM partyUpserted)
            WHERE t_ili_tid = $16
            RETURNING 
                t_ili_tid as solicitud_t_ili_tid,
                t_id
        ),
        insertedRequest AS (
            INSERT INTO gestion.gp_solicitud(
                t_basket, tipo_solicitante, fecha_radicacion, numero_radicado, descripcion_solicitud, gc_interesado)
            SELECT
                ( select t_id from defaultGPTopic ),
                $12, COALESCE(TO_TIMESTAMP($13, 'DD/MM/YYYY'), NOW()), $14, $15,
                ( SELECT t_id FROM partyUpserted )
            WHERE NOT EXISTS (SELECT 1 FROM updatedRequest)
            RETURNING 
                t_ili_tid as solicitud_t_ili_tid, 
                t_id
        ),
        requestUpserted AS (
            SELECT COALESCE (
                (SELECT solicitud_t_ili_tid::UUID FROM updatedRequest),
                (SELECT solicitud_t_ili_tid::UUID FROM insertedRequest)
            )  as solicitud_t_ili_tid,
            COALESCE (
                (SELECT t_id FROM updatedRequest),
                (SELECT t_id FROM insertedRequest)
            )  as t_id
        ),


        insertTransactions AS (
            INSERT INTO gestion.gp_transaccion (t_basket, tipo_transaccion, solicitud)
            SELECT
                (SELECT t_id FROM defaultGPTopic),
                (elem ->> 'tipo_transaccion')::bigint,
                (SELECT t_id FROM requestUpserted)
            FROM jsonb_array_elements($17::jsonb) AS elem
            RETURNING t_ili_tid AS transaccion_t_ili_tid, t_id, tipo_transaccion
        ),
        insertTransactionsSecuence AS (
            SELECT insertTransactions.*, row_number() OVER () AS id_transaccion
            FROM insertTransactions
        ),

        insertActions AS (
            INSERT INTO gestion.gp_actividad (t_basket, fecha_inicio, tipo_actividad, transaccion, usuario)
            SELECT 
                (SELECT t_id FROM defaultGPTopic),
                now() as fecha_inicio,
                a.t_id as tipo_actividad,
                i.t_id as transaccion,
                $18 as usuario
            FROM gestion.gp_tipoactividad a
            JOIN insertTransactions i ON a.tipo_transaccion = i.tipo_transaccion
            WHERE NOT EXISTS (
                SELECT 1
                FROM gestion.gp_flujo_tipoactividad f
                WHERE f.siguiente = a.t_id
            )
            RETURNING t_id, t_ili_tid as accion_t_ili_tid
        ),
        insertPredios AS (
            INSERT INTO gestion.gp_gc_predio_gp_transaccion (t_basket, gc_predio, gp_transaccion)
            SELECT 
                (SELECT t_id FROM defaultGPTopic) as topic,
                (SELECT t_id FROM gestion.gc_predio WHERE t_ili_tid::text = predio_t_ili_tid) as predio_t_id,
                trans.t_id as transaccion_t_id
            FROM
                insertTransactionsSecuence trans,
                (
                    SELECT
                        jsonb_array_elements_text(item -> 'predios') as predio_t_ili_tid,
                        (item ->> 'id_transaccion')::bigint AS id_transaccion
                    FROM
                        jsonb_array_elements($17::jsonb) AS item
                ) AS predios
            where trans.id_transaccion = predios.id_transaccion
            RETURNING gc_predio::bigint as predio_t_id, gp_transaccion::bigint as transaccion_t_id
        ),
        insertedPrediosIds AS (
            SELECT 
                transaccion_t_ili_tid,
                predio.t_ili_tid as predio_t_ili_tid,
                predio_t_id
            FROM 
                insertPredios
                LEFT JOIN insertTransactionsSecuence transaccion ON insertPredios.transaccion_t_id = transaccion.t_id
                LEFT JOIN gestion.gc_predio predio ON predio.t_id = predio_t_id
        ),

        insertedBasket as (
            INSERT INTO gestion.t_ili2db_basket(
                t_id, dataset, topic, t_ili_tid, attachmentkey)
                VALUES (
                    nextval('gestion.t_ili2db_seq'::regclass) , 
                    (SELECT t_id from gestion.t_ili2db_dataset where datasetname = 'Baseset' limit 1), 
                    'Gestion_Catastral_V0_1.Gestion_Catastral', 
                    gen_random_uuid(), 
                    (SELECT t_id FROM requestUpserted)
                )
            RETURNING t_id as basket_t_id, t_ili_tid as basket_t_ili_tid
        ),

        updatePrediosBasketId AS (
            UPDATE gestion.gc_predio
            SET t_basket = (SELECT basket_t_id FROM insertedBasket)
            WHERE t_id in (SELECT predio_t_id FROM insertedPrediosIds)
        ),
        updateTerrenosBasketId AS (
            UPDATE gestion.gc_terreno
            SET t_basket = (SELECT basket_t_id FROM insertedBasket)
            WHERE predio in (SELECT predio_t_id FROM insertedPrediosIds)
        ),
        updateAvaluoValorBasketId AS (
            UPDATE gestion.gc_avaluovalor
            SET t_basket = (SELECT basket_t_id FROM insertedBasket)
            WHERE gc_predio_avaluo in (SELECT predio_t_id FROM insertedPrediosIds)
        ),
        updateDireccionValorBasketId AS (
            UPDATE gestion.gc_direccionvalor
            SET t_basket = (SELECT basket_t_id FROM insertedBasket)
            WHERE gc_predio_direccion in (SELECT predio_t_id FROM insertedPrediosIds)
        ),
        updateNovedadNumeroPredialBasketId AS (
            UPDATE gestion.gc_novedadnumeropredialvalor
            SET t_basket = (SELECT basket_t_id FROM insertedBasket)
            WHERE gc_predio_novedad_numeros_prediales in (SELECT predio_t_id FROM insertedPrediosIds)
        ),


        outTransactions AS (
            SELECT 
                transaccion_t_ili_tid,
                json_agg(predio_t_ili_tid) AS predios
            FROM 
                insertedPrediosIds
            GROUP BY 
                transaccion_t_ili_tid
        )
        SELECT 
            interesado_t_ili_tid, 
            solicitud_t_ili_tid, 
            json_agg(
                json_build_object(
                    'transaccion_t_ili_tid', t.transaccion_t_ili_tid, 
                    'predios', t.predios
                )
            ) AS transacciones
        FROM 
            partyUpserted, requestUpserted, outTransactions t
        group by interesado_t_ili_tid, solicitud_t_ili_tid
        ;

        `;

    try {
        const res = await pool.query(sql, [
            data.interesado_t_ili_tid,
            data.tipo_interesado,
            data.tipo_documento,
            data.documento_identidad,
            data.primer_nombre,
            data.segundo_nombre,
            data.primer_apellido,
            data.segundo_apellido,
            data.sexo,
            data.grupo_etnico,
            data.razon_social,

            data.tipo_solicitante,
            data.fecha_radicacion,
            data.numero_radicado,
            data.descripcion_solicitud,

            data.solicitud_t_ili_tid,

            JSON.stringify(data.transacciones.map((t, id) => { return { id_transaccion: id + 1, ...t } })),

            data.userId
        ]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiFinishProcessById(data) {
    const sql = `
        WITH defaultGCTopic AS (
            SELECT t_id 
            FROM gestion.t_ili2db_basket 
            WHERE attachmentkey = 'Default_basket' 
            AND topic = 'Gestion_Catastral_V0_1.Gestion_Catastral'
        ),
        defaultGPTopic AS (
            SELECT t_id 
            FROM gestion.t_ili2db_basket 
            WHERE attachmentkey = 'Default_basket' 
            AND topic = 'Gestion_Procesos_V0_1.Gestion_Procesos'
        ),
        request AS (
            SELECT 
                t_id,
                t_ili_tid
            FROM gestion.gp_solicitud
            WHERE t_ili_tid = $1
        ),
        transactions AS (
            SELECT 
                t.t_id AS transaccion_id
            FROM gestion.gp_transaccion t
            WHERE t.solicitud = (SELECT t_id FROM request)
        ),
        updatePrediosBasketId AS (
            UPDATE gestion.gc_predio
            SET t_basket = (SELECT t_id FROM defaultGCTopic)
            WHERE t_id IN (
                SELECT gp_gc_predio_gp_transaccion.gc_predio
                FROM gestion.gp_gc_predio_gp_transaccion
                JOIN transactions ON gp_gc_predio_gp_transaccion.gp_transaccion = transactions.transaccion_id
            )
        ),
        updateTerrenosBasketId AS (
            UPDATE gestion.gc_terreno
            SET t_basket = (SELECT t_id FROM defaultGCTopic)
            WHERE predio IN (
                SELECT gp_gc_predio_gp_transaccion.gc_predio
                FROM gestion.gp_gc_predio_gp_transaccion
                JOIN transactions ON gp_gc_predio_gp_transaccion.gp_transaccion = transactions.transaccion_id
            )
        ),
        updateAvaluoBasketId AS (
            UPDATE gestion.gc_avaluovalor
            SET t_basket = (SELECT t_id FROM defaultGCTopic)
            WHERE gc_predio_avaluo IN (
                SELECT gp_gc_predio_gp_transaccion.gc_predio
                FROM gestion.gp_gc_predio_gp_transaccion
                JOIN transactions ON gp_gc_predio_gp_transaccion.gp_transaccion = transactions.transaccion_id
            )
        ),
        updatedireccionBasketId AS (
            UPDATE gestion.gc_direccionvalor
            SET t_basket = (SELECT t_id FROM defaultGCTopic)
            WHERE gc_predio_direccion IN (
                SELECT gp_gc_predio_gp_transaccion.gc_predio
                FROM gestion.gp_gc_predio_gp_transaccion
                JOIN transactions ON gp_gc_predio_gp_transaccion.gp_transaccion = transactions.transaccion_id
            )
        ),
        updateNovedadBasketId AS (
            UPDATE gestion.gc_novedadnumeropredialvalor
            SET t_basket = (SELECT t_id FROM defaultGCTopic)
            WHERE gc_predio_novedad_numeros_prediales IN (
                SELECT gp_gc_predio_gp_transaccion.gc_predio
                FROM gestion.gp_gc_predio_gp_transaccion
                JOIN transactions ON gp_gc_predio_gp_transaccion.gp_transaccion = transactions.transaccion_id
            )
        ),
        deleteBasket AS (
            DELETE FROM gestion.t_ili2db_basket
            WHERE attachmentkey = (SELECT t_id::text FROM request)
        )
        SELECT 1;
    
    `;

    try {
        const res = await pool.query(sql, [data.id]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetTipoActividad(tipo_transaccion) {
    const sql = `
    SELECT t_id, t_ili_tid, nombre, descripcion, subtransaccion
    from gestion.gp_tipoactividad gt where gt.tipo_transaccion=$1;
    `;

    try {
        const res = await pool.query(sql, [tipo_transaccion]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetTipoTransaccion() {
    const sql = `
    select t_id, t_basket, t_ili_tid, nombre, descripcion
        from gestion.gp_tipotransaccion tt
    where not exists (
        select from gestion.gp_tipoactividad ta where ta.subtransaccion is not null and ta.subtransaccion = tt.t_id 
    );
    `

    try {
        const res = await pool.query(sql);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetFlujoTipoActividad(tipo_transaccion) {
    const sql = `select gft.t_id, gft.condicion_transicion, gft.siguiente ,gft.predecesora, ta1.t_ili_tid as siguiente_ili, ta2.t_ili_tid as predecesora_ili
    from gestion.gp_tipoactividad ta1
        inner join gestion.gp_flujo_tipoactividad gft on ta1.t_id  = gft.siguiente 
        inner join gestion.gp_tipoactividad ta2 on ta2.t_id = gft.predecesora
    where ta1.tipo_transaccion = $1`;

    try {
        const res = await pool.query(sql, [tipo_transaccion]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetActividades(userId) {
    const sql = `
    select ga.t_id as id, ga.t_ili_tid as uuid, ga.t_basket, estado, fecha_inicio, fecha_finalizacion_estimada,
        ga.tipo_actividad, ga.usuario, ga.transaccion, gt.nombre, gt.descripcion
        from gestion.gp_actividad ga
        inner join gestion.gp_tipoactividad gt on gt.t_id = ga.tipo_actividad 
    where fecha_finalizacion is null and usuario = $1;`;

    try {
        const res = await pool.query(sql, [userId]);

        if (res.rows.length === 0) {
            return [];
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetActividadesByTransaccion(transaccionId){
    const sql = `
    select ga.t_id as id, ga.t_ili_tid as uuid, ga.t_basket, estado, fecha_inicio, fecha_finalizacion_estimada,
    fecha_finalizacion,
    ga.tipo_actividad, ga.usuario, ga.transaccion, gt.nombre, gt.descripcion,  CONCAT( primer_nombre, ' ' || segundo_nombre, ' ' || primer_apellido, ' ' || segundo_apellido) as nombre_completo
    , gr.nombre as nombre_rol
        from gestion.gp_actividad ga
        inner join gestion.gp_tipoactividad gt on gt.t_id = ga.tipo_actividad
        inner join gestion.gp_usuario gu  on gu.t_id = ga.usuario
        inner join gestion.gp_usuario_rol gur on gur.usuario = gu.t_id 
        inner join gestion.gp_tiporol gr on gr.t_id = gur.rol
        where ga.transaccion = $1
        order by fecha_inicio desc`;

    try {
        const res = await pool.query(sql, [transaccionId]);

        if (res.rows.length === 0) {
            return [];
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetTransacciones() {
    const sql = 
    `select tr.t_id, tr.t_ili_tid, ttr.nombre  from gestion.gp_transaccion tr inner join gestion.gp_tipotransaccion ttr on ttr.t_id = tr.tipo_transaccion`;

    try {
        const res = await pool.query(sql);
        if (res.rows.length === 0) {
            return [];
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetFlujoTipoActividadByPredecesora(id_predecesora) {
    const sql = `
    select gft.t_id, siguiente, predecesora, condicion_transicion, gt.nombre
        from gestion.gp_flujo_tipoactividad gft
        inner join gestion.gp_tipoactividad gt 
        on gt.t_id = gft.siguiente 
    where gft.predecesora = $1;`;

    try {
        const res = await pool.query(sql, [id_predecesora]);

        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiGetUsuarioResponsableByTipoActividad(tipoActividadId) {
    const sql = `
    select distinct gu.t_id, 
    CONCAT( primer_nombre, ' ' || segundo_nombre, ' ' || primer_apellido, ' ' || segundo_apellido) as nombre_completo,
        gt2.nombre as rol
    from gestion.gp_tipoactividad gt
    inner join gestion.gp_tipoactividad_rol gtr 
        on gt.t_id = gtr.tipo_actividad
    inner join gestion.gp_tiporol gt2 
        on gt2.t_id = gtr.rol 
    inner join gestion.gp_usuario_rol gur
        on gtr.rol = gur.rol 
    inner join gestion.gp_usuario gu
        on gur.usuario = gu.t_id 
    where
    gt.t_id = $1
    `
    try {
        const res = await pool.query(sql, [tipoActividadId]);

        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function apiCrearTransicion(data) {
    let result = false;
    const client = await pool.connect();

    const sql1 = `insert into gestion.gp_actividad (t_basket, fecha_inicio, tipo_actividad, transaccion, usuario)
        select ga.t_basket, NOW(), $2, ga.transaccion, $3  from gestion.gp_actividad ga where ga.t_id = $1;`;

    const sql2 = `update gestion.gp_actividad
    set fecha_finalizacion=NOW()
    where t_id=$1;    
    `;

    const data1 = [
        data.actividad_actual,
        data.tipo_siguiente_actividad,
        data.usuario_responsable_siguiente_actividad
    ];
    const data2 = [data.actividad_actual];

    try {

        await client.query('BEGIN');


        await client.query(sql1, data1);
        await client.query(sql2, data2);

        await client.query('COMMIT'); 

        result =true;
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error(err);

        result = false;
    } finally {
        client.release();
        return result;
    }
}

async function apiSearchTerrenos() {
    const sql = `
        SELECT
            gc_predio.t_ili_tid as predio_id,
            gc_terreno.t_id as terreno_t_id,
            ST_AsGeoJSON(ST_Transform(geometria, 4326)) as geometry 
        FROM
            gestion.gc_terreno
        JOIN gestion.gc_predio ON predio = gc_predio.t_id
    `;

    try {
        const res = await pool.query(sql, []);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}


async function apiGetTerrenoAttributes(data) {
    const sql = `
        SELECT
            gc_predio.t_ili_tid,
            numero_predial_nacional,
            codigo_orip || '-' || CAST(matricula_inmobiliaria AS TEXT) AS matricula,
            nombre_predio
        FROM
            gestion.gc_predio
            LEFT JOIN gestion.gc_direccionvalor ON gc_predio_direccion = gc_predio.t_id
        WHERE
            gc_predio.t_ili_tid = $1
    `;

    try {
        const res = await pool.query(sql, [data.t_ili_tid]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}



async function getTerrenoAsGeoJSON(id, showOnlyRequestedPolygon = true) {
    const sql = `
        WITH params AS (
            SELECT 
                $1::integer AS polygon_id,
                $2::boolean AS show_only_requested_polygon
        ), base_query AS (
            SELECT 
                'Feature' AS type,
                row_to_json((SELECT l FROM (SELECT left(right(numero_predial_nacional, 15), 6) AS predio) AS l)) AS properties,
                ST_AsGeoJSON(ST_Transform(l.geometria, 4326), 4, 0)::json AS geometry
            FROM 
                gestion.gc_terreno AS l
            LEFT JOIN 
                gestion.gc_predio ON gc_predio.t_id = l.predio
            CROSS JOIN 
                params
            WHERE 
                (params.show_only_requested_polygon = TRUE AND l.t_id = params.polygon_id)
                OR
                (params.show_only_requested_polygon = FALSE AND l.geometria && (
                    SELECT ST_Expand(ST_Envelope(gc_terreno.geometria), 1000) 
                    FROM gestion.gc_terreno 
                    WHERE t_id = params.polygon_id) 
                AND l.t_id != params.polygon_id)
        )
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', array_to_json(array_agg(
                json_build_object(
                    'type', type,
                    'properties', properties,
                    'geometry', geometry
                )
            ))
        ) AS geojson
        FROM base_query;
    `;

    try {
        const res = await pool.query(sql, [id, showOnlyRequestedPolygon]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getPuntosColindancia(id, criterioPuntoInicial = 1, criterioObservador = 4) {
    const sql = `
        WITH 
        parametros AS (
        SELECT
            $1::bigint  AS poligono_t_id,
            $2::integer 		AS criterio_punto_inicial, --tipo de criterio para seleccionar el punto inicial del gc_terreno, valores posibles: 1,2
            $3::integer		AS criterio_observador --1: Centroide, 2: Centro del extent, 3: punto en la superficie, 4: Punto mas cercano al centroide dentro del poligono
        ),
        t AS ( --Orienta los vertices del gc_terreno en sentido horario
            SELECT t_id, ST_ForceRHR(geometria) as geometria FROM gestion.gc_terreno AS t, parametros WHERE t.t_id = poligono_t_id
        ),
        --bordes de la extension del poligono
        a AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        b AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        c AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        d AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        --Punto medio (ubicación del observador para la definicion de las cardinalidades)
        m AS (
        SELECT
            CASE WHEN criterio_observador = 1 THEN --centroide del poligono
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(t.geometria)), st_y(ST_centroid(t.geometria))), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 2 THEN --Centro del extent
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 3 THEN --Punto en la superficie
            ( SELECT ST_SetSRID(ST_PointOnSurface(geometria), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 4 THEN --Punto mas cercano al centroide pero que se intersecte el poligono si esta fuera
            ( SELECT ST_SetSRID(ST_MakePoint(st_x( ST_ClosestPoint( geometria, ST_centroid(t.geometria))), st_y( ST_ClosestPoint( geometria,ST_centroid(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            ELSE --defecto: Centro del extent
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            END as p
            FROM parametros
        ),
        --Cuadrantes del polígono desde el observador a cada una de las esquinas de la extensión del polígono
        norte AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, b.p, m.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,b,m
        ),
        este AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, b.p, c.p, m.p])), ST_SRID(t.geometria)) geom FROM t,b,c,m
        ),
        sur AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, c.p, d.p, m.p])), ST_SRID(t.geometria)) geom FROM t,m,c,d
        ),
        oeste AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, m.p, d.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,m,d
        )
        ,limite_poligono as(
            SELECT t_id, ST_Boundary(geometria) geom FROM t
        )
        ,limite_vecinos as (  --obtiene el limite de los gc_terrenos colindantes, filtrados por bounding box
            select o.t_id, ST_Boundary(o.geometria) geom from t, gestion.gc_terreno o where o.geometria && st_envelope(t.geometria) and t.t_id <> o.t_id
        )
        ,pre_colindancias as ( --inteseccion entre el limite del poligono y los gc_terrenos cercanos, añade la geometria de los limites sin adjacencia
            SELECT limite_vecinos.t_id, st_intersection(limite_poligono.geom,limite_vecinos.geom) geom  FROM limite_poligono,limite_vecinos where st_intersects(limite_poligono.geom,limite_vecinos.geom) and limite_poligono.t_id <> limite_vecinos.t_id
            union 
            SELECT null as t_id, ST_Difference(limite_poligono.geom, a.geom) geom
            FROM limite_poligono,
            (
                select ST_LineMerge(ST_Union(geom)) geom from limite_vecinos
            ) a 
        )
        , tmp_colindantes as (
            select  t_id,ST_LineMerge(ST_Union(geom)) geom from 
            (
                SELECT
                simple.t_id,
                simple.simple_geom as geom,
                ST_GeometryType(simple.simple_geom) as geom_type,
                ST_AsEWKT(simple.simple_geom) as geom_wkt
                FROM (
                SELECT
                    dumped.*,
                    (dumped.geom_dump).geom as simple_geom,
                    (dumped.geom_dump).path as path
                FROM (
                    SELECT *, ST_Dump(geom) AS geom_dump FROM pre_colindancias
                ) as dumped
                ) AS simple
        
            ) a
            group by t_id
        )
        , lineas_colindancia as ( --contiene las lineas de cambio de colindancia todas las lineas son parte simple
            SELECT * FROM
            (
                SELECT
                simple.t_id,
                simple.simple_geom as geom
                FROM (
                SELECT
                    dumped.*,
                    (dumped.geom_dump).geom as simple_geom,
                    (dumped.geom_dump).path as path
                FROM (
                    SELECT *, ST_Dump(geom) AS geom_dump FROM (select * from tmp_colindantes where ST_GeometryType(geom) = 'ST_MultiLineString') a
                ) as dumped
                ) AS simple			
            ) a 
            UNION 
            select * from tmp_colindantes where ST_GeometryType(geom) <> 'ST_MultiLineString'
        )
        , puntos_gc_terreno as (
            SELECT (ST_DumpPoints(geometria)).* AS dp
            FROM t
        )
        --Criterio 1: el punto inicial del gc_terreno es el primer punto del lindero que intersecte con el punto ubicado mas cerca de la esquina nw del polígono
        , punto_nw as (
            SELECT 	geom
                ,st_distance(geom, nw) AS dist
            FROM 	puntos_gc_terreno,
                (SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
            ORDER BY dist limit 1
        )
        , punto_inicial_por_lindero_con_punto_nw as (
            select st_startpoint(lineas_colindancia.geom) geom from lineas_colindancia, punto_nw where st_intersects(lineas_colindancia.geom, punto_nw.geom ) and not st_intersects(st_endpoint(lineas_colindancia.geom), punto_nw.geom )  limit 1
        )
        
        --Criterio 2: el punto inicial del gc_terreno es el primer punto del lindero que tenga mayor porcentaje de su longitud sobre el cuadrante norte del poligono
        , punto_inicial_por_lindero_porcentaje_n as(
            select 	round((st_length(st_intersection(lineas_colindancia.geom, norte.geom))/st_length(lineas_colindancia.geom))::numeric,2) dist, 
                st_startpoint(lineas_colindancia.geom) geom 
                ,st_distance(lineas_colindancia.geom,nw) distance_to_nw
                from lineas_colindancia
                    ,norte
                    ,(SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
                where st_intersects(lineas_colindancia.geom, norte.geom)  order by dist desc, distance_to_nw
                limit 1
        )
        --Criterio para definir el punto inicial del gc_terreno
        ,punto_inicial as (
            SELECT 
                CASE WHEN criterio_punto_inicial = 1 THEN (select geom from punto_inicial_por_lindero_con_punto_nw)
                WHEN criterio_punto_inicial = 2 THEN (select geom from punto_inicial_por_lindero_porcentaje_n)
            END as geom
            FROM parametros
        )
        , puntos_ordenados as (
            SELECT case when id-m+1 <= 0 then total + id-m else id-m+1 end as id, geom , st_x(geom) x, st_y(geom) y FROM
                (
                SELECT row_number() OVER (ORDER BY path) AS id
                    ,m
                    ,path
                    ,geom
                    ,total
                FROM (
                    SELECT (ST_DumpPoints(ST_ForceRHR(geometria))).* AS dp
                        ,ST_NPoints(geometria) total
                        ,geometria
                    FROM t
                    ) AS a
                    ,(
                        SELECT row_number() OVER (ORDER BY path) AS m
                            ,st_distance(puntos_gc_terreno.geom, punto_inicial.geom) AS dist
                        FROM puntos_gc_terreno,punto_inicial
                        ORDER BY dist limit 1
                    ) b
                ) t
                where id <> total
            order by id
        )
        , lineas_colindancia_desde_hasta as (
            select *
                ,(SELECT id from puntos_ordenados WHERE st_intersects(puntos_ordenados.geom, st_startpoint(lineas_colindancia.geom))) desde
                ,(SELECT id from puntos_ordenados WHERE st_intersects(puntos_ordenados.geom, st_endpoint(lineas_colindancia.geom))) hasta
            from lineas_colindancia
            order by desde
        )
        SELECT 
            jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb,
                    'properties', jsonb_build_object(
                        'id', id,
                        'x', x,
                        'y', y
                    )
                ))
            ) AS geojson
        FROM 
            (
                SELECT 
                    id, 
                    x, 
                    y, 
                    geom
                FROM 
                    puntos_ordenados
                WHERE 
                    id IN (
                        SELECT DISTINCT desde FROM lineas_colindancia_desde_hasta
                        UNION
                        SELECT DISTINCT hasta FROM lineas_colindancia_desde_hasta
                    )
                ORDER BY 
                    id
            ) subquery
    `;

    try {
        const res = await pool.query(sql, [id, criterioPuntoInicial, criterioObservador]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows[0];
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getCoordinateTable(id, criterioPuntoInicial = 1, criterioObservador = 4) {
    const sql = `
        WITH 
        parametros AS (
        SELECT
            $1::bigint  AS poligono_t_id,
            $2::integer 	AS criterio_punto_inicial, --tipo de criterio para seleccionar el punto inicial del gc_terreno, valores posibles: 1,2
            $3::integer		AS criterio_observador --1: Centroide, 2: Centro del extent, 3: punto en la superficie, 4: Punto mas cercano al centroide dentro del poligono
        ),
        t AS ( --Orienta los vertices del gc_terreno en sentido horario
            SELECT t_id, ST_ForceRHR(geometria) as geometria FROM gestion.gc_terreno AS t, parametros WHERE t.t_id = poligono_t_id
        ),
        --bordes de la extension del poligono
        a AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        b AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        c AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        d AS (
            SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
        ),
        --Punto medio (ubicación del observador para la definicion de las cardinalidades)
        m AS (
        SELECT
            CASE WHEN criterio_observador = 1 THEN --centroide del poligono
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(t.geometria)), st_y(ST_centroid(t.geometria))), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 2 THEN --Centro del extent
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 3 THEN --Punto en la superficie
            ( SELECT ST_SetSRID(ST_PointOnSurface(geometria), ST_SRID(t.geometria)) AS p FROM t )
            WHEN criterio_observador = 4 THEN --Punto mas cercano al centroide pero que se intersecte el poligono si esta fuera
            ( SELECT ST_SetSRID(ST_MakePoint(st_x( ST_ClosestPoint( geometria, ST_centroid(t.geometria))), st_y( ST_ClosestPoint( geometria,ST_centroid(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            ELSE --defecto: Centro del extent
            ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
            END as p
            FROM parametros
        ),
        --Cuadrantes del polígono desde el observador a cada una de las esquinas de la extensión del polígono
        norte AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, b.p, m.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,b,m
        ),
        este AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, b.p, c.p, m.p])), ST_SRID(t.geometria)) geom FROM t,b,c,m
        ),
        sur AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, c.p, d.p, m.p])), ST_SRID(t.geometria)) geom FROM t,m,c,d
        ),
        oeste AS (
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, m.p, d.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,m,d
        )
        ,limite_poligono as(
            SELECT t_id, ST_Boundary(geometria) geom FROM t
        )
        ,limite_vecinos as (  --obtiene el limite de los gc_terrenos colindantes, filtrados por bounding box
            select o.t_id, ST_Boundary(o.geometria) geom from t, gestion.gc_terreno o where o.geometria && st_envelope(t.geometria) and t.t_id <> o.t_id
        )
        ,pre_colindancias as ( --inteseccion entre el limite del poligono y los gc_terrenos cercanos, añade la geometria de los limites sin adjacencia
            SELECT limite_vecinos.t_id, st_intersection(limite_poligono.geom,limite_vecinos.geom) geom  FROM limite_poligono,limite_vecinos where st_intersects(limite_poligono.geom,limite_vecinos.geom) and limite_poligono.t_id <> limite_vecinos.t_id
            union 
            SELECT null as t_id, ST_Difference(limite_poligono.geom, a.geom) geom
            FROM limite_poligono,
            (
                select ST_LineMerge(ST_Union(geom)) geom from limite_vecinos
            ) a 
        )
        , tmp_colindantes as (
            select  t_id,ST_LineMerge(ST_Union(geom)) geom from 
            (
                SELECT
                simple.t_id,
                simple.simple_geom as geom,
                ST_GeometryType(simple.simple_geom) as geom_type,
                ST_AsEWKT(simple.simple_geom) as geom_wkt
                FROM (
                SELECT
                    dumped.*,
                    (dumped.geom_dump).geom as simple_geom,
                    (dumped.geom_dump).path as path
                FROM (
                    SELECT *, ST_Dump(geom) AS geom_dump FROM pre_colindancias
                ) as dumped
                ) AS simple
        
            ) a
            group by t_id
        )
        , lineas_colindancia as ( --contiene las lineas de cambio de colindancia todas las lineas son parte simple
            SELECT * FROM
            (
                SELECT
                simple.t_id,
                simple.simple_geom as geom
                FROM (
                SELECT
                    dumped.*,
                    (dumped.geom_dump).geom as simple_geom,
                    (dumped.geom_dump).path as path
                FROM (
                    SELECT *, ST_Dump(geom) AS geom_dump FROM (select * from tmp_colindantes where ST_GeometryType(geom) = 'ST_MultiLineString') a
                ) as dumped
                ) AS simple			
            ) a 
            UNION 
            select * from tmp_colindantes where ST_GeometryType(geom) <> 'ST_MultiLineString'
        )
        , puntos_gc_terreno as (
            SELECT (ST_DumpPoints(geometria)).* AS dp
            FROM t
        )
        --Criterio 1: el punto inicial del gc_terreno es el primer punto del lindero que intersecte con el punto ubicado mas cerca de la esquina nw del polígono
        , punto_nw as (
            SELECT 	geom
                ,st_distance(geom, nw) AS dist
            FROM 	puntos_gc_terreno,
                (SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
            ORDER BY dist limit 1
        )
        , punto_inicial_por_lindero_con_punto_nw as (
            select st_startpoint(lineas_colindancia.geom) geom from lineas_colindancia, punto_nw where st_intersects(lineas_colindancia.geom, punto_nw.geom ) and not st_intersects(st_endpoint(lineas_colindancia.geom), punto_nw.geom )  limit 1
        )
        
        --Criterio 2: el punto inicial del gc_terreno es el primer punto del lindero que tenga mayor porcentaje de su longitud sobre el cuadrante norte del poligono
        , punto_inicial_por_lindero_porcentaje_n as(
            select 	round((st_length(st_intersection(lineas_colindancia.geom, norte.geom))/st_length(lineas_colindancia.geom))::numeric,2) dist, 
                st_startpoint(lineas_colindancia.geom) geom 
                ,st_distance(lineas_colindancia.geom,nw) distance_to_nw
                from lineas_colindancia
                    ,norte
                    ,(SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
                where st_intersects(lineas_colindancia.geom, norte.geom)  order by dist desc, distance_to_nw
                limit 1
        )
        --Criterio para definir el punto inicial del gc_terreno
        ,punto_inicial as (
            SELECT 
                CASE WHEN criterio_punto_inicial = 1 THEN (select geom from punto_inicial_por_lindero_con_punto_nw)
                WHEN criterio_punto_inicial = 2 THEN (select geom from punto_inicial_por_lindero_porcentaje_n)
            END as geom
            FROM parametros
        )
        , puntos_ordenados as (
            SELECT case when id-m+1 <= 0 then total + id-m else id-m+1 end as id, geom , st_x(geom) x, st_y(geom) y FROM
                (
                SELECT row_number() OVER (ORDER BY path) AS id
                    ,m
                    ,path
                    ,geom
                    ,total
                FROM (
                    SELECT (ST_DumpPoints(ST_ForceRHR(geometria))).* AS dp
                        ,ST_NPoints(geometria) total
                        ,geometria
                    FROM t
                    ) AS a
                    ,(
                        SELECT row_number() OVER (ORDER BY path) AS m
                            ,st_distance(puntos_gc_terreno.geom, punto_inicial.geom) AS dist
                        FROM puntos_gc_terreno,punto_inicial
                        ORDER BY dist limit 1
                    ) b
                ) t
                where id <> total
            order by id
        )
        SELECT 
            id,
            x,
            y
        FROM 
            puntos_ordenados
        ORDER BY 
            id;
    `;

    try {
        const res = await pool.query(sql, [id, criterioPuntoInicial, criterioObservador]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getLinderos(id, criterioPuntoInicial = 1, criterioObservador = 4) {
    const sql = `
            WITH 
            parametros AS (
            SELECT
                $1::bigint  AS poligono_t_id,
                $2::integer		AS criterio_punto_inicial, --tipo de criterio para seleccionar el punto inicial del gc_terreno, valores posibles: 1,2
                $3::integer		AS criterio_observador, --1: Centroide, 2: Centro del extent, 3: punto en la superficie, 4: Punto mas cercano al centroide dentro del poligono
                false	AS incluir_tipo_derecho, --Mostrar el tipo de derecho de cada interesado (booleano)
                15		as tolerancia_sentidos --tolerancia en grados para la definicion del sentido de una linea
            ),
            t AS ( --Orienta los vertices del gc_terreno en sentido horario
                SELECT t_id, ST_ForceRHR(geometria) as geometria FROM gestion.gc_terreno AS t, parametros WHERE t.t_id = poligono_t_id
            ),
            --bordes de la extension del poligono
            a AS (
                SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
            ),
            b AS (
                SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymax(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
            ),
            c AS (
                SELECT ST_SetSRID(ST_MakePoint(st_xmax(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
            ),
            d AS (
                SELECT ST_SetSRID(ST_MakePoint(st_xmin(t.geometria), st_ymin(t.geometria)), ST_SRID(t.geometria)) AS p FROM t
            ),
            --Punto medio (ubicación del observador para la definicion de las cardinalidades)
            m AS (
            SELECT
                CASE WHEN criterio_observador = 1 THEN --centroide del poligono
                ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(t.geometria)), st_y(ST_centroid(t.geometria))), ST_SRID(t.geometria)) AS p FROM t )
                WHEN criterio_observador = 2 THEN --Centro del extent
                ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
                WHEN criterio_observador = 3 THEN --Punto en la superficie
                ( SELECT ST_SetSRID(ST_PointOnSurface(geometria), ST_SRID(t.geometria)) AS p FROM t )
                WHEN criterio_observador = 4 THEN --Punto mas cercano al centroide pero que se intersecte el poligono si esta fuera
                ( SELECT ST_SetSRID(ST_MakePoint(st_x( ST_ClosestPoint( geometria, ST_centroid(t.geometria))), st_y( ST_ClosestPoint( geometria,ST_centroid(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
                ELSE --defecto: Centro del extent
                ( SELECT ST_SetSRID(ST_MakePoint(st_x(ST_centroid(st_envelope(t.geometria))), st_y(ST_centroid(st_envelope(t.geometria)))), ST_SRID(t.geometria)) AS p FROM t )
                END as p
                FROM parametros
            ),
            --Cuadrantes del polígono desde el observador a cada una de las esquinas de la extensión del polígono
            norte AS (
                SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, b.p, m.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,b,m
            ),
            este AS (
                SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, b.p, c.p, m.p])), ST_SRID(t.geometria)) geom FROM t,b,c,m
            ),
            sur AS (
                SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [m.p, c.p, d.p, m.p])), ST_SRID(t.geometria)) geom FROM t,m,c,d
            ),
            oeste AS (
                SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY [a.p, m.p, d.p, a.p])), ST_SRID(t.geometria)) geom FROM t,a,m,d
            )
            ,limite_poligono as(
                SELECT t_id, ST_Boundary(geometria) geom FROM t
            )
            ,limite_vecinos as (  --obtiene el limite de los gc_terrenos colindantes, filtrados por bounding box
                select o.t_id, ST_Boundary(o.geometria) geom from t, gestion.gc_terreno o where o.geometria && st_envelope(t.geometria) and t.t_id <> o.t_id
            )
            ,pre_colindancias as ( --inteseccion entre el limite del poligono y los gc_terrenos cercanos, añade la geometria de los limites sin adjacencia
                SELECT limite_vecinos.t_id, st_intersection(limite_poligono.geom,limite_vecinos.geom) geom  FROM limite_poligono,limite_vecinos where st_intersects(limite_poligono.geom,limite_vecinos.geom) and limite_poligono.t_id <> limite_vecinos.t_id
                union 
                SELECT null as t_id, ST_Difference(limite_poligono.geom, a.geom) geom
                FROM limite_poligono,
                (
                    select ST_LineMerge(ST_Union(geom)) geom from limite_vecinos
                ) a 
            )
            , tmp_colindantes as (
                select  t_id,ST_LineMerge(ST_Union(geom)) geom from 
                (
                    SELECT
                    simple.t_id,
                    simple.simple_geom as geom,
                    ST_GeometryType(simple.simple_geom) as geom_type,
                    ST_AsEWKT(simple.simple_geom) as geom_wkt
                    FROM (
                    SELECT
                        dumped.*,
                        (dumped.geom_dump).geom as simple_geom,
                        (dumped.geom_dump).path as path
                    FROM (
                        SELECT *, ST_Dump(geom) AS geom_dump FROM pre_colindancias
                    ) as dumped
                    ) AS simple
            
                ) a
                group by t_id
            )
            , lineas_colindancia as ( --contiene las lineas de cambio de colindancia todas las lineas son parte simple
                SELECT * FROM
                (
                    SELECT
                    simple.t_id,
                    simple.simple_geom as geom
                    FROM (
                    SELECT
                        dumped.*,
                        (dumped.geom_dump).geom as simple_geom,
                        (dumped.geom_dump).path as path
                    FROM (
                        SELECT *, ST_Dump(geom) AS geom_dump FROM (select * from tmp_colindantes where ST_GeometryType(geom) = 'ST_MultiLineString') a
                    ) as dumped
                    ) AS simple			
                ) a 
                UNION 
                select * from tmp_colindantes where ST_GeometryType(geom) <> 'ST_MultiLineString'
            )
            , puntos_gc_terreno as (
                SELECT (ST_DumpPoints(geometria)).* AS dp
                FROM t
            )
            --Criterio 1: el punto inicial del gc_terreno es el primer punto del lindero que intersecte con el punto ubicado mas cerca de la esquina nw del polígono
            , punto_nw as (
                SELECT 	geom
                    ,st_distance(geom, nw) AS dist
                FROM 	puntos_gc_terreno,
                    (SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
                ORDER BY dist limit 1
            )
            , punto_inicial_por_lindero_con_punto_nw as (
                select st_startpoint(lineas_colindancia.geom) geom from lineas_colindancia, punto_nw where st_intersects(lineas_colindancia.geom, punto_nw.geom ) and not st_intersects(st_endpoint(lineas_colindancia.geom), punto_nw.geom )  limit 1
            )
            
            --Criterio 2: el punto inicial del gc_terreno es el primer punto del lindero que tenga mayor porcentaje de su longitud sobre el cuadrante norte del poligono
            , punto_inicial_por_lindero_porcentaje_n as(
                select 	round((st_length(st_intersection(lineas_colindancia.geom, norte.geom))/st_length(lineas_colindancia.geom))::numeric,2) dist, 
                    st_startpoint(lineas_colindancia.geom) geom 
                    ,st_distance(lineas_colindancia.geom,nw) distance_to_nw
                    from lineas_colindancia
                        ,norte
                        ,(SELECT ST_SetSRID(ST_MakePoint(st_xmin(st_envelope(geometria)), st_ymax(st_envelope(geometria))), ST_SRID(geometria)) as nw FROM t ) a
                    where st_intersects(lineas_colindancia.geom, norte.geom)  order by dist desc, distance_to_nw
                    limit 1
            )
            --Criterio para definir el punto inicial del gc_terreno
            ,punto_inicial as (
                SELECT 
                    CASE WHEN criterio_punto_inicial = 1 THEN (select geom from punto_inicial_por_lindero_con_punto_nw)
                    WHEN criterio_punto_inicial = 2 THEN (select geom from punto_inicial_por_lindero_porcentaje_n)
                END as geom
                FROM parametros
            )
            , puntos_ordenados as (
                SELECT case when id-m+1 <= 0 then total + id-m else id-m+1 end as id, geom , st_x(geom) x, st_y(geom) y FROM
                    (
                    SELECT row_number() OVER (ORDER BY path) AS id
                        ,m
                        ,path
                        ,geom
                        ,total
                    FROM (
                        SELECT (ST_DumpPoints(ST_ForceRHR(geometria))).* AS dp
                            ,ST_NPoints(geometria) total
                            ,geometria
                        FROM t
                        ) AS a
                        ,(
                            SELECT row_number() OVER (ORDER BY path) AS m
                                ,st_distance(puntos_gc_terreno.geom, punto_inicial.geom) AS dist
                            FROM puntos_gc_terreno,punto_inicial
                            ORDER BY dist limit 1
                        ) b
                    ) t
                    where id <> total
                order by id
            )
            , cuadrantes as (
                SELECT 'Norte' ubicacion,norte.geom as cuadrante FROM norte 
                UNION
                SELECT 'Este' ubicacion,este.geom as cuadrante FROM este 
                UNION
                SELECT 'Sur' ubicacion,sur.geom as cuadrante FROM sur 
                UNION
                SELECT 'Oeste' ubicacion,oeste.geom as cuadrante FROM oeste
            )
            , lineas_colindancia_desde_hasta as (
                select *
                    ,(SELECT id from puntos_ordenados WHERE st_intersects(puntos_ordenados.geom, st_startpoint(lineas_colindancia.geom))) desde
                    ,(SELECT id from puntos_ordenados WHERE st_intersects(puntos_ordenados.geom, st_endpoint(lineas_colindancia.geom))) hasta
                from lineas_colindancia
                order by desde
            )
            
            , colindantes as (
                SELECT row_number() OVER (ORDER BY desde) AS id, t_id,desde,hasta,ubicacion,geom FROM
                (
                    select * 
                        ,st_length(st_intersection(geom,cuadrante))/st_length(geom) as porcentaje 
                        ,max(st_length(st_intersection(geom,cuadrante))/st_length(geom)) over (partition by geom) as max_porce
                    from lineas_colindancia_desde_hasta, cuadrantes where st_intersects(geom,cuadrante)
                ) a
                where porcentaje = max_porce
            ) ,
            
            
            base_data AS (
                SELECT 
                    id,
                    desde,
                    hasta,
                    ubicacion,
                    nupre,
                    round(st_x(st_startpoint(colindantes.geom))::numeric,2) xi,
                    round(st_y(st_startpoint(colindantes.geom))::numeric,2) yi,
                    round(st_x(st_endpoint(colindantes.geom))::numeric,2) xf,
                    round(st_y(st_endpoint(colindantes.geom))::numeric,2) yf,
                    CASE WHEN numero_predial_nacional IS NULL THEN 'ÁREA INDETERMINADA'
                        ELSE COALESCE('Predio catastral número: ' || numero_predial_nacional || ' ', '') 
                    END as gc_predio,
                    COALESCE(interesado, 'INDETERMINADO') AS interesado,
                    round(st_length(colindantes.geom)::numeric,2) distancia,
                    (SELECT array_to_string(array_agg(puntos_ordenados.id || ': N=' || round(st_y(puntos_ordenados.geom)::numeric,2) || ', E=' || round(st_x(puntos_ordenados.geom)::numeric,2)), '; ') 
                    FROM puntos_ordenados 
                    WHERE st_intersects(colindantes.geom, puntos_ordenados.geom) AND puntos_ordenados.id NOT IN (desde, hasta)) as nodos,
                    degrees(ST_Azimuth(st_startpoint(geom), ST_PointN(geom,2))) AS azimuth,
                    (SELECT count(*) FROM colindantes) as total_linderos
                FROM colindantes 
                LEFT JOIN gestion.gc_terreno ON gc_terreno.t_id = colindantes.t_id
                LEFT JOIN gestion.gc_predio ON gc_predio.t_id = predio
                LEFT JOIN (
                    SELECT t_id,
                        array_to_string(array_agg(
                            coalesce(primer_nombre,'') || coalesce(' ' || segundo_nombre, '') || coalesce(' ' || primer_apellido, '') || coalesce(' ' || segundo_apellido, '') || 
                            coalesce(razon_social, '') || ', ' || 
                            (SELECT dispname FROM gestion.gc_interesadodocumentotipo WHERE gc_interesadodocumentotipo.t_id = tipo_documento) || ': ' || 
                            documento_identidad || 
                            CASE WHEN (SELECT incluir_tipo_derecho FROM parametros) THEN 
                                    ' (' || (SELECT dispname FROM gestion.gc_derechotipo WHERE gc_derechotipo.t_id = tipo_derecho) || ')' 
                            ELSE '' END
                        ), '; ') as interesado
                    FROM (
                        SELECT * FROM gestion.gc_predio
                        LEFT JOIN (
                            SELECT 
                                primer_nombre,
                                segundo_nombre,
                                primer_apellido,
                                segundo_apellido,
                                razon_social,
                                tipo_documento,
                                documento_identidad,
                                predio,
                                gc_derecho.tipo AS tipo_derecho
                            FROM gestion.gc_derecho
                            JOIN gestion.gc_interesado ON gc_interesado.t_id = interesado
                        ) interesado ON gc_predio.t_id = interesado.predio
                    ) interesados
                    GROUP BY t_id
                ) interesados ON interesados.t_id = gc_predio.t_id
            ), grouped_data AS (
                SELECT 
                    desde, 
                    hasta, 
                    ubicacion, 
                    xi, 
                    yi, 
                    xf, 
                    yf, 
                    distancia, 
                    nodos,
                    array_agg(DISTINCT gc_predio) AS gc_predios,
                    array_agg(DISTINCT interesado) AS interesados,
                    azimuth,
                    total_linderos
                FROM base_data
                GROUP BY desde, hasta, ubicacion, xi, yi, xf, yf, distancia, nodos, azimuth, total_linderos
            )
            SELECT 
                desde,
                hasta,
                ubicacion,
                xi,
                yi,
                xf,
                yf,
                distancia,
                nodos,
                CASE 
                    WHEN cardinality(gc_predios) > 1 THEN string_agg('Predio ' || i || ': ' || gc_predios[i], '; ')
                    ELSE gc_predios[1]
                END AS gc_predio,
                CASE 
                    WHEN cardinality(interesados) > 1 THEN string_agg('Predio ' || i || ': ' || interesados[i], '; ')
                    ELSE interesados[1]
                END AS interesado,
                azimuth,
                CASE 
                    WHEN azimuth BETWEEN 360 - (SELECT tolerancia_sentidos FROM parametros) AND 360 OR azimuth BETWEEN 0 AND (SELECT tolerancia_sentidos FROM parametros) THEN 'norte'
                    WHEN azimuth BETWEEN (SELECT tolerancia_sentidos FROM parametros) AND 90 - (SELECT tolerancia_sentidos FROM parametros) THEN 'noreste'
                    WHEN azimuth BETWEEN 90 - (SELECT tolerancia_sentidos FROM parametros) AND 90 + (SELECT tolerancia_sentidos FROM parametros) THEN 'este'
                    WHEN azimuth BETWEEN 90 + (SELECT tolerancia_sentidos FROM parametros) AND 180 - (SELECT tolerancia_sentidos FROM parametros) THEN 'sureste'
                    WHEN azimuth BETWEEN 180 - (SELECT tolerancia_sentidos FROM parametros) AND 180 + (SELECT tolerancia_sentidos FROM parametros) THEN 'sur'
                    WHEN azimuth BETWEEN 180 + (SELECT tolerancia_sentidos FROM parametros) AND 270 - (SELECT tolerancia_sentidos FROM parametros) THEN 'suroeste'
                    WHEN azimuth BETWEEN 270 - (SELECT tolerancia_sentidos FROM parametros) AND 270 + (SELECT tolerancia_sentidos FROM parametros) THEN 'oeste'
                    WHEN azimuth BETWEEN 270 + (SELECT tolerancia_sentidos FROM parametros) AND 360 - (SELECT tolerancia_sentidos FROM parametros) THEN 'noroeste'
                END AS sentido,
                total_linderos
            FROM grouped_data,
            LATERAL generate_series(1, cardinality(gc_predios)) AS i
            GROUP BY desde, hasta, ubicacion, xi, yi, xf, yf, distancia, nodos, azimuth, total_linderos, gc_predios, interesados
            ORDER BY desde, hasta;
    
    `;

    try {
        const res = await pool.query(sql, [id, criterioPuntoInicial, criterioObservador]);
        if (res.rows.length === 0) {
            return null;
        } else {
            return res.rows;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}


module.exports = {
    pool,
    on,
    connect,

    validateUser,
    getUserById,

    apiSearchParcel,
    apiSearchParty,
    apiSearchTransactionType,
    apiSearchRequesterType,
    apiSearchPartyDocumentType,
    apiSearchPartyType,

    apiGetBasketByProccessId,
    apiSearchProcess,
    apiSearchProcessById,
    apiInsertRequest,
    apiFinishProcessById,
    apiGetTipoActividad,
    apiGetFlujoTipoActividad,
    apiGetTipoTransaccion,
    apiGetFlujoTipoActividadByPredecesora,
    apiGetActividades,
    apiCrearTransicion,
    apiGetUsuarioResponsableByTipoActividad,
    apiGetActividadesByTransaccion,
    apiGetTransacciones,

    apiSearchTerrenos,
    apiGetTerrenoAttributes,


    getTerrenoAsGeoJSON,
    getPuntosColindancia,
    getCoordinateTable,
    getLinderos,
};
