<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create specific test users
        $this->createSpecificUsers();
        
        // Create random users with different roles
        $this->createRandomUsers();
    }

    /**
     * Create specific users for testing and development
     */
    private function createSpecificUsers(): void
    {
        $specificUsers = [
            [
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'role' => 'superadmin'
            ],
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'role' => 'superadmin'
            ],
            [
                'name' => 'Jane Smith',
                'email' => 'jane@example.com',
                'role' => 'admin'
            ],
            [
                'name' => 'Bob Johnson',
                'email' => 'bob@example.com',
                'role' => 'user'
            ],
            [
                'name' => 'Alice Brown',
                'email' => 'alice@example.com',
                'role' => 'user'
            ],
            [
                'name' => 'Charlie Wilson',
                'email' => 'charlie@example.com',
                'role' => 'admin'
            ]
        ];

        foreach ($specificUsers as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'email_verified_at' => now(),
                    'password' => Hash::make('password123'),
                ]
            );
            if (!$user->hasRole($userData['role'])) {
                $user->assignRole($userData['role']);
            }
        }
    }

    /**
     * Create random users using factory
     */
    private function createRandomUsers(): void
    {
        // Create 10 regular users
        User::factory(10)->create()->each(function ($user) {
            $user->assignRole('user');
        });

        // Create 5 admin users
        User::factory(5)->create()->each(function ($user) {
            $user->assignRole('admin');
        });

        // Create 2 superadmin users
        User::factory(2)->create()->each(function ($user) {
            $user->assignRole('superadmin');
        });

        // Create 3 unverified users
        User::factory(3)->unverified()->create()->each(function ($user) {
            $user->assignRole('user');
        });
    }
}
