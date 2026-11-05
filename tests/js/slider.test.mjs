// Verhalten von src/Resources/js/slider.js mit Attrappen (kein Browser, keine npm-Pakete).
// Lauf: node --test packages/rezensionen/tests/js/slider.test.mjs
//
// Erwartete Schnittstelle (CommonJS/UMD):
//   module.exports = { init(umgebung) }   mit umgebung = { window, document }
//   - Ohne `module` (inline im Browser) startet das Skript selbst mit den globalen window/document;
//     beim require() in Node startet es NICHT von selbst.
//   - init bindet an jedes document.querySelectorAll('[data-rezensionen-slider]') einzeln,
//     sofort wenn document.readyState !== 'loading', sonst bei 'DOMContentLoaded'.
//   - jQuery wird erst beim Ereignis aus umgebung.window.jQuery gelesen; Aufruf: jQuery(slider).carousel('pause'|'cycle')
//     nur wenn jQuery und jQuery.fn.carousel Funktionen sind.
//   - Im Slider: .carousel-inner (aria-live), Knopf [data-rezensionen-pause] (click, aria-label, textContent),
//     Texte des Wechsels aus data-label-pause, data-label-play, data-text-pause, data-text-play des Knopfs.
//   - Fokus: focusin/focusout (bubbeln) am Slider-Element; Ziel innerhalb = slider.contains(event.relatedTarget).

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const SKRIPT = fileURLToPath(new URL('../../src/Resources/js/slider.js', import.meta.url));

function lade() {
    const modul = require(SKRIPT);
    assert.equal(typeof modul.init, 'function', 'slider.js muss { init } exportieren');
    return modul;
}

// --- Attrappen ---------------------------------------------------------------

class El {
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
    querySelectorAll(sel) {
        const r = [];
        const lauf = (e) => e.children.forEach((c) => { if (c.passt(sel)) r.push(c); lauf(c); });
        lauf(this);
        return r;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
    // Ereignis mit Bubbling von target nach oben
    dispatch(typ, extra = {}) {
        const ereignis = { type: typ, target: this, relatedTarget: null, preventDefault() {}, stopPropagation() {}, ...extra };
        for (let k = this; k; k = k.parentNode) {
            ereignis.currentTarget = k;
            for (const fn of [...(k.listeners[typ] ?? [])]) fn.call(k, ereignis);
        }
        return ereignis;
    }
}

class Dok {
    constructor(readyState = 'complete') {
        this.readyState = readyState;
        this.sliders = [];
        this.listeners = {};
    }
    addEventListener(typ, fn) { (this.listeners[typ] ??= []).push(fn); }
    querySelectorAll(sel) {
        if (sel.includes('data-rezensionen-slider')) return [...this.sliders];
        return [];
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
    dispatch(typ) { (this.listeners[typ] ?? []).forEach((fn) => fn({ type: typ })); }
}

const TEXTE = {
    'data-label-pause': 'LABEL-PAUSE',
    'data-label-play': 'LABEL-PLAY',
    'data-text-pause': 'TEXT-PAUSE',
    'data-text-play': 'TEXT-PLAY',
};

function baueSlider(dok) {
    const slider = new El('div', { id: 'carouselExampleControls', class: 'carousel slide', 'data-ride': 'carousel', 'data-rezensionen-slider': '' });
    const inner = new El('div', { id: 'rez-inner', class: 'carousel-inner', 'aria-live': 'off' }, slider);
    const link = new El('a', { href: '#' }, inner);
    const knopf = new El('button', {
        type: 'button', 'data-rezensionen-pause': '', 'aria-controls': 'rez-inner', 'aria-label': 'LABEL-PAUSE', ...TEXTE,
    }, slider);
    knopf.textContent = 'TEXT-PAUSE';
    const aussen = new El('a', { href: '#aussen' });
    dok.sliders.push(slider);
    return { slider, inner, link, knopf, aussen };
}

// jQuery-Attrappe wie das echte: jQuery(el).carousel(cmd) → fn.carousel mit this.el
function baueJQuery(aufrufe) {
    const fn = { carousel(befehl) { aufrufe.push([this.el, befehl]); return this; } };
    const jQuery = (el) => Object.assign(Object.create(fn), { el });
    jQuery.fn = fn;
    return jQuery;
}

function aufbau({ jquery = 'voll', readyState = 'complete', anzahl = 1 } = {}) {
    const dok = new Dok(readyState);
    const aufrufe = [];
    const window = { document: dok };
    if (jquery === 'voll') window.jQuery = baueJQuery(aufrufe);
    if (jquery === 'ohne-plugin') window.jQuery = Object.assign((el) => ({ el }), { fn: {} });
    const teile = Array.from({ length: anzahl }, () => baueSlider(dok));
    return { dok, window, aufrufe, umgebung: { window, document: dok }, ...teile[0], teile };
}

const fokusRaus = (ziel, nach = null) => ziel.dispatch('focusout', { relatedTarget: nach });
const live = (a) => a.inner.getAttribute('aria-live');

// --- AK3 ---------------------------------------------------------------------

// AK3
test('Fokus in den Slider pausiert und setzt aria-live polite', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    assert.deepEqual(a.aufrufe, []);
    assert.equal(live(a), 'off');

    a.link.dispatch('focusin');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(live(a), 'polite');
});

// AK3
test('Fokus verlässt den Slider zu einem Ziel außerhalb: cycle und aria-live off', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.link.dispatch('focusin');
    assert.equal(live(a), 'polite');

    fokusRaus(a.link, a.aussen);

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause'], [a.slider, 'cycle']]);
    assert.equal(live(a), 'off');
});

