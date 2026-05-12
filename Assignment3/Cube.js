
class Cube {
    // Subclasses override these to specify their texture image and UV layout.
    // texturePath = null means "no texture" (sky, untextured cubes).
    static texturePath = null
    static uvs = new Float32Array([
        // FRONT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // BOTTOM
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // LEFT
        1,0, 0,0, 1,1, 0,1, 0,0, 1,1,
        // TOP
        0,1, 0,0, 1,0,  0,1, 1,1, 1,0,
        // RIGHT
        0,0, 1,1, 0,1, 0,0, 1,1, 1,0,
        // BACK
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
    ])

    static _VERTICES = new Float32Array([
        -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,   0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,

        -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,   0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,

        -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5, -0.5,

        -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,

         0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,

        -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,   0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
    ])

    static _FACE_SHADES = [1.0, 0.9, 0.8, 0.75, 0.95, 0.7]

    // path -> WebGLTexture
    static _textureCache = new Map()
    static _uvBufferCache = new Map()
    static _vertexBuffer = null

    static _loadTexture(path) {
        const tex = gl.createTexture()
        const img = new Image()
        img.onload = () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            if (typeof renderPage === 'function') renderPage()
        }
        img.src = path
        return tex
    }

    static getTexture() {
        if (!this.texturePath) return null
        if (!Cube._textureCache.has(this.texturePath)) {
            Cube._textureCache.set(this.texturePath, Cube._loadTexture(this.texturePath))
        }
        return Cube._textureCache.get(this.texturePath)
    }

    static _getVertexBuffer() {
        if (!Cube._vertexBuffer) {
            Cube._vertexBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vertexBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, Cube._VERTICES, gl.STATIC_DRAW)
        }
        return Cube._vertexBuffer
    }

    static _getUvBuffer() {
        // `this` is the subclass when called as cls._getUvBuffer().
        let buf = Cube._uvBufferCache.get(this)
        if (!buf) {
            buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW)
            Cube._uvBufferCache.set(this, buf)
        }
        return buf
    }

    constructor() {
        this.matrix = new Matrix4()       // unscaled world matrix, exposed to children
        this._renderMat = new Matrix4()   // scratch matrix with scale baked in
        this.scale = [1, 1, 1]
        this.color = [1, 1, 1, 1]
        this.jointRotation = [0, 1, 0, 0]
        this.jointPos = [0, 0, 0]
        this.pos = [0, 0, 0]
        this.parent = null
        this.textureBlend = this.constructor.texturePath ? 1.0 : 0.0

        // Kick off the load on first instance of this class. Subsequent
        // instances hit the cache.
        this.constructor.getTexture()
    }

    render() {
        const m = this.matrix
        if (this.parent != null) {
            m.set(this.parent.matrix)
        } else {
            m.setIdentity()
        }

        const jp = this.jointPos
        const p = this.pos
        m.translate(p[0] - jp[0], p[1] - jp[1], p[2] - jp[2])
        const jr = this.jointRotation
        m.rotate(jr[0], jr[1], jr[2], jr[3])
        m.translate(jp[0], jp[1], jp[2])

        // m (== this.matrix) is the unscaled matrix children will read from.
        // Copy to scratch and apply scale for this draw.
        const rm = this._renderMat.set(m)
        const sc = this.scale
        rm.scale(sc[0], sc[1], sc[2])

        gl.uniformMatrix4fv(u_ModelMatrix, false, rm.elements)

        gl.bindBuffer(gl.ARRAY_BUFFER, Cube._getVertexBuffer())
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_Position)

        const cls = this.constructor
        gl.bindBuffer(gl.ARRAY_BUFFER, cls._getUvBuffer())
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_uv)

        const tex = cls.getTexture()
        if (tex) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(uTexture0, 0)
        }

        gl.uniform1f(u_texColorWeight, this.textureBlend)

        const c = this.color
        const r = c[0], g = c[1], b = c[2], a = c[3]
        if (!g_lightCubes) {
            gl.uniform4f(u_FragColor, r, g, b, a)
            gl.drawArrays(gl.TRIANGLES, 0, 36)
        } else {
            const shades = Cube._FACE_SHADES
            for (let i = 0; i < 6; i++) {
                const s = shades[i]
                gl.uniform4f(u_FragColor, s*r, s*g, s*b, a)
                gl.drawArrays(gl.TRIANGLES, i*6, 6)
            }
        }
    }

}

class Grass extends Cube {
    static texturePath = 'grass.png'
    
    static uvs = new Float32Array([
        // FRONT
        0.25,0.333, .5,.333, .25,.666, .5,.666, .5,.333, .25,.666,
        // BOTTOM
        .5,0, .25,0, .5,.333, .25,.333, .25,0, .5,.333,
        // LEFT
        .25,1/3, 0,1/3, .25,2/3, 0,2/3, 0,1/3, .25,2/3,
        // TOP
        1/4,1, 1/4,2/3, 2/4,2/3,  1/4,1, 1/2,1, 1/2,2/3,
        // RIGHT
        2/4,1/3, 3/4,2/3, 2/4,2/3, 2/4,1/3, 3/4,2/3, 3/4,1/3,
        // BACK
        3/4,1/3, 1,1/3, 3/4,2/3, 1,2/3, 1,1/3, 3/4,2/3,
    ])
}

class Wood extends Cube {
    static texturePath = 'wood.png'
    static uvs = new Float32Array([
        // FRONT
        0.5,0, 1,0, .5,1, 1,1, 1,0, .5,1,
        // BOTTOM
        0,0, .5,0, 0,1, .5,1, .5,0, 0,1,
        // LEFT
        0.5,0, 1,0, .5,1, 1,1, 1,0, .5,1,
        // TOP
        .5,0,.5,1, 0,1, .5,0,.5,1, 0,1,
        // RIGHT
        1,0, .5,1, 1,1,    1,0, .5,1,  0.5,0,  
        // BACK
        .5,0, 1,0, .5,1, 1,1, 1,0, .5,1,
    ])
}

class Leaves extends Cube {
    static texturePath = 'leaves.png'
    
    static uvs = new Float32Array([
        // FRONT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // BOTTOM
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // LEFT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // TOP
        0,1, 1,1,1,0,     0,1, 0,0, 1,0,
        // RIGHT
        1,0, 0,1, 1,1,    1,0, 0,1,  0,0,  
        // BACK
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
    ])
}

class Stone extends Cube {
    static texturePath = 'stone.jpg'
    
    static uvs = new Float32Array([
        // FRONT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // BOTTOM
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // LEFT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // TOP
        0,1, 1,1,1,0,     0,1, 0,0, 1,0,
        // RIGHT
        1,0, 0,1, 1,1,    1,0, 0,1,  0,0,  
        // BACK
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
    ])
}

class Diamond extends Cube {
    static texturePath = 'diamond.jpg'
    
    static uvs = new Float32Array([
        // FRONT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // BOTTOM
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // LEFT
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // TOP
        0,1, 1,1,1,0,     0,1, 0,0, 1,0,
        // RIGHT
        1,0, 0,1, 1,1,    1,0, 0,1,  0,0,  
        // BACK
        0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
    ])
}

