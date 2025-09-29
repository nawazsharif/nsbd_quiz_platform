<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Question>
 */
class QuestionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'quiz_id' => \App\Models\Quiz::factory(),
            'type' => 'mcq',
            'order_index' => 1,
            'text' => $this->faker->sentence(),
            'explanation' => null,
            'multiple_correct' => false,
            'correct_boolean' => null,
            'prompt' => null,
            'sample_answer' => null,
            'points' => 1,
            'requires_manual_grading' => false,
        ];
    }
}
