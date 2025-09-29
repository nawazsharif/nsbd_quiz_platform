<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Quiz>
 */
class QuizFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => \App\Models\User::factory(),
            'category_id' => null,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'difficulty' => 'medium',
            'is_paid' => false,
            'price_cents' => null,
            'timer_seconds' => null,
            'randomize_questions' => false,
            'randomize_answers' => false,
            'allow_multiple_attempts' => true,
            'max_attempts' => null,
            'visibility' => 'public',
            'status' => 'draft',
            'negative_marking' => false,
            'negative_mark_value' => null,
        ];
    }
}
