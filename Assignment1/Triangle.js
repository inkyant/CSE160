
class Triangle {
    constructor() {
        this.type = 'triangle'
        this.position = [0.0, 0.0, 0.0]
        this.color = [1.0, 1.0, 1.0, 1.0]
        this.size = 5.0
    }

    render() {
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, this.size);

        let d = this.size / 200.0;

        drawTriangle([
            this.position[0],   this.position[1],
            this.position[0]+d, this.position[1],
            this.position[0],   this.position[1]+d,
        ])
    }

}


function drawTriangle(vertices) {

    // Create a buffer object
    let vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

