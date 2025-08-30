// Strapi adapter implementing CouponsPort and MerchantsPort
import type {
  Coupon,
  CouponCreateInput,
  CouponUpdateInput,
  CouponFilters,
  CouponsPort,
  Merchant,
  MerchantsPort,
} from '../domain/coupons'
import { strapiClient } from './strapiClient'

class StrapiCouponsAdapter implements CouponsPort {
  async list(filters?: CouponFilters): Promise<Coupon[]> {
    const params = new URLSearchParams({
      'populate[merchant]': '*',
      'sort': 'priority:asc',
      'pagination[pageSize]': '500',
    })

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

    const response = await strapiClient.get(`/api/coupons?${params}`)
    return response.data || []
  }

  async create(input: CouponCreateInput): Promise<Coupon> {
    const response = await strapiClient.post('/api/coupons', {
      data: input,
    })
    return response.data
  }

  async update(documentId: string, patch: CouponUpdateInput): Promise<Coupon> {
    const response = await strapiClient.put(`/api/coupons/${documentId}`, {
      data: patch,
    })
    return response.data
  }

  async remove(documentId: string): Promise<void> {
    await strapiClient.delete(`/api/coupons/${documentId}`)
  }

  async reorder(documentIds: string[]): Promise<void> {
    // Update priority for each coupon sequentially
    const updates = documentIds.map((documentId, index) =>
      this.update(documentId, { priority: index + 1 })
    )
    await Promise.all(updates)
  }
}

class StrapiMerchantsAdapter implements MerchantsPort {
  async list(): Promise<Merchant[]> {
    const response = await strapiClient.get(
      '/api/merchants?pagination[pageSize]=500&sort=name:asc'
    )
    return response.data || []
  }
}

export const couponsAdapter = new StrapiCouponsAdapter()
export const merchantsAdapter = new StrapiMerchantsAdapter()