import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Progress } from '../components/ui/progress'
import { useAuth } from '../contexts/AuthContext'
import { mockCouponsAdapter as couponsAdapter } from '../data/mockCoupons'
import type { Coupon } from '../domain/coupons'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Activity,
  Calendar,
  Globe,
  Target,
  BarChart3,
  LogOut,
  Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DashboardStats {
  totalCoupons: number
  activeCoupons: number
  upcomingCoupons: number
  expiredCoupons: number
  totalMerchants: number
  marketDistribution: { [key: string]: number }
  statusDistribution: { [key: string]: number }
  recentActivity: Array<{
    id: string
    type: 'created' | 'updated' | 'expired'
    coupon: string
    timestamp: string
  }>
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const coupons = await couponsAdapter.list()
      
      // Calculate statistics
      const stats: DashboardStats = {
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.coupon_status === 'active').length,
        upcomingCoupons: coupons.filter(c => c.coupon_status === 'upcoming').length,
        expiredCoupons: coupons.filter(c => c.coupon_status === 'expired').length,
        totalMerchants: new Set(coupons.map(c => c.merchant?.documentId).filter(Boolean)).size,
        marketDistribution: coupons.reduce((acc, c) => {
          if (c.market) {
            acc[c.market] = (acc[c.market] || 0) + 1
          }
          return acc
        }, {} as { [key: string]: number }),
        statusDistribution: coupons.reduce((acc, c) => {
          if (c.coupon_status) {
            acc[c.coupon_status] = (acc[c.coupon_status] || 0) + 1
          }
          return acc
        }, {} as { [key: string]: number }),
        recentActivity: coupons.slice(-5).map(c => ({
          id: c.documentId,
          type: 'created' as const,
          coupon: c.coupon_title,
          timestamp: c.createdAt || new Date().toISOString()
        }))
      }
      
      setStats(stats)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  const activePercentage = stats.totalCoupons > 0 ? (stats.activeCoupons / stats.totalCoupons) * 100 : 0

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Coupon management overview
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={() => navigate('/coupon-editor')}>
              <Plus className="h-4 w-4 mr-2" />
              Manage Coupons
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCoupons}</div>
              <p className="text-xs text-muted-foreground">
                Across all merchants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeCoupons}</div>
              <p className="text-xs text-muted-foreground">
                {activePercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.upcomingCoupons}</div>
              <p className="text-xs text-muted-foreground">
                Ready to launch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMerchants}</div>
              <p className="text-xs text-muted-foreground">
                Active partnerships
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="markets">Markets</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Coupon Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Current status breakdown of all coupons
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.statusDistribution).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            status === 'active' ? 'default' : 
                            status === 'upcoming' ? 'secondary' : 'outline'
                          }
                        >
                          {status}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <Progress 
                          value={(count / stats.totalCoupons) * 100} 
                          className="w-16 h-2" 
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Key performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{activePercentage.toFixed(1)}%</span>
                      <Progress value={activePercentage} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Merchant Coverage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{stats.totalMerchants}</span>
                      <Badge variant="outline">merchants</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average per Merchant</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {stats.totalMerchants > 0 ? (stats.totalCoupons / stats.totalMerchants).toFixed(1) : '0'}
                      </span>
                      <Badge variant="outline">coupons</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="markets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Market Distribution
                </CardTitle>
                <CardDescription>
                  Coupons breakdown by geographic market
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.marketDistribution).length > 0 ? (
                    Object.entries(stats.marketDistribution).map(([market, count]) => (
                      <div key={market} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{market}</Badge>
                          <span className="text-sm text-muted-foreground">Market</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <Progress 
                            value={(count / stats.totalCoupons) * 100} 
                            className="w-20 h-2" 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No market data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest coupon management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={activity.type === 'created' ? 'default' : 'secondary'}
                          >
                            {activity.type}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{activity.coupon}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}