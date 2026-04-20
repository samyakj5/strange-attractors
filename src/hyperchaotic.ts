export type Vec4 = { x: number; y: number; z: number; w: number }

const A = 8
const B = 40
const C = 14.9
const W_RANGE = 15

function ode(p: Vec4): Vec4 {
  return {
    x: A * p.x - p.y * p.z + p.w,
    y: p.x * p.z - B * p.y,
    z: p.x * p.y - C * p.z + p.x * p.w,
    w: -p.y,
  }
}

function rk4Step(p: Vec4, h: number): Vec4 {
  const k1 = ode(p)
  const k2 = ode({ x: p.x + h/2*k1.x, y: p.y + h/2*k1.y, z: p.z + h/2*k1.z, w: p.w + h/2*k1.w })
  const k3 = ode({ x: p.x + h/2*k2.x, y: p.y + h/2*k2.y, z: p.z + h/2*k2.z, w: p.w + h/2*k2.w })
  const k4 = ode({ x: p.x + h*k3.x,   y: p.y + h*k3.y,   z: p.z + h*k3.z,   w: p.w + h*k3.w   })
  return {
    x: p.x + h/6 * (k1.x + 2*k2.x + 2*k3.x + k4.x),
    y: p.y + h/6 * (k1.y + 2*k2.y + 2*k3.y + k4.y),
    z: p.z + h/6 * (k1.z + 2*k2.z + 2*k3.z + k4.z),
    w: p.w + h/6 * (k1.w + 2*k2.w + 2*k3.w + k4.w),
  }
}

function wColor(w: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (w + W_RANGE) / (2 * W_RANGE)))
  return [0.2 + 0.8*t, 0.1 * (1 - Math.abs(2*t - 1)), 0.9 - 0.9*t]
}

function makeParticles(count: number, initialW: number): Vec4[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 2,
    w: initialW + (Math.random() - 0.5) * 2 * W_RANGE,
  }))
}

export type HyperchaoticSimulation = {
  step: () => void
  getPositions: () => Float32Array
  getColors: () => Float32Array
  getWValues: () => Float32Array
  setInitialW: (w: number) => void
  setDt: (dt: number) => void
  setParticleCount: (count: number) => void
  setWFilter: (center: number, epsilon: number) => void
  clearWFilter: () => void
}

export function createHyperchaoticSimulation(
  initialCount: number,
  initialDt: number,
  initialW: number,
): HyperchaoticSimulation {
  let count = initialCount
  let dt = initialDt
  let points = makeParticles(count, initialW)
  let positions = new Float32Array(count * 3)
  let colors = new Float32Array(count * 3)
  let wValues = new Float32Array(count)
  let filteredColors = new Float32Array(count * 3)
  let filterActive = false
  let filterCenter = 0
  let filterEpsilon = 1

  const rebuildFilter = () => {
    for (let i = 0; i < count; i++) {
      if (Math.abs(wValues[i] - filterCenter) <= filterEpsilon) {
        filteredColors[i*3]   = colors[i*3]
        filteredColors[i*3+1] = colors[i*3+1]
        filteredColors[i*3+2] = colors[i*3+2]
      } else {
        filteredColors[i*3] = filteredColors[i*3+1] = filteredColors[i*3+2] = 0
      }
    }
  }

  const setWFilter = (center: number, epsilon: number) => {
    filterCenter = center
    filterEpsilon = epsilon
    filterActive = true
    rebuildFilter()
  }

  const clearWFilter = () => {
    filterActive = false
  }

  const writeParticle = (i: number, p: Vec4) => {
    positions[i*3]   = p.x
    positions[i*3+1] = p.y
    positions[i*3+2] = p.z
    wValues[i] = p.w
    const [r, g, b] = wColor(p.w)
    colors[i*3]   = r
    colors[i*3+1] = g
    colors[i*3+2] = b
  }

  for (let i = 0; i < count; i++) writeParticle(i, points[i])

  const step = () => {
    for (let i = 0; i < count; i++) {
      points[i] = rk4Step(points[i], dt)
      writeParticle(i, points[i])
    }
  }

  const setInitialW = (w: number) => {
    points = makeParticles(count, w)
    for (let i = 0; i < count; i++) writeParticle(i, points[i])
  }

  const setDt = (newDt: number) => { dt = newDt }

  const setParticleCount = (newCount: number) => {
    if (newCount === count) return
    const newPositions = new Float32Array(newCount * 3)
    const newColors = new Float32Array(newCount * 3)
    const newWValues = new Float32Array(newCount)
    const newFilteredColors = new Float32Array(newCount * 3)

    if (newCount > count) {
      newPositions.set(positions)
      newColors.set(colors)
      newWValues.set(wValues)
      const added = makeParticles(newCount - count, points[0]?.w ?? initialW)
      points = [...points, ...added]
      positions = newPositions
      colors = newColors
      wValues = newWValues
      filteredColors = newFilteredColors
      for (let i = count; i < newCount; i++) writeParticle(i, points[i])
    } else {
      newPositions.set(positions.subarray(0, newCount * 3))
      newColors.set(colors.subarray(0, newCount * 3))
      newWValues.set(wValues.subarray(0, newCount))
      points = points.slice(0, newCount)
      positions = newPositions
      colors = newColors
      wValues = newWValues
      filteredColors = newFilteredColors
    }
    count = newCount
    if (filterActive) rebuildFilter()
  }

  return {
    step,
    getPositions: () => positions,
    getColors: () => filterActive ? filteredColors : colors,
    getWValues: () => wValues,
    setInitialW,
    setDt,
    setParticleCount,
    setWFilter,
    clearWFilter,
  }
}
