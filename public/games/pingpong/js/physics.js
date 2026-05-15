import { state } from './state.js';
import { TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, NET_HEIGHT } from './constants.js';

export function initPhysics() {
    // 1. Initialize World
    state.world = new CANNON.World();
    state.world.gravity.set(0, -7.5, 0); // 微调重力，比真实重力稍轻，兼顾手感与真实抛物线
    state.world.broadphase = new CANNON.NaiveBroadphase();
    state.world.solver.iterations = 10;
    
    // 2. Physics Materials
    const floorMaterial = new CANNON.Material('floor');
    const tableMaterial = new CANNON.Material('table'); // Hard and bouncy
    const netMaterial = new CANNON.Material('net');     // Absorbs impact
    const ballMaterial = new CANNON.Material('ball');

    // Contact Materials
    // Ball vs Table: Olympic ITTF standard restitution (drops from 30cm, bounces ~24cm -> restitution ≈ 0.89)
    state.world.addContactMaterial(new CANNON.ContactMaterial(
        ballMaterial, tableMaterial, { friction: 0.4, restitution: 0.89 }
    ));
    
    // Ball vs Net: Net absorbs energy, ball drops
    state.world.addContactMaterial(new CANNON.ContactMaterial(
        ballMaterial, netMaterial, { friction: 0.8, restitution: 0.05 }
    ));
    
    // Ball vs Floor
    state.world.addContactMaterial(new CANNON.ContactMaterial(
        ballMaterial, floorMaterial, { friction: 0.3, restitution: 0.5 }
    ));

    state.physMaterial = { floor: floorMaterial, table: tableMaterial, net: netMaterial, ball: ballMaterial };

    // 3. Build Collision Bodies
    buildPhysicsEnvironment();
}

function buildPhysicsEnvironment() {
    // A. Floor Body
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0, material: state.physMaterial.floor });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    state.world.addBody(floorBody);

    // B. Table Top Body (Olympic Standard: 2.74m x 1.525m)
    // We make it extremely thick physically (50cm) to completely prevent high-speed downward smashes 
    // from tunneling through the table. Visually, the table remains the thin GLTF model.
    const tableThickness = 0.5; 
    const tableShape = new CANNON.Box(new CANNON.Vec3(TABLE_WIDTH / 2, tableThickness / 2, TABLE_LENGTH / 2));
    const tableBody = new CANNON.Body({ mass: 0, material: state.physMaterial.table });
    tableBody.addShape(tableShape);
    // Position it so the very top surface sits exactly at TABLE_HEIGHT (0.76m)
    tableBody.position.set(0, TABLE_HEIGHT - tableThickness / 2, 0);
    state.world.addBody(tableBody);

    // C. Net Body ("网结构")
    // Olympic Standard: 15.25cm high, extends 15.25cm outside the table on both sides
    const netWidth = TABLE_WIDTH + (0.1525 * 2); // 1.525 + 0.305 = 1.83m
    const netThickness = 0.01; // 1cm thick collision box
    const netShape = new CANNON.Box(new CANNON.Vec3(netWidth / 2, NET_HEIGHT / 2, netThickness / 2));
    const netBody = new CANNON.Body({ mass: 0, material: state.physMaterial.net });
    netBody.addShape(netShape);
    // Rests directly on top of the table at the center line
    netBody.position.set(0, TABLE_HEIGHT + NET_HEIGHT / 2, 0);
    state.world.addBody(netBody);

    state.physicsBodies = { floorBody, tableBody, netBody };
}
