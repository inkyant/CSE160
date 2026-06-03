
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
let currentImg = 'mona.jpg'

// light downward
const intensity = 3;
const light = new THREE.DirectionalLight(0xFFFFFF, intensity);
light.position.set(0, 10, 0);
scene.add(light);

scene.add( new THREE.AmbientLight(0xFFFFFF, .5) )

// light from sun
const sunlight = new THREE.PointLight( 0xfbda52, 3, 0 );
sunlight.position.set( 0, 0, 100 );
scene.add( sunlight );

// controls
const controls = new PointerLockControls( camera, renderer.domElement );
renderer.domElement.addEventListener( 'click', () => controls.lock() );

const keys = {};
window.addEventListener( 'keydown', e => { keys[e.code] = true; } );
window.addEventListener( 'keyup',   e => { keys[e.code] = false; } );
const moveSpeed = 0.5;

// hand is child of camera
scene.add( camera );

const hand = new THREE.Group();
const skin = new THREE.MeshPhongMaterial( { color: 0xe0ac8b } );

const PALM_RADIUS = 0.09;
const PALM_LENGTH = 0.42;
const palm = new THREE.Mesh(
    new THREE.CapsuleGeometry( PALM_RADIUS, PALM_LENGTH, 6, 12 ), skin );
palm.position.y = -.25
hand.add( palm );

const palmFront = -( PALM_LENGTH / 2 + PALM_RADIUS );

function makeFinger( length, radius ) {
    const finger = new THREE.Mesh(
        new THREE.CylinderGeometry( radius, radius, length, 3 ), skin );
    return finger;
}

const fingerLengths = [ 0.18, 0.22, 0.21, 0.16 ];
const FINGER_SPACING = 0.06;
fingerLengths.forEach( ( len, i ) => {
    const finger = makeFinger( len, 0.025 );
    const x = ( i - ( fingerLengths.length - 1 ) / 2 ) * FINGER_SPACING;
    finger.position.set( x, 0.01, palmFront - len / 2 );
    hand.add( finger );
} );

const thumb = makeFinger( 0.14, 0.03 );
thumb.position.set( PALM_RADIUS + 0.04, -0.02, palmFront + 0.12 );
thumb.rotation.z = -Math.PI / 5;
hand.add( thumb );

hand.position.set( 0.3, -0.28, -0.9 );
hand.rotation.set( -0.15, -0.3, 0.15 );
camera.add( hand );

// model
const loaderDuck = new GLTFLoader();
const duck = await loaderDuck.loadAsync( 'Duck.glb' );
const bbox = new THREE.Box3().setFromObject( duck.scene );
const size = bbox.getSize( new THREE.Vector3() );
const maxDim = Math.max( size.x, size.y, size.z );
duck.scene.scale.setScalar( 2 / maxDim );
duck.scene.position.x = 5
duck.scene.position.z = 0
duck.scene.position.y = -1
duck.scene.rotateY(-Math.PI/2)
scene.add( duck.scene );

// talking duck
const duckBaseY = duck.scene.position.y;
const DUCK_MESSAGES = [
    "Quack! Isn't this sunset great? Click here to look around (pointer lock).",
    "Use W A S D to move, also look below us! What is going on?",
    "Is that the Taj Mahal and the Mona Lisa? Can you figure out what happened to the middle one?",
    "You can use Q and E to move down/up and get a better look. Once you have, press Escape, scroll down and choose your own file to be loaded..."
];
const CHAR_DELAY = 45; // ms per revealed character
const bubble = document.getElementById('speech-bubble');
const bubbleWorldPos = new THREE.Vector3();

let msgIndex = 0;     // which message is showing
let typing = true;    // text is actively revealing (duck bobs while true)
let msgStart = -1;    // timestamp the current message began revealing

function updateTalking(time) {
    if (msgStart < 0) msgStart = time;

    const message = DUCK_MESSAGES[msgIndex];

    // reveal the message one character at a time
    const shown = Math.floor((time - msgStart) / CHAR_DELAY);
    if (typing && shown >= message.length) {
        typing = false;
        duck.scene.position.y = duckBaseY; // settle back down
    }

    // animate duck
    if (typing) duck.scene.position.y = duckBaseY + Math.sin(time * 0.005) * 0.3;

    const text = typing ? message.slice(0, shown) : message;
    const hint = (!typing && msgIndex < DUCK_MESSAGES.length - 1)
        ? '<span class="hint">(press G to continue)</span>' : '';
    bubble.innerHTML = text + hint;

    // keep the bubble pinned above the duck on screen
    duck.scene.getWorldPosition(bubbleWorldPos);
    bubbleWorldPos.y += 1.5;
    bubbleWorldPos.project(camera);

    if (bubbleWorldPos.z > 1) {
        bubble.style.display = 'none'; // duck is behind the camera
    } else {
        bubble.style.display = 'block';
        bubble.style.left = (bubbleWorldPos.x * 0.5 + 0.5) * window.innerWidth + 'px';
        bubble.style.top  = (-bubbleWorldPos.y * 0.5 + 0.5) * window.innerHeight + 'px';
    }
}

// G advances the dialogue: finish the current line, then step to the next one.
function advanceDialogue() {
    if (typing) {
        typing = false; // reveal the rest of the current message instantly
        duck.scene.position.y = duckBaseY;
    } else if (msgIndex < DUCK_MESSAGES.length - 1) {
        msgIndex++;
        typing = true;
        msgStart = -1; // restart reveal timer on the next frame
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'KeyG' && !e.repeat) advanceDialogue();
});

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

function animate( time ) {
    updateTalking( time );
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

loadObjHeightMap('tajmahal.obj').then(() => {
    if (currentImg !== null) {
        loadImage()
    }
});