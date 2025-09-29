<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
    }

    public function test_user_can_register_with_valid_data()
    {
        $userData = [
            'name' => 'Test User',
            'email' => 'testuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/auth/register', $userData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'message',
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'created_at',
                        'updated_at',
                        'roles'
                    ],
                    'token'
                ])
                ->assertJson([
                    'message' => 'User registered successfully'
                ]);

        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'testuser@example.com',
        ]);

        // Check that user has default 'user' role
        $user = User::where('email', 'testuser@example.com')->first();
        $this->assertTrue($user->hasRole('user'));
    }

    public function test_user_cannot_register_with_invalid_data()
    {
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_cannot_register_with_existing_email()
    {
        // Use the seeded user email to test duplicate email validation
        $userData = [
            'name' => 'Another User',
            'email' => 'john@example.com', // This email exists in seeded data
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/auth/register', $userData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
    }

    public function test_user_cannot_register_with_mismatched_password_confirmation()
    {
        $userData = [
            'name' => 'Test User',
            'email' => 'mismatch@example.com',
            'password' => 'password123',
            'password_confirmation' => 'differentpassword',
        ];

        $response = $this->postJson('/api/auth/register', $userData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['password']);
    }

    public function test_user_can_login_with_valid_credentials()
    {
        // Use the seeded user for login test
        $loginData = [
            'email' => 'john@example.com',
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/auth/login', $loginData);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'message',
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'created_at',
                        'updated_at',
                        'roles'
                    ],
                    'token'
                ])
                ->assertJson([
                    'message' => 'Login successful'
                ]);
    }

    public function test_user_cannot_login_with_invalid_credentials()
    {
        // Use the seeded user for invalid login test
        $loginData = [
            'email' => 'john@example.com',
            'password' => 'wrongpassword',
        ];

        $response = $this->postJson('/api/auth/login', $loginData);

        $response->assertStatus(401)
                ->assertJson([
                    'message' => 'Invalid credentials'
                ]);
    }

    public function test_user_cannot_login_with_invalid_email()
    {
        $loginData = [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/auth/login', $loginData);

        $response->assertStatus(401)
                ->assertJson([
                    'message' => 'Invalid credentials'
                ]);
    }

    public function test_user_cannot_login_with_missing_data()
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_authenticated_user_can_logout()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Logout successful'
                ]);
    }

    public function test_unauthenticated_user_cannot_logout()
    {
        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_get_profile()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/profile');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'created_at',
                        'updated_at',
                        'roles'
                    ]
                ]);
    }

    public function test_unauthenticated_user_cannot_get_profile()
    {
        $response = $this->getJson('/api/auth/profile');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_update_profile()
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'original@example.com',
        ]);
        Sanctum::actingAs($user);

        $updateData = [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'message',
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'created_at',
                        'updated_at',
                        'roles'
                    ]
                ])
                ->assertJson([
                    'message' => 'Profile updated successfully',
                    'user' => [
                        'name' => 'Updated Name',
                        'email' => 'updated@example.com',
                    ]
                ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);
    }

    public function test_authenticated_user_can_update_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);
        Sanctum::actingAs($user);

        $updateData = [
            'current_password' => 'oldpassword123',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Profile updated successfully'
                ]);

        // Verify password was updated
        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));
    }

    public function test_authenticated_user_cannot_update_password_with_wrong_current_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);
        Sanctum::actingAs($user);

        $updateData = [
            'current_password' => 'wrongpassword',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['current_password']);
    }

    public function test_authenticated_user_cannot_update_password_without_confirmation()
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);
        Sanctum::actingAs($user);

        $updateData = [
            'current_password' => 'oldpassword123',
            'password' => 'newpassword123',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['password']);
    }

    public function test_authenticated_user_cannot_update_email_to_existing_email()
    {
        $existingUser = User::factory()->create(['email' => 'existing-' . time() . '@example.com']);
        $user = User::factory()->create(['email' => 'user-' . time() . '@example.com']);
        Sanctum::actingAs($user);

        $updateData = [
            'email' => $existingUser->email,
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
    }

    public function test_unauthenticated_user_cannot_update_profile()
    {
        $updateData = [
            'name' => 'Updated Name',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(401);
    }
}