class NotificationBox {
    #container;
    #containerRoot;
    #counterEle;

    #items;
    #listeners;
    #emptyMessage;

    constructor(container, options) {
        this.#container = container;

        let root = new DOMParser().parseFromString(this.#getGlobalTemplate(), "text/html").body.firstElementChild;

        this.#containerRoot = root.querySelector('#alert-content');

        this.#counterEle = Array.from(root.querySelectorAll("#notificationDropdown .alert-counter"));
        this.#emptyMessage =  root.querySelector('#empty-notification-elem');

        container.appendChild(root);

        this.clear();
        this.#listeners = {};
    }

    #updateElementCounter() {
        let isEmpty = this.#items.length == 0;

        this.#counterEle.forEach((ele) => {
            this.#showElement(ele, !isEmpty);
            ele.textContent = this.#items.length;
        });

        this.#showElement(this.#emptyMessage, isEmpty);
    }

    clear(){
        this.#items = [];
        this.#containerRoot.innerHTML = "";
        
        this.#updateElementCounter();
    }

    add(elements) {
        elements.forEach(element => {
            let itemId = "alert-" + element.value;
            const html = this.#getItemTemplate().replace("{{ITEM_ID}}", itemId).replace("{{LINK_ID}}", "lnk-" + itemId);
            const item = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;

            const lnk = item.querySelector("#lnk-" + itemId);

            lnk.setAttribute("data-value", element.value);
            lnk.innerHTML = element.content;

            lnk.addEventListener("click", (event) => {
                let value = event.target.dataset.value;

                let data = this.#items.find(item => item.value == value);

                this.#emit("click", { "target": event.target, "data": data });
            });

            this.#containerRoot.appendChild(item);

            this.#items.push({ value: element.value, content: element.content });
        });

        this.#updateElementCounter();
    };

    addEventListener(eventType, callback) {
        if (!this.#listeners[eventType]) {
            this.#listeners[eventType] = [];
        }
        this.#listeners[eventType].push(callback);
    }

    #emit(eventType, arg) {
        if (this.#listeners[eventType]) {
            this.#listeners[eventType].forEach(callback => callback(arg));
        }
    }

    #showElement(ele, show = true){
        ele.style.display = show? "block":"none";
    }

    #getGlobalTemplate() {
        return `
        <div class="dropdown topbar-head-dropdown ms-1 header-item" id="notificationDropdown">
    
    <!-- el boton de las notificaciones -->
    <button type="button" class="btn btn-icon btn-topbar material-shadow-none btn-ghost-secondary rounded-circle" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
        <i class='bx bx-bell fs-22'></i>
        <span class="alert-counter position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">3<span class="visually-hidden">unread messages</span></span>
    </button>
    
    <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-notifications-dropdown">

        <div class="dropdown-head bg-primary bg-pattern rounded-top">
            <div class="p-3">
                <div class="row align-items-center">
                    <div class="col">
                        <h6 class="m-0 fs-16 fw-semibold text-white"> Notificaciones </h6>
                    </div>
                    <div class="col-auto dropdown-tabs">
                        <span class="alert-counter badge bg-light text-body fs-13"> 4 New</span>
                    </div>
                </div>
            </div>

            <!-- los tabs -->
            
            <div class="px-2 pt-2">
                <ul class="nav nav-tabs dropdown-tabs nav-tabs-custom" data-dropdown-tabs="true" id="notificationItemsTab" role="tablist">
                    <li class="nav-item waves-effect waves-light">
                        <a class="nav-link active" data-bs-toggle="tab" href="#alerts-tab" role="tab" aria-selected="true">
                            Alertas
                        </a>
                    </li>
                </ul>
            </div>

        </div>


        <!-- el contenido -->
        <div class="tab-content position-relative" id="notificationItemsTabContent">
            <div class="tab-pane fade show active py-2 ps-2" id="alerts-tab" role="tabpanel">
                <div id="alert-content" data-simplebar style="max-height: 300px;" class="pe-2">
                    
                </div>

                <div id="empty-notification-elem">
                                <div class="w-25 w-sm-50 pt-3 mx-auto">
                                    <img src="assets/images/svg/bell.svg" class="img-fluid" alt="user-pic">
                                </div>
                                <div class="text-center pb-5 mt-2">
                                    <h6 class="fs-18 fw-semibold lh-base">No tienes notificaciones </h6>
                                </div>
                            </div>
                    </div>

            <div class="notification-actions" id="notification-actions">
                <div class="d-flex text-muted justify-content-center">
                    Select <div id="select-content" class="text-body fw-semibold px-1">0</div> Result <button type="button" class="btn btn-link link-danger p-0 ms-3" data-bs-toggle="modal" data-bs-target="#removeNotificationModal">Remove</button>
                </div>
            </div>
        </div>
    </div>
</div>

    
    
    
    
    `;
    }

    #getItemTemplate() {
        return `<div id="{{ITEM_ID}}" class="text-reset notification-item d-block dropdown-item position-relative">
<div class="d-flex">
    <div class="avatar-xs me-3 flex-shrink-0">
        <span class="avatar-title bg-info-subtle text-info rounded-circle fs-16">
            <i class="bx bx-badge-check"></i>
        </span>
    </div>
    <div class="flex-grow-1">
        <a id="{{LINK_ID}}" href="#!" class="stretched-link" data-value>
        </a>
        <p class="mb-0 fs-11 fw-medium text-uppercase text-muted">
            <span><i class="mdi mdi-clock-outline"></i> Just 30 sec ago</span>
        </p>
    </div>
</div>
</div>`;
    }
}

export default NotificationBox;