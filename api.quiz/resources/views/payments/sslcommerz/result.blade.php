<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    @if (!empty($return_url))
      <meta http-equiv="refresh" content="8;url={{ $return_url }}">
    @endif
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Wallet {{ $status_label ?? 'Status' }} • SSLCommerz</title>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f1f5f9;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(145deg, #f8fafc, #e2e8f0);
      }
      .card {
        background: #fff;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
        text-align: center;
        max-width: 420px;
        width: 90%;
      }
      .status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 999px;
        font-size: 0.95rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 1rem;
      }
      .status.success {
        background: rgba(16, 185, 129, 0.12);
        color: #047857;
      }
      .status.failed {
        background: rgba(248, 113, 113, 0.12);
        color: #b91c1c;
      }
      .status.cancelled {
        background: rgba(148, 163, 184, 0.2);
        color: #475569;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
        color: #0f172a;
      }
      p {
        margin: 0.5rem 0;
        color: #475569;
        font-size: 1rem;
        line-height: 1.5;
      }
      code {
        display: inline-block;
        background: #e2e8f0;
        color: #0f172a;
        padding: 0.35rem 0.6rem;
        border-radius: 0.5rem;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
        font-size: 0.85rem;
        margin-top: 0.75rem;
      }
      .actions {
        margin-top: 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.25rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
        transition: background 0.2s ease, box-shadow 0.2s ease;
      }
      .actions a.primary {
        background: #2563eb;
        color: #fff;
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.25);
      }
      .actions a.primary:hover {
        background: #1d4ed8;
      }
      .actions a.secondary {
        color: #334155;
      }
      footer {
        margin-top: 2rem;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="status {{ $status ?? 'success' }}">{{ $status_label ?? 'Success' }}</div>
      <h1>{{ $message ?? 'Payment processed.' }}</h1>
      <p>Provider: <strong>{{ $provider ?? 'SSLCommerz' }}</strong></p>
      @if (!empty($transaction_id))
        <p>Transaction reference:</p>
        <code>{{ $transaction_id }}</code>
      @endif
      @if (!empty($return_url))
        <div class="actions">
          <a class="primary" href="{{ $wallet_url ?? $return_url }}">Return to wallet</a>
          <a class="secondary" href="{{ $return_url }}">Continue</a>
        </div>
      @endif
      <footer>&copy; {{ date('Y') }} Quiz Platform</footer>
    </main>
  </body>
</html>
