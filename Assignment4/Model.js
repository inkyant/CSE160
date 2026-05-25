
// prettier-ignore
class Model {
    constructor(filePath) {
        this.filePath = filePath
        this.color = [1.0, 1.0, 1.0, 1.0]
        this.matrix = new Matrix4()
        this.isFullyLoaded = false

        this.getFileContent().then(() => {
            this.vertexBuffer = gl.createBuffer()
            this.normalBuffer = gl.createBuffer()
            this.uvBuffer = gl.createBuffer()
        })
    }

    parseModel(fileContent) {
        const lines = fileContent.split("\n")
        const allVertices = []
        const allNormals = []
        const unpackedVerts = []
        const unpackedNormals = []
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const tokens = line.split(" ");
        
            if (tokens[0] == 'v') {
                allVertices.push(
                    parseFloat(tokens[1]),
                    parseFloat(tokens[2]),
                    parseFloat(tokens[3])
                )
            } else if (tokens[0] == 'vn') {
                allNormals.push(
                    parseFloat(tokens[1]),
                    parseFloat(tokens[2]),
                    parseFloat(tokens[3])
                )
            } else if (tokens[0] == "f") {
                for (const face of [tokens[1], tokens[2], tokens[3]]) {
                    const indices = face.split("//");
                    const vertexIndex = (parseInt(indices[0]) - 1)*3;
                    const normalIndex = (parseInt(indices[1]) - 1)*3;
                
                    unpackedVerts.push(
                        allVertices[vertexIndex],
                        allVertices[vertexIndex+1],
                        allVertices[vertexIndex+2],
                    )
                    unpackedNormals.push(
                        allNormals[normalIndex],
                        allNormals[normalIndex+1],
                        allNormals[normalIndex+2],
                    )
                }
            }
        }
        this.modelData = {
            vertices: new Float32Array(unpackedVerts),
            normals: new Float32Array(unpackedNormals),
            uvs: new Float32Array(unpackedVerts.length / 3 * 2),
        }
        this.isFullyLoaded = true
    }

    render() {
        if (!this.isFullyLoaded) return
        // vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
    
        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.uvs, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_uv);

        // set uniforms
        gl.uniform1f(u_texColorWeight, 0.0)
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4fv(u_FragColor, this.color);

        let normalMatrix = new Matrix4().setInverseOf(this.matrix)
        normalMatrix.transpose()
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    
        gl.drawArrays(gl.TRIANGLES, 0, this.modelData.vertices.length / 3);
    }

    async getFileContent() {
        try {
            const response = await fetch(this.filePath);
            if (!response.ok) throw new Error(`Could not load file "${this.filePath}". Are you sure the file name/path are correct?`);

            const fileContent = await response.text();
            this.parseModel(fileContent);
        } catch (e) {
            throw new Error(`Something went wrong when loading ${this.filePath}. Error: ${e}`);
        }
    }
}