// AK3
test('Fokus verlässt den Slider ohne neues Ziel: cycle und aria-live off', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.link.dispatch('focusin');
    assert.equal(live(a), 'polite');

    fokusRaus(a.link, null);

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause'], [a.slider, 'cycle']]);
    assert.equal(live(a), 'off');
});

// AK3
test('Fokuswechsel innerhalb des Slider ändert nichts', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.link.dispatch('focusin');
    const davor = [...a.aufrufe];
    assert.deepEqual(davor, [[a.slider, 'pause']]);

    fokusRaus(a.link, a.knopf);
    assert.deepEqual(a.aufrufe, davor);
    assert.equal(live(a), 'polite');

    a.knopf.dispatch('focusin');
    assert.deepEqual(a.aufrufe, davor);
    assert.equal(live(a), 'polite');
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
});

// AK3
test('nach Anhalten über den Knopf bleibt der Slider beim Verlassen des Fokus angehalten', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.knopf.dispatch('click');
    // Gegenprobe: Knopf hat angehalten
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');

    a.link.dispatch('focusin');
    fokusRaus(a.link, a.aussen);

    assert.ok(!a.aufrufe.some(([, b]) => b === 'cycle'), 'kein cycle nach Knopf-Pause');
    assert.equal(live(a), 'polite');
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(a.knopf.textContent, 'TEXT-PLAY');
});

// --- AK4 ---------------------------------------------------------------------

// AK4
test('Knopf hält an: pause - Label - Text und aria-live polite', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');

    a.knopf.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(a.knopf.textContent, 'TEXT-PLAY');
    assert.equal(live(a), 'polite');
});

// AK4
test('erneutes Auslösen startet wieder: cycle - Label - Text und aria-live off', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.knopf.dispatch('click');
    assert.equal(a.knopf.textContent, 'TEXT-PLAY');

    a.knopf.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause'], [a.slider, 'cycle']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
    assert.equal(a.knopf.textContent, 'TEXT-PAUSE');
    assert.equal(live(a), 'off');
});

// --- AK5 ---------------------------------------------------------------------

function ak5Knopf(jquery) {
    return () => {
        const a = aufbau({ jquery });
        assert.doesNotThrow(() => lade().init(a.umgebung));
        // Gegenprobe: Knopf ist gebunden
        assert.equal(a.knopf.listeners.click?.length > 0 || a.slider.listeners.click?.length > 0, true);

        assert.doesNotThrow(() => a.knopf.dispatch('click'));
        assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
        assert.equal(a.knopf.textContent, 'TEXT-PLAY');
        assert.equal(live(a), 'polite');

        assert.doesNotThrow(() => a.knopf.dispatch('click'));
        assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
        assert.equal(a.knopf.textContent, 'TEXT-PAUSE');
        assert.equal(live(a), 'off');
    };
}

function ak5Fokus(jquery) {
    return () => {
        const a = aufbau({ jquery });
        lade().init(a.umgebung);

        assert.doesNotThrow(() => a.link.dispatch('focusin'));
        assert.equal(live(a), 'polite');
        assert.doesNotThrow(() => fokusRaus(a.link, a.aussen));
        assert.equal(live(a), 'off');
    };
}

