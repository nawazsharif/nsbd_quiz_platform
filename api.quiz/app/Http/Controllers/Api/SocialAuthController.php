<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Contracts\User as SocialiteUser;

/**
 * @OA\Schema(
 *     schema="SocialUser",
 *     type="object",
 *     title="Social User",
 *     description="User information returned after social authentication",
 *     @OA\Property(property="id", type="integer", example=1, description="User ID"),
 *     @OA\Property(property="name", type="string", example="John Doe", description="User's full name"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com", description="User's email address"),
 *     @OA\Property(property="avatar", type="string", example="https://example.com/avatar.jpg", description="User's avatar URL"),
 *     @OA\Property(property="provider", type="string", example="google", description="Social provider used for authentication")
 * )
 *
 * @OA\Schema(
 *     schema="SocialAuthResponse",
 *     type="object",
 *     title="Social Authentication Response",
 *     description="Response structure for social authentication endpoints",
 *     @OA\Property(property="success", type="boolean", example=true, description="Indicates if the request was successful"),
 *     @OA\Property(property="message", type="string", example="Login successful", description="Response message"),
 *     @OA\Property(property="user", ref="#/components/schemas/SocialUser", description="User information"),
 *     @OA\Property(property="token", type="string", example="1|abcdef123456...", description="Authentication token"),
 *     @OA\Property(property="token_type", type="string", example="Bearer", description="Token type")
 * )
 *
 * @OA\Schema(
 *     schema="SocialAuthError",
 *     type="object",
 *     title="Social Authentication Error",
 *     description="Error response structure for social authentication endpoints",
 *     @OA\Property(property="success", type="boolean", example=false, description="Indicates if the request was successful"),
 *     @OA\Property(property="message", type="string", example="Authentication failed", description="Error message"),
 *     @OA\Property(property="error", type="string", example="Invalid authorization code", description="Detailed error information")
 * )
 *
 * @OA\Tag(
 *     name="Social Authentication",
 *     description="Social authentication endpoints for Google, GitHub, and Facebook login"
 * )
 */
