
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

let diamond_count = 0

let g_lightCubes = false

const g_viewMat = new Matrix4()
const g_projMat = new Matrix4()
let g_sky = null
let g_crosshair = null
let g_cow = null

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
}

const MAP_SIZE = 40
function createMap() {
    const hillX = Math.random() * MAP_SIZE
    const hillZ = Math.random() * MAP_SIZE
    const HALF = MAP_SIZE / 2

    const SUBSURFACE_DEPTH = 2
    const DIAMOND_CHANCE = 0.04

    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            const dx = hillX - i
            const dz = hillZ - j
            const d2 = dx*dx + dz*dz

            let height = -2 + (Math.random() > .99)
            
            if (d2 === 0) {
                height += 1
            } else if (d2 < 4) {
                height += 1
            } else if (d2 < 25) {
                height += 1
            }

            const g = new Grass()
            g.pos = [i - HALF, height, j - HALF]
            map.push(g)

            for (let k = 1; k <= SUBSURFACE_DEPTH; k++) {
                const block = Math.random() < DIAMOND_CHANCE ? new Diamond() : new Stone()
                block.pos = [i - HALF, height - k, j - HALF]
                map.push(block)
            }
        }
    }

    addTree([Math.random()*20 - 10, -1, Math.random()*MAP_SIZE - HALF], 6)
    addTree([Math.random()*20 - 10, -1, Math.random()*MAP_SIZE - HALF], 5)
}

function addActionsForHtmlUI() {
    if (!diamond_display) diamond_display = document.getElementById('diamond-count')

    document.onkeydown = keydown
    canvas.onmousedown = (ev) => {
        if (ev.shiftKey || ev.ctrlKey) {
            const pos = new Vector3(g_eye)
            const dir = new Vector3(g_at).sub(pos).normalize()

            let checked = pos.add(dir)
            const HIT_R2 = 0.64 // 0.8^2
            let closestD2 = Infinity
            let closestIdx = -1

            for (let step = 0; step < 10; step++) {
                const cx = checked.elements[0]
                const cy = checked.elements[1]
                const cz = checked.elements[2]
                for (let idx = 0; idx < map.length; idx++) {
                    const bp = map[idx].pos
                    const ex = bp[0] - cx
                    const ey = bp[1] - cy
                    const ez = bp[2] - cz
                    const d2 = ex*ex + ey*ey + ez*ez
                    if (d2 < closestD2) {
                        closestD2 = d2
                        closestIdx = idx
                    }
                }
                if (closestD2 < HIT_R2) break
                checked = checked.add(dir)
            }

            if (closestD2 < HIT_R2) {
                if (ev.shiftKey) {
                    if (map[closestIdx] instanceof Diamond) {
                        diamond_count++
                        diamond_display.textContent = diamond_count + " Diamonds"
                    }
                    map.splice(closestIdx, 1)
                } else {
                    const newPos = checked.sub(dir)
                    const newBlock = new Grass()
                    newBlock.pos = newPos.elements.map(x => Math.round(x))
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
    else if (pitch < -PITCH_MAX) pitch = -PITCH_MAX

    const cp = Math.cos(pitch)
    g_at[0] = g_eye[0] + r * cp * Math.cos(yaw)
    g_at[1] = g_eye[1] + r * Math.sin(pitch)
    g_at[2] = g_eye[2] + r * cp * Math.sin(yaw)

    renderPage()
}

function renderPage() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    g_viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2])
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMat.elements)

    g_projMat.setPerspective(60, canvas.width/canvas.height, .1, 100)
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMat.elements)

    if (!g_sky) {
        g_sky = new Cube()
        g_sky.scale = [100, 100, 100]
        g_sky.color = [120/255, 241/255, 250/255, 1]
        g_sky.textureBlend = 0.0
    }
    g_sky.render()

    for (let i = 0; i < map.length; i++) {
        map[i].render()
    }

    // Cow uses a 2x-scaled view matrix.
    g_viewMat.scale(2, 2, 2)
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMat.elements)

    g_lightCubes = true
    renderCow(cowPos[0], cowPos[1], cowAngle, animVals[0], animVals[1], animVals[2])
    g_lightCubes = false

    renderCrosshair()
}

