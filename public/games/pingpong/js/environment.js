import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TABLE_HEIGHT, ROOM_SIZE, RENDER_CONFIG } from './constants.js';
import { state } from './state.js';

export function buildEnvironment() {
    // A. Floor (Premium Dark Wood)
    const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    state.scene.add(floor);

    // B. Load 3D Model (GLB)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        './assets/models/pingpong.glb',
        (gltf) => {
            const model = gltf.scene;
            
            // Rotate the model by 90 degrees to align its length with the Z-axis,
            // perfectly matching the Cannon.js physics bounding boxes.
            model.rotation.y = Math.PI / 2;
            
            // Enable shadows and fix Z-fighting for the loaded model
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            mat.polygonOffset = true;
                            
                            // Fix Z-fighting for white/light decals
                            if (mat.color && (mat.color.r > 0.8 && mat.color.g > 0.8 && mat.color.b > 0.8)) {
                                mat.polygonOffsetFactor = RENDER_CONFIG.materials.zFightingOffset;
                                mat.polygonOffsetUnits = RENDER_CONFIG.materials.zFightingOffset;
                            } else {
                                mat.polygonOffsetFactor = 1;
                                mat.polygonOffsetUnits = 1;
                            }

                            // Boost Emissive Intensity
                            if (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
                                mat.emissiveIntensity = (mat.emissiveIntensity || 1) * RENDER_CONFIG.materials.emissiveBoost;
                            }
                        });
                    }
                }
            });

            state.scene.add(model);
        },
        (progress) => {
            console.log('Loading model...', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error loading pingpong model:', error);
        }
    );

    // C. Environment Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, RENDER_CONFIG.lighting.ambientIntensity);
    state.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, RENDER_CONFIG.lighting.directionalIntensity);
    mainLight.position.set(2, 5, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    mainLight.shadow.camera.left = -5;
    mainLight.shadow.camera.right = 5;
    mainLight.shadow.camera.top = 5;
    mainLight.shadow.camera.bottom = -5;
    state.scene.add(mainLight);

    // D. Focused Spotlights
    const setupSpotLight = (x, y, z) => {
        const light = new THREE.SpotLight(0xffffff, RENDER_CONFIG.lighting.spotlightIntensity);
        light.position.set(x, y, z);
        light.target.position.set(0, TABLE_HEIGHT, 0);
        state.scene.add(light.target);
        light.castShadow = true;
        
        light.shadow.bias = RENDER_CONFIG.lighting.shadowBias;
        light.shadow.normalBias = RENDER_CONFIG.lighting.shadowNormalBias;
        
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        
        state.scene.add(light);
        return light;
    };

    setupSpotLight(2, 6, 2);
    setupSpotLight(-2, 6, -2);
}
