type Point = {
  x: number
  y: number
  z: number
}

type ODEfunction = (t: number, point: Point, parameters: AttractorParameters) => Point;

export type AttractorParameters = {
  a: number
  b: number
  c: number
  d: number
}

export type SimulationOptions = {
  canvas: HTMLCanvasElement
  parameters?: Partial<AttractorParameters>
  stepsPerFrame?: number
  pointSize?: number
  warmupSteps?: number
  particleCount?: number
}

export type SimulationSnapshot = {
  frame: number
  iteration: number
  running: boolean
  parameters: AttractorParameters
}

export type SimulationController = {
  clear: () => void
  destroy: () => void
  getSnapshot: () => SimulationSnapshot
  reset: () => void
  resize: (width: number, height: number) => void
  start: () => void
  stop: () => void
}

const DEFAULT_PARAMETERS: AttractorParameters = {
  a: 0.9,
  b: -0.6013,
  c: 2,
  d: 0.5,
}

const DEFAULT_STEPS_PER_FRAME = 1
const DEFAULT_POINT_SIZE = 0.25
const DEFAULT_WARMUP_STEPS = 0
const DEFAULT_PARTICLE_COUNT = 50000
const DOMAIN_RADIUS = 1.7
const POINT_COLOR = 'rgba(38, 38, 38, 0.1)'

function createInitialPoint(): Point {
  return {
    x: Math.random() * 0.2 - 0.1,
    y: Math.random() * 0.2 - 0.1,
    z: 0,
  }
}

function createInitialPoints(count: number): Point[] {
    return Array.from({length: count}, () => createInitialPoint())
}

function gumowskiMira(
    value: number, 
    parameters: AttractorParameters,
): number {
    return parameters.a * value + 2 * (1 - parameters.a) * value**2 * (1 + value**2)**(-2)
}

const lorentz: ODEfunction = (t=1, point, parameters) => ({
    x: parameters.a * (point.x - point.y),
    y: point.x * (parameters.b - point.z) - point.y,
    z: point.x * point.y - parameters.c * point.z,
});

function RK4Delta(
    f: ODEfunction,
    t: number,
    point: Point,
    h: number,
    parameters: AttractorParameters,
): Point  {
    const k1: Point = f(t, point, parameters)
    const k2 = f(t + h/2, {
        x: point.x + h/2 * k1.x,
        y: point.y + h/2 * k1.y,
        z: point.z + h/2 * k1.z},
        parameters
    )
    const k3 = f(t + h/2, {
        x: point.x + h/2 * k2.x,
        y: point.y + h/2 * k2.y,
        z: point.z + h/2 * k2.z},
        parameters
    )
    const k4 = f(t + h, {
        x: point.x + h * k3.x,
        y: point.y + h * k3.y,
        z: point.z + h * k3.z},
        parameters
    )
    return {
        x: h/6 * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
        y: h/6 * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
        z: h/6 * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    }
}

function stepAttractor(
  point: Point,
  parameters: AttractorParameters,
): Point {
  return {
    x: point.x + RK4Delta(lorentz, 1, point, 0.01, parameters).x,
    y: point.y + RK4Delta(lorentz, 1, point, 0.01, parameters).y,
    z: point.z + RK4Delta(lorentz, 1, point, 0.01, parameters).z,
    // x: parameters.b * point.y + gumowskiMira(point.x, parameters),
    // y: gumowskiMira(parameters.b * point.y + gumowskiMira(point.x, parameters), parameters) - point.x
  }
}

function projectPoint(point: Point, width: number, height: number): Point {
  const scale = Math.min(width, height) / (DOMAIN_RADIUS * 2)

  return {
    x: width * 0.5 + point.x * scale,
    y: height * 0.5 - point.y * scale,
    z: 0,
  }
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('2D canvas context is not available.')
  }

  return context
}

function isValidPoint(point: Point): boolean {
    if (!Number.isFinite(point["x"]) || Math.abs((point["x"])) > 100) {
        return false;
    }
    if (!Number.isFinite(point["y"]) || Math.abs((point["y"])) > 100) {
        return false;
    }
    if (!Number.isFinite(point["z"])|| Math.abs((point["z"])) > 100) {
        return false;
    }
    return true;
            
}

export function createSimulation(
  options: SimulationOptions,
): SimulationController {
  const {
    canvas,
    pointSize = DEFAULT_POINT_SIZE,
    stepsPerFrame = DEFAULT_STEPS_PER_FRAME,
    warmupSteps = DEFAULT_WARMUP_STEPS,
    particleCount = DEFAULT_PARTICLE_COUNT,
  } = options
  const context = getContext(canvas)
  const parameters: AttractorParameters = {
    ...DEFAULT_PARAMETERS,
    ...options.parameters,
  }

  let points = createInitialPoints(particleCount)
  let frame = 0
  let iteration = 0
  let animationFrameId: number | null = null
  let running = false

  const clear = () => {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  const warmup = () => {
    for (let particle = 0; particle < points.length; particle += 1) {
        for (let index = 0; index < warmupSteps; index += 1) {
            points[particle] = stepAttractor(points[particle], parameters)
            if (!isValidPoint(points[particle])) {
                points[particle] = createInitialPoint()
            }
        }
    }
    
  }

  const drawFrame = () => {
    context.fillStyle = POINT_COLOR

    clear()

    for (let index = 0; index < stepsPerFrame; index += 1) {
        for (let particle = 0; particle < points.length; particle += 1) {
            points[particle] = stepAttractor(points[particle], parameters)
            if (!isValidPoint(points[particle])) {
                points[particle] = createInitialPoint()
            }
            const rect = canvas.getBoundingClientRect()
            const pixel = projectPoint(points[particle], rect.width, rect.height)
            context.fillRect(pixel.x, pixel.y, pointSize, pointSize)
            iteration += 1
        }
    }

    frame += 1
  }

  const queueNextFrame = () => {
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null

      if (!running) {
        return
      }

      drawFrame()
      queueNextFrame()
    })
  }

  const start = () => {
    if (running) {
      return
    }

    running = true

    if (animationFrameId === null) {
      queueNextFrame()
    }
  }

  const stop = () => {
    running = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const reset = () => {
    points = createInitialPoints(particleCount)
    frame = 0
    iteration = 0
    clear()
    warmup()
  }

  const resize = (width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(dpr, dpr)

    clear()
  }

  const getSnapshot = (): SimulationSnapshot => ({
    frame,
    iteration,
    running,
    parameters: { ...parameters },
  })

  const destroy = () => {
    stop()
    clear()
  }

  reset()

  return {
    clear,
    destroy,
    getSnapshot,
    reset,
    resize,
    start,
    stop,
  }
}
