import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import Papa from 'papaparse';

const boundingDims = { x: 10, y: 18, z: 10 }; // dimensions of the bounding box
let dataGroup = null; // group to hold plotted data points


const fileInput = document.getElementById('csv-input');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsed = transformRows(results.data);
            console.log('Parsed rows:', parsed.slice(0, 10));
            plotDataPoints(parsed);
            findMaxMin(parsed, 'x');
            findMaxMin(parsed, 'y');
            findMaxMin(parsed, 'zreg');
        },
        error: (err) => {
            console.error('CSV parse error:', err);
        }
    });
});

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

function findMaxMin(data, key) {
    let max = -Infinity;
    let min = Infinity;
    data.forEach(item => {
        if (item[key] > max) max = item[key];
        if (item[key] < min) min = item[key];
    });
    console.log(`Max ${key}:`, max, `Min ${key}:`, min);
}

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
    scene.background = new THREE.Color(0xffffff);
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


function plotDataPoints(data) {
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

    data.forEach((point, index) => {
        const pointColor = new THREE.Color().setHSL(index / (data.length * 5), 1, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: pointColor });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(point.x, point.time, point.y);
        dataGroup.add(sphere);
    });

    scene.add(dataGroup);
}
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