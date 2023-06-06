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
let canvasProps = { width: 0, height: 0 };

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

  const cube = new Cube();

  bindBuffers(program, cube);

  drawScene(program, cube);
});

/**
 * @param {WebGLProgram} program
 * @param {Cube} cube
 */
function drawScene(program, cube) {
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  drawCube(program, cube);

  // DRAW
  GL.drawArrays(GL.TRIANGLES, 0, 36);

  window.requestAnimationFrame(function () {
    drawScene(program, cube);
  });
}

/**
 * @param {WebGLProgram}
 * @param {Cube} cube
 */
function drawCube(program, cube) {
  const tilt_angle = cube.theta[2];

  const tilt_radian = tilt_angle * (Math.PI / 180.0);

  const thrust_y = cube.thrust * Math.cos(tilt_radian);
  const thrust_x = cube.thrust * Math.sin(tilt_radian);

  const acceleration_y = thrust_y - cube.gravity * cube.weight;
  const displacement_y = (1 / 2) * acceleration_y * Math.pow(cube.time, 2);

  const acceleration_x = thrust_x / cube.weight;
  const displacement_x = -1 * (1 / 2) * acceleration_x * Math.pow(cube.time, 2);

  cube.time += 0.0000000001;

  cube.translation[1] += displacement_y;
  cube.translation[0] += displacement_x;

  const translationLoc = GL.getUniformLocation(program, "vTranslation");
  const thetaLoc = GL.getUniformLocation(program, "theta");
  GL.uniform4fv(translationLoc, cube.translation);
  const theta = [...cube.theta].map((a) => a * 100);

  GL.uniform3fv(thetaLoc, theta);
}

/**
 *
 * @param {WebGLProgram} program
 * @param {Cube} cube
 */
function bindBuffers(program, cube) {
  var colorBuffer = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, colorBuffer);
  GL.bufferData(GL.ARRAY_BUFFER, flatten(cube.colors), GL.STATIC_DRAW);

  var vColor = GL.getAttribLocation(program, "vColor");
  GL.vertexAttribPointer(vColor, 4, GL.FLOAT, false, 0, 0);
  GL.enableVertexAttribArray(vColor);

  var verticesBuffer = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, verticesBuffer);
  GL.bufferData(GL.ARRAY_BUFFER, flatten(cube.points), GL.STATIC_DRAW);

  var vPosition = GL.getAttribLocation(program, "vPosition");
  GL.vertexAttribPointer(vPosition, 4, GL.FLOAT, false, 0, 0);
  GL.enableVertexAttribArray(vPosition);
}

/**
 * @returns {WebGLProgram}
 */
function init() {
  const canvas = document.getElementById("canvas");

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
  GL.clearColor(WHITE.r, WHITE.g, WHITE.b, WHITE.a);

  GL.clear(GL.COLOR_BUFFER_BIT);

  const program = initShaders(GL, "vertex-shader", "fragment-shader");
  GL.useProgram(program);

  GL.enable(GL.DEPTH_TEST);

  return program;
}

/**
 * Creates vertices and colors for 6 sides of a cube. Returns two arrays of number arrays.
 * [vertices_array, colors_array]
 * @returns {Array<Array<number[]>>}
 */
function colorCube() {
  const [q0_v, q0_c] = quad(1, 0, 3, 2);
  const [q1_v, q1_c] = quad(2, 3, 7, 6);
  const [q2_v, q2_c] = quad(3, 0, 4, 7);
  const [q3_v, q3_c] = quad(6, 5, 1, 2);
  const [q4_v, q4_c] = quad(4, 5, 6, 7);
  const [q5_v, q5_c] = quad(5, 4, 0, 1);

  return [
    [].concat(q0_v, q1_v, q2_v, q3_v, q4_v, q5_v),
    [].concat(q0_c, q1_c, q2_c, q3_c, q4_c, q5_c),
  ];
}

/**
 * Creates the vertices and colors for one side of a cube. Returns two arrays of number arrays.
 * [vertices_array, colors_array]
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns {Array<number[]>}
 */
function quad(a, b, c, d) {
  var vertices = [
    vec4(-0.1, -0.1, 0.1, 1.0),
    vec4(-0.1, 0.1, 0.1, 1.0),
    vec4(0.1, 0.1, 0.1, 1.0),
    vec4(0.1, -0.1, 0.1, 1.0),
    vec4(-0.1, -0.1, -0.1, 1.0),
    vec4(-0.1, 0.1, -0.1, 1.0),
    vec4(0.1, 0.1, -0.1, 1.0),
    vec4(0.1, -0.1, -0.1, 1.0),
  ];

  var vertexColors = [
    [0.0, 0.0, 0.0, 1.0], // black
    [1.0, 0.0, 0.0, 1.0], // red
    [1.0, 1.0, 0.0, 1.0], // yellow
    [0.0, 1.0, 0.0, 1.0], // green
    [0.0, 0.0, 1.0, 1.0], // blue
    [1.0, 0.0, 1.0, 1.0], // magenta
    [0.0, 1.0, 1.0, 1.0], // cyan
    [1.0, 1.0, 1.0, 1.0], // white
  ];

  // We need to parition the quad into two triangles in order for
  // WebGL to be able to render it.  In this case, we create two
  // triangles from the quad indices

  //vertex color assigned by the index of the vertex

  var indices = [a, b, c, a, c, d];

  var quadPoints = [];
  var quadColors = [];

  for (var i = 0; i < indices.length; ++i) {
    quadPoints.push(vertices[indices[i]]);
    quadColors.push(vertexColors[a]);
  }

  return [quadPoints, quadColors];
}

class Cube {
  constructor() {
    const [points, colors] = colorCube();
    this.points = points;
    this.colors = colors;
    this.theta = [0, 0, 0];
    this.translation = [0.0, 0.0, 0.0, 0.0];
    this.weight = 100.0;
    this.gravity = 10.0;
    this.thrust = 1000.0;
    this.time = 1;

    document
      .getElementById("thrust-slider")
      .addEventListener("input", this.updateThrust.bind(this), false);
    document.getElementById("thrust-info").innerHTML = this.thrust;

    document
      .getElementById("yaw-incr")
      .addEventListener(
        "click",
        this.updateAngle.bind(this, "yaw-incr"),
        false
      );
    document
      .getElementById("yaw-dec")
      .addEventListener("click", this.updateAngle.bind(this, "yaw-dec"), false);
  }

  updateThrust(e) {
    const newThrust = parseFloat(e.srcElement.value);
    if (!isNaN(newThrust)) {
      this.thrust = newThrust;

      document.getElementById("thrust-info").innerHTML = this.thrust;
    }
  }

  updateAngle(type) {
    switch (type) {
      case "yaw-incr":
        this.theta[2] += +0.01;
        break;
      case "yaw-dec":
        this.theta[2] += -0.01;
        break;
    }
  }
}
