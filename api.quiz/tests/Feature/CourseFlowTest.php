<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\PlatformRevenue;
use App\Models\Setting;
use App\Models\User;
use App\Models\WalletAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseFlowTest extends TestCase
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

    public function test_creator_can_create_course_and_manage_contents()
    {
        $creator = User::factory()->create();
        $course = $this->actingAs($creator, 'sanctum')
            ->postJson('/api/courses', [
                'title' => 'My Course',
                'summary' => 'Summary',
                'description' => 'Desc',
                'is_paid' => false,
            ])->assertStatus(201)->json();

        // Add a text content
        $this->actingAs($creator, 'sanctum')
            ->postJson("/api/courses/{$course['id']}/contents", [
                'type' => 'text', 'title' => 'Intro', 'order_index' => 1, 'payload' => ['body' => 'Hello']
            ])->assertStatus(201);

        // List
        $this->actingAs($creator, 'sanctum')
            ->getJson("/api/courses/{$course['id']}/contents")
            ->assertStatus(200);
    }

    public function test_approval_charges_fee_and_sets_status()
    {
        $super = User::factory()->create();
        $super->assignRole('superadmin');
        $creator = User::factory()->create();
        $course = Course::factory()->create(['owner_id' => $creator->id, 'status' => 'submitted']);

        // Set fee and top up wallet
        Setting::updateOrCreate(['key' => 'course_approval_fee_cents'], ['value' => 500]);
        $wallet = WalletAccount::firstOrCreate(['user_id' => $creator->id]);
        $wallet->balance_cents = 1000; $wallet->save();

        $this->actingAs($super, 'sanctum')
            ->postJson("/api/admin/courses/{$course->id}/approve")
            ->assertOk();

        $course->refresh();
        $this->assertEquals('approved', $course->status);
        $this->assertDatabaseHas('platform_revenues', ['course_id' => $course->id, 'source' => 'course_approval_fee', 'amount_cents' => 500]);
    }

    public function test_insufficient_wallet_blocks_approval()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $creator = User::factory()->create();
        $course = Course::factory()->create(['owner_id' => $creator->id, 'status' => 'submitted']);
        Setting::updateOrCreate(['key' => 'course_approval_fee_cents'], ['value' => 1000]);
        $wallet = WalletAccount::firstOrCreate(['user_id' => $creator->id]);
        $wallet->balance_cents = 500; $wallet->save();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/courses/{$course->id}/approve")
            ->assertStatus(422);
    }

    public function test_enroll_free_and_purchase_paid_course()
    {
        $buyer = User::factory()->create();
        $author = User::factory()->create();
        $free = Course::factory()->create(['owner_id' => $author->id, 'is_paid' => false, 'status' => 'approved']);
        $paid = Course::factory()->create(['owner_id' => $author->id, 'is_paid' => true, 'price_cents' => 2000, 'status' => 'approved']);
        Setting::updateOrCreate(['key' => 'course_platform_commission_percent'], ['value' => 25]);

        // Give buyer sufficient wallet balance
        $buyerWallet = WalletAccount::firstOrCreate(['user_id' => $buyer->id]);
        $buyerWallet->balance_cents = 5000; // More than enough for 2000 cents course
        $buyerWallet->save();

        // Free enroll
        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/courses/{$free->id}/enroll")
            ->assertOk();
        $this->assertDatabaseHas('course_enrollments', ['course_id' => $free->id, 'user_id' => $buyer->id]);

        // Paid purchase
        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/courses/{$paid->id}/enroll")
            ->assertOk();

        $authorWallet = WalletAccount::firstOrCreate(['user_id' => $author->id]);
        $authorWallet->refresh();
        // 75% of 2000 = 1500
        $this->assertEquals(1500, $authorWallet->balance_cents);
        $this->assertDatabaseHas('platform_revenues', ['course_id' => $paid->id, 'source' => 'course_purchase', 'amount_cents' => 500]);
        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $buyer->id,
            'type' => 'course_purchase',
            'amount_cents' => 2000,
        ]);
        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $author->id,
            'type' => 'course_sale',
            'amount_cents' => 1500,
        ]);
    }
}
