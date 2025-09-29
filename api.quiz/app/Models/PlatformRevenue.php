<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformRevenue extends Model
{
    protected $fillable = ['quiz_id', 'course_id', 'buyer_id', 'amount_cents', 'source'];
}
