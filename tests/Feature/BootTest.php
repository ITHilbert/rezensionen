<?php

declare(strict_types=1);

namespace ITHilbert\Rezensionen\Tests\Feature;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use ITHilbert\Rezensionen\RezensionenServiceProvider;
use ITHilbert\Rezensionen\Tests\TestCase;

/**
 * Charakterisierung des Boot-Verhaltens (Ist-Stand, keine Spec).
 */
final class BootTest extends TestCase
{
    // Charakterisierung
    public function test_provider_ist_registriert(): void
    {
        $this->assertArrayHasKey(RezensionenServiceProvider::class, $this->app->getLoadedProviders());
    }

    // Charakterisierung
    public function test_view_namespace_rezensionen_enthaelt_show(): void
    {
        $this->assertTrue(view()->exists('rezensionen::show'));
    }

    // Charakterisierung
    public function test_uebersetzungen_deutsch_und_englisch_registriert(): void
    {
        $translator = app('translator');

        $this->assertTrue($translator->hasForLocale('rezensionen::rezensionen.btn-back', 'de'));
        $this->assertSame('Zurück', trans('rezensionen::rezensionen.btn-back', [], 'de'));
    }

    // Charakterisierung: Config-Vorlage liefert Name, Gesamtbewertung und Beispiel-Rezensionen
    public function test_config_vorlage_enthaelt_schluessel(): void
    {
        $config = require __DIR__.'/../../src/Config/config.php';

        $this->assertSame('Rezensionen', $config['name']);
        $this->assertSame('9', $config['aggregateRating']['ratingCount']);
        $this->assertCount(2, $config['rezensionen']);
        $this->assertSame('Max Mustermann', $config['rezensionen'][0]['author']);
    }

    // Charakterisierung: Config, Assets und Scss sind als Publish-Pfade registriert
    public function test_publish_pfade_sind_registriert(): void
    {
        $pfade = ServiceProvider::pathsToPublish(RezensionenServiceProvider::class);

        $this->assertContains(config_path('rezensionen.php'), $pfade);
        $this->assertContains(public_path('vendor/rezensionen'), $pfade);
        $this->assertContains(resource_path('scss/rating.scss'), $pfade);
    }

    // OFFEN-1 (roter Test, Defekt): Der Provider fuehrt die Config nicht zusammen (nur publishes).
    // Ohne veroeffentlichte Config ist config('rezensionen.rezensionen') null und die View bricht ab.
    public function test_config_ist_nach_dem_booten_ohne_veroeffentlichung_vorhanden(): void
    {
        $this->assertIsArray(config('rezensionen.rezensionen'));
    }

    // OFFEN-2 (roter Test, Defekt): Das Model Rezension nutzt die Tabelle 'rezensionen',
    // das Paket bringt aber keine Migration mit (Ordner leer, loadMigrationsFrom auskommentiert).
    public function test_migration_legt_tabelle_rezensionen_an(): void
    {
        $this->artisan('migrate')->assertSuccessful();

        $this->assertTrue(Schema::hasTable('rezensionen'));
    }

    // Charakterisierung: Paket bringt keine Routen und keine Befehle mit
    public function test_keine_routen_und_keine_befehle(): void
    {
        $uris = array_map(
            static fn ($route): string => $route->uri(),
            Route::getRoutes()->getRoutes()
        );

        $this->assertSame([], array_values(array_filter($uris, static fn (string $uri): bool => str_contains($uri, 'rezension'))));
        $this->assertArrayNotHasKey('rezensionen:install', $this->app->make(Kernel::class)->all());
    }
}
