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
var radius = 0.1;
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

const uv_mappings = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0),
];

var pointsend = 0;

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
  const platform = new Platform();
  const sphere = new Sphere();
  const cylinder = new Cylinder();

  // Bind buffers
  bindBuffers(program, cube, platform, sphere, cylinder);

  drawScene(program, cube, platform, sphere, cylinder);
});

/**
 * @param {WebGLProgram} program
 * @param {Cube} cube
 * @param {Platform} platform
 * @param {Sphere} sphere
 * @param {Cylinder} cylinder
 */
function drawScene(program, cube, platform, sphere, cylinder) {
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  drawCube(program, cube);
  drawPlatform(program, platform);
  drawSphere(program, sphere);
  drawCyclinder(program, cylinder);

  updateCamera(program);

  window.requestAnimationFrame(function () {
    drawScene(program, cube, platform, sphere, cylinder);
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
 * @param {Platform} platform
 */
function drawPlatform(program, platform) {
  const matrixLoc = GL.getUniformLocation(program, "u_matrix");

  let matrix = m4.translation(...platform.tranlation);
  matrix = m4.scale(matrix, ...platform.scale);
  GL.uniformMatrix4fv(matrixLoc, false, matrix);

  GL.bindTexture(GL.TEXTURE_2D, platform.texture);
  GL.activeTexture(GL.TEXTURE0);

  GL.drawArrays(GL.TRIANGLES, 36, 72);
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
  matrix = m4.multiply(matrix, m4.zRotation(cube.theta[2] * 5));

  const matrixLoc = GL.getUniformLocation(program, "u_matrix");
  GL.uniformMatrix4fv(matrixLoc, false, matrix);

  GL.bindTexture(GL.TEXTURE_2D, cube.texture);
  GL.activeTexture(GL.TEXTURE0);

  GL.drawArrays(GL.TRIANGLES, 0, 36);
}

function drawSphere(program, sphere) {
  const matrixLoc = GL.getUniformLocation(program, "u_matrix");
  var matrix = m4.scaling(0.2, 0.2, 0.2);
  matrix = m4.translate(matrix, 4, 4, 0);

  GL.uniformMatrix4fv(matrixLoc, false, matrix);
  pointsend = 72 + sphere.points.length;

  GL.bindTexture(GL.TEXTURE_2D, sphere.texture);
  GL.activeTexture(GL.TEXTURE0);

  GL.drawArrays(GL.TRIANGLES, 72, 72 + sphere.points.length);
}

function drawCyclinder(program, cylinder) {
  const matrixLoc = GL.getUniformLocation(program, "u_matrix");
  var matrix = m4.scaling(0.1, 0.1, 0.1);
  matrix = m4.translate(matrix, 1, 1, 0);

  GL.uniformMatrix4fv(matrixLoc, false, matrix);
  GL.drawArrays(GL.TRIANGLES, pointsend, pointsend + cylinder.points.length);
}

/**
 * @param {WebGLProgram} program
 * @param {Cube} cube
 * @param {Platform} platform
 * @param {Sphere} sphere
 * @param {Cylinder} cylinder
 */
function bindBuffers(program, cube, platform, sphere, cylinder) {
  // COLOR
  var colorBuffer = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, colorBuffer);
  GL.bufferData(
    GL.ARRAY_BUFFER,
    flatten(
      cube.colors
        .concat(platform.colors)
        .concat(sphere.colors)
        .concat(cylinder.colors)
    ),
    GL.STATIC_DRAW
  );

  var vColor = GL.getAttribLocation(program, "vColor");
  GL.vertexAttribPointer(vColor, 4, GL.FLOAT, false, 0, 0);
  GL.enableVertexAttribArray(vColor);

  // VERTEX
  const all_points = cube.points
    .concat(platform.points)
    .concat(sphere.points)
    .concat(cylinder.points);

  var verticesBuffer = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, verticesBuffer);
  GL.bufferData(GL.ARRAY_BUFFER, flatten(all_points), GL.STATIC_DRAW);

  var vPosition = GL.getAttribLocation(program, "vPosition");
  GL.vertexAttribPointer(vPosition, 4, GL.FLOAT, false, 0, 0);
  GL.enableVertexAttribArray(vPosition);

  // TEXTURE
  var textureBuffer = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, textureBuffer);
  GL.bufferData(
    GL.ARRAY_BUFFER,
    flatten(
      cube.texture_mappings
        .concat(platform.texture_mappings)
        .concat(sphere.texture_mappings)
    ),
    GL.STATIC_DRAW
  );

  var texCoord = GL.getAttribLocation(program, "a_texcoord");
  GL.vertexAttribPointer(texCoord, 2, GL.FLOAT, false, 0, 0);
  GL.enableVertexAttribArray(texCoord);

  // TEXTURE CREATION
  var platform_image = document.getElementById("platform-texture");
  var rocket_image = document.getElementById("rocket-texture");
  var sphere_image = document.getElementById("sphere-texture");

  // ROCKET TEXTURE
  var rocketTexture = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, rocketTexture);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);

  GL.texImage2D(
    GL.TEXTURE_2D,
    0,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    rocket_image
  );

  cube.texture = rocketTexture;

  // PLATFORM TEXTURE
  var platformTexture = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, platformTexture);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);

  GL.texImage2D(
    GL.TEXTURE_2D,
    0,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    platform_image
  );

  platform.texture = platformTexture;

  // SPHERE TEXTURE
  var sphereTexture = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, sphereTexture);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
  GL.texImage2D(
    GL.TEXTURE_2D,
    0,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    sphere_image
  );

  sphere.texture = sphereTexture;
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
  const [q0_v, q0_c, q0_tm] = quad(1, 0, 3, 2);
  const [q1_v, q1_c, q1_tm] = quad(2, 3, 7, 6);
  const [q2_v, q2_c, q2_tm] = quad(3, 0, 4, 7);
  const [q3_v, q3_c, q3_tm] = quad(6, 5, 1, 2);
  const [q4_v, q4_c, q4_tm] = quad(4, 5, 6, 7);
  const [q5_v, q5_c, q5_tm] = quad(5, 4, 0, 1);

  return [
    [].concat(q0_v, q1_v, q2_v, q3_v, q4_v, q5_v),
    [].concat(q0_c, q1_c, q2_c, q3_c, q4_c, q5_c),
    [].concat(q0_tm, q1_tm, q2_tm, q3_tm, q4_tm, q5_tm),
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
  var quadTexMap = [];

  for (var i = 0; i < indices.length; ++i) {
    quadPoints.push(vertices[indices[i]]);
    quadColors.push(vertexColors[a]);
    quadTexMap.push(uv_mappings[i % 6]);
  }

  return [quadPoints, quadColors, quadTexMap];
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
    const [points, colors, texture_mappings] = colorCube();
    this.points = points;
    this.colors = colors;
    this.texture_mappings = texture_mappings;
    this.texture = undefined;
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

class Platform {
  constructor() {
    const [points, c, texture_mappings] = colorCube();
    const colors = points.map((p) => [WHITE.r, WHITE.g, WHITE.b, WHITE.a]);
    this.points = points;
    this.colors = colors;
    this.texture_mappings = texture_mappings;
    this.texture = undefined;
    this.tranlation = [0, -1.0, 0];
    this.scale = [1.5, 0.2, 1.5];
  }
}

class Sphere {
  constructor() {
    var data = sphere();
    this.points = data.TriangleVertices;
    this.colors = data.TriangleVertexColors;
    this.texture_mappings = data.TextureCoordinates;
    this.texture = undefined;
  }
}

class Cylinder {
  constructor() {
    var data = cylinder();
    this.points = data.TriangleVertices;
    this.colors = data.TriangleVertexColors;
  }
}

function sphere(numSubdivisions) {
  var subdivisions = 3;
  if (numSubdivisions) subdivisions = numSubdivisions;

  var data = {};

  //var radius = 0.5;

  var sphereVertexCoordinates = [];
  var sphereVertexCoordinatesNormals = [];
  var sphereVertexColors = [];
  var sphereTextureCoordinates = [];
  var sphereNormals = [];

  var va = vec4(0.0, 0.0, -1.0, 1);
  var vb = vec4(0.0, 0.942809, 0.333333, 1);
  var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
  var vd = vec4(0.816497, -0.471405, 0.333333, 1);

  function triangle(a, b, c) {
    sphereVertexCoordinates.push([a[0], a[1], a[2], 1]);
    sphereVertexCoordinates.push([b[0], b[1], b[2], 1]);
    sphereVertexCoordinates.push([c[0], c[1], c[2], 1]);

    // normals are vectors

    sphereNormals.push([a[0], a[1], a[2]]);
    sphereNormals.push([b[0], b[1], b[2]]);
    sphereNormals.push([c[0], c[1], c[2]]);

    sphereVertexColors.push([
      (1 + a[0]) / 2.0,
      (1 + a[1]) / 2.0,
      (1 + a[2]) / 2.0,
      1.0,
    ]);
    sphereVertexColors.push([
      (1 + b[0]) / 2.0,
      (1 + b[1]) / 2.0,
      (1 + b[2]) / 2.0,
      1.0,
    ]);
    sphereVertexColors.push([
      (1 + c[0]) / 2.0,
      (1 + c[1]) / 2.0,
      (1 + c[2]) / 2.0,
      1.0,
    ]);

    sphereTextureCoordinates.push([
      (0.5 * Math.acos(a[0])) / Math.PI,
      (0.5 * Math.asin(a[1] / Math.sqrt(1.0 - a[0] * a[0]))) / Math.PI,
    ]);
    sphereTextureCoordinates.push([
      (0.5 * Math.acos(b[0])) / Math.PI,
      (0.5 * Math.asin(b[1] / Math.sqrt(1.0 - b[0] * b[0]))) / Math.PI,
    ]);
    sphereTextureCoordinates.push([
      (0.5 * Math.acos(c[0])) / Math.PI,
      (0.5 * Math.asin(c[1] / Math.sqrt(1.0 - c[0] * c[0]))) / Math.PI,
    ]);

    //sphereTextureCoordinates.push([0.5+Math.asin(a[0])/Math.PI, 0.5+Math.asin(a[1])/Math.PI]);
    //sphereTextureCoordinates.push([0.5+Math.asin(b[0])/Math.PI, 0.5+Math.asin(b[1])/Math.PI]);
    //sphereTextureCoordinates.push([0.5+Math.asin(c[0])/Math.PI, 0.5+Math.asin(c[1])/Math.PI]);
  }

  function divideTriangle(a, b, c, count) {
    if (count > 0) {
      var ab = mix(a, b, 0.5);
      var ac = mix(a, c, 0.5);
      var bc = mix(b, c, 0.5);

      ab = normalize(ab, true);
      ac = normalize(ac, true);
      bc = normalize(bc, true);

      divideTriangle(a, ab, ac, count - 1);
      divideTriangle(ab, b, bc, count - 1);
      divideTriangle(bc, c, ac, count - 1);
      divideTriangle(ab, bc, ac, count - 1);
    } else {
      triangle(a, b, c);
    }
  }

  function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
  }

  tetrahedron(va, vb, vc, vd, subdivisions);

  data.TriangleVertices = sphereVertexCoordinates;
  //data.TriangleNormals = sphereNormals;
  data.TriangleVertexColors = sphereVertexColors;
  data.TextureCoordinates = sphereTextureCoordinates;
  return data;
}

