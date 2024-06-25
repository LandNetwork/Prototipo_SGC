import { fetchAPI, showCustomModal } from '../../util.js';

class ParcelSelector {
    constructor(container, options = {}) {
        this.container = container;
        this.selectedParcels = options.selectedParcels || [];
        this.listeners = {};

        this.config = {
            title: "Predio(s) seleccionados(s):",
            placeholder: "Buscar código predial o Matrícula inmobiliaria",
            selectedParcelsPanelVisible: true,
            tablePaneStyles: "todo-content",
            focusOnStart: false,
            ...options // Extiende o sobreescribe las configuraciones predeterminadas con las proporcionadas
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

    init() {
        this.container.innerHTML = '';

        const content = document.createElement("div");
        content.innerHTML = `
            <div class="mb-3 ${!this.config.selectedParcelsPanelVisible ? `d-none"` : ``}>
                <label for="selected-parcels" class="form-label text-muted">${this.config.title}</label>
                <input class="form-control parcel-list border-0" id="selected-parcels" />
            </div>
            
            <div class="p-3 bg-light rounded mb-4">
                <div class="row g-2">
                    
                    <div class="col-lg">
                        <div class="search-box">
                            <input type="text" id="inputSearchParcel" class="form-control search" placeholder="${this.config.placeholder}">
                            <i class="ri-search-line search-icon"></i>
                        </div>
                        <p class="mt-2 mb-0 text-muted d-none" id="lblResultsCount"></p>
                    </div>
                </div>
            </div>

            <div class="${this.config.tablePaneStyles} position-relative px-4 mx-n4">
                <div id="elmLoader" >
                </div>
                <div class="todo-task">
                    <div class="table-responsive">
                        <table class="table align-middle position-relative table-nowrap">
                            <thead class="table-active">
                                <tr>
                                    <th scope="col"><input class="form-check-input parcel-checkbox d-none" type="checkbox" id="chkSelectAll"> Código predial</th>
                                    <th scope="col">Matrícula inmobiliaria</th>
                                    <th scope="col">Dirección</th>
                                    <th scope="col">Nombre del predio</th>
                                    <th scope="col">Acciones</th>
                                </tr>
                            </thead>

                            <tbody id="parcel-list"></tbody>
                        </table>
                    </div>
                </div>
                <div class="py-4 mt-4 text-center" id="noresult" style="display: none;">
                    <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop" colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                    <h5 class="mt-4">No hay resultados</h5>
                </div>
            </div>
        `;
        this.container.appendChild(content);

        this.configureSearchInput();
        this.configureSelectedParcelsPane();
        this.configureSelectAll();

        this.emit('loaded', this);
    }

    configureSearchInput() {
        const self = this;

        const inputSearchParcel = this.container.querySelector("#inputSearchParcel");
        if (this.config.focusOnStart) {
            inputSearchParcel.focus();
        }

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
            var inputVal = inputSearchParcel.value.toLowerCase();
            self.searchParcel(inputVal);
        }, 500);

        inputSearchParcel.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                self.searchParcel(inputSearchParcel.value.toLowerCase());
            } else {
                handleSearch();
            }
        });
    }

    configureSelectedParcelsPane() {

        this.containerSelectedParcels = new Choices('#selected-parcels', {
            removeItemButton: true,
            maxItemCount: -1,
            addItems: true,
            removeItems: true,
            searchChoices: false,
            searchEnabled: false,
            paste: false,
            editItems: false,
            allowHTML: true,
            addItemText: '',
            placeholderValue: (this.selectedParcels?.length > 0 ? "" : "No hay predios seleccionados"),
            searchPlaceholderValue: "",
            items: this.selectedParcels.map(parcel => ({ value: parcel.t_ili_tid.toString(), label: parcel.numero_predial_nacional })) || [],
            callbackOnInit: function () {
                this.containerInner.element.querySelectorAll("input")[1].disabled = true;
                this.containerInner.element.classList.add("border-0");
            }
        });


        this.container.querySelector('#selected-parcels').addEventListener('removeItem', this.handleRemoveItemBound, false);
    }

    searchParcel(value) {
        const self = this;
        let urlObj = new URL(window.location.href);
        let token = urlObj.searchParams.get('token');

        self.container.querySelector("#noresult").style.display = 'none';
        const loader = this.container.querySelector("#elmLoader");
        loader.innerHTML = `
            <div class="spinner-border text-primary avatar-sm" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;

        this.container.querySelector("#parcel-list").innerHTML = "";

        const lblResultsCount = self.container.querySelector("#lblResultsCount");
        lblResultsCount.classList.add("d-none");

        this.container.querySelector("#chkSelectAll").classList.add("d-none");

        const params = {
            queryName: 'apiSearchParcel',
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
                    this.emit('onResults', data.results);
                    self.drawItems(data.results);

                    lblResultsCount.innerHTML = data.results.length + ' Resultados';

                    this.container.querySelector("#chkSelectAll").classList.remove("d-none");
                } else {
                    lblResultsCount.innerHTML = 'No hay resultados';
                    self.container.querySelector("#noresult").style.removeProperty("display");
                }
            })
            .catch(error => {
                loader.innerHTML = '';
                self.container.querySelector("#noresult").style.removeProperty("display");
                throw error;
            });
    }

