
class Sphere {
    
    static texturePath = "earth2.jpg"
    static uvs = []
    static _VERTICES = []
    

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

    static _loadVerticesAndUVs() {
        const { sin, cos, PI } = Math;

        const d = PI / 10
        const dd = PI / 10

        var v = [];
        var uv = [];

        for (var t = 0; t < Math.PI; t += d) {
            for (var r = 0; r < (2 * Math.PI); r += d) {

                var p1 = [sin(t) * cos(r), sin(t) * sin(r), cos(t)];
                var p2 = [sin(t + dd) * cos(r), sin(t + dd) * sin(r), cos(t + dd)];
                var p3 = [sin(t) * cos(r + dd), sin(t) * sin(r + dd), cos(t)];
                var p4 = [sin(t + dd) * cos(r + dd), sin(t + dd) * sin(r + dd), cos(t + dd)];

                var uv1 = [t / Math.PI, r / (2 * Math.PI)];
                var uv2 = [(t + dd) / Math.PI, r / (2 * Math.PI)];
                var uv3 = [t / Math.PI, (r + dd) / (2 * Math.PI)];
                var uv4 = [(t + dd) / Math.PI, (r + dd) / (2 * Math.PI)];

                        v = v.concat(p1); uv = uv.concat(uv1);
                v = v.concat(p2); uv = uv.concat(uv2);
                v = v.concat(p4); uv = uv.concat(uv4);

                v = v.concat(p1); uv = uv.concat(uv1);
                v = v.concat(p4); uv = uv.concat(uv4);
                v = v.concat(p3); uv = uv.concat(uv3);
            }
        }

        Sphere.uvs = new Float32Array(uv)
        Sphere._VERTICES = new Float32Array(v)
    }

    static getTexture() {
        if (!this.texturePath) return null
        if (!Sphere._textureCache.has(this.texturePath)) {
            Sphere._textureCache.set(this.texturePath, Sphere._loadTexture(this.texturePath))
        }
        return Sphere._textureCache.get(this.texturePath)
    }

    static _getVertexBuffer() {
        if (!Sphere._vertexBuffer) {
            Sphere._vertexBuffer = gl.createBuffer()

            if (this._VERTICES.length < 1) {
                Sphere._loadVerticesAndUVs()
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._vertexBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, Sphere._VERTICES, gl.STATIC_DRAW)
        }
        return Sphere._vertexBuffer
    }

    static getUvBuffer() {
        
        let buf = Sphere._uvBufferCache.get(this)
        if (!buf) {
            buf = gl.createBuffer()

            if (this._VERTICES.length < 1) {
                Sphere._loadVerticesAndUVs()
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, Sphere.uvs, gl.STATIC_DRAW)
            Sphere._uvBufferCache.set(this, buf)
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

        gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._getVertexBuffer())
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_Position)

        // Unit sphere: position == normal, reuse the same buffer
        gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(a_normal)

        const cls = this.constructor
        gl.bindBuffer(gl.ARRAY_BUFFER, cls.getUvBuffer())
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

        gl.uniform4f(u_FragColor, r, g, b, a)
        gl.drawArrays(gl.TRIANGLES, 0, Sphere._VERTICES.length / 3)
    }

}
