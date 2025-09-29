<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        $title = $this->faker->sentence(3);
        return [
            'owner_id' => \App\Models\User::factory(),
            'category_id' => null,
            'title' => $title,
            'slug' => Str::slug($title . '-' . $this->faker->unique()->randomNumber(5)),
            'summary' => $this->faker->sentence(8),
            'description' => $this->faker->paragraph(),
            'cover_url' => null,
            'is_paid' => false,
            'price_cents' => null,
            'visibility' => 'public',
            'status' => 'draft',
        ];
    }
}
