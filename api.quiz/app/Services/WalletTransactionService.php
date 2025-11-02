<?php

namespace App\Services;

use App\Models\WalletTransaction;
use Illuminate\Support\Str;

class WalletTransactionService
{
    public function record(
        int $userId,
        string $type,
        int $amountCents,
        string $status = 'completed',
        array $meta = []
    ): WalletTransaction {
        return WalletTransaction::create([
            'user_id' => $userId,
            'transaction_id' => Str::uuid()->toString(),
            'type' => $type,
            'amount_cents' => $amountCents,
            'status' => $status,
            'meta' => empty($meta) ? null : $meta,
        ]);
    }
}

