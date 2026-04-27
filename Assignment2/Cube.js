
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
        let p = this.parent
        while (p != null) {
            m.concat(p.matrix)

            p = p.parent
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
            console.log('Failed to create the buffer object');
            return -1;
        }
        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

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
