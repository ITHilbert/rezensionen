<?php
use ITHilbert\Rezensionen\Models\Rezension;
?>

<div class="row mt-4 p-3">
    <h3 class="text-center col-12">Das sagen unsere Kunden:</h3>
    <div class="card-deck card-mute p-4 col-md-12 mx-auto">

        <div id="carouselExampleControls" class="carousel slide" data-ride="carousel" data-rezensionen-slider>
            <div class="carousel-inner" id="carouselExampleControls-inner" aria-live="off">
                {!! Rezension::getRezensionen() !!}
            </div>
            <a class="carousel-control-prev" href="#carouselExampleControls" role="button" data-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="sr-only">Previous</span>
            </a>
            <a class="carousel-control-next" href="#carouselExampleControls" role="button" data-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="sr-only">Next</span>
            </a>
            <div class="position-relative text-center" style="z-index: 2;">
                <button type="button" class="btn btn-sm btn-outline-secondary mt-2" data-rezensionen-pause hidden
                    aria-controls="carouselExampleControls-inner"
                    aria-label="{{ __('rezensionen::rezensionen.slider_pause_label') }}"
                    data-label-pause="{{ __('rezensionen::rezensionen.slider_pause_label') }}"
                    data-label-play="{{ __('rezensionen::rezensionen.slider_play_label') }}"
                    data-text-pause="{{ __('rezensionen::rezensionen.slider_pause') }}"
                    data-text-play="{{ __('rezensionen::rezensionen.slider_play') }}">{{ __('rezensionen::rezensionen.slider_pause') }}</button>
            </div>
        </div>
    </div>
</div>

@if (config('rezensionen.skript_inline'))
<x-rezensionen::skript />
@endif
