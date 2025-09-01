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
  visibleColumns?: Record<string, boolean>
  isQuick?: boolean
}

interface SavedViewsManagerProps {
  filters: CouponFilters
  onFiltersChange: (filters: CouponFilters) => void
  visibleColumns?: Record<string, boolean>
  onVisibleColumnsChange?: (columns: Record<string, boolean>) => void
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

export function SavedViewsManager({ 
  filters, 
  onFiltersChange, 
  visibleColumns, 
  onVisibleColumnsChange 
}: SavedViewsManagerProps) {
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
      filters: { ...filters },
      visibleColumns: visibleColumns ? { ...visibleColumns } : undefined
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
    if (view.visibleColumns && onVisibleColumnsChange) {
      onVisibleColumnsChange(view.visibleColumns)
    }
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

      {/* Save Current View Button */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Save View
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Enter view name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCurrentView()
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This will save your current filters and column visibility settings.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCurrentView} disabled={!newViewName.trim()}>
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Views Dropdown */}
      {savedViews.length > 0 && (
        <Select onValueChange={(value) => {
          const view = savedViews.find(v => v.id === value)
          if (view) handleApplyView(view)
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Saved Views" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.map(view => (
              <SelectItem key={view.id} value={view.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{view.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteView(view.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}