
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas
});
renderer.setSize( window.innerWidth, window.innerHeight );

const loader = new THREE.TextureLoader();
const texture = loader.load(
'background_sunset.jpg',
() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
});

camera.rotation.y = -Math.PI / 2;


const IMAGE_MAX_SIZE = 100
const IMAGE_DIST = 300
let currentImg = null

// light
const intensity = 3;
const light = new THREE.DirectionalLight(0xFFFFFF, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

scene.add( new THREE.AmbientLight(0xFFFFFF, .5) )

// controls
const controls = new PointerLockControls( camera, renderer.domElement );
renderer.domElement.addEventListener( 'click', () => controls.lock() );

const keys = {};
window.addEventListener( 'keydown', e => { keys[e.code] = true; } );
window.addEventListener( 'keyup',   e => { keys[e.code] = false; } );
const moveSpeed = 0.5;

// model
const loaderDuck = new GLTFLoader();
const duck = await loaderDuck.loadAsync( 'Duck.glb' );
const bbox = new THREE.Box3().setFromObject( duck.scene );
const size = bbox.getSize( new THREE.Vector3() );
const maxDim = Math.max( size.x, size.y, size.z );
duck.scene.scale.setScalar( 2 / maxDim );
duck.scene.position.x = 5
duck.scene.position.z = -3
duck.scene.rotateY(-Math.PI/2)
scene.add( duck.scene );

loader.load('mona.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshPhongMaterial({
    map: texture,
  });
  const geometry = new THREE.BoxGeometry( IMAGE_MAX_SIZE, 1, IMAGE_MAX_SIZE );
  const cube = new THREE.Mesh(geometry, material);
  cube.position.z = 100
  cube.position.y = -IMAGE_DIST
  cube.rotateY(-Math.PI/2)
  scene.add(cube);
});

// taj mahal
const loader2 = new OBJLoader();
const taj = await loader2.loadAsync( 'tajmahal.obj' );
taj.position.y = -IMAGE_DIST
taj.position.z = -100
taj.scale.setScalar(.15)
scene.add( taj );


window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
} );

function handleKeyboard() {
    if ( !controls.isLocked ) return;
    if ( keys['KeyW'] || keys['ArrowUp'] )    controls.moveForward( moveSpeed );
    if ( keys['KeyS'] || keys['ArrowDown'] )  controls.moveForward( -moveSpeed );
    if ( keys['KeyA'] || keys['ArrowLeft'] )  controls.moveRight( -moveSpeed );
    if ( keys['KeyD'] || keys['ArrowRight'] ) controls.moveRight( moveSpeed );
    if ( keys['KeyQ'] )                       camera.position.y -= moveSpeed;
    if ( keys['KeyE'] )                       camera.position.y += moveSpeed;
}

function animate() {
    handleKeyboard();
    renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );

let grid = null
const sharedGeometry = new THREE.BoxGeometry( 1, 1, 1 );
const cubeCache = new Array(IMAGE_MAX_SIZE * IMAGE_MAX_SIZE).fill(null);

function onPixel(x, y, r, g, b, a) {
    if (x >= IMAGE_MAX_SIZE || y >= IMAGE_MAX_SIZE) return;

    const idx = y * IMAGE_MAX_SIZE + x;
    let cube = cubeCache[idx];

    if (cube === null) {
        cube = new THREE.Mesh( sharedGeometry, new THREE.MeshPhongMaterial() );
        cubeCache[idx] = cube;
        scene.add( cube );
    }

    cube.material.color.setRGB(r/255, g/255, b/255, THREE.SRGBColorSpace);
    cube.position.set(IMAGE_MAX_SIZE/2 - y, -IMAGE_DIST, x - IMAGE_MAX_SIZE/2);
    cube.scale.set(1, 1, 1);
    cube.visible = true;

    if (grid !== null) {
        cube.scale.set(1, grid[x * IMAGE_MAX_SIZE + y]*50, 1);
        cube.position.y = -IMAGE_DIST + grid[x * IMAGE_MAX_SIZE + y]*25;
    }
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

        let factorH = (img.height / IMAGE_MAX_SIZE)|0
        let factorW = (img.width / IMAGE_MAX_SIZE)|0;

        for (let y = 0; y < img.height; y += factorH) {
            for (let x = 0; x < img.width; x += factorW) {
                const i = (y * img.width + x) * 4;
                onPixel((x/factorW)|0, (y/factorH)|0, data[i], data[i+1], data[i+2], data[i+3]);
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
    loadObjHeightMap('tajmahal.obj').then(() => {
        if (currentImg !== null) {
            loadImage()
        }
    });
});