/**
 * מייצר את אייקוני האפליקציה (PWA) מ-SVG יחיד.
 * הרצה: npm run icons
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/icons')

const ACCENT = '#4f7cff'
const PURPLE = '#7c56d6'

/** האייקון הרגיל — פינות מעוגלות, מתאים לרוב הפלטפורמות */
const icon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="1" stop-color="${PURPLE}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M18 32.5l8.5 8.5L46 21.5" fill="none" stroke="#fff" stroke-width="6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

/**
 * גרסת maskable — אנדרואיד חותך את האייקון לצורות שונות,
 * ולכן הרקע מלא והתוכן מוקטן לאזור הבטוח (80% מרכזי).
 */
const maskable = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="1" stop-color="${PURPLE}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <path d="M21 32.5l7.5 7.5L43 24.5" fill="none" stroke="#fff" stroke-width="5.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const targets = [
  { name: 'icon-192.png', size: 192, svg: icon },
  { name: 'icon-512.png', size: 512, svg: icon },
  { name: 'icon-maskable-192.png', size: 192, svg: maskable },
  { name: 'icon-maskable-512.png', size: 512, svg: maskable },
  { name: 'apple-touch-icon.png', size: 180, svg: maskable },
]

await mkdir(outDir, { recursive: true })

for (const target of targets) {
  const buffer = Buffer.from(target.svg(target.size))
  await sharp(buffer).png().toFile(resolve(outDir, target.name))
  console.log(`✓ ${target.name} (${target.size}px)`)
}

// favicon וקטורי — נשאר חד בכל גודל
await writeFile(resolve(root, 'public/favicon.svg'), icon(64).trim() + '\n')
console.log('✓ favicon.svg')
