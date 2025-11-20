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
        Schema::table('wallet_transactions', function (Blueprint $table) {
            // Index for filtering by type (common query pattern)
            $table->index('type');

            // Index for filtering by status (common query pattern)
            $table->index('status');

            // Composite index for user_id + created_at (most common query: user's transactions ordered by date)
            $table->index(['user_id', 'created_at']);

            // Composite index for type + status (filtering completed transactions by type)
            $table->index(['type', 'status']);

            // Index for created_at to support date range queries
            $table->index('created_at');
        });

        Schema::table('platform_revenues', function (Blueprint $table) {
            // Index for filtering by source
            $table->index('source');

            // Index for filtering by quiz_id
            $table->index('quiz_id');

            // Index for filtering by course_id
            $table->index('course_id');

            // Index for filtering by buyer_id
            $table->index('buyer_id');

            // Index for created_at to support date range queries
            $table->index('created_at');

            // Composite index for source + created_at (admin revenue breakdown)
            $table->index(['source', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropIndex(['status']);
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['type', 'status']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('platform_revenues', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropIndex(['quiz_id']);
            $table->dropIndex(['course_id']);
            $table->dropIndex(['buyer_id']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['source', 'created_at']);
        });
    }
};
