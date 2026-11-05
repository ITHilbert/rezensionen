# Modulstruktur: ITHilbert Rezensionen

```
/src
  /Database
  /Http
  /Resources
    /assets     Bilder für die Anzeige
    /js         slider.js (wird inline in rezensionen::show ausgegeben)
    /lang       Übersetzungen de, en
    /scss       rating.scss (wird per Publish in den Host kopiert)
    /views      show.blade.php
  RezensionenServiceProvider.php
```
