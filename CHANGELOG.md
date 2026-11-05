# Changelog

## [Unreleased]

### Hinzugefügt
- Slider `rezensionen::show`: Pause bei Fokus. Hält der Fokus im Slider, pausiert er und `aria-live` wechselt auf `polite`. Verlässt der Fokus den Slider, läuft er wieder, außer er wurde über den Knopf angehalten (WCAG 2.2.2, #712).
- Slider: Knopf „Anhalten“/„Abspielen“ zum Anhalten und Starten des Sliders (#712).
- Übersetzungen `slider_pause_label`, `slider_play_label`, `slider_pause`, `slider_play` in `de` und `en` (#712).

### Hinweis für Hosts
- Der Slider braucht Bootstrap 4 und jQuery. Die Skriptausgabe ist inline; eine strikte Content-Security-Policy ohne `unsafe-inline` blockiert sie.
