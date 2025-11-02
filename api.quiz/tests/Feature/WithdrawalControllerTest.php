<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\User;
use App\Models\WalletAccount;
use Illuminate\Support\Facades\Http;
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

        PaymentSetting::create([
            'provider' => 'sslcommerz',
            'enabled' => true,
            'config' => [
                'store_id' => 'test_store',
                'store_password' => 'test_pass',
                'sandbox' => true,
                'disbursement' => [
                    'url' => 'https://sandbox.sslcommerz.com/debitapi/initiate',
                    'username' => 'dps_user',
                    'password' => 'dps_pass',
                ],
            ],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/*' => Http::response([
                'status' => 'SUCCESS',
                'message' => 'accepted',
                'reference' => 'DPS123',
            ], 200),
        ]);

        $wr = $this->postJson('/api/wallet/withdrawals', [
            'amount_cents' => 1000,
            'provider' => 'sslcommerz',
            'meta' => [
                'account_number' => '123456',
                'account_name' => 'Test User',
            ],
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
