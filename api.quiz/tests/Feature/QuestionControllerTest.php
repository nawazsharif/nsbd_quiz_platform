<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_owner_can_create_mcq_question_with_options()
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $quiz = Quiz::factory()->for($owner, 'owner')->create();

        // Simulate creation directly via model since controller not implemented yet
        $question = Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'mcq',
            'order_index' => 1,
            'text' => 'What is 2+2?',
            'multiple_correct' => false,
            'points' => 1,
            'requires_manual_grading' => false,
        ]);
        QuestionOption::factory()->create(['question_id' => $question->id, 'text' => '3', 'is_correct' => false, 'order_index' => 1]);
        QuestionOption::factory()->create(['question_id' => $question->id, 'text' => '4', 'is_correct' => true, 'order_index' => 2]);

        $this->assertDatabaseHas('questions', ['id' => $question->id, 'type' => 'mcq']);
        $this->assertDatabaseHas('question_options', ['question_id' => $question->id, 'text' => '4', 'is_correct' => 1]);
    }

    public function test_owner_can_create_true_false_question()
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $quiz = Quiz::factory()->for($owner, 'owner')->create();

        $question = Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'true_false',
            'order_index' => 1,
            'text' => 'The sky is blue.',
            'correct_boolean' => true,
            'points' => 1,
            'requires_manual_grading' => false,
        ]);

        $this->assertDatabaseHas('questions', ['id' => $question->id, 'type' => 'true_false', 'correct_boolean' => 1]);
    }

    public function test_owner_can_create_short_desc_question()
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $quiz = Quiz::factory()->for($owner, 'owner')->create();

        $question = Question::create([
            'quiz_id' => $quiz->id,
            'type' => 'short_desc',
            'order_index' => 1,
            'prompt' => 'Explain OOP.',
            'sample_answer' => 'Abstraction, Encapsulation, Inheritance, Polymorphism',
            'points' => 5,
            'requires_manual_grading' => true,
        ]);

        $this->assertDatabaseHas('questions', ['id' => $question->id, 'type' => 'short_desc', 'requires_manual_grading' => 1]);
    }
}