    drawItems(manyParcels) {
        const self = this;

        const parcelList = this.container.querySelector("#parcel-list");
        parcelList.innerHTML = "";

        Array.from(manyParcels).forEach(function (singleParcel) {
            const checkinput = self.selectedParcels.some(parcel => parcel.t_ili_tid === singleParcel.t_ili_tid) ? "checked" : "";

            const rowElement = document.createElement('tr');
            rowElement.innerHTML = `
                <td>
                    <div class="d-flex align-items-start">
                        <div class="flex-grow-1">
                            <div class="form-check">
                                <input class="form-check-input parcel-checkbox" type="checkbox" value="${singleParcel.t_ili_tid}" id="todo-${singleParcel.t_ili_tid}" ${checkinput}>
                                <label class="form-check-label" for="todo-${singleParcel.t_ili_tid}">${singleParcel.numero_predial_nacional || ''}</label>
                            </div>
                        </div>
                    </div>
                </td>
                <td>${singleParcel.matricula || ''}</td>
                <td>${singleParcel.direccion || ''}</td>
                <td>${singleParcel.nombre_predio || ''}</td>
                <td>
                    <div class="hstack gap-2">
                        <a class="btn btn-sm btn-soft-info edit-list" data-edit-id="${singleParcel.t_ili_tid}"><i class="ri-eye-fill align-bottom"></i></a>
                    </div>
                </td>
            `;
            parcelList.appendChild(rowElement);

        });

        const viewButtons = parcelList.querySelectorAll('.edit-list');
        viewButtons.forEach(viewButton => {
            viewButton.addEventListener('click', function (e) {
                const t_ili_tid = this.getAttribute('data-edit-id')
                self.showParcelDetails(t_ili_tid);
            });
        });

        parcelList.querySelectorAll('.parcel-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const parcelID = this.value;
                const parcel = manyParcels.find(p => p.t_ili_tid.toString() === parcelID);

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

    handleRemoveItem(event, params) {
        const removedValue = event.detail.value;
        const index = this.selectedParcels.findIndex(parcel => parcel.t_ili_tid.toString() === removedValue);
        if (index > -1) {
            this.selectedParcels.splice(index, 1);
        }

        const checkboxToRemove = this.container.querySelector(`.parcel-checkbox[value="${removedValue}"]`);
        if (checkboxToRemove) {
            checkboxToRemove.checked = false;
        }
        this.checkSelectedParcels();
    }

    checkSelectedParcels() {
        this.emit('change', { selectedParcels: this.selectedParcels });
    }

    configureSelectAll() {
        const self = this;
        const chkSelectAll = this.container.querySelector("#chkSelectAll");
        chkSelectAll.addEventListener('change', function () {
            const isChecked = this.checked;
            self.container.querySelector("#parcel-list").querySelectorAll('.parcel-checkbox').forEach(checkbox => {
                checkbox.checked = isChecked;
                const event = new Event('change', {
                    'bubbles': true,
                    'cancelable': true
                });
                checkbox.dispatchEvent(event);
            });
        });
    }

    showParcelDetails(t_ili_tid) {
        console.log(t_ili_tid);

        const modalContent = `
            <form action="javascript:void(0);">
                <div class="row g-3">
                    <div class="col-xxl-6">
                        <div>
                            <label for="firstName" class="form-label">First Name</label>
                            <input type="text" class="form-control" id="firstName" placeholder="Enter firstname">
                        </div>
                    </div><!--end col-->
                    <div class="col-xxl-6">
                        <div>
                            <label for="lastName" class="form-label">Last Name</label>
                            <input type="text" class="form-control" id="lastName" placeholder="Enter lastname">
                        </div>
                    </div><!--end col-->
                    <div class="col-lg-12">
                        <label for="genderInput" class="form-label">Gender</label>
                        <div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="option1">
                                <label class="form-check-label" for="inlineRadio1">Male</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio2" value="option2">
                                <label class="form-check-label" for="inlineRadio2">Female</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio3" value="option3">
                                <label class="form-check-label" for="inlineRadio3">Others</label>
                            </div>
                        </div>
                    </div><!--end col-->
                    <div class="col-xxl-6">
                        <div>
                            <label for="emailInput" class="form-label">Email</label>
                            <input type="email" class="form-control" id="emailInput" placeholder="Enter your email">
                        </div>
                    </div><!--end col-->
                    <div class="col-xxl-6">
                        <div>
                            <label for="passwordInput" class="form-label">Password</label>
                            <input type="password" class="form-control" id="passwordInput" value="451326546">
                        </div>
                    </div><!--end col-->
                    <div class="col-lg-12">
                        <div class="hstack gap-2 justify-content-end">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button>
                            <button type="submit" class="btn btn-primary">Submit</button>
                        </div>
                    </div><!--end col-->
                </div><!--end row-->
            </form>
        `
        const modalInstance = showCustomModal("Detalles del predio", modalContent, 'modal-xl');
    }

}

export default ParcelSelector;