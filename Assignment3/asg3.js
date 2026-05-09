
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
attribute vec2 a_uv;
varying vec2 vUv;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;

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
  if (gl_FragColor.a < 0.1) discard;
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
let u_ViewMatrix;
let u_ProjectionMatrix;
let a_uv;
let uTexture0;

let g_eye = [0, 0, 2]
let g_at = [0, 0, 1]
let g_up = [0, 1, 0]

let g_isDragging = false
let g_lastMouseX = 0
let g_lastMouseY = 0
const MOUSE_SENSITIVITY = 0.005

let map = []

function main() {
    setupWebGL()
    connectVariablesToGLSL()
    addActionsForHtmlUI()

    createMap()

    // Specify the color for clearing <canvas>
    gl.clearColor(0.1, 0.5, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderPage()
    setTimeout(renderPage, 10)
}

const MAP_SIZE = 40
function createMap() {


    const hills = [
        [Math.random()*MAP_SIZE, Math.random()*MAP_SIZE]
    ]

    const dist = (a, b) => {
        return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2))
    }

    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            let height = -2 + (Math.random() > .99)
            if (dist(hills[0], [i, j]) == 0) {
                height += 2 + Math.random() > .1
            } else if (dist(hills[0], [i, j]) < 2) {
                height += 1 + Math.random() > .1
            } else if (dist(hills[0], [i, j]) < 5) {
                height += Math.random() > .1
            }
            let g = new Grass()
            g.pos = [i-MAP_SIZE/2, height, j-MAP_SIZE/2]
            map.push(g)
        }
    }

    addTree([Math.random()*MAP_SIZE - (MAP_SIZE/2), -1, Math.random()*MAP_SIZE - (MAP_SIZE/2)], 6)
    addTree([Math.random()*MAP_SIZE - (MAP_SIZE/2), -1, Math.random()*MAP_SIZE - (MAP_SIZE/2)], 5)
}

function addActionsForHtmlUI() {
    document.onkeydown = keydown
    canvas.onmousedown = (ev) => {
        if (ev.shiftKey) {
            console.log("click")
            
            let pos = new Vector3(g_eye)
            let dir = new Vector3(g_at)
            dir = dir.sub(pos)
            dir = dir.normalize()

            
            const dist = (a, b) => {
                return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2))
            }
            let checked = pos.add(dir)
            
            while (checked.magnitude() < 1.5*MAP_SIZE) {
                let closest = 10000
                let closestIdx = -1
                for (let idx = 0; idx < map.length; idx++) {
                    let d = dist(map[idx].pos, checked.elements)
                    if (d < closest) {
                        closest = d
                        closestIdx = idx
                    }
                }
                
                if (closest < 0.8) {
                    console.log("break block")
                    map.splice(closestIdx, 1)
                    renderPage()
                    return
                }
                checked = checked.add(dir)
            }
        } else {
            g_isDragging = true
            g_lastMouseX = ev.clientX
            g_lastMouseY = ev.clientY
        }
    }
    canvas.onmouseup = () => { g_isDragging = false }
    canvas.onmouseleave = () => { g_isDragging = false }
    canvas.onmousemove = mousemove
}

function mousemove(ev) {
    if (!g_isDragging) return
    const dx = ev.clientX - g_lastMouseX
    const dy = ev.clientY - g_lastMouseY
    g_lastMouseX = ev.clientX
    g_lastMouseY = ev.clientY

    const fx = g_at[0] - g_eye[0]
    const fy = g_at[1] - g_eye[1]
    const fz = g_at[2] - g_eye[2]
    const r = Math.sqrt(fx*fx + fy*fy + fz*fz)

    let yaw = Math.atan2(fz, fx)
    let pitch = Math.asin(fy / r)

    yaw += dx * MOUSE_SENSITIVITY
    pitch -= dy * MOUSE_SENSITIVITY

    const PITCH_MAX = Math.PI / 2 - 0.01
    if (pitch > PITCH_MAX) pitch = PITCH_MAX
    if (pitch < -PITCH_MAX) pitch = -PITCH_MAX

    g_at = [
        g_eye[0] + r * Math.cos(pitch) * Math.cos(yaw),
        g_eye[1] + r * Math.sin(pitch),
        g_eye[2] + r * Math.cos(pitch) * Math.sin(yaw),
    ]

    renderPage()
}

