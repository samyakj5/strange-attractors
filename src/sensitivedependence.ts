import { RK4Delta, lorenz, DEFAULT_PARAMETERS } from './simulation.ts'
import type { Vec3 } from './simulation.ts'

const N = 3
const PERTURBATION = 5e-4
const DT = 0.01
const WINDOW = 500
const RESEED_DIST = 25

type Frame = {
  ref: Vec3
  pts: Vec3[]
  dists: number[]
}

function perturb(p: Vec3): Vec3 {
  return {
    x: p.x + (Math.random() - 0.5) * 2 * PERTURBATION,
    y: p.y + (Math.random() - 0.5) * 2 * PERTURBATION,
    z: p.z + (Math.random() - 0.5) * 2 * PERTURBATION,
  }
}

function step(p: Vec3): Vec3 {
  const d = RK4Delta(lorenz, 0, p, DT, DEFAULT_PARAMETERS)
  return { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z }
}

function distColor(dist: number): string {
  const t = Math.min(1, Math.log1p(dist) / Math.log1p(RESEED_DIST))
  const hue = Math.round(180 - 180 * t)
  return `hsl(${hue}, 80%, 60%)`
}

function drawPlot(
  ctx: CanvasRenderingContext2D,
  buffer: Frame[],
  getVal: (v: Vec3) => number,
  yMin: number,
  yMax: number,
  label: string,
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  if (buffer.length < 2) return

  const dpr = window.devicePixelRatio || 1
  const startI = Math.max(0, WINDOW - buffer.length)
  const toX = (i: number) => ((startI + i) / (WINDOW - 1)) * width
  const toY = (v: number) => height * (1 - (v - yMin) / (yMax - yMin))

  // zero line
  ctx.strokeStyle = '#1a2433'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, toY(0))
  ctx.lineTo(width, toY(0))
  ctx.stroke()

  // perturbed trajectories
  for (let tIdx = 0; tIdx < N; tIdx++) {
    const latestDist = buffer[buffer.length - 1].dists[tIdx]
    ctx.strokeStyle = distColor(latestDist)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let fIdx = 0; fIdx < buffer.length; fIdx++) {
      const x = toX(fIdx)
      const y = toY(getVal(buffer[fIdx].pts[tIdx]))
      fIdx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // reference trajectory
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let fIdx = 0; fIdx < buffer.length; fIdx++) {
    const x = toX(fIdx)
    const y = toY(getVal(buffer[fIdx].ref))
    fIdx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // axis label
  ctx.fillStyle = '#374151'
  ctx.font = `${11 * dpr}px "SF Mono", "Fira Mono", monospace`
  ctx.fillText(label, 10 * dpr, 18 * dpr)
}

export function createSensitiveDependenceView(container: HTMLElement): { destroy: () => void } {
  container.innerHTML = `
    <div class="chaos-plots">
      <canvas class="chaos-canvas" id="chaos-x"></canvas>
    </div>
  `

  const canvases = [container.querySelector<HTMLCanvasElement>('#chaos-x')!]
  const ctxs = canvases.map((c) => c.getContext('2d')!)

  const resizeCanvases = () => {
    const dpr = window.devicePixelRatio || 1
    for (const canvas of canvases) {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
    }
  }

  resizeCanvases()
  const resizeObserver = new ResizeObserver(resizeCanvases)
  for (const canvas of canvases) resizeObserver.observe(canvas)

  let ref: Vec3 = { x: 1, y: 1, z: 1 }
  let points: Vec3[] = Array.from({ length: N }, () => perturb(ref))
  const buffer: Frame[] = []

  let animFrameId = 0
  let destroyed = false

  const tick = () => {
    if (destroyed) return

    ref = step(ref)

    const pts: Vec3[] = []
    const dists: number[] = []

    for (let i = 0; i < N; i++) {
      points[i] = step(points[i])
      const dist = Math.hypot(
        points[i].x - ref.x,
        points[i].y - ref.y,
        points[i].z - ref.z,
      )
      pts.push({ ...points[i] })
      dists.push(dist)
    }

    buffer.push({ ref: { ...ref }, pts, dists })
    if (buffer.length > WINDOW) buffer.shift()

    drawPlot(ctxs[0], buffer, (v) => v.x, -25, 25, 'x(t)')

    animFrameId = requestAnimationFrame(tick)
  }

  tick()

  return {
    destroy: () => {
      destroyed = true
      cancelAnimationFrame(animFrameId)
      resizeObserver.disconnect()
    },
  }
}
