// Verhalten von src/Resources/js/slider.js mit Attrappen (kein Browser, keine npm-Pakete).
// Lauf: node --test packages/rezensionen/tests/js/slider.test.mjs
//
// Erwartete Schnittstelle (CommonJS/UMD):
//   module.exports = { init(umgebung) }   mit umgebung = { window, document }
//   - Ohne `module` (inline im Browser) startet das Skript selbst mit den globalen window/document;
//     beim require() in Node startet es NICHT von selbst.
//   - init hängt die Listener (focusin, focusout, click) an `document` (AK10, Delegation über closest());
//     sofort wenn document.readyState !== 'loading', sonst bei 'DOMContentLoaded'. Zustand je Slider-Element.
//   - jQuery wird erst beim Ereignis aus umgebung.window.jQuery gelesen; Aufruf: jQuery(slider).carousel('pause'|'cycle')
//     nur wenn jQuery und jQuery.fn.carousel Funktionen sind.
//   - Im Slider: .carousel-inner (aria-live), Knopf [data-rezensionen-pause] (click, aria-label, textContent),
//     Texte des Wechsels aus data-label-pause, data-label-play, data-text-pause, data-text-play des Knopfs.
//   - Fokus: focusin/focusout bubbeln bis document; Ziel innerhalb = slider.contains(event.relatedTarget).
//   - Attrappen: tests/js/attrappen.mjs (Ereignisse bubbeln bis document, closest()).

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import { aufbau, baueJQuery, fokusRaus, live } from './attrappen.mjs';

const require = createRequire(import.meta.url);
const SKRIPT = fileURLToPath(new URL('../../src/Resources/js/slider.js', import.meta.url));

function lade() {
    const modul = require(SKRIPT);
    assert.equal(typeof modul.init, 'function', 'slider.js muss { init } exportieren');
    return modul;
}

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
        assert.equal(a.dok.listeners.click?.length > 0, true);

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
