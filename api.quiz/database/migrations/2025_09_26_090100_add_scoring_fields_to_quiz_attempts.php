<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->integer('incorrect_answers')->default(0)->after('correct_answers');
            $table->decimal('earned_points', 8, 2)->nullable()->after('score');
            $table->decimal('penalty_points', 8, 2)->nullable()->after('earned_points');
        });
    }

    public function down(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->dropColumn(['incorrect_answers', 'earned_points', 'penalty_points']);
        });
    }
};
