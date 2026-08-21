/*
 * <hof-flavor-picker> — בורר הטעמים של HOUSE OF FLAKES כ-Custom Element ל-Wix Studio.
 *
 * הקובץ הזה הוא הגרסה ה"אתרית" של הפרוטוטייפ שב-prototypes/hof-flavor-picker/v13.html:
 * אותה רצועת טעמים אינסופית, אותה במה ואותם כפתורי גודל — בלי מסגרת הטלפון,
 * בלי ההדר והפוטר (אלה אלמנטים נייטיביים של Studio) ובלי תמונות base64.
 *
 * התקנה: public/custom-elements/hof-flavor-picker.js
 * שם התג להזנה בעורך: hof-flavor-picker
 *
 * מאפיינים (Attributes):
 *   flavors  — מחרוזת JSON, מערך הטעמים. ראו את המבנה ב-README.
 *   initial  — שם הטעם שייבחר בטעינה. ברירת מחדל: הראשון ברשימה.
 *   currency — סימן המטבע שיוצג ליד המחיר. ברירת מחדל: ₪.
 *
 * אירועים (Events) שהאלמנט משגר החוצה לקוד העמוד:
 *   flavorchange — { name, size, price, productId, variantId }
 *   addtocart    — { name, size, price, productId, variantId, quantity }
 */

const DEFAULT_FLAVORS = [
  { name: 'דובאי', color: '#a9c374' },
  { name: 'בוטן גנאש', color: '#dd8a3e' },
  { name: 'מתפטלת', color: '#e07ba3' },
  { name: 'גנאש', color: '#2b1c13' },
  { name: 'קוקולד', color: '#cfc7b2' },
  { name: 'פוקסי', color: '#d9a173' },
  { name: 'תותית', color: '#e2574c' },
  { name: 'מארזים', color: '#111111', isSet: true },
];

// כמה עותקים של רצף הטעמים נבנים כדי לייצר תחושת גלילה אינסופית.
// חייב להיות אי-זוגי כדי שתהיה לולאה אמצעית אחת ברורה לחזור אליה.
const LOOPS = 5;

