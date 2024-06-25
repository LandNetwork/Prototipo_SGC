import Timeline from '../../components/Timeline/Timeline.js';
import { fetchAPI, showCustomModal } from '../../util.js';

let urlObj = new URL(window.location.href);
let token = urlObj.searchParams.get('token');

let gui = {
    "structure": {
        "id": "t_id",
        "columns": [
            { "text": "Número de radicado", "key": "t_ili_tid" },
            { "text": "Tipo de transacción", "key": "nombre" }
        ]
    }
};

document.addEventListener("DOMContentLoaded", async function (event) {

    const container = document.getElementById("content");

    const divWrapper = document.createElement("div");

    gui.containerRoot = new DOMParser().parseFromString(getTemplate(), "text/html").body.firstElementChild;

    divWrapper.append(gui.containerRoot);
    container.appendChild(divWrapper);

    showLoadingDataSection();
    getTransacciones(renderTransacciones);
});

// GUI
const renderTransacciones = (data) => {
    const loader = gui.containerRoot.querySelector("#elmLoader");

    loader.innerHTML = '';

    const processList = gui.containerRoot.querySelector("#process-list");

    data.forEach(ele => {
        let rowEle = document.createElement('tr');

        rowEle.innerHTML = getItemHtml(ele);

        processList.appendChild(rowEle);
    });

    gui.containerRoot.querySelectorAll('.hstack .action-button');

    const actionButtons = document.querySelectorAll('.hstack .action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            const tid = this.getAttribute('data-edit-id');

            if (gui.modalInstance === undefined) initModal();
            else gui.modalInstance.show();

            let timelineContainer = document.getElementById("timeline");
            gui.timeline = new Timeline(timelineContainer);

            getActividades(tid, renderActividades);
        });
    });
}

const renderActividades = (data) => {

    let counterActivity = 0;

    gui.timeline.add(data.map(
        item => {
            return {
                "date": item.fecha_inicio,
                "title": item.nombre,
                "descripcion": (item.descripcion != null ? item.descripcion : "") + "<br/>Asignado a " + item.nombre_completo + " (" + item.nombre_rol + ")",
                "icon": () => {
                    let result = "ri-focus-line";
                    if (counterActivity == 0)
                        result = "ri-hourglass-fill"
                    else if (counterActivity == data.length - 1)
                        result = "ri-shield-star-line";

                    counterActivity++;
                    return result;
                }
            }
        }));
}

const getItemHtml = (row) => {

    let result = "";
    let id = row[gui.structure.id];

    gui.structure.columns.forEach(item => {
        result += "<td>" + (row[item.key] || "") + "</td>";
    });

    result +=
        `<td>
        <div class="hstack gap-1">
            <a class="btn btn-sm btn-soft-info edit-list action-button" data-edit-id="${id}"><i class="ri-eye-fill align-bottom"></i></a>
         </div>
    </td>`;

    return result;
}

const showLoadingDataSection = () => {
    gui.containerRoot.querySelector("#noresult").style.display = 'none';

    const loader = gui.containerRoot.querySelector("#elmLoader");

    loader.innerHTML = `
        <div class="spinner-border text-primary avatar-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;

    gui.containerRoot.querySelector("#process-list").innerHTML = "";

}

const getTemplate = () => {

    let template =
        `<div class="col-lg-12">
        <div class="card">
            <div class="card-body">

                <div class=" position-relative px-4 mx-n4">
                    <div id="elmLoader" >
                    </div>
                    <div class="todo-task">
                        <div class="table-responsive">
                            <table class="table align-middle position-relative table-nowrap">
                                <thead class="table-active">
                                    <tr>
                                        {{columns}}
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>

                                <tbody id="process-list"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="py-4 mt-4 text-center" id="noresult">
                        <lord-icon src="assets/images/msoeawqm.json" trigger="loop" colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                        <h5 class="mt-4">No hay resultados</h5>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    let columns = "";

    gui.structure.columns.forEach(item => {
        columns += `<th scope="col">${item.text}</th>`;
    });

    return template.replace("{{columns}}", columns);
}

const initModal = () => {
    let modalContent = `
    <form id="frm_actividades" action="javascript:void(0);">
    <div class="row g-3">
        <div id="timeline"></div>
        
        <div class="col-lg-12">
            <div class="hstack gap-2 justify-content-end">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
    </form>`;

    gui.modalInstance = showCustomModal("Detalle", modalContent, 'modal-xl');
}

// OTHER
const getTransacciones = (render) => {
    fetchAPI('/transaccion', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {

            render(data);
        })
        .catch(error => {
            throw error;
        });
}

const getActividades = (transaccionId, render) => {
    fetchAPI('/transaccion/' + transaccionId + '/actividad', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {

            render(data);
        })
        .catch(error => {
            throw error;
        });
}