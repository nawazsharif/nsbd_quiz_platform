<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\QuizEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_free_quiz_cannot_be_reviewed()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['is_paid' => false]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/quizzes/{$quiz->id}/reviews", ['rating' => 5])
            ->assertStatus(403);
    }

    public function test_non_purchaser_cannot_review_paid_quiz()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['is_paid' => true, 'price_cents' => 1000]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/quizzes/{$quiz->id}/reviews", ['rating' => 4, 'comment' => 'Great content so far'])
            ->assertStatus(403);
    }

    public function test_purchaser_can_create_update_delete_review()
    {
        $buyer = User::factory()->create();
        $quiz = Quiz::factory()->create(['is_paid' => true, 'price_cents' => 1500]);
        QuizEnrollment::create(['quiz_id' => $quiz->id, 'user_id' => $buyer->id]);

        // Create
        $create = $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/quizzes/{$quiz->id}/reviews", ['rating' => 5, 'comment' => 'Excellent quiz with solid explanations'])
            ->assertStatus(201)
            ->json();

        $this->assertDatabaseHas('reviews', ['quiz_id' => $quiz->id, 'user_id' => $buyer->id, 'rating' => 5]);

        // Update
        $this->actingAs($buyer, 'sanctum')
            ->putJson("/api/quizzes/{$quiz->id}/reviews/{$create['id']}", ['rating' => 4, 'comment' => 'Updated comment more balanced'])
            ->assertOk();

        $this->assertDatabaseHas('reviews', ['id' => $create['id'], 'rating' => 4]);

        // Delete
        $this->actingAs($buyer, 'sanctum')
            ->deleteJson("/api/quizzes/{$quiz->id}/reviews/{$create['id']}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('reviews', ['id' => $create['id']]);
    }

    public function test_owner_cannot_review_own_quiz()
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->create(['owner_id' => $owner->id, 'is_paid' => true, 'price_cents' => 500]);
        QuizEnrollment::create(['quiz_id' => $quiz->id, 'user_id' => $owner->id]);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/quizzes/{$quiz->id}/reviews", ['rating' => 5, 'comment' => 'Self review'])
            ->assertStatus(403);
    }

    public function test_superadmin_can_hide_and_delete_any_review()
    {
        $super = User::factory()->create();
        $super->assignRole('superadmin');

        $buyer = User::factory()->create();
        $quiz = Quiz::factory()->create(['is_paid' => true, 'price_cents' => 1200]);
        QuizEnrollment::create(['quiz_id' => $quiz->id, 'user_id' => $buyer->id]);

        $res = $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/quizzes/{$quiz->id}/reviews", ['rating' => 3, 'comment' => 'Average review'])
            ->assertStatus(201)
            ->json();
        $reviewId = $res['id'] ?? ($res['data']['id'] ?? null);
        $this->assertNotNull($reviewId);

        // Hide
        $this->actingAs($super, 'sanctum')
            ->postJson("/api/reviews/{$reviewId}/hide", ['hidden' => true])
            ->assertOk();
        $this->assertDatabaseHas('reviews', ['id' => $reviewId, 'is_hidden' => true]);

        // Delete
        $this->actingAs($super, 'sanctum')
            ->deleteJson("/api/quizzes/{$quiz->id}/reviews/{$reviewId}")
            ->assertStatus(204);
        $this->assertDatabaseMissing('reviews', ['id' => $reviewId]);
    }
}
