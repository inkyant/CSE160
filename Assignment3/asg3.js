
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
attribute vec2 a_uv;
varying vec2 vUv;

void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

  vUv = a_uv;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
uniform float u_texColorWeight;
uniform sampler2D uTexture0;
varying vec2 vUv;
void main() {
  vec4 image0 = texture2D(uTexture0, vUv);
  gl_FragColor = u_texColorWeight*image0 + (1.0 - u_texColorWeight)*u_FragColor;
}
`;

// global vars
let canvas;
/** @type {WebGLRenderingContext} */
let gl;
let a_Position;
let u_FragColor;
let u_texColorWeight;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let a_uv;
let uTexture0;

let currentViewMatrix = new Matrix4()

let globalYaw = 0
let globalPitch = 0
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

    currentViewMatrix.setRotate(globalPitch, 1, 0, 0)
    currentViewMatrix.rotate(globalYaw, 0, 1, 0)
    renderPage()
    setTimeout(renderPage, 10)
}

function addActionsForHtmlUI() {
    
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

        renderPage();

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

            currentViewMatrix.setRotate(globalPitch, 1, 0, 0)
            currentViewMatrix.rotate(globalYaw, 0, 1, 0)
            renderPage();
        };
        document.onmouseup = () => {
            canvas.onmousemove = null;
        };
    };
}

function renderPage() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let c = new Cube()
    c.setImage("grass.png")
    c.render()
}

const connectVariablesToGLSL = () => {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Get the storage location of a_Position
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
    
    // Get the storage location of u_texColorWeight
    u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
    if (!u_texColorWeight) {
        console.log('Failed to get the storage location of u_texColorWeight');
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

    // Get the storage location of a_uv
    a_uv = gl.getAttribLocation(gl.program, 'a_uv');
    if (a_uv < 0) {
        console.log('Failed to get the storage location of a_uv');
        return;
    }

    uTexture0 = gl.getUniformLocation(gl.program, "uTexture0")
    if (uTexture0 < 0) {
        console.warn("could not find uTexture0 location")
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
