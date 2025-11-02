<?php

namespace App\Services\Payments;

use App\Models\PaymentSetting;
use App\Models\User;
use App\Models\WalletAccount;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SslcommerzService
{
    public function initiatePayment(WalletTransaction $transaction, User $user): array
    {
        $config = $this->getConfig();

        $payload = [
            'store_id' => $config['store_id'] ?? null,
            'store_passwd' => $config['store_password'] ?? null,
            'total_amount' => round($transaction->amount_cents / 100, 2),
            'currency' => $config['currency'] ?? 'BDT',
            'tran_id' => $transaction->transaction_id,
            'success_url' => $config['success_url'] ?? route('payments.sslcommerz.success'),
            'fail_url' => $config['fail_url'] ?? route('payments.sslcommerz.fail'),
            'cancel_url' => $config['cancel_url'] ?? route('payments.sslcommerz.cancel'),
            'ipn_url' => $config['ipn_url'] ?? route('payments.sslcommerz.ipn'),
            'cus_name' => $user->name ?? 'Customer',
            'cus_email' => $user->email ?? 'no-email@example.com',
            'cus_add1' => $config['default_address'] ?? 'Dhaka',
            'cus_city' => $config['default_city'] ?? 'Dhaka',
            'cus_country' => $config['default_country'] ?? 'Bangladesh',
            'cus_phone' => $config['default_phone'] ?? '01700000000',
            'shipping_method' => 'NO',
            'product_name' => $config['product_name'] ?? 'Wallet Recharge',
            'product_category' => $config['product_category'] ?? 'Wallet',
            'product_profile' => $config['product_profile'] ?? 'general',
        ];

        if (!$payload['store_id'] || !$payload['store_passwd']) {
            throw new RuntimeException('SSLCommerz credentials are not configured.');
        }

        $response = Http::asForm()->post($this->resolveInitUrl($config), $payload);
        if (!$response->ok()) {
            throw new RuntimeException('Failed to initialize SSLCommerz payment session.');
        }

        $data = $response->json();
        if (!is_array($data) || strtoupper($data['status'] ?? '') !== 'SUCCESS' || empty($data['GatewayPageURL'])) {
            throw new RuntimeException($data['failedreason'] ?? 'SSLCommerz rejected the transaction.');
        }

        $transaction->meta = array_merge($transaction->meta ?? [], [
            'provider' => 'sslcommerz',
            'session_key' => $data['sessionkey'] ?? null,
            'gateway_url' => $data['GatewayPageURL'],
            'sslcommerz' => [
                'init_payload' => $payload,
                'init_response' => $data,
            ],
        ]);
        $transaction->save();

        return [
            'transaction_id' => $transaction->transaction_id,
            'gateway_url' => $data['GatewayPageURL'],
            'session_key' => $data['sessionkey'] ?? null,
        ];
    }

    public function handleSuccess(array $payload): WalletTransaction
    {
        $transaction = $this->locateTransaction($payload['tran_id'] ?? null);
        if ($transaction->status !== 'pending') {
            return $transaction;
        }

        $validation = [];
        if (!empty($payload['val_id'])) {
            $validation = $this->validatePayment($payload['val_id']);
        }

        $amount = (int) round(($validation['amount'] ?? ($payload['amount'] ?? 0)) * 100);

        if ($amount <= 0) {
            throw new RuntimeException('Unable to verify SSLCommerz payment amount.');
        }

        if ($amount !== $transaction->amount_cents) {
            throw new RuntimeException('Transaction amount mismatch during SSLCommerz validation.');
        }

        $transaction->status = 'completed';
        $transaction->meta = $this->mergeMeta($transaction->meta, [
            'sslcommerz' => [
                'success_payload' => $payload,
                'validation' => $validation,
            ],
        ]);
        $transaction->save();

        $wallet = WalletAccount::firstOrCreate(['user_id' => $transaction->user_id]);
        $wallet->balance_cents += $transaction->amount_cents;
        $wallet->save();

        return $transaction->fresh();
    }

    public function handleFailure(array $payload, string $status = 'failed'): WalletTransaction
    {
        $transaction = $this->locateTransaction($payload['tran_id'] ?? null);
        if ($transaction->status !== 'pending') {
            return $transaction;
        }

        $transaction->status = $status;
        $transaction->meta = $this->mergeMeta($transaction->meta, [
            'sslcommerz' => [
                'failure_payload' => $payload,
            ],
        ]);
        $transaction->save();

        return $transaction->fresh();
    }

    public function validatePayment(?string $valId): array
    {
        if (!$valId) {
            throw new RuntimeException('Missing SSLCommerz validation identifier.');
        }

        $config = $this->getConfig();
        $params = [
            'val_id' => $valId,
            'store_id' => $config['store_id'] ?? null,
            'store_passwd' => $config['store_password'] ?? null,
            'format' => 'json',
        ];

        $response = Http::get($this->resolveValidationUrl($config), $params);
        if (!$response->ok()) {
            throw new RuntimeException('Failed to validate SSLCommerz transaction.');
        }

        $data = $response->json();
        if (!is_array($data) || !in_array(strtoupper($data['status'] ?? ''), ['VALID', 'VALIDATED', 'SUCCESS'], true)) {
            throw new RuntimeException('SSLCommerz validation returned an invalid status.');
        }

        return $data;
    }

    public function initiateDisbursement(WithdrawalRequest $withdrawal): array
    {
        $config = $this->getConfig();
        $disbursement = $config['disbursement'] ?? [];

        $endpoint = $disbursement['url'] ?? $this->resolveDisbursementUrl($config);
        $credentials = [
            'username' => $disbursement['username'] ?? null,
            'password' => $disbursement['password'] ?? null,
        ];

        if (!$endpoint || !$credentials['username'] || !$credentials['password']) {
            throw new RuntimeException('SSLCommerz disbursement credentials are not configured.');
        }

        $meta = $withdrawal->meta ?? [];
        $payload = [
            'username' => $credentials['username'],
            'password' => $credentials['password'],
            'tran_id' => $withdrawal->id.'-'.$withdrawal->created_at?->timestamp,
            'amount' => round($withdrawal->amount_cents / 100, 2),
            'receiver_account_no' => Arr::get($meta, 'account_number'),
            'receiver_name' => Arr::get($meta, 'account_name'),
            'receiver_mobile' => Arr::get($meta, 'account_mobile'),
            'purpose' => Arr::get($meta, 'purpose', 'Creator Withdrawal'),
        ];

        if (!$payload['receiver_account_no'] || !$payload['receiver_name']) {
            throw new RuntimeException('Missing withdrawal account information for SSLCommerz disbursement.');
        }

        $response = Http::asForm()->post($endpoint, $payload);
        if (!$response->ok()) {
            throw new RuntimeException('Failed to initiate SSLCommerz disbursement.');
        }

        $data = $response->json();
        if (!is_array($data) || !in_array(strtoupper($data['status'] ?? ''), ['SUCCESS', 'PROCESSING'], true)) {
            Log::warning('SSLCommerz disbursement failed', ['payload' => $payload, 'response' => $data]);
            throw new RuntimeException($data['message'] ?? 'SSLCommerz disbursement rejected.');
        }

        return $data;
    }

    protected function mergeMeta(?array $original, array $extra): array
    {
        $original ??= [];
        $merged = array_merge($original, $extra);
        if (isset($original['sslcommerz'], $extra['sslcommerz'])) {
            $merged['sslcommerz'] = array_merge($original['sslcommerz'], $extra['sslcommerz']);
        }

        return $merged;
    }

    protected function locateTransaction(?string $transactionId): WalletTransaction
    {
        if (!$transactionId) {
            throw new RuntimeException('Missing SSLCommerz transaction identifier.');
        }

        $transaction = WalletTransaction::where('transaction_id', $transactionId)->first();
        if (!$transaction) {
            throw new RuntimeException('Wallet transaction not found for SSLCommerz callback.');
        }

        return $transaction;
    }

    protected function getConfig(): array
    {
        $setting = PaymentSetting::where('provider', 'sslcommerz')->first();

        if (!$setting || !$setting->enabled) {
            throw new RuntimeException('SSLCommerz payment provider is disabled.');
        }

        return $this->normalizeConfig($setting->config ?? []);
    }

    protected function normalizeConfig(?array $config): array
    {
        $config = $config ?? [];

        $storeId = $this->firstFilled([
            $config['store_id'] ?? null,
            $config['storeId'] ?? null,
            $config['storeID'] ?? null,
            env('SSLCZ_STORE_ID'),
        ]);

        if ($storeId !== null) {
            $config['store_id'] = $storeId;
        }

        $storePassword = $this->firstFilled([
            $config['store_password'] ?? null,
            $config['store_passwd'] ?? null,
            $config['storePasswd'] ?? null,
            $config['storePassword'] ?? null,
            $config['password'] ?? null,
            env('SSLCZ_STORE_PASSWORD'),
        ]);

        if ($storePassword !== null) {
            $config['store_password'] = $storePassword;
        }

        $config['sandbox'] = $this->determineSandboxValue($config);

        $frontendUrl = $this->firstFilled([
            $config['frontend_url'] ?? null,
            $config['frontendUrl'] ?? null,
            $config['redirect_base'] ?? null,
            env('FRONTEND_APP_URL'),
            env('FRONTEND_URL'),
            env('APP_FRONTEND_URL'),
        ]);

        if ($frontendUrl !== null) {
            $config['frontend_url'] = rtrim($frontendUrl, '/');
            $frontendUrl = $config['frontend_url'];
        }

        $callbackUrl = $this->firstFilled([
            $config['callback_url'] ?? null,
            $config['callbackUrl'] ?? null,
            env('SSLCZ_CALLBACK_URL'),
        ]);

        if ($callbackUrl !== null) {
            $config['callback_url'] = rtrim($callbackUrl, '/');
        }

        $successRedirect = $this->firstFilled([
            $config['success_redirect'] ?? null,
            $config['successRedirect'] ?? null,
            env('SSLCZ_SUCCESS_REDIRECT'),
        ]);

        $failRedirect = $this->firstFilled([
            $config['fail_redirect'] ?? null,
            $config['failRedirect'] ?? null,
            env('SSLCZ_FAIL_REDIRECT'),
        ]);

        $cancelRedirect = $this->firstFilled([
            $config['cancel_redirect'] ?? null,
            $config['cancelRedirect'] ?? null,
            env('SSLCZ_CANCEL_REDIRECT'),
        ]);

        $config['success_redirect'] = $this->normalizeRedirectUrl(
            $successRedirect,
            $config['frontend_url'] ?? null,
            $frontendUrl ? '/wallet' : null,
        );

        $config['fail_redirect'] = $this->normalizeRedirectUrl(
            $failRedirect,
            $config['frontend_url'] ?? null,
            $frontendUrl ? '/wallet' : null,
        );

        $config['cancel_redirect'] = $this->normalizeRedirectUrl(
            $cancelRedirect,
            $config['frontend_url'] ?? null,
            $frontendUrl ? '/wallet' : null,
        );

        return $config;
    }

    protected function determineSandboxValue(array $config): bool
    {
        $flagKeys = ['sandbox', 'sandbox_mode', 'sandboxMode', 'is_sandbox', 'use_sandbox'];
        foreach ($flagKeys as $key) {
            if (array_key_exists($key, $config)) {
                return $this->toBool($config[$key]);
            }
        }

        $environmentKeys = ['environment', 'env', 'mode'];
        foreach ($environmentKeys as $key) {
            if (!empty($config[$key]) && is_string($config[$key])) {
                $value = strtolower(trim((string) $config[$key]));
                return in_array($value, ['sandbox', 'test', 'testing', 'development', 'dev', 'qa'], true);
            }
        }

        return $this->toBool(env('SSLCZ_SANDBOX_MODE', true));
    }

    protected function firstFilled(array $values)
    {
        foreach ($values as $value) {
            if (is_string($value)) {
                if ($value !== '') {
                    return $value;
                }
            } elseif ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    protected function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (bool) $value;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['1', 'true', 'on', 'yes'], true)) {
                return true;
            }
            if (in_array($normalized, ['0', 'false', 'off', 'no', ''], true)) {
                return false;
            }
        }

        return (bool) $value;
    }

    protected function normalizeRedirectUrl(?string $url, ?string $baseUrl, ?string $defaultPath = null): ?string
    {
        $target = $url ?? $defaultPath;
        if (!is_string($target) || $target === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $target) === 1) {
            return $target;
        }

        if (!$baseUrl) {
            return null;
        }

        return rtrim($baseUrl, '/') . '/' . ltrim($target, '/');
    }

    protected function resolveInitUrl(array $config): string
    {
        if (!empty($config['init_url'])) {
            return $config['init_url'];
        }

        return !empty($config['sandbox'])
            ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
    }

    protected function resolveValidationUrl(array $config): string
    {
        if (!empty($config['validation_url'])) {
            return $config['validation_url'];
        }

        return !empty($config['sandbox'])
            ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
            : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';
    }

    protected function resolveDisbursementUrl(array $config): string
    {
        if (!empty($config['disbursement']['url'])) {
            return $config['disbursement']['url'];
        }

        return !empty($config['sandbox'])
            ? 'https://sandbox.sslcommerz.com/debitapi/initiate'
            : 'https://securepay.sslcommerz.com/debitapi/initiate';
    }

    public function config(): array
    {
        return $this->getConfig();
    }
}
