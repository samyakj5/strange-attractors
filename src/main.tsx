import './style.css'
import { createCamera } from './camera.ts'
import { createLorenzSimulation } from './simulation.ts'
import { createRenderer } from './webgl.ts'

type AttractorCard = {
  id: string
  implemented: boolean
  name: string
}

type ViewController = {
  destroy: () => void
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
    name: 'Lorenz',
  },
  {
    id: 'rossler',
    implemented: false,
    name: 'Rossler',
  },
  {
    id: 'thomas',
    implemented: false,
    name: 'Thomas',
  },
  {
    id: 'aizawa',
    implemented: false,
    name: 'Aizawa',
  },
  {
    id: 'dadras',
    implemented: false,
    name: 'Dadras',
  },
  {
    id: 'four-wing',
    implemented: false,
    name: 'Four-Wing',
  },
]

const ATTRACTOR_ROUTE_PREFIX = '#/attractor/'

function createNoopController(): ViewController {
  return {
    destroy: () => {},
  }
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
    if (!options.interactive) {
      return
    }

    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!options.interactive || !isDragging) {
      return
    }

    const dx = event.clientX - lastX
    const dy = event.clientY - lastY

    camera.orbit(dx, dy)

    lastX = event.clientX
    lastY = event.clientY
  }

  const stopDragging = (pointerId?: number) => {
    if (!options.interactive) {
      return
    }

    isDragging = false

    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId)
    }
  }

  const handlePointerUp = (event: PointerEvent) => {
    stopDragging(event.pointerId)
  }

  const handlePointerCancel = (event: PointerEvent) => {
    stopDragging(event.pointerId)
  }

  const handleWheel = (event: WheelEvent) => {
    if (!options.interactive) {
      return
    }

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
    if (destroyed) {
      return
    }

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
  }
}

function renderGallery(): ViewController {
  appRoot.innerHTML = `
    <main class="page-shell">
      <header class="page-header">
        <h1>Strange Attractors</h1>
      </header>
      <section class="attractor-grid" aria-label="Attractor gallery">
        ${attractorCards
          .map((card, index) => {
            const preview =
              index === 0
                ? `
                  <div class="card-preview card-preview-live">
                    <canvas
                      id="lorenz-preview"
                      class="preview-canvas"
                      aria-label="Lorenz attractor thumbnail"
                    ></canvas>
                  </div>
                `
                : `
                  <div class="card-preview">
                    <div class="card-placeholder" aria-hidden="true"></div>
                  </div>
                `

            return `
              <a
                class="attractor-card"
                href="${ATTRACTOR_ROUTE_PREFIX}${card.id}"
                aria-label="${card.name}"
                data-attractor="${card.id}"
              >
                ${preview}
                <span class="card-title">${card.name}</span>
              </a>
            `
          })
          .join('')}
      </section>
    </main>
  `

  const previewCanvas = appRoot.querySelector<HTMLCanvasElement>('#lorenz-preview')

  if (!previewCanvas) {
    throw new Error('Lorenz preview canvas failed to initialize.')
  }

  return mountLorenzScene(previewCanvas, {
    autoOrbitSpeed: 0.4,
    dt: 0.005,
    interactive: false,
    particleCount: 5000,
    pointSize: 1.25,
  })
}

function renderUnavailableAttractor(card: AttractorCard): ViewController {
  appRoot.innerHTML = `
    <main class="detail-shell">
      <header class="detail-header">
        <a class="detail-back" href="#/">Back</a>
        <div class="detail-copy">
          <h1>${card.name}</h1>
          <p>This attractor has not been added yet.</p>
        </div>
      </header>
      <section class="detail-placeholder">
        <p>${card.name} is still a placeholder in the gallery.</p>
      </section>
    </main>
  `

  return createNoopController()
}

function renderLorenzDetail(): ViewController {
  appRoot.innerHTML = `
    <main class="detail-shell">
      <header class="detail-header">
        <a class="detail-back" href="#/">Back</a>
        <div class="detail-copy">
          <h1>Lorenz</h1>
          <p>Higher-density live simulation.</p>
        </div>
      </header>
      <section class="detail-frame">
        <canvas
          id="attractor-detail-canvas"
          class="detail-canvas"
          aria-label="Lorenz attractor simulation"
        ></canvas>
      </section>
    </main>
  `

  const canvas = appRoot.querySelector<HTMLCanvasElement>('#attractor-detail-canvas')

  if (!canvas) {
    throw new Error('Lorenz detail canvas failed to initialize.')
  }

  return mountLorenzScene(canvas, {
    autoOrbitSpeed: 0.08,
    dt: 0.005,
    interactive: true,
    particleCount: 50000,
    pointSize: 1.35,
  })
}

function renderAttractorDetail(id: string): ViewController {
  const card = attractorCards.find((item) => item.id === id)

  if (!card) {
    appRoot.innerHTML = `
      <main class="detail-shell">
        <header class="detail-header">
          <a class="detail-back" href="#/">Back</a>
          <div class="detail-copy">
            <h1>Not Found</h1>
            <p>This attractor route does not exist.</p>
          </div>
        </header>
      </main>
    `

    return createNoopController()
  }

  if (card.id === 'lorenz') {
    return renderLorenzDetail()
  }

  return renderUnavailableAttractor(card)
}

let currentView = createNoopController()

function renderRoute() {
  currentView.destroy()

  const attractorId = getAttractorRoute()
  currentView = attractorId
    ? renderAttractorDetail(attractorId)
    : renderGallery()
}

window.addEventListener('hashchange', renderRoute)
window.addEventListener('beforeunload', () => {
  currentView.destroy()
})

renderRoute()
