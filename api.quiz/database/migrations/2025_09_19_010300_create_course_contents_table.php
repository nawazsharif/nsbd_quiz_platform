<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('type', 32); // pdf, text, video, quiz, certificate
            $table->string('title', 200);
            $table->integer('order_index')->default(0);
            $table->integer('duration_seconds')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['course_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_contents');
    }
};

