<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_revenues', function (Blueprint $table) {
            $table->foreignId('course_id')->nullable()->after('quiz_id')->constrained('courses')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('platform_revenues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('course_id');
        });
    }
};