function cylinder(numSlices, numStacks, caps) {
  var slices = 36;
  if (numSlices) slices = numSlices;
  var stacks = 1;
  if (numStacks) stacks = numStacks;
  var capsFlag = true;
  if (caps == false) capsFlag = caps;

  var data = {};

  var top = 0.5;
  var bottom = -0.5;
  var radius = 0.5;
  var topCenter = [0.0, top, 0.0];
  var bottomCenter = [0.0, bottom, 0.0];

  var sideColor = [1.0, 0.0, 0.0, 1.0];
  var topColor = [0.0, 1.0, 0.0, 1.0];
  var bottomColor = [0.0, 0.0, 1.0, 1.0];

  var cylinderVertexCoordinates = [];
  var cylinderNormals = [];
  var cylinderVertexColors = [];
  var cylinderTextureCoordinates = [];

  // side

  for (var j = 0; j < stacks; j++) {
    var stop = bottom + ((j + 1) * (top - bottom)) / stacks;
    var sbottom = bottom + (j * (top - bottom)) / stacks;
    var topPoints = [];
    var bottomPoints = [];
    var topST = [];
    var bottomST = [];
    for (var i = 0; i < slices; i++) {
      var theta = (2.0 * i * Math.PI) / slices;
      topPoints.push([
        radius * Math.sin(theta),
        stop,
        radius * Math.cos(theta),
        1.0,
      ]);
      bottomPoints.push([
        radius * Math.sin(theta),
        sbottom,
        radius * Math.cos(theta),
        1.0,
      ]);
    }

    topPoints.push([0.0, stop, radius, 1.0]);
    bottomPoints.push([0.0, sbottom, radius, 1.0]);

    for (var i = 0; i < slices; i++) {
      var a = topPoints[i];
      var d = topPoints[i + 1];
      var b = bottomPoints[i];
      var c = bottomPoints[i + 1];
      var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      var v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];

      var normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];

      var mag = Math.sqrt(
        normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
      );
      normal = [normal[0] / mag, normal[1] / mag, normal[2] / mag];
      cylinderVertexCoordinates.push([a[0], a[1], a[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        (i + 1) / slices,
        (j * (top - bottom)) / stacks,
      ]);

      cylinderVertexCoordinates.push([b[0], b[1], b[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        i / slices,
        ((j - 1) * (top - bottom)) / stacks,
      ]);

      cylinderVertexCoordinates.push([c[0], c[1], c[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        (i + 1) / slices,
        ((j - 1) * (top - bottom)) / stacks,
      ]);

      cylinderVertexCoordinates.push([a[0], a[1], a[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        (i + 1) / slices,
        (j * (top - bottom)) / stacks,
      ]);

      cylinderVertexCoordinates.push([c[0], c[1], c[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        (i + 1) / slices,
        ((j - 1) * (top - bottom)) / stacks,
      ]);

      cylinderVertexCoordinates.push([d[0], d[1], d[2], 1.0]);
      cylinderVertexColors.push(sideColor);
      cylinderNormals.push([normal[0], normal[1], normal[2]]);
      cylinderTextureCoordinates.push([
        (i + 1) / slices,
        (j * (top - bottom)) / stacks,
      ]);
    }
  }

  var topPoints = [];
  var bottomPoints = [];
  for (var i = 0; i < slices; i++) {
    var theta = (2.0 * i * Math.PI) / slices;
    topPoints.push([
      radius * Math.sin(theta),
      top,
      radius * Math.cos(theta),
      1.0,
    ]);
    bottomPoints.push([
      radius * Math.sin(theta),
      bottom,
      radius * Math.cos(theta),
      1.0,
    ]);
  }
  topPoints.push([0.0, top, radius, 1.0]);
  bottomPoints.push([0.0, bottom, radius, 1.0]);

  if (capsFlag) {
    //top

    for (i = 0; i < slices; i++) {
      normal = [0.0, 1.0, 0.0];
      var a = [0.0, top, 0.0, 1.0];
      var b = topPoints[i];
      var c = topPoints[i + 1];
      cylinderVertexCoordinates.push([a[0], a[1], a[2], 1.0]);
      cylinderVertexColors.push(topColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);

      cylinderVertexCoordinates.push([b[0], b[1], b[2], 1.0]);
      cylinderVertexColors.push(topColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);

      cylinderVertexCoordinates.push([c[0], c[1], c[2], 1.0]);
      cylinderVertexColors.push(topColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);
    }

    //bottom

    for (i = 0; i < slices; i++) {
      normal = [0.0, -1.0, 0.0];
      var a = [0.0, bottom, 0.0, 1.0];
      var b = bottomPoints[i];
      var c = bottomPoints[i + 1];
      cylinderVertexCoordinates.push([a[0], a[1], a[2], 1.0]);
      cylinderVertexColors.push(bottomColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);

      cylinderVertexCoordinates.push([b[0], b[1], b[2], 1.0]);
      cylinderVertexColors.push(bottomColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);

      cylinderVertexCoordinates.push([c[0], c[1], c[2], 1.0]);
      cylinderVertexColors.push(bottomColor);
      cylinderNormals.push(normal);
      cylinderTextureCoordinates.push([0, 1]);
    }
  }

  data.TriangleVertices = cylinderVertexCoordinates;
  data.TriangleNormals = cylinderNormals;
  data.TriangleVertexColors = cylinderVertexColors;
  data.TextureCoordinates = cylinderTextureCoordinates;
  return data;
}
