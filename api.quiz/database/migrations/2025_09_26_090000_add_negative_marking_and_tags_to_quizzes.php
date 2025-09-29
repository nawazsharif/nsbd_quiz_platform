<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->boolean('negative_marking')->default(false);
            $table->decimal('negative_mark_value', 6, 2)->nullable();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->timestamps();
        });

        Schema::create('quiz_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['quiz_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_tag');
        Schema::dropIfExists('tags');

        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropColumn(['negative_marking', 'negative_mark_value']);
        });
    }
};
