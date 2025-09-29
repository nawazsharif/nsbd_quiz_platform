<?php

namespace Database\Seeders;

use App\Models\PaymentSetting;
use Illuminate\Database\Seeder;

class PaymentSettingSeeder extends Seeder
{
    public function run(): void
    {
        $providers = [
            ['provider' => 'bkash', 'enabled' => false, 'config' => []],
            ['provider' => 'sslcommerz', 'enabled' => false, 'config' => []],
        ];

        foreach ($providers as $p) {
            PaymentSetting::updateOrCreate(['provider' => $p['provider']], [
                'enabled' => $p['enabled'],
                'config' => $p['config'],
            ]);
        }
    }
}

