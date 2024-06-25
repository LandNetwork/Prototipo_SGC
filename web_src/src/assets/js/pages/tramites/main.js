import { downloadFile, fetchAPI, hideModal, search, showCustomModal, showLoadingModal, showToast, uploadFile, upsert } from '../../util.js';
import ParcelSelector from '../../components/ParcelSelector/ParcelSelector.js';

let domainValues = {};

function init() {

    const container = document.getElementById("content");

    const content = document.createElement("div");
    content.innerHTML = `
        <div class="row" id="container-top-buttons">
            <div class="col-lg-12">
                <div class="card">
                    <div class="card-body">
                        <div class="live-preview">
                            <div class="d-flex flex-wrap gap-2">
                                <a href="#" id="btn-new-process" class="btn btn-primary waves-effect waves-light"><i class="ri-file-add-line"></i> Nueva solicitud</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        
            <div class="col-lg-12">
                <div class="card">
                    <div class="card-body">
                        <div class="p-3 bg-light rounded mb-4">
                            <div class="row g-2">
                                
                                <div class="col-lg">
                                    <div class="search-box">
                                        <input type="text" id="inputSearchProcess" class="form-control search" placeholder="Buscar Solicitudes...">
                                        <i class="ri-search-line search-icon"></i>
                                    </div>
                                    <p class="mt-2 mb-0 text-muted d-none" id="lblResultsCount"></p>
                                </div>
                            </div>
                        </div>

                        <div class=" position-relative px-4 mx-n4">
                            <div id="elmLoader" >
                            </div>
                            <div class="todo-task">
                                <div class="table-responsive">
                                    <table class="table align-middle position-relative table-nowrap">
                                        <thead class="table-active">
                                            <tr>
                                                <th scope="col"><input class="form-check-input parcel-checkbox d-none" type="checkbox" id="chkSelectAll"> Número radicado</th>
                                                <th scope="col">Fecha Radicación</th>
                                                <th scope="col">Solicitante</th>
                                                <th scope="col">Predios</th>
                                                <th scope="col">Acciones</th>
                                            </tr>
                                        </thead>

                                        <tbody id="process-list"></tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="py-4 mt-4 text-center" id="noresult" style="display: none;">
                                <lord-icon src="assets/images/msoeawqm.json" trigger="loop" colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                                <h5 class="mt-4">No hay resultados</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.appendChild(content);

    const btnNewProcess = content.querySelector("#btn-new-process");
    btnNewProcess.addEventListener("click", function (event) {
        event.preventDefault();
        //startNewProcessForm(container);

        initSurveyForm(container);
    });

    configureSearchInput(container);
}

function configureSearchInput(container) {

    const inputSearchProcess = container.querySelector("#inputSearchProcess");

    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    const handleSearch = debounce(function () {
        var inputVal = inputSearchProcess.value.toLowerCase();
        searchProcess(inputVal);
    }, 500);

    inputSearchProcess.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            searchProcess(inputSearchProcess.value.toLowerCase());
        } else {
            handleSearch();
        }
    });
}

function searchProcess(value) {
    const self = this;
    let urlObj = new URL(window.location.href);
    let token = urlObj.searchParams.get('token');

    document.querySelector("#noresult").style.display = 'none';
    const loader = document.querySelector("#elmLoader");
    loader.innerHTML = `
        <div class="spinner-border text-primary avatar-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;

    document.querySelector("#process-list").innerHTML = "";

    const lblResultsCount = document.querySelector("#lblResultsCount");
    lblResultsCount.classList.add("d-none");

    document.querySelector("#chkSelectAll").classList.add("d-none");

    const params = {
        queryName: 'apiSearchProcess',
        params: { id: value, includeHeader: true }
    };

    fetchAPI('/runQuery', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(params)
    })
        .then(async data => {
            loader.innerHTML = '';
            lblResultsCount.classList.remove("d-none");

            if (data?.results) {
                drawItems(data.results);

                lblResultsCount.innerHTML = data.results.length + ' Resultados';

                //document.querySelector("#chkSelectAll").classList.remove("d-none");
            } else {
                lblResultsCount.innerHTML = 'No hay resultados';
                document.querySelector("#noresult").style.removeProperty("display");
            }
        })
        .catch(error => {
            loader.innerHTML = '';
            document.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

function drawItems(manyProcess) {

    const processList = document.querySelector("#process-list");
    processList.innerHTML = "";

    Array.from(manyProcess).forEach(function (singleProcess) {
        const checkinput = "";

        const rowElement = document.createElement('tr');
        rowElement.innerHTML = `
            <td>
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <div class="form-check">
                            <!--<input class="form-check-input parcel-checkbox" type="checkbox" value="${singleProcess.t_ili_tid}" id="todo-${singleProcess.t_ili_tid}" ${checkinput}>-->
                            <label class="form-check-label" for="todo-${singleProcess.t_ili_tid}">${singleProcess.numero_radicado || ''}</label>
                        </div>
                    </div>
                </div>
            </td>
            <td>${singleProcess.fecha_radicacion || ''}</td>
            <td>${singleProcess.solicitante || ''}</td>
            <td>
                ${(singleProcess.codigos_prediales || []).slice(0, 5).map(codigo => `<span class="badge bg-info-subtle text-info d-block mb-1">${codigo}</span>`).join(' ')}
                ${singleProcess.codigos_prediales.length > 5 ? '<span class="badge bg-info-subtle text-info d-block mb-1">...</span>' : ''}
            </td>
            <td>
                <div class="hstack gap-1">
                    <a class="btn btn-sm btn-soft-info edit-list action-button" data-edit-id="${singleProcess.t_ili_tid}"><i class="ri-eye-fill align-bottom"></i></a>
                    ${singleProcess.exists_in_basket ? `
                        <a class="btn btn-sm btn-outline-primary download-list action-button" data-edit-id="${singleProcess.t_ili_tid}"><i class="ri-download-fill align-bottom"></i></a>
                        <a class="btn btn-sm btn-outline-dark upload-list action-button" data-edit-id="${singleProcess.t_ili_tid}"><i class="ri-upload-fill align-bottom"></i></a>
                        <a class="btn btn-sm btn-outline-success check-list action-button" data-edit-id="${singleProcess.t_ili_tid}"><i class="ri-check-fill align-bottom"></i></a>
                        `: ``}
                </div>
            </td>
        `;
        processList.appendChild(rowElement);

    });

    const actionButtons = document.querySelectorAll('.hstack .action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            const t_ili_tid = this.getAttribute('data-edit-id');
            if (this.classList.contains('edit-list')) {
                searchProcessById(t_ili_tid);
            } else if (this.classList.contains('download-list')) {
                downloadXTF(t_ili_tid);
            } else if (this.classList.contains('upload-list')) {
                uploadXTF(t_ili_tid);
            } else if (this.classList.contains('check-list')) {
                closeProcess(t_ili_tid);
            }
        });
    });

    processList.querySelectorAll('.parcel-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const parcelID = this.value;
            const parcel = manyProcess.find(p => p.t_ili_tid.toString() === parcelID);

            if (this.checked) {
                if (!self.selectedParcels.some(parcel => parcel.t_ili_tid.toString() === parcelID)) {
                    self.selectedParcels.push(parcel);
                }
            } else {
                const index = self.selectedParcels.findIndex(parcel => parcel.t_ili_tid.toString() === parcelID);
                if (index > -1) {
                    self.selectedParcels.splice(index, 1);
                }
            }

            self.containerSelectedParcels.containerInner.element.querySelectorAll("input")[1].placeholder = self.selectedParcels.length > 0 ? "" : "No hay predios seleccionados";


            self.container.querySelector('#selected-parcels').removeEventListener('removeItem', self.handleRemoveItemBound, false);
            self.containerSelectedParcels.removeActiveItems();
            self.container.querySelector('#selected-parcels').addEventListener('removeItem', self.handleRemoveItemBound, false);

            self.selectedParcels.forEach(parcel => {
                const item = { value: parcel.t_ili_tid.toString(), label: parcel.numero_predial_nacional };
                self.containerSelectedParcels._addItem(item);
            });

            self.checkSelectedParcels();

        });
    });
}

