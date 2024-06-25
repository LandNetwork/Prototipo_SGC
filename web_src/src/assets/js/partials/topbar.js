import NotificationBox from '../components/NotificationBox/NotificationBox.js';
import { fetchAPI, showCustomModal, search } from '../util.js';

let urlObj = new URL(window.location.href);
let token = urlObj.searchParams.get('token');
let gui = { choices: null };
let dataSet = { actividades: null, actividadSeleccionada: null };


document.addEventListener("DOMContentLoaded", async function (event) {
    const alertContent = document.getElementById("notification-content-box");

    gui.notificationBox = new NotificationBox(alertContent);
    
    gui.notificationBox.addEventListener("click", lstActividadOnChange);

    getActividades(renderActividades);
});

// GUI

const initModal = () => {
    let modalContent = `
    <form id="frm_actividades" action="javascript:void(0);">
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
    <div class="col-xxl-6">
        <div>
            <label for="emailInput" class="form-label">Email</label>
            <input type="email" class="form-control" id="emailInput" placeholder="Enter your email">
        </div>
    </div>
    <div class="row modal-header">
        <h5>Resultado</h5>
    </div>
    <div class="row g-3">
        <div class="col-lg-12">
            <label for="lst_condicion" class="form-label">Ir a</label>
            <select id="lst_condicion" placeholder="This is a search placeholder"></select>
        </div>
        <div class="col-lg-12">
            <label for="lst_usuario" class="form-label">Asignar a</label>
            <select id="lst_usuario"></select>
        </div>
        
        <div class="col-lg-12">
            <div class="hstack gap-2 justify-content-end">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button>
                <button type="submit" id="btn_actividad_save" class="btn btn-primary">Submit</button>
            </div>
        </div><!--end col-->
    </div><!--end row-->
    </form>`;

    gui.modalInstance = showCustomModal("Detalle", modalContent, 'modal-xl');

    let btnSave = document.getElementById('btn_actividad_save');
    btnSave.addEventListener("click", btnSaveOnChange);

    let lstCondicion = document.getElementById('lst_condicion');

    gui.condicionChoices = new Choices(lstCondicion, {});

    let lstUsuario = document.getElementById('lst_usuario');

    gui.usuarioChoices = new Choices(lstUsuario, {});
    lstCondicion.addEventListener('choice', lstCondicionOnChange,false);
    lstUsuario.addEventListener('choice', lstUsuarioOnChange,false);

}

const validateChoices = () => {
    let result = true;

    if(gui.condicionChoices.getValue(true) === undefined) {
        result = false;

        highlight(gui.condicionChoices);
    }

    if(gui.usuarioChoices.getValue(true) === undefined) {
        result = false;
        highlight(gui.usuarioChoices);
    }
    return result;
}

const highlight = (choicesEle, highlight = true) => {
    let classLst = choicesEle.passedElement.element.parentNode.classList;
    if(highlight){
        classLst.add('error');
    } else {
        classLst.remove('error');
    }
}

const btnSaveOnChange = (event) => {
    const form = document.getElementById("frm_actividades");
    
    if(!validateChoices() || !form.checkValidity())
        return;

    let actividadId = gui.actividadSeleccionada;
    let tipoActividadId = gui.condicionChoices.getValue(true);
    let usuarioId = gui.usuarioChoices.getValue(true);

    let data = {
        "actividad_actual": actividadId,
        "tipo_siguiente_actividad": tipoActividadId,
        "usuario_responsable_siguiente_actividad": usuarioId
    };

    crearTransicion(data, (data) => {
        gui.notificationBox.clear();
        getActividades(renderActividades);
    });

    gui.modalInstance.hide();
}

const lstCondicionOnChange = (event) => {
    highlight(gui.condicionChoices, false);
    highlight(gui.usuarioChoices, false);

    let nuevaActividadId = event.detail.choice.value;

    getUsuarioResponsable(nuevaActividadId, renderUsuarios);
    gui.usuarioChoices.clearStore();
}

const lstActividadOnChange = (event) => {
    gui.actividadSeleccionada = event.data.value;
    let actividad = dataSet.actividades.find(ele => ele.id = gui.actividadSeleccionada);

    if(gui.modalInstance === undefined) initModal();
    else gui.modalInstance.show();

    gui.condicionChoices.clearStore();
    gui.usuarioChoices.clearStore();

    getFlujoTipoActividad(actividad.tipo_actividad, renderFlujoTipoActividad);
}

const lstUsuarioOnChange = (event) => {
    highlight(gui.usuarioChoices, false);
}

const renderActividades = (data) => {
    gui.notificationBox.add(data.map(item => { return { "value": item.id, "content": item.nombre }; }));
}

const renderFlujoTipoActividad = (data) => {
    let elements = flujoTipoActividad2Gui(data);

    gui.condicionChoices.setChoices(elements, 'value', 'label', true);
}

const renderUsuarios = (data) => {
    let elements = data.map(item => { return {"value": item.t_id, "label": item.nombre_completo + ' (' + item.rol +')'}});
    gui.usuarioChoices.setChoices(elements, 'value', 'label', true);
}

// TRANSFORM
const actividad2Gui = (inputData) => {
    let result = {};

    if (inputData != null) {
        result = inputData.map(item => { return { "value": item.id, "label": item.nombre } });
    }
    return result;
}

const flujoTipoActividad2Gui = (inputData) => {
    let result = {};

    if (inputData != null) {
        result = inputData.map(item => { return { "value": item.siguiente, "label": item.condicion_transicion + ' (' + item.nombre + ')'} });
    }
    return result;
}

// OTHER
const getActividades = (render) => {
    fetchAPI('/usuario/actividad', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {
            dataSet.actividades = data;

            render(data);
        })
        .catch(error => {
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

const getFlujoTipoActividad = (predecesora, render) => {
    fetchAPI('/flujo_tipoactividad/search?' + new URLSearchParams({ "predecesora": predecesora }), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {
            dataSet.flujoTipoActividadLst = data;
            render(data);
        })
        .catch(error => {
            console.log(error);
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

const crearTransicion = (data, callback) => {
    fetchAPI('/transicion',
        {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
                'Authorization': 'Bearer ' + token,
            }
        })
        .then(async data => {
            callback(data)
        })
        .catch(error => {
            console.log(error);
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

const getUsuarioResponsable = (tipoActividadId, renderUsuarios) => {
    fetchAPI('/tipoactividad/' + tipoActividadId + '/usuario/', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {
            renderUsuarios(data);
        })
        .catch(error => {
            console.log(error);
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}