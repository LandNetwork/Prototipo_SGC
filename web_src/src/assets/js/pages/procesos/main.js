
import { fetchAPI } from '../../util.js';

let urlObj = new URL(window.location.href);
let token = urlObj.searchParams.get('token');
var cy = null;
let choices;
let processStack = [];

let currentProcess = null;

document.addEventListener("DOMContentLoaded", function (event) {

    let element = document.getElementById('lst_transactions');

    choices = new Choices(element, {
        placeholderValue: "Procesos existentes",
        placeholder: true
    });

    getAllTransactions();

    element.addEventListener(
        'choice',
        function (event) {

            currentProcess = event.detail.choice.value;
            apiGetNodes(currentProcess);
            processStack = [];

            let backButton = document.getElementById('process_back_button');
            backButton.style.display = "none";
        },
        false,
    );

    let backButton = document.getElementById('process_back_button');

    backButton.style.display = "none";
    backButton.addEventListener('click', (event) => {
        let process = processStack.pop();

        if (process != undefined) {
            currentProcess = process;
            apiGetNodes(process);

            if (processStack.length == 0) {
                event.target.disable = true;
                event.target.style.display = "none";
            }
        }
    });
});

function apiGetNodes(id) {
    fetchAPI('/tipotransaccion/' + id + '/tipoactividad/', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {
            let elements = tipoActividad2Nodes(data);

            cy_params.elements = elements;

            cy = cytoscape(cy_params);

            cy.nodes().on('dblclick', dblClick_nodes);
            cy.nodes().on('click', click_nodes)

        })
        .catch(error => {
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

function getAllTransactions() {
    fetchAPI('/tipotransaccion', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(async data => {
            let elements = tipoActivad2Select(data);

            choices.setChoices(
                elements,
                'value',
                'label',
                true
            );

        })
        .catch(error => {
            // loader.innerHTML = '';
            // self.container.querySelector("#noresult").style.removeProperty("display");
            throw error;
        });
}

function tipoActividad2Nodes(inputData) {
    let result = {};
    let edges = null;

    if (inputData.flujo_tipoactividad != null) {
        result.edges = inputData.flujo_tipoactividad.map(item => { return { "data": { "id": item.t_id, "source": item.predecesora_ili, "target": item.siguiente_ili, "label": item.condicion_transicion } } })
    }
    if (inputData.tipoactividad != null) {
        result.nodes = inputData.tipoactividad.map(item => { return { "data": { "id": item.t_ili_tid, "label": item.nombre, "subtransaccion": item.subtransaccion } } })
    }
    return result;
}

const tipoActivad2Select = (inputData) => {
    let result = {};

    if (inputData != null) {
        result = inputData.map(item => { return { "value": item.t_id, "label": item.nombre } });
    }
    return result;
}


var cy_params = {
    container: document.getElementById('cy'),
    style: [ // Estilos para nodos y aristas
        {
            selector: 'node',
            style: {
                'text-max-width': '120px',
                'background-color':
                    function (ele) {
                        return ele.data('subtransaccion') == null ? '#0074D9' : '#AAAA39'
                    }
                ,
                'label': 'data(label)',
                'text-valign': 'center',
                'color': '#fff',
                'text-outline-width': 2,
                'text-outline-color': 
                function(ele) {
                    return ele.data('subtransaccion') == null ? '#0074d9' : '#AAAA39';
                },
                'text-wrap': 'wrap',
                'width': 'label',
                'height': 'label',
                'padding': '15px'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'text-margin-y': -10,
                'font-size': '8px',
                'text-wrap': 'wrap',
                'text-background-opacity': 1,
                'text-background-color': '#ffffff',
                'text-background-shape': 'rectangle',
                'text-background-padding': 2,
                'edge-text-rotation': 'autorotate'
            }
        }
    ],
    layout: {
        name: 'preset',
        idealEdgeLength: 200,
        nodeOverlap: 50,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 450000,
        edgeElasticity: 1000,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 2000,
        coolingFactor: 0.95,
        minTemp: 1.0,
        positions:
        {
            "d9f5e183-7e70-4448-bd6b-bb2c8c0c5c32": { "x": -87.54, "y": 184.78 },
            "ff26872f-de46-4df8-8b6a-a2b46ef57922": { "x": 222.18, "y": 172.53 },
            "da441017-8684-471d-acfc-c67aa8ff0e45": { "x": 104.94, "y": 421 },
            "b38e824b-5699-4e80-9341-16431cddad04": { "x": 568.64, "y": 249.52 },
            "121f9f2f-c8cc-4d18-b02c-fc4ee14a5d90": { "x": 810.11, "y": 181.28 },
            "26eb36ef-4fa6-4318-882b-86cb895305d2": { "x": 876.6, "y": 464.74 },
            "18b801a9-c8b9-4051-839b-6b8b059c01b8": { "x": 467.15, "y": 608.23 },
            "c8dd726a-a76c-4988-86a6-91e2174d2a67": { "x": 822.36, "y": 616.98 },
            "243f52e4-04d1-43d1-bc6c-48fa67d9f47e": { "x": 1095.32, "y": 625.73 },
            "a136cc6b-a00e-4199-ac2d-57a00b13db18": { "x": 1310.55, "y": 618.73 },
            "3d84aa7c-b0a8-4296-bf60-93d013710afa": { "x": -62.31, "y": 179.98 },
            "e306ddfe-a1ab-4d33-927c-5bbaa8de4821": { "x": 222.18, "y": 172.53 },
            "b5e32dbc-b76c-4947-a0cf-29a346fa266b": { "x": 104.94, "y": 421 },
            "4f9b0dac-e45e-4a54-ba38-05b13836dac0": { "x": 568.64, "y": 249.52 },
            "77dcff8d-5a0d-4e2d-955a-dd40cbd4a82e": { "x": 810.11, "y": 181.28 },
            "3f0da9e8-83f1-4fa9-bae4-9049cd2602d4": { "x": 985.09, "y": 316.01 },
            "84ae0b2a-44d5-4e39-9735-7434c2c05b62": { "x": 876.6, "y": 464.74 },
            "549e3ea4-b213-4c8d-b147-5ee27642fcd1": { "x": 498.68, "y": 447.12 },
            "55580d45-3b14-4142-b07a-ce4c386641d1": { "x": 467.15, "y": 608.23 },
            "ac5d9bbe-db5a-4978-b265-d58e414c96fd": { "x": 822.36, "y": 616.98 },
            "e439f9fb-cccf-4b8e-8188-835bafc626c3": { "x": 1095.32, "y": 625.73 },
            "343a1fc7-d67c-4c70-8bfd-e1224c2fc46e": { "x": 1310.55, "y": 618.73 },
            "cd65ee0c-a685-4d81-ade3-17f61e3be66b": { "x": 1694.53, "y": -180.33 },
            "9c658210-15d0-4a4a-8fb7-0943dc7d26a9": { "x": 2059.34, "y": -180.33 },
            "1018392d-cebc-47ac-b9ee-30f82e97d30d": { "x": 1659.31, "y": 46.1 },
            "8844fa0a-64aa-4284-a789-43be6c160ba7": { "x": 1530.99, "y": -343.87 },
            "4e005452-698a-4c30-a657-07c8da9b02cd": { "x": 1113.35, "y": -288.52 },
            "097e46ba-561e-4cfb-a560-469a25baf19f": { "x": 2557.49, "y": 51.13 },
            "98c0ffd3-a181-45fb-9f4c-a3eca3cce079": { "x": 2650.17, "y": -331.94 },
            "bcf21f6a-a50e-4796-89ec-2fce9f831211": { "x": 2563.03, "y": -436.12 },
            "ceccc591-dc5d-4d8c-83f5-10cf2257e76a": { "x": 2376.35, "y": -464.63 },
            "5c36bb6c-293f-49f6-8022-f7381286e0e3": { "x": 2678.26, "y": -160.2 },
            "c06f7a84-a2a3-42dd-b8c8-2cc0991402f5": { "x": 2792.45, "y": -269.04 },
            "55da60a2-5776-4342-aa29-f9b665ab2304": { "x": 2607.81, "y": -59.57 },
            "6851f5ed-a1bb-4d3a-aac5-7fd8bd14227e": { "x": 1035.36, "y": 36.04 },
            "dc2e0b68-2066-4fbb-b236-3193f8ace8c9": { "x": 1380.04, "y": -107.37 },
            "f4b8e9d2-3b0a-486d-9c54-f1a41aa6ad78": { "x": 985.09, "y": 316.01 },
            "719cd1ac-e97f-4b1e-9b2b-7d23513044b1": { "x": 498.64, "y": 438.5 },
            "a6ce3dbd-8cc8-400e-8c1e-a1edf4be7f52": { "x": 1153.6, "y": -62.08 },
            "a40131be-7ae6-4381-839d-2dacf43c1bc0": { "x": 1201.41, "y": 98.94 },
            "3e315f95-df0a-482d-8b2b-6cb038b9e8c7": { "x": 1747.36, "y": -482.24 },
            "bf2b9cb7-d7f2-4d14-9554-7e7e13d62da6": { "x": 1602.94, "y": -515.92 },
            "6b453590-9f1f-4404-b32a-a2995479ffbf": { "x": 1928.51, "y": -449.54 },
            "23706cd4-68bd-41e5-9d8e-6f2d98a88d2d": { "x": 1264.31, "y": -366.51 },
            "27cfd518-a74f-45f7-b39c-636f140b1802": { "x": 1359.91, "y": -467.15 },
            "dca615d5-ff68-4d33-8679-226e0759b4a1": { "x": 811.44, "y": -356.45 },
            "c84e8c5a-4fe0-4f8a-b476-055e5761eb8f": { "x": 806.41, "y": -270.9 },
            "ac1bc366-3ed9-47b1-9a87-3ccb5ac2074b": { "x": 851.69, "y": -182.85 },
            "267337ca-467a-4a38-af68-2891be51d1b5": { "x": 914.59, "y": -459.6 }
        }

    }
};

function dblClick_nodes(e) {
    let currentItem = e.target.data();

    if (currentItem.subtransaccion != null) {
        processStack.push(currentProcess);
        currentProcess = currentItem.subtransaccion;

        let backButton = document.getElementById('process_back_button');

        backButton.style.display = "block";
        apiGetNodes(currentItem.subtransaccion);
    }
}

let positions = {};
function click_nodes(e) {
    positions[e.target.id()] = { x: e.position.x, y: e.position.y };
    console.log(positions);
}
