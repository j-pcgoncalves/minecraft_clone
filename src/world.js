import * as THREE from "three";

import { DataStore } from "./dataStore";
import { WorldChunk } from "./worldChunk";

export class World extends THREE.Group {
    /**
     * Whether or not we want to load the chunks asynchronously
     */
    asyncLoading = true;

    /**
     * The number of chunks to render around the player.
     * When this is set to 0, the chunk the player is on
     * is the only one that is rendered. If it is set to 1,
     * the adjacent chunks are rendered; if set to 2, the
     * chunks adjacent to those are rendered, and so on.
     */
    drawDistance = 3

    chunkSize = {
        width: 32,
        height: 32
    };

    params = {
        seed: 0,
        terrain: {
            scale: 100,
            magnitude: 8,
            offset: 6,
            waterOffset: 4
        },
        biomes: {
            scale: 500,
            variation: {
                amplitude: 0.2,
                scale: 50
            },
            tundraToTemperate: 0.25,
            temperateToJungle: 0.5,
            jungleToDesert: 0.75
        },
        trees: {
            trunk: {
                minHeight: 4,
                maxHeight: 7
            },
            canopy: {
                minRadius: 3,
                maxRadius: 3,
                density: 0.7 // Vary between 0.0 and 1.0
            },
            frequency: 0.005
        },
        clouds: {
            scale: 30,
            density: 0.3
        }
    };

    dataStore = new DataStore();

    constructor(seed = 0) {
        super();
        this.seed = seed;

        document.addEventListener("keydown", (ev) => {
            switch (ev.code) {
                case "F2":
                    this.save();
                    break;
                case "F4":
                    this.load();
                    break;
            }
        });
    }

    /**
     * Saves the world data to local storage
     */
    save() {
        localStorage.setItem("minecraft_params", JSON.stringify(this.params));
        localStorage.setItem("minecraft_data", JSON.stringify(this.dataStore.data));
        document.getElementById("status").innerHTML = "GAME SAVED";
        setTimeout(() => document.getElementById("status").innerHTML = "", 3000);
    }

    /**
     * Loads the game from local storage
     */
    load() {
        this.params = JSON.parse(localStorage.getItem("minecraft_params"));
        this.dataStore.data = JSON.parse(localStorage.getItem("minecraft_data"));
        document.getElementById("status").innerHTML = "GAME LOADED";
        setTimeout(() => document.getElementById("status").innerHTML = "", 3000);
        this.generate();
    }

    /**
     * Regenerate the world data model and the meshes
     */
    generate(clearCache = false) {
        if (clearCache) {
            this.dataStore.clear();
        }

        this.disposeChunks();

        for (let x = -this.drawDistance; x <= this.drawDistance; x++) {
            for (let z = -this.drawDistance; z <= this.drawDistance; z++) {
                this.generateChunk(x, z);
            }
        }
    }

    /**
     * Generates the chunk at the (x, z) coordinates
     * @param {number} x
     * @param {number} z
     */
    generateChunk(x, z) {
        const chunk = new WorldChunk(this.chunkSize, this.params, this.dataStore);
        chunk.position.set(
            x * this.chunkSize.width,
            0,
            z * this.chunkSize.width
        );
        chunk.userData = { x, z };

        if (this.asyncLoading) {
            requestIdleCallback(chunk.generate.bind(chunk), { timeout: 1000 });
        } else {
            chunk.generate();
        }

        this.add(chunk);
        console.log(`Adding chunk at X: ${x} Z: ${z}`);
    }

    /**
     * Returns the coordinates of the block at world (x, y, z)
     *  - `chunk` is the coordinates of the chunk containing the block
     *  - `block` is the coordinates of the block relative to the chunk
     * @param {number} x 
     * @param {number} y 
     * @param {number} z
     * @returns {{
     *  chunk: { x: number, z: number },
     *  block: { x: number, y: number, z: number }
     * }} 
     */
    worldToChunkCoords(x, y, z) {
        const chunkCoords = {
            x: Math.floor(x / this.chunkSize.width),
            z: Math.floor(z / this.chunkSize.width)
        };

        const blockCoords = {
            x: x - this.chunkSize.width * chunkCoords.x,
            y,
            z: z - this.chunkSize.width * chunkCoords.z
        };

        return {
            chunk: chunkCoords,
            block: blockCoords
        };
    };

    /**
     * Returns the WorldChunk object at the specified coordinates
     * @param {number} chunkX
     * @param {number} chunkZ
     * @returns {WorldChunk | null}
     */
    getChunk(chunkX, chunkZ) {
        return this.children.find((chunk) => (
            chunk.userData.x === chunkX &&
            chunk.userData.z === chunkZ
        ));
    };

    disposeChunks() {
        this.traverse((chunk) => {
            if (chunk.disposeInstances) {
                chunk.disposeInstances();
            }
        });

        this.clear();
    }

    /**
     * Adds a new block at (x, y, z) of type `blockId`
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     */
    addBlock(x, y, z, blockId) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if (chunk) {
            chunk.addBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z,
                blockId
            );

            // Hide neighboring blocks of they are completely obscured
            this.hideBlock(x - 1, y, z);
            this.hideBlock(x + 1, y, z);
            this.hideBlock(x, y - 1, z);
            this.hideBlock(x, y + 1, z);
            this.hideBlock(x, y, z - 1);
            this.hideBlock(x, y, z + 1);
        };
    };

    /**
     * Removes the block at (x, y, z) and sets it to empty
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    removeBlock(x, y, z) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        // Don't allow removing the first layer of blocks
        if (coords.block.y === 0) return;

        if (chunk) {
            chunk.removeBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );

            // Reveal adjacent neighbors if they are hidden
            this.revealBlock(x - 1, y, z);
            this.revealBlock(x + 1, y, z);
            this.revealBlock(x, y - 1, z);
            this.revealBlock(x, y + 1, z);
            this.revealBlock(x, y, z - 1);
            this.revealBlock(x, y, z + 1);
        };
    };

    /**
     * Reveals the block at (x, y, z) by adding a new mesh instance
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    revealBlock(x, y, z) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if (chunk) {
            chunk.addBlockInstance(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        };
    };

    /**
     * Hides the block at (x, y, z) by removing the mesh instance
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    hideBlock(x, y, z) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if (chunk && chunk.isBLockObscured(coords.block.x, coords.block.y, coords.block.z)) {
            chunk.deleteBlockInstance(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        };
    };
}