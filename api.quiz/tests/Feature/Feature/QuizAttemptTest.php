<?php

namespace Tests\Feature\Feature;

use App\Models\Quiz;
use App\Models\User;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuizAttempt;
use App\Models\QuizEnrollment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuizAttemptTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private function enroll(User $user, Quiz $quiz): void
    {
        QuizEnrollment::firstOrCreate([
            'user_id' => $user->id,
            'quiz_id' => $quiz->id,
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        // Create roles
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_user_can_start_quiz_attempt()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published', 'is_paid' => false]);
        
        // Create questions for the quiz
        $question1 = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'mcq']);
        QuestionOption::factory()->create(['question_id' => $question1->id, 'is_correct' => true]);
        QuestionOption::factory()->create(['question_id' => $question1->id, 'is_correct' => false]);
        
        $question2 = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'true_false']);
        
        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $response = $this->postJson("/api/quizzes/{$quiz->id}/attempts");

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'created'])
            ->assertJsonStructure([
                'status',
                'attempt' => [
                    'id',
                    'quiz_id',
                    'user_id',
                    'status',
                    'current_question_index',
                    'total_questions',
                    'progress' => [
                        'currentQuestionIndex',
                        'totalQuestions',
                        'answeredQuestions',
                        'answers',
                        'timeSpent',
                        'lastActivityAt',
                        'completionPercentage'
                    ]
                ],
                'quiz' => [
                    'id',
                    'title',
                    'difficulty',
                    'timer_seconds'
                ]
            ]);

        $this->assertDatabaseHas('quiz_attempts', [
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress'
        ]);
    }

    public function test_user_cannot_start_multiple_attempts_simultaneously()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published', 'is_paid' => false]);
        Question::factory()->create(['quiz_id' => $quiz->id]);
        
        // Create an existing in-progress attempt
        QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress'
        ]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $response = $this->postJson("/api/quizzes/{$quiz->id}/attempts");

        $response->assertStatus(200)
            ->assertJson(['status' => 'resume', 'message' => 'You already have an active attempt for this quiz.']);
    }

    public function test_user_can_update_progress_and_save_answers()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        $question = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'mcq']);
        $correctOption = QuestionOption::factory()->create([
            'question_id' => $question->id,
            'is_correct' => true,
            'order_index' => 0,
        ]);
        QuestionOption::factory()->create([
            'question_id' => $question->id,
            'is_correct' => false,
            'order_index' => 1,
        ]);
        
        $attempt = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress'
        ]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $response = $this->putJson("/api/quiz-attempts/{$attempt->id}/progress", [
            'current_question_index' => 1,
            'time_spent_seconds' => 30,
            'answers' => [
                (string) $question->id => 0,
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'progress_saved'])
            ->assertJsonPath('attempt.progress.answeredQuestions', 1)
            ->assertJsonPath('attempt.current_question_index', 1);

        $freshAttempt = $attempt->fresh();
        $this->assertSame(1, $freshAttempt->current_question_index);
        $this->assertSame(30, $freshAttempt->time_spent_seconds);
        $answers = (array) ($freshAttempt->progress['answers'] ?? []);
        $this->assertArrayHasKey((string) $question->id, $answers);
        $this->assertSame(0, $answers[(string) $question->id]);
    }

    public function test_user_can_submit_completed_quiz()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        $question = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'mcq']);
        QuestionOption::factory()->create([
            'question_id' => $question->id,
            'is_correct' => true,
            'order_index' => 0,
        ]);
        QuestionOption::factory()->create([
            'question_id' => $question->id,
            'is_correct' => false,
            'order_index' => 1,
        ]);
        
        $attempt = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress',
            'total_questions' => 1
        ]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $response = $this->postJson("/api/quiz-attempts/{$attempt->id}/submit", [
            'answers' => [
                (string) $question->id => 0,
            ],
            'time_spent_seconds' => 45,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'completed'])
            ->assertJsonPath('attempt.status', 'completed')
            ->assertJsonPath('results.score', 100.0);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attempt->id,
            'status' => 'completed',
        ]);
    }

    public function test_user_can_abandon_quiz_attempt()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        $attempt = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress'
        ]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $response = $this->postJson("/api/quiz-attempts/{$attempt->id}/abandon");

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'abandoned'])
            ->assertJsonPath('attempt.status', 'abandoned');

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attempt->id,
            'status' => 'abandoned'
        ]);
    }

    public function test_user_can_get_their_attempts()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        
        $attempt1 = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'completed'
        ]);
        
        $attempt2 = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'in_progress'
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/user/quiz-attempts");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'attempts',
                'data',
                'meta' => ['current_page', 'per_page', 'total', 'last_page'],
                'links' => ['next', 'prev'],
            ])
            ->assertJsonCount(2, 'attempts');
    }

    public function test_user_can_get_attempt_statistics()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        
        QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'completed',
            'score' => 85
        ]);
        
        QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'status' => 'completed',
            'score' => 92
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/user/attempt-statistics");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'totalAttempts',
                'completedAttempts',
                'completionRate',
                'averageScore',
                'bestScore',
                'totalTimeSpent',
                'recentAttempts'
            ]);
    }

    public function test_unauthenticated_user_cannot_access_quiz_attempts()
    {
        $quiz = Quiz::factory()->create(['status' => 'published']);

        $response = $this->postJson("/api/quizzes/{$quiz->id}/attempts");

        $response->assertStatus(401);
    }

    public function test_user_cannot_access_other_users_attempts()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        
        $attempt = QuizAttempt::factory()->create([
            'quiz_id' => $quiz->id,
            'user_id' => $user2->id,
            'status' => 'in_progress'
        ]);

        Sanctum::actingAs($user1);

        $response = $this->putJson("/api/quiz-attempts/{$attempt->id}/progress", [
            'current_question_index' => 1,
            'answers' => []
        ]);

        $response->assertStatus(403);
    }

    public function test_quiz_attempt_security_middleware_prevents_rapid_submissions()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        Question::factory()->create(['quiz_id' => $quiz->id]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        // Make multiple rapid requests
        for ($i = 0; $i < 4; $i++) {
            $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
                'force_new' => true,
            ]);
        }

        // The 4th request should be rate limited
        $response = $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'force_new' => true,
        ]);

        $response->assertStatus(429); // Too Many Requests
    }

    public function test_user_can_force_new_attempt_when_one_is_in_progress()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create(['status' => 'published']);
        $question = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'mcq']);
        QuestionOption::factory()->create(['question_id' => $question->id, 'is_correct' => true, 'order_index' => 0]);
        QuestionOption::factory()->create(['question_id' => $question->id, 'is_correct' => false, 'order_index' => 1]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        $firstResponse = $this->postJson("/api/quizzes/{$quiz->id}/attempts")->assertStatus(201);
        $firstAttemptId = $firstResponse->json('attempt.id');

        $secondResponse = $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'force_new' => true,
        ]);

        $secondResponse->assertStatus(201)
            ->assertJsonFragment(['status' => 'created']);

        $secondAttemptId = $secondResponse->json('attempt.id');

        $this->assertNotEquals($firstAttemptId, $secondAttemptId);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $firstAttemptId,
            'status' => 'abandoned',
        ]);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $secondAttemptId,
            'status' => 'in_progress',
        ]);
    }

    public function test_user_cannot_exceed_max_attempts_even_with_force_new()
    {
        $user = User::factory()->create();
        $quiz = Quiz::factory()->create([
            'status' => 'published',
            'allow_multiple_attempts' => false,
            'max_attempts' => 1,
        ]);
        $question = Question::factory()->create(['quiz_id' => $quiz->id, 'type' => 'mcq']);
        QuestionOption::factory()->create(['question_id' => $question->id, 'is_correct' => true, 'order_index' => 0]);
        QuestionOption::factory()->create(['question_id' => $question->id, 'is_correct' => false, 'order_index' => 1]);

        Sanctum::actingAs($user);
        $this->enroll($user, $quiz);

        // Start and submit first attempt
        $start = $this->postJson("/api/quizzes/{$quiz->id}/attempts")->assertStatus(201);
        $attemptId = $start->json('attempt.id');

        $this->postJson("/api/quiz-attempts/{$attemptId}/submit", [
            'answers' => [
                (string) $question->id => 0,
            ],
            'time_spent_seconds' => 45,
        ])->assertStatus(200);

        $response = $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'force_new' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'You have reached the maximum number of attempts for this quiz.']);
    }
}
