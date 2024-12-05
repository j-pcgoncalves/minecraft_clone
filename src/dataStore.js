export class DataStore {
    constructor() {
        this.data = {};
    }

    clear() {
        this.data = {};
    }

    contains(chunkX, chunkZ, blockX, blockY, blockZ) {
        const key = this.#getKey(chunkX, chunkZ, blockX, blockY, blockZ);
        const blockId = this.data[key];
        return blockId;
    }

    #getKey(chunkX, chunkZ, blockX, blockY, blockZ) {
        return `${chunkX},${chunkZ},${blockX},${blockY},${blockZ}`;
    }
}