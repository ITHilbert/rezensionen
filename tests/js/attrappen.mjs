// Gemeinsame Attrappen für die Tests von src/Resources/js/slider.js (kein Browser, keine npm-Pakete).
// Ereignisse bubbeln vom Ziel über parentNode bis zum Dokument (wie im Browser); `closest()` ist vorhanden.

export class El {
    constructor(tag, attrs = {}, eltern = null) {
        this.tagName = tag.toUpperCase();
        this.attrs = new Map(Object.entries(attrs));
        this.children = [];
        this.parentNode = eltern;
        this.listeners = {};
        this.textContent = '';
        if (eltern) eltern.children.push(this);
    }
    getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
    setAttribute(n, w) { this.attrs.set(n, String(w)); }
    hasAttribute(n) { return this.attrs.has(n); }
    removeAttribute(n) { this.attrs.delete(n); }
    get id() { return this.getAttribute('id') ?? ''; }
    get className() { return this.getAttribute('class') ?? ''; }
    get hidden() { return this.attrs.has('hidden'); }
    set hidden(w) { if (w) this.attrs.set('hidden', ''); else this.attrs.delete('hidden'); }
    get dataset() {
        const el = this;
        return new Proxy({}, {
            get: (_, k) => {
                const n = 'data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
                return el.attrs.has(n) ? el.attrs.get(n) : undefined;
            },
        });
    }
    addEventListener(typ, fn) { (this.listeners[typ] ??= []).push(fn); }
    removeEventListener(typ, fn) { this.listeners[typ] = (this.listeners[typ] ?? []).filter((f) => f !== fn); }
    contains(n) {
        for (let k = n; k; k = k.parentNode) if (k === this) return true;
        return false;
    }
    passt(sel) {
        return sel.split(',').some((teil) => {
            const t = teil.trim();
            const m = t.match(/^([a-z]*)((?:\.[\w-]+|\[[\w-]+(?:=[^\]]+)?\])*)$/i);
            if (!m) return false;
            if (m[1] && m[1].toUpperCase() !== this.tagName) return false;
            const teile = m[2].match(/\.[\w-]+|\[[^\]]+\]/g) ?? [];
            return teile.every((p) => {
                if (p[0] === '.') return this.className.split(/\s+/).includes(p.slice(1));
                const [n, w] = p.slice(1, -1).split('=');
                if (!this.hasAttribute(n)) return false;
                return w === undefined || this.getAttribute(n) === w.replace(/^["']|["']$/g, '');
            });
        });
    }
    closest(sel) {
        for (let k = this; k && typeof k.passt === 'function'; k = k.parentNode) if (k.passt(sel)) return k;
        return null;
    }
    querySelectorAll(sel) {
        const r = [];
        const lauf = (e) => e.children.forEach((c) => { if (c.passt(sel)) r.push(c); lauf(c); });
        lauf(this);
        return r;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
    // Ereignis mit Bubbling von target nach oben (bis zum Dokument, wenn der Zweig daran hängt)
    dispatch(typ, extra = {}) {
        const ereignis = { type: typ, target: this, relatedTarget: null, preventDefault() {}, stopPropagation() {}, ...extra };
        for (let k = this; k; k = k.parentNode) {
            ereignis.currentTarget = k;
            for (const fn of [...(k.listeners[typ] ?? [])]) fn.call(k, ereignis);
        }
        return ereignis;
    }
}

export class Dok {
    constructor(readyState = 'complete') {
        this.readyState = readyState;
        this.children = []; // Wurzeln der Seite: Slider (und was sonst daran hängt)
        this.listeners = {};
    }
    get sliders() { return this.children.filter((k) => k.hasAttribute('data-rezensionen-slider')); }
    addEventListener(typ, fn) { (this.listeners[typ] ??= []).push(fn); }
    removeEventListener(typ, fn) { this.listeners[typ] = (this.listeners[typ] ?? []).filter((f) => f !== fn); }
    querySelectorAll(sel) {
        const r = [];
        const lauf = (e) => { if (e.passt(sel)) r.push(e); e.children.forEach(lauf); };
        this.children.forEach(lauf);
        return r;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
    dispatch(typ) { (this.listeners[typ] ?? []).forEach((fn) => fn({ type: typ })); }
}

export class Fenster {
    constructor(dok) {
        this.document = dok;
        this.listeners = {};
    }
    addEventListener(typ, fn) { (this.listeners[typ] ??= []).push(fn); }
    removeEventListener(typ, fn) { this.listeners[typ] = (this.listeners[typ] ?? []).filter((f) => f !== fn); }
    dispatch(typ) { (this.listeners[typ] ?? []).forEach((fn) => fn({ type: typ })); }
}

export const TEXTE = {
    'data-label-pause': 'LABEL-PAUSE',
    'data-label-play': 'LABEL-PLAY',
    'data-text-pause': 'TEXT-PAUSE',
    'data-text-play': 'TEXT-PLAY',
};

// Markup wie rezensionen::show: Knopf trägt `hidden` (AK11)
export function baueSlider(dok) {
    const slider = new El('div', { id: 'carouselExampleControls', class: 'carousel slide', 'data-ride': 'carousel', 'data-rezensionen-slider': '' }, dok);
    const inner = new El('div', { id: 'rez-inner', class: 'carousel-inner', 'aria-live': 'off' }, slider);
    const link = new El('a', { href: '#' }, inner);
    const knopf = new El('button', {
        type: 'button', 'data-rezensionen-pause': '', hidden: '', 'aria-controls': 'rez-inner', 'aria-label': 'LABEL-PAUSE', ...TEXTE,
    }, slider);
    knopf.textContent = 'TEXT-PAUSE';
    const aussen = new El('a', { href: '#aussen' }, dok);
    return { slider, inner, link, knopf, aussen };
}

// Markup ersetzen wie Vue beim Mount: altes Element fliegt aus dem Dokument, neues kommt an dieselbe Stelle
export function ersetzeMarkup(dok, alt) {
    const i = dok.children.indexOf(alt.slider);
    dok.children.splice(i, 1);
    alt.slider.parentNode = null;
    return baueSlider(dok);
}

// jQuery-Attrappe wie das echte: jQuery(el).carousel(cmd) → fn.carousel mit this.el
export function baueJQuery(aufrufe) {
    const fn = { carousel(befehl) { aufrufe.push([this.el, befehl]); return this; } };
    const jQuery = (el) => Object.assign(Object.create(fn), { el });
    jQuery.fn = fn;
    return jQuery;
}

export function aufbau({ jquery = 'voll', readyState = 'complete', anzahl = 1 } = {}) {
    const dok = new Dok(readyState);
    const aufrufe = [];
    const window = new Fenster(dok);
    if (jquery === 'voll') window.jQuery = baueJQuery(aufrufe);
    if (jquery === 'ohne-plugin') window.jQuery = Object.assign((el) => ({ el }), { fn: {} });
    const teile = Array.from({ length: anzahl }, () => baueSlider(dok));
    return { dok, window, aufrufe, umgebung: { window, document: dok }, ...teile[0], teile };
}

export const fokusRaus = (ziel, nach = null) => ziel.dispatch('focusout', { relatedTarget: nach });
export const live = (a) => a.inner.getAttribute('aria-live');
