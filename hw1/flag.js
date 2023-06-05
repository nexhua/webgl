/**
 * @type {WebGLRenderingContext}
 */
let GL;

/**
 * @typedef {Object} CanvasProps
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} Color
 * @property {number} r
 * @property {number} g
 * @property {number} b
 * @property {number} a
 */

/**
 * @type {CanvasProps}
 */
let canvasProps = { width: 0, height: 0, halfWidth: 0, halfHeight: 0 };

/**
 * @type {Color}
 */
const RED = { r: 227.0 / 255.0, g: 10.0 / 255.0, b: 23.0 / 255.0, a: 1.0 };

/**
 * @type {Color}
 */
const BLUE = { r: 0.0, g: 10.0 / 255.0, b: 200.0 / 255.0, a: 1.0 };

/**
 * @type {Color}
 */
const WHITE = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

window.addEventListener("load", () => {
  const program = init();

  if (!program) {
    return;
  }

  const G = canvasProps.height;

  const outerCircleCenter = [adjustX(G / 2), adjustY(G / 2), 0.5];
  const innerCircleCenter = [adjustX(G / 2 - (G * 2) / 16), 0, 0.4];
  const pentagonCenter = [0.1, 0, 0.25];

  const outerCircle = createCircle(...outerCircleCenter);
  const outerCircleId = bufferData(outerCircle);
  render(program, GL.TRIANGLE_FAN, outerCircleId, 0, outerCircle.length);

  const innerCircle = createCircle(...innerCircleCenter);
  const innerCircleId = bufferData(innerCircle);
  setUniformColor(program, RED);
  render(program, GL.TRIANGLE_FAN, innerCircleId, 0, innerCircle.length);

  const pentagon = drawShape(...pentagonCenter, 5);
  const pentagonId = bufferData(pentagon);
  setUniformColor(program, WHITE);
  render(program, GL.TRIANGLE_FAN, pentagonId, 0, pentagon.length);

  removeTriangles(program, pentagon);
});

/**
 * @returns {WebGLProgram}
 */
function init() {
  const canvas = document.getElementById("flag-canvas");

  if (!canvas) {
    console.log("Canvas not found");
    return false;
  }

  canvasProps.height = /** @type {HTMLElement}*/ (canvas).height;
  canvasProps.width = /** @type {HTMLElement}*/ (canvas).width;
  canvasProps.halfHeight = canvasProps.height / 2.0;
  canvasProps.halfWidth = canvasProps.width / 2.0;

  GL = WebGLUtils.setupWebGL(canvas);

  if (GL === undefined) {
    console.log("WebGL setup failed.");
    return false;
  }

  GL.viewport(0, 0, canvas.width, canvas.height);
  GL.clearColor(RED.r, RED.g, RED.b, RED.a);

  GL.clear(GL.COLOR_BUFFER_BIT);

  const program = initShaders(GL, "vertex-shader", "fragment-shader");
  GL.useProgram(program);

  return program;
}

/**
 * Sets the uniform color
 * @param {WebGLProgram} program
 * @param {Color} color
 */
function setUniformColor(program, color) {
  const uniformColor = GL.getUniformLocation(program, "fColor");
  GL.uniform4f(uniformColor, color.r, color.g, color.b, color.a);
}

/**
 * Assoicat shader with program
 * @param {WebGLProgram} program
 */
function associateShader(program) {
  const vPosition = GL.getAttribLocation(program, "vPosition");
  GL.enableVertexAttribArray(vPosition);
  GL.vertexAttribPointer(vPosition, 2, GL.FLOAT, false, 0, 0);
}

/**
 * Buffers the given array and returns its
 * @param {Float32Array} vertices - Vertices of a 2D shape
 * @returns {string}
 */
function bufferData(vertices) {
  const bufferId = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, bufferId);
  GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW);
  return bufferId;
}

/**
 * Renders the provided buffer
 * @param {WebGLProgram} program WebGL Program
 * @param {string} type - Primitive type of the vertices
 * @param {string} bufferId - Buffer Id provided from bufferData
 * @param {number} start - Starting location for the buffer
 * @param {number} length - How long is the buffer
 */
