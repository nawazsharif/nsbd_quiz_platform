<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\SslcommerzService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Throwable;

class SslcommerzCallbackController extends Controller
{
    public function __construct(protected SslcommerzService $sslcommerz)
    {
    }

    public function success(Request $request)
    {
        return $this->process(function () use ($request) {
            $transaction = $this->sslcommerz->handleSuccess($request->all());

            return [
                'message' => 'Recharge completed',
                'transaction_id' => $transaction->transaction_id,
            ];
        }, $request, Response::HTTP_OK, true, 'success');
    }

    public function failure(Request $request)
    {
        return $this->process(function () use ($request) {
            $transaction = $this->sslcommerz->handleFailure($request->all(), 'failed');

            return [
                'message' => 'Recharge failed',
                'transaction_id' => $transaction->transaction_id,
            ];
        }, $request, Response::HTTP_BAD_REQUEST, true, 'failure');
    }

    public function cancel(Request $request)
    {
        return $this->process(function () use ($request) {
            $transaction = $this->sslcommerz->handleFailure($request->all(), 'cancelled');

            return [
                'message' => 'Recharge cancelled',
                'transaction_id' => $transaction->transaction_id,
            ];
        }, $request, Response::HTTP_OK, true, 'cancel');
    }

    public function ipn(Request $request)
    {
        return $this->process(function () use ($request) {
            $payload = $request->all();
            $status = strtoupper($payload['status'] ?? '');

            if (in_array($status, ['VALID', 'VALIDATED', 'SUCCESS'], true)) {
                $transaction = $this->sslcommerz->handleSuccess($payload);
            } else {
                $transaction = $this->sslcommerz->handleFailure($payload, 'failed');
            }

            return [
                'message' => 'IPN processed',
                'transaction_id' => $transaction->transaction_id,
            ];
        }, $request, Response::HTTP_OK, false, 'ipn');
    }

    protected function process(callable $callback, Request $request, int $statusCode, bool $allowRedirect = true, ?string $context = null): SymfonyResponse
    {
        $config = $this->sslcommerzConfig();

        try {
            $result = $callback();

            $redirect = $allowRedirect ? $this->resolveRedirectUrl($request, $statusCode, $result, $context, $config) : null;
            if ($redirect) {
                return redirect()->away($redirect);
            }

            if ($view = $this->resolveViewName($context)) {
                return response()->view($view, $this->buildViewData($request, $result, $context, $config), $statusCode);
            }

            return response()->json($result, $statusCode);
        } catch (Throwable $e) {
            $payload = ['message' => $e->getMessage()];
            $redirect = $allowRedirect ? $this->resolveRedirectUrl($request, Response::HTTP_BAD_REQUEST, $payload, $context, $config) : null;
            if ($redirect) {
                return redirect()->away($redirect);
            }

            if ($view = $this->resolveViewName($context)) {
                return response()->view($view, $this->buildViewData($request, $payload, 'failure', $config), Response::HTTP_BAD_REQUEST);
            }

            return response()->json($payload, Response::HTTP_BAD_REQUEST);
        }
    }

    protected function resolveRedirectUrl(Request $request, int $statusCode, ?array $result = null, ?string $context = null, ?array $config = null): ?string
    {
        $config ??= $this->sslcommerzConfig();
        $tranId = $request->input('tran_id') ?? ($result['transaction_id'] ?? null);
        $params = array_filter([
            'transaction_id' => $tranId,
            'provider' => 'sslcommerz',
        ]);

        $statusValue = strtolower((string) $request->input('status'));
        $statusSlug = match (true) {
            $context === 'cancel' => 'cancelled',
            $context === 'failure' => 'failed',
            $context === 'success' => 'success',
            $statusValue === 'failed' => 'failed',
            $statusValue === 'cancelled' => 'cancelled',
            $statusCode === Response::HTTP_BAD_REQUEST => 'failed',
            default => 'success',
        };

        $messageValue = $result['message']
            ?? $request->input('failedreason')
            ?? $request->input('message')
            ?? $request->input('error');

        if (!empty($config['callback_url'])) {
            return $this->buildRedirectUrl($config['callback_url'], array_merge($params, array_filter([
                'status' => $statusSlug,
                'message' => $statusSlug === 'failed' ? $messageValue : null,
            ])));
        }

        if ($context === 'success' && !empty($config['success_redirect'])) {
            return $this->buildRedirectUrl($config['success_redirect'], array_merge($params, [
                'status' => 'success',
            ]));
        }

        if ($context === 'cancel' && !empty($config['cancel_redirect'])) {
            return $this->buildRedirectUrl($config['cancel_redirect'], array_merge($params, [
                'status' => 'cancelled',
            ]));
        }

        if ($context === 'failure' && !empty($config['fail_redirect'])) {
            return $this->buildRedirectUrl($config['fail_redirect'], array_merge($params, array_filter([
                'status' => 'failed',
                'message' => $messageValue,
            ])));
        }

        if ($statusSlug === 'failed' && !empty($config['fail_redirect'])) {
            return $this->buildRedirectUrl($config['fail_redirect'], array_merge($params, array_filter([
                'status' => 'failed',
                'message' => $messageValue,
            ])));
        }

        if ($statusSlug === 'cancelled' && !empty($config['cancel_redirect'])) {
            return $this->buildRedirectUrl($config['cancel_redirect'], array_merge($params, [
                'status' => 'cancelled',
            ]));
        }

        if ($statusSlug === 'success' && !empty($config['success_redirect'])) {
            return $this->buildRedirectUrl($config['success_redirect'], array_merge($params, [
                'status' => 'success',
            ]));
        }

        return null;
    }

