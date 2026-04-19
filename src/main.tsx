import './style.css'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { createCamera } from './camera.ts'
import { createLorenzSimulation } from './simulation.ts'
import { createRenderer } from './webgl.ts'

type AttractorInfo = {
  equations: string[]
  parameters: string[]
  simulation?: { label: string; value: string }[]
}

type AttractorCard = {
  id: string
  implemented: boolean
  name: string
  info: AttractorInfo
}

type ViewController = {
  destroy: () => void
  setDt?: (dt: number) => void
  setParticleCount?: (count: number) => void
}

type LorenzSceneOptions = {
  autoOrbitSpeed?: number
  dt: number
  interactive: boolean
  particleCount: number
  pointSize: number
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root "#app" was not found.')
}

const appRoot: HTMLDivElement = app

const attractorCards: AttractorCard[] = [
  {
    id: 'lorenz',
    implemented: true,
    name: 'Lorenz sim',
    info: {
      equations: [
        '\\frac{dx}{dt} = \\sigma(y - x)',
        '\\frac{dy}{dt} = x(\\rho - z) - y',
        '\\frac{dz}{dt} = xy - \\beta z',
      ],
      parameters: ['\\sigma = 10', '\\rho = 28', '\\beta = 8/3'],
      simulation: [
        { label: 'Particles', value: '50,000' },
        { label: 'Time step', value: '0.005' },
        { label: 'Integrator', value: 'RK4' },
      ],
    },
  },
  {
    id: 'lorenz2',
    implemented: false,
    name: 'Lorenz xyz',
    info: {
      equations: [
        '\\frac{dx}{dt} = \\sigma(y - x)',
        '\\frac{dy}{dt} = x(\\rho - z) - y',
        '\\frac{dz}{dt} = xy - \\beta z',
      ],
      parameters: ['\\sigma = 10', '\\rho = 28', '\\beta = 8/3'],
    },
  },
]

const ATTRACTOR_ROUTE_PREFIX = '#/attractor/'

function createNoopController(): ViewController {
  return { destroy: () => {} }
}

function getAttractorRoute(): string | null {
  if (!window.location.hash.startsWith(ATTRACTOR_ROUTE_PREFIX)) {
    return null
  }
  const id = window.location.hash.slice(ATTRACTOR_ROUTE_PREFIX.length)
  return id || null
}

function mountLorenzScene(
  canvas: HTMLCanvasElement,
  options: LorenzSceneOptions,
): ViewController {
  const renderer = createRenderer(canvas, {
    clearColor: [0, 0, 0, 0],
    pointSize: options.pointSize,
  })
  const camera = createCamera({ x: 0, y: 0, z: 27 })
  const simulation = createLorenzSimulation(options.particleCount, options.dt)

  renderer.setPositions(simulation.getPositions())
  renderer.setColors(simulation.getColors())

  let animationFrameId = 0
  let destroyed = false
  let isDragging = false
  let lastX = 0
  let lastY = 0

  const resize = () => {
    const { height, width } = canvas.getBoundingClientRect()
    renderer.resize(width, height)
  }

  resize()

  const resizeObserver = new ResizeObserver(() => {
    resize()
  })

  resizeObserver.observe(canvas)

  const handlePointerDown = (event: PointerEvent) => {
    if (!options.interactive) return
    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!options.interactive || !isDragging) return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    camera.orbit(dx, dy)
    lastX = event.clientX
    lastY = event.clientY
  }

  const stopDragging = (pointerId?: number) => {
    if (!options.interactive) return
    isDragging = false
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId)
    }
  }

  const handlePointerUp = (event: PointerEvent) => stopDragging(event.pointerId)
  const handlePointerCancel = (event: PointerEvent) => stopDragging(event.pointerId)

  const handleWheel = (event: WheelEvent) => {
    if (!options.interactive) return
    event.preventDefault()
    camera.zoom(event.deltaY)
  }

  if (options.interactive) {
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
  }

  const renderFrame = () => {
    if (destroyed) return

    simulation.step()
    renderer.setPositions(simulation.getPositions())
    renderer.setColors(simulation.getColors())

    if (!isDragging && options.autoOrbitSpeed) {
      camera.orbit(options.autoOrbitSpeed, 0)
    }

    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
    renderer.render(camera.getMatrix(aspect || 1))

    animationFrameId = requestAnimationFrame(renderFrame)
  }

  renderFrame()

  return {
    destroy: () => {
      destroyed = true
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()

      if (options.interactive) {
        canvas.removeEventListener('pointerdown', handlePointerDown)
        canvas.removeEventListener('pointermove', handlePointerMove)
        canvas.removeEventListener('pointerup', handlePointerUp)
        canvas.removeEventListener('pointercancel', handlePointerCancel)
        canvas.removeEventListener('wheel', handleWheel)
      }

      renderer.destroy()
    },
    setDt: (dt) => simulation.setDt(dt),
    setParticleCount: (count) => simulation.setParticleCount(count),
  }
}

let shellMounted = false
let contentArea: HTMLElement | null = null
let infoPanel: HTMLElement | null = null

