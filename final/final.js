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

var near = -1;
var far = 1;
var radius = 0.5;
var dr = (5.0 * Math.PI) / 180.0;
var theta = 0.0 + 5 * dr;
var phi = 0.0 + 5 * dr;

var left = -1.0;
var right = 1.0;
var ytop = 1.0;
var bottom = -1.0;

var mvMatrix, pMatrix;
var modelView, projection;
var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.addEventListener("load", () => {
  const program = init();

  if (!program) {
    return;
  }

  const matrixLoc = GL.getUniformLocation(program, "u_matrix");
  const projectionLoc = GL.getUniformLocation(program, "u_projection");
  const modelViewLoc = GL.getUniformLocation(program, "u_modelView");

  mvMatrix = m4.identity();
  pMatrix = m4.identity();

  GL.uniformMatrix4fv(matrixLoc, false, m4.identity());
  GL.uniformMatrix4fv(projectionLoc, false, m4.identity());
  GL.uniformMatrix4fv(modelViewLoc, false, m4.identity());

  const cube = new Cube();
  const platform = new Cube();

  // Bind buffers
  bindBuffersCube(program, cube);
  bindBuffersCube(program, platform);

  drawScene(program, cube, platform);
});

/**
 * @param {WebGLProgram} program
 * @param {Cube} cube
 * @param {Cube} platform
 */
function drawScene(program, cube, platform) {
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  drawCube(program, cube);
  drawPlatform(program, platform);

  updateCamera(program);

  window.requestAnimationFrame(function () {
    drawScene(program, cube, platform);
  });
}

/**
 * @param {WebGLProgram} program
 */
function updateCamera(program) {
  eye = vec3(
    radius * Math.sin(phi),
    radius * Math.sin(theta),
    radius * Math.cos(phi)
  );

  mvMatrix = lookAt(eye, at, up);
  pMatrix = ortho(left, right, bottom, ytop, near, far);

  const projectionLoc = GL.getUniformLocation(program, "u_projection");
  const modelViewLoc = GL.getUniformLocation(program, "u_modelView");

  GL.uniformMatrix4fv(modelViewLoc, false, flatten(mvMatrix));
  GL.uniformMatrix4fv(projectionLoc, false, flatten(pMatrix));
}

/**
 * @param {WebGLProgram}
 * @param {Cube} platform
 */
function drawPlatform(program, platform) {
  const matrixLoc = GL.getUniformLocation(program, "u_matrix");

  let matrix = m4.translation(0, -0.8, 0);
  matrix = m4.scale(matrix, 1.5, 0.1, 1.5);
  GL.uniformMatrix4fv(matrixLoc, false, matrix);

  GL.drawArrays(GL.TRIANGLES, 0, 36);
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

  cube.time += 0.00000001;

  cube.translation[1] += displacement_y;
  cube.translation[0] += displacement_x;

  let matrix = m4.translation(...cube.translation);
  matrix = m4.multiply(matrix, m4.zRotation(cube.theta[2]));

  const matrixLoc = GL.getUniformLocation(program, "u_matrix");
  GL.uniformMatrix4fv(matrixLoc, false, matrix);

  GL.drawArrays(GL.TRIANGLES, 0, 36);
}

/**
 *
 * @param {WebGLProgram} program
 * @param {Cube} cube
 */
function bindBuffersCube(program, cube) {
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

  document.getElementById("Button1").onclick = function () {
    near *= 1.1;
    far *= 1.1;
  };
  document.getElementById("Button2").onclick = function () {
    near *= 0.9;
    far *= 0.9;
  };
  document.getElementById("Button3").onclick = function () {
    radius *= 1.1;
  };
  document.getElementById("Button4").onclick = function () {
    radius *= 0.9;
  };
  document.getElementById("Button5").onclick = function () {
    theta += dr;
  };
  document.getElementById("Button6").onclick = function () {
    theta -= dr;
  };
  document.getElementById("Button7").onclick = function () {
    phi += dr;
  };
  document.getElementById("Button8").onclick = function () {
    phi -= dr;
  };

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

var m4 = {
  projection: function (width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
      2 / width,
      0,
      0,
      0,
      0,
      -2 / height,
      0,
      0,
      0,
      0,
      2 / depth,
      0,
      -1,
      1,
      0,
      1,
    ];
  },

  multiply: function (a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function (tx, ty, tz) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1];
  },

  xRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },

  yRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },

  zRotation: function (angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },

  scaling: function (sx, sy, sz) {
    return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
  },

  translate: function (m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function (m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function (m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

  identity: function () {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
};

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
