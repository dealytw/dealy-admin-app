// Real Strapi v5 adapter implementing CouponsPort and MerchantsPort
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

// Strapi v5 specific response types
interface StrapiResponse<T> {
  data: T
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

interface StrapiEntity<T> {
  id: string
  attributes: T
  createdAt: string
  updatedAt: string
}

// Transform Strapi response to domain model
function transformCoupon(strapiCoupon: StrapiEntity<any>): Coupon {
  const { id, attributes } = strapiCoupon
  
  return {
    documentId: id,
    coupon_uid: attributes.coupon_uid || id,
    merchant: attributes.merchant?.data ? {
      documentId: attributes.merchant.data.id,
      name: attributes.merchant.data.attributes.name,
      slug: attributes.merchant.data.attributes.slug,
    } : undefined,
    market: attributes.market,
    coupon_title: attributes.coupon_title,
    value: attributes.value,
    code: attributes.code,
    coupon_type: attributes.coupon_type,
    affiliate_link: attributes.affiliate_link,
    description: attributes.description,
    editor_tips: attributes.editor_tips,
    priority: attributes.priority || 1,
    starts_at: attributes.starts_at,
    expires_at: attributes.expires_at,
    coupon_status: attributes.coupon_status,
    user_count: attributes.user_count,
    last_click_at: attributes.last_click_at,
    display_count: attributes.display_count,
    site: attributes.site,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt,
  }
}

function transformMerchant(strapiMerchant: StrapiEntity<any>): Merchant {
  const { id, attributes } = strapiMerchant
  
  return {
    documentId: id,
    name: attributes.name,
    slug: attributes.slug,
  }
}

class StrapiCouponsAdapter implements CouponsPort {
  async list(filters?: CouponFilters): Promise<Coupon[]> {
    try {
      // Build query parameters for Strapi v5
      const params = new URLSearchParams()
      
      // Populate merchant relation
      params.append('populate[merchant]', '*')
      
      // Add filters
      if (filters?.q) {
        params.append('filters[$or][0][coupon_title][$containsi]', filters.q)
        params.append('filters[$or][1][description][$containsi]', filters.q)
      }
      
      if (filters?.merchant) {
        params.append('filters[merchant][name][$containsi]', filters.merchant)
      }
      
      if (filters?.market) {
        params.append('filters[market][$eq]', filters.market)
      }
      
      if (filters?.site) {
        params.append('filters[site][$eq]', filters.site)
      }
      
      if (filters?.coupon_status) {
        params.append('filters[coupon_status][$eq]', filters.coupon_status)
      }
      
      // Sort by priority
      params.append('sort', 'priority:asc')
      
      const response = await strapiClient.get(`/api/coupons?${params.toString()}`)
      const strapiResponse: StrapiResponse<StrapiEntity<any>[]> = response
      
      return strapiResponse.data.map(transformCoupon)
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
      throw new Error('Failed to fetch coupons')
    }
  }

  async create(input: CouponCreateInput): Promise<Coupon> {
    try {
      // Strapi v5 requires data wrapper
      const strapiData = {
        data: {
          coupon_title: input.coupon_title,
          merchant: input.merchant ? { connect: [input.merchant] } : undefined,
          market: input.market,
          value: input.value,
          code: input.code,
          coupon_type: input.coupon_type,
          affiliate_link: input.affiliate_link,
          description: input.description,
          editor_tips: input.editor_tips,
          priority: input.priority,
          starts_at: input.starts_at,
          expires_at: input.expires_at,
          site: input.site,
        }
      }
      
      const response = await strapiClient.post('/api/coupons', strapiData)
      const strapiResponse: StrapiResponse<StrapiEntity<any>> = response
      
      return transformCoupon(strapiResponse.data)
    } catch (error) {
      console.error('Failed to create coupon:', error)
      throw new Error('Failed to create coupon')
    }
  }

  async update(documentId: string, patch: CouponUpdateInput): Promise<Coupon> {
    try {
      // Strapi v5 requires data wrapper
      const strapiData = {
        data: {
          ...(patch.coupon_title !== undefined && { coupon_title: patch.coupon_title }),
          ...(patch.merchant !== undefined && { merchant: { connect: [patch.merchant] } }),
          ...(patch.market !== undefined && { market: patch.market }),
          ...(patch.value !== undefined && { value: patch.value }),
          ...(patch.code !== undefined && { code: patch.code }),
          ...(patch.coupon_type !== undefined && { coupon_type: patch.coupon_type }),
          ...(patch.affiliate_link !== undefined && { affiliate_link: patch.affiliate_link }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.editor_tips !== undefined && { editor_tips: patch.editor_tips }),
          ...(patch.priority !== undefined && { priority: patch.priority }),
          ...(patch.starts_at !== undefined && { starts_at: patch.starts_at }),
          ...(patch.expires_at !== undefined && { expires_at: patch.expires_at }),
          ...(patch.coupon_status !== undefined && { coupon_status: patch.coupon_status }),
          ...(patch.site !== undefined && { site: patch.site }),
        }
      }
      
      const response = await strapiClient.put(`/api/coupons/${documentId}`, strapiData)
      const strapiResponse: StrapiResponse<StrapiEntity<any>> = response
      
      return transformCoupon(strapiResponse.data)
    } catch (error) {
      console.error('Failed to update coupon:', error)
      throw new Error('Failed to update coupon')
    }
  }

  async remove(documentId: string): Promise<void> {
    try {
      await strapiClient.delete(`/api/coupons/${documentId}`)
    } catch (error) {
      console.error('Failed to delete coupon:', error)
      throw new Error('Failed to delete coupon')
    }
  }

  async reorder(documentIds: string[]): Promise<void> {
    try {
      // Update priorities for all coupons in the new order
      const updatePromises = documentIds.map((documentId, index) => {
        const priority = index + 1
        return this.update(documentId, { priority })
      })
      
      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Failed to reorder coupons:', error)
      throw new Error('Failed to reorder coupons')
    }
  }
}

class StrapiMerchantsAdapter implements MerchantsPort {
  async list(): Promise<Merchant[]> {
    try {
      const response = await strapiClient.get('/api/merchants?sort=name:asc')
      const strapiResponse: StrapiResponse<StrapiEntity<any>[]> = response
      
      return strapiResponse.data.map(transformMerchant)
    } catch (error) {
      console.error('Failed to fetch merchants:', error)
      throw new Error('Failed to fetch merchants')
    }
  }
}

export const strapiCouponsAdapter = new StrapiCouponsAdapter()
export const strapiMerchantsAdapter = new StrapiMerchantsAdapter()