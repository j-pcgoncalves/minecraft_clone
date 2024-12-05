import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export class Player {
    height = 1.75;
    radius = 0.5;

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    cameraHelper = new THREE.CameraHelper(this.camera);
    controls = new PointerLockControls(this.camera, document.body);
    debugCamera = false;

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 3);

    tool = {
        // Group that will contain the tool mesh
        container: new THREE.Group(),

        // Wether or not the tool is currently animating
        animate: false,

        // The time the animation was started
        animationStart: 0,

        // The rotation speed of the tool
        animationSpeed: 0.025,

        // Reference to the current animation
        animation: null
    };

    constructor(scene, world) {
        this.world = world;
        this.position.set(32, 32, 32);
        this.cameraHelper.visible = false;
        scene.add(this.camera);
        scene.add(this.cameraHelper);

        // Hide/show instructions based on pointer controls locking/unlocking
        this.controls.addEventListener("lock", this.onCameraLock.bind(this));
        this.controls.addEventListener("unlock", this.onCameraUnlock.bind(this));

        // The tool is parented to the camera
        this.camera.add(this.controls.container);

        // Set raycaster to use layer 0 so it doesn't interact with water mesh on layer 1
        this.raycaster.layers.set(0);
        this.camera.layers.enable(1);

        // Wireframe mesh visualizing the player's bounding cylinder
        this.boundsHelper = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
            new THREE.MeshBasicMaterial({ wireframe: true })
        );
        this.boundsHelper.visible = false;
        scene.add(this.boundsHelper);

        // Helper used to highlight the currently active block
        const selectionMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.3,
            color: 0xFFFFAA
        });
        const selectionGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        this.selectionHelper = new THREE.Mesh(selectionGeometry, selectionMaterial);
        scene.add(this.selectionHelper);
        
        // Add event listeners for keyboard/mouse events
    }

    onCameraLock() {
        document.getElementById("overlay").style.visibility = "hidden";
    }

    onCameraUnlock() {
        if (!this.debugCamera) {
            document.getElementById("overlay").style.visibility = "visible";
        }
    }

    /**
     * Returns the current world position of the player
     * @returns {THREE.Vector3}
     */
    get position() {
        return this.camera.position;
    }
}