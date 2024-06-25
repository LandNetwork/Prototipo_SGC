import { fetchAPI } from '../../util.js';

let btnValidar = document.getElementById('btnValidar');
btnValidar.addEventListener('click', onBtnValidarClick);

function onBtnValidarClick(e) {
    e.preventDefault();
    var form = document.getElementById('frmLogin');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    getAuthorization(form['username'].value, form['password-input'].value);
}


function getAuthorization(user, password) {
    let userData = { user, password };

    return fetchAPI('/getToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
        .then(data => {
            if(data.token){

                let urlObj = new URL(window.location.href);
                let dest = urlObj.searchParams.get('dest');
                window.location.href = (dest ? dest : './index.html') + '?token=' + encodeURIComponent(data.token);
            }else{
                Swal.fire({
                    title: 'Error de sistema',
                    text: 'Ocurrió un error al iniciar sesión, por favor inténtalo nuevamente.',
                    icon: 'error',
                    customClass: {
                        confirmButton: 'btn btn-danger w-xs mt-2',
                    },
                    buttonsStyling: false,
                    showCloseButton: true
                });
            }
            
        })
        .catch(error => {
            Swal.fire({
                title: 'Acceso Denegado',
                text: 'Usuario o contraseña incorrectos. Por favor, verifica tus datos',
                icon: 'error',
                customClass: {
                    confirmButton: 'btn btn-danger w-xs mt-2',
                },
                buttonsStyling: false,
                showCloseButton: true
            });
            throw error;
        });
}
