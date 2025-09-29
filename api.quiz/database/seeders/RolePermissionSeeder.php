<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Commands\Seed\Command;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // User permissions
            'view users',
            'create users',
            'edit users',
            'delete users',
            'manage user roles',
            
            // Role permissions
            'view roles',
            'create roles',
            'edit roles',
            'delete roles',
            'assign permissions',
            
            // General permissions
            'view dashboard',
            'manage system',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }

        // Create roles and assign permissions
        
        // Super Admin - has all permissions
        $superAdminRole = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $superAdminRoleSanctum = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $superAdminRole->givePermissionTo(Permission::where('guard_name', 'web')->get());
        $superAdminRoleSanctum->givePermissionTo(Permission::where('guard_name', 'sanctum')->get());

        // Admin - has most permissions except system management
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $adminRoleSanctum = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'sanctum']);
        $adminPermissions = [
            'view users',
            'create users',
            'edit users',
            'delete users',
            'manage user roles',
            'view roles',
            'view dashboard',
        ];
        $adminRole->givePermissionTo($adminPermissions);
        $adminRoleSanctum->givePermissionTo($adminPermissions);

        // User - has basic permissions
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        $userRoleSanctum = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'sanctum']);
        $userPermissions = ['view dashboard'];
        $userRole->givePermissionTo($userPermissions);
        $userRoleSanctum->givePermissionTo($userPermissions);

        // Create default users
        
        // Create Super Admin user
        $superAdmin = User::firstOrCreate([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
        ], [
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
        $superAdmin->assignRole('superadmin');

        // Create Admin user
        $admin = User::firstOrCreate([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ], [
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
        $admin->assignRole('admin');

        // Create Regular user
        $regularUser = User::firstOrCreate([
            'name' => 'Regular User',
            'email' => 'user@example.com',
        ], [
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
        $regularUser->assignRole('user');
    }
}
