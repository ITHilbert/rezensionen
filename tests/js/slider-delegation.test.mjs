// #755: Bindung über `document`, die ein Ersetzen des Markups übersteht (AK10), und `hidden` am Knopf (AK11).
// Lauf: node --test packages/rezensionen/tests/js/slider-delegation.test.mjs
// Schnittstelle wie in slider.test.mjs: module.exports = { init({ window, document }) }; Attrappen: attrappen.mjs.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import { aufbau, baueJQuery, baueSlider, ersetzeMarkup, fokusRaus, live } from './attrappen.mjs';

const require = createRequire(import.meta.url);
const SKRIPT = fileURLToPath(new URL('../../src/Resources/js/slider.js', import.meta.url));

function lade() {
    const modul = require(SKRIPT);
    assert.equal(typeof modul.init, 'function', 'slider.js muss { init } exportieren');
    return modul;
}

const anzahl = (obj, typ) => (obj.listeners[typ] ?? []).length;

// init + Nachweis, dass die Bindung an document hängt (sonst prüfen die Fälle nur das alte Verhalten)
function initAnDocument(a) {
    lade().init(a.umgebung);
    for (const typ of ['focusin', 'focusout', 'click']) {
        assert.equal(anzahl(a.dok, typ), 1, `${typ} an document`);
    }
}

// --- AK10: Listener an document ----------------------------------------------

// AK10
test('focusin - focusout und click hängen an document - nicht am Slider-Element oder Knopf', () => {
    const a = aufbau();
    assert.equal(anzahl(a.dok, 'click'), 0); // Gegenprobe: vor init nichts gebunden

    lade().init(a.umgebung);

    for (const typ of ['focusin', 'focusout', 'click']) {
        assert.equal(anzahl(a.dok, typ), 1, `${typ} an document`);
        assert.equal(anzahl(a.slider, typ), 0, `${typ} nicht am Slider`);
        assert.equal(anzahl(a.knopf, typ), 0, `${typ} nicht am Knopf`);
    }
});

// AK10
test('Klick auf ein Element im Knopf wird über das nächste [data-rezensionen-pause] dem Knopf zugeordnet', () => {
    const a = aufbau();
    const symbol = new (a.knopf.constructor)('span', {}, a.knopf);
    initAnDocument(a);

    symbol.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
});

// AK10
test('Klick außerhalb eines Knopfs ändert nichts', () => {
    const a = aufbau();
    initAnDocument(a);
    a.knopf.dispatch('click'); // Gegenprobe: der Knopf wirkt
    assert.equal(live(a), 'polite');

    a.link.dispatch('click');
    a.aussen.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(live(a), 'polite');
});

// AK10
test('Fokus außerhalb jedes Sliders wird ignoriert', () => {
    const a = aufbau();
    initAnDocument(a);
    a.link.dispatch('focusin'); // Gegenprobe: im Slider wirkt es
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);

    assert.doesNotThrow(() => a.aussen.dispatch('focusin'));
    assert.doesNotThrow(() => a.aussen.dispatch('focusout', { relatedTarget: null }));

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(live(a), 'polite');
});

// --- AK10: Markup ersetzen ---------------------------------------------------

// AK10
test('nach neuem Markup gilt AK3: Fokus rein pausiert - Fokus raus startet', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.link.dispatch('focusin'); // Gegenprobe: altes Markup wirkt
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);

    const neu = ersetzeMarkup(a.dok, a);
    assert.notEqual(neu.slider, a.slider);
    assert.equal(live(neu), 'off');
    neu.link.dispatch('focusin');

    assert.deepEqual(a.aufrufe.at(-1), [neu.slider, 'pause']);
    assert.equal(live(neu), 'polite');

    fokusRaus(neu.link, neu.aussen);
    assert.deepEqual(a.aufrufe.at(-1), [neu.slider, 'cycle']);
    assert.equal(live(neu), 'off');
});

