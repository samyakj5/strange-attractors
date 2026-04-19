type Vec3 = {
  x: number
  y: number
  z: number
}

type ODEFunction = (
  t: number,
  point: Vec3,
  parameters: AttractorParameters,
) => Vec3

export type AttractorParameters = {
  a: number
  b: number
  c: number
  d: number
}

export type LorenzSimulation = {
  step: () => void
  getColors: () => Float32Array
  getPositions: () => Float32Array
  setDt: (dt: number) => void
  setParticleCount: (count: number) => void
}

const DEFAULT_PARAMETERS: AttractorParameters = {
  a: 10,
  b: 28,
  c: 8 / 3,
  d: 0.5,
}

const SPEED_COLOR_MAX = 175

const lorenz: ODEFunction = (_t = 1, point, parameters) => ({
  x: parameters.a * (point.y - point.x),
  y: point.x * (parameters.b - point.z) - point.y,
  z: point.x * point.y - parameters.c * point.z,
})

function RK4Delta(
  f: ODEFunction,
  t: number,
  point: Vec3,
  h: number,
  parameters: AttractorParameters,
): Vec3 {
  const k1 = f(t, point, parameters)
  const k2 = f(
    t + h / 2,
    {
      x: point.x + (h / 2) * k1.x,
      y: point.y + (h / 2) * k1.y,
      z: point.z + (h / 2) * k1.z,
    },
    parameters,
  )
  const k3 = f(
    t + h / 2,
    {
      x: point.x + (h / 2) * k2.x,
      y: point.y + (h / 2) * k2.y,
      z: point.z + (h / 2) * k2.z,
    },
    parameters,
  )
  const k4 = f(
    t + h,
    {
      x: point.x + h * k3.x,
      y: point.y + h * k3.y,
      z: point.z + h * k3.z,
    },
    parameters,
  )

  return {
    x: (h / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: (h / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: (h / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  }
}

function getSpeed(delta: Vec3, dt: number): number {
  return Math.hypot(delta.x, delta.y, delta.z) / dt
}

function getNormalizedSpeed(speed: number): number {
  return Math.max(0, Math.min(1, speed / SPEED_COLOR_MAX))
}

function makeParticles(count: number): Vec3[] {
  return Array.from({ length: count }, () => ({
    // x: 3 + (Math.random() - 0.5) * 5,
    // y: 3 + (Math.random() - 0.5) * 5,
    // z: Math.random() * 7 + 10,

    x: (Math.random() - 0.5) * 100,
    y: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
  }))
}

export function createLorenzSimulation(
  initialCount: number,
  initialDt: number,
): LorenzSimulation {
  let count = initialCount
  let dt = initialDt
  let points = makeParticles(count)
  let positions = new Float32Array(count * 3)
  let colors = new Float32Array(count * 3)

  const writeParticle = (index: number, point: Vec3, speed: number) => {
    positions[index * 3] = point.x
    positions[index * 3 + 1] = point.y
    positions[index * 3 + 2] = point.z

    const t = getNormalizedSpeed(speed)
    colors[index * 3] = 0.0 + 0.6 * t
    colors[index * 3 + 1] = 0.5 - 0.5 * t
    colors[index * 3 + 2] = 1.0 - 0.5 * t
  }

  for (let i = 0; i < count; i += 1) {
    const delta = RK4Delta(lorenz, 0, points[i], dt, DEFAULT_PARAMETERS)
    writeParticle(i, points[i], getSpeed(delta, dt))
  }

  const step = () => {
    for (let i = 0; i < count; i += 1) {
      const delta = RK4Delta(lorenz, 0, points[i], dt, DEFAULT_PARAMETERS)

      points[i] = {
        x: points[i].x + delta.x,
        y: points[i].y + delta.y,
        z: points[i].z + delta.z,
      }

      writeParticle(i, points[i], getSpeed(delta, dt))
    }
  }

  const setDt = (newDt: number) => {
    dt = newDt
  }

  const setParticleCount = (newCount: number) => {
    if (newCount === count) return

    const newPositions = new Float32Array(newCount * 3)
    const newColors = new Float32Array(newCount * 3)

    if (newCount > count) {
      // Preserve existing particles, append fresh ones at the end
      newPositions.set(positions)
      newColors.set(colors)
      const added = makeParticles(newCount - count)
      points = [...points, ...added]

      // Update references before calling writeParticle so it writes into the new arrays
      positions = newPositions
      colors = newColors

      for (let i = count; i < newCount; i += 1) {
        const delta = RK4Delta(lorenz, 0, points[i], dt, DEFAULT_PARAMETERS)
        writeParticle(i, points[i], getSpeed(delta, dt))
      }
    } else {
      // Preserve the first newCount particles, drop the rest
      newPositions.set(positions.subarray(0, newCount * 3))
      newColors.set(colors.subarray(0, newCount * 3))
      points = points.slice(0, newCount)

      positions = newPositions
      colors = newColors
    }

    count = newCount
  }

  return {
    step,
    getColors: () => colors,
    getPositions: () => positions,
    setDt,
    setParticleCount,
  }
}
