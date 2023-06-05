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

  const central_cube = new Cube("center", program);
  const second_cube = new Cube("secondary", program);
  second_cube.scale = 0.8;

  bindBuffers(program, central_cube);
  bindBuffers(program, second_cube);

  drawScene(program, central_cube, second_cube);
});

/**
 * @param {WebGLProgram} program
 * @param {Cube} central_cube
 * @param {Cube} secondary_cube
 */
function drawScene(program, central_cube, secondary_cube) {
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  drawCentral(central_cube);

  drawSecondary(secondary_cube);

  window.requestAnimationFrame(function () {
    drawScene(program, central_cube, secondary_cube);
  });
}

/**
 * @param {Cube} central_cube
 */
function drawCentral(central_cube) {
  central_cube.theta[central_cube.axis] += central_cube.isStopped
    ? 0.0
    : central_cube.speed;

  if (!central_cube.isStoppedScale) {
    central_cube.updateScale(0.01);
  }

  GL.uniform3fv(central_cube.thetaLoc, central_cube.theta);
  GL.uniform4f(central_cube.translationLoc, 0.0, 0.0, 0.0, 0.0);
  GL.uniform1f(central_cube.scaleLoc, central_cube.scale);
  GL.uniform1f(central_cube.translationAngleLoc, 90);
  GL.uniform1f(central_cube.radiusLoc, 0.0);

  GL.drawArrays(GL.TRIANGLES, 0, 36);
}

/**
 * @param {Cube} secondary_cube
 */
function drawSecondary(secondary_cube) {
  secondary_cube.theta[secondary_cube.axis] += secondary_cube.isStopped
    ? 0.0
    : secondary_cube.speed;

  if (!secondary_cube.isStoppedOrbit) {
    secondary_cube.updateTranslation(secondary_cube.rotationSpeed);
  }

  GL.uniform3fv(secondary_cube.thetaLoc, secondary_cube.theta);
  GL.uniform1f(secondary_cube.scaleLoc, secondary_cube.scale);
  GL.uniform1f(
    secondary_cube.translationAngleLoc,
    secondary_cube.translationAngle
  );
  GL.uniform1f(secondary_cube.radiusLoc, 0.7);

  GL.drawArrays(GL.TRIANGLES, 0, 36);
}

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
  constructor(prefix, program) {
    this.prefix = prefix;
    const [points, colors] = colorCube();
    this.points = points;
    this.colors = colors;
    this.thetaLoc = GL.getUniformLocation(program, "theta");
    this.scaleLoc = GL.getUniformLocation(program, "vScale");
    this.translationLoc = GL.getUniformLocation(program, "vTranslation");
    this.translationAngleLoc = GL.getUniformLocation(
      program,
      "vTranslationAngle"
    );
    this.radiusLoc = GL.getUniformLocation(program, "radius");
    this.theta = [0, 0, 0];
    this.scale = 1.0;
    this.axis = 0;
    this.speed = 2.0;
    this.scaleGrowing = true;
    this.isStopped = false;
    this.isStoppedScale = true;
    this.isStoppedOrbit = false;
    this.translationAngle = 0;
    this.isTranslationStopped = false;
    this.rotationSpeed = 1.0;

    document
      .getElementById(this.prefix + "-xButton")
      .addEventListener("click", this.updateAxis.bind(this), false);

    document
      .getElementById(this.prefix + "-yButton")
      .addEventListener("click", this.updateAxis.bind(this), false);

    document
      .getElementById(this.prefix + "-zButton")
      .addEventListener("click", this.updateAxis.bind(this), false);

    document
      .getElementById(this.prefix + "-stop")
      .addEventListener("click", this.controlSpin.bind(this), false);

    document
      .getElementById(this.prefix + "-speed-slider")
      .addEventListener("input", this.setSpeed.bind(this), false);

    document
      .getElementById("center-stop-scale")
      .addEventListener("click", this.controlScale.bind(this), false);

    document
      .getElementById("secondary-rotation-speed-slider")
      .addEventListener("input", this.setRotationSpeed.bind(this), false);

    document
      .getElementById("secondary-orbital-stop")
      .addEventListener("click", this.controlOrbit.bind(this), false);
  }

  updateAxis(e) {
    switch (e.srcElement.id) {
      case this.prefix + "-xButton":
        this.axis = 0;
        break;
      case this.prefix + "-yButton":
        this.axis = 1;
        break;
      case this.prefix + "-zButton":
        this.axis = 2;
        break;
      default:
        this.axis = 0;
    }
  }

  controlSpin(e) {
    this.isStopped = !this.isStopped;
  }

  setSpeed(e) {
    const newSpeed = parseFloat(e.srcElement.value);
    if (!isNaN(newSpeed)) {
      this.speed = newSpeed;
    }

    document.getElementById(this.prefix + "-speed-info").innerHTML = this.speed;
  }

  updateScale(step) {
    if (this.scaleGrowing) {
      this.scale += step;

      if (this.scale >= 1.5) {
        this.scaleGrowing = false;
      }
    } else {
      this.scale -= step;

      if (this.scale <= 0.5) {
        this.scaleGrowing = true;
      }
    }
  }

  controlScale(e) {
    this.isStoppedScale = !this.isStoppedScale;
  }

  updateTranslation(step) {
    this.translationAngle += step;
  }

  setRotationSpeed(e) {
    const newSpeed = parseFloat(e.srcElement.value);
    if (!isNaN(newSpeed)) {
      this.rotationSpeed = newSpeed;
      document.getElementById("secondary-rotation-speed-info").innerHTML =
        this.rotationSpeed;
    }
  }

  controlOrbit(e) {
    this.isStoppedOrbit = !this.isStoppedOrbit;
  }
}
