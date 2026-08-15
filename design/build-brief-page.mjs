/**
 * בונה עמוד HTML עצמאי אחד מתוך הבריף וצילומי המסך,
 * כדי שאפשר יהיה לשלוח למעצב/ת לינק או קובץ בודד בלי להתקין כלום.
 *
 * הרצה:  node design/build-brief-page.mjs
 * פלט:   design/brief.html
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const screensDir = resolve(root, 'design/screens')
const outFile = resolve(root, 'design/brief.html')

/** המסכים, לפי סדר החשיבות למעצב */
const SCREENS = [
  { file: 'dashboard', name: 'סקירה כללית', note: 'מסך הכניסה. מדדים, פרויקטים פעילים, משימות דחופות וגרף 14 יום.', rank: 'גבוהה' },
  { file: 'project-detail', name: 'עמוד פרויקט', note: 'מסך העבודה. משימות לפי שלבים, טיימר, וניצול מול הערכת הזמן.', rank: 'גבוהה' },
  { file: 'reports', name: 'דוחות', note: 'הערך העסקי. טבלת פרויקטים, דיוק הערכות ושלושה גרפים.', rank: 'גבוהה' },
  { file: 'tasks', name: 'משימות פתוחות', note: 'כל המשימות בכל הלקוחות, מקובצות לפי לקוח / שלב / תאריך.', rank: 'בינונית' },
  { file: 'projects', name: 'רשימת פרויקטים', note: 'טבלה עם סינון לפי סטטוס.', rank: 'בינונית' },
  { file: 'client-detail', name: 'כרטיס לקוח', note: 'סיכום הלקוח והפרויקטים שלו.', rank: 'בינונית' },
  { file: 'time-log', name: 'יומן זמנים', note: 'טבלת רישומי הזמן, עם סינון לפי טווח ופרויקט.', rank: 'בינונית' },
  { file: 'clients', name: 'רשימת לקוחות', note: 'תצוגת כרטיסים.', rank: 'נמוכה' },
  { file: 'templates', name: 'תבניות משימות', note: 'כרטיסי התבניות שמוחלות על פרויקט חדש.', rank: 'נמוכה' },
  { file: 'settings', name: 'הגדרות', note: 'טופס הגדרות וגיבוי.', rank: 'נמוכה' },
]

/** מצבים שלא מיוצגים על ידי כתובת — קיימים בדסקטופ בלבד */
const STATES = [
  { file: 'modal', name: 'חלון דו-שיח', note: 'טופס פתיחת פרויקט חדש. אותו מבנה משמש את כל הטפסים.' },
  { file: 'timer-running', name: 'טיימר פעיל', note: 'הרכיב הבולט ביותר בממשק. מלווה את המשתמש בכל המסכים.' },
  { file: 'empty-state', name: 'מצב ריק', note: 'מה שמשתמש חדש רואה לפני שהזין נתונים.' },
]

const TOKENS = {
  'צבעי בסיס': [
    ['--bg', '#f5f6f9', '#12141c', 'רקע העמוד'],
    ['--surface', '#ffffff', '#1a1d27', 'כרטיסים, סרגל צד, חלונות'],
    ['--surface-2', '#f0f2f7', '#222633', 'רקע משני — כותרות טבלה, ריחוף, שדות'],
    ['--border', '#e0e3ec', '#2c3140', 'קווי הפרדה עדינים'],
    ['--border-strong', '#c9cee0', '#3c4356', 'מסגרות שדות וכפתורים'],
  ],
  'טקסט': [
    ['--text', '#1b2033', '#e8eaf2', 'טקסט ראשי'],
    ['--text-dim', '#626a85', '#a0a7bd', 'טקסט משני, תוויות'],
    ['--text-faint', '#8d94ab', '#767e96', 'מטא-דאטה, רמזים'],
  ],
  'צבעים סמנטיים': [
    ['--accent', '#4f7cff', '#6f92ff', 'פעולה ראשית, ניווט פעיל, גרפים'],
    ['--accent-soft', '#e8eeff', '#1e2740', 'רקע לתגית במצב פעיל'],
    ['--green', '#21916a', '#4cc396', 'הושלם, רווחי, בתוך התקציב'],
    ['--green-soft', '#e2f5ec', '#16302a', 'רקע לתגית ירוקה'],
    ['--amber', '#b57614', '#dda43f', 'אזהרה, מתקרב ליעד, אופליין'],
    ['--amber-soft', '#fdf1dc', '#33280f', 'רקע לתגית כתומה'],
    ['--red', '#d0455f', '#ef6b84', 'באיחור, חריגה, מחיקה'],
    ['--red-soft', '#fdeaee', '#381c25', 'רקע לתגית אדומה'],
    ['--purple', '#7c56d6', '#a488f0', 'כסף והכנסות'],
    ['--purple-soft', '#f0eafd', '#251d3d', 'רקע לתגית סגולה'],
  ],
}

