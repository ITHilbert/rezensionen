<?php

use ITHilbert\Rezensionen\Http\Controllers\RezensionenController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/




Route::middleware(['web'])->group(function () {

    Route::get('Rezensionen/index', [RezensionenController::class, 'index'])->name('index');
    Route::get('Rezensionen/edit', [RezensionenController::class, 'edit'])->name('edit');

});


