
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

let viewSliderX
let viewSliderY
let viewSliderZ

function main() {
    setupWebGL()
    connectVariablesToGLSL()
    addActionsForHtmlUI()

    currentViewMatrix.rotate(30, 1, 1, 0)

    // Specify the color for clearing <canvas>
    gl.clearColor(0.2, 0.1, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    render()
}

function addActionsForHtmlUI() {    
    canvas.onmousedown = click;
    canvas.onmousemove = click;

    viewSliderX = document.getElementById('viewSliderX')
    viewSliderY = document.getElementById('viewSliderY')
    viewSliderZ = document.getElementById('viewSliderZ')
    viewSliderX.addEventListener('mousemove', updateRotation)
    viewSliderY.addEventListener('mousemove', updateRotation)
    viewSliderZ.addEventListener('mousemove', updateRotation)
}

function click(ev) {
    if (ev.buttons !== 1) { return }

    let [x, y] = convertCoordinatesEventToGL(ev)
    
    currentViewMatrix.rotate(y*2, 1, 0, 0)
    currentViewMatrix.rotate(x*2, 0, -1, 0)

    render()
}

function updateRotation() {
    currentViewMatrix.setRotate(viewSliderX.value, 1, 0, 0)
    currentViewMatrix.rotate(viewSliderY.value, 0, 1, 0)
    currentViewMatrix.rotate(viewSliderZ.value, 0, 0, 1)
    render()
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    c = new Cube()
    c.matrix.setTranslate(0, 0.2, -0.12);
    c.matrix.scale(4, 3.2, 2.4);
    c.color = [0.85, 0.60, 0.25, 1]
    c.render()
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
