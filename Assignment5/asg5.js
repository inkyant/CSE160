
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

scene.background = new THREE.Color( 0x15151c );
let sunsetTexture = null;
const loader = new THREE.TextureLoader();
loader.load( 'background_sunset.jpg', ( t ) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    sunsetTexture = t; // assigned to scene.background only once the player exits
} );

camera.rotation.y = -Math.PI / 2;


const IMAGE_MAX_SIZE = 100
const IMAGE_DIST = 400
let currentImg = 'mona.jpg'

// light downward
const intensity = 3;
const light = new THREE.DirectionalLight(0xFFFFFF, intensity);
light.position.set(0, 10, 0);
scene.add(light);

scene.add( new THREE.AmbientLight(0xFFFFFF, .7) )

const hallLight = new THREE.PointLight( 0xfff2dd, 40, 0 );
hallLight.position.set( 15, 7, 0 );
scene.add( hallLight );

const sunlight = new THREE.PointLight( 0xfbda52, 3, 0 );
sunlight.position.set( 0, -IMAGE_DIST + 60, 100 );
scene.add( sunlight );

// controls
const controls = new PointerLockControls( camera, renderer.domElement );
renderer.domElement.addEventListener( 'click', () => controls.lock() );

const keys = {};
window.addEventListener( 'keydown', e => { keys[e.code] = true; } );
window.addEventListener( 'keyup',   e => { keys[e.code] = false; } );

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

// collision
const colliders = [];
const stepBoxes = new Set();

function addBox( w, h, d, x, y, z, color ) {
    return addCollider( new THREE.BoxGeometry( w, h, d ), color, x, y, z );
}

// add an arbitrary mesh as a collider
function addCollider( geometry, color, x, y, z ) {
    const mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color } ) );
    mesh.position.set( x, y, z );
    mesh.updateMatrixWorld( true );
    const box = new THREE.Box3().setFromObject( mesh );
    colliders.push( box );
    scene.add( mesh );
    return box;
}

const WALL_COLOR = 0x8a8a93;
const FLOOR_COLOR = 0x9d9da6;
const STEP_COLOR = 0xb9b4ac;

// hallway
stepBoxes.add( addBox( 90, 2, 8, 15, -1, 0, FLOOR_COLOR ) );
addBox( 1, 9, 8, -30, 4.5, 0, WALL_COLOR );
addBox( 72, 9, 1, 6, 4.5, 3.5, WALL_COLOR );
addBox( 72, 9, 1, 6, 4.5, -3.5, WALL_COLOR );
addBox( 72, 1, 8, 6, 9.5, 0, WALL_COLOR );

// stair steps
const STEP_DROP = 12;
const STEP_STOP_ABOVE = 48;
const STEP_COUNT = Math.floor( ( IMAGE_DIST - 4 - STEP_STOP_ABOVE ) / STEP_DROP ) + 1;
const STEP_RADIUS = 75;
const STEP_SIZE = 7;
const STEP_SPACING = 20; // centre-to-centre arc length
const STEP_DANGLE = STEP_SPACING / STEP_RADIUS;

function stepCenter( i ) {
    const angle = i * STEP_DANGLE;
    return new THREE.Vector3(
        STEP_RADIUS * Math.cos( angle ),
        -4 - i * STEP_DROP,
        STEP_RADIUS * Math.sin( angle ) );
}

// different shapes
const STEP_R = STEP_SIZE / 2;
const stepShapes = [
    () => new THREE.BoxGeometry( STEP_SIZE, 1, STEP_SIZE ),
    () => new THREE.CylinderGeometry( STEP_R, STEP_R, 1, 24 ),
    () => new THREE.CylinderGeometry( STEP_R, STEP_R, 1, 6 ),      // hexagon
    () => new THREE.CylinderGeometry( STEP_R, STEP_R, 1, 8 ),      // octagon
    () => new THREE.CylinderGeometry( STEP_R, STEP_R, 1, 5 ),      // pentagon
];

for ( let i = 0; i < STEP_COUNT; i++ ) {
    const c = stepCenter( i );
    const geometry = stepShapes[ i % stepShapes.length ]();
    const color = new THREE.Color().setHSL( ( i / STEP_COUNT ) % 1, 0.65, 0.55 );
    stepBoxes.add( addCollider( geometry, color, c.x, c.y, c.z ) );
}

