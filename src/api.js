const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const geobuf = require('geobuf');
const Pbf = require('pbf');

const pg_db = require("./db_pg");


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', function (req, res) {
    res.send('API Home');
});

router.get('/getToken', function (req, res) {
    res.send('hola');
});

router.post('/getToken', async function (req, res) {
    // Aquí va tu código de autenticación
    // Si la autenticación es exitosa, envía un JWT al cliente
    //console.log(req);
    try {

        let data = req.body;
        //let expiration_timestamp = await pg_db.getConversationExpirationTimestamp(data.id);
        var now = new Date();
        now.setHours(now.getHours() + 1)
        let expiration_timestamp = now;

        const user_id = await pg_db.validateUser(data.user, data.password)

        if (expiration_timestamp && expiration_timestamp > new Date() && user_id) {

            const token = jwt.sign(user_id, process.env.JWT_KEY, { expiresIn: (new Date(expiration_timestamp)).getTime() });

            res.status(200).send({ token: token });
        } else {
            res.status(401).send({ error: 'Invalid authentication credentials' });
        }
    } catch (error) {
        handleError(res, 401, 'Failed to authenticate token.');
    }
});



// Función para verificar el token y manejar los errores de autenticación
async function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

// Función para manejar errores en las rutas
function handleError(res, statusCode, errorMessage) {
    res.status(statusCode).send({ error: errorMessage });
}

// Middleware para verificar el token
async function authenticateToken(req, res, next) {
    try {
        const token = req.headers['authorization'] || req.body.token || req.query.token;

        if (!token) {
            return handleError(res, 401, 'No token provided.');
        }

        req.token = token;

        if (token.startsWith('Bearer ')) {
            req.token = token.slice(7);  // Removemos 'Bearer ' para quedarnos solo con el token
        }

        req.decoded = await verifyToken(req.token);
        next();
    } catch (error) {
        handleError(res, 401, 'Failed to authenticate token.');
    }
}


// endpoint genérico
router.post('/runQuery', authenticateToken, async (req, res) => {
    try {
        let { queryName, params } = req.body;

        // Verificamos que la función especificada existe
        if (typeof pg_db[queryName] !== 'function') {
            res.status(400).send({ error: 'Consulta no reconocida' });
            //TODO: Penalizar clientes que envíen solicitudes no válidas a este endpoint para evitar accesos no autorizados
            return;
        }

        if (params.includeHeader && req.decoded?.id) {
            params.userId = req.decoded.id;
        }

        let results;
        if (params) {
            if (params.handleRaw) {
                results = await pg_db[queryName](...Object.values(params));
            } else {
                results = await pg_db[queryName](params);
            }
        } else {
            results = await pg_db[queryName]();
        }
        res.status(200).send({ results });
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        handleError(res, 500, 'Server Error');
    }
});


// endpoint genérico
router.post('/getMapKey', authenticateToken, async (req, res) => {
    try {
        res.status(200).send({ mapAPIKey: process.env.MAPTILER_KEY || '' });
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        handleError(res, 500, 'Server Error');
    }
});

router.post('/downloadXTF', authenticateToken, async (req, res) => {
    try {
        let { queryName, params } = req.body;

        if (params.includeHeader && req.decoded?.id) {
            params.userId = req.decoded.id;
        }

        const basketId = await pg_db.apiGetBasketByProccessId(params.id);

        if (basketId) {
            const url = process.env.ILI_SVC_APP_BASE_URL + 'get_file/' + basketId
            console.log(url);

            const response = await axios.get(url, {
                responseType: 'stream'
            });

            res.setHeader('Content-Disposition', `attachment; filename=${basketId}.xtf`);
            res.setHeader('Content-Type', 'application/octet-stream');

            response.data.pipe(res);
        } else {
            console.error('No se encontró el basket', params.id);
            handleError(res, 500, 'Server Error');
        }
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        handleError(res, 500, 'Server Error');
    }
});


router.post('/uploadXTF', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }
        console.log(file)
        const form = new FormData();
        const fileBuffer = Buffer.from(file.buffer);
        form.append('file', fileBuffer, {
            filename: file.originalname
        });

        const response = await axios.post(process.env.ILI_SVC_APP_BASE_URL + 'upload_file/', form, {
            headers: form.getHeaders()
        });

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error('Error uploading file:', error);
        handleError(res, 500, 'Server Error');
    }
});