function mountShell(): HTMLElement {
  if (shellMounted && contentArea) return contentArea

  appRoot.innerHTML = `
    <div class="app-shell">
      <nav class="sidebar" aria-label="Attractor navigation">
        <div class="sidebar-header">
          <span class="sidebar-title">Strange Attractors</span>
        </div>
        <ul class="sidebar-list" role="list">
          ${attractorCards
            .map(
              (card) => `
            <li>
              <a
                class="sidebar-item"
                href="${ATTRACTOR_ROUTE_PREFIX}${card.id}"
                data-attractor="${card.id}"
              >
                <span class="sidebar-dot"></span>
                <span class="sidebar-item-name">${card.name}</span>
              </a>
            </li>
          `,
            )
            .join('')}
        </ul>
      </nav>
      <div class="content-area" id="content-area"></div>
      <aside class="info-panel" id="info-panel" aria-label="Attractor info"></aside>
    </div>
  `

  shellMounted = true
  contentArea = appRoot.querySelector<HTMLElement>('#content-area')!
  infoPanel = appRoot.querySelector<HTMLElement>('#info-panel')!
  return contentArea
}

function updateActiveTab(activeId: string) {
  const items = appRoot.querySelectorAll<HTMLElement>('.sidebar-item')
  items.forEach((item) => {
    item.classList.toggle('sidebar-item--active', item.dataset.attractor === activeId)
  })
}

function updateInfoPanel(card: AttractorCard) {
  if (!infoPanel) return

  const { info } = card

  const equationsHTML = info.equations
    .map(
      (latex) =>
        `<div class="info-eq">${katex.renderToString(latex, { displayMode: true, throwOnError: false })}</div>`,
    )
    .join('')

  const parametersHTML = info.parameters
    .map(
      (latex) =>
        `<div class="info-eq">${katex.renderToString(latex, { displayMode: true, throwOnError: false })}</div>`,
    )
    .join('')

  const simulationHTML = info.simulation
    ? `
      <div class="info-section">
        <span class="info-section-label">Simulation</span>

        <div class="info-slider-group">
          <div class="info-slider-row">
            <span>Particles</span>
            <span id="particles-value">50,000</span>
          </div>
          <input
            type="range"
            class="info-slider"
            id="particles-slider"
            min="1000"
            max="100000"
            step="1000"
            value="50000"
          />
        </div>

        <div class="info-slider-group">
          <div class="info-slider-row">
            <span>Time step</span>
            <span id="dt-value">0.005</span>
          </div>
          <input
            type="range"
            class="info-slider"
            id="dt-slider"
            min="0.001"
            max="0.02"
            step="0.001"
            value="0.005"
          />
        </div>

        <div class="info-slider-row">
          <span>Integrator</span>
          <span class="info-static-value">RK4</span>
        </div>
      </div>
    `
    : ''

  infoPanel.innerHTML = `
    <div class="info-header">
      <span class="info-title">${card.name}</span>
    </div>
    <div class="info-body">
      <div class="info-section">
        <span class="info-section-label">Equations</span>
        ${equationsHTML}
      </div>

      <div class="info-section">
        <span class="info-section-label">Parameters</span>
        ${parametersHTML}
      </div>

      ${simulationHTML}
    </div>
  `

  if (info.simulation) {
    const particlesSlider = infoPanel.querySelector<HTMLInputElement>('#particles-slider')!
    const particlesValue = infoPanel.querySelector<HTMLElement>('#particles-value')!
    const dtSlider = infoPanel.querySelector<HTMLInputElement>('#dt-slider')!
    const dtValue = infoPanel.querySelector<HTMLElement>('#dt-value')!

    particlesSlider.addEventListener('input', () => {
      const count = parseInt(particlesSlider.value)
      particlesValue.textContent = count.toLocaleString()
      currentView.setParticleCount?.(count)
    })

    dtSlider.addEventListener('input', () => {
      const dt = parseFloat(dtSlider.value)
      dtValue.textContent = dt.toFixed(3)
      currentView.setDt?.(dt)
    })
  }
}

function renderLorenzContent(container: HTMLElement): ViewController {
  container.innerHTML = `
    <canvas
      id="attractor-canvas"
      class="content-canvas"
      aria-label="Lorenz attractor simulation"
    ></canvas>
  `
  const canvas = container.querySelector<HTMLCanvasElement>('#attractor-canvas')!
  return mountLorenzScene(canvas, {
    autoOrbitSpeed: 0.08,
    dt: 0.005,
    interactive: true,
    particleCount: 50000,
    pointSize: 1.35,
  })
}

function renderPlaceholderContent(container: HTMLElement, card: AttractorCard): ViewController {
  container.innerHTML = `
    <div class="content-placeholder">
      <p>${card.name} hasn't been added yet.</p>
    </div>
  `
  return createNoopController()
}

let currentView = createNoopController()

function renderRoute() {
  const container = mountShell()

  const attractorId = getAttractorRoute() ?? 'lorenz'
  const card = attractorCards.find((c) => c.id === attractorId)

  updateActiveTab(attractorId)
  currentView.destroy()

  if (!card) {
    container.innerHTML = `<div class="content-placeholder"><p>Not found.</p></div>`
    currentView = createNoopController()
    return
  }

  updateInfoPanel(card)

  currentView = card.implemented
    ? renderLorenzContent(container)
    : renderPlaceholderContent(container, card)
}

window.addEventListener('hashchange', renderRoute)
window.addEventListener('beforeunload', () => {
  currentView.destroy()
})

renderRoute()