const STYLES = `
  :host{
    display:block;
    /* יורש את הפונט של האתר (Heebo נקבע בהגדרות הטיפוגרפיה של Studio) */
    font-family:inherit;
    direction:rtl;
    --hof-ink:#111111;
    --hof-paper:#ffffff;
    --hof-muted:#999999;
    --hof-tile:154px;
    --hof-gap:12px;
    color:var(--hof-ink);
  }
  *{box-sizing:border-box; margin:0; padding:0;}

  .stage{
    padding:18px 20px 0;
    text-align:center;
    position:relative;
  }
  .stage-visual{
    width:100%;
    max-width:var(--hof-stage-max, 520px);
    margin-inline:auto;
    aspect-ratio:1 / 1;
    display:flex;
    align-items:center;
    justify-content:center;
    position:relative;
    overflow:hidden;
  }
  .bag-photo{
    width:73%;
    max-width:73%;
    object-fit:contain;
    transition:opacity .25s ease;
  }
  .bag-fallback{
    width:42%;
    transition:fill .35s ease;
    filter:drop-shadow(0 10px 18px rgba(0,0,0,.16));
  }
  .ph-label{
    position:absolute;
    bottom:10px;
    inset-inline:0;
    font-size:.65rem;
    font-weight:500;
    color:var(--hof-muted);
  }
  [hidden]{display:none !important;}

  .size-row{
    display:flex;
    justify-content:center;
    gap:8px;
    margin-top:16px;
  }
  .size-pill{
    flex:1;
    max-width:96px;
    border:none;
    border-radius:10px;
    padding:11px 4px;
    font:inherit;
    font-size:1rem;
    font-weight:700;
    text-align:center;
    cursor:pointer;
    background:transparent;
    color:var(--hof-ink);
    transition:background .15s ease, color .15s ease, border-radius .15s ease;
  }
  .size-pill[aria-pressed="true"]{
    background:var(--hof-ink);
    color:var(--hof-paper);
    border-radius:0;
  }
  .size-pill:disabled{
    opacity:.35;
    cursor:default;
  }
  .size-pill .sp-price{
    display:block;
    font-size:.78rem;
    font-weight:500;
    margin-top:3px;
    opacity:.8;
  }

  .add-btn{
    margin-top:14px;
    width:100%;
    max-width:var(--hof-stage-max, 520px);
    background:var(--hof-paper);
    color:var(--hof-ink);
    border:2px solid var(--hof-ink);
    border-radius:0;
    padding:14px;
    font:inherit;
    font-size:1rem;
    font-weight:700;
    cursor:pointer;
    transition:transform .1s ease, background .15s ease, color .15s ease;
  }
  .add-btn:active{transform:scale(.97);}
  .add-btn.confirmed{
    background:var(--hof-ink);
    color:var(--hof-paper);
  }

  .strip-wrap{
    position:relative;
    padding:14px 0 30px;
    overflow:hidden;
  }
  .strip{
    display:flex;
    overflow-x:auto;
    scroll-snap-type:x mandatory;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:none;
    padding:16px 0;
  }
  .strip::-webkit-scrollbar{display:none;}

  .item{
    flex:0 0 auto;
    width:var(--hof-tile);
    height:var(--hof-tile);
    margin:0 calc(var(--hof-gap) / 2);
    border:none;
    padding:0;
    scroll-snap-align:center;
    display:flex;
    align-items:center;
    justify-content:center;
    background-color:#eee;
    background-size:cover;
    background-position:center;
    color:#fff;
    font:inherit;
    font-weight:700;
    cursor:pointer;
    position:relative;
    transition:transform .22s cubic-bezier(.2,.8,.3,1.3), box-shadow .22s ease;
  }
  .item.selected{
    transform:scale(1.08);
    box-shadow:0 8px 18px rgba(0,0,0,.28);
    z-index:2;
  }
  .item.selected::after{
    content:"";
    position:absolute;
    bottom:-9px;
    left:50%;
    transform:translateX(-50%);
    width:0; height:0;
    border-left:7px solid transparent;
    border-right:7px solid transparent;
    border-top:9px solid var(--hof-ink);
  }
  .item.set{background-color:var(--hof-ink);}
  .item .set-icon{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    font-size:.7rem;
  }
  .item .set-icon svg{width:22px; height:22px;}

  .sr-only{
    position:absolute;
    width:1px; height:1px;
    padding:0; margin:-1px;
    overflow:hidden;
    clip:rect(0 0 0 0);
    white-space:nowrap;
    border:0;
  }

  @media (prefers-reduced-motion: reduce){
    .item, .bag-photo, .bag-fallback, .size-pill, .add-btn{transition:none;}
  }
`;

const SET_ICON = `
  <span class="set-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
    <span class="set-label"></span>
  </span>`;

const FALLBACK_BAG = `
  <svg class="bag-fallback" viewBox="0 0 100 130" aria-hidden="true">
    <path d="M22 40 Q20 20 30 12 L30 8 Q30 4 34 4 L66 4 Q70 4 70 8 L70 12 Q80 20 78 40 L84 118 Q84 126 76 126 L24 126 Q16 126 16 118 Z" fill="#2b1c13"/>
    <rect x="34" y="4" width="8" height="14" fill="#fff" opacity="0.35"/>
    <rect x="58" y="4" width="8" height="14" fill="#fff" opacity="0.35"/>
  </svg>`;

