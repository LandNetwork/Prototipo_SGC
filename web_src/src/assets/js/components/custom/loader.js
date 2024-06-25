import React from 'react';
import ReactDOM from 'react-dom';
import { TrayContainer } from 'qtf-renderer';

class UsuriosElement extends HTMLElement {
    connectedCallback() {
        const mountPoint = document.createElement('div');
        this.appendChild(mountPoint);

        ReactDOM.render(<TrayContainer tableName={"gp_usuario"} exceptions={"t_basket,t_ili_tid,llave,llave_caduca"} />, mountPoint);
    }

    disconnectedCallback() {
        ReactDOM.unmountComponentAtNode(this);
    }
}

customElements.define('usuarios-element', UsuriosElement);

class InteresadosElement extends HTMLElement {
    connectedCallback() {
        const mountPoint = document.createElement('div');
        this.appendChild(mountPoint);

        ReactDOM.render(<TrayContainer tableName={"gc_interesado"} exceptions={"t_basket,t_ili_tid"} />, mountPoint);
    }

    disconnectedCallback() {
        ReactDOM.unmountComponentAtNode(this);
    }
}

customElements.define('interesados-element', InteresadosElement);

class RolesElement extends HTMLElement {
    connectedCallback() {
        const mountPoint = document.createElement('div');
        this.appendChild(mountPoint);

        ReactDOM.render(<TrayContainer tableName={"gp_tiporol"} exceptions={"t_basket,t_ili_tid"} />, mountPoint);
    }

    disconnectedCallback() {
        ReactDOM.unmountComponentAtNode(this);
    }
}

customElements.define('roles-element', RolesElement);