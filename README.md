# Rezensionen

Eine Komponente für meine Rezensionen.

## Vorraussetzungen
Benötigt Bootstrap 4.

## Installation 
Package installieren
```
composer require ithilbert/rezensionen
```
Daten kopieren
```
php artisan vendor:publish --provider="ITHilbert\Rezensionen\RezensionenServiceProvider"
```

## Design übernehmen
resources/scss/app.scss
```
@import './rating.scss';
```

## Rezensionen in blade einfügen
```
@include('rezensionen::show')
```

## ToDo

## Author
IT-Hilbert GmbH

Access, Excel, VBA und Web Programmierungen (Laravel)

Homepage: [IT-Hilbert.com](https://www.IT-Hilbert.com) 
