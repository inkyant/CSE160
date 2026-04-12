
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
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
let gl;
let a_Position;
let u_FragColor;
let u_Size;


class Point {
    constructor() {
        this.type = 'point'
        this.position = [0.0, 0.0, 0.0]
        this.color = [1.0, 1.0, 1.0, 1.0]
        this.size = 10.0
    }
}

let g_shapesList = [];

let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 10.0
let rSlider
let gSlider
let bSlider
let sizeSlider

function main() {

    setupWebGL()
    connectVariablesToGLSL()
    addActionsForHtmlUI()


    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function addActionsForHtmlUI() {
    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    document.getElementById('clearButton').onclick = () => { g_shapesList = []; renderAllShapes() }
    
    rSlider = document.getElementById('redSlider')
    gSlider = document.getElementById('greenSlider')
    bSlider = document.getElementById('blueSlider')
    sizeSlider = document.getElementById('sizeSlider')

    rSlider.addEventListener('mouseup',   () => { g_selectedColor[0] = rSlider.value / 100 })
    gSlider.addEventListener('mouseup', () => { g_selectedColor[1] = gSlider.value / 100 })
    bSlider.addEventListener('mouseup',  () => { g_selectedColor[2] = bSlider.value / 100 })
    sizeSlider.addEventListener('mouseup',  () => { g_selectedSize = (sizeSlider.value / 4) + 5 })
}

function click(ev) {

    let p = new Point()
    let [x, y] = convertCoordinatesEventToGL(ev)

    p.position = [x, y, 0.0]
    p.color = g_selectedColor.slice()
    p.size = g_selectedSize
    
    g_shapesList.push(p)

    renderAllShapes()
}

const renderAllShapes = () => {
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    let len = g_shapesList.length;
    for (let i = 0; i < len; i++) {
        let p = g_shapesList[i]

        // Pass the position of a point to a_Position variable
        gl.vertexAttrib3f(a_Position, p.position[0], p.position[1], 0.0);
        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, p.color[0], p.color[1], p.color[2], p.color[3]);
        // pass size
        gl.uniform1f(u_Size, p.size);

        // Draw
        gl.drawArrays(gl.POINTS, 0, 1);
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

    // Get the storage location of u_Size
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}

const setupWebGL = () => {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = getWebGLContext(canvas);
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
