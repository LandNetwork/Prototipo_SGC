import '../../components/custom/loader_d.js';

document.addEventListener('DOMContentLoaded', function() {
    const contentContainer = document.getElementById('tray');
    contentContainer.innerHTML = ''; // Clear existing content

    const interesadosElement = document.createElement('interesados-element');
    contentContainer.appendChild(interesadosElement);
});
