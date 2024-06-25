// maplibreglLoader.js
let maplibreglPromise = null;

function loadMaplibregl() {
    if (!maplibreglPromise) {
        maplibreglPromise = Promise.all([
            new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'assets/libs/maplibre-gl/maplibre-gl.js';
                script.onload = () => resolve(window.maplibregl);
                script.onerror = reject;
                document.head.appendChild(script);
            }),
            new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'assets/libs/maplibre-gl/maplibre-gl.css'; 
                link.onload = resolve;
                link.onerror = reject;
                document.head.appendChild(link);
            })
        ]).then(([maplibregl]) => {
            return maplibregl;
        }).catch(error => {
            console.error("Failed to load maplibre-gl assets", error);
            maplibreglPromise = null; 
            throw error;
        });
    }
    return maplibreglPromise;
}

export { loadMaplibregl };
