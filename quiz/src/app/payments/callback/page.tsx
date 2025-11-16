'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const status = searchParams.get('status') || 'unknown';
  const transactionId = searchParams.get('transaction_id');
  const provider = searchParams.get('provider') || 'Payment Gateway';
  const message = searchParams.get('message');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/wallet');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          title: 'Payment Successful!',
          subtitle: 'Your wallet has been recharged successfully.',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Payment Failed',
          subtitle: message || 'The payment could not be completed. Please try again.',
        };
      case 'cancelled':
        return {
          icon: AlertCircle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: 'Payment Cancelled',
          subtitle: 'You cancelled the payment process.',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          title: 'Payment Status Unknown',
          subtitle: 'Unable to determine payment status.',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-md w-full">
        <div className={`bg-white rounded-2xl shadow-xl border-2 ${config.borderColor} overflow-hidden`}>
          {/* Header with icon */}
          <div className={`${config.bgColor} p-8 text-center`}>
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 rounded-full ${config.bgColor} border-4 ${config.borderColor} flex items-center justify-center`}>
                <Icon className={`w-10 h-10 ${config.color}`} />
              </div>
            </div>
            <h1 className={`text-2xl font-bold ${config.color} mb-2`}>
              {config.title}
            </h1>
            <p className="text-slate-600">
              {config.subtitle}
            </p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {/* Provider */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-700">Provider</span>
              <span className="text-sm font-semibold text-slate-900">{provider}</span>
            </div>

            {/* Transaction ID */}
            {transactionId && (
              <div className="py-2 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-700 mb-1">Transaction ID</div>
                <div className="text-xs font-mono bg-slate-50 p-2 rounded border border-slate-200 break-all">
                  {transactionId}
                </div>
              </div>
            )}

            {/* Auto redirect message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800 text-center">
                Redirecting to wallet in <span className="font-bold text-lg">{countdown}</span> seconds...
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/wallet"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                Go to Wallet
              </Link>
              <Link
                href="/"
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors text-center"
              >
                Home
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          © 2025 QUIZ PLATFORM
        </p>
      </div>
    </div>
  );
}
