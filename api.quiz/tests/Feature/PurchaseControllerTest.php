<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\Setting;
use App\Models\User;
use App\Models\WalletAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PurchaseControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_quiz_enrolls_user()
    {
        $author = User::factory()->create();
        $quiz = Quiz::factory()->for($author, 'owner')->create(['is_paid' => false]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/quizzes/{$quiz->id}/enroll")
            ->assertStatus(200)
            ->assertJson(['status' => 'enrolled']);

        $this->assertDatabaseHas('quiz_enrollments', ['quiz_id' => $quiz->id, 'user_id' => $user->id]);
    }

    public function test_paid_quiz_distributes_commission_and_enrolls()
    {
        $author = User::factory()->create();
        $quiz = Quiz::factory()->for($author, 'owner')->create(['is_paid' => true, 'price_cents' => 1000]);
        Setting::create(['key' => 'platform_commission_percent', 'value' => 10]);
        $buyer = User::factory()->create();
        Sanctum::actingAs($buyer);

        $this->postJson("/api/quizzes/{$quiz->id}/enroll")
            ->assertStatus(200)
            ->assertJson(['status' => 'purchased', 'author_credited_cents' => 900, 'platform_revenue_cents' => 100]);

        $this->assertDatabaseHas('wallet_accounts', ['user_id' => $author->id, 'balance_cents' => 900]);
        $this->assertDatabaseHas('platform_revenues', ['quiz_id' => $quiz->id, 'amount_cents' => 100]);
        $this->assertDatabaseHas('quiz_enrollments', ['quiz_id' => $quiz->id, 'user_id' => $buyer->id]);
    }
}
