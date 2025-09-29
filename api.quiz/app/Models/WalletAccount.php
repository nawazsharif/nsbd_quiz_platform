<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletAccount extends Model
{
    protected $fillable = ['user_id', 'balance_cents'];
}