const SHAPE = [
  ['--radius', '12px', 'פינות כרטיסים וחלונות'],
  ['--radius-sm', '8px', 'פינות כפתורים ושדות'],
  ['--shadow', 'צל עדין דו-שכבתי', 'כרטיסים'],
  ['--shadow-lg', 'צל עמוק', 'חלונות צפים'],
  ['--sidebar-w', '232px', 'רוחב סרגל הניווט'],
]

const CONSTRAINTS = [
  {
    n: '01',
    title: 'הממשק כולו RTL',
    body: 'עברית מימין לשמאל. סרגל הניווט בצד ימין, טבלאות מתחילות מימין, ובגרפי העמודות ציר הזמן זורם מימין לשמאל — הישן מימין, החדש משמאל.',
    watch: 'מעצב שרגיל ל-LTR נוטה להחזיר פריסה הפוכה. שווה לבדוק כבר בסקיצה הראשונה.',
  },
  {
    n: '02',
    title: 'חובה מצב בהיר וכהה',
    body: 'המצב נקבע לפי הגדרת מערכת ההפעלה של המשתמש ולא לפי בחירה באפליקציה. לכל צבע צריך שני ערכים, ושניהם חייבים לעבור ניגודיות תקנית.',
    watch: null,
  },
  {
    n: '03',
    title: 'חובה מובייל',
    body: 'מתחת ל-860px סרגל הצד הופך לניווט אופקי נגלל, והכרטיסים נערמים בטור אחד. טבלאות רחבות נגללות בתוך עצמן — העמוד עצמו לעולם לא נגלל לצדדים.',
    watch: null,
  },
  {
    n: '04',
    title: 'בלי נכסים חיצוניים',
    body: 'האפליקציה עובדת אופליין, ולכן אסור להסתמך על גופנים מ-Google Fonts, אייקונים מ-CDN או כל קובץ שנטען מרשת.',
    watch: 'גופן מותאם אפשרי — אבל צריך את קובצי הגופן עצמם (רצוי woff2) ורישיון שמתיר הטמעה. סט אייקונים צריך להגיע כ-SVG.',
  },
  {
    n: '05',
    title: 'קריאוּת מספרים',
    body: 'זו אפליקציית מדידה. טבלאות עם תשע עמודות של מספרים הן לב המוצר, ונדרש גופן עם ספרות ברוחב אחיד (tabular numerals) כדי שהעמודות יתיישרו.',
    watch: null,
  },
  {
    n: '06',
    title: 'נגישות',
    body: 'ניגודיות מינימלית 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול, בשני המצבים.',
    watch: 'אסור להעביר מידע בצבע בלבד — "באיחור" ו"בזמן" חייבים להיבדל גם בטקסט או בצורה, לא רק באדום מול ירוק.',
  },
]

const COMPONENTS = {
  'בסיס': [
    'כרטיס — המיכל של כמעט הכול',
    'כפתורים: ראשי, משני, מסוכן, שקוף, כפתור אייקון — בשני גדלים',
    'שדות: טקסט, מספר, בחירה, תאריך, אזור טקסט, תיבת סימון',
    'תגית סטטוס בחמישה צבעים סמנטיים',
    'סרגל התקדמות — קו דק שמשנה צבע לפי מצב',
  ],
  'מבנה': [
    'סרגל ניווט צדדי, עם פריט פעיל ומונה משימות',
    'כותרת עמוד: כותרת, תת-כותרת ופעולות',
    'לשוניות',
    'צ׳יפים לסינון',
  ],
  'תצוגת נתונים': [
    'כרטיס מדד — מספר גדול, תווית ורמז. מופיע בשורות של ארבעה',
    'טבלה — כותרת, שורות, ריחוף, עמודות מספרים',
    'שורת משימה — תיבת סימון, כותרת, מטא-דאטה, פעולות בריחוף',
    'גרף עמודות אנכי — שעות לפי יום או חודש',
    'גרף עמודות אופקי — שעות לפי לקוח או שלב',
  ],
  'מצבים מיוחדים': [
    'פס טיימר פעיל — הרכיב הבולט ביותר בממשק',
    'חלון דו-שיח',
    'מצב ריק — מה שמשתמש חדש רואה',
    'הודעה צפה — התקנה ועדכון גרסה',
    'פס אופליין',
    'מסך שגיאה',
  ],
}