const GROUND_TOP = -IMAGE_DIST - 1;
addBox( 360, 4, 360, 0, GROUND_TOP - 2, 0, 0x6f6a63 );

// player physics
const EYE_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.4;
const GRAVITY = 32;
const WALK_SPEED = 14;
const JUMP_SPEED = 20;
const STEP_UP = 0.7;
const FALL_LIMIT = 16;

const SPAWN = new THREE.Vector3( -26, EYE_HEIGHT, 0 );
camera.position.copy( SPAWN );
let velocityY = 0;
let grounded = true;
let wantJump = false;

// respawn point
const lastSafe = SPAWN.clone();
let lastSafeIsStep = false;
let flightUnlocked = false;
const clock = new THREE.Clock();

window.addEventListener( 'keydown', e => {
    if ( e.code === 'Space' ) {
        e.preventDefault();
        if ( !e.repeat ) wantJump = true;
    }
} );

function xzOverlap( b ) {
    return camera.position.x + PLAYER_RADIUS > b.min.x &&
           camera.position.x - PLAYER_RADIUS < b.max.x &&
           camera.position.z + PLAYER_RADIUS > b.min.z &&
           camera.position.z - PLAYER_RADIUS < b.max.z;
}

// collider for mona
const HALF = IMAGE_MAX_SIZE / 2;
function sculptureTop( wx, wz ) {
    if ( grid === null ) return -Infinity;
    const yi = Math.round( HALF - wx );
    const xi = Math.round( wz + HALF );
    if ( xi < 0 || xi >= IMAGE_MAX_SIZE || yi < 0 || yi >= IMAGE_MAX_SIZE ) return -Infinity;
    const h = grid[ xi * IMAGE_MAX_SIZE + yi ];
    if ( h <= 0 ) return -Infinity; // no column here
    return -IMAGE_DIST + h * 50;
}

// stop the player walking into the sculpture
function blockSculpture( prevX, prevZ ) {
    const feet = camera.position.y - EYE_HEIGHT;
    if ( sculptureTop( camera.position.x, prevZ ) > feet + STEP_UP ) camera.position.x = prevX;
    if ( sculptureTop( camera.position.x, camera.position.z ) > feet + STEP_UP ) camera.position.z = prevZ;
}

// wall push
function resolveHorizontal() {
    const feet = camera.position.y - EYE_HEIGHT;
    const eye = camera.position.y;
    for ( const b of colliders ) {
        if ( feet >= b.max.y - 0.05 || eye <= b.min.y + 0.05 ) continue;
        const px = camera.position.x, pz = camera.position.z;
        const ox = Math.min( px + PLAYER_RADIUS, b.max.x ) - Math.max( px - PLAYER_RADIUS, b.min.x );
        const oz = Math.min( pz + PLAYER_RADIUS, b.max.z ) - Math.max( pz - PLAYER_RADIUS, b.min.z );
        if ( ox <= 0 || oz <= 0 ) continue;
        if ( ox < oz ) {
            camera.position.x += px < ( b.min.x + b.max.x ) / 2 ? -ox : ox;
        } else {
            camera.position.z += pz < ( b.min.z + b.max.z ) / 2 ? -oz : oz;
        }
    }
}

function applyGravity( dt ) {
    if ( wantJump && grounded ) { velocityY = JUMP_SPEED; grounded = false; }
    wantJump = false;

    const prevFeet = camera.position.y - EYE_HEIGHT;
    velocityY -= GRAVITY * dt;
    const newY = camera.position.y + velocityY * dt;
    const feet = newY - EYE_HEIGHT;

    let groundTop = -Infinity, support = null;
    for ( const b of colliders ) {
        if ( b.max.y <= prevFeet + STEP_UP && b.max.y > groundTop && xzOverlap( b ) ) {
            groundTop = b.max.y;
            support = b;
        }
    }
    
    const sTop = sculptureTop( camera.position.x, camera.position.z );
    let onSculpture = false;
    if ( sTop > groundTop && sTop <= prevFeet + STEP_UP ) {
        groundTop = sTop; onSculpture = true;
    }

    if ( velocityY <= 0 && groundTop > -Infinity && feet <= groundTop ) {
        camera.position.y = groundTop + EYE_HEIGHT;
        velocityY = 0;
        grounded = true;
        if ( onSculpture ) {
            lastSafe.set( camera.position.x, groundTop + EYE_HEIGHT, camera.position.z );
            lastSafeIsStep = false;
        } else {
            // save safe pos
            lastSafe.set( ( support.min.x + support.max.x ) / 2, groundTop + EYE_HEIGHT,
                          ( support.min.z + support.max.z ) / 2 );
            lastSafeIsStep = stepBoxes.has( support );
        }
    } else {
        camera.position.y = newY;
        grounded = false;
    }

    // missed jump
    const fellOffStep = lastSafeIsStep && camera.position.y < lastSafe.y - FALL_LIMIT;
    const fellOffWorld = camera.position.y < -IMAGE_DIST - 200;
    if ( !grounded && ( fellOffStep || fellOffWorld ) ) {
        camera.position.copy( lastSafe );
        velocityY = 0;
        grounded = true;
    }
}

