<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = [
        'user_id', 'transaction_id', 'type', 'amount_cents', 'status', 'meta'
    ];

    protected $casts = [
        'meta' => 'array',
    ];
}
