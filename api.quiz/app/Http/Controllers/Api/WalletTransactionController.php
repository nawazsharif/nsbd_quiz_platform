<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WalletTransactionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = WalletTransaction::query()->orderByDesc('created_at');

        if (!$user->hasAnyRole(['admin', 'superadmin'])) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('type')) {
            $types = array_filter(array_map('trim', explode(',', (string) $request->query('type'))));
            if (!empty($types)) {
                $query->whereIn('type', $types);
            }
        }

        if ($request->filled('status')) {
            $statuses = array_filter(array_map('trim', explode(',', (string) $request->query('status'))));
            if (!empty($statuses)) {
                $query->whereIn('status', $statuses);
            }
        }

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $transactions = $query->paginate($perPage);

        return response()->json($transactions, Response::HTTP_OK);
    }
}

