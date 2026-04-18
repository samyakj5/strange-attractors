type Vec3 = {
    x: number,
    y: number,
    z: number,
}

export type Camera = {
    getMatrix: (aspect: number) => Float32Array
    orbit: (dx: number, dy: number) => void
    zoom: (delta: number) => void
    setTarget: (target: Vec3) => void
}

function multiply4x4(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16)

    for (let col = 0; col < 4; col += 1) {
        for (let row = 0; row < 4; row += 1) {
        let sum = 0
        for (let i = 0; i < 4; i += 1) {
            sum += a[i * 4 + row] * b[col * 4 + i]
        }
        out[col * 4 + row] = sum
        }
    }

    return out
}

function perspective(fovY: number, aspect: number, near: number, far: number) {
const f = 1 / Math.tan(fovY / 2)
const rangeInv = 1 / (near - far)

return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * 2 * rangeInv, 0,
])
}

function translation(x: number, y: number, z: number) {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1,
    ])
}

function rotationX(angle: number) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1,
    ])
}

function rotationY(angle: number) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1,
    ])
}

export function createCamera(initialTarget: Vec3 = {x: 0, y: 0, z: 0}): Camera {
    let yaw = 0.8
    let pitch = -0.4
    let distance = 60
    let target = { ...initialTarget }

    const orbit = (dx: number, dy: number) => {
        yaw += dx * 0.005
        pitch += dy * 0.005

        const limit = Math.PI / 2 - 0.01
        pitch = Math.max(-limit, Math.min(limit, pitch))
    }
    const zoom = (delta: number) => {
        distance *= Math.exp(delta * 0.001)
        distance = Math.max(10, Math.min(200, distance))
    }

    const setTarget = (nextTarget: Vec3) => {
        target = { ...nextTarget }
    }

    const getMatrix = (aspect: number) => {
        const near = 0.5
        const far = distance + 150
        const proj = perspective(Math.PI / 4, aspect, near, far)
        const view = multiply4x4(
            translation(0, 0, -distance),
            multiply4x4(rotationX(pitch), multiply4x4(
                rotationY(yaw),
                translation(-target.x, -target.y, -target.z),
            ),
        ),
        )
        

        return multiply4x4(proj, view)
    }
    return { getMatrix, orbit, zoom, setTarget}
}