// Strapi adapter implementing CouponsPort and MerchantsPort
import type {
  Coupon,
  CouponCreateInput,
  CouponUpdateInput,
  CouponFilters,
  CouponsPort,
  Merchant,
  MerchantsPort,
  Site,
  SitesPort,
} from '../domain/coupons'
import { sfetch } from '../api/strapiClient'

class StrapiCouponsAdapter implements CouponsPort {
  async list(filters?: CouponFilters): Promise<Coupon[]> {
    const params = new URLSearchParams({
      'sort': 'priority:asc',
      'pagination[pageSize]': '500',
      'populate[0]': 'merchant', // Populate merchant relation
      'populate[1]': 'market',   // Populate market relation
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
      console.log('First coupon market field:', response.data[0].market)
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
      // Don't set market if not provided - let Strapi handle default
      ...(input.market && { market: input.market }),
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
    // Handle null values properly - send them explicitly to API
    const cleanPatch = {
      ...patch,
      // Keep empty strings as empty strings for affiliate_link and code
      // CMS expects string type, so empty string is valid
      affiliate_link: patch.affiliate_link,
      code: patch.code,
      // For other fields: convert empty strings to undefined
      description: patch.description === '' ? undefined : patch.description,
      editor_tips: patch.editor_tips === '' ? undefined : patch.editor_tips,
      value: patch.value === '' ? undefined : patch.value,
    }
    
    // Remove only undefined values, but keep empty strings and null values
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

class StrapiSitesAdapter implements SitesPort {
  async list(): Promise<Site[]> {
    try {
      console.log('Fetching sites from Strapi...')
      
      const response = await sfetch('/api/sites?pagination[pageSize]=500&sort=name:asc')
      console.log('Sites response:', response)
      
      // Log the first site to see the structure
      if (response.data && response.data.length > 0) {
        console.log('First site structure:', response.data[0])
        console.log('Available site fields:', Object.keys(response.data[0]))
      }
      
      // Map the Strapi field names to our domain model
      const mappedSites = (response.data || []).map((site: any) => ({
        documentId: site.documentId,
        name: site.name,
        key: site.key
      }))
      
      console.log('Mapped sites:', mappedSites)
      return mappedSites
    } catch (error) {
      console.error('Error fetching sites:', error)
      
      // Return mock sites as fallback
      console.log('Using mock sites as fallback')
      return [
        { documentId: 'TW', name: 'Taiwan', key: 'TW' },
        { documentId: 'HK', name: 'Hong Kong', key: 'HK' },
        { documentId: 'JP', name: 'Japan', key: 'JP' },
        { documentId: 'KR', name: 'Korea', key: 'KR' },
        { documentId: 'SG', name: 'Singapore', key: 'SG' },
        { documentId: 'MY', name: 'Malaysia', key: 'MY' }
      ]
    }
  }
}

export const couponsAdapter = new StrapiCouponsAdapter()
export const merchantsAdapter = new StrapiMerchantsAdapter()
export const sitesAdapter = new StrapiSitesAdapter()