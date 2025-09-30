<?php

return [
    'provider' => env('AI_PROVIDER', 'openai'),

    'max_questions' => (int) env('AI_MAX_QUESTIONS', 20),

    'temperature' => (float) env('AI_TEMPERATURE', 0.3),

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    ],
];
