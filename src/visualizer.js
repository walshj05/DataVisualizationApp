import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const boundingDims = { x: 10, y: 10, z: 10 };

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
    controls.update();

    camera.lookAt(0, 0, 0);

    return { scene, camera, renderer , controls};
}

const { scene, camera, renderer, controls} = initialize();


function createBoundingCube() {
    const geometry = new THREE.WireframeGeometry(new THREE.BoxGeometry(boundingDims.x, boundingDims.y, boundingDims.z));
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const cube = new THREE.LineSegments(geometry, material);

    cube.position.set(boundingDims.x / 2, boundingDims.y / 2, boundingDims.z / 2);
    return cube;
}

function populateCube() {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const steps = 1000;
    const stepSize = boundingDims.y / steps;
    for (let i = 0; i < 1000; i++) {
        const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
        const material = new THREE.MeshBasicMaterial({ color: randomColor, transparent: true, opacity: 0.5 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(Math.random() * boundingDims.x, Math.random() * boundingDims.y, Math.random() * boundingDims.z);
        scene.add(sphere);
    }
}


const boundingCube = createBoundingCube();
scene.add(boundingCube);


const axisHelper = new THREE.AxesHelper(15);
scene.add(axisHelper);

populateCube();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();