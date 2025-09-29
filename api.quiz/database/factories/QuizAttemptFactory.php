<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\QuizAttempt>
 */
class QuizAttemptFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'quiz_id' => \App\Models\Quiz::factory(),
            'status' => 'in_progress',
            'current_question_index' => 0,
            'score' => null,
            'correct_answers' => 0,
            'incorrect_answers' => 0,
            'total_questions' => 1,
            'earned_points' => 0,
            'penalty_points' => 0,
            'time_spent_seconds' => 0,
            'remaining_time_seconds' => null,
            'progress' => [
                'currentQuestionIndex' => 0,
                'totalQuestions' => 1,
                'answeredQuestions' => 0,
                'answers' => new \stdClass(),
                'timeSpent' => 0,
                'lastActivityAt' => now()->toIso8601String(),
                'completionPercentage' => 0,
            ],
            'started_at' => now(),
            'completed_at' => null,
        ];
    }
}