// AK10
test('nach neuem Markup gilt AK3: nach Anhalten über den Knopf bleibt er beim Fokus-Raus angehalten', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    const neu = ersetzeMarkup(a.dok, a);

    neu.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe, [[neu.slider, 'pause']]); // Gegenprobe: Knopf wirkt
    neu.link.dispatch('focusin');
    fokusRaus(neu.link, neu.aussen);

    assert.ok(!a.aufrufe.some(([, b]) => b === 'cycle'));
    assert.equal(live(neu), 'polite');
    assert.equal(neu.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
});

// AK10
test('nach neuem Markup gilt AK4: Knopf hält an und startet wieder', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    a.knopf.dispatch('click'); // altes Markup war angehalten …
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    const neu = ersetzeMarkup(a.dok, a);
    // … das neue Markup beginnt spielend
    assert.equal(neu.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');

    neu.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe.at(-1), [neu.slider, 'pause']);
    assert.equal(neu.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(neu.knopf.textContent, 'TEXT-PLAY');
    assert.equal(live(neu), 'polite');

    neu.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe.at(-1), [neu.slider, 'cycle']);
    assert.equal(neu.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
    assert.equal(neu.knopf.textContent, 'TEXT-PAUSE');
    assert.equal(live(neu), 'off');
});

// AK10
test('nach neuem Markup gilt AK5: ohne jQuery kein Fehler - Knopf wechselt trotzdem', () => {
    for (const jquery of ['keins', 'ohne-plugin']) {
        const a = aufbau({ jquery });
        lade().init(a.umgebung);
        const neu = ersetzeMarkup(a.dok, a);

        assert.doesNotThrow(() => neu.knopf.dispatch('click'));
        assert.equal(neu.knopf.getAttribute('aria-label'), 'LABEL-PLAY', jquery);
        assert.equal(neu.knopf.textContent, 'TEXT-PLAY', jquery);
        assert.equal(live(neu), 'polite', jquery);
        assert.doesNotThrow(() => neu.link.dispatch('focusin'));
        assert.doesNotThrow(() => fokusRaus(neu.link, neu.aussen));
        assert.equal(live(neu), 'polite', jquery); // Knopf hat angehalten, Fokus-Raus ändert nichts
    }
});

