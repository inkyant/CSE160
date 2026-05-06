
class Cube {
    constructor() {
        this.type = 'cube'
        this.matrix = new Matrix4()
        this.scale = [1, 1, 1]
        this.color = [1, 1, 1, 1]
        this.jointRotation = [0, 1, 0, 0]
        this.jointPos = [0, 0, 0]
        this.pos = [0, 0, 0]
        this.parent = null

        // texture
        this.texture0 = null
        this.textureLoaded = false
    }

    setImage(image) {
        if (this.texture0 == null) {
            this.texture0 = gl.createTexture()
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        const img = new Image()
        img.onload = () => {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, this.texture0)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
            gl.uniform1i(uTexture0, 0);
            this.textureLoaded = true
        }

        img.src = image
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

        gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, currentViewMatrix.elements);
        
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

        // Create a buffer object
        let vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the vertex buffer object');
            return -1;
        }
        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // let uvs = new Float32Array([
        //     // FRONT
        //     0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        //     // BOTTOM
        //     0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        //     // LEFT
        //     1,0, 0,0, 1,1, 0,1, 0,0, 1,1,
        //     // TOP
        //     0,1, 0,0, 1,0,  0,1, 1,1, 1,0,
        //     // RIGHT
        //     0,0, 1,1, 0,1, 0,0, 1,1, 1,0,
        //     // BACK
        //     0,0, 1,0, 0,1, 1,1, 1,0, 0,1,
        // ]);
        let uvs = new Float32Array([
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
        ]);
        let uvBuffer = gl.createBuffer();
        if (!uvBuffer) {
            console.log("Failed to create the uv buffer object");
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_uv);

        // Draw
        let r = this.color[0];
        let g = this.color[1];
        let b = this.color[2];
        let a = this.color[3];
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
