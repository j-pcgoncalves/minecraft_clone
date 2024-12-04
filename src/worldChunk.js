import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

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
        this.generateTerrain(rng);

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

    /**
     * Get the biome at the local chunk coordinates (x, z)
     * @param {SimplexNoise} simplex
     * @param {number} x
     * @param {number} z
     */
    getBiome(simplex, x, z) {
        let noise = 0.5 * simplex.noise(
            (this.position.x + x) / this.params.biomes.scale,
            (this.position.z + z) / this.params.biomes.scale
        ) + 0.5;

        noise += this.params.biomes.variation.amplitude * (simplex.noise(
            (this.position.x + x) / this.params.biomes.variation.scale,
            (this.position.z + z) / this.params.biomes.variation.scale
        ));

        if (noise < this.params.biomes.tundraToTemperate) {
            return "Tundra";
        } else if (noise < this.params.biomes.temperateToJungle) {
            return "Temperate";
        } else if (noise < this.params.biomes.jungleToDesert) {
            return "Jungle";
        } else {
            return "Desert";
        }
    }

    /**
     * Generates the terrain data for the world
     */
    generateTerrain(rng) {
        const simplex = new SimplexNoise(rng);

        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                const biome = this.getBiome(simplex, x, z);

                // Compute the noise value at this x-z location
                const value = simplex.noise(
                    (this.position.x + x) / this.params.terrain.scale,
                    (this.position.z + z) / this.params.terrain.scale
                );

                // Scale the noise based on the magnitude/offset
                const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;

                // Computing the height of the terrain at this x-z location
                let height = Math.floor(scaledNoise);

                // Clamping height between 0 and max height
                height = Math.max(0, Math.min(height, this.size.height - 1));

                // Fill in all blocks at or below the terrain height
                for (let y = this.size.height; y >= 0; y--) {
                    if (y <= this.params.terrain.waterOffset && y === height) {
                        this.setBlockId(x, y, z, blocks.sand.id);
                    } else if (y === height) {
                        let groundBlockType;

                        if (biome === "Desert") {
                            groundBlockType = blocks.sand.id;
                        } else if (biome === "Temperate" || biome === "Jungle") {
                            groundBlockType = blocks.grass.id;
                        } else if (biome === "Tundra") {
                            groundBlockType = blocks.snow.id;
                        } else if (biome === "Jungle") {
                            groundBlockType = blocks.jungleGrass.id;
                        }

                        this.setBlockId(x, y, z, groundBlockType);

                        // Randomly generate a tree
                        if (rng.random() < this.params.trees.frequency) {
                            this.generateTree(rng, biome, x, height + 1, z);
                        }
                    }
                }
            }
        }
    }

    /**
     * Creates a tree appropriate for the biome at (x, y, z)
     * @param {string} biome
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    generateTree(rng, biome, x, y, z) {
        const minH = this.params.trees.trunk.minHeight;
        const maxH = this.params.trees.trunk.maxHeight;
        const h = Math.round(minH + (maxH - minH) * rng.random());

        for (let treeY = y; treeY < y + h; treeY++) {
            if (biome === "Temperate" || biome === "Tundra") {
                this.setBlockId(x, treeY, z, blocks.tree.id);
            } else if (biome === "Jungle") {
                this.setBlockId(x, treeY, z, blocks.jungleTree.id);
            } else if (biome === "Desert") {
                this.setBlockId(x, treeY, z, blocks.cactus.id);
            }
        }

        // Generate canopy centered on the top of the tree
    }

    /**
     * Sets the block id for the block at (x, y, z)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} id
     */
    setBlockId(x, y, z, id) {
        if (this.inBounds(x, y, z)) {
            this.data[x][y][z].id = id;
        }
    }

    /**
     * Checks if the (x, y, z) coordinates are within bounds
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    inBounds(x, y, z) {
        if (x >= 0 && x < this.size.width &&
            y >= 0 && y < this.size.height &&
            z >= 0 && z < this.size.width) {
                return true;
            } else {
                return false;
            }
    }

    disposeInstances() {
        this.traverse((obj) => {
            if (obj.dispose) obj.dispose();
        });

        this.clear();
    }
}