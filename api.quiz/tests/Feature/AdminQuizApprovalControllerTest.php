<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\Setting;
use App\Models\User;
use App\Models\WalletAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminQuizApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_admin_can_approve_paid_quiz_with_sufficient_balance()
    {
        $author = User::factory()->create();
        $quiz = Quiz::factory()->for($author, 'owner')->create(['is_paid' => true, 'status' => 'draft']);
        WalletAccount::create(['user_id' => $author->id, 'balance_cents' => 1000]);
        Setting::create(['key' => 'paid_quiz_approval_amount_cents', 'value' => 500]);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/quizzes/{$quiz->id}/approve")
            ->assertStatus(200)
            ->assertJson(['status' => 'published']);

        $this->assertDatabaseHas('wallet_accounts', ['user_id' => $author->id, 'balance_cents' => 500]);
    }

    public function test_approval_fails_when_insufficient_balance()
    {
        $author = User::factory()->create();
        $quiz = Quiz::factory()->for($author, 'owner')->create(['is_paid' => true, 'status' => 'draft']);
        WalletAccount::create(['user_id' => $author->id, 'balance_cents' => 100]);
        Setting::create(['key' => 'paid_quiz_approval_amount_cents', 'value' => 500]);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/quizzes/{$quiz->id}/approve")
            ->assertStatus(422);

        $this->assertDatabaseHas('quizzes', ['id' => $quiz->id, 'status' => 'draft']);
    }

    public function test_admin_can_reject_quiz()
    {
        $author = User::factory()->create();
        $quiz = Quiz::factory()->for($author, 'owner')->create(['status' => 'draft']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/quizzes/{$quiz->id}/reject")
            ->assertStatus(200)
            ->assertJson(['status' => 'rejected']);
    }
}
