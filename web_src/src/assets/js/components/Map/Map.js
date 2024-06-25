import { search, showLoadingModal, downloadFile, hideModal } from "../../util.js";
import { loadMaplibregl } from "../../util/maplibreglLoader.js";


class Map {
    constructor(container, options = {}) {
        this.container = container;
        this.listeners = {};
        this.map = null;

        this.config = {
            ...options
        };

        if (options.listeners) {
            for (const eventType in options.listeners) {
                const callbacks = options.listeners[eventType];
                if (Array.isArray(callbacks)) {
                    callbacks.forEach(callback => this.addEventListener(eventType, callback));
                } else {
                    this.addEventListener(eventType, callbacks);
                }
            }
        }

        this.handleRemoveItemBound = this.handleRemoveItem.bind(this);

        this.init();
    }

    addEventListener(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    emit(eventType, arg) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => callback(arg));
        }
    }

    async init() {
        const self = this;

        const data = await search(null, null, '/getMapKey');

        const mapOptions = {
            style: `https://api.maptiler.com/maps/backdrop/style.json?key=${data.mapAPIKey || ''}`,
            center: [-74.5, 4.0], // Coordenadas iniciales del centro del mapa
            zoom: 4
        }

        //preload maplibregl scripts 
        loadMaplibregl().then(maplibregl => {
            self.map = new maplibregl.Map({
                container: 'map',
                ...mapOptions
            });

            self.map.on('load', () => {
                this.emit('mapLoaded', this.map);
                if (this.config.focusOnStart) {
                    this.container.focus();
                }
                self.configureLayers();
            });

        }).catch(error => {
            console.log('Error loading maplibre-gl:', error);
        });

    }

    async configureLayers() {
        const self = this;
        const data = await search(null, null, '/getTerrenos');

        if (!data || !data.features) {
            console.log('No se encontraron terrenos');
            return;
        }


        this.map.addSource('terrenos', {
            type: 'geojson',
            data: data
        });

        this.map.addLayer({
            id: 'terrenos-layer',
            type: 'fill',
            source: 'terrenos',
            layout: {},
            paint: {
                'fill-color': '#228B22',
                'fill-opacity': 0.5
            }
        });

        this.map.addLayer({
            id: 'terrenos-outline',
            type: 'line',
            source: 'terrenos',
            layout: {},
            paint: {
                'line-color': '#006400',
                'line-width': 1
            }
        });

        const bounds = new maplibregl.LngLatBounds();
        data.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                const coordinates = feature.geometry.type === 'Polygon'
                    ? feature.geometry.coordinates
                    : feature.geometry.coordinates.flat(1);

                coordinates.forEach(polygon => {
                    polygon.forEach(coord => {
                        bounds.extend(coord);
                    });
                });
            }
        });

        if (bounds.isEmpty()) {
            console.log('No se encontraron límites válidos para ajustar el mapa.');
        } else {
            this.map.fitBounds(bounds, {
                padding: 20
            });
        }

        this.map.on('click', 'terrenos-layer', async (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['terrenos-layer']
            });

            if (!features.length) {
                return;
            }

            const coordinates = e.lngLat;


            const attributesList = await Promise.all(features.map(async (feature) => {
                const attributes = await search('apiGetTerrenoAttributes', { t_ili_tid: feature.properties.predio_id });
                return {
                    ...attributes,
                    terreno_t_id: feature.properties.terreno_t_id
                };
            }));
            if (attributesList && attributesList.length) {
                const carouselItems = attributesList.map((attributes, index) => `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <div>
                            <strong>Terreno:</strong> ${attributes.results.nombre_predio || ''}<br>
                            <strong>Matrícula:</strong> ${attributes.results.matricula || ''}<br>
                            <strong>Número Predial Nacional:</strong> ${attributes.results.numero_predial_nacional || ''}
                        </div>
                        <hr/>
                        <a class="btn btn-sm btn-soft-success generate-report" data-edit-id="${attributes.terreno_t_id}"><i class="ri-file-pdf-fill align-bottom"></i> Generar Reporte predial</a>
                    </div>
                `).join('');
                const carouselHTML = `
                    ${attributesList.length > 1 ? `<strong class="text-center text-bold">${attributesList.length} resultados</strong>` : ``}
                    <div id="carouselExampleControls" class="carousel carousel-dark slide" >
                        ${attributesList.length > 1 ? `
                        <a class="carousel-control-prev" href="#carouselExampleControls" role="button" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="sr-only">Previous</span>
                        </a>
                        <a class="carousel-control-next" href="#carouselExampleControls" role="button" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="sr-only">Next</span>
                        </a>
                        `: ``}
                        <div class="carousel-inner" role="listbox" ${attributesList.length > 1 ? `style="padding: 0 35px;"` : ``}>
                            ${carouselItems}
                        </div>
                    </div>
                `;

                new maplibregl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(carouselHTML)
                    .addTo(this.map);

                document.querySelectorAll('.generate-report').forEach(button => {
                    button.addEventListener('click', function () {
                        const terrenoId = this.getAttribute('data-edit-id');
                        self.generateReport(terrenoId);
                    });
                });

            }
        });
    }

    filterTerrains(ids) {
        if (!this.map.getSource('terrenos')) {
            console.log('Source terrenos not found');
            return;
        }

        this.map.setFilter('terrenos-layer', [
            'in',
            'predio_id',
            ...ids
        ]);

        this.map.setFilter('terrenos-outline', [
            'in',
            'predio_id',
            ...ids
        ]);
    }

    handleRemoveItem(data) {
        //this.emit('customEvent', data);
    }

    async generateReport(terrenoId) {

        console.log(`Generando reporte para terreno ID: ${terrenoId}`);
        let modalInstance = showLoadingModal(["Preparando datos", "Preparando datos", "Generando reporte", "Imprimiendo plano","Descargando","Descargando"]);
        try {
            await downloadFile({}, '../generate-pdf/plano_predial/' + terrenoId, 'GET');

        } catch (e) {
            console.error("Error al descargar el archivo", e)
        } finally {
            hideModal(modalInstance)
        }
    }
}

export default Map;
