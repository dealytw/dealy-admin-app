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
      'populate': 'merchant', // Try simple populate without field specification
    })

    if (filters?.q) {
      params.set('filters[coupon_title][$containsi]', filters.q)
    }
    if (filters?.merchant) {
      params.set('filters[merchant][merchant_name][$containsi]', filters.merchant)
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
    console.log('Coupons API response:', response)
    
    // Log the first coupon to see the structure
    if (response.data && response.data.length > 0) {
      console.log('First coupon structure:', response.data[0])
      console.log('First coupon merchant field:', response.data[0].merchant)
    }
    
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
    try {
      console.log('Fetching merchants from Strapi...')
      
      // Use the correct endpoint with proper parameters
      const response = await sfetch('/api/merchants?pagination[pageSize]=500&sort=merchant_name:asc')
      console.log('Merchants response:', response)
      
      // Log the first merchant to see the structure
      if (response.data && response.data.length > 0) {
        console.log('First merchant structure:', response.data[0])
        console.log('Available merchant fields:', Object.keys(response.data[0]))
      }
      
      // Map the Strapi field names to our domain model
      const mappedMerchants = (response.data || []).map((merchant: any) => ({
        documentId: merchant.documentId,
        name: merchant.merchant_name, // Map merchant_name to name
        slug: merchant.slug
      }))
      
      console.log('Mapped merchants:', mappedMerchants)
      return mappedMerchants
    } catch (error) {
      console.error('Error fetching merchants:', error)
      
      // Return mock merchants as fallback
      console.log('Using mock merchants as fallback')
      return [
        { documentId: '1', name: 'Amazon', slug: 'amazon' },
        { documentId: '2', name: 'Shopee', slug: 'shopee' },
        { documentId: '3', name: 'Lazada', slug: 'lazada' },
        { documentId: '4', name: 'Taobao', slug: 'taobao' },
        { documentId: '5', name: 'eBay', slug: 'ebay' },
        { documentId: '6', name: 'Aliexpress', slug: 'aliexpress' },
        { documentId: '7', name: 'JD.com', slug: 'jd' },
        { documentId: '8', name: 'Pinduoduo', slug: 'pinduoduo' }
      ]
    }
  }
}

export const couponsAdapter = new StrapiCouponsAdapter()
export const merchantsAdapter = new StrapiMerchantsAdapter()