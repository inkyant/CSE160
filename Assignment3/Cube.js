
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

    // path -> WebGLTexture. Shared across all subclasses so any texture is
    // uploaded to the GPU exactly once, regardless of how many cubes use it.
    static _textureCache = new Map()

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

    constructor() {
        this.matrix = new Matrix4()
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
        let vertices = [
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,

             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,


            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,

             0.5, -0.5,  0.5,
             0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,


            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5, -0.5,

            -0.5,  0.5,  0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5, -0.5,


            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,

            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,


             0.5, -0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,

             0.5, -0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,


            -0.5, -0.5, 0.5,
             0.5, -0.5, 0.5,
            -0.5,  0.5, 0.5,

             0.5,  0.5, 0.5,
             0.5, -0.5, 0.5,
            -0.5,  0.5, 0.5,
        ]

        let m = new Matrix4()

        if (this.parent != null) {
            m.concat(this.parent.matrix)
        }

        m.translate(this.pos[0] - this.jointPos[0], this.pos[1] - this.jointPos[1], this.pos[2] - this.jointPos[2])
        m.rotate(...this.jointRotation)
        m.translate(...this.jointPos)

        this.matrix = new Matrix4(m)

        m.scale(this.scale[0], this.scale[1], this.scale[2])

        gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);

        let vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the vertex buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        const cls = this.constructor

        let uvBuffer = gl.createBuffer();
        if (!uvBuffer) {
            console.log("Failed to create the uv buffer object");
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cls.uvs, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_uv);

        const tex = cls.getTexture()
        if (tex) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(uTexture0, 0)
        }

        gl.uniform1f(u_texColorWeight, this.textureBlend)

        let r = this.color[0];
        let g = this.color[1];
        let b = this.color[2];
        let a = this.color[3];
        if (!g_lightCubes) {
            gl.uniform4f(u_FragColor, r, g, b, a);
            gl.drawArrays(gl.TRIANGLES, 0, 36);
        } else {
            gl.uniform4f(u_FragColor, r, g, b, a);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            gl.uniform4f(u_FragColor, 0.9*r, 0.9*g, 0.9*b, a);
            gl.drawArrays(gl.TRIANGLES, 6, 6);

            gl.uniform4f(u_FragColor, 0.8*r, 0.8*g, 0.8*b, a);
            gl.drawArrays(gl.TRIANGLES, 12, 6);

            gl.uniform4f(u_FragColor, 0.75*r, 0.75*g, 0.75*b, a);
            gl.drawArrays(gl.TRIANGLES, 18, 6);
            
            gl.uniform4f(u_FragColor, 0.95*r, 0.95*g, 0.95*b, a);
            gl.drawArrays(gl.TRIANGLES, 24, 6);
            
            gl.uniform4f(u_FragColor, 0.7*r, 0.7*g, 0.7*b, a);
            gl.drawArrays(gl.TRIANGLES, 30, 6);
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

