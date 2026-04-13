
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


let g_shapesList = [];

let g_selectedShape = 'point'
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 10.0
let g_selectedSegment = 10
let rSlider
let gSlider
let bSlider
let sizeSlider
let segmentSlider

function main() {

    setupWebGL()
    connectVariablesToGLSL()
    addActionsForHtmlUI()

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawImage()
}

function addActionsForHtmlUI() {
    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = click;
    document.getElementById('clearButton').onclick = () => { g_shapesList = []; renderAllShapes() }
    document.getElementById('triangleButton').onclick = () => { g_selectedShape = 'triangle' }
    document.getElementById('pointButton').onclick = () => { g_selectedShape = 'point' }
    document.getElementById('circleButton').onclick = () => { g_selectedShape = 'circle' }
    document.getElementById('starButton').onclick = () => { g_selectedShape = 'star' }
    document.getElementById('imageButton').onclick = drawImage


    rSlider = document.getElementById('redSlider')
    gSlider = document.getElementById('greenSlider')
    bSlider = document.getElementById('blueSlider')
    sizeSlider = document.getElementById('sizeSlider')
    segmentSlider = document.getElementById('segmentSlider')

    rSlider.addEventListener('mouseup', () => { g_selectedColor[0] = rSlider.value / 100 })
    gSlider.addEventListener('mouseup', () => { g_selectedColor[1] = gSlider.value / 100 })
    bSlider.addEventListener('mouseup', () => { g_selectedColor[2] = bSlider.value / 100 })
    sizeSlider.addEventListener('mouseup', () => { g_selectedSize = (sizeSlider.value / 4) + 5 })
    segmentSlider.addEventListener('mouseup', () => { g_selectedSegment = (segmentSlider.value/4)+3 })
}

function click(ev) {

    if (ev.buttons !== 1) { return }

    let p = new Point()
    if (g_selectedShape === 'triangle') {
        p = new Triangle()
    } else if (g_selectedShape === 'circle') {
        p = new Circle()
        p.segments = g_selectedSegment
    } else if (g_selectedShape === 'star') {
        p = new Star()
    }

    let [x, y] = convertCoordinatesEventToGL(ev)

    p.position = [x, y, 0.0]
    p.color = g_selectedColor.slice()
    p.size = g_selectedSize

    g_shapesList.push(p)

    renderAllShapes()
}

const drawImage = () => {
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(u_FragColor, 186/255, 199/255, 203/255, 1);
    drawTriangle([-1, 1,  1, 1,  -1, -1])
    drawTriangle([1, 1,  1, -1,  -1, -1])
    
    gl.uniform4f(u_FragColor, 161/255, 128/255, 107/255, 1);
    drawTriangle([-1, -1,  -0.8, 0.2,  -0.8, -1])
    drawTriangle([ -0.8, 0.2,  -0.8, -1,  1, -1])
    drawTriangle([ -0.8, 0.2,  1, -1, 1, 0.2])
    
    
    //blanket
    gl.uniform4f(u_FragColor, 132/255, 61/255, 29/255, 1);
    drawTriangle([.2, -.2, .4, -.2, .4, -.6])

    // matress
    gl.uniform4f(u_FragColor, 193/255, 186/255, 103/255, 1);
    drawTriangle([0, .2, .6, .2, .2, -.2])
    drawTriangle([.8, -.2, .6, .2, .2, -.2])

    gl.uniform4f(u_FragColor, 202/255, 170/255, 58/255, 1);
    
    // bed feet
    drawTriangle([0.4, -1,  0.4, -0.8,  0.6, -0.8])
    drawTriangle([1, -1,  0.8, -0.8,  1, -0.8])
    
    // bed end
    drawTriangle([0.4, -0.8,  1, -0.8,  1, -0.2])
    drawTriangle([0.4, -0.8,  0.4, -0.2,  1, -0.2])
    drawTriangle([ 0.4, -0.2,  0.4, 0, 0.6, -0.2])
    drawTriangle([ 0.8, -0.2,  1, 0, 1, -0.2])

    // bed frame
    drawTriangle([ 0.4, -0.8,  0.4, -0.6, 0, 0.2])
    drawTriangle([.6, .2, .8, -.2, 1, -.2])
    
    //top bed foot
    drawTriangle([0, 0, -0.05, 0, 0, 0.2])

    // headboard 
    drawTriangle([0, 0.2,  0.6, 0.2, 0.6, 0.4])
    drawTriangle([0, 0.2,  0, .4, 0.6, 0.4])
    drawTriangle([0, 0.4,  0.3, .5, 0.6, 0.4])

    // table
    gl.uniform4f(u_FragColor, 150/255, 93/255, 15/255, 1);
    drawTriangle([-.8, -.1, -.8, .2, -.7, .15])
    drawTriangle([-.8, .2, -.6, 0.05, -.6, .2])
    drawTriangle([-.4, .2, -.6, 0.05, -.6, .2])
    drawTriangle([-.4, .2, -.6, .3, -.6, .2])
    drawTriangle([-.8, .2, -.6, .3, -.6, .2])
    drawTriangle([-.6, -.16, -.6, .2, -.5, .2])
    drawTriangle([-.4, -.06, -.4, .2, -.5, .2])

    //chair
    gl.uniform4f(u_FragColor, 175/255, 148/255, 30/255, 1);
    drawTriangle([-.9, -.9, -.8, -.7, -.9, -.5])
    drawTriangle([-.6, -.97, -.6, -.7, -.55, -.9])
    drawTriangle([-.5, -.75,   -.5, -.6,   -.46, -.65])
    drawTriangle([-.8, -.4, -.7, -.55, -.9, -.5])

    gl.uniform4f(u_FragColor, 160/255, 163/255, 94/255, 1);
    drawTriangle([-.8, -.7, -.6, -.8, -.7, -.7])
    drawTriangle([-.5, -.6, -.6, -.8, -.7, -.7])
    drawTriangle([-.5, -.6, -.7, -.55, -.7, -.7])
    drawTriangle([-.8, -.7, -.7, -.55, -.7, -.7])
    
    gl.uniform4f(u_FragColor, 161/255, 128/255, 107/255, 1);
    drawTriangle([-.95, -.9, -.85, -.7, -.9, -.5])
    
    //window
    gl.uniform4f(u_FragColor, 152/255, 159/255, 84/255, 1);
    drawTriangle([-.4, 1, -.4, .6, 0, 1])
    drawTriangle([0, .6, -.4, .6, 0, 1])
    // window edges    
    gl.uniform4f(u_FragColor, 52/255, 90/255, 61/255, 1);
    drawTriangle([-.2, .6, -.2, 1, -.15, .8])
    drawTriangle([-.4, .8, 0, .8, -.2, 0.75])

    // signature
    gl.uniform4f(u_FragColor, 1, 0, 0, 1);
    drawTriangle([-0.98, 1, -0.98, .6, -.9, 0.8])
    drawTriangle([-.82, 1, -.82, .6, -.9, 0.8])
    drawTriangle([-.82, 1, -0.98, 1, -.9, 0.95])

    drawTriangle([-.75, .6, -0.75, 1, -.65, 1])

    gl.uniform4f(u_FragColor, 186/255, 199/255, 203/255, 1);
    drawTriangle([-.65, .8, -0.7, 0.95, -.6, 0.95])
}


const renderAllShapes = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let len = g_shapesList.length;
    for (let i = 0; i < len; i++) {
        g_shapesList[i].render()
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
