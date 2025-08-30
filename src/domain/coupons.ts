// Domain types and port interface for clean separation
export interface Merchant {
  documentId: string
  name: string
  slug?: string
}

export interface Coupon {
  documentId: string
  coupon_uid: string
  merchant?: Merchant
  market?: string
  coupon_title: string
  value?: string
  code?: string
  coupon_type?: string
  affiliate_link?: string
  description?: any // Rich text blocks
  editor_tips?: any // Rich text blocks
  priority: number
  starts_at?: string
  expires_at?: string
  coupon_status?: 'upcoming' | 'active' | 'expired'
  user_count?: number
  last_click_at?: string
  display_count?: number
  site?: string
  createdAt?: string
  updatedAt?: string
}

export interface CouponCreateInput {
  coupon_title: string
  merchant?: string // documentId
  market?: string
  value?: string
  code?: string
  coupon_type?: string
  affiliate_link?: string
  description?: any
  editor_tips?: any
  priority: number
  starts_at?: string
  expires_at?: string
  site?: string
}

export interface CouponUpdateInput {
  coupon_title?: string
  merchant?: string // documentId
  market?: string
  value?: string
  code?: string
  coupon_type?: string
  affiliate_link?: string
  description?: any
  editor_tips?: any
  priority?: number
  starts_at?: string
  expires_at?: string
  site?: string
}

export interface CouponFilters {
  q?: string // text search
  merchant?: string // merchant search
  market?: string
  site?: string
  coupon_status?: string
}

// Port interface - all UI depends on this, making migration easy
export interface CouponsPort {
  list(filters?: CouponFilters): Promise<Coupon[]>
  create(input: CouponCreateInput): Promise<Coupon>
  update(documentId: string, patch: CouponUpdateInput): Promise<Coupon>
  remove(documentId: string): Promise<void>
  reorder(documentIds: string[]): Promise<void>
}

export interface MerchantsPort {
  list(): Promise<Merchant[]>
}