async function searchProcessById(process) {
    const data = await search('apiSearchProcessById', { id: process, includeHeader: true });

    console.log(data)
    const container = document.getElementById("content");
    initSurveyForm(container, data?.results || null);

}

async function downloadXTF(process) {
    const modalInstance = showLoadingModal("Descargando...");
    try {
        const data = await downloadFile({ id: process, includeHeader: true });
        console.log(data);
    } catch (e) {
        console.error("Error al descargar el archivo", e)
    } finally {
        hideModal(modalInstance)
    }
}

function uploadXTF(process) {

    const modalId = Array.from({ length: 8 }, () => Math.random().toString(36).charAt(2)).join('');

    const modalContent = `
            <form action="javascript:void(0);" id="uploadForm">
                <div class="row g-3">
                    <div class="col-lg-12">
                        <label for="dropzone" class="form-label">Cargar XTF</label>
                        <div class="dropzone" id="dropzone-${modalId}">
                            <div class="fallback">
                                <input name="file" type="file" accept=".xtf">
                            </div>
                            <div class="dz-message needsclick">
                                <div class="mb-3">
                                    <i class="display-4 text-muted ri-upload-cloud-2-fill"></i>
                                </div>

                                <h4>Arrastre archivos o haga click para buscar.</h4>
                            </div>
                        </div>
                        <ul class="list-unstyled mb-0" id="dropzone-preview-${modalId}">
                            <li class="mt-2" id="dropzone-preview-list-${modalId}">
                                <!-- This is used as the file preview template -->
                                <div class="border rounded">
                                    <div class="d-flex p-2">
                                        <div class="flex-shrink-0 me-3">
                                            <div class="avatar-sm bg-light rounded">
                                                <img data-dz-thumbnail class="img-fluid rounded d-block" src="assets/images/new-document.png" alt="Dropzone-Image" />
                                            </div>
                                        </div>
                                        <div class="flex-grow-1">
                                            <div class="pt-1">
                                                <h5 class="fs-14 mb-1" data-dz-name>&nbsp;</h5>
                                                <p class="fs-13 text-muted mb-0" data-dz-size></p>
                                                <strong class="error text-danger" data-dz-errormessage></strong>
                                            </div>
                                        </div>
                                        <div class="flex-shrink-0 ms-3">
                                            <button data-dz-remove class="btn btn-sm btn-danger">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div><!--end col-->
                    
                    <div class="col-lg-12">
                        <div class="hstack gap-2 justify-content-end">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cerrar</button>
                            <button type="submit" class="btn btn-primary" id="submitBtn" disabled>Subir y validar</button>
                        </div>
                    </div><!--end col-->
                </div><!--end row-->
            </form>
        `
    const modalInstance = showCustomModal("Cargar y validar", modalContent, 'modal-xl');

    modalInstance._element.addEventListener('shown.bs.modal', function () {
        var dropzonePreviewNode = modalInstance._element.querySelector(`#dropzone-preview-list-${modalId}`);
        dropzonePreviewNode.id = "";
        if (dropzonePreviewNode) {
            var previewTemplate = dropzonePreviewNode.parentNode.innerHTML;
            dropzonePreviewNode.parentNode.removeChild(dropzonePreviewNode);

            // Destruir cualquier instancia existente de Dropzone en el elemento
            if (Dropzone.instances.length > 0) {
                Dropzone.instances.forEach(dz => dz.destroy());
            }

            var dropzone = new Dropzone(modalInstance._element.querySelector(`#dropzone-${modalId}`), {
                url: 'https://httpbin.org/post',
                method: "post",
                previewTemplate: previewTemplate,
                previewsContainer: `#dropzone-preview-${modalId}`,
                acceptedFiles: ".xtf",
                maxFiles: 1,
                init: function () {
                    this.on("addedfile", function () {
                        modalInstance._element.querySelector('#submitBtn').disabled = false;
                    });
                    this.on("removedfile", function () {
                        if (this.files.length === 0) {
                            modalInstance._element.querySelector('#submitBtn').disabled = true;
                        }
                    });
                }
            });
        }
    });

    modalInstance._element.addEventListener('hidden.bs.modal', function () {
        if (Dropzone.instances.length > 0) {
            Dropzone.instances.forEach(dz => dz.destroy());
        }
    });


    modalInstance._element.querySelector('#uploadForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        const dropzone = Dropzone.forElement(modalInstance._element.querySelector(`#dropzone-${modalId}`));
        const file = dropzone.files[0];

        if (file) {
            const loadingModal = showLoadingModal("Cargando...");
            modalInstance._element.classList.add('d-none');
            try {
                //const data = await uploadFile(file );
                const data = await uploadFile(file, 'http://localhost:8000/api/upload_file/');
                console.log('Success:', data);
                hideModal(modalInstance);

                showToast('Archivo validado y cargado correctamente!');

            } catch (error) {
                console.error('Error:', error);
            } finally {
                modalInstance._element.classList.remove('d-none');
                hideModal(loadingModal);
            }
        }
    });
}

