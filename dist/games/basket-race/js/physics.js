import * as THREE from 'three';
import { state } from './state.js';
import { PHYS_FRICTION, PHYS_RESTITUTION, GRAVITY, BALL_RADIUS } from './constants.js';

export function initPhysics() {
    state.world = new CANNON.World();
    state.world.gravity.set(0, GRAVITY, 0);
    state.world.broadphase = new CANNON.SAPBroadphase(state.world);
    state.world.solver.iterations = 20;

    state.physMaterial = new CANNON.Material("phys");
    state.netMaterial = new CANNON.Material("net");

    const contactMat = new CANNON.ContactMaterial(state.physMaterial, state.physMaterial, {
        friction: PHYS_FRICTION,
        restitution: PHYS_RESTITUTION
    });

    const netContact = new CANNON.ContactMaterial(state.physMaterial, state.netMaterial, {
        friction: 0.01,
        restitution: 0.0
    });

    state.world.addContactMaterial(contactMat);
    state.world.addContactMaterial(netContact);
}

export function createPhysicalRing(y, z, radius) {
    const segments = 16;
    const step = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
        const angle = step * i;
        const x = Math.cos(angle) * radius;
        const localZ = Math.sin(angle) * radius;
        const b = new CANNON.Body({ mass: 0, material: state.physMaterial });
        b.addShape(new CANNON.Box(new CANNON.Vec3(0.04, 0.04, 0.1)));
        b.position.set(x, y, z + localZ);
        b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
        b.userData = { isHardObject: true }; 
        state.world.addBody(b);
        state.ringBodies.push(b);
    }
}

export function createNet(cx, cy, cz, radius) {
    const cols = 14; const rows = 6;
    const startRad = radius * 0.95; 

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const angle = (c / cols) * Math.PI * 2;
            const curRad = startRad - (r * 0.065);
            const px = cx + Math.cos(angle) * curRad;
            const py = cy - (r * 0.25);
            const pz = cz + Math.sin(angle) * curRad;

            const mass = (r === 0) ? 0 : 0.03;
            const b = new CANNON.Body({
                mass: mass,
                shape: new CANNON.Sphere(0.08),
                material: state.netMaterial,
                linearDamping: 0.05
            });
            b.position.set(px, py, pz);
            b.collisionFilterGroup = 2; b.collisionFilterMask = 1;
            state.world.addBody(b);
            state.netParticles.push(b);
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const body = state.netParticles[idx];
            const nextCol = (c + 1) % cols;
            const rightBody = state.netParticles[r * cols + nextCol];
            state.world.addConstraint(new CANNON.DistanceConstraint(body, rightBody, body.position.distanceTo(rightBody.position)));
            if (r < rows - 1) {
                const downBody = state.netParticles[(r + 1) * cols + c];
                state.world.addConstraint(new CANNON.DistanceConstraint(body, downBody, body.position.distanceTo(downBody.position)));
            }
        }
    }

    // --- 创建篮网视觉效果 ---
    const lineCount = (rows * cols * 2) - cols; // 每点向右、向下连线
    const netGeo = new THREE.BufferGeometry();
    netGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineCount * 3 * 2), 3));
    const netLines = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    state.scene.add(netLines);
    state.netLinesGeo = netGeo;
}

export function createBoxColliderFromMesh(mesh) {
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) return;

    const size = new THREE.Vector3();
    bbox.getSize(size);
    if (size.x < 0.2 && size.y < 0.2 && size.z < 0.2) return;

    const name = (mesh.name || "").toLowerCase();
    if (name.includes('net') || name.includes('score_detector')) return;

    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    const ws = new THREE.Vector3();
    mesh.updateMatrixWorld(true);
    mesh.matrixWorld.decompose(wp, wq, ws);

    const halfExtents = new CANNON.Vec3(
        Math.max(0.01, (size.x * ws.x) / 2),
        Math.max(0.01, (size.y * ws.y) / 2),
        Math.max(0.01, (size.z * ws.z) / 2)
    );

    const body = new CANNON.Body({ mass: 0, material: state.physMaterial });
    body.addShape(new CANNON.Box(halfExtents));

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    center.applyMatrix4(mesh.matrixWorld);

    body.position.copy(center);
    body.quaternion.copy(wq);
    state.world.addBody(body);

    if (state.debugPhysics) {
        const hg = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
        const hm = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.5 });
        const hmesh = new THREE.Mesh(hg, hm);
        hmesh.position.copy(body.position);
        hmesh.quaternion.copy(body.quaternion);
        state.scene.add(hmesh);
        state.debugHelpers.push(hmesh);
    }
}
