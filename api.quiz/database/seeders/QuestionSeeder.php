<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::first() ?? User::factory()->create();
        $category = Category::first();

        $quiz = Quiz::factory()->for($owner, 'owner')->create([
            'title' => 'Sample Seeded Quiz',
            'status' => 'published',
            'category_id' => $category?->id,
            'negative_marking' => true,
            'negative_mark_value' => 0.5,
        ]);

        $tagIds = Tag::pluck('id')->take(3);
        if ($tagIds->isNotEmpty()) {
            $quiz->tags()->sync($tagIds);
        }

        // MCQ
        $q1 = Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'mcq',
            'order_index' => 1,
            'text' => 'Which are fruits?',
            'multiple_correct' => true,
            'points' => 2,
        ]);
        QuestionOption::create(['question_id' => $q1->id, 'text' => 'Apple', 'is_correct' => true, 'order_index' => 1]);
        QuestionOption::create(['question_id' => $q1->id, 'text' => 'Carrot', 'is_correct' => false, 'order_index' => 2]);
        QuestionOption::create(['question_id' => $q1->id, 'text' => 'Banana', 'is_correct' => true, 'order_index' => 3]);

        // True/False
        Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'true_false',
            'order_index' => 2,
            'text' => 'The earth is round.',
            'correct_boolean' => true,
            'points' => 1,
        ]);

        // Short
        Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'short_desc',
            'order_index' => 3,
            'prompt' => 'Explain HTTP.',
            'sample_answer' => 'Request/response protocol',
            'points' => 3,
            'requires_manual_grading' => true,
        ]);
    }
}
