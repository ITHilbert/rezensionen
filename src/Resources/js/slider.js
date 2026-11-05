(function () {
    'use strict';

    function init(umgebung) {
        var win = umgebung.window;
        var doc = umgebung.document;

        function binde() {
            var sliders = doc.querySelectorAll('[data-rezensionen-slider]');
            for (var i = 0; i < sliders.length; i++) {
                bindeSlider(sliders[i], win);
            }
        }

        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', binde);
        } else {
            binde();
        }
    }

    function bindeSlider(slider, win) {
        var inner = slider.querySelector('.carousel-inner');
        var knopf = slider.querySelector('[data-rezensionen-pause]');
        var angehalten = false; // vom Nutzer über den Knopf
        var fokusIn = false;

        function befehl(name) {
            var jq = win.jQuery;
            if (typeof jq === 'function' && jq.fn && typeof jq.fn.carousel === 'function') {
                jq(slider).carousel(name);
            }
        }

        function live(wert) {
            if (inner) {
                inner.setAttribute('aria-live', wert);
            }
        }

        function knopfZustand(label) {
            if (knopf) {
                knopf.setAttribute('aria-label', knopf.getAttribute('data-label-' + label));
                knopf.textContent = knopf.getAttribute('data-text-' + label);
            }
        }

        slider.addEventListener('focusin', function () {
            if (fokusIn) {
                return;
            }
            fokusIn = true;
            if (!angehalten) {
                befehl('pause');
                live('polite');
            }
        });

        slider.addEventListener('focusout', function (e) {
            if (e.relatedTarget && slider.contains(e.relatedTarget)) {
                return;
            }
            fokusIn = false;
            if (!angehalten) {
                befehl('cycle');
                live('off');
            }
        });

        if (knopf) {
            knopf.addEventListener('click', function () {
                angehalten = !angehalten;
                if (angehalten) {
                    befehl('pause');
                    knopfZustand('play');
                    live('polite');
                } else {
                    befehl('cycle');
                    knopfZustand('pause');
                    live('off');
                }
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { init: init };
    } else {
        init({ window: window, document: document });
    }
})();
