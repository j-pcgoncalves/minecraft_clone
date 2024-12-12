import * as THREE from "three";

export class Physics {
    constructor(scene) {
        this.helpers = new THREE.Group();
        this.helpers.visible = false;
        scene.add(this.helpers);
    }
};