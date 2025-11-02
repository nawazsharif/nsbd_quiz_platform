<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\User;
use App\Models\WalletAccount;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SslcommerzPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        PaymentSetting::create([
            'provider' => 'sslcommerz',
            'enabled' => true,
            'config' => [
                'store_id' => 'test_store',
                'store_password' => 'test_pass',
                'sandbox' => true,
                'success_url' => 'http://localhost/api/payments/sslcommerz/success',
                'fail_url' => 'http://localhost/api/payments/sslcommerz/fail',
                'cancel_url' => 'http://localhost/api/payments/sslcommerz/cancel',
                'frontend_url' => 'http://quiz.test',
            ],
        ]);
    }

    public function test_initiate_sslcommerz_recharge_returns_gateway_url(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        Http::fake([
            'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' => Http::response([
                'status' => 'SUCCESS',
                'GatewayPageURL' => 'https://sandbox.sslcommerz.com/gateway/abc',
                'sessionkey' => 'SESSION123',
            ], 200),
        ]);

        $payload = [
            'amount_cents' => 1500,
            'provider' => 'sslcommerz',
        ];

        $response = $this->postJson('/api/wallet/recharge', $payload)
            ->assertStatus(201)
            ->json();

        $this->assertArrayHasKey('gateway_url', $response);
        $this->assertEquals('https://sandbox.sslcommerz.com/gateway/abc', $response['gateway_url']);

        $transaction = WalletTransaction::where('transaction_id', $response['transaction_id'])->first();
        $this->assertNotNull($transaction);
        $this->assertEquals('pending', $transaction->status);
        $this->assertEquals('sslcommerz', $transaction->meta['provider']);
        $this->assertEquals('https://sandbox.sslcommerz.com/gateway/abc', $transaction->meta['gateway_url']);
    }

    public function test_sslcommerz_success_callback_completes_transaction(): void
    {
        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 0]);

        $transaction = WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 2000,
            'status' => 'pending',
            'meta' => ['provider' => 'sslcommerz'],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'amount' => 20.00,
                'currency' => 'BDT',
                'tran_id' => $transaction->transaction_id,
            ], 200),
        ]);

        $expected = sprintf(
            'http://quiz.test/wallet?transaction_id=%s&provider=sslcommerz&status=success',
            $transaction->transaction_id
        );

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $transaction->transaction_id,
            'val_id' => 'VAL123',
            'amount' => 20,
        ])->assertRedirect($expected);

        $transaction->refresh();
        $wallet = WalletAccount::firstWhere('user_id', $user->id);

        $this->assertEquals('completed', $transaction->status);
        $this->assertEquals(2000, $wallet->balance_cents);
    }

    public function test_sslcommerz_init_uses_environment_and_alt_keys(): void
    {
        $setting = PaymentSetting::firstWhere('provider', 'sslcommerz');
        $setting->config = [
            'environment' => 'sandbox',
            'storeId' => 'alt_store',
            'storePassword' => 'alt_pass',
        ];
        $setting->save();

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        Http::fake([
            'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' => Http::response([
                'status' => 'SUCCESS',
                'GatewayPageURL' => 'https://sandbox.sslcommerz.com/gateway/alt',
                'sessionkey' => 'SESSIONALT',
            ], 200),
        ]);

        $payload = [
            'amount_cents' => 1500,
            'provider' => 'sslcommerz',
        ];

        $response = $this->postJson('/api/wallet/recharge', $payload)
            ->assertStatus(201)
            ->json();

        $this->assertEquals('https://sandbox.sslcommerz.com/gateway/alt', $response['gateway_url']);
    }

    public function test_success_callback_redirects_to_wallet_with_query_params(): void
    {
        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 0]);

        $transaction = WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 2500,
            'status' => 'pending',
            'meta' => ['provider' => 'sslcommerz'],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'amount' => 25.00,
                'currency' => 'BDT',
                'tran_id' => $transaction->transaction_id,
            ], 200),
        ]);

        $expected = sprintf(
            'http://quiz.test/wallet?transaction_id=%s&provider=sslcommerz&status=success',
            $transaction->transaction_id
        );

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $transaction->transaction_id,
            'val_id' => 'VAL456',
            'amount' => 25,
        ])->assertRedirect($expected);
    }

    public function test_success_callback_renders_view_when_no_redirect_configured(): void
    {
        $setting = PaymentSetting::firstWhere('provider', 'sslcommerz');
        $setting->config = [
            'store_id' => 'test_store',
            'store_password' => 'test_pass',
            'sandbox' => true,
        ];
        $setting->save();

        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 0]);

        $transaction = WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 3000,
            'status' => 'pending',
            'meta' => ['provider' => 'sslcommerz'],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'amount' => 30.00,
                'currency' => 'BDT',
                'tran_id' => $transaction->transaction_id,
            ], 200),
        ]);

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $transaction->transaction_id,
            'val_id' => 'VAL789',
            'amount' => 30,
        ])->assertStatus(200)
            ->assertSee('Recharge completed', false)
            ->assertSee($transaction->transaction_id, false);
    }

    public function test_success_callback_prefers_configured_callback_url(): void
    {
        $setting = PaymentSetting::firstWhere('provider', 'sslcommerz');
        $setting->config = [
            'store_id' => 'test_store',
            'store_password' => 'test_pass',
            'sandbox' => true,
            'callback_url' => 'http://frontend.test/payment-result',
        ];
        $setting->save();

        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 0]);

        $transaction = WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 3200,
            'status' => 'pending',
            'meta' => ['provider' => 'sslcommerz'],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'amount' => 32.00,
                'currency' => 'BDT',
                'tran_id' => $transaction->transaction_id,
            ], 200),
        ]);

        $expected = sprintf(
            'http://frontend.test/payment-result?transaction_id=%s&provider=sslcommerz&status=success',
            $transaction->transaction_id
        );

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $transaction->transaction_id,
            'val_id' => 'VAL999',
            'amount' => 32,
        ])->assertRedirect($expected);
    }

    public function test_result_view_wallet_link_uses_stateful_domain_when_frontend_missing(): void
    {
        config()->set('sanctum.stateful', ['localhost:3000']);

        $setting = PaymentSetting::firstWhere('provider', 'sslcommerz');
        $setting->config = [
            'store_id' => 'test_store',
            'store_password' => 'test_pass',
            'sandbox' => true,
        ];
        $setting->save();

        $user = User::factory()->create();
        WalletAccount::create(['user_id' => $user->id, 'balance_cents' => 0]);

        $transaction = WalletTransaction::create([
            'user_id' => $user->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => 2500,
            'status' => 'pending',
            'meta' => ['provider' => 'sslcommerz'],
        ]);

        Http::fake([
            'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'amount' => 25.00,
                'currency' => 'BDT',
                'tran_id' => $transaction->transaction_id,
            ], 200),
        ]);

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $transaction->transaction_id,
            'val_id' => 'VAL111',
            'amount' => 25,
        ])->assertStatus(200)
            ->assertSee('href="http://localhost:3000/wallet"', false);
    }
}