function renderCrosshair() {
    if (!g_crosshair) {
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
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)

        const uvBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)

        g_crosshair = { vBuf, uvBuf, identity: new Matrix4() }
    }

    gl.uniformMatrix4fv(u_ModelMatrix, false, g_crosshair.identity.elements)
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_crosshair.identity.elements)
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_crosshair.identity.elements)

    gl.bindBuffer(gl.ARRAY_BUFFER, g_crosshair.vBuf)
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(a_Position)

    gl.bindBuffer(gl.ARRAY_BUFFER, g_crosshair.uvBuf)
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
        const w = new Wood()
        w.pos = pos.slice()
        w.pos[1] += i
        map.push(w)

        if (i > 1) {
            const s = i == height-1 ? 3 : 5
            const half = (s/2)|0
            for (let a = -half; a <= half; a++) {
                for (let b = -half; b <= half; b++) {
                    if (i != height-1 && a == 0 && b == 0) continue
                    const l = new Leaves()
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

// Build the cow's part hierarchy once. Per-frame, renderCow() mutates only
// the values that animate (body pos/rotation, leg joints, tail).
function buildCow() {
    const black = [0, 0, 0, 1]
    const pink = [1, .66, .94, 1]

    const body_width = .5
    const body_height = .35
    const body_depth = .3

    const body = new Cube()
    body.scale = [body_width, body_height, body_depth]
    body.jointRotation = [0, 0, 1, 0] // axis fixed, angle updated per-frame
    body.pos = [0, -.25, 0]

    const legScale = [.1, .15, .1]
    const lpx = -body_width/2 + legScale[0]/2 - 0.01
    const lpy = -body_height/2 - 0.04
    const lpz = -body_depth/2 + legScale[2]/2 - 0.01
    const legPositions = [
        [ lpx, lpy,  lpz],
        [ lpx, lpy, -lpz],
        [-lpx, lpy,  lpz],
        [-lpx, lpy, -lpz],
    ]
    const thighOffsets = [0, .5, 1, 2]

    const thighs = []
    const calves = []
    for (let i = 0; i < 4; i++) {
        const thigh = new Cube()
        thigh.scale = legScale
        thigh.jointRotation = [0, 0, 0, 1]
        thigh.jointPos = [0, -legScale[1]/2, 0]
        thigh.pos = legPositions[i]
        thigh.parent = body
        thighs.push(thigh)

        const calf = new Cube()
        calf.parent = thigh
        calf.scale = [.09, .1, .09]
        calf.jointPos = [0, -calf.scale[1]/2, 0]
        calf.jointRotation = [0, 0, 0, 1]
        calf.pos = [0, -legScale[1]/2 - 0.04, 0]
        calves.push(calf)
    }

    const neck1 = new Cube()
    neck1.parent = body
    neck1.color = black
    neck1.scale = [.06, .25, .25]
    neck1.pos = [-body_width/2, body_height/2 - neck1.scale[1]/2 + 0.01, 0]

    const neck2 = new Cube()
    neck2.parent = neck1
    neck2.scale = [.07, .2, .2]
    neck2.pos = [-0.05, neck1.scale[1]/2 - neck2.scale[1]/2 + 0.01, 0]

    const head = new Cube()
    head.parent = neck2
    head.scale = [0.3, 0.15, 0.15]
    head.pos = [-0.15, 0.05, 0]
    head.jointRotation = [50, 0, 0, 1]
    head.jointPos = [-0.08, 0, 0]

    const headSpotZ = head.scale[2]/2 - 0.06/2 + 0.01
    const headSpot1 = new Cube()
    headSpot1.color = black
    headSpot1.parent = head
    headSpot1.scale = [0.2, 0.15, .06]
    headSpot1.pos = [0, 0.01, -headSpotZ]

    const headSpot2 = new Cube()
    headSpot2.color = black
    headSpot2.parent = head
    headSpot2.scale = [0.2, 0.15, .06]
    headSpot2.pos = [0, 0.01, headSpotZ]

    const eye1 = new Cube()
    eye1.scale = [0.05, 0.05, 0.02]
    eye1.pos = [0.02, 0.02, -0.1]
    eye1.parent = head

    const eye2 = new Cube()
    eye2.scale = [0.05, 0.05, 0.02]
    eye2.pos = [0.02, 0.02, 0.1]
    eye2.parent = head

    const udders = new Cube()
    udders.scale = [.15, .08, .15]
    udders.pos = [.08, -.2, 0]
    udders.parent = body
    udders.color = pink

    const nips = []
    for (let i = 0; i < 6; i++) {
        const nip = new Cube()
        nip.scale = [0.02, 0.04, 0.02]
        nip.pos = [
            -udders.scale[0]/2 + 0.03 + (i % 3) * (udders.scale[0]/3),
            -0.06,
            (i > 2 ? -1 : 1) * 0.03
        ]
        nip.color = pink
        nip.parent = udders
        nips.push(nip)
    }

    const spotDefs = [
        [[.25, .15, .02], [ 0.06,  0.00, -body_depth/2]],
        [[.10, .05, .02], [ 0.00,  0.10, -body_depth/2]],
        [[.10, .05, .02], [ 0.10, -0.10, -body_depth/2]],
        [[.05, .12, .02], [-0.15, -0.05, -body_depth/2]],
        [[.15, .02, .12], [ 0.02,  body_height/2, 0]],
        [[.25, .15, .02], [-0.08,  0.00,  body_depth/2]],
        [[.07, .15, .02], [ 0.16, -0.02,  body_depth/2]],
        [[.05, .12, .02], [-0.15, -0.05,  body_depth/2]],
        [[.08, .08, .02], [ 0.05,  0.07,  body_depth/2]],
    ]
    const spots = spotDefs.map(([sc, ps]) => {
        const sp = new Cube()
        sp.color = black
        sp.scale = sc
        sp.pos = ps
        sp.parent = body
        return sp
    })

    const tail = new Cube()
    tail.parent = body
    tail.color = black
    tail.scale = [0.3, 0.05, 0.05]
    tail.pos = [body_width/2 + tail.scale[0]/2 - 0.1, body_height/2 - 0.05, 0]
    tail.jointPos = [0.2, 0, 0]
    tail.jointRotation = [0, 0, 0, 1]

    return { body, thighs, calves, thighOffsets, neck1, neck2, head,
             headSpot1, headSpot2, eye1, eye2, udders, nips, spots, tail }
}

function renderCow(bodyX, bodyZ, bodyAngle, thighAngle, calfAngle, tailAngle) {
    if (!g_cow) g_cow = buildCow()
    const c = g_cow

    c.body.pos[0] = bodyX
    c.body.pos[2] = bodyZ
    c.body.jointRotation[0] = bodyAngle
    c.body.render()

    const calfRot = calfAngle/1.5 - 15
    for (let i = 0; i < 4; i++) {
        const thigh = c.thighs[i]
        thigh.jointRotation[0] = Math.sin(thighAngle/10 + c.thighOffsets[i]) * 30
        thigh.render()

        const calf = c.calves[i]
        calf.jointRotation[0] = calfRot
        calf.render()
    }

    c.neck1.render()
    c.neck2.render()
    c.head.render()
    c.headSpot1.render()
    c.headSpot2.render()
    c.eye1.render()
    c.eye2.render()
    c.udders.render()
    for (let i = 0; i < c.nips.length; i++) c.nips[i].render()
    for (let i = 0; i < c.spots.length; i++) c.spots[i].render()

    c.tail.jointRotation[0] = -tailAngle
    c.tail.render()
}

let diamond_display = null
let fps_display = null
let prev_time = 0
let animVals = [0, 0, 10]
const animMaxMin = [[0, 60], [0, 60], [5, 35]]
const animDir = [1, 1, 1]

let cowPos = [0, 0]
let cowAngle = 90
let cowSegment = 0
const cowWaypoints = [[0, 0], [0, 4], [4, 4], [6, 2], [4, 0]]
const cowSpeed = 0.007
const BREAK_R2 = 0.64 // 0.8^2

function tick() {
    if (!fps_display) fps_display = document.getElementById('fps')

    const time = performance.now()
    const delta = time - prev_time
    if (prev_time !== 0) {
        fps_display.textContent = 'FPS: ' + Math.round(1000 / delta)
    }
    prev_time = time

    if (delta > 10) {
        for (let i = 0; i < animVals.length; i++) {
            if (animVals[i] >= animMaxMin[i][1]) animDir[i] = -1
            else if (animVals[i] <= animMaxMin[i][0]) animDir[i] = 1
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
            const inv = cowSpeed / dist
            cowPos[0] += dx * inv
            cowPos[1] += dz * inv
        }

        // Cow breaks blocks: find closest surface block (y == -1) within BREAK_R2.
        // Scaled view matrix doubles cow world position.
        const cowWorldX = cowPos[0] * 2
        const cowWorldZ = cowPos[1] * 2
        let closestIdx = -1
        let closestD2 = BREAK_R2
        for (let idx = 0; idx < map.length; idx++) {
            const bp = map[idx].pos
            if (bp[1] !== -1) continue
            const ex = cowWorldX - bp[0]
            const ez = cowWorldZ - bp[2]
            const d2 = ex*ex + ez*ez
            if (d2 < closestD2) {
                closestD2 = d2
                closestIdx = idx
            }
        }
        if (closestIdx !== -1) map.splice(closestIdx, 1)

        renderPage()
    }

    requestAnimationFrame(tick)
}

function keydown(ev) {
    let at = new Vector3(g_at)
    let eye = new Vector3(g_eye)
    const up = new Vector3(g_up)
    if (ev.keyCode == 87 || ev.keyCode == 83) {
        // W, S
        let d = at.sub(eye).normalize().mul(0.5)
        if (ev.keyCode == 83) d = d.mul(-1)
        eye = eye.add(d)
        at = at.add(d)
    }
    else if (ev.keyCode == 65 || ev.keyCode == 68) {
        // A, D
        let d = Vector3.cross(at.sub(eye), up).normalize().mul(0.5)
        if (ev.keyCode == 68) d = d.mul(-1)
        eye = eye.sub(d)
        at = at.sub(d)
    }
    else if (ev.keyCode == 81 || ev.keyCode == 69) {
        // Q, E
        const d = at.sub(eye)
        const r = d.magnitude()
        let theta = Math.atan2(d.elements[2], d.elements[0])
        theta += (ev.keyCode == 69) ? 0.05 : -0.05
        at = eye.add(new Vector3([r*Math.cos(theta), d.elements[1], r*Math.sin(theta)]))
    }
    const e = eye.elements
    if (Math.max(e[0], e[1], e[2]) < 20 && Math.min(e[0], e[1], e[2]) > -20) {
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