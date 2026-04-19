import matplotlib.pyplot as plt
import matplotlib.animation as animation
import numpy as np

rho = 28
sigma = 10
beta = 8/3

class Point:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z
    def __add__(self, other):
        return Point(self.x + other.x, self.y + other.y, self.z + other.z)
    def __mul__(self, other):
        return Point(self.x * other, self.y * other, self.z * other)

def RK4Delta(point, h, f):
    k1 = f(Point(point.x, point.y, point.z))
    k2 = f(Point(point.x + h/2 * k1.x, point.y + h/2 * k1.y, point.z + h/2 * k1.z))
    k3 = f(Point(point.x + h/2 * k2.x, point.y + h/2 * k2.y, point.z + h/2 * k2.z))
    k4 = f(Point(point.x + h * k3.x, point.y + h * k3.y, point.z + h * k3.z))

    return ((k1 + k2 * 2 + k3 * 2 + k4) * (h/6))

def lorenz(point):
    x = sigma * (point.y - point.x)
    y = point.x * (rho - point.z) - point.y
    z = point.x * point.y - beta * point.z
    return Point(x, y, z)

#data generator

data = np.empty(10001, Point)
data[0] = Point(1, 1, 1)
for n in range(10000):
    data[n + 1] = data[n] + RK4Delta(data[n], 0.01, lorenz)

#setup figure
fig, axes = plt.subplots(3, 1, sharex=True)
fig.set_figwidth(3)

#rolling window size
repeat_length = 50

axes[0].set_xlim([0,repeat_length])
axes[0].set_ylim([-40, 40])
axes[1].set_ylim([-40, 40])
axes[2].set_ylim([-20, 60])


#set figure to be modified
im, = axes[0].plot([], [])
im2, = axes[1].plot([], [])
im3, = axes[2].plot([], [])

def func(n):
    im.set_xdata(np.arange(n))
    im.set_ydata([p.x for p in data[0:n]])
    im2.set_xdata(np.arange(n))
    im2.set_ydata([p.y for p in data[0:n]])
    im3.set_xdata(np.arange(n))
    im3.set_ydata([p.z for p in data[0:n]])
    if n>repeat_length:
        lim = axes[0].set_xlim(n-repeat_length, n)
    else:
        lim = axes[0].set_xlim(0,repeat_length)
    return im

ani = animation.FuncAnimation(fig, func, frames=data.shape[0], interval=0.5, blit=False)

plt.show()

#ani.save('animation.gif',writer='pillow', fps=30)