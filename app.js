"use strict";

// Imports dependencies and set up http server
const express = require("express");
//var { expressjwt: jwt } = require("express-jwt");
const jwt = require('jsonwebtoken');
const cors = require('cors');

const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const PDFDocument = require('pdfkit');
const pdf = require('html-pdf-node');
const fs = require('fs');
const path = require('path');

const body_parser = require("body-parser");
const app = express().use(body_parser.json()); // creates express http server

handlebars.registerHelper('getImageById', function (subReportImages, id) {
    const image = subReportImages.find(img => img.id === id);
    return image ? image.image : null;
});

handlebars.registerHelper('getQueryResultById', function (queryResults, id) {
    return queryResults[id] || [];
});

handlebars.registerHelper('isOdd', function (value) {
    return value % 2 !== 0;
});

handlebars.registerHelper('isLeftColumn', function (value) {
    return (value % 2) === 0;
});


handlebars.registerHelper('iff', function (condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
});


handlebars.registerHelper('chunkArray', function (array, chunkSize) {
    let result = [];
    for (let i = 0; i < array.length; i += chunkSize * 2) {
        let chunk = {
            left: array.slice(i, i + chunkSize),
            right: array.slice(i + chunkSize, i + chunkSize * 2)
        };
        result.push(chunk);
    }
    return result;
});


handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});



app.use(cors({
    origin: ['https://mejiafabian.com', 'https://golemos.mejiafabian.com', 'https://apps.golemoscleaning.com', 'https://golemoscleaning.com', 'https://apps.golemos.com', 'https://whatsapp.golemos.com']
}));



const pg_db = require("./src/db_pg");
pg_db.connect();

app.get("/", (req, res) => {
    return res.redirect('/web');
});

app.use('/img', express.static('img'));


// Proteger todas las rutas excepto '/login'
app.get('/web', (req, res) => {
    //res.sendFile(path.join(__dirname, 'index.html'));
    //res.sendFile('index.html');

    const token = req.query.token;

    if (token) {
        // Verifica el token
        jwt.verify(token, process.env.JWT_KEY, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) {
                // Token no válido, redirige al login
                return res.redirect('/web/login.html');
            }
            // Token válido, envía el index.html
            return res.sendFile('/web/index.html');
        });
    } else {
        // No hay token, redirige al login
        if (req.path == '/' || req.path == '/web') {
            //return res.sendFile('/web/index.html');
            return res.redirect('/web/login.html');
        }

        const isLoginRoute = req.path === '/web/login.html' || req.path === '/web/login' //|| req.path === '/web/index.html';
        if (isLoginRoute) {
            // Si es la ruta de login, procede sin verificar el token
            return next();
        }
        return res.redirect('/web/login.html');
    }
});

function checkToken(req, res, next) {
    const isLoginRoute = req.path === '/web/login.html' || req.path === '/web/login' //|| req.path === '/web/index.html';
    if (isLoginRoute) {
        // Si es la ruta de login, procede sin verificar el token
        return next();
    }

    const isWebRoute = req.path.startsWith('/web');
    if (isWebRoute) {
        const token = req.query.token;

        if (token) {
            // Verifica el token
            jwt.verify(token, process.env.JWT_KEY, { algorithms: ['HS256'] }, async (err, decoded) => {
                try {
                    if (err || !decoded?.id) {
                        throw new Error('Invalid token');
                    }

                    const usuario = await pg_db.getUserById(decoded.id);
                    if (!usuario) {
                        throw new Error('User not found');
                    }

                    /*
                    //TODO: validate user permission
                    const permissions = await pg_db.getPermissionsByUsuarioId(usuario.user_id)

                    const rutaBase = req.path.split('/').pop();
                    const ruta = rutaBase.split('.')[0]

                    if (!permissions || !permissions.includes(ruta)) {
                        throw new Error('Permission denied', ruta);
                    }
                    */

                    next();
                } catch (error) {
                    // Cualquier error redirige al login
                    console.error(error.message);  // Opcional: loguea el mensaje de error
                    res.redirect('/web/login.html');
                }
            });
        } else {
            // No hay token, redirige al login solo si la solicitud es para una página HTML
            const isHtmlRequest = req.headers.accept && req.headers.accept.includes('text/html');
            if (isHtmlRequest) {
                return res.redirect('/web/login.html?dest=' + req.path);
            } else {
                return next();
            }
        }
    } else {
        // Si no es una ruta bajo /web, procede sin verificar el token
        return next();
    }
}


