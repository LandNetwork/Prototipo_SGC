import { fetchAPI, hideModal, search, showCustomModal, showLoadingModal, upsert } from '../../util.js';
import ParcelSelector from '../../components/ParcelSelector/ParcelSelector.js';
import Map from '../../components/Map/Map.js';

let parcelSelector;
let mapInstance;
let originalMapContainer;

function init() {
    const container = document.getElementById("content");

    const content = document.createElement("div");
    content.innerHTML = `
        <div class="row" id="container-top-buttons">
            

            <div class="col-lg-12">
                <div class="card">
                    <div class="card-header align-items-center d-flex">
                        <h4 class="card-title mb-0 flex-grow-1">Mapa</h4>
                        <div class="flex-shrink-0">
                            <div class="form-check form-switch form-switch-right form-switch-md">
                                <button id="btnFullScreen" type="button" class="btn btn-light btn-icon waves-effect" title="Abrir en pantalla completa">
                                    <i class="ri-fullscreen-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card-body" style="height:350px">
                        <div id="map" class="leaflet-map"></div>
                    </div>
                </div>
            </div>

            <div class="col-lg-12">
                <div class="card">
                    <div id="parcelSelector" class="card-body">
                        
                    </div>
                </div>
            </div>
        </div>
    `;

    container.appendChild(content);
    const parcelContainer = content.querySelector("#parcelSelector");

    parcelSelector = new ParcelSelector(parcelContainer, {
        title: 'Predios:',
        selectedParcelsPanelVisible: false,
        tablePaneStyles: '',
        focusOnStart: true,
        listeners: {
            loaded: function (instance) {
                const div = document.createElement("div");
                div.id = "parcelError";
                div.style.display = 'none';
                div.classList.add("sd-error")
                div.innerHTML = 'Por favor, seleccione al menos una parcela.'
                instance.container.prepend(div);
            },
        }
    });
    parcelSelector.addEventListener('change', function (data) {
        console.log(data.selectedParcels);
        //sv.setValue('selected_parcels', data.selectedParcels?.length > 0 ? data.selectedParcels.map(parcel => parcel.t_id).join(', ') : null);
    });

    parcelSelector.addEventListener('onResults', function (data) {

        mapInstance.filterTerrains(data.map(record => record.t_ili_tid));
    });


    const mapContainer = content.querySelector("#map");
    createMap(mapContainer);

    container.querySelector('#btnFullScreen').addEventListener('click', switchFullScreen);
}

function createMap(mapContainer) {
    originalMapContainer = mapContainer.parentNode;
    mapInstance = new Map(mapContainer, {});
}

function switchFullScreen() {
    const mapContainerHtml = '<div id="map-modal-container" style="height: 100%;"></div>';
    const modal = showCustomModal("Mapa en Pantalla Completa", mapContainerHtml, 'modal-fullscreen');
    modal._element.addEventListener('shown.bs.modal', function () {
        const newContainer = this.querySelector('#map-modal-container');
        moveMapToContainer(newContainer);
    });

    modal._element.addEventListener('hidden.bs.modal', function () {
        moveMapToContainer(originalMapContainer);
    });

}

function moveMapToContainer(newContainer) {
    if (mapInstance && mapInstance.map && newContainer) {
        newContainer.appendChild(mapInstance.container);
        mapInstance.map.resize();
    }
}


init();