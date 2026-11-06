(function () {
    'use strict';

    var MERKMAL = '__rezensionenSliderGebunden';

    function init(umgebung) {
        var win = umgebung.window;
        var doc = umgebung.document;

        function zeigeKnoepfe() {
            var knoepfe = doc.querySelectorAll('[data-rezensionen-pause]');
            for (var i = 0; i < knoepfe.length; i++) {
                knoepfe[i].removeAttribute('hidden');
            }
        }

        zeigeKnoepfe();

        if (doc[MERKMAL]) {
            return;
        }
        doc[MERKMAL] = true;

        doc.addEventListener('DOMContentLoaded', zeigeKnoepfe);
        win.addEventListener('load', zeigeKnoepfe);

        if (doc.readyState === 'loading') {
            // jQuery kommt oft erst am Seitenende: erst bei DOMContentLoaded binden
            doc.addEventListener('DOMContentLoaded', function () {
                bindeDelegation(win, doc);
            });
        } else {
            bindeDelegation(win, doc);
        }
    }

    function bindeDelegation(win, doc) {
        // Zustand je Slider-Element: { angehalten: vom Nutzer über den Knopf, fokusIn }
        var zustaende = typeof WeakMap === 'function' ? new WeakMap() : null;

        function zustand(slider) {
            var z = zustaende ? zustaende.get(slider) : slider.__rezensionenZustand;
            if (!z) {
                z = { angehalten: false, fokusIn: false };
                if (zustaende) {
                    zustaende.set(slider, z);
                } else {
                    slider.__rezensionenZustand = z;
                }
            }
            return z;
        }

        function naechster(ziel, selektor) {
            return ziel && typeof ziel.closest === 'function' ? ziel.closest(selektor) : null;
        }

        function befehl(slider, name) {
            var jq = win.jQuery;
            if (typeof jq === 'function' && jq.fn && typeof jq.fn.carousel === 'function') {
                jq(slider).carousel(name);
            }
        }

        function live(slider, wert) {
            var inner = slider.querySelector('.carousel-inner');
            if (inner) {
                inner.setAttribute('aria-live', wert);
            }
        }

        function knopfZustand(knopf, label) {
            knopf.setAttribute('aria-label', knopf.getAttribute('data-label-' + label));
            knopf.textContent = knopf.getAttribute('data-text-' + label);
        }

        doc.addEventListener('focusin', function (e) {
            var slider = naechster(e.target, '[data-rezensionen-slider]');
            if (!slider) {
                return;
            }
            var z = zustand(slider);
            if (z.fokusIn) {
                return;
            }
            z.fokusIn = true;
            if (!z.angehalten) {
                befehl(slider, 'pause');
                live(slider, 'polite');
            }
        });

        doc.addEventListener('focusout', function (e) {
            var slider = naechster(e.target, '[data-rezensionen-slider]');
            if (!slider) {
                return;
            }
            if (e.relatedTarget && slider.contains(e.relatedTarget)) {
                return;
            }
            var z = zustand(slider);
            z.fokusIn = false;
            if (!z.angehalten) {
                befehl(slider, 'cycle');
                live(slider, 'off');
            }
        });

        doc.addEventListener('click', function (e) {
            var knopf = naechster(e.target, '[data-rezensionen-pause]');
            if (!knopf) {
                return;
            }
            var slider = naechster(knopf, '[data-rezensionen-slider]');
            if (!slider) {
                return;
            }
            var z = zustand(slider);
            z.angehalten = !z.angehalten;
            if (z.angehalten) {
                befehl(slider, 'pause');
                knopfZustand(knopf, 'play');
                live(slider, 'polite');
            } else {
                befehl(slider, 'cycle');
                knopfZustand(knopf, 'pause');
                live(slider, 'off');
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { init: init };
    } else {
        init({ window: window, document: document });
    }
})();
