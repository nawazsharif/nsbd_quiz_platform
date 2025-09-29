<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_mcq_via_api()
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $quiz = Quiz::factory()->for($owner, 'owner')->create();

        $payload = [
            'type' => 'mcq',
            'order_index' => 1,
            'text' => 'Pick one',
            'multiple_correct' => false,
            'options' => [
                ['text' => 'A', 'is_correct' => true],
                ['text' => 'B', 'is_correct' => false],
            ],
        ];

        $this->postJson("/api/quizzes/{$quiz->id}/questions", $payload)
            ->assertStatus(201)
            ->assertJson(['type' => 'mcq', 'text' => 'Pick one']);

        $this->assertDatabaseHas('questions', ['quiz_id' => $quiz->id, 'type' => 'mcq']);
    }

    public function test_only_owner_or_admin_can_delete_question()
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create();
        $this->actingAs($owner);

        $create = $this->postJson("/api/quizzes/{$quiz->id}/questions", [
            'type' => 'true_false',
            'order_index' => 1,
            'text' => 'Sky is blue',
            'correct_boolean' => true,
        ])->json();

        $questionId = $create['id'];

        $other = User::factory()->create();
        Sanctum::actingAs($other);
        $this->deleteJson("/api/quizzes/{$quiz->id}/questions/{$questionId}")
            ->assertStatus(403);

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/quizzes/{$quiz->id}/questions/{$questionId}")
            ->assertStatus(204);
    }
}
