class Timeline{
    #containerRoot;
    #items;
    constructor(container){

        this.#containerRoot = new DOMParser().parseFromString(this.#getTemplate(), "text/html").body.firstElementChild;

        container.innerHTML = "";
        container.appendChild(this.#containerRoot);

        this.#items = [];
    }

    #getTemplate(){
        return `<div class="timeline"></div>`;
    }

    add(elements) {
        elements.forEach(element => {
            this.#items.push(element);

            const html = this.#getItemHtml({...this.#getDefaultValues(), ...element});

            const item = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;


            item.classList.add(this.#items.length%2 == 0? "right":"left");

            this.#containerRoot.appendChild(item);
        });
    }

    #getItemHtml(item){
        let html = this.#getItemTemplate();

        for (var key in item) {
            if (!item.hasOwnProperty(key)) {
                continue;
            }
        
            html = html.replace("{{" + key + "}}", item[key]);
        }
        return html;
    }

    #getDefaultValues() {
        return { "icon": "ri-focus-line", "date": "", "title": "", "description": "" };
    }


    #getItemTemplate(){
        return `<div class="timeline-item">
            <i class="icon {{icon}}"></i>
            <div class="date fs-13">{{date}}</div>
            <div class="content">
            <h5 class="fs-14">{{title}}</h5>
            <p class="text-muted">{{descripcion}}</p>
            </div>
            </div>
            `;
    }
}

export default Timeline;