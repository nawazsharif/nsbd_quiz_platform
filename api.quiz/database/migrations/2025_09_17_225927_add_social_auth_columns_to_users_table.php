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
        // Add columns only if they don't already exist (another migration also adds these)
        if (!Schema::hasColumn('users', 'provider')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('provider')->nullable()->after('password');
            });
        }
        if (!Schema::hasColumn('users', 'provider_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('provider_id')->nullable()->after('provider');
            });
        }
        if (!Schema::hasColumn('users', 'avatar')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('avatar')->nullable()->after('provider_id');
            });
        }

        // Ensure composite index exists; if it already exists, ignore error
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index(['provider', 'provider_id']);
            });
        } catch (\Throwable $e) {
            // no-op if index already exists
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Best-effort rollback: drop index if present, then columns if present
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex(['provider', 'provider_id']);
            });
        } catch (\Throwable $e) {}

        foreach (['avatar', 'provider_id', 'provider'] as $col) {
            if (Schema::hasColumn('users', $col)) {
                Schema::table('users', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            }
        }
    }
};