async function closeProcess(process) {
    const data = await search('apiFinishProcessById', { id: process, includeHeader: true });

    const inputSearchProcess = document.querySelector("#inputSearchProcess");
    var inputVal = inputSearchProcess.value.toLowerCase();
    searchProcess(inputVal);
}

async function initSurveyForm(container, data) {
    const self = this;

    let containerNewProcess = container.querySelector("#container-new-process");
    if (!containerNewProcess) {
        let survey = null;

        let containerBtns = container.querySelector("#container-top-buttons");
        containerBtns.classList.add("collapse");

        const content = document.createElement("div");
        content.id = "divSurveyForm";
        content.innerHTML = `
            <div class="row" id="container-new-process">
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header align-items-center d-flex">
                            <h4 class="card-title mb-0 flex-grow-1">Nueva solicitud</h4>
                            <div class="">
                                <div class="form-check form-switch form-switch-right form-switch-md">
                                    <button type="button" id="btnCancel" class="btn btn-dark btn-label waves-effect waves-light"><i class="ri-close-circle-line label-icon align-middle fs-16 me-2"></i> Cancelar</button>
                                    <button type="button" id="btnNext" class="collapse btn btn-primary btn-label waves-effect waves-light">Siguiente <i class="ri-arrow-right-s-line label-icon align-middle fs-16 me-2"></i></button>                                   
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="live-preview" id="formContainer">
                            
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(content);

        await searchDomains();

        const legalPartyTypeId = domainValues.partyType.find(opt => opt.text === "Persona jurídica").value || null;
        const naturalPartyTypeId = domainValues.partyType.find(opt => opt.text === "Persona natural").value || null;

        const secuencialPartyDocumentTypeId = domainValues.partyDocumentType.find(opt => opt.text === "Secuencial").value || null;
        const NITPartyDocumentTypeId = domainValues.partyDocumentType.find(opt => opt.text === "NIT").value || null;




        Survey.JsonObject.metaData.addProperty("text", { name: "useDatePicker:boolean", default: false });
        Survey.CustomWidgetCollection.Instance.addCustomWidget({
            name: "datepicker",
            htmlTemplate: "<input class='form-control widget-datepicker' type='text' style='width: 100%;'>",
            isFit: function (question) {
                return question["useDatePicker"] === true;
            },
            afterRender: function (question, el) {
                $(el).datepicker({
                    dateFormat: question.jsonObj["dateFormat"] || "dd/mm/yy",
                    changeMonth: true,
                    changeYear: true,
                    yearRange: "c-100:c+10",
                    onSelect: function (dateText) {
                        question.value = dateText;
                    }
                });

                if (question.value) {
                    $(el).datepicker("setDate", new Date(question.value));
                }
            },
            willUnmount: function (question, el) {
                $(el).find("input").datepicker("destroy");
            }
        });


        const surveyJSON = {
            showProgressBar: "none",
            isSinglePage: false,
            showCompletedPage: false,
            showQuestionNumbers: 'off',
            clearInvisibleValues: false,
            elements: [
                {
                    type: "panel",
                    name: "Solicitante",
                    title: "Solicitante",
                    state: "expanded",
                    elements: [
                        { type: "text", name: "solicitud_t_ili_tid", visible: false },
                        { type: "text", name: "interesado_t_ili_tid", visible: false },
                        {
                            type: "dropdown", name: "tipo_solicitante", title: "Tipo de solicitante", isRequired: true, choices: domainValues.requesterType, startWithNewLine: true
                        },
                        {
                            type: "dropdown", name: "tipo_documento", title: "Tipo de documento de identidad", isRequired: true, choices: domainValues.partyDocumentType, startWithNewLine: true
                        },
                        { type: "text", name: "documento_identidad", title: "Número de documento", isRequired: true, startWithNewLine: false },
                        {
                            type: "dropdown", name: "tipo_interesado", title: "Tipo de persona", isRequired: true, choices: domainValues.partyType,
                            visibleIf: `{tipo_documento} = ${secuencialPartyDocumentTypeId}`,
                            startWithNewLine: true,
                        },
                        { type: "text", name: "primer_nombre", title: "Primer Nombre", isRequired: true, visibleIf: `{tipo_documento} notempty and ({tipo_documento} != ${NITPartyDocumentTypeId} and {tipo_documento} != ${secuencialPartyDocumentTypeId}) or ({tipo_documento} = ${secuencialPartyDocumentTypeId} and {tipo_interesado} = ${naturalPartyTypeId})`, startWithNewLine: true, },
                        { type: "text", name: "segundo_nombre", title: "Segundo Nombre", isRequired: false, visibleIf: `{tipo_documento} notempty and ({tipo_documento} != ${NITPartyDocumentTypeId} and {tipo_documento} != ${secuencialPartyDocumentTypeId}) or ({tipo_documento} = ${secuencialPartyDocumentTypeId} and {tipo_interesado} = ${naturalPartyTypeId})`, startWithNewLine: false, },
                        { type: "text", name: "primer_apellido", title: "Primer Apellido", isRequired: true, visibleIf: `{tipo_documento} notempty and ({tipo_documento} != ${NITPartyDocumentTypeId} and {tipo_documento} != ${secuencialPartyDocumentTypeId}) or ({tipo_documento} = ${secuencialPartyDocumentTypeId} and {tipo_interesado} = ${naturalPartyTypeId})` },
                        { type: "text", name: "segundo_apellido", title: "Segundo Apellido", isRequired: false, visibleIf: `{tipo_documento} notempty and ({tipo_documento} != ${NITPartyDocumentTypeId} and {tipo_documento} != ${secuencialPartyDocumentTypeId}) or ({tipo_documento} = ${secuencialPartyDocumentTypeId} and {tipo_interesado} = ${naturalPartyTypeId})`, startWithNewLine: false, },
                        { type: "text", name: "razon_social", title: "Razón Social", isRequired: true, visibleIf: `{tipo_documento} notempty and {tipo_documento} = ${NITPartyDocumentTypeId} or ({tipo_documento} = ${secuencialPartyDocumentTypeId} and {tipo_interesado} = ${legalPartyTypeId})`, startWithNewLine: false, },
                        {
                            type: "panel",
                            name: "Datos de contacto",
                            title: "Datos de contacto",
                            state: "expanded",
                            visibleIf: "{documento_identidad} notempty",
                            elements: [
                                { type: "text", name: "telefono", title: "Teléfono de notificación", isRequired: false, },
                                { type: "text", name: "direccion", title: "Dirección de notificación", isRequired: false, },
                                { type: "text", name: "departamento", title: "Departamento", isRequired: false, },
                                { type: "text", name: "municipio", title: "Municipio", isRequired: false, startWithNewLine: false, },
                                { type: "text", name: "correo", title: "Correo electrónico de notificación", isRequired: false, },
                                {
                                    type: "checkbox",
                                    name: "acepta_notificacion",
                                    title: "Acepta notificaciones por vía electrónica",
                                    choices: [
                                        {
                                            "value": "true",
                                            "text": " "
                                        }
                                    ],
                                }
                            ]
                        },
                    ]
                },
                {
                    type: "panel",
                    name: "Solicitud",
                    title: "Solicitud",
                    state: "expanded",
                    visibleIf: "{documento_identidad} notempty",
                    elements: [
                        {
                            type: "text",
                            inputType: "date",
                            name: "fecha_radicacion",
                            title: "Fecha de Radicación",
                            isRequired: true,
                            dateFormat: "dd/mm/yy",
                            useDatePicker: true,
                            validators: [
                                {
                                    type: "text",
                                    minLength: 1,
                                }
                            ],
                            startWithNewLine: true
                        },
                        { type: "text", name: "numero_radicado", title: "Número de radicado", isRequired: false, startWithNewLine: false },
                        { type: "comment", name: "descripcion_solicitud", title: "Descripción de la solicitud", isRequired: true, startWithNewLine: true },

                    ]
                }, {
                    type: "panel",
                    name: "Predio(s)",
                    title: "Predio(s)",
                    visibleIf: "{documento_identidad} notempty",
                    elements: [
                        { type: "html", name: "parcel_selector", html: "<div id='parcel-selector-container' class=''></div>", isRequired: true, },//sd-element--with-frame
                        { type: "text", name: "selected_parcels", visible: false, isRequired: true, includeIntoResult: true },

                    ]
                }, {
                    type: "panel",
                    name: "Transacciones",
                    title: "Transacciones",
                    state: "expanded",
                    elements: [
                        {
                            type: "matrixdynamic",
                            name: "transacciones",
                            title: "Transacciones",
                            titleLocation: "hidden",
                            addRowText: "Añadir transacción",
                            removeRowText: "Eliminar transacción",
                            rowCount: 1,
                            minRowCount: 1,
                            startWithNewLine: true,
                            visibleIf: "{selected_parcels} notempty",
                            columns: [
                                {
                                    type: "dropdown", name: "tipo_transaccion", title: "Tipo de transacción", isRequired: true, choices: domainValues.transactionTypes, startWithNewLine: true
                                },
                                {
                                    type: "checkbox",
                                    name: "predios",
                                    cellType: "checkbox",
                                    title: "Predio(s) relacionado(s)",
                                    showSelectAllItem: true,
                                    selectAllText: "Seleccionar todos",
                                    isRequired: true,
                                    choices: getSelectedParcels(survey),
                                    startWithNewLine: true
                                }
                            ]
                        },
                    ]
                }
            ]
        };

        survey = new Survey.Model(surveyJSON);
        survey.data = data;

        survey.onAfterRenderQuestion.add(function (sv, options) {
            if (options.question.name === "parcel_selector") {
                const container = document.getElementById('parcel-selector-container');
                if (container) {
                    if (!sv.getQuestionByName("parcel_selector").jsonObj.customProperty) {
                        sv.getQuestionByName("parcel_selector").jsonObj.customProperty = {};
                    }

                    let selectedParcels;
                    if (sv.getQuestionByName("parcel_selector").jsonObj.customProperty.parcelSelector?.selectedParcels) {
                        selectedParcels = sv.getQuestionByName("parcel_selector").jsonObj.customProperty.parcelSelector.selectedParcels;
                    }

                    sv.getQuestionByName("parcel_selector").jsonObj.customProperty.parcelSelector = new ParcelSelector(container, {
                        title: 'Predio(s) relacionado(s) con el trámite:',
                        selectedParcels: selectedParcels,
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
                    sv.getQuestionByName("parcel_selector").jsonObj.customProperty.parcelSelector.addEventListener('change', function (data) {
                        sv.setValue('selected_parcels', data.selectedParcels?.length > 0 ? data.selectedParcels.map(parcel => parcel.t_ili_tid).join(', ') : null);
                    });

                } else {
                    console.error('Parcel selector container not found');
                }
            }
        });

        survey.onMatrixRowAdded.add(function (sv, options) {
            if (options.question.name === "transacciones") {
                var prediosQuestion = options.row.getQuestionByName("predios");
                if (prediosQuestion) {
                    prediosQuestion.choices = getSelectedParcels(sv);
                }
            }
        });

        survey.onValueChanged.add(function (sv, options) {
            if (options.name === "selected_parcels") {
                sv.getQuestionByName("transacciones").visibleRows.forEach(row => {
                    var prediosQuestion = row.getQuestionByName("predios");
                    if (prediosQuestion) {
                        prediosQuestion.choices = getSelectedParcels(sv);
                    }
                });
            } else if (options.name === "documento_identidad" || options.name === "tipo_documento") {
                searchParty(sv, options);
            }
        });

        //validate data
        survey.onCompleting.add(function (sender, options) {
            if (!sender.data?.selected_parcels) {
                sender.focusQuestion("parcel_selector")
                container.querySelector("#formContainer").querySelector("#parcel-selector-container").classList.add("sd-error");
                container.querySelector("#formContainer").querySelector("#parcelError").style.display = null;

                options.allow = false;
            } else {
                container.querySelector("#formContainer").querySelector("#parcel-selector-container").classList.remove("sd-error");
                container.querySelector("#formContainer").querySelector("#parcelError").style.display = "none";
            }
        });


        $("#container-new-process").find("#formContainer").Survey({
            model: survey,
            onComplete: (survey) => sendData(survey)
        });


        const btnCancel = container.querySelector("#btnCancel");
        btnCancel.addEventListener("click", function () {
            containerBtns.classList.remove("collapse");
            container.removeChild(content);
        });
    }


}

async function searchDomains() {
    //TODO: create a cache approach
    let domaiList = {
        requesterType: 'apiSearchRequesterType',
        partyType: 'apiSearchPartyType',
        partyDocumentType: 'apiSearchPartyDocumentType',
        transactionTypes: 'apiSearchTransactionType',
    };

    for (let domain in domaiList) {

        const queryName = domaiList[domain];
        const params = {
            includeHeader: true
        };
        const data = await search(queryName, params);
        if (data.results) {
            domainValues[domain] = data.results
        }
    }
}


function getSelectedParcels(survey) {
    if (!survey) {
        return [];
    }
    let selectedParcels = survey.getQuestionByName("parcel_selector").jsonObj.customProperty.parcelSelector.selectedParcels
    return selectedParcels.map(parcel => ({ value: parcel.t_ili_tid, text: parcel.numero_predial_nacional }));
}

async function searchParty(survey) {
    if (survey?.data?.documento_identidad && survey?.data?.tipo_documento) {

        const modalInstance = showLoadingModal("Buscando...");
        try {
            const queryName = "apiSearchParty";
            const params = {
                documento_identidad: survey.data.documento_identidad,
                tipo_documento: survey.data.tipo_documento,
                includeHeader: true
            };
            const data = await search(queryName, params);
            if (!data.results) {
                data.results = {}
            }

            survey.getQuestionsByNames([
                "tipo_interesado",
                "primer_nombre",
                "segundo_nombre",
                "primer_apellido",
                "segundo_apellido",
                "razon_social",
            ]).forEach(function (question) {
                question.readOnly = data?.results;
            });

            survey.setValue("interesado_t_ili_tid", data.results["t_ili_tid"] ?? null);
            survey.setValue("tipo_interesado", data.results["tipo"] ?? null);
            survey.setValue("primer_nombre", data.results["primer_nombre"] ?? null);
            survey.setValue("segundo_nombre", data.results["segundo_nombre"] ?? null);
            survey.setValue("primer_apellido", data.results["primer_apellido"] ?? null);
            survey.setValue("segundo_apellido", data.results["segundo_apellido"] ?? null);
            survey.setValue("razon_social", data.results["razon_social"] ?? null);
        } catch (e) {
            console.error(e);
        } finally {
            hideModal(modalInstance);
        }

    }
}



async function sendData(survey) {

    if (!survey.data.tipo_interesado) {
        const NITPartyDocumentTypeId = domainValues.partyDocumentType.find(opt => opt.text === "NIT").value || null;
        const legalPartyTypeId = domainValues.partyType.find(opt => opt.text === "Persona jurídica").value || null;
        const naturalPartyTypeId = domainValues.partyType.find(opt => opt.text === "Persona natural").value || null;

        survey.setValue("tipo_interesado", survey.data.tipo_documento != NITPartyDocumentTypeId ? naturalPartyTypeId : legalPartyTypeId)
    }

    console.log(survey.data);

    const queryName = "apiInsertRequest";
    const params = {
        ...survey.data,
        includeHeader: true
    };
    const results = await upsert(queryName, params);
    console.log(results);

    if (results) {
        const container = document.getElementById("content");
        const content = document.getElementById('divSurveyForm');
        const containerBtns = container.querySelector("#container-top-buttons");
        containerBtns.classList.remove("collapse");
        container.removeChild(content);
        searchProcess('')
    } else {
        survey.clear(false);
        survey.start();
        survey.setValue("solicitud_t_ili_tid", results.results.solicitud_t_ili_tid);
        survey.setValue("interesado_t_ili_tid", results.results.interesado_t_ili_tid);
    }

}

init();