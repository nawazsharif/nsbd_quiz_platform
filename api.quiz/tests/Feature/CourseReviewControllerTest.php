<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_free_course_allows_review_with_auto_enroll()
    {
        $user = User::factory()->create();
        $course = Course::factory()->create(['is_paid' => false, 'status' => 'approved']);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/reviews", ['rating' => 5, 'comment' => 'Great free course with value'])
            ->assertStatus(201);

        $this->assertDatabaseHas('course_enrollments', ['course_id' => $course->id, 'user_id' => $user->id]);
        $this->assertDatabaseHas('course_reviews', ['course_id' => $course->id, 'user_id' => $user->id, 'rating' => 5]);
    }

    public function test_paid_course_requires_enrollment_to_review()
    {
        $user = User::factory()->create();
        $course = Course::factory()->create(['is_paid' => true, 'price_cents' => 1000, 'status' => 'approved']);

        // Not enrolled
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/reviews", ['rating' => 4, 'comment' => 'Looks good'])
            ->assertStatus(403);

        // Enroll then review
        CourseEnrollment::create(['course_id' => $course->id, 'user_id' => $user->id]);
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/reviews", ['rating' => 4, 'comment' => 'Now reviewed'])
            ->assertStatus(201);
    }

    public function test_owner_cannot_review_own_course()
    {
        $owner = User::factory()->create();
        $course = Course::factory()->create(['owner_id' => $owner->id, 'is_paid' => false, 'status' => 'approved']);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/courses/{$course->id}/reviews", ['rating' => 5, 'comment' => 'Owner review'])
            ->assertStatus(403);
    }

    public function test_superadmin_can_hide_and_delete_course_review()
    {
        $super = User::factory()->create();
        $super->assignRole('superadmin');

        $user = User::factory()->create();
        $course = Course::factory()->create(['is_paid' => false, 'status' => 'approved']);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/reviews", ['rating' => 3, 'comment' => 'ok course review'])
            ->assertStatus(201)
            ->json();
        $reviewId = $res['id'] ?? ($res['data']['id'] ?? null);
        $this->assertNotNull($reviewId);

        $this->actingAs($super, 'sanctum')
            ->postJson("/api/course-reviews/{$reviewId}/hide", ['hidden' => true])
            ->assertOk();

        $this->assertDatabaseHas('course_reviews', ['id' => $reviewId, 'is_hidden' => true]);

        $this->actingAs($super, 'sanctum')
            ->deleteJson("/api/courses/{$course->id}/reviews/{$reviewId}")
            ->assertStatus(204);
        $this->assertDatabaseMissing('course_reviews', ['id' => $reviewId]);
    }
}