class SocialAuthController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/auth/social/{provider}/redirect",
     *     summary="Get redirect URL for social provider",
     *     description="Returns the redirect URL to initiate social authentication with the specified provider",
     *     tags={"Social Authentication"},
     *     @OA\Parameter(
     *         name="provider",
     *         in="path",
     *         description="Social provider name",
     *         required=true,
     *         @OA\Schema(
     *             type="string",
     *             enum={"google", "github", "facebook"}
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Redirect URL generated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="redirect_url", type="string", example="https://accounts.google.com/oauth/authorize?client_id=..."),
     *             @OA\Property(property="message", type="string", example="Redirecting to google for authentication")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid provider",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Provider 'invalid' is not supported")
     *         )
     *     )
     * )
     *
     * Redirect to the social provider
     */
    public function redirectToProvider(string $provider): JsonResponse
    {
        $this->validateProvider($provider);

        $redirectUrl = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

        return response()->json([
            'success' => true,
            'redirect_url' => $redirectUrl,
            'message' => "Redirecting to {$provider} for authentication"
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/auth/social/{provider}/callback",
     *     summary="Handle social provider callback",
     *     description="Handles the callback from social provider after user authentication",
     *     tags={"Social Authentication"},
     *     @OA\Parameter(
     *         name="provider",
     *         in="path",
     *         description="Social provider name",
     *         required=true,
     *         @OA\Schema(
     *             type="string",
     *             enum={"google", "github", "facebook"}
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Authentication successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Login successful"),
     *             @OA\Property(property="user", ref="#/components/schemas/SocialUser"),
     *             @OA\Property(property="token", type="string", example="1|abcdef123456..."),
     *             @OA\Property(property="token_type", type="string", example="Bearer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Authentication failed",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Authentication failed"),
     *             @OA\Property(property="error", type="string", example="Invalid authorization code")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Failed to process social authentication"),
     *             @OA\Property(property="error", type="string", example="Database connection failed")
     *         )
     *     )
     * )
     *
     * Handle the callback from the social provider
     */
    public function handleProviderCallback(string $provider): JsonResponse
    {
        $this->validateProvider($provider);

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
            return $this->handleSocialUser($socialUser, $provider);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/auth/social/{provider}/login",
     *     summary="Login with social provider authorization code",
     *     description="Handles social login using authorization code (useful for mobile apps)",
     *     tags={"Social Authentication"},
     *     @OA\Parameter(
     *         name="provider",
     *         in="path",
     *         description="Social provider name",
     *         required=true,
     *         @OA\Schema(
     *             type="string",
     *             enum={"google", "github", "facebook"}
     *         )
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"code"},
     *             @OA\Property(property="code", type="string", description="Authorization code from social provider", example="4/0AX4XfWh..."),
     *             @OA\Property(property="state", type="string", description="State parameter for CSRF protection", example="random_state_string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Authentication successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Login successful"),
     *             @OA\Property(property="user", ref="#/components/schemas/SocialUser"),
     *             @OA\Property(property="token", type="string", example="1|abcdef123456..."),
     *             @OA\Property(property="token_type", type="string", example="Bearer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Authentication failed",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Authentication failed"),
     *             @OA\Property(property="error", type="string", example="Invalid authorization code")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(property="errors", type="object", example={"code": {"The code field is required."}})
     *         )
     *     )
     * )
     *
     * Handle social login with authorization code (for mobile apps)
     */
    public function loginWithCode(Request $request, string $provider): JsonResponse
    {
        $this->validateProvider($provider);

        $request->validate([
            'code' => 'required|string',
            'state' => 'nullable|string'
        ]);

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
            return $this->handleSocialUser($socialUser, $provider);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Handle the social user data and create/update user account
     */
    private function handleSocialUser(SocialiteUser $socialUser, string $provider): JsonResponse
    {
        try {
            // Check if user already exists with this provider
            $existingUser = User::where('provider', $provider)
                ->where('provider_id', $socialUser->getId())
                ->first();

            if ($existingUser) {
                // User exists, log them in
                $token = $existingUser->createToken('auth-token')->plainTextToken;

                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'user' => [
                        'id' => $existingUser->id,
                        'name' => $existingUser->name,
                        'email' => $existingUser->email,
                        'avatar' => $existingUser->avatar,
                        'provider' => $existingUser->provider,
                        'provider_id' => $existingUser->provider_id,
                        'roles' => $existingUser->getRoleNames()->toArray(),
                    ],
                    'token' => $token,
                    'token_type' => 'Bearer'
                ]);
            }

            // Check if user exists with same email but different provider
            $userByEmail = User::where('email', $socialUser->getEmail())->first();

            if ($userByEmail) {
                // Link the social account to existing user
                $userByEmail->update([
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                    'avatar' => $socialUser->getAvatar(),
                ]);

                $token = $userByEmail->createToken('auth-token')->plainTextToken;

                return response()->json([
                    'success' => true,
                    'message' => 'Account linked successfully',
                    'user' => [
                        'id' => $userByEmail->id,
                        'name' => $userByEmail->name,
                        'email' => $userByEmail->email,
                        'avatar' => $userByEmail->avatar,
                        'provider' => $userByEmail->provider,
                        'provider_id' => $userByEmail->provider_id,
                        'roles' => $userByEmail->getRoleNames()->toArray(),
                    ],
                    'token' => $token,
                    'token_type' => 'Bearer'
                ]);
            }

            // Create new user
            $newUser = User::create([
                'name' => $socialUser->getName() ?: $socialUser->getNickname(),
                'email' => $socialUser->getEmail(),
                'password' => Hash::make(Str::random(24)), // Random password for social users
                'provider' => $provider,
                'provider_id' => $socialUser->getId(),
                'avatar' => $socialUser->getAvatar(),
                'email_verified_at' => now(), // Social users are considered verified
            ]);

            // Assign default role if needed
            if (!$newUser->hasRole('user')) {
                $newUser->assignRole('user');
            }

            $token = $newUser->createToken('auth-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Account created and login successful',
                'user' => [
                    'id' => $newUser->id,
                    'name' => $newUser->name,
                    'email' => $newUser->email,
                    'avatar' => $newUser->avatar,
                    'provider' => $newUser->provider,
                    'provider_id' => $newUser->provider_id,
                    'roles' => $newUser->getRoleNames()->toArray(),
                ],
                'token' => $token,
                'token_type' => 'Bearer'
            ], Response::HTTP_CREATED);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process social authentication',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate the social provider
     */
    private function validateProvider(string $provider): void
    {
        $allowedProviders = ['google', 'github', 'facebook'];

        if (!in_array($provider, $allowedProviders)) {
            response()->json([
                'success' => false,
                'message' => 'Invalid provider. Supported providers: ' . implode(', ', $allowedProviders)
            ], 400)->throwResponse();
        }
    }
}
