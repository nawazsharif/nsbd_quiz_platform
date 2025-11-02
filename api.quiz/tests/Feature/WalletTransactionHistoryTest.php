<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WalletTransactionHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_own_transactions(): void
    {
        $user = User::factory()->create();
        WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 2500,
            'status' => 'completed',
            'meta' => ['provider' => 'bkash', 'direction' => 'credit'],
        ]);
        WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'quiz_purchase',
            'amount_cents' => 1200,
            'status' => 'completed',
            'meta' => ['quiz_id' => 1, 'direction' => 'debit'],
        ]);

        $other = User::factory()->create();
        WalletTransaction::create([
            'user_id' => $other->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 5000,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/wallet/transactions')
            ->assertOk()
            ->assertJsonFragment(['type' => 'recharge', 'amount_cents' => 2500])
            ->assertJsonFragment(['type' => 'quiz_purchase', 'amount_cents' => 1200])
            ->assertJsonMissing(['amount_cents' => 5000]);
    }

    public function test_admin_can_filter_transactions_by_user(): void
    {
        Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $buyer = User::factory()->create();
        WalletTransaction::create([
            'user_id' => $buyer->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'course_purchase',
            'amount_cents' => 3000,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/wallet/transactions?user_id=' . $buyer->id)
            ->assertOk()
            ->assertJsonFragment(['type' => 'course_purchase', 'amount_cents' => 3000]);
    }
}

