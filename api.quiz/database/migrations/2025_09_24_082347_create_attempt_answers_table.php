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
        Schema::create('attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_attempt_id')->constrained()->onDelete('cascade');
            $table->foreignId('question_id')->constrained()->onDelete('cascade');
            $table->foreignId('selected_option_id')->nullable()->constrained('question_options')->onDelete('cascade');
            $table->text('answer_text')->nullable(); // For text-based answers
            $table->boolean('is_correct')->default(false);
            $table->integer('time_spent_seconds')->default(0); // Time spent on this question
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['quiz_attempt_id', 'question_id']);
            $table->index('quiz_attempt_id');
            
            // Ensure one answer per question per attempt
            $table->unique(['quiz_attempt_id', 'question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attempt_answers');
    }
};
