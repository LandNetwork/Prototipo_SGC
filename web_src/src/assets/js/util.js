import { DEFAULT_ENDPOINT } from './constantes.js';

export function handleError(error, userMessage) {
    console.log('Error: ', error);

    let errorMessage = document.getElementById('container-error-msg');
    if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.id = 'container-error-msg';
        document.body.appendChild(errorMessage);
    }
    errorMessage.innerHTML = userMessage;
    errorMessage.style = `position: absolute;
                          left: 50%;
                          top: 50%;
                          transform: translate(-50%, -50%);
                          font-weight: bold;
                          color: gray;
                          text-align: center;`;
}

export async function fetchAPI(endpoint, options) {
    return fetch(DEFAULT_ENDPOINT + endpoint, options)
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('Error: ' + response.statusText);
        })
        .catch(error => {
            throw error;
        });
}


export async function search(queryName, params, customEndPoint = null) {
    let urlObj = new URL(window.location.href);
    let token = urlObj.searchParams.get('token');

    const fetchParams = {
        queryName: queryName,
        params: params
    };

    try {
        return await fetchAPI(customEndPoint || '/runQuery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(fetchParams)
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function downloadFile(params, customEndPoint = null, method = 'POST') {
    let urlObj = new URL(window.location.href);
    let token = urlObj.searchParams.get('token');

    const customParams = {
        params: params
    };

    try {
        const fetchParams = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        };

        if (method !== 'GET') {
            fetchParams.body = JSON.stringify(customParams);
        }

        const response = await fetch(customEndPoint ? customEndPoint : DEFAULT_ENDPOINT + (customEndPoint || '/downloadXTF'), fetchParams);

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const contentType = response.headers.get("Content-Type");
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = 'file.xtf'; // Default filename

        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+)"?/);
            if (match.length > 1) {
                filename = match[1];
            }
        }

        if (contentType && contentType.includes("application/json")) {
            const json = await response.json();
            if (json.error) {
                throw new Error(json.error);
            }
        } else {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function uploadFile(file, customEndPoint = null) {
    let urlObj = new URL(window.location.href);
    let token = urlObj.searchParams.get('token');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch((customEndPoint ? customEndPoint : DEFAULT_ENDPOINT + '/uploadXTF'), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        return await response.json();
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}



export async function upsert(queryName, params) {
    let urlObj = new URL(window.location.href);
    let token = urlObj.searchParams.get('token');

    const fetchParams = {
        queryName: queryName,
        params: params
    };

    try {
        return await fetchAPI('/runQuery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(fetchParams)
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
}



export function showCustomModal(title, content, modalStyle = 'modal-lg') {

    const modalId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const modalHtml = `
            <div class="modal fade" data-bs-backdrop="static" id="modal-${modalId}" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered ${modalStyle}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">${content}</div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.getElementById(`modal-${modalId}`);
    const modalInstance = new bootstrap.Modal(modalElement);

    modalElement.addEventListener('show.bs.modal', function (event) {
        modalInstance.event = event;
    });

    modalInstance.show();
    return modalInstance;
}

export function showLoadingModal(textOrArray) {
    const modalId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const modalHtml = `
            <div class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" id="modal-${modalId}" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content align-items-center">
                        <div class="mt-4 spinner-border text-primary avatar-sm" role="status">
                            <span class="visually-hidden">${Array.isArray(textOrArray) ? textOrArray[0] : textOrArray}</span>
                        </div>
                        <div class="mt-4">
                            <h4 class="mb-3" id="modal-text-${modalId}">${Array.isArray(textOrArray) ? textOrArray[0] : textOrArray || ''}</h4>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.getElementById(`modal-${modalId}`);
    const modalInstance = new bootstrap.Modal(modalElement);

    if (Array.isArray(textOrArray)) {
        let index = 0;
        setInterval(() => {
            index = (index + 1) % textOrArray.length;
            const textElement = document.getElementById(`modal-text-${modalId}`);
            textElement.innerText = textOrArray[index];
        }, 2000);
    }

    modalElement.addEventListener('show.bs.modal', function (event) {
        modalInstance.event = event;
    });

    modalInstance.show();
    return modalInstance;
}



export function hideModal(modalInstance) {
    modalInstance._element.addEventListener('hidden.bs.modal', function () {
        modalInstance._element.remove();
    });

    if (modalInstance._isTransitioning) {
        /*if (modalInstance.event) {
            modalInstance.event.preventDefault();
        }*/

        modalInstance._element.addEventListener('shown.bs.modal', function () {
            modalInstance.hide();
        });
    } else {
        modalInstance.hide();
    }

}


export function showToast(message, style = 'bg-success') {
    const toastContainerId = 'toast-container';
    let toastContainer = document.getElementById(toastContainerId);

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = toastContainerId;
        toastContainer.className = 'position-fixed top-0 start-50 translate-middle-x p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${style} mt-3" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });

    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
        if (!toastContainer.hasChildNodes()) {
            toastContainer.remove();
        }
    });
}
