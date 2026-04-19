export type Renderer = {
  destroy: () => void
  render: (matrix: Float32Array) => void
  resize: (width: number, height: number) => void
  setColors: (data: Float32Array) => void
  setPositions: (data: Float32Array) => void
}

export type RendererOptions = {
  clearColor?: [number, number, number, number]
  pointSize?: number
}

const VERTEX_SHADER_SOURCE = `
attribute vec3 a_position;
attribute vec3 a_color;
varying vec3 v_color;

uniform mat4 u_matrix;
uniform float u_pointSize;

void main() {
  gl_Position = u_matrix * vec4(a_position, 1.0);
  gl_PointSize = u_pointSize;
  v_color = a_color;
}
`

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 0.9);
}
`

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)

  if (!shader) {
    throw new Error('Failed to create WebGL shader.')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.'
    gl.deleteShader(shader)
    throw new Error(info)
  }

  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()

  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('Failed to create WebGL program.')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.'
    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error(info)
  }

  gl.detachShader(program, vertexShader)
  gl.detachShader(program, fragmentShader)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  return program
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): Renderer {
  const gl = canvas.getContext('webgl')

  if (!gl) {
    throw new Error('WebGL is not available in this browser.')
  }

  const program = createProgram(
    gl,
    VERTEX_SHADER_SOURCE,
    FRAGMENT_SHADER_SOURCE,
  )
  const positionBuffer = gl.createBuffer()

  if (!positionBuffer) {
    gl.deleteProgram(program)
    throw new Error('Failed to create WebGL position buffer')
  }

  const colorBuffer = gl.createBuffer()

  if (!colorBuffer) {
    gl.deleteBuffer(positionBuffer)
    gl.deleteProgram(program)
    throw new Error('Failed to create WebGL color buffer')
  }

  const aPosition = gl.getAttribLocation(program, 'a_position')
  const aColor = gl.getAttribLocation(program, 'a_color')
  const uMatrix = gl.getUniformLocation(program, 'u_matrix')
  const uPointSize = gl.getUniformLocation(program, 'u_pointSize')

  if (aPosition < 0 || aColor < 0 || !uMatrix || !uPointSize) {
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(colorBuffer)
    gl.deleteProgram(program)
    throw new Error('Failed to look up WebGL shader locations.')
  }

  let pointCount = 0
  const clearColor = options.clearColor ?? [1, 1, 1, 0]
  const pointSize = options.pointSize ?? 3.5

  gl.clearColor(...clearColor)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.DEPTH_TEST)

  const setPositions = (data: Float32Array) => {
    pointCount = data.length / 3
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
  }

  const setColors = (data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
  }

  const resize = (width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const render = (matrix: Float32Array) => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    if (pointCount === 0) {
      return
    }

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.enableVertexAttribArray(aColor)
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0)

    gl.uniformMatrix4fv(uMatrix, false, matrix)
    gl.uniform1f(uPointSize, pointSize)

    gl.drawArrays(gl.POINTS, 0, pointCount)
  }

  const destroy = () => {
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(colorBuffer)
    gl.deleteProgram(program)
  }

  return {
    destroy,
    render,
    resize,
    setColors,
    setPositions,
  }
}
