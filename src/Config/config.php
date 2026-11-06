<?php

return [
    'name' => 'Rezensionen',

    // Skript des Sliders inline in rezensionen::show ausgeben (false: <x-rezensionen::skript /> selbst platzieren)
    'skript_inline' => filter_var(env('REZENSIONEN_SKRIPT_INLINE', true), FILTER_VALIDATE_BOOLEAN),

    'aggregateRating' => [
        'ratingValue' => '5',
        'bestRating' => '5',
        'ratingCount' => '9',
    ],

    'rezensionen' => [
        [
            'author' => 'Max Mustermann',
            'sterne' => 5,
            'rezension' => 'Einfach super',
        ],
        [
            'sterne' => 5,
            'author' => 'Hans',
            'rezension' => 'Immer wieder gerne.',
        ],
    ],
];
