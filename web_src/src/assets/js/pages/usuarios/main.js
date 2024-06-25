import '../../components/custom/loader_d.js';

document.addEventListener('DOMContentLoaded', function() {
    const contentContainer = document.getElementById('uTray');
    contentContainer.innerHTML = ''; // Clear existing content

    const usuariosElement = document.createElement('usuarios-element');
    contentContainer.appendChild(usuariosElement);
});

document.addEventListener('DOMContentLoaded', function() {
    const contentContainer = document.getElementById('rTray');
    contentContainer.innerHTML = ''; // Clear existing content

    const rolesElement = document.createElement('roles-element');
    contentContainer.appendChild(rolesElement);
});
