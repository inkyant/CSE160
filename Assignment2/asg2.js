
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

// global vars
let canvas;
/** @type {WebGLRenderingContext} */
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

let currentViewMatrix = new Matrix4()

const sliderNames = [
    "thighSlider",
    "calfSlider",
    "headSlider",
    "eyeSlider",
    "bodyXSlider",
    "bodyYSlider",
    "bodyAngleSlider",
    "rubySlider",
    "tailSlider",
    "addedJointSlider"
]
let sliders = []
let sliderVals = []
let sliderDir = []
let isAnimating = false
let specialAnim = false
let count = 0

let viewSliderPitch
let viewSliderYaw
let globalYaw = 340
let globalPitch = 340
let canvas_drag_sensitivity = 0.7

let addedJoint = {
    exists: false,
    shape: 'cube',
    size: [0, 0, 0],
    color: [0, 0, 0, 1],
    pos: [0, 0, 0],
    jointPos: [0, 0, 0],
    jointAxis: [0, 0, 1],
    jointMax: 0,
    jointMin: 0,
    parent: null
}

function main() {
    setupWebGL()
    connectVariablesToGLSL()
    addActionsForHtmlUI()

    // Specify the color for clearing <canvas>
    gl.clearColor(0.1, 0.5, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateRotation()
    render()
}

function addActionsForHtmlUI() {

    document.getElementById('animButton').onclick = () => { 
        isAnimating = !isAnimating 
        document.getElementById('animButton').innerText = isAnimating ? 'Pause Animation' : 'Play Animation'
    }

    document.getElementById('addJointButton').onclick = () => {
        const width  = parseFloat(document.getElementById('widthInput').value)/100  || 0.2;
        const height = parseFloat(document.getElementById('heightInput').value)/100 || 0.2;
        const depth  = parseFloat(document.getElementById('depthInput').value)/100  || 0.2;

        const r = parseFloat(document.getElementById('colorR').value) / 255 || 0;
        const g = parseFloat(document.getElementById('colorG').value) / 255 || 0;
        const b = parseFloat(document.getElementById('colorB').value) / 255 || 0;

        const posX = parseFloat(document.getElementById('posX').value)/100 || 0;
        const posY = parseFloat(document.getElementById('posY').value)/100 || 0;
        const posZ = parseFloat(document.getElementById('posZ').value)/100 || 0;

        const rotAx = document.getElementById('rotationAxis').value;

        const anchorX = parseFloat(document.getElementById('anchorX').value)/100 || 0;
        const anchorY = parseFloat(document.getElementById('anchorY').value)/100 || 0;
        const anchorZ = parseFloat(document.getElementById('anchorZ').value)/100 || 0;

        const rotMin = parseFloat(document.getElementById('rotMin').value) || 0;
        const rotMax = parseFloat(document.getElementById('rotMax').value) || 0;

        const parent = document.getElementById('parentSelect').value;
        addedJoint.shape = document.getElementById('shape').value;


        if (rotMin > rotMax) {
            let temp = rotMin
            rotMin = rotMax
            rotMax = temp
        }

        addedJoint.exists = true
        addedJoint.size = [width, height, depth]
        addedJoint.color = [r, g, b, 1]
        addedJoint.pos = [posX, posY, posZ]
        addedJoint.jointPos = [-anchorX, -anchorY, -anchorZ]
        addedJoint.jointMax = rotMin
        addedJoint.jointMin = rotMax
        addedJoint.jointAxis = rotAx == 'Z' ? [0, 0, 1] : (rotAx == 'X' ? [1, 0, 0] : [0, 1, 0])
        addedJoint.parent = parent
        let addedJointAngle = (rotMin + rotMax)/2 

        sliders[9].value = addedJointAngle
        sliderVals[9] = addedJointAngle
        sliders[9].min = rotMin
        sliders[9].max = rotMax

        document.getElementById('addJointButton').innerText = 'Update'

        render();
    }

    viewSliderPitch = document.getElementById('viewSliderPitch')
    viewSliderYaw = document.getElementById('viewSliderYaw')
    viewSliderPitch.addEventListener('mousemove', updateRotation)
    viewSliderYaw.addEventListener('mousemove', updateRotation)
    
    for (let i = 0; i < sliderNames.length; i++) {
        sliders.push(
            document.getElementById(sliderNames[i])
        )
        sliders[i].addEventListener('mousemove', () => {
            sliderVals[i] = sliders[i].value
            render()
        })
        sliderVals.push(
            sliders[i].value
        )
        sliderDir.push(1)
    }

    requestAnimationFrame(tick)
    
    canvas.onmousedown = (e) => {

        if (e.shiftKey && !specialAnim) {
            specialAnim = true
        }

        canvas_x_drag_init = e.clientX;
        canvas_y_drag_init = e.clientY;
        canvas_x_drag_prev = e.clientX;
        canvas_y_drag_prev = e.clientY;
        canvas_drag_last_poll = performance.now();
        

        global_yaw_init = globalYaw;
        global_pitch_init = globalPitch;
        canvas_x_drag_vel = canvas_y_drag_vel = 0;

        render();

        canvas.onmousemove = (e) => {
            const total_x_delta = e.clientX - canvas_x_drag_init;
            const total_y_delta = e.clientY - canvas_y_drag_init;

            const t_delta = performance.now() - canvas_drag_last_poll;
            canvas_x_drag_vel = (e.clientX - canvas_x_drag_prev) / t_delta; // delta per ms
            canvas_y_drag_vel = (e.clientY - canvas_y_drag_prev) / t_delta; // delta per ms

            canvas_x_drag_vel =
                Math.sign(canvas_x_drag_vel) *
                Math.sqrt(Math.abs(canvas_x_drag_vel * 0.1)) *
                0.9;
            canvas_y_drag_vel =
                Math.sign(canvas_y_drag_vel) *
                Math.sqrt(Math.abs(canvas_y_drag_vel * 0.1)) *
                0.9;

            canvas_x_drag_prev = e.clientX;
            canvas_y_drag_prev = e.clientY;
            canvas_drag_last_poll = performance.now();

            globalYaw =
                global_yaw_init - total_x_delta * canvas_drag_sensitivity;
            globalPitch =
                global_pitch_init - total_y_delta * canvas_drag_sensitivity;

            viewSliderYaw.value = globalYaw;
            viewSliderPitch.value = globalPitch;

            currentViewMatrix.setRotate(globalPitch, 1, 0, 0)
            currentViewMatrix.rotate(globalYaw, 0, 1, 0)
            render();
        };
        document.onmouseup = () => {
            canvas.onmousemove = null;
        };
    };
}

function updateRotation() {
    globalYaw = viewSliderYaw.value
    globalPitch = viewSliderPitch.value
    currentViewMatrix.setRotate(viewSliderPitch.value, 1, 0, 0)
    currentViewMatrix.rotate(viewSliderYaw.value, 0, 1, 0)
    render()
}

let prev_time = 0
let fps_display = null

function tick() {
    if (!fps_display) fps_display = document.getElementById('fps')

    let time = performance.now()
    if (prev_time !== 0) {
        fps_display.textContent = 'FPS: ' + Math.round(1000 / (time - prev_time))
    }
    let delta = time - prev_time
    prev_time = time

    if (delta > 10 && specialAnim) { 
        count++
        if (count > 50) {
            count = 0
            specialAnim = false
            render()
        } else {
            render()
        }
    }

    if (isAnimating && delta > 10) {
        for (let i = 0; i < sliderNames.length; i++) {
            if (sliderVals[i] >= parseInt(sliders[i].max))
                sliderDir[i] = -1
            if (sliderVals[i] <= parseInt(sliders[i].min))
                sliderDir[i] = 1
            sliderVals[i] = parseInt(sliderVals[i]) + sliderDir[i]
            sliders[i].value = sliderVals[i]
        }
        render()
    }
    
    requestAnimationFrame(tick)
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const black = [0, 0, 0, 1]
    const white = [1, 1, 1, 1]
    const pink = [1, .66, .94, 1]
    const mag = [184/255, 7/255, 178/255, 1]

    const body_width = .5
    const body_height = .35
    const body_depth = .3

    let thighAngle = sliderVals[0]
    let calfAngle = sliderVals[1]
    let headAngle = sliderVals[2]
    let eyeAngle = sliderVals[3]
    let bodyX = sliderVals[4]
    let bodyY = sliderVals[5]
    let bodyAngle = sliderVals[6]
    let rubyAngle = sliderVals[7]
    let tailAngle = sliderVals[8]
    let addedJointAngle = sliderVals[9]
    
    let body = new Cube()
    body.scale = [body_width, body_height, body_depth]
    body.jointRotation = [bodyAngle-30, 0, 0, 1]
    body.pos = [(bodyX-50)/100, (bodyY-25)/100, 0]
    body.render()

    const offsets = [0, .5, 1, 2]
    const legScale = [.1, .15, .1]
    let legPos = [
        [-body_width/2 + legScale[0]/2-0.01, -body_height/2 - 0.04, -body_depth/2+legScale[2]/2-0.01]
    ]

    legPos.push([...legPos[0]], [...legPos[0]], [...legPos[0]])
    legPos[1][2] *= -1
    legPos[2][0] *= -1
    legPos[3][0] *= -1
    legPos[3][2] *= -1

    let thighs = []
    let calves = []

    for (i = 0; i < 4; i++) {
        let thigh = new Cube()
        thigh.scale = legScale
        thigh.jointRotation = [Math.sin(thighAngle/10 + offsets[i])*30, 0, 0, 1]
        thigh.jointPos = [0, -legScale[1]/2, 0]
        thigh.pos = legPos[i]
        thigh.parent = body
        thigh.render()
        thighs.push(thigh)

        let calf = new Cube()
        calf.parent = thigh
        calf.scale = [.09, .1, .09]
        calf.jointPos = [0, -calf.scale[1]/2, 0]
        calf.jointRotation = [calfAngle/1.5 - 15, 0, 0, 1]
        calf.pos = [0, -legScale[1]/2 - 0.04, 0]
        calf.render()
        calves.push(calf)

        let foot = new Cube()
        foot.scale = [.11, .07, .11]
        foot.pos = [0, -calf.scale[1]/2, 0]
        foot.parent = calf
        foot.color = black
        foot.render()
    }

    let neck1 = new Cube()
    neck1.parent = body
    neck1.color = black
    neck1.scale = [.06, .25, .25]
    neck1.pos = [-body_width/2, body_height/2 - neck1.scale[1]/2 +0.01, 0]
    neck1.render()

    let neck2 = new Cube()
    neck2.parent = neck1
    neck2.scale = [.07, .2, .2]
    neck2.pos = [-0.05, neck1.scale[1]/2 - neck2.scale[1]/2 +0.01, 0]
    neck2.render()

    let head = new Cube()
    head.parent = neck2
    head.scale = [0.3, 0.15, 0.15]
    head.pos = [-0.15, 0.05, 0]
    head.jointRotation = [headAngle, 0, 0, 1]
    head.jointPos = [-0.08, 0, 0]
    head.render()

    let headSpot = new Cube()
    headSpot.color = black
    headSpot.parent = head
    headSpot.scale = [0.2, 0.15, .06]
    headSpot.pos = [0, 0.01, -head.scale[2]/2 + headSpot.scale[2]/2 - 0.01]
    headSpot.render()
    headSpot.pos[2] *= -1
    headSpot.render()

    let eye = new Cube()
    eye.scale = [0.05, 0.05, 0.02]
    eye.pos = [0.02, 0.02, -0.1]
    eye.parent = head
    eye.render()
    eye.pos[2] *= -1
    eye.render()

    let eyeball = new Octahedron()
    eyeball.scale = [0.02, 0.02, 0.02]
    eyeball.color = black
    eyeball.parent = head
    eyeball.pos = [0.0, 0.02, -head.scale[2]/2 - 0.03]
    eyeball.jointPos = [-0.02, 0, 0]
    eyeball.jointRotation = [eyeAngle, 0, 0, 1]
    eyeball.render()
    eyeball.pos[2] *= -1
    eyeball.render()

    let udders = new Cube()
    udders.scale = [.15, .08, .15]
    udders.pos = [.08, -.2, 0]
    udders.parent = body
    udders.color = pink
    udders.render()

    for (let i = 0; i < 6; i++) {
        let nip = new Cube()
        nip.scale = [0.02, 0.04, 0.02]
        nip.pos = [
            -udders.scale[0]/2 + 0.03 + (i%3)*(udders.scale[0]/3),
            -0.06,
            (i > 2 ? -1 : 1 )*0.03
        ]
        nip.color = pink
        nip.parent = udders
        nip.render()
    }

    // left spots
    let spot1 = new Cube()
    spot1.color = black
    spot1.scale = [.25, .15, .02]
    spot1.pos = [0.06, 0, -body_depth/2]
    spot1.parent = body
    spot1.render()

    let spot2 = new Cube()
    spot2.color = black
    spot2.scale = [.1, .05, .02]
    spot2.pos = [0, 0.1, -body_depth/2]
    spot2.parent = body
    spot2.render()

    let spot3 = new Cube()
    spot3.color = black
    spot3.scale = [.1, .05, .02]
    spot3.pos = [0.1, -0.1, -body_depth/2]
    spot3.parent = body
    spot3.render()
    
    let spot4 = new Cube()
    spot4.color = black
    spot4.scale = [.05, .12, .02]
    spot4.pos = [-0.15, -0.05, -body_depth/2]
    spot4.parent = body
    spot4.render()

    // top spots
    let spot5 = new Cube()
    spot5.color = black
    spot5.scale = [.15, .02, .12]
    spot5.pos = [0.02, body_height/2, 0]
    spot5.parent = body
    spot5.render()

    // right spots
    let spot6 = new Cube()
    spot6.color = black
    spot6.scale = [.25, .15, .02]
    spot6.pos = [-0.08, 0, body_depth/2]
    spot6.parent = body
    spot6.render()

    let spot7 = new Cube()
    spot7.color = black
    spot7.scale = [.07, .15, .02]
    spot7.pos = [0.16, -0.02, body_depth/2]
    spot7.parent = body
    spot7.render()
    
    let spot8 = new Cube()
    spot8.color = black
    spot8.scale = [.05, .12, .02]
    spot8.pos = [-0.15, -0.05, body_depth/2]
    spot8.parent = body
    spot8.render()

    let spot9 = new Cube()
    spot9.color = black
    spot9.scale = [.08, .08, .02]
    spot9.pos = [0.05, 0.07, body_depth/2]
    spot9.parent = body
    spot9.render()
 
    let tail = new Cube()
    tail.parent = body
    tail.color = black
    tail.scale = [0.3, 0.05, 0.05]
    tail.pos = [body_width/2 + tail.scale[0]/2 - 0.1, body_height/2 -0.05, 0]
    tail.jointPos = [0.2, 0, 0]
    tail.jointRotation = [-tailAngle, 0, 0, 1]
    tail.render()

    let ruby1 = new Octahedron()
    ruby1.scale = [0.45, 0.8, 0.45]
    ruby1.pos = [-0.7, 0.2, 0.5]
    ruby1.color = mag
    ruby1.jointRotation = [rubyAngle * 360/50, 0, 1, 0]
    ruby1.render()

    let ruby2 = new Octahedron()
    ruby2.scale = [0.45, 0.8, 0.45]
    ruby2.pos = [0.7, -0.2, -0.5]
    ruby2.color = mag
    ruby2.jointRotation = [rubyAngle * 360/50, 0, 1, 0]
    ruby2.render()

    // milk
    const milkOffset = [0, 10, 15, 5, 20, 25]
    if (specialAnim) {
        for (let i = 0; i < 6; i++) {
            let milk = new Octahedron()
            milk.parent = udders
            milk.scale = [0.03, 0.03, 0.03]
            milk.pos = [
                -udders.scale[0]/2 + 0.03 + (i%3)*(udders.scale[0]/3),
                -((count + milkOffset[i])%30)*0.01,
                (i > 2 ? -1 : 1 )*0.03
            ]
            
            milk.render()
        }
    }

    if (addedJoint.exists) {
        let added = new Cube()
        if (addedJoint.shape == 'octahedron') {
            added = new Octahedron()
        }
        
        added.scale = addedJoint.size
        added.pos = addedJoint.pos
        added.color = addedJoint.color
        added.jointPos = addedJoint.jointPos
        added.jointRotation = [addedJointAngle, ...addedJoint.jointAxis]
        
        if (addedJoint.parent == 'body') {
            added.parent = body
        } else if (addedJoint.parent == 'head') {
            added.parent = head
        } else if (addedJoint.parent == 'tail') {
            added.parent = tail
        } else if (addedJoint.parent == 'ruby1') {
            added.parent = ruby1
        } else if (addedJoint.parent == 'ruby2') {
            added.parent = ruby2
        } else if (addedJoint.parent == 'thigh1') {
            added.parent = thighs[0]
        } else if (addedJoint.parent == 'thigh2') {
            added.parent = thighs[1]
        } else if (addedJoint.parent == 'thigh3') {
            added.parent = thighs[2]
        } else if (addedJoint.parent == 'thigh4') {
            added.parent = thighs[3]
        } else if (addedJoint.parent == 'calf1') {
            added.parent = calves[0]
        } else if (addedJoint.parent == 'calf2') {
            added.parent = calves[1]
        } else if (addedJoint.parent == 'calf3') {
            added.parent = calves[2]
        } else if (addedJoint.parent == 'calf4') {
            added.parent = calves[3]
        }
        
        added.render()
    }
}

const connectVariablesToGLSL = () => {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Get the storage location of u_ModelMatrix
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    // Get the storage location of u_GlobalRotateMatrix
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return;
    }
}

const setupWebGL = () => {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true })
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

const convertCoordinatesEventToGL = (ev) => {
    let x = ev.clientX; // x coordinate of a mouse pointer
    let y = ev.clientY; // y coordinate of a mouse pointer
    let rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    return [x, y];
}
