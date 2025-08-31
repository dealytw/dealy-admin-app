// Next.js API adapter implementing CouponsPort and MerchantsPort
import type {
  Coupon,
  CouponCreateInput,
  CouponUpdateInput,
  CouponFilters,
  CouponsPort,
  Merchant,
  MerchantsPort,
} from '../domain/coupons'
import { nextApiClient } from './nextApiClient'

class NextApiCouponsAdapter implements CouponsPort {
  async list(filters?: CouponFilters): Promise<Coupon[]> {
    const params = new URLSearchParams()
    
    if (filters?.q) {
      params.set('filters[coupon_title][$containsi]', filters.q)
    }
    if (filters?.market) {
      params.set('filters[market][$eq]', filters.market)
    }
    if (filters?.site) {
      params.set('filters[site][$eq]', filters.site)
    }
    if (filters?.coupon_status) {
      params.set('filters[coupon_status][$eq]', filters.coupon_status)
    }

    const queryString = params.toString()
    const endpoint = `/coupons${queryString ? `?${queryString}` : ''}`
    
    const response = await nextApiClient.get(endpoint)
    return response.data || []
  }

  async create(input: CouponCreateInput): Promise<Coupon> {
    const response = await nextApiClient.post('/coupons', input)
    return response.data
  }

  async update(documentId: string, patch: CouponUpdateInput): Promise<Coupon> {
    const response = await nextApiClient.put(`/coupons?documentId=${documentId}`, patch)
    return response.data
  }

  async remove(documentId: string): Promise<void> {
    await nextApiClient.delete(`/coupons?documentId=${documentId}`)
  }

  async reorder(documentIds: string[]): Promise<void> {
    // Update priority for each coupon sequentially
    const updates = documentIds.map((documentId, index) =>
      this.update(documentId, { priority: index + 1 })
    )
    await Promise.all(updates)
  }
}

class NextApiMerchantsAdapter implements MerchantsPort {
  async list(): Promise<Merchant[]> {
    const response = await nextApiClient.get('/merchants')
    return response.data || []
  }
}

export const nextApiCouponsAdapter = new NextApiCouponsAdapter()
export const nextApiMerchantsAdapter = new NextApiMerchantsAdapter()
