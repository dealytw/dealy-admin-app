import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { RefreshCw, Database, Home, ShoppingCart, AlertCircle, CheckCircle, Store, Tag } from 'lucide-react'
import { merchantsAdapter } from '../data/strapiCoupons'
import type { Merchant } from '../domain/coupons'

interface CacheStatus {
  id: string
  name: string
  type: 'coupon' | 'merchant' | 'homepage' | 'sitemap' | 'special-offers' | 'merchants-list'
  status: 'fresh' | 'stale' | 'error'
  lastRefreshed: string
  description: string
  path?: string
}

export function CouponCacheManagement() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [cacheStatuses, setCacheStatuses] = useState<CacheStatus[]>([])
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true)

  // Load merchants and build cache statuses
  useEffect(() => {
    const loadMerchants = async () => {
      try {
        setIsLoadingMerchants(true)
        const merchantsData = await merchantsAdapter.list()
        setMerchants(merchantsData)
        
        // Build cache statuses with merchants
        const baseCacheStatuses: CacheStatus[] = [
          {
            id: 'homepage',
            name: 'Homepage',
            type: 'homepage',
            status: 'fresh',
            lastRefreshed: '2 hours ago',
            description: 'Main landing page with featured coupons',
            path: '/'
          },
          {
            id: 'sitemap',
            name: 'Sitemap',
            type: 'sitemap',
            status: 'fresh',
            lastRefreshed: '5 minutes ago',
            description: 'SEO sitemap for search engines',
            path: '/sitemap.xml'
          },
          {
            id: 'merchants-list',
            name: 'Merchants List',
            type: 'merchants-list',
            status: 'fresh',
            lastRefreshed: '1 hour ago',
            description: 'All merchants listing page',
            path: '/shop'
          },
          {
            id: 'special-offers',
            name: 'Special Offers',
            type: 'special-offers',
            status: 'fresh',
            lastRefreshed: '30 minutes ago',
            description: 'Special offers and promotions',
            path: '/special-offers'
          }
        ]

        // Add merchant pages
        const merchantCacheStatuses: CacheStatus[] = merchantsData.map(merchant => ({
          id: `merchant:${merchant.slug}`,
          name: merchant.name,
          type: 'merchant',
          status: 'fresh',
          lastRefreshed: '1 hour ago',
          description: `${merchant.name} merchant page`,
          path: `/shop/${merchant.slug}`
        }))

        setCacheStatuses([...baseCacheStatuses, ...merchantCacheStatuses])
      } catch (error) {
        console.error('Failed to load merchants:', error)
        // Fallback to basic cache statuses
        setCacheStatuses([
          {
            id: 'homepage',
            name: 'Homepage',
            type: 'homepage',
            status: 'fresh',
            lastRefreshed: '2 hours ago',
            description: 'Main landing page with featured coupons',
            path: '/'
          },
          {
            id: 'sitemap',
            name: 'Sitemap',
            type: 'sitemap',
            status: 'fresh',
            lastRefreshed: '5 minutes ago',
            description: 'SEO sitemap for search engines',
            path: '/sitemap.xml'
          }
        ])
      } finally {
        setIsLoadingMerchants(false)
      }
    }

    loadMerchants()
  }, [])

  const refreshCache = async (cacheId: string) => {
    setIsRefreshing(true)
    try {
      console.log(`🔄 Refreshing cache: ${cacheId}`)

      // Find the cache entry to determine the correct revalidation strategy
      const cacheEntry = cacheStatuses.find(s => s.id === cacheId)
      if (!cacheEntry) {
        throw new Error(`Cache entry not found: ${cacheId}`)
      }

      // Build revalidation payload based on cache type
      let payload: { tags?: string[], paths?: string[], purge: boolean } = { purge: true }

      if (cacheEntry.type === 'merchant') {
        // For merchant pages, use both tag and path
        payload.tags = [cacheId] // merchant:slug
        payload.paths = [cacheEntry.path || `/shop/${cacheId.replace('merchant:', '')}`]
      } else if (cacheEntry.type === 'homepage') {
        payload.tags = ['list:home']
        payload.paths = ['/']
      } else if (cacheEntry.type === 'sitemap') {
        payload.tags = ['sitemap']
        payload.paths = ['/sitemap.xml']
      } else if (cacheEntry.type === 'merchants-list') {
        payload.tags = ['merchants:list']
        payload.paths = ['/shop']
      } else if (cacheEntry.type === 'special-offers') {
        payload.tags = ['list:special']
        payload.paths = ['/special-offers']
      } else {
        // Fallback to tag-based revalidation
        payload.tags = [cacheId]
      }

      console.log(`📡 Revalidation payload:`, payload)

      // Call the new admin coupon revalidation API
      const response = await fetch(`https://www.dealy.tw/api/admin/coupon-revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': '4c0ba27523f4b4bf260bb4bf6aa785a27a2ba36c6dd0ec3a75a109c33e245ca9'
        },
        body: JSON.stringify(payload)
      })

      console.log(`📡 API Response Status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Error ${response.status}:`, errorText)
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ API Response:`, result)

      if (result.ok) {
        // Update cache status
        setCacheStatuses(prev => prev.map(s =>
          s.id === cacheId
            ? { ...s, status: 'fresh' as const, lastRefreshed: 'Just now' }
            : s
        ))
        console.log(`✅ Cache refreshed successfully: ${cacheId}`)
      } else {
        throw new Error(result.error || 'Failed to refresh cache')
      }
    } catch (error) {
      console.error(`❌ Failed to refresh cache ${cacheId}:`, error)
      setCacheStatuses(prev => prev.map(s =>
        s.id === cacheId
          ? { ...s, status: 'error' as const }
          : s
      ))

      // Show user-friendly error message
      alert(`Failed to refresh ${cacheId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const refreshAllCaches = async () => {
    setIsRefreshing(true)
    try {
      console.log('🔄 Refreshing all caches...')

      // Refresh all major sections
      const response = await fetch(`https://www.dealy.tw/api/admin/coupon-revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': '4c0ba27523f4b4bf260bb4bf6aa785a27a2ba36c6dd0ec3a75a109c33e245ca9'
        },
        body: JSON.stringify({
          tags: ['list:home', 'sitemap', 'merchants:list', 'list:special'],
          paths: ['/', '/sitemap.xml', '/shop', '/special-offers'],
          purge: true
        })
      })

      if (!response.ok) {
        throw new Error(`API Error ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ All caches refreshed:', result)

      if (result.ok) {
        // Update all cache statuses
        setCacheStatuses(prev => prev.map(s => ({
          ...s,
          status: 'fresh' as const,
          lastRefreshed: 'Just now'
        })))
      }
    } catch (error) {
      console.error('❌ Failed to refresh all caches:', error)
      alert(`Failed to refresh all caches: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = (status: CacheStatus['status']) => {
    switch (status) {
      case 'fresh':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'stale':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusBadge = (status: CacheStatus['status']) => {
    switch (status) {
      case 'fresh':
        return <Badge variant="default" className="bg-green-600">Fresh</Badge>
      case 'stale':
        return <Badge variant="secondary" className="bg-yellow-600">Stale</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  const getTypeIcon = (type: CacheStatus['type']) => {
    switch (type) {
      case 'homepage':
        return <Home className="h-4 w-4" />
      case 'sitemap':
        return <Database className="h-4 w-4" />
      case 'coupon':
        return <ShoppingCart className="h-4 w-4" />
      case 'merchant':
        return <Store className="h-4 w-4" />
      case 'merchants-list':
        return <Store className="h-4 w-4" />
      case 'special-offers':
        return <Tag className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cache Management</h2>
          <p className="text-muted-foreground">
            Manage frontend cache for optimal performance
          </p>
        </div>
        <Button 
          onClick={refreshAllCaches}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Loading State */}
      {isLoadingMerchants && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading merchants and cache data...</p>
          </div>
        </div>
      )}

      {/* Cache Status Grid */}
      {!isLoadingMerchants && (
        <div className="space-y-6">
          {/* Group by type */}
          {['homepage', 'sitemap', 'merchants-list', 'special-offers'].map(type => {
            const entries = cacheStatuses.filter(s => s.type === type)
            if (entries.length === 0) return null
            
            return (
              <div key={type}>
                <h3 className="text-lg font-semibold mb-4 capitalize">
                  {type === 'merchants-list' ? 'Merchants List' : 
                   type === 'special-offers' ? 'Special Offers' : 
                   type.charAt(0).toUpperCase() + type.slice(1)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((cache) => (
                    <Card key={cache.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(cache.type)}
                            <CardTitle className="text-lg">{cache.name}</CardTitle>
                          </div>
                          {getStatusIcon(cache.status)}
                        </div>
                        <CardDescription className="text-sm">
                          {cache.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          {getStatusBadge(cache.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last refreshed:</span>
                          <span className="text-sm font-medium">{cache.lastRefreshed}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshCache(cache.id)}
                          disabled={isRefreshing}
                          className="w-full"
                        >
                          <RefreshCw className={`h-3 w-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Merchants Section */}
          {merchants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Individual Merchants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cacheStatuses.filter(s => s.type === 'merchant').map((cache) => (
                  <Card key={cache.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(cache.type)}
                          <CardTitle className="text-lg">{cache.name}</CardTitle>
                        </div>
                        {getStatusIcon(cache.status)}
                      </div>
                      <CardDescription className="text-sm">
                        {cache.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        {getStatusBadge(cache.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last refreshed:</span>
                        <span className="text-sm font-medium">{cache.lastRefreshed}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshCache(cache.id)}
                        disabled={isRefreshing}
                        className="w-full"
                      >
                        <RefreshCw className={`h-3 w-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common cache management operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => refreshCache('homepage')}
              disabled={isRefreshing}
            >
              <Home className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Homepage</div>
                <div className="text-sm text-muted-foreground">Refresh main page</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => refreshCache('sitemap')}
              disabled={isRefreshing}
            >
              <Database className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Sitemap</div>
                <div className="text-sm text-muted-foreground">Update SEO sitemap</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => refreshCache('merchants-list')}
              disabled={isRefreshing}
            >
              <Store className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Merchants List</div>
                <div className="text-sm text-muted-foreground">Refresh /shop page</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => refreshCache('special-offers')}
              disabled={isRefreshing}
            >
              <Tag className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Special Offers</div>
                <div className="text-sm text-muted-foreground">Refresh promotions</div>
              </div>
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex flex-col items-center space-y-2"
              onClick={refreshAllCaches}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
              <div className="text-center">
                <div className="font-medium">Refresh All Caches</div>
                <div className="text-sm text-muted-foreground">Refresh everything at once</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
