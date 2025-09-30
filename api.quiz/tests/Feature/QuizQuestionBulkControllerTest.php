<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\User;
use App\Services\AIQuestionGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class QuizQuestionBulkControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_import_questions_from_csv(): void
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create();
        Sanctum::actingAs($owner);

        $csv = implode("\n", [
            'type,question,options,correct_options,points,correct',
            'mcq,What is 2+2?,1|2|4,3,2,',
            'true_false,The sky is blue,,,,1,true',
        ]);

        $file = UploadedFile::fake()->createWithContent('questions.csv', $csv);

        $response = $this->post("/api/quizzes/{$quiz->id}/questions/import", [
            'file' => $file,
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'created' => 2,
                'failed' => 0,
            ]);

        $this->assertDatabaseHas('questions', [
            'quiz_id' => $quiz->id,
            'type' => 'mcq',
            'text' => 'What is 2+2?'
        ]);

        $this->assertDatabaseHas('questions', [
            'quiz_id' => $quiz->id,
            'type' => 'true_false',
            'text' => 'The sky is blue'
        ]);
    }

    public function test_non_owner_cannot_import_questions(): void
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create();
        $other = User::factory()->create();
        Sanctum::actingAs($other);

        $file = UploadedFile::fake()->createWithContent('questions.csv', "type,question\nmcq,Example");

        $this->post("/api/quizzes/{$quiz->id}/questions/import", [
            'file' => $file,
        ])->assertStatus(403);
    }

    public function test_ai_generation_creates_questions(): void
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create();
        Sanctum::actingAs($owner);

        $mock = Mockery::mock(AIQuestionGenerator::class);
        $mock->shouldReceive('isConfigured')->andReturn(true);
        $mock->shouldReceive('generateFromUpload')
            ->once()
            ->andReturn([
                [
                    'type' => 'mcq',
                    'text' => 'Generated question?',
                    'points' => 1,
                    'multiple_correct' => false,
                    'options' => [
                        ['text' => 'A', 'is_correct' => true],
                        ['text' => 'B', 'is_correct' => false],
                    ],
                ],
            ]);

        $this->app->instance(AIQuestionGenerator::class, $mock);

        $file = UploadedFile::fake()->create('source.pdf', 50, 'application/pdf');

        $response = $this->post("/api/quizzes/{$quiz->id}/questions/generate-ai", [
            'file' => $file,
            'count' => 1,
        ]);

        $response
            ->assertCreated()
            ->assertJson([
                'created' => 1,
            ]);

        $this->assertDatabaseHas('questions', [
            'quiz_id' => $quiz->id,
            'text' => 'Generated question?'
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