// AK10
test('das ersetzte alte Markup wirkt nicht mehr - nur das neue', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    const neu = ersetzeMarkup(a.dok, a);
    neu.knopf.dispatch('click'); // Gegenprobe: neues Markup reagiert
    assert.deepEqual(a.aufrufe, [[neu.slider, 'pause']]);

    a.knopf.dispatch('click'); // altes Element hängt nicht mehr am Dokument

    assert.deepEqual(a.aufrufe, [[neu.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
});

// --- AK10: Zustand je Slider-Element -----------------------------------------

// AK10
test('Zustand je Slider-Element: Anhalten an Slider 1 und Fokus an Slider 2 beeinflussen sich nicht', () => {
    const a = aufbau({ anzahl: 2 });
    const [s1, s2] = a.teile;
    initAnDocument(a);

    s1.knopf.dispatch('click');
    assert.equal(s1.knopf.getAttribute('aria-label'), 'LABEL-PLAY'); // Gegenprobe: Slider 1 angehalten
    s2.link.dispatch('focusin');
    fokusRaus(s2.link, a.aussen);

    assert.deepEqual(a.aufrufe, [[s1.slider, 'pause'], [s2.slider, 'pause'], [s2.slider, 'cycle']]);
    assert.equal(live({ inner: s1.inner }), 'polite');
    assert.equal(live({ inner: s2.inner }), 'off');
    assert.equal(s2.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
});

// AK10
test('Zustand je Slider-Element: Fokus in Slider 1 hält Slider 2 nicht an', () => {
    const a = aufbau({ anzahl: 2 });
    const [s1, s2] = a.teile;
    initAnDocument(a);

    s1.link.dispatch('focusin');

    assert.deepEqual(a.aufrufe, [[s1.slider, 'pause']]);
    assert.equal(s1.inner.getAttribute('aria-live'), 'polite');
    assert.equal(s2.inner.getAttribute('aria-live'), 'off');
});

// --- AK10: mehrfach ausgeführt -----------------------------------------------

// AK10
test('init mehrfach mit demselben document: ein Klick schaltet genau einmal um', () => {
    const a = aufbau();
    const modul = lade();
    modul.init(a.umgebung);
    modul.init(a.umgebung);

    a.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');

    a.knopf.dispatch('click');
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause'], [a.slider, 'cycle']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PAUSE');
});

// AK10
test('init mehrfach: Fokus rein ruft pause genau einmal - Fokus raus cycle genau einmal', () => {
    const a = aufbau();
    const modul = lade();
    modul.init(a.umgebung);
    modul.init(a.umgebung);

    a.link.dispatch('focusin');
    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    fokusRaus(a.link, a.aussen);

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause'], [a.slider, 'cycle']]);
});

// AK10
test('Skript zweimal inline auf derselben Seite: ein Klick schaltet genau einmal um', () => {
    const quelle = readFileSync(SKRIPT, 'utf8');
    const a = aufbau();
    const kontext = vm.createContext({ window: a.window, document: a.dok });
    vm.runInContext(quelle, kontext);
    assert.equal(anzahl(a.dok, 'click'), 1); // Gegenprobe: erste Ausführung bindet
    vm.runInContext(quelle, kontext);

    a.knopf.dispatch('click');

    assert.deepEqual(a.aufrufe, [[a.slider, 'pause']]);
    assert.equal(a.knopf.getAttribute('aria-label'), 'LABEL-PLAY');
    assert.equal(anzahl(a.dok, 'click'), 1);
});

// --- AK11: hidden ------------------------------------------------------------

function alleKnoepfe(a) {
    return a.dok.querySelectorAll('[data-rezensionen-pause]');
}

// AK11
test('Beim Ausführen entfernt das Skript hidden an allen Knöpfen', () => {
    const a = aufbau({ anzahl: 2 });
    assert.equal(alleKnoepfe(a).length, 2);
    assert.ok(alleKnoepfe(a).every((k) => k.hasAttribute('hidden')), 'Gegenprobe: vor dem Skript sind alle verborgen');

    lade().init(a.umgebung);

    assert.ok(alleKnoepfe(a).every((k) => !k.hasAttribute('hidden')));
});

// AK11
test('Beim Ausführen vor dem Laden des Dokuments wird hidden sofort entfernt', () => {
    const a = aufbau({ readyState: 'loading' });
    assert.ok(a.knopf.hasAttribute('hidden'));

    lade().init(a.umgebung);

    assert.ok(!a.knopf.hasAttribute('hidden'));
});

// AK11
test('Bei DOMContentLoaded wird hidden an neuem Markup entfernt', () => {
    const a = aufbau({ readyState: 'loading', anzahl: 2 });
    lade().init(a.umgebung);
    const neu = ersetzeMarkup(a.dok, a); // Vue mountet neues Markup mit hidden
    assert.ok(neu.knopf.hasAttribute('hidden'), 'Gegenprobe: neuer Knopf ist verborgen');

    a.dok.dispatch('DOMContentLoaded');

    assert.ok(alleKnoepfe(a).length >= 2);
    assert.ok(alleKnoepfe(a).every((k) => !k.hasAttribute('hidden')));
});

// AK11
test('Bei load wird hidden an neuem Markup entfernt', () => {
    const a = aufbau({ readyState: 'interactive', anzahl: 2 });
    lade().init(a.umgebung);
    const neu = ersetzeMarkup(a.dok, a);
    assert.ok(neu.knopf.hasAttribute('hidden'), 'Gegenprobe: neuer Knopf ist verborgen');

    a.window.dispatch('load');

    assert.ok(alleKnoepfe(a).length >= 2);
    assert.ok(alleKnoepfe(a).every((k) => !k.hasAttribute('hidden')));
});

// AK11
test('Mit laufendem Skript ist der Knopf bedienbar und bleibt sichtbar', () => {
    const a = aufbau();
    lade().init(a.umgebung);
    assert.ok(!a.knopf.hasAttribute('hidden'));

    a.knopf.dispatch('click');
    a.knopf.dispatch('click');

    assert.ok(!a.knopf.hasAttribute('hidden'));
    assert.equal(a.knopf.textContent, 'TEXT-PAUSE');
});