const DELIVERABLES = [
  ['טבלת הטוקנים עם ערכים חדשים', '23 טוקנים, ערך בהיר וערך כהה לכל אחד. זה הפריט הקריטי — בלעדיו אי אפשר ליישם כלום.', true],
  ['סקלת טיפוגרפיה', 'גדלים, משקלים וגובה שורה לכותרות, גוף וטקסט קטן. אם יש גופן מותאם — הקבצים והרישיון.', true],
  ['סקיצות שלושת המסכים בעדיפות גבוהה', 'סקירה, עמוד פרויקט ודוחות — בבהיר ובכהה, בדסקטופ ובמובייל.', true],
  ['גיליון רכיבים', 'הרכיבים שברשימה, על כל מצביהם: רגיל, ריחוף, לחוץ, מושבת, ממוקד מקלדת.', false],
  ['סט אייקונים כ-SVG', 'רק אם מחליפים את האמוג׳י שמשמש היום.', false],
  ['סקלת מרווחים', 'רק אם משנים אותה. כרגע 4 / 8 / 14 / 18px.', false],
]

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function dataUri(file) {
  const buf = await readFile(resolve(screensDir, file))
  return `data:image/png;base64,${buf.toString('base64')}`
}

const available = new Set(await readdir(screensDir))

async function shotsFor(base, isState) {
  const out = {}
  for (const theme of ['light', 'dark']) {
    for (const device of isState ? ['desktop'] : ['desktop', 'mobile']) {
      const name = `${device}-${theme}-${base}.png`
      if (available.has(name)) out[`${device}-${theme}`] = await dataUri(name)
    }
  }
  return out
}

const screenData = []
for (const s of SCREENS) screenData.push({ ...s, shots: await shotsFor(s.file, false) })
const stateData = []
for (const s of STATES) stateData.push({ ...s, shots: await shotsFor(s.file, true) })

const rankTone = { 'גבוהה': 'high', 'בינונית': 'mid', 'נמוכה': 'low' }

const tokenRows = (rows) =>
  rows
    .map(
      ([name, light, dark, use]) => `
      <tr>
        <td><code>${esc(name)}</code></td>
        <td class="swatch-cell">
          <span class="swatch" style="--l:${esc(light)};--d:${esc(dark)}"></span>
          <span class="hex"><b>${esc(light)}</b><i>${esc(dark)}</i></span>
        </td>
        <td class="use">${esc(use)}</td>
      </tr>`,
    )
    .join('')

const galleryCard = (item, isState) => {
  const keys = Object.keys(item.shots)
  const imgs = keys
    .map(
      (k) =>
        `<img class="shot" data-v="${k}" src="${item.shots[k]}" alt="${esc(item.name)} — ${k}" loading="lazy" />`,
    )
    .join('')
  return `
    <figure class="card${isState ? ' is-state' : ''}"${isState ? ' data-desktop-only="1"' : ''}>
      <div class="frame">${imgs}</div>
      <figcaption>
        <div class="cap-head">
          <h3>${esc(item.name)}</h3>
          ${item.rank ? `<span class="rank ${rankTone[item.rank]}">${esc(item.rank)}</span>` : '<span class="rank state">מצב</span>'}
        </div>
        <p>${esc(item.note)}</p>
      </figcaption>
    </figure>`
}

