# Architekturübersicht: ITHilbert Rezensionen

## Aufbau
Modul zur Verwaltung von Bewertungen.

## Anzeige (Slider)
- View `rezensionen::show` (`src/Resources/views/show.blade.php`): Bootstrap-4-Carousel mit Element `#carouselExampleControls` (`data-rezensionen-slider`), Pause-Knopf im Slider, `aria-live` am Element `.carousel-inner`.
- Skript `src/Resources/js/slider.js`: Pause bei Fokus und Knopf. Der View-Composer in `RezensionenServiceProvider` liest die Datei und übergibt sie als `$rezensionenSliderSkript`; die View gibt sie einmal je Seite inline aus (`@once`). Kein Publish und kein Build im Host.
- Texte: `src/Resources/lang/{de,en}/rezensionen.php`, Schlüssel `slider_*` unter `rezensionen::rezensionen`.
- Laufzeit-Voraussetzung im Host: Bootstrap 4 und jQuery (`$.fn.carousel`). Fehlt das Plugin, bleibt der Knopf funktionsfähig, der Slider blättert nicht.
- Fallstrick: Das Skript ist ein Inline-`<script>` ohne Nonce. Eine strikte CSP ohne `unsafe-inline` blockiert es; dann fehlen Pause bei Fokus und Knopf, der Slider läuft weiter.

## Wichtige Klassen
- `ITHilbert\Rezensionen\RezensionenServiceProvider` (registriert Views, Übersetzungen und den View-Composer für `rezensionen::show`)
