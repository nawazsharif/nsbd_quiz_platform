<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Settings", description="Platform settings (superadmin)")
 *
 * @OA\Schema(
 *   schema="Setting",
 *   type="object",
 *   @OA\Property(property="key", type="string"),
 *   @OA\Property(property="value", type="string")
 * )
 *
 * @OA\Schema(
 *   schema="PaymentSetting",
 *   type="object",
 *   @OA\Property(property="provider", type="string", enum={"bkash","sslcommerz"}),
 *   @OA\Property(property="enabled", type="boolean"),
 *   @OA\Property(property="config", type="object")
 * )
 */
class SettingsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('role:superadmin,sanctum');
    }

    /**
     * @OA\Get(path="/api/settings/quiz", tags={"Settings"}, summary="Get quiz settings",
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(type="object",
     *       @OA\Property(property="paid_quiz_approval_amount_cents", type="integer"),
     *       @OA\Property(property="platform_commission_percent", type="integer")
     *     )
     *   )
     * )
     */
    public function getQuizSettings()
    {
        $amount = (int) (Setting::where('key', 'paid_quiz_approval_amount_cents')->value('value') ?? 0);
        $commission = (int) (Setting::where('key', 'platform_commission_percent')->value('value') ?? 0);
        return response()->json([
            'paid_quiz_approval_amount_cents' => $amount,
            'platform_commission_percent' => $commission,
        ]);
    }

    /**
     * @OA\Put(path="/api/settings/quiz", tags={"Settings"}, summary="Update quiz settings",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(
     *     @OA\Property(property="paid_quiz_approval_amount_cents", type="integer"),
     *     @OA\Property(property="platform_commission_percent", type="integer")
     *   )),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function updateQuizSettings(Request $request)
    {
        $validated = $request->validate([
            'paid_quiz_approval_amount_cents' => 'required|integer|min:0',
            'platform_commission_percent' => 'sometimes|integer|min:0|max:100',
        ]);
        Setting::updateOrCreate(['key' => 'paid_quiz_approval_amount_cents'], ['value' => $validated['paid_quiz_approval_amount_cents']]);
        if (isset($validated['platform_commission_percent'])) {
            Setting::updateOrCreate(['key' => 'platform_commission_percent'], ['value' => $validated['platform_commission_percent']]);
        }
        return response()->json(['message' => 'Updated']);
    }

    /**
     * @OA\Get(path="/api/settings/payments", tags={"Settings"}, summary="Get payment providers",
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(type="array", @OA\Items(ref="#/components/schemas/PaymentSetting"))
     *   )
     * )
     */
    public function paymentIndex()
    {
        return response()->json(PaymentSetting::all());
    }

    /**
     * @OA\Put(path="/api/settings/payments/{provider}", tags={"Settings"}, summary="Update payment provider",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="provider", in="path", required=true, @OA\Schema(type="string")),
     *   @OA\RequestBody(@OA\JsonContent(
     *     @OA\Property(property="enabled", type="boolean"),
     *     @OA\Property(property="config", type="object")
     *   )),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function paymentUpdate(Request $request, string $provider)
    {
        $validated = $request->validate([
            'enabled' => 'sometimes|boolean',
            'config' => 'sometimes|array',
        ]);
        $ps = PaymentSetting::firstOrCreate(['provider' => $provider]);
        $ps->fill($validated);
        $ps->save();
        return response()->json($ps);
    }

    /**
     * @OA\Get(path="/api/settings/course", tags={"Settings"}, summary="Get course settings",
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(type="object",
     *       @OA\Property(property="course_approval_fee_cents", type="integer"),
     *       @OA\Property(property="course_platform_commission_percent", type="integer")
     *     )
     *   )
     * )
     */
    public function getCourseSettings()
    {
        $fee = (int) (Setting::where('key', 'course_approval_fee_cents')->value('value') ?? 0);
        $commission = (int) (Setting::where('key', 'course_platform_commission_percent')->value('value') ?? 0);
        return response()->json([
            'course_approval_fee_cents' => $fee,
            'course_platform_commission_percent' => $commission,
        ]);
    }

    /**
     * @OA\Put(path="/api/settings/course", tags={"Settings"}, summary="Update course settings",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(
     *     @OA\Property(property="course_approval_fee_cents", type="integer"),
     *     @OA\Property(property="course_platform_commission_percent", type="integer")
     *   )),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function updateCourseSettings(Request $request)
    {
        $validated = $request->validate([
            'course_approval_fee_cents' => 'required|integer|min:0',
            'course_platform_commission_percent' => 'sometimes|integer|min:0|max:100',
        ]);
        Setting::updateOrCreate(['key' => 'course_approval_fee_cents'], ['value' => $validated['course_approval_fee_cents']]);
        if (isset($validated['course_platform_commission_percent'])) {
            Setting::updateOrCreate(['key' => 'course_platform_commission_percent'], ['value' => $validated['course_platform_commission_percent']]);
        }
        return response()->json(['message' => 'Updated']);
    }
}
