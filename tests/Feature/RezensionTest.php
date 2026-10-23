<?php

declare(strict_types=1);

namespace ITHilbert\Rezensionen\Tests\Feature;

use Illuminate\Database\Eloquent\SoftDeletes;
use ITHilbert\Rezensionen\Models\Rezension;
use ITHilbert\Rezensionen\Tests\TestCase;

/**
 * Charakterisierung von Model Rezension und der Karussell-View (Ist-Stand).
 */
final class RezensionTest extends TestCase
{
    /**
     * @param  array<int, array<string, mixed>>  $rezensionen
     */
    private function setzeRezensionen(array $rezensionen): void
    {
        config(['rezensionen.rezensionen' => $rezensionen]);
    }

    // Charakterisierung
    public function test_model_konfiguration(): void
    {
        $modell = new Rezension;

        $this->assertSame('rezensionen', $modell->getTable());
        $this->assertSame('id', $modell->getKeyName());
        $this->assertTrue($modell->usesTimestamps());
        $this->assertContains(SoftDeletes::class, class_uses_recursive($modell));
    }

    // Charakterisierung: id ist geschuetzt, alle anderen Felder sind per Massenzuweisung fuellbar
    public function test_massenzuweisung_schuetzt_nur_die_id(): void
    {
        $modell = new Rezension(['id' => 5, 'author' => 'Anna']);

        $this->assertNull($modell->id);
        $this->assertSame('Anna', $modell->author);
    }

    // Charakterisierung
    public function test_get_rezensionen_erster_eintrag_ist_aktiv(): void
    {
        $this->setzeRezensionen([
            ['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll'],
            ['author' => 'Ben', 'sterne' => 5, 'rezension' => 'Gut'],
        ]);

        $html = Rezension::getRezensionen();

        $this->assertSame(1, substr_count($html, 'carousel-item active text-center'));
        $this->assertSame(2, substr_count($html, 'carousel-item'));
        $this->assertLessThan(strpos($html, 'Ben'), strpos($html, 'Anna'));
    }

    // Charakterisierung
    public function test_get_rezensionen_gibt_text_autor_und_sterne_bild_aus(): void
    {
        $this->setzeRezensionen([['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll']]);

        $html = Rezension::getRezensionen();

        $this->assertStringContainsString('<p class="rezension-text">Toll</p>', $html);
        $this->assertStringContainsString('<div class="rezension-author">Anna</div>', $html);
        $this->assertStringContainsString('src="'.asset('vendor/rezensionen/5-stars.png').'"', $html);
        $this->assertStringContainsString('alt="5 Sterne"', $html);
    }

    // Charakterisierung: Das Sternebild ist immer 5 Sterne, der Wert 'sterne' wird ignoriert
    public function test_get_rezensionen_ignoriert_den_sterne_wert(): void
    {
        $this->setzeRezensionen([['author' => 'Anna', 'sterne' => 3, 'rezension' => 'Okay']]);

        $this->assertStringContainsString('5-stars.png', Rezension::getRezensionen());
        $this->assertStringNotContainsString('3-stars', Rezension::getRezensionen());
    }

    // Charakterisierung
    public function test_get_rezensionen_ohne_eintraege_ist_leer(): void
    {
        $this->setzeRezensionen([]);

        $this->assertSame('', Rezension::getRezensionen());
    }

    // Charakterisierung: Inhalte werden nicht escaped (HTML aus der Config wird durchgereicht)
    public function test_get_rezensionen_escaped_nicht(): void
    {
        $this->setzeRezensionen([['author' => 'A', 'sterne' => 5, 'rezension' => '<b>fett</b>']]);

        $this->assertStringContainsString('<b>fett</b>', Rezension::getRezensionen());
    }

    // Charakterisierung
    public function test_view_show_rendert_karussell_mit_rezensionen(): void
    {
        $this->setzeRezensionen([['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll']]);

        $html = view('rezensionen::show')->render();

        $this->assertStringContainsString('Das sagen unsere Kunden:', $html);
        $this->assertStringContainsString('id="carouselExampleControls"', $html);
        $this->assertStringContainsString('<div class="rezension-author">Anna</div>', $html);
        $this->assertStringContainsString('carousel-control-prev', $html);
        $this->assertStringContainsString('carousel-control-next', $html);
    }

    // Ohne veroeffentlichte Config greift die Vorlage (mergeConfigFrom) und es gibt keinen Fehler
    public function test_get_rezensionen_ohne_veroeffentlichte_config_nutzt_config_vorlage(): void
    {
        $vorlage = require __DIR__.'/../../src/Config/config.php';

        $html = Rezension::getRezensionen();

        $this->assertNotSame('', $html);
        foreach ($vorlage['rezensionen'] as $eintrag) {
            $this->assertStringContainsString($eintrag['author'], $html);
            $this->assertStringContainsString($eintrag['rezension'], $html);
        }
        $this->assertSame(count($vorlage['rezensionen']), substr_count($html, 'carousel-item'));
    }
}
