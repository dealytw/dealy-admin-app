import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { CouponGrid } from '../components/CouponGrid'
import { RichTextRenderer } from '../components/RichTextRenderer'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { couponsAdapter } from '../data/strapiCoupons'
import type { Coupon, CouponFilters } from '../domain/coupons'
import { LogOut, Plus, RefreshCw, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function CouponEditor() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<CouponFilters>({})
  const { logout, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const loadCoupons = async (currentFilters?: CouponFilters) => {
    setIsLoading(true)
    try {
      const data = await couponsAdapter.list(currentFilters || filters)
      setCoupons(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load coupons',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const handleFiltersChange = (newFilters: CouponFilters) => {
    setFilters(newFilters)
    loadCoupons(newFilters)
  }

  const handleCreateNew = async () => {
    try {
      const maxPriority = Math.max(...coupons.map(c => c.priority), 0)
      await couponsAdapter.create({
        coupon_title: 'New Coupon',
        priority: maxPriority + 1,
      })
      loadCoupons()
      toast({
        title: 'Coupon created',
        description: 'A new coupon has been added',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Coupon Editor</h1>
            <p className="text-muted-foreground">
              Manage coupons • {coupons.length} total
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={loadCoupons} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Coupon
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading coupons...</p>
            </div>
          </div>
        ) : (
          <CouponGrid
            coupons={coupons}
            onCouponsChange={loadCoupons}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        )}
      </main>
    </div>
  )
}