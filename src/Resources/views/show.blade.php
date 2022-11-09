<?php
use ITHilbert\Rezensionen\Models\Rezension;
?>

<div class="row mt-4 p-3">
    <h3 class="text-center col-12">Das sagen unsere Kunden:</h3>
    <div class="card-deck card-mute p-4 col-md-12 mx-auto">

        <div id="carouselExampleControls" class="carousel slide" data-ride="carousel">
            <div class="carousel-inner">
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
        </div>
    </div>
</div>
