<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WalletControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_balance_and_recharge_flow()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/wallet/balance')
            ->assertStatus(200)
            ->assertJson(['user_id' => $user->id, 'balance_cents' => 0]);

        $tx = $this->postJson('/api/wallet/recharge', [
            'amount_cents' => 1000,
            'provider' => 'bkash',
        ])->assertStatus(201)->json();

        $this->postJson('/api/wallet/recharge/confirm', [
            'transaction_id' => $tx['transaction_id'],
            'status' => 'completed'
        ])->assertStatus(200);

        $this->getJson('/api/wallet/balance')
            ->assertStatus(200)
            ->assertJson(['balance_cents' => 1000]);
    }
}
