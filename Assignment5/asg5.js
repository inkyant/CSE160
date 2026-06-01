
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


camera.position.z = 5;


const IMAGE_MAX_SIZE = 100 // max size of smaller dim, so image is larger actually
const IMAGE_DIST = 300
let currentImg = null

// light
const intensity = 3;
const light = new THREE.DirectionalLight(0xFFFFFF, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

scene.add( new THREE.AmbientLight(0xFFFFFF, .5) )

// controls
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Keyboard state
const keys = {};
window.addEventListener( 'keydown', e => { keys[e.code] = true; } );
window.addEventListener( 'keyup',   e => { keys[e.code] = false; } );

const moveSpeed = 0.5;
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3( 0, 1, 0 );

// model
// const loader = new GLTFLoader();
// const gltf = await loader.loadAsync( 'Duck.glb' );
// const bbox = new THREE.Box3().setFromObject( gltf.scene );
// const size = bbox.getSize( new THREE.Vector3() );
// const maxDim = Math.max( size.x, size.y, size.z );
// gltf.scene.scale.setScalar( 2 / maxDim );
// scene.add( gltf.scene );

// taj mahal
const loader2 = new OBJLoader();
const taj = await loader2.loadAsync( 'tajmahal.obj' );
taj.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI/2)
taj.position.x = -150
taj.position.z = -IMAGE_DIST
taj.scale.setScalar(.15)
scene.add( taj );


function handleKeyboard() {
    // Derive forward and right from current camera orientation, ignoring vertical tilt for WASD
    camera.getWorldDirection( _forward );
    _forward.y = 0;
    _forward.normalize();
    _right.crossVectors( _forward, _up );

    if ( keys['KeyW'] || keys['ArrowUp'] )    camera.position.addScaledVector( _forward,  moveSpeed );
    if ( keys['KeyS'] || keys['ArrowDown'] )  camera.position.addScaledVector( _forward, -moveSpeed );
    if ( keys['KeyA'] || keys['ArrowLeft'] )  camera.position.addScaledVector( _right,   -moveSpeed );
    if ( keys['KeyD'] || keys['ArrowRight'] ) camera.position.addScaledVector( _right,    moveSpeed );
    if ( keys['KeyQ'] )                       camera.position.y -= moveSpeed;
    if ( keys['KeyE'] )                       camera.position.y += moveSpeed;

    // Keep the orbit target in sync so OrbitControls doesn't snap back
    if ( keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || keys['KeyQ'] || keys['KeyE'] ||
         keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] ) {
        controls.target.addScaledVector( _forward,
            ( (keys['KeyW'] || keys['ArrowUp'])   ? moveSpeed : 0 ) -
            ( (keys['KeyS'] || keys['ArrowDown']) ? moveSpeed : 0 ) );
        controls.target.addScaledVector( _right,
            ( (keys['KeyD'] || keys['ArrowRight']) ? moveSpeed : 0 ) -
            ( (keys['KeyA'] || keys['ArrowLeft'])  ? moveSpeed : 0 ) );
        if ( keys['KeyQ'] ) controls.target.y -= moveSpeed;
        if ( keys['KeyE'] ) controls.target.y += moveSpeed;
    }
}

window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
} );

function animate( time ) {
    handleKeyboard();
    controls.update();
    renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );

let grid = null
function onPixel(x, y, r, g, b, a) {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );

    const material = new THREE.MeshPhongMaterial( { color: new THREE.Color(r/255, g/255, b/255) } );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.x = x - IMAGE_MAX_SIZE/2
    cube.position.y = IMAGE_MAX_SIZE/2 - y
    cube.position.z = -IMAGE_DIST
    if (grid != null && x < IMAGE_MAX_SIZE && y < IMAGE_MAX_SIZE) {
        cube.scale.set(1, 1, grid[x * IMAGE_MAX_SIZE + y]*40)
        cube.position.z = -IMAGE_DIST + grid[x * IMAGE_MAX_SIZE + y]*20
    }
    scene.add( cube );
}

// image loading
function loadImage() {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, img.width, img.height);

        let factor = 1
        if (img.height > IMAGE_MAX_SIZE || img.width > IMAGE_MAX_SIZE) {
            factor = (Math.min(img.height, img.width) / IMAGE_MAX_SIZE)|0
            console.log("image is large, factor:", factor)
        }

        for (let y = 0; y < img.height; y += factor) {
            for (let x = 0; x < img.width; x += factor) {
                const i = (y * img.width + x) * 4;
                onPixel(x/factor, y/factor, data[i], data[i+1], data[i+2], data[i+3]);
            }
        }
    };
    img.src = currentImg;
}
document.getElementById('upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImg = e.target.result;
        loadImage();
    };
    reader.readAsDataURL(file);
});

document.getElementById('load-mona').addEventListener('click', () => {
    currentImg = 'mona.jpg';
    loadImage();
});

async function loadObjHeightMap(src) {
    const obj = await new OBJLoader().loadAsync(src);
    obj.traverse(child => { if (child.isMesh) child.geometry.computeBoundsTree(); });

    const bbox = new THREE.Box3().setFromObject(obj);
    const size = bbox.getSize(new THREE.Vector3());

    const GRID = IMAGE_MAX_SIZE;
    grid = new Float32Array(GRID * GRID).fill(0);

    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            const x = bbox.min.x + (col + 0.5) / GRID * size.x;
            const z = bbox.min.z + (row + 0.5) / GRID * size.z;
            raycaster.set(new THREE.Vector3(x, bbox.max.y + 1, z), down);
            const hits = raycaster.intersectObject(obj, true);
            if (hits.length > 0) {
                grid[row * GRID + col] = (hits[0].point.y - bbox.min.y) / size.y;
            }
        }
    }
}

document.getElementById('load-taj').addEventListener('click', () => {
    loadObjHeightMap('tajmahal.obj');
});