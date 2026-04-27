
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

let viewSliderPitch
let viewSliderYaw
let thighSlider
let thighAngle = 0
let calfSlider
let calfAngle = 0

let globalYaw = 340
let globalPitch = 340
let canvas_drag_sensitivity = 0.7

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
    viewSliderPitch = document.getElementById('viewSliderPitch')
    viewSliderYaw = document.getElementById('viewSliderYaw')
    thighSlider = document.getElementById('thighSlider')
    calfSlider = document.getElementById('calfSlider')
    viewSliderPitch.addEventListener('mousemove', updateRotation)
    viewSliderYaw.addEventListener('mousemove', updateRotation)
    thighSlider.addEventListener('mousemove', () => {thighAngle = thighSlider.value; render()})
    calfSlider.addEventListener('mousemove', () => {calfAngle = calfSlider.value; render()})

    canvas.onmousedown = (e) => {

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

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const black = [0, 0, 0, 1]
    const white = [1, 1, 1, 1]

    const body_width = .5
    const body_height = .35
    const body_depth = .3
    
    body = new Cube()
    body.scale = [body_width, body_height, body_depth]
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

    for (i = 0; i < 4; i++) {
        thigh = new Cube()
        thigh.scale = legScale
        thigh.jointRotation = [Math.sin(thighAngle/10 + offsets[i])*30, 0, 0, 1]
        thigh.jointPos = [0, -legScale[1]/2, 0]
        thigh.pos = legPos[i]
        thigh.parent = body
        thigh.render()

        calf = new Cube()
        calf.parent = thigh
        calf.scale = [.09, .1, .09]
        calf.jointPos = [0, -calf.scale[1]/2, 0]
        calf.jointRotation = [calfAngle/1.5 - 15, 0, 0, 1]
        calf.pos = [0, -legScale[1]/2 - 0.04, 0]
        calf.render()

        foot = new Cube()
        foot.scale = [.11, .11, .11]
        foot.pos = [0, -calf.scale[1]/2, 0]
        foot.parent = calf
        foot.color = black
        foot.render()
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
