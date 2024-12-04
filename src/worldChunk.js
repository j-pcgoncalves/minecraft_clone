import * as THREE from "three";

import { RNG } from "./rng";
import { blocks } from "./blocks";

export class WorldChunk extends THREE.Group {
    /**
     * @type {{
     *  id: number,
     *  instanceId: number
     * }[][][]}
     */
    data = [];

    constructor(size, params, dataStore) {
        super();
        this.loaded = false;
        this.size = size;
        this.params = params;
        this.dataStore = dataStore;
    }

    /**
     * Generates the world data and meshes
     */
    generate() {
        const start = performance.now();

        const rng = new RNG(this.params.seed);

        this.initializeTerrain();

        this.loaded = true;

        console.log(`Loaded chunk in ${performance.now() - start}ms`);
    }

    /**
     * Initializes an empty world
     */
    initializeTerrain() {
        this.data = [];

        for (let x = 0; x < this.size.width; x++) {
            const slice = [];
            
            for (let y = 0; y < this.size.height; y++) {
                const row = [];

                for (let z = 0; z < this.size.width; z++) {
                    row.push({
                        id: blocks.empty.id,
                        instanceId: null
                    });
                }

                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    disposeInstances() {
        this.traverse((obj) => {
            if (obj.dispose) obj.dispose();
        });

        this.clear();
    }
}