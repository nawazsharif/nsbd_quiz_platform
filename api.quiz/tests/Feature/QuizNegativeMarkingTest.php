<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuizNegativeMarkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_negative_marking_applies_penalty(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $quiz = Quiz::factory()
            ->for($user, 'owner')
            ->create([
                'status' => 'published',
                'negative_marking' => true,
                'negative_mark_value' => 1.00,
            ]);

        $questionOne = Question::factory()->create([
            'quiz_id' => $quiz->id,
            'order_index' => 1,
            'points' => 2,
        ]);
        $questionTwo = Question::factory()->create([
            'quiz_id' => $quiz->id,
            'order_index' => 2,
            'points' => 2,
        ]);

        $questionOneCorrect = QuestionOption::factory()->create([
            'question_id' => $questionOne->id,
            'is_correct' => true,
            'order_index' => 1,
        ]);
        QuestionOption::factory()->create([
            'question_id' => $questionOne->id,
            'is_correct' => false,
            'order_index' => 2,
        ]);

        $questionTwoCorrect = QuestionOption::factory()->create([
            'question_id' => $questionTwo->id,
            'is_correct' => true,
            'order_index' => 1,
        ]);
        $questionTwoWrong = QuestionOption::factory()->create([
            'question_id' => $questionTwo->id,
            'is_correct' => false,
            'order_index' => 2,
        ]);

        $startResponse = $this->postJson('/api/quiz-attempts/start', [
            'quiz_id' => $quiz->id,
        ])->assertStatus(200);

        $attemptId = $startResponse->json('data.attempt.id');

        $submitResponse = $this->postJson("/api/quiz-attempts/{$attemptId}/submit", [
            'time_spent_seconds' => 120,
            'answers' => [
                [
                    'question_id' => $questionOne->id,
                    'selected_option_id' => $questionOneCorrect->id,
                    'time_spent_seconds' => 30,
                ],
                [
                    'question_id' => $questionTwo->id,
                    'selected_option_id' => $questionTwoWrong->id,
                    'time_spent_seconds' => 30,
                ],
            ],
        ])->assertStatus(200);

        $submitResponse->assertJsonPath('data.score', fn ($value) => (float) $value === 25.0);
        $submitResponse->assertJsonPath('data.correct_answers', 1);
        $submitResponse->assertJsonPath('data.incorrect_answers', 1);
        $submitResponse->assertJsonPath('data.earned_points', fn ($value) => (float) $value === 1.0);
        $submitResponse->assertJsonPath('data.penalty_points', fn ($value) => (float) $value === 1.0);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attemptId,
            'correct_answers' => 1,
            'incorrect_answers' => 1,
            'earned_points' => '1.00',
            'penalty_points' => '1.00',
            'score' => '25.00',
        ]);
    }
}
