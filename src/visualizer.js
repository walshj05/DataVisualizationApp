import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import Papa from 'papaparse';

const boundingDims = { x: 10, y: 18, z: 10 }; // dimensions of the bounding box
let dataGroup = null; // group to hold plotted data points
let showTrail = false;

const fileInput = document.getElementById('csv-input');

/**
 * Handle CSV file input change event
 */
fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsed = transformRows(results.data);
            const [zregMax, zregMin] = findMaxMin(parsed, 'zreg');
            plotDataPoints(parsed, zregMax, zregMin);
            findMaxMin(parsed, 'x');
            findMaxMin(parsed, 'y');
        },
        error: (err) => {
            console.error('CSV parse error:', err);
        }
    });
});


const sequenceButton = document.getElementById('sequence-button');
sequenceButton.addEventListener('click', () => {
    if (dataGroup) {
        revealSequence(dataGroup, 10);
    }
});

/**
 * Reveal meshes in a group one by one with a delay
 * @param {THREE.Group} group - The group containing meshes to reveal
 * @param {number} delay - Delay in milliseconds between reveals
 */

function revealSequence(group, delay = 300) {
    const children = group.children;
    let previousChild = null;
    // Hide all meshes
    children.forEach(c => c.visible = false);

    let index = 0;

    const interval = setInterval(() => {
        if (index < children.length) {
            if (previousChild && !showTrail) {
                previousChild.visible = false;
            }
            previousChild = children[index];
            children[index].visible = true;
            index++;
        } else {
            // Reveal all again
            children.forEach(c => c.visible = true);
            clearInterval(interval);
        }
    }, delay);
}


function normalize(value, min, max) {
    if (max === min) return 0;
    return (value - min) / (max - min);
}

function transformRows(rows) {
    return rows
        .map(row => {
            const time = parseFloat(row['Trial.time']);
            const x = parseFloat(row['Heat.Map.X']);
            const y = parseFloat(row['Heat.Map.Y']);
            const zreg = parseFloat(row['zreg']);

            if ([time, x, y, zreg].some(Number.isNaN)) return null;

            return {
                time: time / 18,
                x: x * boundingDims.x,
                y: y * boundingDims.z,
                zreg,
            };
        })
        .filter(Boolean);
}

/**
 * Find the max and min values for a given key in the data array
 * @param {*} data array of data points
 * @param {*} key key to find max and min for
 * @returns {max number, min number} max and min values
 */
function findMaxMin(data, key) {
    let max = -Infinity;
    let min = Infinity;
    data.forEach(item => {
        if (item[key] > max) max = item[key];
        if (item[key] < min) min = item[key];
    });

    return [max, min];
}

/**
 * Initialize Three.js scene, camera, renderer, and controls
 */
function initialize() {
    const orthographicCamera = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        1,
        1000
    );
    orthographicCamera.position.z = 50;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbdbdb);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.target = new THREE.Vector3(boundingDims.x / 2, boundingDims.y / 2, boundingDims.z / 2);
    camera.position.set(15, 20, 15);
    camera.lookAt(controls.target);

    return { scene, camera, renderer, controls};
}

const { scene, camera, renderer, controls} = initialize();


/**
 * Plot data points in the 3D scene
 * @param {*} data array of data points to plot
 */
function plotDataPoints(data, zregMax, zregMin) {
    if (!data?.length) return;

    // Remove the previous batch of points, if any
    if (dataGroup) {
        dataGroup.traverse((node) => {
            if (node.isMesh) {
                node.geometry.dispose();
                node.material.dispose();
            }
        });
        scene.remove(dataGroup);
        dataGroup = null;
    }

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    dataGroup = new THREE.Group();

    data.forEach((point) => {
        const normalizedzReg = normalize(point.zreg, zregMin, zregMax);

        // ensures color ranges from white to red (higher the normalized zreg, redder the point)
        const pointColor = new THREE.Color().setRGB(1, 1 - normalizedzReg, 1 - normalizedzReg);
        const material = new THREE.MeshBasicMaterial({ color: pointColor });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(point.x, point.time, point.y);
        dataGroup.add(sphere);
    });

    scene.add(dataGroup);
}

/**
 * Create a semi-transparent bounding cube
 * @returns {THREE.Mesh} bounding cube mesh
 */
function createBoundingCube() {
    const geometry = new THREE.BoxGeometry(boundingDims.x, boundingDims.y, boundingDims.z);
    const material = new THREE.MeshBasicMaterial({ color: 0x00005, transparent: true, opacity: 0.1 });
    const cube = new THREE.Mesh(geometry, material);


    cube.position.set(boundingDims.x / 2, boundingDims.y / 2, boundingDims.z / 2);
    return cube;
}


const boundingCube = createBoundingCube();
scene.add(boundingCube);


const axisHelper = new THREE.AxesHelper(15);
scene.add(axisHelper);

/**
 * Setup GUI controls
 */
function setupGUI() {
    const gui = new GUI();
    const cubeFolder = gui.addFolder('Bounding Cube');
    const animationFolder = gui.addFolder('Animation');
    const animationParams = {
        'Show Trail': false,
    };
    animationFolder.add(animationParams, 'Show Trail').onChange((value) => {
        showTrail = value;
    });
    animationFolder.open();
    const cubeParams = {
        'Show Cube': true,
    };
    cubeFolder.add(cubeParams, 'Show Cube').onChange((value) => {
        boundingCube.visible = value;
    });
    cubeFolder.open();
}
setupGUI();

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();