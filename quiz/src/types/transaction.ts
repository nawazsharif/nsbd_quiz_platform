// Transaction and Revenue Analytics Types

export interface WalletTransaction {
  id: number
  user_id: number
  transaction_id: string
  type: 'recharge' | 'quiz_purchase' | 'course_purchase' | 'quiz_sale' | 'course_sale' | 'withdrawal' | 'platform_fee' | 'publishing_fee' | 'service_charge' | 'refund'
  amount_cents: number
  status: 'pending' | 'completed' | 'failed'
  meta?: {
    provider?: string
    quiz_id?: number
    quiz_title?: string
    course_id?: number
    course_title?: string
    buyer_id?: number
    direction?: 'credit' | 'debit'
    platform_fee_cents?: number
    author_share_cents?: number
    [key: string]: any
  }
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
    email: string
  }
}

export interface TransactionSummary {
  total_recharges_cents: number
  total_purchases_cents: number
  total_sales_cents: number
  total_withdrawals_cents: number
  total_platform_fees_cents: number
  net_balance_cents: number
  transaction_count: number
  completed_count: number
  pending_count: number
  failed_count: number
}

export interface PlatformRevenue {
  id: number
  quiz_id?: number | null
  course_id?: number | null
  buyer_id?: number | null
  amount_cents: number
  source: 'quiz_purchase' | 'course_purchase' | 'course_approval_fee'
  created_at: string
  quiz?: {
    id: number
    title: string
    owner_id: number
  }
  course?: {
    id: number
    title: string
    owner_id: number
  }
  buyer?: {
    id: number
    name: string
    email: string
  }
}

export interface RevenueBreakdown {
  source: string
  total_cents: number
  count: number
}

export interface PurchaseLog {
  data: WalletTransaction[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  summary: {
    total_purchases?: number
    platform_revenue_cents?: number
    creator_revenue_cents?: number
    total_gross_cents?: number
    total_revenue_cents?: number
  }
}

export interface TransactionFilters {
  user_id?: number
  type?: string
  status?: string
  from?: string
  to?: string
  direction?: 'credit' | 'debit'
  per_page?: number
  page?: number
}
