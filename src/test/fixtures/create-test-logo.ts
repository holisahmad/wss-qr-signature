import { createCanvas } from '@napi-rs/canvas'

export function createTestLogo(width = 100, height = 100): Buffer {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(0, 0, width, height)
  return canvas.toBuffer('image/png')
}
