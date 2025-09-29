<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WalletAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WithdrawalControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_user_can_request_and_admin_can_approve_withdrawal()
    {
        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 2000]);
        Sanctum::actingAs($user);

        $wr = $this->postJson('/api/wallet/withdrawals', [
            'amount_cents' => 1000,
            'provider' => 'sslcommerz',
        ])->assertStatus(201)->json();

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/withdrawals')->assertStatus(200);
        $this->postJson("/api/admin/withdrawals/{$wr['id']}/approve")
            ->assertStatus(200)
            ->assertJson(['status' => 'approved']);

        $this->assertDatabaseHas('wallet_accounts', ['user_id' => $user->id, 'balance_cents' => 1000]);
    }
}
