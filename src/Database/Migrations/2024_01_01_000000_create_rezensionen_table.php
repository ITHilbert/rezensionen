<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Abwärtskompatibel: bestehende Installationen haben die Tabelle bereits.
        if (! Schema::hasTable('rezensionen')) {
            Schema::create('rezensionen', function (Blueprint $table) {
                $table->id();
                $table->string('author');
                $table->unsignedTinyInteger('sterne')->default(5);
                $table->text('rezension');
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rezensionen');
    }
};
