// Mock adapter implementing CouponsPort and MerchantsPort for demo purposes
import type {
  Coupon,
  CouponCreateInput,
  CouponUpdateInput,
  CouponFilters,
  CouponsPort,
  Merchant,
  MerchantsPort,
} from '../domain/coupons'

// Sample data
const sampleMerchants: Merchant[] = [
  { documentId: 'm1', name: 'Amazon' },
  { documentId: 'm2', name: 'Target' },
  { documentId: 'm3', name: 'Walmart' },
  { documentId: 'm4', name: 'Best Buy' },
  { documentId: 'm5', name: 'Home Depot' },
]

const sampleCoupons: Coupon[] = [
  {
    documentId: 'c1',
    coupon_uid: 'uid1',
    coupon_title: '50% Off Electronics',
    description: 'Get 50% off all electronics this week only!',
    market: 'US',
    site: 'amazon.com',
    coupon_status: 'active',
    priority: 1,
    merchant: sampleMerchants[0],
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    documentId: 'c2',
    coupon_uid: 'uid2',
    coupon_title: '20% Off Home & Garden',
    description: 'Save on all home and garden items',
    market: 'US',
    site: 'target.com',
    coupon_status: 'upcoming',
    priority: 2,
    merchant: sampleMerchants[1],
    starts_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    documentId: 'c3',
    coupon_uid: 'uid3',
    coupon_title: 'Free Shipping Weekend',
    description: 'Free shipping on all orders this weekend',
    market: 'UK',
    site: 'walmart.com',
    coupon_status: 'expired',
    priority: 3,
    merchant: sampleMerchants[2],
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

class MockCouponsAdapter implements CouponsPort {
  private getStoredCoupons(): Coupon[] {
    const stored = localStorage.getItem('mockCoupons')
    return stored ? JSON.parse(stored) : sampleCoupons
  }

  private saveCoupons(coupons: Coupon[]): void {
    localStorage.setItem('mockCoupons', JSON.stringify(coupons))
  }

  async list(filters?: CouponFilters): Promise<Coupon[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    let coupons = this.getStoredCoupons()
    
    if (filters?.q) {
      coupons = coupons.filter(c => 
        c.coupon_title?.toLowerCase().includes(filters.q!.toLowerCase()) ||
        (typeof c.description === 'string' && c.description.toLowerCase().includes(filters.q!.toLowerCase()))
      )
    }
    if (filters?.merchant) {
      coupons = coupons.filter(c => 
        c.merchant?.name?.toLowerCase().includes(filters.merchant!.toLowerCase())
      )
    }
    if (filters?.market) {
      coupons = coupons.filter(c => c.market === filters.market)
    }
    if (filters?.site) {
      coupons = coupons.filter(c => c.site === filters.site)
    }
    if (filters?.coupon_status) {
      coupons = coupons.filter(c => c.coupon_status === filters.coupon_status)
    }
    
    return coupons.sort((a, b) => (a.priority || 0) - (b.priority || 0))
  }

  async create(input: CouponCreateInput): Promise<Coupon> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const coupons = this.getStoredCoupons()
    
    const newCoupon: Coupon = {
      documentId: `c${Date.now()}`,
      coupon_uid: `uid${Date.now()}`,
      coupon_title: input.coupon_title,
      priority: input.priority,
      market: input.market,
      value: input.value,
      code: input.code,
      coupon_type: input.coupon_type,
      affiliate_link: input.affiliate_link,
      description: input.description,
      editor_tips: input.editor_tips,
      starts_at: input.starts_at,
      expires_at: input.expires_at,
      site: input.site,
      merchant: input.merchant ? sampleMerchants.find(m => m.documentId === input.merchant) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    coupons.push(newCoupon)
    this.saveCoupons(coupons)
    return newCoupon
  }

  async update(documentId: string, patch: CouponUpdateInput): Promise<Coupon> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const coupons = this.getStoredCoupons()
    const index = coupons.findIndex(c => c.documentId === documentId)
    
    if (index === -1) {
      throw new Error('Coupon not found')
    }

    const updatedCoupon = { ...coupons[index] }
    
    // Handle all fields from patch
    Object.keys(patch).forEach(key => {
      if (key === 'merchant' && typeof patch.merchant === 'string') {
        // Find the merchant by documentId
        const merchant = sampleMerchants.find(m => m.documentId === patch.merchant)
        updatedCoupon.merchant = merchant
      } else {
        ;(updatedCoupon as any)[key] = (patch as any)[key]
      }
    })
    
    updatedCoupon.updatedAt = new Date().toISOString()
    coupons[index] = updatedCoupon
    
    this.saveCoupons(coupons)
    return coupons[index]
  }

  async remove(documentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const coupons = this.getStoredCoupons()
    const filtered = coupons.filter(c => c.documentId !== documentId)
    this.saveCoupons(filtered)
  }

  async reorder(documentIds: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const coupons = this.getStoredCoupons()
    
    documentIds.forEach((documentId, index) => {
      const coupon = coupons.find(c => c.documentId === documentId)
      if (coupon) {
        coupon.priority = index + 1
        coupon.updatedAt = new Date().toISOString()
      }
    })
    
    this.saveCoupons(coupons)
  }
}

class MockMerchantsAdapter implements MerchantsPort {
  async list(): Promise<Merchant[]> {
    await new Promise(resolve => setTimeout(resolve, 100))
    return sampleMerchants
  }
}

export const mockCouponsAdapter = new MockCouponsAdapter()
export const mockMerchantsAdapter = new MockMerchantsAdapter()