const html = `<title>בריף עיצוב לסטודיו</title>
<style>
  :root {
    --ground: #f2f4f8;
    --panel: #ffffff;
    --panel-2: #eaeef4;
    --ink: #141a29;
    --ink-dim: #58637f;
    --ink-faint: #8791a8;
    --rule: #dde2ec;
    --rule-soft: #e8ecf3;
    --accent: #3346c8;
    --accent-ink: #ffffff;
    --flag: #b0451f;
    --mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
    --sans: "Segoe UI", Rubik, Assistant, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    --measure: 68ch;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0d1018;
      --panel: #151a24;
      --panel-2: #1d2330;
      --ink: #e7ebf4;
      --ink-dim: #9aa4bd;
      --ink-faint: #6d7791;
      --rule: #262d3c;
      --rule-soft: #1f2531;
      --accent: #8a9cff;
      --accent-ink: #0d1018;
      --flag: #e8865f;
    }
  }

  :root[data-theme="dark"] {
    --ground: #0d1018;
    --panel: #151a24;
    --panel-2: #1d2330;
    --ink: #e7ebf4;
    --ink-dim: #9aa4bd;
    --ink-faint: #6d7791;
    --rule: #262d3c;
    --rule-soft: #1f2531;
    --accent: #8a9cff;
    --accent-ink: #0d1018;
    --flag: #e8865f;
  }

  * { box-sizing: border-box; }

  body {
    direction: rtl;
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 28px 120px;
  }

  /* ---------- כותרת המסמך ---------- */

  .masthead {
    padding: 72px 0 34px;
    border-bottom: 2px solid var(--ink);
  }

  /* תוויות בעברית — הגופן החד-רוחבי נועד ללטינית ולספרות בלבד,
     ולכן התוויות משתמשות בגופן הרגיל עם ריווח קל */
  .label {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--ink-faint);
  }

  .eyebrow {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--ink-faint);
    margin: 0 0 18px;
  }

  .eyebrow .v { font-family: var(--mono); letter-spacing: 0.04em; }

  h1 {
    margin: 0;
    font-size: clamp(34px, 6vw, 56px);
    font-weight: 680;
    letter-spacing: -0.025em;
    line-height: 1.08;
    text-wrap: balance;
  }

  .standfirst {
    margin: 18px 0 0;
    max-width: var(--measure);
    font-size: 18px;
    color: var(--ink-dim);
  }

  .meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1px;
    margin-top: 40px;
    background: var(--rule);
    border: 1px solid var(--rule);
  }

  .meta div {
    background: var(--panel);
    padding: 13px 15px;
  }

  .meta dt {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    margin: 0 0 5px;
  }

  .meta dd {
    margin: 0;
    font-size: 14.5px;
    font-weight: 560;
  }

  /* ---------- מקטעים ---------- */

  section { padding-top: 62px; }

  .sec-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 11px;
    margin-bottom: 26px;
  }

  .sec-num {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  h2 {
    margin: 0;
    font-size: 25px;
    font-weight: 640;
    letter-spacing: -0.018em;
  }

  h3 { margin: 0; font-size: 16px; font-weight: 620; letter-spacing: -0.01em; }

  p { margin: 0 0 14px; max-width: var(--measure); }
  p:last-child { margin-bottom: 0; }

  .lede { font-size: 17px; color: var(--ink-dim); }

  strong { font-weight: 640; }

  code {
    font-family: var(--mono);
    font-size: 0.88em;
    background: var(--panel-2);
    padding: 2px 6px;
    border-radius: 4px;
    direction: ltr;
    display: inline-block;
  }

  /* ---------- כרטיסי מפתח ---------- */

  .keys {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
  }

  .key {
    background: var(--panel);
    padding: 22px 20px;
  }

  .key .n {
    font-family: var(--mono);
    font-size: 30px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }

  .key h3 { margin: 8px 0 6px; }

  .key p { font-size: 14.5px; color: var(--ink-dim); margin: 0; }

  /* ---------- טבלאות ---------- */

  .t-wrap { overflow-x: auto; border: 1px solid var(--rule); background: var(--panel); }

  table { width: 100%; border-collapse: collapse; font-size: 14.5px; }

  caption {
    text-align: start;
    font-size: 11.5px;
    font-weight: 620;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    padding: 14px 16px 10px;
  }

  th {
    text-align: start;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
    font-weight: 600;
    padding: 9px 16px;
    border-bottom: 1px solid var(--rule);
    background: var(--panel-2);
    white-space: nowrap;
  }

  td { padding: 11px 16px; border-bottom: 1px solid var(--rule-soft); vertical-align: middle; }

  tbody tr:last-child td { border-bottom: none; }

  .use { color: var(--ink-dim); }

  .swatch-cell { white-space: nowrap; }

  .swatch {
    display: inline-block;
    width: 34px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid var(--rule);
    vertical-align: middle;
    margin-inline-end: 10px;
    background: linear-gradient(105deg, var(--l) 0 50%, var(--d) 50% 100%);
  }

  .hex {
    display: inline-flex;
    flex-direction: column;
    vertical-align: middle;
    font-family: var(--mono);
    font-size: 11.5px;
    direction: ltr;
    line-height: 1.45;
  }

  .hex b { font-weight: 600; }
  .hex i { font-style: normal; color: var(--ink-faint); }

  /* ---------- אילוצים ---------- */

  .rules { display: grid; gap: 1px; background: var(--rule); border: 1px solid var(--rule); }

  .rule-item {
    background: var(--panel);
    padding: 20px 22px;
    display: grid;
    grid-template-columns: 42px 1fr;
    gap: 4px 16px;
    align-items: start;
  }

  .rule-item .n {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--accent);
    font-weight: 600;
    padding-top: 2px;
    font-variant-numeric: tabular-nums;
  }

  .rule-item p { font-size: 15px; color: var(--ink-dim); margin: 7px 0 0; }

  .watch {
    grid-column: 2;
    margin-top: 12px;
    padding: 10px 13px;
    border-inline-start: 2px solid var(--flag);
    background: var(--panel-2);
    font-size: 14px;
    color: var(--ink);
  }

  .watch b {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    color: var(--flag);
    display: block;
    margin-bottom: 3px;
  }

  /* ---------- רשימות רכיבים ---------- */

  .comp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
  }

  .comp { background: var(--panel); padding: 20px; }

  .comp h3 {
    font-size: 11.5px;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    font-weight: 620;
    margin-bottom: 12px;
  }

  .comp ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 9px; }

  .comp li {
    font-size: 14.5px;
    padding-inline-start: 15px;
    position: relative;
    color: var(--ink-dim);
  }

  .comp li::before {
    content: "";
    position: absolute;
    inset-inline-start: 0;
    top: 9px;
    width: 5px;
    height: 5px;
    background: var(--accent);
    border-radius: 1px;
  }

  /* ---------- גלריה ---------- */

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
    align-items: center;
    margin-bottom: 24px;
    padding: 14px 16px;
    border: 1px solid var(--rule);
    background: var(--panel);
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .fgroup { display: flex; align-items: center; gap: 8px; }

  .fgroup > span {
    font-size: 11px;
    font-weight: 620;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
  }

  .seg { display: flex; border: 1px solid var(--rule); border-radius: 5px; overflow: hidden; }

  .seg button {
    font: inherit;
    font-size: 13.5px;
    font-weight: 550;
    padding: 5px 14px;
    border: none;
    background: var(--panel);
    color: var(--ink-dim);
    cursor: pointer;
    transition: background 0.13s, color 0.13s;
  }

  .seg button + button { border-inline-start: 1px solid var(--rule); }
  .seg button:hover { background: var(--panel-2); color: var(--ink); }
  .seg button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .gallery { display: grid; gap: 26px; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); }

  body[data-device="mobile"] .gallery { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }

  .card { margin: 0; border: 1px solid var(--rule); background: var(--panel); display: flex; flex-direction: column; }

  body[data-device="mobile"] .card[data-desktop-only] { display: none; }

  .frame {
    background: var(--panel-2);
    border-bottom: 1px solid var(--rule);
    height: 300px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    cursor: zoom-in;
  }

  .shot {
    width: 100%;
    height: 100%;
    display: none;
    object-fit: cover;
    object-position: top center;
  }

  .shot.on { display: block; }

  body[data-device="mobile"] .frame { height: 420px; padding: 18px 18px 0; }
  body[data-device="mobile"] .shot { max-width: 215px; object-fit: contain; object-position: top center; }

  figcaption { padding: 15px 17px 17px; }

  .cap-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; }

  .rank {
    font-size: 10.5px;
    font-weight: 620;
    letter-spacing: 0.05em;
    padding: 2px 9px;
    border-radius: 20px;
    border: 1px solid var(--rule);
    color: var(--ink-faint);
    white-space: nowrap;
  }

  .rank.high { color: var(--accent); border-color: currentColor; }
  .rank.state { color: var(--flag); border-color: currentColor; }

  figcaption p { font-size: 14px; color: var(--ink-dim); margin: 0; }

  /* ---------- מסירה ---------- */

  .deliver { display: grid; gap: 1px; background: var(--rule); border: 1px solid var(--rule); }

  .d-item { background: var(--panel); padding: 18px 20px; display: grid; grid-template-columns: auto 1fr; gap: 3px 14px; align-items: start; }

  .box {
    width: 15px;
    height: 15px;
    border: 1.5px solid var(--ink-faint);
    border-radius: 3px;
    margin-top: 5px;
  }

  .d-item.req .box { border-color: var(--accent); }
  .d-item h3 { display: flex; align-items: center; gap: 9px; }

  .req-tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--accent);
    border: 1px solid currentColor;
    border-radius: 20px;
    padding: 1px 7px;
  }

  .d-item p { grid-column: 2; font-size: 14.5px; color: var(--ink-dim); margin: 4px 0 0; }

  /* ---------- לייטבוקס ---------- */

  .lb {
    position: fixed;
    inset: 0;
    background: rgba(8, 10, 16, 0.9);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 26px;
    z-index: 50;
    cursor: zoom-out;
  }

  .lb.open { display: flex; }
  .lb img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 20px 70px rgba(0,0,0,.55); }

  footer {
    margin-top: 80px;
    padding-top: 22px;
    border-top: 1px solid var(--rule);
    font-size: 13.5px;
    color: var(--ink-faint);
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  footer code { background: none; padding: 0; }

  @media (max-width: 620px) {
    .wrap { padding: 0 18px 80px; }
    .masthead { padding-top: 46px; }
    .rule-item { grid-template-columns: 1fr; }
    .watch { grid-column: 1; }
    .filters { position: static; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
</style>

<div class="wrap">

  <header class="masthead">
    <p class="eyebrow">בריף עיצוב · גרסה <span class="v">1.0</span></p>
    <h1>אפליקציית ניהול משימות וזמנים לסטודיו בניית אתרים</h1>
    <p class="standfirst">
      המוצר בנוי, עובד, ונמצא בשימוש. מה שמבקשים כאן הוא שפה ויזואלית — לא מבנה חדש
      ולא פיצ׳רים חדשים. המסמך הזה מרכז את מה שצריך כדי להתחיל, ואת מה שצריך לחזור איתו בסוף.
    </p>
    <dl class="meta">
      <div><dt>מוצר</dt><dd>כלי פנימי, משתמש יחיד</dd></div>
      <div><dt>פלטפורמה</dt><dd>ווב · מותקן כאפליקציה</dd></div>
      <div><dt>שפה וכיוון</dt><dd>עברית · RTL</dd></div>
      <div><dt>מצבי תצוגה</dt><dd>בהיר וכהה · חובה</dd></div>
      <div><dt>מסכים</dt><dd>10 + 3 מצבים</dd></div>
      <div><dt>טוקנים</dt><dd>23 משתני צבע וצורה</dd></div>
    </dl>
  </header>

  <section id="product">
    <div class="sec-head"><span class="sec-num">01</span><h2>מה המוצר עושה</h2></div>
    <p class="lede">
      כלי עבודה יומיומי לבעל סטודיו לבניית אתרים. הוא עונה על שתי שאלות, ומכל השאר אפשר להתעלם.
    </p>
    <div class="keys">
      <div class="key">
        <div class="n">01</div>
        <h3>מה צריך לעשות לכל לקוח</h3>
        <p>רשימת משימות לכל פרויקט, מסודרת לפי שלבי עבודה — מאפיון ועד מסירה.</p>
      </div>
      <div class="key">
        <div class="n">02</div>
        <h3>כמה זמן לקח כל פרויקט</h3>
        <p>מדידת שעות בפועל מול ההערכה, וכמה יצא ₪ לשעה אחרי שהכול נגמר.</p>
      </div>
      <div class="key">
        <div class="n">→</div>
        <h3>המסקנה שהוא מחפש</h3>
        <p>האם התמחור שלי נכון, ואיפה הזמן בורח לי. זה מה שהעיצוב צריך לשרת.</p>
      </div>
    </div>
  </section>

  <section id="user">
    <div class="sec-head"><span class="sec-num">02</span><h2>מי המשתמש ובאילו תנאים</h2></div>
    <div class="comp-grid">
      <div class="comp">
        <h3>מי</h3>
        <ul>
          <li>משתמש יחיד — בעל העסק. אין צוות, אין הרשאות, אין שיתוף</li>
          <li>לא מעצב ולא איש טכנולוגיה. צריך להבין בלי הסבר</li>
        </ul>
      </div>
      <div class="comp">
        <h3>מתי</h3>
        <ul>
          <li>שימוש יומיומי וקצר — מפעיל טיימר, מסמן משימה, בודק מה דחוף</li>
          <li>לא יושב שעות במערכת. נכנס, עושה, יוצא</li>
        </ul>
      </div>
      <div class="comp">
        <h3>איפה</h3>
        <ul>
          <li>מחשב במשרד לעבודה המלאה</li>
          <li>טלפון בשטח — טיימר, סימון משימה, הצצה מהירה</li>
          <li>לפעמים בלי אינטרנט. האפליקציה עובדת אופליין במלואה</li>
        </ul>
      </div>
    </div>
  </section>

  <section id="tone">
    <div class="sec-head"><span class="sec-num">03</span><h2>הטון הנוכחי — ומה פתוח לשינוי</h2></div>
    <p>
      כרגע: כלי עבודה נקי ושקט. לבן, כחול כאקסנט, טיפוגרפיה צנועה, ודגש על קריאוּת של
      טבלאות ומספרים.
    </p>
    <p>
      <strong>הכול פתוח לשינוי</strong> — צבעים, טיפוגרפיה, מרווחים, צורת הכרטיסים, אישיות המותג.
      מה שצריך להישמר זו הפונקציה: זו אפליקציית מדידה, והמספרים הם הגיבור. עיצוב שמייפה
      על חשבון קריאוּת של טבלה בת תשע עמודות לא ישרת את המוצר.
    </p>
  </section>

  <section id="tokens">
    <div class="sec-head"><span class="sec-num">04</span><h2>מערכת העיצוב הקיימת</h2></div>
    <p class="lede">
      כל המראה של האפליקציה נשלט על ידי 23 משתני CSS. הגדרת ערכים חדשים לטבלאות האלה היא
      כל מה שצריך כדי להחליף את השפה הוויזואלית של המוצר כולו.
    </p>
    <p>
      בכל דגימה: <strong>המשולש הימני הוא הערך הבהיר, השמאלי הכהה.</strong>
      לכל צבע חייבים שני ערכים.
    </p>

    ${Object.entries(TOKENS)
      .map(
        ([group, rows]) => `
    <div class="t-wrap" style="margin-top:20px">
      <table>
        <caption>${esc(group)}</caption>
        <thead><tr><th>טוקן</th><th>בהיר / כהה</th><th>מה זה שולט</th></tr></thead>
        <tbody>${tokenRows(rows)}</tbody>
      </table>
    </div>`,
      )
      .join('')}

    <div class="t-wrap" style="margin-top:20px">
      <table>
        <caption>צורה ומידות</caption>
        <thead><tr><th>טוקן</th><th>ערך נוכחי</th><th>מה זה שולט</th></tr></thead>
        <tbody>
          ${SHAPE.map(
            ([n, v, u]) =>
              `<tr><td><code>${esc(n)}</code></td><td><code>${esc(v)}</code></td><td class="use">${esc(u)}</td></tr>`,
          ).join('')}
        </tbody>
      </table>
    </div>
  </section>

  <section id="constraints">
    <div class="sec-head"><span class="sec-num">05</span><h2>אילוצים טכניים</h2></div>
    <p class="lede">
      אלה לא העדפות. עיצוב שמפר אותם לא ניתן ליישום, ויחזור לסבב נוסף.
    </p>
    <div class="rules">
      ${CONSTRAINTS.map(
        (c) => `
      <div class="rule-item">
        <span class="n">${c.n}</span>
        <div><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>
        ${c.watch ? `<div class="watch"><b>לשים לב</b>${esc(c.watch)}</div>` : ''}
      </div>`,
      ).join('')}
    </div>
  </section>

  <section id="components">
    <div class="sec-head"><span class="sec-num">06</span><h2>מה צריך לעצב</h2></div>
    <p class="lede">
      הרכיבים שמרכיבים את כל האפליקציה. כל אחד מהם חוזר בהרבה מסכים — עיצוב שלהם הוא
      למעשה עיצוב המוצר כולו.
    </p>
    <div class="comp-grid">
      ${Object.entries(COMPONENTS)
        .map(
          ([group, items]) => `
      <div class="comp">
        <h3>${esc(group)}</h3>
        <ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>`,
        )
        .join('')}
    </div>
  </section>

  <section id="screens">
    <div class="sec-head"><span class="sec-num">07</span><h2>המסכים</h2></div>
    <p class="lede">
      כל המסכים כפי שהם נראים היום. אפשר להחליף בין מצב בהיר לכהה ובין מחשב למובייל,
      וללחוץ על צילום כדי לפתוח אותו במלואו.
    </p>

    <div class="filters">
      <div class="fgroup">
        <span>מצב</span>
        <div class="seg" id="theme-seg">
          <button data-theme-btn="light" aria-pressed="true">בהיר</button>
          <button data-theme-btn="dark" aria-pressed="false">כהה</button>
        </div>
      </div>
      <div class="fgroup">
        <span>מכשיר</span>
        <div class="seg" id="device-seg">
          <button data-device-btn="desktop" aria-pressed="true">מחשב</button>
          <button data-device-btn="mobile" aria-pressed="false">מובייל</button>
        </div>
      </div>
    </div>

    <div class="gallery">
      ${screenData.map((s) => galleryCard(s, false)).join('')}
      ${stateData.map((s) => galleryCard(s, true)).join('')}
    </div>
  </section>

  <section id="deliverables">
    <div class="sec-head"><span class="sec-num">08</span><h2>מה לחזור איתו</h2></div>
    <p class="lede">
      כדי שנוכל ליישם בלי סבב שאלות. פורמט: פיגמה עדיף — בכל פורמט אחר צריך שנוכל
      לשלוף ערכי צבע וגודל מדויקים.
    </p>
    <div class="deliver">
      ${DELIVERABLES.map(
        ([title, note, req]) => `
      <div class="d-item${req ? ' req' : ''}">
        <span class="box"></span>
        <h3>${esc(title)}${req ? '<span class="req-tag">חובה</span>' : ''}</h3>
        <p>${esc(note)}</p>
      </div>`,
      ).join('')}
    </div>
  </section>

  <footer>
    <span>בריף עיצוב · אפליקציית ניהול משימות וזמנים</span>
    <span>המקור המלא: <code>design/BRIEF.md</code></span>
  </footer>
</div>

<div class="lb" id="lightbox"><img alt="" id="lightbox-img" /></div>

<script>
  (function () {
    var body = document.body
    // ברירת המחדל של הגלריה עוקבת אחרי המצב שבו המעצב/ת פתחו את העמוד
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    var rootTheme = document.documentElement.getAttribute('data-theme')
    var startTheme = rootTheme === 'dark' || (rootTheme !== 'light' && prefersDark) ? 'dark' : 'light'
    var state = { theme: startTheme, device: 'desktop' }

    function apply() {
      body.dataset.device = state.device
      var key = state.device + '-' + state.theme
      document.querySelectorAll('.card').forEach(function (card) {
        var shots = card.querySelectorAll('.shot')
        var matched = false
        shots.forEach(function (img) {
          var on = img.dataset.v === key
          img.classList.toggle('on', on)
          if (on) matched = true
        })
        // מצבים מיוחדים קיימים בדסקטופ בלבד — נופלים חזרה לצילום הדסקטופ
        if (!matched) {
          var fallback = card.querySelector('.shot[data-v="desktop-' + state.theme + '"]')
          if (fallback) fallback.classList.add('on')
        }
      })
    }

    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeBtn === state.theme))
      btn.addEventListener('click', function () {
        state.theme = btn.dataset.themeBtn
        document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn))
        })
        apply()
      })
    })

    document.querySelectorAll('[data-device-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.device = btn.dataset.deviceBtn
        document.querySelectorAll('[data-device-btn]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn))
        })
        apply()
      })
    })

    var lb = document.getElementById('lightbox')
    var lbImg = document.getElementById('lightbox-img')

    document.querySelectorAll('.frame').forEach(function (frame) {
      frame.addEventListener('click', function () {
        var visible = frame.querySelector('.shot.on')
        if (!visible) return
        lbImg.src = visible.src
        lbImg.alt = visible.alt
        lb.classList.add('open')
      })
    })

    lb.addEventListener('click', function () {
      lb.classList.remove('open')
      lbImg.src = ''
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) {
        lb.classList.remove('open')
        lbImg.src = ''
      }
    })

    apply()
  })()
</script>
`

await writeFile(outFile, html, 'utf8')
const kb = Buffer.byteLength(html) / 1024
console.log(`✓ ${outFile} (${(kb / 1024).toFixed(1)} MB)`)
