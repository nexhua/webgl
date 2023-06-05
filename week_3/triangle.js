var gl;

window.onload = function init() {
  var canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  console.log(gl);

  var vertices = new Float32Array([-1, -1, 0, 1, 1, -1]);
  var verticesReverse = new Float32Array([-1, 1, 0, -1, 50 / 512, 1]);

  var square = new Float32Array([
    -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
  ]);

  var line = new Array(50).map((_, i) => {
    return i / 10;
  });

  line = new Float32Array([-1, -1, 0, 1, 1, -1]);

  verticesCorr = new Float32Array(
    [-256.0, -256.0, 0, 256.0, 256.0, -256.0].map((number) => number / 256)
  );
  //  Configure WebGL

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);

  //  Load shaders and initialize attribute buffers

  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Load the data into the GPU

  var color = gl.getUniformLocation(program, "fColor");

  gl.uniform4f(color, 1.0, 0.0, 0.0, 1);
  console.log(color);

  var bufferId_0 = bufferData(verticesCorr);
  var bufferId_1 = bufferData(verticesReverse);
  var bufferId_2 = bufferData(line);
  var bufferId_3 = bufferData(square);

  // Associate out shader variables with our data buffer
  //associateShader(program);

  //renderTriangle(program, bufferId_0);
  //gl.uniform4f(color, 0.0, 0.0, 1.0, 1);
  //renderTriangle(program, bufferId_1);
  //renderLine(program, bufferId_2, 0, 4);

  render_(program, gl.TRIANGLE_STRIP, bufferId_3, 0, 5);
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 5);
}

function render_(program, type, buffer, start, length) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  associateShader(program);
  gl.drawArrays(type, start, length);
}

function renderTriangle(program, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  associateShader(program);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function renderLine(program, buffer, start, length) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  associateShader(program);
  gl.drawArrays(gl.LINES, start, length);
}

function associateShader(program) {
  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
}
/**
 * Buffers the given array and returns its
 * @param {Float32Array} vertices - Vertices of a 2D shape
 * @returns {string}
 */
function bufferData(vertices) {
  const bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  return bufferId;
}