// fly after tutorial done
function applyFlight( dt ) {
    const v = WALK_SPEED * dt;
    if ( keys['KeyE'] || keys['Space'] )        camera.position.y += v;
    if ( keys['KeyQ'] || keys['ShiftLeft'] )    camera.position.y -= v;
    velocityY = 0;
    wantJump = false;
    grounded = true;
}

function handleMovement( dt ) {
    const step = WALK_SPEED * dt;
    const px = camera.position.x, pz = camera.position.z;
    if ( keys['KeyW'] || keys['ArrowUp'] )    controls.moveForward( step );
    if ( keys['KeyS'] || keys['ArrowDown'] )  controls.moveForward( -step );
    if ( keys['KeyA'] || keys['ArrowLeft'] )  controls.moveRight( -step );
    if ( keys['KeyD'] || keys['ArrowRight'] ) controls.moveRight( step );
    resolveHorizontal();
    blockSculpture( px, pz );
}


const loaderDuck = new GLTFLoader();
const duck = await loaderDuck.loadAsync( 'Duck.glb' );
const dbox = new THREE.Box3().setFromObject( duck.scene );
const dsize = dbox.getSize( new THREE.Vector3() );
duck.scene.scale.setScalar( 2 / Math.max( dsize.x, dsize.y, dsize.z ) );

const DUCK_YAW_FIX = -Math.PI / 2;
duck.scene.position.set( 0, 0, 0 );
duck.scene.rotation.set( 0, DUCK_YAW_FIX, 0 );
const duckPivot = new THREE.Group();
duckPivot.add( duck.scene );
duckPivot.position.set( -22, 2, 0 );
scene.add( duckPivot );

const descentStep = ( i ) => stepCenter( i ).add( new THREE.Vector3( 0, 3, 0 ) );
const WAYPOINTS = [
    { pos: new THREE.Vector3( 8, 2, 0 ),
      msg: "Quack! Welcome. Click the screen to look around, then use W A S D to walk. Follow me!" },
    // { pos: new THREE.Vector3( 8, 2, 0 ),
    //   msg: "Move the mouse to look around." },
    { pos: new THREE.Vector3( 30, 2, 0 ),
      msg: "We're almost outside, come on!" },
    { pos: new THREE.Vector3( 54, 2.2, 0 ),
      msg: "Whoa, what a sunset! By the way, you can use SPACE to jump, you'll need it up ahead..." },
    { pos: descentStep( 0 ),
      msg: "Can you jump to me? Get ready for some parkour!" },
    { pos: descentStep( Math.round( STEP_COUNT * 0.1 )  ),
      msg: "What's going on down there? Is that the Mona Lisa and the Taj Mahal? What's up with the middle one?" },
    { pos: descentStep( Math.round( STEP_COUNT * 0.21 ) ),
      msg: "Keep going... you got this!" },
    { pos: descentStep( Math.round( STEP_COUNT * 0.42 ) ),
      msg: "Notice anything odd about her yet? Keep following me round." },
    { pos: descentStep( Math.round( STEP_COUNT * 0.63 ) ),
      msg: "Getting warmer... almost down." },
    { pos: descentStep( Math.round( STEP_COUNT * 0.84 ) ),
      msg: "Last few steps — come around this way." },
    { pos: descentStep( STEP_COUNT - 1 ),
      msg: "Ta-daa! She's not flat at all — it's a 3-D sculpture shaped like the Taj Mahal, painted with the Mona Lisa. From up top you only saw the tops of the blocks!" },
    { pos: descentStep( STEP_COUNT - 1 ).add( new THREE.Vector3( 0, 2, 0 ) ),
      msg: "You've earned your wings! Press E / SPACE to fly up and Q / SHIFT to fly down — go get a close look. When you're ready, press Escape, scroll down, and load your OWN image into the illusion. Quack!" },
];

