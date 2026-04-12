
class Circle {
    constructor() {
        this.type = 'circle'
        this.position = [0.0, 0.0, 0.0]
        this.color = [1.0, 1.0, 1.0, 1.0]
        this.size = 5.0
        this.segments = 10
    }

    render() {
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1f(u_Size, this.size);

        for (let i = 0; i < this.segments; i++) {

            let dA = (2*Math.PI / this.segments)
            let a = dA*i
            let b = dA*(i+1)

            drawTriangle([
                this.position[0],   this.position[1],
                this.position[0] + (this.size/100.0)*Math.cos(a), this.position[1] + (this.size/100.0)*Math.sin(a),
                this.position[0] + (this.size/100.0)*Math.cos(b), this.position[1] + (this.size/100.0)*Math.sin(b),
            ])
        }
    }

}