function render(program, type, bufferId, start, length) {
  GL.bindBuffer(GL.ARRAY_BUFFER, bufferId);
  associateShader(program);
  GL.drawArrays(type, start, length);
}

/**
 * @param {number[]} vertices
 * @returns {Float32Array}
 */
function adjust(vertices) {
  const adjusted = [];

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];

    adjusted.push(adjustX(x));
    adjusted.push(adjustY(y));
  }
  return new Float32Array(adjusted);
}

/**
 * Adjust X axis for example (0, 1500) -> (-1,1)
 * @param {number} x
 * @returns {number}
 */
function adjustX(x) {
  if (x === canvasProps.halfWidth) {
    return 0.0;
  } else if (x > canvasProps.halfWidth) {
    return x / canvasProps.width;
  } else {
    if (x === 0) {
      return -1.0;
    } else {
      return -1.0 * (x / canvasProps.width);
    }
  }
}

/**
 * Adjust Y axis for example (0, 1000) -> (-1,1)
 * @param {number} y
 * @returns {number}
 */
function adjustY(y) {
  if (y === canvasProps.halfHeight) {
    return 0.0;
  } else if (y > canvasProps.halfHeight) {
    return y / canvasProps.height;
  } else {
    if (y === 0) {
      return -1.0;
    } else {
      return -1 * (y / canvasProps.height);
    }
  }
}
/**
 * @param {number} cX
 * @param {number} cY
 * @param {number} r
 * @param {number} numberOfSides
 * @returns {Float32Array}
 */
function drawShape(cX, cY, radius, numberOfSides) {
  const numberOfVertices = numberOfSides + 2;

  const doublePI = 2.0 * Math.PI;

  const vertices = [cX, cY];

  const aspectRatio = canvasProps.height / canvasProps.width;

  for (let i = 1; i < numberOfVertices; i++) {
    vertices.push(
      cX + radius * aspectRatio * Math.cos((i * doublePI) / numberOfSides)
    );
    vertices.push(cY + radius * Math.sin((i * doublePI) / numberOfSides));
  }

  return new Float32Array(vertices);
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} radius
 * @returns {Float32Array}
 */
function createCircle(startX, startY, radius) {
  const totalPoints = 360;
  const vertices = [];

  const aspectRatio = canvasProps.height / canvasProps.width;

  for (let i = 0; i <= totalPoints; i++) {
    const angle = (2 * Math.PI * i) / totalPoints;
    const x = startX + radius * aspectRatio * Math.cos(angle);
    const y = startY + radius * Math.sin(angle);
    vertices.push(x, y);
  }

  return new Float32Array(vertices);
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number[]}
 */
function getMiddle(x1, y1, x2, y2) {
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

/**
 * @param {WebGLProgram} program
 * @param {number[]} pentagon
 */
function removeTriangles(program, pentagon) {
  const cX = pentagon[0];
  const cY = pentagon[1];
  const triangles = [];

  for (let i = 2; i < pentagon.length - 3; i += 2) {
    const x1 = pentagon[i];
    const y1 = pentagon[i + 1];
    const x2 = pentagon[i + 2];
    const y2 = pentagon[i + 3];

    const [x, y] = getMiddle(x1, y1, x2, y2);
    const [pX, pY] = getMiddle(x, y, cX, cY);

    triangles.push(x1);
    triangles.push(y1);
    triangles.push(x2);
    triangles.push(y2);
    triangles.push(pX);
    triangles.push(pY);
  }

  renderTriangles(program, triangles);
}

/**
 * @param {WebGLProgram} program
 * @param {number[]} vertices
 */
function renderTriangles(program, vertices) {
  setUniformColor(program, RED);
  for (let i = 0; i < vertices.length; i += 6) {
    const trianglesId = bufferData(new Float32Array(vertices.slice(i, i + 6)));

    render(program, GL.TRIANGLES, trianglesId, 0, 6);
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} alpha
 * @returns {number[]}
 */
function rotateCoordinate(x, y, alpha) {
  newX = x * Math.cos(alpha) + y * Math.sin(alpha);
  newY = -x * Math.sin(alpha) + y * Math.cos(alpha);

  return [newX, newY];
}
