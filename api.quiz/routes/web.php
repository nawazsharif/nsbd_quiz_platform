<?php

use Illuminate\Support\Facades\Route;

// This file is required by Laravel but we only use API routes
// All web routes are handled by the Next.js frontend
Route::get('/', function () {
    return response()->json([
        'message' => 'Hello World'
    ]);
});
