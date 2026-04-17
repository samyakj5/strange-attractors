import './style.css'
import { createSimulation } from './simulation.ts'

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

const simulation = createSimulation({ canvas })

const resizeCanvas = () => {
  simulation.resize(window.innerWidth, window.innerHeight)
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)
simulation.start()
