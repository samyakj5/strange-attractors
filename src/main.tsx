import './style.css'
import { createCamera } from './camera.ts'
import { createLorenzSimulation } from './simulation.ts'
import { createRenderer } from './webgl.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root "#app" was not found.')
}

app.innerHTML = `
  <canvas id="canvas" aria-label="Strange Attractors"></canvas>
`

const canvas = app.querySelector<HTMLCanvasElement>('#canvas')

if (!canvas) {
  throw new Error('Canvas UI failed to initialize.')
}

const renderer = createRenderer(canvas)
const camera = createCamera({x: 0, y: 0, z: 27})
const simulation = createLorenzSimulation(100000, 0.01)

renderer.setPositions(simulation.getPositions())
renderer.setColors(simulation.getColors())

let isDragging = false
let lastX = 0
let lastY = 0

const resize = () => {
  renderer.resize(window.innerWidth, window.innerHeight)
}

resize()
window.addEventListener('resize', resize)

canvas.addEventListener('pointerdown', (event) => {
  isDragging = true
  lastX = event.clientX
  lastY = event.clientY
  canvas.setPointerCapture(event.pointerId)
})

canvas.addEventListener('pointermove', (event) => {
  if (!isDragging) {
    return
  }

  const dx = event.clientX - lastX
  const dy = event.clientY - lastY

  camera.orbit(dx, dy)

  lastX = event.clientX
  lastY = event.clientY
})

canvas.addEventListener('pointerup', (event) => {
  isDragging = false
  canvas.releasePointerCapture(event.pointerId)
})

canvas.addEventListener('pointercancel', () => {
  isDragging = false
})

canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  camera.zoom(event.deltaY)
  },
  { passive: false }

)

const renderFrame = () => {
  simulation.step()
  renderer.setPositions(simulation.getPositions())
  renderer.setColors(simulation.getColors())

  const aspect = window.innerWidth / window.innerHeight
  renderer.render(camera.getMatrix(aspect))

  requestAnimationFrame(renderFrame)
}

renderFrame()