const CHAR_DELAY = 42;
const CATCHUP_DIST = 9;
const CATCHUP_DELAY = 800;
const DUCK_SPEED = 11;

const bubble = document.getElementById('speech-bubble');
const bubbleWorldPos = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

let wp = 0;
let typing = true;
let msgStart = -1;
let doneTime = -1;
let arrived = false;
let reachedTime = -1;

// duck animation
function updateDuck( time, dt ) {
    const current = WAYPOINTS[wp];
    const target = current.pos;

    tmpDir.copy( target ).sub( duckPivot.position );
    const dist = tmpDir.length();
    const stepLen = DUCK_SPEED * dt;
    if ( dist > stepLen ) {
        duckPivot.position.addScaledVector( tmpDir.multiplyScalar( 1 / dist ), stepLen );
        arrived = false;
    } else {
        duckPivot.position.copy( target );
        arrived = true;
    }

    if ( arrived ) camera.getWorldPosition( lookTarget );
    else lookTarget.copy( target );
    tmpDir.set( lookTarget.x - duckPivot.position.x, 0, lookTarget.z - duckPivot.position.z );
    if ( tmpDir.lengthSq() > 0.09 ) {
        lookTarget.set( duckPivot.position.x + tmpDir.x, duckPivot.position.y, duckPivot.position.z + tmpDir.z );
        duckPivot.lookAt( lookTarget );
    }

    duck.scene.position.y = arrived ? Math.sin( time * 0.005 ) * 0.25 : 0;

    // typewriter text
    if ( msgStart < 0 ) msgStart = time;
    const shown = Math.floor( ( time - msgStart ) / CHAR_DELAY );
    if ( typing && shown >= current.msg.length ) { typing = false; doneTime = time; }

    const last = wp >= WAYPOINTS.length - 1;
    if ( last ) flightUnlocked = true; // final beat reached: grant flight right away
    const text = typing ? current.msg.slice( 0, shown ) : current.msg;
    const hint = ( !typing && !last ) ? '<span class="hint">(follow the duck)</span>' : '';
    bubble.innerHTML = text + hint;

    const playerClose = duckPivot.position.distanceTo( camera.position ) < CATCHUP_DIST;
    if ( playerClose && reachedTime < 0 ) reachedTime = time;
    else if ( !playerClose ) reachedTime = -1;
    if ( !typing && arrived && !last && reachedTime >= 0 && time - reachedTime > CATCHUP_DELAY ) {
        wp++; typing = true; msgStart = -1; arrived = false; reachedTime = -1;
    }

    // pin the bubble above the duck on screen
    duckPivot.getWorldPosition( bubbleWorldPos );
    bubbleWorldPos.y += 1.6;
    bubbleWorldPos.project( camera );
    if ( bubbleWorldPos.z > 1 ) {
        bubble.style.display = 'none';
    } else {
        bubble.style.display = 'block';
        bubble.style.left = ( bubbleWorldPos.x * 0.5 + 0.5 ) * window.innerWidth + 'px';
        bubble.style.top  = ( -bubbleWorldPos.y * 0.5 + 0.5 ) * window.innerHeight + 'px';
    }
}

// G fast-forwards the current line, then nudges the duck onward
function advanceDialogue() {
    if ( typing ) { typing = false; doneTime = -1e9; }
    else if ( wp < WAYPOINTS.length - 1 ) { wp++; typing = true; msgStart = -1; arrived = false; reachedTime = -1; }
}
window.addEventListener( 'keydown', e => {
    if ( e.code === 'KeyG' && !e.repeat ) advanceDialogue();
} );

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
  cube.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(cube));
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

let exited = false;

function animate( time ) {
    const dt = Math.min( clock.getDelta(), 0.05 );

    if ( controls.isLocked ) handleMovement( dt );
    if ( flightUnlocked ) applyFlight( dt );
    else applyGravity( dt );

    if ( !exited && sunsetTexture && camera.position.x > 22 ) {
        scene.background = sunsetTexture;
        exited = true;
    }

    updateDuck( time, dt );
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