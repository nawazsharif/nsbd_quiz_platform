<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Quiz settings
            'paid_quiz_approval_amount_cents' => 500,
            'platform_commission_percent' => 20,
            // Course settings
            'course_approval_fee_cents' => 500,
            'course_platform_commission_percent' => 25,
        ];

        foreach ($defaults as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}

