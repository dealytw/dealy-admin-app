import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Label } from './ui/label'
import { Bookmark, Plus, Settings, Trash2 } from 'lucide-react'
import type { CouponFilters } from '../domain/coupons'

interface SavedView {
  id: string
  name: string
  filters: CouponFilters
  isQuick?: boolean
}

interface SavedViewsManagerProps {
  filters: CouponFilters
  onFiltersChange: (filters: CouponFilters) => void
}

const QUICK_VIEWS: SavedView[] = [
  {
    id: 'all',
    name: 'All',
    filters: {},
    isQuick: true
  },
  {
    id: 'hk',
    name: 'HK',
    filters: { market: 'HK' },
    isQuick: true
  },
  {
    id: 'tw',
    name: 'TW', 
    filters: { market: 'TW' },
    isQuick: true
  },
  {
    id: 'jp',
    name: 'JP',
    filters: { market: 'JP' },
    isQuick: true
  },
  {
    id: 'kr',
    name: 'KR',
    filters: { market: 'KR' },
    isQuick: true
  },
  {
    id: 'sg',
    name: 'SG',
    filters: { market: 'SG' },
    isQuick: true
  },
  {
    id: 'my',
    name: 'MY',
    filters: { market: 'MY' },
    isQuick: true
  }
]

export function SavedViewsManager({ filters, onFiltersChange }: SavedViewsManagerProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [newViewName, setNewViewName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('coupon-saved-views')
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load saved views:', error)
      }
    }
  }, [])

  // Save to localStorage when views change
  const saveViews = (views: SavedView[]) => {
    setSavedViews(views)
    localStorage.setItem('coupon-saved-views', JSON.stringify(views))
  }

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return

    const newView: SavedView = {
      id: `custom-${Date.now()}`,
      name: newViewName.trim(),
      filters: { ...filters }
    }

    saveViews([...savedViews, newView])
    setNewViewName('')
    setShowSaveDialog(false)
  }

  const handleDeleteView = (viewId: string) => {
    saveViews(savedViews.filter(view => view.id !== viewId))
  }

  const handleApplyView = (view: SavedView) => {
    onFiltersChange(view.filters)
  }

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof CouponFilters])
  const allViews = [...QUICK_VIEWS, ...savedViews]

  return (
    <div className="flex items-center gap-2">
      {/* Market Filter Badges */}
      <div className="flex gap-1">
        {QUICK_VIEWS.map(view => (
          <Badge
            key={view.id}
            variant={filters.market === view.filters.market ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleApplyView(view)}
          >
            {view.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}