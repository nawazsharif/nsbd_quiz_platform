<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->string('type', 24); // mcq, true_false, short_desc
            $table->integer('order_index');
            $table->text('text')->nullable();
            $table->text('explanation')->nullable();
            $table->boolean('multiple_correct')->nullable();
            $table->boolean('correct_boolean')->nullable();
            $table->text('prompt')->nullable();
            $table->text('sample_answer')->nullable();
            $table->integer('points')->default(1);
            $table->boolean('requires_manual_grading')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
