<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Models\Course;
use App\Models\WalletAccount;
use App\Models\Setting;
use Illuminate\Foundation\Application;
use Illuminate\Contracts\Console\Kernel;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

// Create test data
$buyer = User::factory()->create();
$author = User::factory()->create();
$paid = Course::factory()->create(['owner_id' => $author->id, 'is_paid' => true, 'price_cents' => 2000, 'status' => 'approved']);
Setting::updateOrCreate(['key' => 'course_platform_commission_percent'], ['value' => 25]);

// Give buyer sufficient wallet balance
$buyerWallet = WalletAccount::firstOrCreate(['user_id' => $buyer->id]);
$buyerWallet->balance_cents = 5000;
$buyerWallet->save();

echo "Before purchase:\n";
echo "Buyer wallet: " . $buyerWallet->balance_cents . "\n";

$authorWallet = WalletAccount::firstOrCreate(['user_id' => $author->id]);
echo "Author wallet: " . $authorWallet->balance_cents . "\n";

// Simulate the purchase logic
$commissionPercent = (int) (Setting::where('key', 'course_platform_commission_percent')->value('value') ?? 0);
$price = (int) ($paid->price_cents ?? 0);
$platformShare = (int) floor($price * $commissionPercent / 100);
$authorShare = $price - $platformShare;

echo "\nCalculations:\n";
echo "Price: $price\n";
echo "Commission: $commissionPercent%\n";
echo "Platform share: $platformShare\n";
echo "Author share: $authorShare\n";

// Deduct from buyer
$buyerWallet->balance_cents -= $price;
$buyerWallet->save();

// Credit author
$authorWallet->balance_cents += $authorShare;
$authorWallet->save();

echo "\nAfter purchase:\n";
echo "Buyer wallet: " . $buyerWallet->balance_cents . "\n";
echo "Author wallet: " . $authorWallet->balance_cents . "\n";