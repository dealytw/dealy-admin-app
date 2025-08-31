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
import { sfetch } from '../api/strapiClient'

class StrapiCouponsAdapter implements CouponsPort {
  async list(filters?: CouponFilters): Promise<Coupon[]> {
    const params = new URLSearchParams({
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

    const response = await sfetch(`/api/coupons?${params}`)
    return response.data || []
  }

  async create(input: CouponCreateInput): Promise<Coupon> {
    // Ensure required fields are not null/undefined
    const cleanInput = {
      ...input,
      affiliate_link: input.affiliate_link || '',
      description: input.description || '',
      editor_tips: input.editor_tips || '',
      value: input.value || '',
      code: input.code || '',
      market: input.market || 'HK',
      coupon_type: input.coupon_type || 'promo_code',
      coupon_status: 'active' as const,
    }
    
    const response = await sfetch('/api/coupons', {
      method: 'POST',
      body: JSON.stringify({ data: cleanInput }),
    })
    return response.data
  }

  async update(documentId: string, patch: CouponUpdateInput): Promise<Coupon> {
    // Ensure required fields are not null/undefined
    const cleanPatch = {
      ...patch,
      affiliate_link: patch.affiliate_link ?? undefined, // Only send if not null
      description: patch.description ?? undefined,
      editor_tips: patch.editor_tips ?? undefined,
      value: patch.value ?? undefined,
      code: patch.code ?? undefined,
    }
    
    // Remove undefined values to avoid sending them
    Object.keys(cleanPatch).forEach(key => {
      if (cleanPatch[key as keyof typeof cleanPatch] === undefined) {
        delete cleanPatch[key as keyof typeof cleanPatch]
      }
    })
    
    const response = await sfetch(`/api/coupons/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: cleanPatch }),
    })
    return response.data
  }

  async remove(documentId: string): Promise<void> {
    await sfetch(`/api/coupons/${documentId}`, { method: 'DELETE' })
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
    const response = await sfetch(
      '/api/merchants?pagination[pageSize]=500&sort=merchant_name:asc'
    )
    // Map the Strapi field names to our domain model
    return (response.data || []).map((merchant: any) => ({
      documentId: merchant.documentId,
      name: merchant.merchant_name, // Map merchant_name to name
      slug: merchant.slug
    }))
  }
}

export const couponsAdapter = new StrapiCouponsAdapter()
export const merchantsAdapter = new StrapiMerchantsAdapter()