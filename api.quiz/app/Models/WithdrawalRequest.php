<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WithdrawalRequest extends Model
{
    protected $fillable = ['user_id', 'amount_cents', 'status', 'provider', 'meta', 'approved_at', 'approved_by'];

    protected $casts = [
        'meta' => 'array',
        'approved_at' => 'datetime',
    ];
}