function renderPage() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let viewMat = new Matrix4()
    viewMat.setLookAt(...g_eye, ...g_at, ...g_up) // eye, at, up
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements)

    let projectionMat = new Matrix4()
    projectionMat.setPerspective(60, canvas.width/canvas.height, .1, 100)
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMat.elements)

    let sky = new Cube()
    sky.scale = [100, 100, 100]
    sky.color = [120/255, 241/255, 250/255, 1]
    sky.textureBlend = 0.0
    sky.render()

    for (const block of map) {
        block.render()
    }

    renderCrosshair()
}

function renderCrosshair() {
    const I = new Matrix4()
    gl.uniformMatrix4fv(u_ModelMatrix, false, I.elements)
    gl.uniformMatrix4fv(u_ViewMatrix, false, I.elements)
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, I.elements)

    const s = 0.025
    const t = 0.003
    const verts = new Float32Array([
        -s, -t, 0,   s, -t, 0,  -s,  t, 0,
         s, -t, 0,   s,  t, 0,  -s,  t, 0,
        -t, -s, 0,   t, -s, 0,  -t,  s, 0,
         t, -s, 0,   t,  s, 0,  -t,  s, 0,
    ])
    const uvs = new Float32Array(24)

    const vBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuf)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(a_Position)

    const uvBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(a_uv)

    gl.uniform1f(u_texColorWeight, 0.0)
    gl.uniform4f(u_FragColor, 1, 1, 1, 1)

    // draw it on top of other stuff
    gl.disable(gl.DEPTH_TEST)
    gl.drawArrays(gl.TRIANGLES, 0, 12)
    gl.enable(gl.DEPTH_TEST)
}

function addTree(pos, height) {
    for (let i = 0; i < height; i++) {
        let w = new Wood()
        w.pos = pos.slice()
        w.pos[1] += i
        map.push(w)

        if (i > 1) {
            let s = i == height-1 ? 3 : 5
            for (let a = (-s/2)|0; a <= (s/2)|0; a++) {
                for (let b = (-s/2)|0; b <= (s/2) |0; b++) {
                    if (i != height-1 && a == 0 && b == 0) {continue}
                    let l = new Leaves()
                    l.pos = pos.slice()
                    l.pos[0] += a
                    l.pos[1] = i
                    l.pos[2] += b
                    map.push(l)
                }
            }
        }
    }
}

function keydown(ev) {
    let at = new Vector3(g_at)
    let eye = new Vector3(g_eye)
    let up = new Vector3(g_up)
    if (ev.keyCode == 87 || ev.keyCode == 83) {
        // W, A
        let d = at.sub(eye)
        d = d.normalize().mul(0.5)
        if (ev.keyCode == 83) {d = d.mul(-1)}
        eye = eye.add(d)
        at = at.add(d)
    }
    else if (ev.keyCode == 65 || ev.keyCode == 68) {
        // A, D
        let d = at.sub(eye)
        d = Vector3.cross(d, up)
        d = d.normalize().mul(0.5)
        if (ev.keyCode == 68) {d = d.mul(-1)}
        eye = eye.sub(d)
        at = at.sub(d)
    }
    else if (ev.keyCode == 81 || ev.keyCode == 69) {
        // Q, E

        let d = at.sub(eye)
        let r = d.magnitude()
        let theta = Math.atan2(d.elements[2], d.elements[0])
        theta += ((ev.keyCode == 69) ? 0.05 : -0.05)

        let change = new Vector3([r*Math.cos(theta), d.elements[1], r*Math.sin(theta)])
        at = eye.add(change)
    }
    g_at = at.elements.slice()
    g_eye = eye.elements.slice()
    g_up = up.elements.slice()
    renderPage()
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

    // Get the storage location of u_ViewMatrix
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log('Failed to get the storage location of u_ViewMatrix');
        return;
    }
    
    // Get the storage location of u_ProjectionMatrix
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get the storage location of u_ProjectionMatrix');
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
