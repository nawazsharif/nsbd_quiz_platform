<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Create roles
        \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_superadmin_can_update_quiz_settings()
    {
        $sa = User::factory()->create();
        $sa->assignRole('superadmin');
        Sanctum::actingAs($sa);

        $this->putJson('/api/settings/quiz', ['paid_quiz_approval_amount_cents' => 500])
            ->assertStatus(200);

        $this->assertDatabaseHas('settings', ['key' => 'paid_quiz_approval_amount_cents', 'value' => '500']);

        $this->getJson('/api/settings/quiz')
            ->assertStatus(200)
            ->assertJson(['paid_quiz_approval_amount_cents' => 500]);
    }

    public function test_non_superadmin_cannot_update_settings()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);
        $this->putJson('/api/settings/quiz', ['paid_quiz_approval_amount_cents' => 500])
            ->assertStatus(403);
    }
}