router.post('/getTerrenos', authenticateToken, async (req, res) => {
    try {
        const { condition } = req.body; 

        const terrenos = await pg_db.apiSearchTerrenos();

        if (!terrenos) {
            return res.status(404).send({ error: 'No se encontraron terrenos' });
        }
        const flatgeobuf = await import('flatgeobuf'); // Importación dinámica

        const featureCollection = {
            type: "FeatureCollection",
            features: terrenos.map(terreno => {
                const geometry = JSON.parse(terreno.geometry);
                // Eliminar CRS si existe
                if (geometry.crs) {
                    delete geometry.crs;
                }
                delete terreno.geometry;

                return {
                    type: "Feature",
                    geometry: geometry,
                    properties: { ...terreno }
                };
            })
        };
        /*
        console.log(`FeatureCollection: ${JSON.stringify(featureCollection).length} bytes`); // Depuración
        console.log(`Number of features: ${featureCollection.features.length}`); // Depuración
        //console.log(`Sample feature: ${JSON.stringify(featureCollection.features[0])}`);

        //const buffer = await flatgeobuf.geojson.serialize(featureCollection);

        console.log(`Buffer length: ${buffer.byteLength}`);

        res.status(200).send(buffer);*/
        res.status(200).send(featureCollection);
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
});


// endpoint genérico
router.post('/sendCode', async (req, res) => {
    try {
        let { id } = req.body;

        let phone_number = id.replace(/[^0-9]/g, '');
        const results = await pg_db.generateAndStoreOTP(phone_number);
        if (results?.otp_code && results?.phone_number) {
            await whatsapp.sendTemplate(from_id, results.phone_number, 'otp', 'login', results.otp_code + '');
            res.status(200).send({ result: 'ok' });
        } else if (results?.next_request) {
            res.status(200).send({ next_request: results.next_request });
        } else {
            res.status(200).send({});
        }

    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        handleError(res, 500, 'Server Error');
    }
});

router.get('/tipotransaccion/:tipo_transaccion_id/tipoactividad', async (req, res) => {
    try {
        tipo_transaccion_id = req.params['tipo_transaccion_id'];
        const nodes = await pg_db.apiGetTipoActividad(tipo_transaccion_id);
        const edges = await pg_db.apiGetFlujoTipoActividad(tipo_transaccion_id);

        let result = { "tipoactividad": nodes, "flujo_tipoactividad": edges };

        res.status(200).send(result);
    } catch (error) {
        console.error('Error al obtener tipo actividad:', error);
        res.status(500).send({ error: 'Server Error' });
    }
});

router.get('/tipotransaccion', async (req, res) => {
    try {
        const result = await pg_db.apiGetTipoTransaccion();

        res.status(200).send(result);
    } catch (error) {
        console.error('Error al obtener tipo transaccion:', error);
        res.status(500).send({ error: 'Server Error' });
    }
});

router.get('/tipoactividad/:tipoactividad_id/usuario', async (req, res) => {
    try {
        tipoactividadId = req.params['tipoactividad_id'];

        const result = await pg_db.apiGetUsuarioResponsableByTipoActividad(tipoactividadId);

        res.status(200).send(result);
    } catch (error) {
        console.error('Error al obtener tipo transaccion:', error);
        res.status(500).send({ error: 'Server Error' });
    }
});

router.get('/flujo_tipoactividad/search', async(req,res) => {
    try{
        const predecesora = req.query.predecesora;

        const result = await pg_db.apiGetFlujoTipoActividadByPredecesora(predecesora);

        res.status(200).send(result);
    }catch (error) {
        console.error('Error al obtener tipo transaccion:', error);
        res.status(500).send({ error: 'Server Error' });
    }
});

router.get('/usuario/actividad', authenticateToken, async(req,res) => {
    try{
        const result = await pg_db.apiGetActividades(req.decoded.id);

        res.status(200).send(result);

    }catch (error) {
        console.error('Error al obtener actividades', error);
        res.status(500).send({error: 'Server Error'});
    }
});

router.get('/transaccion/:transaccion_id/actividad', async(req,res) => {
    try{
        transaccionId = req.params['transaccion_id']
        const result = await pg_db.apiGetActividadesByTransaccion(transaccionId);

        res.status(200).send(result);

    }catch (error) {
        console.error('Error al obtener actividades', error);
        res.status(500).send({error: 'Server Error'});
    }
});


router.get('/transaccion', async(req,res) => {
    try{
        const result = await pg_db.apiGetTransacciones();

        res.status(200).send(result);

    }catch (error) {
        console.error('Error al obtener Tramites', error);
        res.status(500).send({error: 'Server Error'});
    }
});



router.post('/transicion/', async(req,res) => {
    try {

        let data = req.body;

        const response = await pg_db.apiCrearTransicion(data);

        if(response) {
            res.status(201).send({});
        } else {
            res.status(401).send({ error: 'Error al crear transicion' });
        }
    } catch (error) {
        handleError(res, 401, 'Failed to authenticate token.');
    }
});


router.put('/actividad/:id', async(req,res) => {
    try {
        id = req.params['id'];

        let data = req.body;

        const response = await pg_db.apiUpdateActividad(id, data);

        if(response) {
            res.status(200).send();
        } else {
            res.status(401).send({ error: 'Error al actualizar actividad' });
        }
    } catch (error) {
        console.error(error);
        handleError(res, 401, 'Failed to authenticate token.');
    }
});

router.get('/reporteUsuarios', async (req, res) => {
    try {
        const rows = await pg_db.appReporteUsuarios();

        // Crear un nuevo workbook y una nueva hoja
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte Usuarios');

        // Añadir fila de encabezado basada en las claves de los objetos de la primera fila
        if (rows.length > 0) {
            worksheet.addRow(Object.keys(rows[0]));
        }

        // Añadir datos
        rows.forEach(row => {
            worksheet.addRow(Object.values(row));
        });

        // Escribir el archivo en un buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Configurar los headers de la respuesta
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ReporteUsuarios.xlsx');

        // Enviar el buffer como respuesta
        res.send(buffer);

    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).send({ error: 'Server Error' });
    }
});


module.exports = router; // Exporta el enrutador para usarlo en tu archivo principal
