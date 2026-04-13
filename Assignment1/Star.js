
class Star {
    constructor() {
        this.type = 'star'
        this.position = [0.0, 0.0, 0.0]
        this.color = [1.0, 1.0, 1.0, 1.0]
        this.size = 5.0
    }

    render() {
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, this.size);

        let d = this.size / 300

        drawTriangle([
            this.position[0], this.position[1],
            this.position[0] + 1.7*d, this.position[1] + d,
            this.position[0] - 1.7*d, this.position[1] + d,
        ])

        
        drawTriangle([
            this.position[0], this.position[1],
            this.position[0], this.position[1] + 2*d,
            this.position[0] - d, this.position[1] - d,
        ])
        drawTriangle([
            this.position[0], this.position[1],
            this.position[0], this.position[1] + 2*d,
            this.position[0] + d, this.position[1] - d,
        ])
    }

}
