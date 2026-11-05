# ITHilbert Rezensionen

**Beschreibung**: Neues Package für Rezensionen.

## Dokumentation

Die ausführliche Dokumentation befindet sich im Ordner `.project/doku/`:
- [Kontext & Zielsetzung](.project/doku/00_README_Kontext.md)
- [Architekturübersicht](.project/doku/01_Architekturübersicht.md)
- [Modulstruktur](.project/doku/07_Modulstruktur.md)

## Installation

```bash
composer require ithilbert/rezensionen
```

## Namespace
`ITHilbert\Rezensionen`


## Slider und Barrierefreiheit

Der Slider (`rezensionen::show`) hält nach WCAG 2.2.2 an, wenn der Nutzer es braucht:

- **Pause bei Fokus:** Wandert der Fokus in den Slider, pausiert das Carousel und `aria-live` wechselt auf `polite`. Verlässt der Fokus den Slider, läuft er wieder (`aria-live="off"`), außer er wurde über den Knopf angehalten.
- **Knopf:** „Anhalten“/„Abspielen“ (`data-rezensionen-pause`) hält den Slider an und startet ihn wieder.
- **Texte:** kommen aus der Sprachdatei `rezensionen::rezensionen` (`slider_pause_label`, `slider_play_label`, `slider_pause`, `slider_play`) und lassen sich dort überschreiben.
- **Skript:** `src/Resources/js/slider.js` wird einmal je Seite inline ausgegeben, kein `vendor:publish` und kein Build nötig.
- **Voraussetzung:** Bootstrap 4 und jQuery (`$.fn.carousel`). Fehlt das Plugin, wechselt nur der Knopf seinen Zustand, es gibt keinen Fehler.
