import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import Papa from 'papaparse';
import { generateTextGeometry } from './textHandler.js'; // Import the text geometry generator function

const boundingDims = { x: 15, y: 20, z: 10 }; // dimensions of the bounding box
let dataGroup = null; // group to hold plotted data points
let showTrail = false;
let file = null; // variable to hold the uploaded file reference
const helperMeshes = {
    x: null,
    y: null,
    z: null,
    axesHelper: null,
    boundingCube: null,
};

const axesIdentityStrings = {
    x: 'Heat.Map.X',
    y: 'Heat.Map.Y',
    z: 'Trial.time',
    gradient: 'zreg',
};

const fileInput = document.getElementById('csv-input');

/**
 * Handle CSV file input change event
 */
fileInput.addEventListener('change', (e) => {
    file = e.target.files?.[0];
    if (!file) return;

    loadData();
});


const sequenceButton = document.getElementById('sequence-button');
sequenceButton.addEventListener('click', () => {
    if (dataGroup) {
        revealSequence(dataGroup, 10);
    }
});

function loadData() {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsed = transformRows(results.data);
            const [zregMax, zregMin] = findMaxMin(parsed, 'zreg');
            const [tMax, tMin] = findMaxMin(parsed, 'time');
            plotDataPoints(parsed, zregMax, zregMin, tMax, tMin);
            findMaxMin(parsed, 'x');
            findMaxMin(parsed, 'y');
        },
        error: (err) => {
            console.error('CSV parse error:', err);
        }
    });
}

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
            const time = parseFloat(row[axesIdentityStrings.z]);
            const x = parseFloat(row[axesIdentityStrings.x]);
            const y = parseFloat(row[axesIdentityStrings.y]);
            const zreg = parseFloat(row[axesIdentityStrings.gradient]);

            if ([time, x, y, zreg].some(Number.isNaN)) return null;

            return {
                time: time,
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
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30; // Adjust this to control zoom level
    const orthographicCamera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,
        1000
    );
    orthographicCamera.position.z = 50; // Move the camera back to view the scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbdbdb);
    const camera = orthographicCamera;
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

// use the generateTextGeometry function to create text labels for the axes and add them to the scene
async function createAxisLabels() {
    const params = { size: 1, height: 0 };
    const xLabelGeometry = await generateTextGeometry('X', params);
    const yLabelGeometry = await generateTextGeometry('Y', params);
    const zLabelGeometry = await generateTextGeometry('Z', params);

    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const xLabelMesh = new THREE.Mesh(xLabelGeometry, material);
    const yLabelMesh = new THREE.Mesh(yLabelGeometry, material);
    const zLabelMesh = new THREE.Mesh(zLabelGeometry, material);
    helperMeshes.x = xLabelMesh;
    helperMeshes.y = yLabelMesh;
    helperMeshes.z = zLabelMesh;

    zLabelMesh.rotation.x = -Math.PI / 2; // Rotate Z label to lie flat on the XZ plane
    zLabelMesh.rotation.z = Math.PI / 2; // Rotate Y label to face the correct direction

    yLabelMesh.rotation.z = Math.PI / 2; // Rotate Y label to face the correct direction
    yLabelMesh.rotation.x = -Math.PI / 2; // Rotate Y label to lie flat on the XZ plane
    yLabelMesh.rotation.z = Math.PI / 4; // Rotate Y label to face the correct direction

    xLabelMesh.rotation.x = -Math.PI / 2; // Rotate X label to face the camera better

    xLabelMesh.position.set(1, 0, 0);
    yLabelMesh.position.set(-0.25, 0, 0.25);
    zLabelMesh.position.set(0, 0, 2);

    scene.add(xLabelMesh);
    scene.add(yLabelMesh);
    scene.add(zLabelMesh);
}

createAxisLabels();


/**
 * Plot data points in the 3D scene
 * @param {*} data array of data points to plot
 */
function plotDataPoints(data, zregMax, zregMin, tMax, tMin) {
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
        const normalizedTime = normalize(point.time, tMin, tMax);

        const pointColor = new THREE.Color().setRGB(1, 1 - normalizedzReg, 1 - normalizedzReg);

        // ensures color ranges from white to red (higher the normalized zreg, redder the point)
        const material = new THREE.MeshBasicMaterial({ color: pointColor});
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(point.x, normalizedTime * boundingDims.y, point.y);
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
    const material = new THREE.MeshBasicMaterial({ color: 0x000055, transparent: true, opacity: 0.1 });
    const cube = new THREE.Mesh(geometry, material);


    cube.position.set(boundingDims.x / 2, boundingDims.y / 2, boundingDims.z / 2);
    return cube;
}


const boundingCube = createBoundingCube();
helperMeshes.boundingCube = boundingCube;
scene.add(boundingCube);


const axisHelper = new THREE.AxesHelper(15);
helperMeshes.axesHelper = axisHelper;
scene.add(axisHelper);

/**
 * Setup GUI controls
 */
function setupGUI() {
    const gui = new GUI();
    const helpersFolder = gui.addFolder('Helpers');
    const animationFolder = gui.addFolder('Animation');
    const csvSettingFolder = gui.addFolder('CSV Settings');
    // CSV settings
    const csvParams = {
        'X Axis': axesIdentityStrings.x,
        'Y Axis': axesIdentityStrings.y,
        'Z Axis': axesIdentityStrings.z,
        'Gradient': axesIdentityStrings.gradient,
        "Load Data": () => {
            if (file) {
                loadData();
            } else {
                alert('Please upload a CSV file first.');
            }
        },
    };
    csvSettingFolder.add(csvParams, 'X Axis').onChange((value) => {
        axesIdentityStrings.x = value;
    });
    csvSettingFolder.add(csvParams, 'Y Axis').onChange((value) => {
        axesIdentityStrings.y = value;
    });
    csvSettingFolder.add(csvParams, 'Z Axis').onChange((value) => {
        axesIdentityStrings.z = value;
    });
    csvSettingFolder.add(csvParams, 'Gradient').onChange((value) => {
        axesIdentityStrings.gradient = value;
    });
    csvSettingFolder.add(csvParams, 'Load Data');
    
    
    // Animation options
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

    // Helper togglers
    helpersFolder.add(cubeParams, 'Show Cube').onChange((value) => {
        boundingCube.visible = value;
    });
    helpersFolder.add({ 'Show Axes': true }, 'Show Axes').onChange((value) => {
        axisHelper.visible = value;
    });
    helpersFolder.add({ 'Show Labels': true }, 'Show Labels').onChange((value) => {
        helperMeshes.x.visible = value;
        helperMeshes.y.visible = value;
        helperMeshes.z.visible = value;
    });
    helpersFolder.open();


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
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();