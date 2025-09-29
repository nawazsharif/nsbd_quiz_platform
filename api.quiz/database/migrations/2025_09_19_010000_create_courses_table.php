<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('title', 200);
            $table->string('slug', 220)->unique();
            $table->string('summary', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('cover_url')->nullable();
            $table->boolean('is_paid')->default(false);
            $table->integer('price_cents')->nullable();
            $table->string('visibility', 16)->default('public');
            $table->string('status', 24)->default('draft'); // draft, submitted, approved, rejected
            $table->string('rejection_note')->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0.00);
            $table->unsignedInteger('rating_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};

