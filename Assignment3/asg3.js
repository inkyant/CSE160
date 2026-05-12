
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

let g_eye = [3, 0, 2]
let g_at = [0, 0, 1]
let g_up = [0, 1, 0]

let g_isDragging = false
let g_lastMouseX = 0
let g_lastMouseY = 0
const MOUSE_SENSITIVITY = 0.005

let map = []

let g_lightCubes = false

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

    addTree([Math.random()*20 - 10, -1, Math.random()*MAP_SIZE - (MAP_SIZE/2)], 6)
    addTree([Math.random()*20 - 10, -1, Math.random()*MAP_SIZE - (MAP_SIZE/2)], 5)
}

function addActionsForHtmlUI() {
    document.onkeydown = keydown
    canvas.onmousedown = (ev) => {
        if (ev.shiftKey || ev.ctrlKey) {
            
            let pos = new Vector3(g_eye)
            let dir = new Vector3(g_at)
            dir = dir.sub(pos)
            dir = dir.normalize()
            
            const dist = (a, b) => {
                return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2))
            }
            let checked = pos.add(dir)
            
            let closest = 10000
            let closestIdx = -1
            for (let step = 0; step < 10; step++) {

                for (let idx = 0; idx < map.length; idx++) {
                    let d = dist(map[idx].pos, checked.elements)
                    if (d < closest) {
                        closest = d
                        closestIdx = idx
                    }
                }
                
                if (closest < 0.8) {
                    break
                }
                checked = checked.add(dir)
            }

            if (closest < 0.8) {
                if (ev.shiftKey) {
                    map.splice(closestIdx, 1)
                } else if (ev.ctrlKey) {
                    let newPos = checked.sub(dir)
                    let newBlock = new Grass()
                    newBlock.pos = newPos.elements.map(x=>Math.round(x))
                    map.push(newBlock)
                }
                renderPage()
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

    requestAnimationFrame(tick)
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
    
    // cow needs to be scaled up
    viewMat = new Matrix4()
    viewMat.setLookAt(...g_eye, ...g_at, ...g_up) // eye, at, up
    viewMat.scale(2, 2, 2)
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements)

    g_lightCubes = true
    renderCow(cowPos[0], cowPos[1], cowAngle, ...animVals)
    g_lightCubes = false

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

function renderCow(bodyX, bodyZ, bodyAngle, thighAngle, calfAngle, tailAngle) {

    const black = [0, 0, 0, 1]
    const white = [1, 1, 1, 1]
    const pink = [1, .66, .94, 1]
    const mag = [184/255, 7/255, 178/255, 1]

    const body_width = .5
    const body_height = .35
    const body_depth = .3

    let bodyY = 0
    let headAngle = 50
    
    let body = new Cube()
    body.scale = [body_width, body_height, body_depth]
    body.jointRotation = [bodyAngle, 0, 1, 0]
    body.pos = [bodyX, -.25, bodyZ]
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
        let thigh = new Cube()
        thigh.scale = legScale
        thigh.jointRotation = [Math.sin(thighAngle/10 + offsets[i])*30, 0, 0, 1]
        thigh.jointPos = [0, -legScale[1]/2, 0]
        thigh.pos = legPos[i]
        thigh.parent = body
        thigh.render()

        let calf = new Cube()
        calf.parent = thigh
        calf.scale = [.09, .1, .09]
        calf.jointPos = [0, -calf.scale[1]/2, 0]
        calf.jointRotation = [calfAngle/1.5 - 15, 0, 0, 1]
        calf.pos = [0, -legScale[1]/2 - 0.04, 0]
        calf.render()

        let foot = new Cube()
        foot.scale = [.11, .07, .11]
        foot.pos = [0, -calf.scale[1]/2, 0]
        foot.parent = calf
        foot.color = black
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

    let eye1 = new Cube()
    eye1.scale = [0.05, 0.05, 0.02]
    eye1.pos = [0.02, 0.02, -0.1]
    eye1.parent = head
    eye1.render()

    let eye2 = new Cube()
    eye2.scale = [0.05, 0.05, 0.02]
    eye2.pos = [0.02, 0.02, 0.1]
    eye2.parent = head
    eye2.render()

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
}

let fps_display = null
let prev_time = 0
let animVals = [0, 0, 10]
let animMaxMin = [[0, 60], [0, 60], [5, 35]]
let animDir = [1, 1, 1]

let cowPos = [0, 0]
let cowAngle = 90
let cowSegment = 0
const cowWaypoints = [[0, 0], [0, 4], [4, 4], [6, 2], [4, 0]]
const cowSpeed = 0.007
function tick() {
    if (!fps_display) fps_display = document.getElementById('fps')

    let time = performance.now()
    if (prev_time !== 0) {
        fps_display.textContent = 'FPS: ' + Math.round(1000 / (time - prev_time))
    }
    let delta = time - prev_time
    prev_time = time

    if (delta > 10) {
        for (let i = 0; i < animVals.length; i++) {
            if (animVals[i] >= animMaxMin[i][1])
                animDir[i] = -1
            if (animVals[i] <= animMaxMin[i][0])
                animDir[i] = 1
            animVals[i] += animDir[i]
        }

        const target = cowWaypoints[(cowSegment + 1) % cowWaypoints.length]
        const dx = target[0] - cowPos[0]
        const dz = target[1] - cowPos[1]
        const dist = Math.sqrt(dx*dx + dz*dz)
        if (dist > 0) {
            cowAngle = Math.atan2(dz, -dx) * 180 / Math.PI
        }
        if (dist <= cowSpeed) {
            cowPos[0] = target[0]
            cowPos[1] = target[1]
            cowSegment = (cowSegment + 1) % cowWaypoints.length
        } else {
            cowPos[0] += dx / dist * cowSpeed
            cowPos[1] += dz / dist * cowSpeed
        }

        
        // cow breaks blocks
        // cow is has 2x-scaled view matrix, so its world pos is doubled
        const cowWorldX = cowPos[0] * 2
        const cowWorldZ = cowPos[1] * 2

        let closest = 10000
        let closestIdx = -1

        for (let idx = 0; idx < map.length; idx++) {
            if (map[idx].pos[1] == -1) {
                const dx = cowWorldX - map[idx].pos[0]
                const dz = cowWorldZ - map[idx].pos[2]
                const d = Math.sqrt(dx*dx + dz*dz)
                if (d < closest) {
                    closest = d
                    closestIdx = idx
                }
            }
        }

        if (closest < 0.8) {
            map.splice(closestIdx, 1)
        }

        renderPage()
    }

    requestAnimationFrame(tick)
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
    if (Math.max(...eye.elements) < 20 && Math.min(...eye.elements) > -20) {
        g_at = at.elements.slice()
        g_eye = eye.elements.slice()
        g_up = up.elements.slice()

        renderPage()
    }
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