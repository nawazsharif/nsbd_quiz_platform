<?php

namespace App\Services;

use App\Models\WalletTransaction;
use App\Models\Quiz;
use App\Models\Course;
use Illuminate\Support\Str;

class WalletTransactionService
{
    public function record(
        int $userId,
        string $type,
        int $amountCents,
        string $status = 'completed',
        array $meta = []
    ): WalletTransaction {
        // Enrich metadata with titles if quiz_id or course_id is present
        $enrichedMeta = $this->enrichMetadata($meta);

        // Add direction if not present
        if (!isset($enrichedMeta['direction'])) {
            $enrichedMeta['direction'] = $this->determineDirection($type);
        }

        return WalletTransaction::create([
            'user_id' => $userId,
            'transaction_id' => Str::uuid()->toString(),
            'type' => $type,
            'amount_cents' => $amountCents,
            'status' => $status,
            'meta' => empty($enrichedMeta) ? null : $enrichedMeta,
        ]);
    }

    /**
     * Enrich metadata with entity titles
     */
    private function enrichMetadata(array $meta): array
    {
        // Add quiz title if quiz_id present but title missing
        if (isset($meta['quiz_id']) && !isset($meta['quiz_title'])) {
            $quiz = Quiz::find($meta['quiz_id']);
            if ($quiz) {
                $meta['quiz_title'] = $quiz->title;
            }
        }

        // Add course title if course_id present but title missing
        if (isset($meta['course_id']) && !isset($meta['course_title'])) {
            $course = Course::find($meta['course_id']);
            if ($course) {
                $meta['course_title'] = $course->title;
            }
        }

        return $meta;
    }

    /**
     * Determine transaction direction based on type
     */
    private function determineDirection(string $type): string
    {
        $creditTypes = ['recharge', 'quiz_sale', 'course_sale', 'platform_fee', 'refund'];
        $debitTypes = ['quiz_purchase', 'course_purchase', 'withdrawal', 'publishing_fee', 'service_charge'];

        if (in_array($type, $creditTypes)) {
            return 'credit';
        } elseif (in_array($type, $debitTypes)) {
            return 'debit';
        }

        return 'unknown';
    }
}
