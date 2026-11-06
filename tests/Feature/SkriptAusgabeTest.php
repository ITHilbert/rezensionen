<?php

declare(strict_types=1);

namespace ITHilbert\Rezensionen\Tests\Feature;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Blade;
use ITHilbert\Rezensionen\Tests\TestCase;

/**
 * #755: Skript-Ausgabe abschaltbar (Config, Komponente), `hidden` am Knopf im Markup, README für Hosts mit Vue-Root.
 * Verhalten des Skripts: tests/js/slider-delegation.test.mjs.
 */
final class SkriptAusgabeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        app()->setLocale('de');
        config(['rezensionen.rezensionen' => [['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll']]]);
    }

    protected function tearDown(): void
    {
        putenv('REZENSIONEN_SKRIPT_INLINE');
        parent::tearDown();
    }

    private function paket(string $pfad): string
    {
        return __DIR__.'/../../'.$pfad;
    }

    private function skript(): string
    {
        $pfad = $this->paket('src/Resources/js/slider.js');
        $this->assertFileExists($pfad);
        $inhalt = trim((string) file_get_contents($pfad));
        $this->assertNotSame('', $inhalt);

        return $inhalt;
    }

    private function rendereShow(): string
    {
        return view('rezensionen::show')->render();
    }

    private function komponente(): string
    {
        return Blade::render('<x-rezensionen::skript />');
    }

    private function knopf(string $html): DOMElement
    {
        $dom = new DOMDocument;
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8"?><body>'.$html.'</body>');
        libxml_clear_errors();
        $knoten = (new DOMXPath($dom))->query("//*[@id='carouselExampleControls']//button[@data-rezensionen-pause]");
        $this->assertNotFalse($knoten);
        $this->assertSame(1, $knoten->length);
        $knopf = $knoten->item(0);
        $this->assertInstanceOf(DOMElement::class, $knopf);

        return $knopf;
    }

    private function readmeAbschnitt(): string
    {
        $readme = (string) file_get_contents($this->paket('README.md'));
        $this->assertSame(1, preg_match('/^(#{2,3}) Slider und Barrierefreiheit\s*$(.*?)(?=^#{1,3} |\z)/ms', $readme, $m));

        return $m[2] ?? '';
    }

    // --- AK9 -------------------------------------------------------------------

    // AK9
    public function test_standard_der_config_skript_inline_ist_true(): void
    {
        $this->assertTrue(config('rezensionen.skript_inline'));
    }

    // AK9
    public function test_env_nicht_gesetzt_ergibt_inline_true(): void
    {
        putenv('REZENSIONEN_SKRIPT_INLINE');
        $this->refreshApplication();

        $this->assertTrue(config('rezensionen.skript_inline'));
    }

    // AK9
    public function test_env_rezensionen_skript_inline_false_schaltet_die_config_ab(): void
    {
        putenv('REZENSIONEN_SKRIPT_INLINE=false');
        $this->refreshApplication();

        $this->assertFalse(config('rezensionen.skript_inline'));
    }

    // AK9
    public function test_show_gibt_bei_true_das_skript_inline_aus(): void
    {
        config(['rezensionen.skript_inline' => true]);

        $html = $this->rendereShow();

        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // AK9
    public function test_show_enthaelt_bei_false_kein_script(): void
    {
        config(['rezensionen.skript_inline' => true]);
        $this->assertSame(1, substr_count($this->rendereShow(), '<script')); // Gegenprobe: bei true da

        config(['rezensionen.skript_inline' => false]);
        $html = $this->rendereShow();

        $this->assertStringContainsString('id="carouselExampleControls"', $html);
        $this->assertSame(0, substr_count(strtolower($html), '<script'));
        $this->assertStringNotContainsString($this->skript(), $html);
    }

    // AK9
    public function test_komponente_gibt_das_skript_bei_true_aus(): void
    {
        config(['rezensionen.skript_inline' => true]);

        $html = $this->komponente();

        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // AK9
    public function test_komponente_gibt_das_skript_auch_bei_false_aus(): void
    {
        config(['rezensionen.skript_inline' => false]);
        $this->assertSame(0, substr_count($this->rendereShow(), '<script')); // Gegenprobe: show gibt nichts aus

        $html = $this->komponente();

        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // AK9
    public function test_komponente_zweimal_auf_einer_seite_gibt_das_skript_einmal_aus(): void
    {
        $html = Blade::render("<x-rezensionen::skript />\n<x-rezensionen::skript />");

        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // --- Randfall 4 ------------------------------------------------------------

    // Randfall 4
    public function test_show_inline_und_komponente_danach_ergeben_nur_ein_script(): void
    {
        config(['rezensionen.skript_inline' => true]);

        $html = Blade::render("@include('rezensionen::show')\n<x-rezensionen::skript />");

        $this->assertStringContainsString('id="carouselExampleControls"', $html);
        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // Randfall 4
    public function test_komponente_zuerst_und_show_inline_danach_ergeben_nur_ein_script(): void
    {
        config(['rezensionen.skript_inline' => true]);

        $html = Blade::render("<x-rezensionen::skript />\n@include('rezensionen::show')");

        $this->assertStringContainsString('id="carouselExampleControls"', $html);
        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $this->skript()));
    }

    // --- AK11 Markup -----------------------------------------------------------

    // AK11
    public function test_knopf_traegt_im_markup_das_attribut_hidden(): void
    {
        $html = $this->rendereShow();

        $knopf = $this->knopf($html); // Gegenprobe: der Knopf ist gerendert
        $this->assertTrue($knopf->hasAttribute('hidden'));
    }

    // AK11
    public function test_ohne_skript_bleibt_der_knopf_verborgen(): void
    {
        config(['rezensionen.skript_inline' => false]);

        $html = $this->rendereShow();

        $this->assertSame(0, substr_count(strtolower($html), '<script')); // kein Skript auf der Seite
        $this->assertTrue($this->knopf($html)->hasAttribute('hidden'));
    }

    // --- AK12 ------------------------------------------------------------------

    // AK12
    public function test_readme_nennt_env_rezensionen_skript_inline_false(): void
    {
        $this->assertStringContainsString('REZENSIONEN_SKRIPT_INLINE=false', $this->readmeAbschnitt());
    }

    // AK12
    public function test_readme_nennt_die_komponente_ausserhalb_des_vue_roots_vor_body_ende(): void
    {
        $abschnitt = $this->readmeAbschnitt();

        $this->assertStringContainsString('<x-rezensionen::skript />', $abschnitt);
        $this->assertStringContainsString('Vue', $abschnitt);
        $this->assertStringContainsString('</body>', $abschnitt);
    }

    // AK12
    public function test_readme_nennt_den_grund_vue_2_verwirft_script_im_template(): void
    {
        $abschnitt = $this->readmeAbschnitt();

        $this->assertStringContainsString('Vue 2', $abschnitt);
        $this->assertStringContainsString('<script>', $abschnitt);
    }
}
