import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { state } from './state.js';
import { BALL_RADIUS, GLB_SCALE, HOOP_POS } from './constants.js';

export function createBasketballTexture(color = 0xff8800) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 400);
    grad.addColorStop(0, '#' + new THREE.Color(color).getHexString());
    grad.addColorStop(1, '#' + new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.2).getHexString());
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let x = 0; x < 512; x += 4) {
        for (let y = 0; y < 512; y += 4) {
            const offset = (Math.floor(y / 4) % 2) * 2;
            ctx.beginPath(); ctx.arc(x + offset, y, 1.0, 0, Math.PI * 2); ctx.fill();
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    if (state.renderer) tex.anisotropy = state.renderer.capabilities.getMaxAnisotropy();
    return tex;
}

export function loadAssets(onComplete) {
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/games/basket-race/lib/draco/');
    loader.setDRACOLoader(dracoLoader);

    let assetsLoaded = 0;
    const totalAssets = 2;

    const checkDone = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            const ld = document.getElementById('loading-overlay');
            if (ld) {
                ld.style.opacity = '0';
                setTimeout(() => { ld.style.display = 'none'; }, 500);
            }
            if (onComplete) onComplete();
        }
    };

    loader.load('assets/court.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0); model.scale.set(GLB_SCALE, GLB_SCALE, GLB_SCALE);
        state.scene.add(model);
        model.traverse(child => {
            if (child.isMesh) {
                console.log("Found mesh:", child.name);
                child.castShadow = true; child.receiveShadow = true;
                const name = (child.name || "").toLowerCase();
                if (name.includes('hoop') || name.includes('ring')) {
                    const worldPos = new THREE.Vector3(); child.getWorldPosition(worldPos);
                    Object.assign(HOOP_POS, worldPos);
                }
            }
        });
        checkDone();
    }, undefined, checkDone);

    loader.load('assets/basketball.glb', (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const wrapper = new THREE.Group();
        model.position.sub(center); wrapper.add(model);
        state.basketballTemplate = wrapper;
        checkDone();
    }, undefined, checkDone);
}
