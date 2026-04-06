
const CANVAS_HEIGHT = 400
const CANVAS_WIDTH = 400
const SCALE = 20

const canvas = document.getElementById('example')
const ctx = canvas.getContext('2d')


function main() {
	ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

	let vec = new Vector3([2.25, 2.25, 0])
	drawVector(vec, "red")
}

const handleDrawEvent = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	
	const x1 = parseFloat(document.getElementById('x_input1').value)
	const y1 = parseFloat(document.getElementById('y_input1').value)

	const x2 = parseFloat(document.getElementById('x_input2').value)
	const y2 = parseFloat(document.getElementById('y_input2').value)

	document.getElementById('x_input1').value = ''
	document.getElementById('y_input1').value = ''
	document.getElementById('x_input2').value = ''
	document.getElementById('y_input2').value = ''

	if (x1 != NaN && y1 != NaN) {
		drawVector(new Vector3([x1, y1, 0]), "red")
	}
	if (x2 != NaN && y2 != NaN) {
		drawVector(new Vector3([x2, y2, 0]), "blue")
	} 
}

const handleDrawOperationEvent = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	
	const x1 = parseFloat(document.getElementById('x_input1').value)
	const y1 = parseFloat(document.getElementById('y_input1').value)

	const x2 = parseFloat(document.getElementById('x_input2').value)
	const y2 = parseFloat(document.getElementById('y_input2').value)

	let v1 = new Vector3([x1, y1, 0])
	let v2 = new Vector3([x2, y2, 0])

	if (x1 != NaN && y1 != NaN) {
		drawVector(v1, "red")
	}
	if (x2 != NaN && y2 != NaN) {
		drawVector(v2, "blue")
	}

	if (x1 != NaN && x2 != NaN && y1 != NaN && y2 != NaN) {
		const op = document.getElementById('operation_select').value
		const scalar = parseFloat(document.getElementById('scalar_val').value)

		if (op == "add") {
			drawVector(v1.add(v2), "green")
		} else if (op == "sub") {
			drawVector(v1.sub(v2), "green")
		} else if (op == "div") {
			drawVector(v1.div(scalar), "green")
			drawVector(v2.div(scalar), "green")
		} else if (op == "mul") {
			drawVector(v1.mul(scalar), "green")
			drawVector(v2.mul(scalar), "green")
		} else if (op == "mag") {
			console.log(v1.magnitude(), v2.magnitude())
		} else if (op == "norm") {
			drawVector(v1.normalize(), "green")
			drawVector(v2.normalize(), "green")
		} else if (op == "ang") {
			console.log(angleBetween(v1, v2))
		} else if (op == "area") {
			console.log(areaTriangle(v1, v2))
		}
	}
}

const angleBetween = (v1, v2) => {
	let d = Vector3.dot(v1, v2)
	return Math.acos(d / (v1.magnitude() * v2.magnitude())) * 180 / Math.PI
}

const areaTriangle = (v1, v2) => {
	let c = Vector3.cross(v1, v2)
	return c.magnitude() / 2
}

const drawVector = (v, c) => {
	ctx.beginPath();
	ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
	let x = SCALE * v.elements[0]
	let y = SCALE * v.elements[1]
	ctx.lineTo(CANVAS_WIDTH / 2 + x, CANVAS_HEIGHT / 2 - y);
	ctx.strokeStyle = c
	ctx.stroke();
}