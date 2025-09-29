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
        Schema::create('course_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('course_content_id')->constrained('course_contents')->cascadeOnDelete();
            $table->string('status', 20)->default('not_started'); // not_started, in_progress, completed
            $table->integer('progress_percentage')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->json('metadata')->nullable(); // For storing additional progress data
            $table->timestamps();
            
            // Ensure a user can only have one progress record per course content
            $table->unique(['user_id', 'course_id', 'course_content_id']);
            
            // Indexes for performance
            $table->index(['user_id', 'course_id']);
            $table->index(['course_id', 'status']);
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_progress');
    }
};