// AK5
test('ohne window.jQuery: kein Fehler - Knopf wechselt Text - aria-label und aria-live', ak5Knopf('keins'));
// AK5
test('ohne jQuery.fn.carousel: kein Fehler - Knopf wechselt Text - aria-label und aria-live', ak5Knopf('ohne-plugin'));
// AK5
test('ohne window.jQuery: Fokus in und aus dem Slider wirft nicht und wechselt aria-live', ak5Fokus('keins'));
// AK5
test('ohne jQuery.fn.carousel: Fokus in und aus dem Slider wirft nicht und wechselt aria-live', ak5Fokus('ohne-plugin'));

// --- Randfälle ---------------------------------------------------------------

// Randfall 1
test('mehrere Slider: Zustand je Slider einzeln', () => {
    const a = aufbau({ anzahl: 2 });
    const [s1, s2] = a.teile;
    lade().init(a.umgebung);

    s1.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe, [[s1.slider, 'pause']]);
    assert.equal(s1.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(s2.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
    assert.equal(s2.inner.getAttribute('aria-live'), 'off');

    s2.link.dispatch('focusin');
    assert.deepEqual(a.aufrufe.at(-1), [s2.slider, 'pause']);
    assert.equal(s2.inner.getAttribute('aria-live'), 'polite');
    fokusRaus(s2.link, a.aussen);
    assert.deepEqual(a.aufrufe.at(-1), [s2.slider, 'cycle']);
    assert.equal(s2.inner.getAttribute('aria-live'), 'off');

    // Slider 1 blieb angehalten
    assert.equal(s1.inner.getAttribute('aria-live'), 'polite');
    assert.equal(s1.knopf.textContent, 'TEXT-PLAY');
});

// Randfall 2
test('Fokus auf dem Knopf zählt als Fokus im Slider - Knopf anhalten - Fokus raus: bleibt angehalten', () => {
    const a = aufbau();
    lade().init(a.umgebung);

    a.knopf.dispatch('focusin');
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(live(a), 'polite');

    a.knopf.dispatch('click');
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');

    fokusRaus(a.knopf, a.aussen);
    assert.ok(!a.aufrufe.some(([, b]) => b === 'cycle'));
    assert.equal(live(a), 'polite');
    assert.equal(a.knopf.textContent, 'TEXT-PLAY');
});

// Randfall 3
test('Dokument lädt noch: Bindung erst bei DOMContentLoaded - jQuery wird dann nachgeschlagen', () => {
    const a = aufbau({ jquery: 'keins', readyState: 'loading' });
    assert.doesNotThrow(() => lade().init(a.umgebung));

    // Gegenprobe: vor DOMContentLoaded ist nichts gebunden
    a.knopf.dispatch('click');
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
    assert.equal(live(a), 'off');
    assert.ok((a.dok.listeners.DOMContentLoaded ?? []).length > 0, 'wartet auf DOMContentLoaded');

    a.window.jQuery = baueJQuery(a.aufrufe); // jQuery kommt erst am Seitenende
    a.dok.dispatch('DOMContentLoaded');

    a.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
});

function sofortGebunden(zustand) {
    return () => {
        const a = aufbau({ jquery: 'keins', readyState: zustand });
        lade().init(a.umgebung);
        assert.equal((a.dok.listeners.DOMContentLoaded ?? []).length, 0);

        a.window.jQuery = baueJQuery(a.aufrufe); // nach init gesetzt
        a.knopf.dispatch('click');

        assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
        assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    };
}

// Randfall 3
test('Dokument interactive: sofort gebunden - jQuery erst beim Ereignis nachgeschlagen', sofortGebunden('interactive'));
// Randfall 3
test('Dokument complete: sofort gebunden - jQuery erst beim Ereignis nachgeschlagen', sofortGebunden('complete'));

// AK7 (Inline-Form): ohne `module` startet das Skript selbst mit globalen window/document
test('inline im Browser (ohne module) startet das Skript selbst', () => {
    const quelle = readFileSync(SKRIPT, 'utf8');
    const a = aufbau();
    vm.runInNewContext(quelle, { window: a.window, document: a.dok });

    a.knopf.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
});