    protected function sslcommerzConfig(): array
    {
        try {
            return $this->sslcommerz->config();
        } catch (Throwable) {
            return [];
        }
    }

    protected function resolveViewName(?string $context): ?string
    {
        if (!$context || $context === 'ipn') {
            return null;
        }

        return 'payments.sslcommerz.result';
    }

    protected function buildViewData(Request $request, array $result, ?string $context, array $config): array
    {
        $context ??= 'success';
        $status = match ($context) {
            'success' => 'success',
            'cancel' => 'cancelled',
            'failure' => 'failed',
            default => strtolower((string) $request->input('status', 'success')),
        };

        $tranId = $request->input('tran_id') ?? ($result['transaction_id'] ?? null);
        $message = $result['message'] ?? $this->defaultMessage($status);

        $returnUrl = $this->resolveReturnUrl($status, $config);

        return [
            'status' => $status,
            'status_label' => Str::ucfirst($status),
            'message' => $message,
            'transaction_id' => $tranId,
            'provider' => 'SSLCommerz',
            'return_url' => $returnUrl,
            'wallet_url' => $this->resolveWalletUrl($config, $returnUrl),
        ];
    }

    protected function resolveReturnUrl(string $status, array $config): ?string
    {
        if (!empty($config['callback_url'])) {
            return $config['callback_url'];
        }

        $map = [
            'success' => $config['success_redirect'] ?? null,
            'failed' => $config['fail_redirect'] ?? null,
            'cancelled' => $config['cancel_redirect'] ?? null,
        ];

        $candidate = $map[$status] ?? null;
        if ($candidate) {
            return $candidate;
        }

        return $this->resolveWalletUrl($config);
    }

    protected function resolveWalletUrl(array $config, ?string $returnUrl = null): ?string
    {
        if (!empty($config['frontend_url'])) {
            return rtrim($config['frontend_url'], '/') . '/wallet';
        }

        if ($returnUrl) {
            $parsed = parse_url($returnUrl);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                $base = sprintf('%s://%s%s', $parsed['scheme'], $parsed['host'], $port);

                return rtrim($base, '/') . '/wallet';
            }
        }

        $stateful = config('sanctum.stateful', []);
        if (is_string($stateful)) {
            $stateful = explode(',', $stateful);
        }

        $explicit = [];
        $withPort = [];
        $plain = [];

        foreach ($stateful as $domain) {
            $domain = trim((string) $domain);
            if ($domain === '') {
                continue;
            }

            if (str_contains($domain, '://')) {
                $explicit[] = rtrim($domain, '/') . '/wallet';
                continue;
            }

            [$hostOnly] = explode(':', $domain);
            $scheme = str_contains($hostOnly, 'localhost') || filter_var($hostOnly, FILTER_VALIDATE_IP)
                ? 'http'
                : 'https';

            $formatted = sprintf('%s://%s', $scheme, rtrim($domain, '/')) . '/wallet';

            if (str_contains($domain, ':')) {
                $withPort[] = $formatted;
            } else {
                $plain[] = $formatted;
            }
        }

        foreach ([$explicit, $withPort, $plain] as $bucket) {
            if (!empty($bucket)) {
                return $bucket[0];
            }
        }

        $fallback = $this->firstFilled([
            env('FRONTEND_APP_URL'),
            env('FRONTEND_URL'),
            env('APP_URL'),
        ]);

        return $fallback ? rtrim($fallback, '/') . '/wallet' : null;
    }

    protected function defaultMessage(string $status): string
    {
        return match ($status) {
            'success' => 'Recharge completed successfully.',
            'cancelled' => 'The recharge was cancelled.',
            'failed' => 'The recharge could not be completed.',
            default => 'Payment status updated.',
        };
    }

    protected function firstFilled(array $values)
    {
        foreach ($values as $value) {
            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    protected function buildRedirectUrl(?string $baseUrl, array $params): ?string
    {
        if (!$baseUrl) {
            return null;
        }

        $filtered = array_filter($params, static fn ($value) => $value !== null && $value !== '');
        if (empty($filtered)) {
            return $baseUrl;
        }

        $separator = str_contains($baseUrl, '?') ? '&' : '?';

        return $baseUrl . $separator . http_build_query($filtered);
    }
}
