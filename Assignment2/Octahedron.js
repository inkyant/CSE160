
class Octahedron {
    constructor() {
        this.type = 'Octahedron'
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

             0.5, 0, 0.5,
             -0.5, 0, 0.5,
             0, 0.5, 0,

             0.5, 0, -0.5,
             0.5, 0, 0.5,
             0, 0.5, 0,

             -0.5, 0, 0.5,
             -0.5, 0, -0.5,
             0, 0.5, 0,

             0.5, 0, -0.5,
             -0.5, 0, -0.5,
             0, 0.5, 0,
             
             0.5, 0, 0.5,
             -0.5, 0, 0.5,
             0, -0.5, 0,

             0.5, 0, -0.5,
             0.5, 0, 0.5,
             0, -0.5, 0,

             -0.5, 0, 0.5,
             -0.5, 0, -0.5,
             0, -0.5, 0,

             0.5, 0, -0.5,
             -0.5, 0, -0.5,
             0, -0.5, 0,
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

        const shades = [0.78, 0.8, 0.83, 0.85, 0.9, 0.93, 0.95, 1]

        gl.uniform4f(u_FragColor, shades[0]*r, shades[0]*g, shades[0]*b, a);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.uniform4f(u_FragColor, shades[4]*r, shades[4]*g, shades[4]*b, a);
        gl.drawArrays(gl.TRIANGLES, 3, 3);

        gl.uniform4f(u_FragColor, shades[2]*r, shades[2]*g, shades[2]*b, a);
        gl.drawArrays(gl.TRIANGLES, 6, 3);

        gl.uniform4f(u_FragColor, shades[5]*r, shades[5]*g, shades[5]*b, a);
        gl.drawArrays(gl.TRIANGLES, 9, 3);

        gl.uniform4f(u_FragColor, shades[1]*r, shades[1]*g, shades[1]*b, a);
        gl.drawArrays(gl.TRIANGLES, 12, 3);

        gl.uniform4f(u_FragColor, shades[6]*r, shades[6]*g, shades[6]*b, a);
        gl.drawArrays(gl.TRIANGLES, 15, 3);

        gl.uniform4f(u_FragColor, shades[3]*r, shades[3]*g, shades[3]*b, a);
        gl.drawArrays(gl.TRIANGLES, 18, 3);
        
        gl.uniform4f(u_FragColor, shades[7]*r, shades[7]*g, shades[7]*b, a);
        gl.drawArrays(gl.TRIANGLES, 21, 3);
        
    }

}
