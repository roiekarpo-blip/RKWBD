/**
 * מצלם את כל מסכי האפליקציה למסירה למעצב — במצב בהיר, כהה ובמובייל.
 *
 * הרצה:
 *   npm run build && npm run preview      (בטרמינל נפרד)
 *   npm i -D playwright && npx playwright install chromium
 *   node design/capture-screens.mjs
 *
 * התוצאה נכתבת ל-design/screens/.
 */
import { chromium } from 'playwright'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'design/screens')

/** המסכים שמעצב צריך לראות, לפי סדר השימוש באפליקציה */
const SCREENS = [
  { file: 'dashboard', route: '#/dashboard', title: 'סקירה כללית' },
  { file: 'clients', route: '#/clients', title: 'רשימת לקוחות' },
  { file: 'client-detail', route: '#/clients/c_demo1', title: 'כרטיס לקוח' },
  { file: 'projects', route: '#/projects', title: 'רשימת פרויקטים' },
  { file: 'project-detail', route: '#/projects/p_demo2', title: 'עמוד פרויקט' },
  { file: 'tasks', route: '#/tasks', title: 'משימות פתוחות' },
  { file: 'time-log', route: '#/time', title: 'יומן זמנים' },
  { file: 'reports', route: '#/reports', title: 'דוחות' },
  { file: 'templates', route: '#/templates', title: 'תבניות משימות' },
  { file: 'settings', route: '#/settings', title: 'הגדרות' },
]

const VIEWPORTS = {
  desktop: { width: 1440, height: 960 },
  mobile: { width: 390, height: 844 },
}

async function seedDemoData(page) {
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /טעינת נתוני הדגמה/ }).click()
  await page.getByRole('button', { name: 'טען הדגמה' }).click()
  await page.waitForTimeout(700)
}

async function capture(browser, { theme, device }) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[device],
    colorScheme: theme,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    deviceScaleFactor: device === 'mobile' ? 2 : 1,
  })
  const page = await ctx.newPage()
  await seedDemoData(page)

  for (const screen of SCREENS) {
    await page.goto(`${BASE}/${screen.route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(450)
    await page.screenshot({
      path: resolve(outDir, `${device}-${theme}-${screen.file}.png`),
      fullPage: true,
    })
    console.log(`✓ ${device}-${theme}-${screen.file}`)
  }

  // מצבים מיוחדים שלא מיוצגים על ידי כתובת
  if (device === 'desktop') {
    // חלון דו-שיח
    await page.goto(`${BASE}/#/projects`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '➕ פרויקט חדש' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: resolve(outDir, `${device}-${theme}-modal.png`) })
    console.log(`✓ ${device}-${theme}-modal`)
    await page.keyboard.press('Escape')

    // טיימר פעיל
    await page.goto(`${BASE}/#/projects/p_demo2`, { waitUntil: 'networkidle' })
    await page.locator('.task-row .btn', { hasText: '▶' }).first().click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: resolve(outDir, `${device}-${theme}-timer-running.png`) })
    console.log(`✓ ${device}-${theme}-timer-running`)
    await page.locator('.timer-bar .btn', { hasText: 'עצור' }).click()
    await page.waitForTimeout(300)

    // מצב ריק — מה שמשתמש חדש רואה
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: resolve(outDir, `${device}-${theme}-empty-state.png`) })
    console.log(`✓ ${device}-${theme}-empty-state`)
  }

  await ctx.close()
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
)

for (const theme of ['light', 'dark']) {
  for (const device of ['desktop', 'mobile']) {
    await capture(browser, { theme, device })
  }
}

await browser.close()
console.log(`\nהצילומים נשמרו ב-${outDir}`)