// Usa el middleware personalizado antes de tus otras rutas o middleware
app.use(checkToken);

app.use(express.static(__dirname));


app.use('/api', function (req, res, next) {
    if (req.path == '/getToken' || req.path == '/sendCode') {
        next();
    } else {
        let token = req.query.token || req.headers.authorization;
        if (token && token.startsWith('Bearer ')) {
            // Remueve 'Bearer ' del token
            token = token.slice(7, token.length);
        }

        jwt.verify(token, process.env.JWT_KEY, { algorithms: ['HS256'] }, function (err, decoded) {
            if (err) {
                return res.status(401).send('Invalid token');
            }
            //req.user = decoded; // Suponiendo que el token decodificado contiene la información del usuario
            next();
        });
    }
});

const apiRouter = require("./src/api");
app.use('/api', apiRouter);
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('Invalid token');
    }
});


app.get('/generate-pdf/:report/:id', async (req, res) => {
    const { report, id } = req.params;
    if (!report || !id) {
        return res.status(400).send('incorrect parameters');
    }

    // Leer el catálogo de reportes
    const reportCatalogPath = path.join(__dirname, 'templates/reportCatalog.json');
    const reportCatalog = JSON.parse(fs.readFileSync(reportCatalogPath, 'utf8'));

    // Obtener la configuración del reporte
    const reportConfig = reportCatalog[report];
    if (!reportConfig) {
        return res.status(404).send('Report not found');
    }

    try {
        let subReportImages = [];
        let queryResults = [];

        // Generar sub-reportes
        for (const subReport of reportConfig.subReports) {
            if (subReport.type === 'map') {
                const layerData = {};
                for (const layer of subReport.layers) {
                    const queryFunction = pg_db[layer.query];
                    const params = layer.params.map(param => param === 'id' ? id : eval(param)); // Reemplaza 'id' con el valor adecuado
                    layerData[layer.name] = await queryFunction(...params);
                }

                const browser = await puppeteer.launch();
                const page = await browser.newPage();

                const templatePath = path.join(__dirname, 'templates', subReport.template);
                let mapHtml = fs.readFileSync(templatePath, 'utf8');

                for (const [layerName, data] of Object.entries(layerData)) {
                    mapHtml = mapHtml.replace(`"<%= ${layerName} %>"`, JSON.stringify(data.geojson));
                }

                /*
                const outputHtmlPath = path.join(__dirname, '', `${subReport.id}_map.html`);
                fs.writeFileSync(outputHtmlPath, mapHtml, 'utf8');
                */

                await page.setViewport({ width: 1250, height: 1123, deviceScaleFactor: 2 });
                await page.setContent(mapHtml, { waitUntil: 'networkidle0' });
                const mapImageBuffer = await page.screenshot();
                const mapImageBase64 = mapImageBuffer.toString('base64');
                await browser.close();

                if (!mapImageBase64) {
                    throw new Error('La imagen del mapa no se generó correctamente.');
                }

                subReportImages.push({ id: subReport.id, type: subReport.type, image: mapImageBase64 });

            } else if (subReport.type === 'table') {
                const queryFunction = pg_db[subReport.query];
                const params = subReport.params.map(param => param === 'id' ? id : eval(param));
                queryResults[subReport.id] = await queryFunction(...params);
            }
            //todo: include other subreport types
        }

        const templatePath = path.join(__dirname, `templates/${report}.html`);
        const template = fs.readFileSync(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(template);

        const html = compiledTemplate({ subReportImages, queryResults });

        // Crear el PDF con html-pdf-node
        const file = { content: html };
        const options = {
            format: 'A4',
            margin: {
                top: '10mm',
                right: '5mm',
                bottom: '5mm',
                left: '5mm'
            }
        };

        pdf.generatePdf(file, options).then(pdfBuffer => {
            res.contentType('application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${report}-${id}.pdf`);
            res.send(pdfBuffer);
        }).catch(error => {
            console.error('Error al generar el PDF:', error);
            res.status(500).send('Error al generar el PDF');
        });
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error al generar el PDF');
    }
});


// Sets server port and logs message on success
app.listen(process.env.PORT || 6336, () => console.log("webhook is listening"));
//eventsMonitor.startMonitor();



