// Cache revalidation utility for admin app
export interface CacheRevalidationOptions {
  merchants?: string[] // merchant slugs
  tags?: string[] // cache tags to revalidate
  paths?: string[] // specific paths to revalidate
  purge?: boolean // whether to purge Cloudflare cache
}

export async function revalidateCache(options: CacheRevalidationOptions = {}): Promise<boolean> {
  const { merchants = [], tags = [], paths = [], purge = true } = options

  try {
    console.log('🔄 Starting cache revalidation:', { merchants, tags, paths, purge })

    // Build revalidation payload
    const payload: { tags?: string[], paths?: string[], purge: boolean } = { purge }

    // Add merchant-specific tags and paths
    if (merchants.length > 0) {
      const merchantTags = merchants.map(slug => `merchant:${slug}`)
      const merchantPaths = merchants.map(slug => `/shop/${slug}`)
      
      payload.tags = [...(payload.tags || []), ...merchantTags]
      payload.paths = [...(payload.paths || []), ...merchantPaths]
    }

    // Add additional tags and paths
    if (tags.length > 0) {
      payload.tags = [...(payload.tags || []), ...tags]
    }
    if (paths.length > 0) {
      payload.paths = [...(payload.paths || []), ...paths]
    }

    // Always include homepage and sitemap for coupon changes
    payload.tags = [...(payload.tags || []), 'list:home', 'sitemap']
    payload.paths = [...(payload.paths || []), '/', '/sitemap.xml']

    console.log('📡 Cache revalidation payload:', payload)

    // Call the admin cache revalidation API
    const response = await fetch(`https://www.dealy.tw/api/admin/coupon-revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': '4c0ba27523f4b4bf260bb4bf6aa785a27a2ba36c6dd0ec3a75a109c33e245ca9'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Cache revalidation failed ${response.status}:`, errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Cache revalidation successful:', result)
    return true

  } catch (error) {
    console.error('❌ Cache revalidation error:', error)
    return false
  }
}

// Helper function to extract merchant slugs from coupon data
export function extractMerchantSlugs(coupons: any[]): string[] {
  const slugs = new Set<string>()
  
  coupons.forEach(coupon => {
    if (coupon.merchant?.slug) {
      slugs.add(coupon.merchant.slug)
    }
  })
  
  return Array.from(slugs)
}