class HofFlavorPicker extends HTMLElement {
  static get observedAttributes() {
    return ['flavors', 'initial', 'currency'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._flavors = DEFAULT_FLAVORS;
    this._sequence = [];
    this._selectedIndex = null;
    this._selectedSize = 'M';
    this._scrollEndTimer = null;
    this._confirmTimer = null;
    this._onScrollEnd = this._onScrollEnd.bind(this);
    this._onScroll = this._onScroll.bind(this);
  }

  connectedCallback() {
    this._render();
    this._readFlavors();
    this._build();

    // ResizeObserver במקום מדידה חד-פעמית: ב-Studio האלמנט מחליף רוחב
    // בכל מעבר breakpoint, והמרכוז חייב להתעדכן איתו.
    this._resizeObserver = new ResizeObserver(() => {
      if (this._selectedIndex !== null) this._centerOnIndex(this._selectedIndex, 'auto');
    });
    this._resizeObserver.observe(this);

    // הפונט של האתר נטען אחרי ה-HTML, והחלפת הפונט מזיזה את הרוחבים —
    // ולכן ממרכזים רק אחרי שהוא מוכן.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._centerInitial());
    } else {
      this._centerInitial();
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    clearTimeout(this._scrollEndTimer);
    clearTimeout(this._confirmTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.shadowRoot.childElementCount) return;
    if (name === 'flavors') {
      this._readFlavors();
      this._build();
      this._centerInitial();
    } else if (name === 'initial') {
      this._centerInitial();
    } else if (name === 'currency' && this._selectedIndex !== null) {
      this._updateStage(this._selectedIndex);
    }
  }

  /** הטעם הנבחר כרגע, לקריאה מקוד העמוד. */
  get selection() {
    const flavor = this._sequence[this._selectedIndex];
    if (!flavor) return null;
    return this._selectionPayload(flavor, this._selectedSize);
  }

  _readFlavors() {
    const raw = this.getAttribute('flavors');
    if (!raw) {
      this._flavors = DEFAULT_FLAVORS;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this._flavors = Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_FLAVORS;
    } catch (err) {
      console.warn('[hof-flavor-picker] מאפיין flavors אינו JSON תקין, נטענת רשימת ברירת המחדל.', err);
      this._flavors = DEFAULT_FLAVORS;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <section class="stage">
        <div class="stage-visual">
          <img class="bag-photo" alt="" hidden>
          ${FALLBACK_BAG}
          <span class="ph-label"></span>
        </div>
        <div class="size-row" role="group" aria-label="בחירת גודל"></div>
        <button class="add-btn" type="button">הוספה לסל</button>
      </section>
      <div class="strip-wrap">
        <div class="strip" role="listbox" aria-label="בחירת טעם" tabindex="0"></div>
      </div>
      <p class="sr-only" aria-live="polite"></p>
    `;

    this._strip = this.shadowRoot.querySelector('.strip');
    this._photo = this.shadowRoot.querySelector('.bag-photo');
    this._fallback = this.shadowRoot.querySelector('.bag-fallback');
    this._phLabel = this.shadowRoot.querySelector('.ph-label');
    this._sizeRow = this.shadowRoot.querySelector('.size-row');
    this._addBtn = this.shadowRoot.querySelector('.add-btn');
    this._liveRegion = this.shadowRoot.querySelector('[aria-live]');

    this._strip.addEventListener('click', (e) => {
      const item = e.target.closest('.item');
      if (item) this._centerOnIndex(Number(item.dataset.index), 'smooth');
    });
    this._strip.addEventListener('keydown', (e) => this._onKeyDown(e));

    if ('onscrollend' in window) {
      this._strip.addEventListener('scrollend', this._onScrollEnd);
    } else {
      this._strip.addEventListener('scroll', this._onScroll);
    }

    this._sizeRow.addEventListener('click', (e) => {
      const pill = e.target.closest('.size-pill');
      if (!pill || pill.disabled) return;
      this._selectedSize = pill.dataset.size;
      this._paintSizes();
      this._emit('flavorchange');
    });

    this._addBtn.addEventListener('click', () => this._addToCart());
  }

  _build() {
    const base = this._flavors;
    this._sequence = [];
    for (let i = 0; i < LOOPS; i++) this._sequence = this._sequence.concat(base);

    const frag = document.createDocumentFragment();
    this._sequence.forEach((flavor, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'item' + (flavor.isSet ? ' set' : '');
      item.dataset.index = String(index);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-label', flavor.name);
      if (flavor.isSet) {
        item.innerHTML = SET_ICON;
        item.querySelector('.set-label').textContent = flavor.name;
      } else if (flavor.tileImage) {
        item.style.backgroundImage = `url("${flavor.tileImage}")`;
      } else {
        item.style.backgroundColor = flavor.color || '#eee';
        item.textContent = flavor.name;
      }
      frag.appendChild(item);
    });
    this._strip.replaceChildren(frag);
    this._buildSizeRow();
  }

  _buildSizeRow() {
    const sizes = this._sizeKeys();
    this._sizeRow.replaceChildren(...sizes.map((size) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'size-pill';
      pill.dataset.size = size;
      pill.innerHTML = `${size}<span class="sp-price"></span>`;
      return pill;
    }));
    if (!sizes.includes(this._selectedSize)) this._selectedSize = sizes[1] || sizes[0];
  }

  _sizeKeys() {
    const withSizes = this._flavors.find((f) => f.sizes && Object.keys(f.sizes).length);
    return withSizes ? Object.keys(withSizes.sizes) : ['S', 'M', 'L'];
  }

  _centerInitial() {
    const middleLoopStart = Math.floor(LOOPS / 2) * this._flavors.length;
    const wanted = this.getAttribute('initial');
    const offset = wanted ? this._flavors.findIndex((f) => f.name === wanted) : 0;
    const index = middleLoopStart + (offset === -1 ? 0 : offset);
    this._centerOnIndex(index, 'auto');
    this._updateStage(index);
  }

  /*
   * ממרכזים בעזרת ההפרש בין מרכז האריח למרכז הרצועה ו-scrollBy.
   * זה עובד זהה ב-RTL וב-LTR (בניגוד לחישוב scrollLeft, שהסימן שלו הפוך ב-RTL)
   * ולא גורר את העמוד כולו, כפי ש-scrollIntoView עלול לעשות בתוך אתר אמיתי.
   */
  _centerOnIndex(index, behavior) {
    const item = this._strip.querySelector(`.item[data-index="${index}"]`);
    if (!item) return;
    const stripRect = this._strip.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta = (itemRect.left + itemRect.width / 2) - (stripRect.left + stripRect.width / 2);
    if (Math.abs(delta) < 1) return;
    this._strip.scrollBy({ left: delta, behavior });
  }

  _centeredIndex() {
    const stripRect = this._strip.getBoundingClientRect();
    const center = stripRect.left + stripRect.width / 2;
    let closest = 0;
    let closestDist = Infinity;
    this._strip.querySelectorAll('.item').forEach((item) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs((rect.left + rect.width / 2) - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = Number(item.dataset.index);
      }
    });
    return closest;
  }

  /*
   * גלילה אינסופית: כשהמשתמש יוצא מהלולאה האמצעית קופצים בשקט לאריח
   * המקביל בלולאה האמצעית. התוכן זהה, ולכן הקפיצה אינה נראית לעין.
   */
  _recenterLoop() {
    const index = this._centeredIndex();
    const loopLength = this._flavors.length;
    const middleLoop = Math.floor(LOOPS / 2);
    if (Math.floor(index / loopLength) === middleLoop) return index;
    const mirrored = middleLoop * loopLength + (index % loopLength);
    this._centerOnIndex(mirrored, 'auto');
    return mirrored;
  }

  _onScroll() {
    clearTimeout(this._scrollEndTimer);
    this._scrollEndTimer = setTimeout(this._onScrollEnd, 160);
  }

  _onScrollEnd() {
    const index = this._recenterLoop();
    if (index !== this._selectedIndex) this._updateStage(index);
  }

  _onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    // ב-RTL חץ שמאלה מתקדם ברשימה וחץ ימינה חוזר אחורה.
    const step = e.key === 'ArrowLeft' ? 1 : -1;
    const next = Math.min(this._sequence.length - 1, Math.max(0, this._centeredIndex() + step));
    this._centerOnIndex(next, 'smooth');
  }

  _updateStage(index) {
    const flavor = this._sequence[index];
    if (!flavor) return;

    this.shadowRoot.querySelectorAll('.item.selected').forEach((el) => {
      el.classList.remove('selected');
      el.setAttribute('aria-selected', 'false');
    });
    const item = this._strip.querySelector(`.item[data-index="${index}"]`);
    if (item) {
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
    }

    if (flavor.bagImage) {
      this._photo.src = flavor.bagImage;
      this._photo.alt = `שקית ${flavor.name}`;
      // תיקון גודל לכל טעם: חלק מצילומי המקור ממוסגרים רחב יותר,
      // וה-scale מחזיר את השקית עצמה לאותו גודל נראה בכל הטעמים.
      const scale = Number(flavor.scale) || 1;
      this._photo.style.width = `${73 * scale}%`;
      this._photo.style.maxWidth = `${73 * scale}%`;
      this._photo.hidden = false;
      this._fallback.hidden = true;
      this._phLabel.hidden = true;
    } else {
      this._photo.hidden = true;
      this._fallback.hidden = false;
      this._fallback.querySelector('path').setAttribute('fill', flavor.color || '#2b1c13');
      this._phLabel.hidden = false;
      this._phLabel.textContent = flavor.name;
    }

    this._selectedIndex = index;
    this._paintSizes();
    this._resetAddButton();
    this._liveRegion.textContent = `נבחר טעם ${flavor.name}`;
    this._emit('flavorchange');
  }

  _paintSizes() {
    const flavor = this._sequence[this._selectedIndex];
    const currency = this.getAttribute('currency') || '₪';
    this._sizeRow.querySelectorAll('.size-pill').forEach((pill) => {
      const entry = flavor && flavor.sizes && flavor.sizes[pill.dataset.size];
      const price = entry && entry.price;
      pill.querySelector('.sp-price').textContent =
        price === undefined || price === null ? '—' : `${price} ${currency}`;
      pill.disabled = !entry;
      pill.setAttribute('aria-pressed', String(pill.dataset.size === this._selectedSize));
    });
    // מארז ללא מחירים לגודל: הכפתור מוביל לעמוד המארזים במקום להוסיף לסל.
    const isSet = Boolean(flavor && flavor.isSet);
    this._addBtn.textContent = isSet ? 'לצפייה במארזים' : 'הוספה לסל';
  }

  _resetAddButton() {
    clearTimeout(this._confirmTimer);
    this._addBtn.classList.remove('confirmed');
  }

  _selectionPayload(flavor, size) {
    const entry = (flavor.sizes && flavor.sizes[size]) || {};
    return {
      name: flavor.name,
      isSet: Boolean(flavor.isSet),
      size,
      price: entry.price ?? null,
      productId: entry.productId ?? null,
      variantId: entry.variantId ?? null,
    };
  }

  _emit(type, extra = {}) {
    const flavor = this._sequence[this._selectedIndex];
    if (!flavor) return;
    this.dispatchEvent(new CustomEvent(type, {
      detail: { ...this._selectionPayload(flavor, this._selectedSize), ...extra },
      bubbles: true,
      composed: true,
    }));
  }

  _addToCart() {
    const flavor = this._sequence[this._selectedIndex];
    if (!flavor) return;
    this._emit('addtocart', { quantity: 1 });
    if (flavor.isSet) return;
    this._addBtn.classList.add('confirmed');
    const original = this._addBtn.textContent;
    this._addBtn.textContent = 'נוסף לסל ✓';
    this._confirmTimer = setTimeout(() => {
      this._addBtn.classList.remove('confirmed');
      this._addBtn.textContent = original;
    }, 1400);
  }
}

customElements.define('hof-flavor-picker', HofFlavorPicker);
