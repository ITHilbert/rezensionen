<?php

declare(strict_types=1);

namespace ITHilbert\Rezensionen\Tests\Feature;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Blade;
use ITHilbert\Rezensionen\Tests\TestCase;

/**
 * Markup, Texte, Skript-Ausgabe und README zu Pause bei Fokus / Pause-Knopf (#712).
 * Verhalten des Skripts: tests/js/slider.test.mjs.
 */
final class SliderPauseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        app()->setLocale('de');
    }

    private function paket(string $pfad): string
    {
        return __DIR__.'/../../'.$pfad;
    }

    private function skriptInhalt(): string
    {
        $pfad = $this->paket('src/Resources/js/slider.js');
        $this->assertFileExists($pfad);

        return (string) file_get_contents($pfad);
    }

    private function rendereShow(): string
    {
        config(['rezensionen.rezensionen' => [['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll']]]);

        return view('rezensionen::show')->render();
    }

    private function xpath(string $html): DOMXPath
    {
        $dom = new DOMDocument;
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8"?><body>'.$html.'</body>');
        libxml_clear_errors();

        return new DOMXPath($dom);
    }

    private function element(DOMXPath $xp, string $query): DOMElement
    {
        $knoten = $xp->query($query);
        $this->assertNotFalse($knoten);
        $this->assertSame(1, $knoten->length, 'Genau ein Treffer erwartet für '.$query);
        $element = $knoten->item(0);
        $this->assertInstanceOf(DOMElement::class, $element);

        return $element;
    }

    private function slider(DOMXPath $xp): DOMElement
    {
        return $this->element($xp, "//*[@id='carouselExampleControls']");
    }

    private function knopf(DOMXPath $xp): DOMElement
    {
        return $this->element($xp, "//*[@id='carouselExampleControls']//button[@data-rezensionen-pause]");
    }

    private function inner(DOMXPath $xp): DOMElement
    {
        return $this->element($xp, "//*[@id='carouselExampleControls']//*[contains(concat(' ', normalize-space(@class), ' '), ' carousel-inner ')]");
    }

    // AK1
    public function test_slider_element_traegt_marker_und_bleibt_bootstrap4_carousel(): void
    {
        $slider = $this->slider($this->xpath($this->rendereShow()));

        $this->assertTrue($slider->hasAttribute('data-rezensionen-slider'));
        $this->assertSame('carousel', $slider->getAttribute('data-ride'));
    }

    // AK1
    public function test_knopf_ist_button_vom_typ_button_im_slider(): void
    {
        $knopf = $this->knopf($this->xpath($this->rendereShow()));

        $this->assertSame('button', $knopf->tagName);
        $this->assertSame('button', $knopf->getAttribute('type'));
    }

    // AK1
    public function test_knopf_verweist_per_aria_controls_auf_die_id_von_carousel_inner(): void
    {
        $xp = $this->xpath($this->rendereShow());
        $inner = $this->inner($xp);
        $knopf = $this->knopf($xp);

        $this->assertNotSame('', $inner->getAttribute('id'));
        $this->assertSame($inner->getAttribute('id'), $knopf->getAttribute('aria-controls'));
    }

    // AK1
    public function test_knopf_startet_im_zustand_spielt_mit_label_und_text_anhalten(): void
    {
        $knopf = $this->knopf($this->xpath($this->rendereShow()));

        $this->assertSame('Bewertungen anhalten', $knopf->getAttribute('aria-label'));
        $this->assertSame('Anhalten', trim($knopf->textContent));
    }

    // AK4
    public function test_knopf_ist_sichtbar_ohne_sr_only_und_d_none(): void
    {
        $xp = $this->xpath($this->rendereShow());
        $knopf = $this->knopf($xp);
        $klassen = preg_split('/\s+/', trim($knopf->getAttribute('class'))) ?: [];

        $this->assertNotContains('sr-only', $klassen);
        $this->assertNotContains('d-none', $klassen);
        $this->assertSame(0, $xp->query('ancestor::*[contains(concat(" ", normalize-space(@class), " "), " d-none ")]', $knopf)->length);
        $this->assertStringNotContainsString('display:none', str_replace(' ', '', $knopf->getAttribute('style')));
        $this->assertFalse($knopf->hasAttribute('hidden'));
    }

    // AK4
    public function test_knopf_liegt_ueber_den_pfeilen_in_eigenem_element_im_slider(): void
    {
        $xp = $this->xpath($this->rendereShow());
        $knopf = $this->knopf($xp);
        $slider = $this->slider($xp);

        // Gegenprobe: der Knopf steht weiter innerhalb von #carouselExampleControls
        $this->assertSame(1, $xp->query('ancestor::*[@id="carouselExampleControls"]', $knopf)->length);

        $eltern = $knopf->parentNode;
        $this->assertInstanceOf(DOMElement::class, $eltern);
        $this->assertFalse($eltern->isSameNode($slider), 'Der Knopf braucht ein eigenes Elternelement unterhalb des Sliders');
        $this->assertSame(1, $xp->query('ancestor::*[@id="carouselExampleControls"]', $eltern)->length);

        $klassen = preg_split('/\s+/', trim($eltern->getAttribute('class'))) ?: [];
        $this->assertContains('position-relative', $klassen);
        $this->assertSame(1, preg_match('/z-index\s*:\s*(\d+)/', $eltern->getAttribute('style'), $m), 'z-index im style erwartet');
        $this->assertGreaterThanOrEqual(2, (int) $m[1]);
    }

    // AK2
    public function test_carousel_inner_hat_id_und_aria_live_off(): void
    {
        $inner = $this->inner($this->xpath($this->rendereShow()));

        $this->assertNotSame('', $inner->getAttribute('id'));
        $this->assertSame('off', $inner->getAttribute('aria-live'));
    }

    // AK6
    public function test_sprachdatei_de_enthaelt_die_vier_texte(): void
    {
        app()->setLocale('de');

        $this->assertSame('Bewertungen anhalten', trans('rezensionen::rezensionen.slider_pause_label'));
        $this->assertSame('Bewertungen abspielen', trans('rezensionen::rezensionen.slider_play_label'));
        $this->assertSame('Anhalten', trans('rezensionen::rezensionen.slider_pause'));
        $this->assertSame('Abspielen', trans('rezensionen::rezensionen.slider_play'));
    }

    // AK6
    public function test_sprachdatei_en_enthaelt_die_vier_texte(): void
    {
        app()->setLocale('en');

        $this->assertSame('Pause reviews', trans('rezensionen::rezensionen.slider_pause_label'));
        $this->assertSame('Play reviews', trans('rezensionen::rezensionen.slider_play_label'));
        $this->assertSame('Pause', trans('rezensionen::rezensionen.slider_pause'));
        $this->assertSame('Play', trans('rezensionen::rezensionen.slider_play'));
    }

    // AK6
    public function test_markup_folgt_der_gesetzten_sprache(): void
    {
        app()->setLocale('en');
        $knopf = $this->knopf($this->xpath($this->rendereShow()));

        $this->assertSame('Pause reviews', $knopf->getAttribute('aria-label'));
        $this->assertSame('Pause', trim($knopf->textContent));
    }

    // AK6
    public function test_markup_bezieht_die_texte_aus_der_sprachdatei(): void
    {
        app('translator')->addLines([
            'rezensionen.slider_pause_label' => 'QUELLE-PAUSE-LABEL',
            'rezensionen.slider_play_label' => 'QUELLE-PLAY-LABEL',
            'rezensionen.slider_pause' => 'QUELLE-PAUSE',
            'rezensionen.slider_play' => 'QUELLE-PLAY',
        ], 'de', 'rezensionen');
        app()->setLocale('de');

        $knopf = $this->knopf($this->xpath($this->rendereShow()));

        $this->assertSame('QUELLE-PAUSE-LABEL', $knopf->getAttribute('aria-label'));
        $this->assertSame('QUELLE-PAUSE', trim($knopf->textContent));
        // Die Texte des Wechsels stehen als data-Attribute am Knopf (Schnittstelle zu slider.js)
        $this->assertSame('QUELLE-PAUSE-LABEL', $knopf->getAttribute('data-label-pause'));
        $this->assertSame('QUELLE-PLAY-LABEL', $knopf->getAttribute('data-label-play'));
        $this->assertSame('QUELLE-PAUSE', $knopf->getAttribute('data-text-pause'));
        $this->assertSame('QUELLE-PLAY', $knopf->getAttribute('data-text-play'));
    }

    // AK6
    public function test_data_attribute_des_knopfs_tragen_die_deutschen_texte(): void
    {
        app()->setLocale('de');
        $knopf = $this->knopf($this->xpath($this->rendereShow()));

        $this->assertSame('Bewertungen anhalten', $knopf->getAttribute('data-label-pause'));
        $this->assertSame('Bewertungen abspielen', $knopf->getAttribute('data-label-play'));
        $this->assertSame('Anhalten', $knopf->getAttribute('data-text-pause'));
        $this->assertSame('Abspielen', $knopf->getAttribute('data-text-play'));
    }

    // AK7
    public function test_skript_datei_existiert_im_paket(): void
    {
        $this->assertStringContainsString('data-rezensionen-slider', $this->skriptInhalt());
    }

    // AK7
    public function test_view_gibt_den_inhalt_von_slider_js_inline_aus(): void
    {
        $skript = trim($this->skriptInhalt());
        $this->assertNotSame('', $skript);

        $html = $this->rendereShow();

        $this->assertSame(1, substr_count($html, '<script'));
        $this->assertSame(1, substr_count($html, $skript));
        $this->assertSame(0, preg_match('/<script\b[^>]*\bsrc=/i', $html));
    }

    // AK7
    public function test_skript_steht_bei_zweifachem_render_auf_einer_seite_nur_einmal(): void
    {
        config(['rezensionen.rezensionen' => [['author' => 'Anna', 'sterne' => 5, 'rezension' => 'Toll']]]);
        $skript = trim($this->skriptInhalt());
        $this->assertNotSame('', $skript);

        $html = Blade::render("@include('rezensionen::show')\n@include('rezensionen::show')");

        // Gegenprobe: beide Slider sind gerendert
        $this->assertSame(2, substr_count($html, 'id="carouselExampleControls"'));
        $this->assertSame(1, substr_count($html, $skript));
        $this->assertSame(1, substr_count($html, '<script'));
    }

    // AK7
    public function test_skript_nutzt_keine_weitere_bibliothek(): void
    {
        $skript = $this->skriptInhalt();
        $this->assertNotSame('', $skript);

        $this->assertSame(0, preg_match('/^\s*import\s/m', $skript));
        $this->assertSame(0, preg_match('/\brequire\s*\(/', $skript));
        $this->assertSame(0, preg_match('~https?://~', $skript));
    }

    // AK8
    public function test_readme_hat_abschnitt_slider_und_barrierefreiheit(): void
    {
        $readme = (string) file_get_contents($this->paket('README.md'));

        $this->assertSame(1, preg_match('/^#{2,3} Slider und Barrierefreiheit\s*$/m', $readme));
        $abschnitt = $this->readmeAbschnitt($readme);

        $this->assertStringContainsString('Fokus', $abschnitt);
        $this->assertStringContainsString('Knopf', $abschnitt);
        $this->assertStringContainsString('rezensionen::rezensionen', $abschnitt);
        $this->assertStringContainsString('Bootstrap 4', $abschnitt);
        $this->assertStringContainsString('jQuery', $abschnitt);
    }

    private function readmeAbschnitt(string $readme): string
    {
        $this->assertSame(1, preg_match('/^(#{2,3}) Slider und Barrierefreiheit\s*$(.*?)(?=^#{1,3} |\z)/ms', $readme, $m));

        return $m[2] ?? '';
    }
}
