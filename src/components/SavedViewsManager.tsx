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
    id: 'us',
    name: 'US',
    filters: { market: 'US' },
    isQuick: true
  },
  {
    id: 'uk',
    name: 'UK', 
    filters: { market: 'UK' },
    isQuick: true
  },
  {
    id: 'ca',
    name: 'CA',
    filters: { market: 'CA' },
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
      {/* Quick View Badges */}
      <div className="flex gap-1">
        {QUICK_VIEWS.map(view => (
          <Badge
            key={view.id}
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleApplyView(view)}
          >
            {view.name}
          </Badge>
        ))}
      </div>

      {/* Saved Views Dropdown */}
      {savedViews.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Bookmark className="h-3 w-3 mr-1" />
              Saved
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-1">
              {savedViews.map(view => (
                <div key={view.id} className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start"
                    onClick={() => handleApplyView(view)}
                  >
                    {view.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteView(view.id)}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Save Current View */}
      {hasActiveFilters && (
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Save View
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
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
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCurrentView}
                  disabled={!newViewName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          Clear
        </Button>
      )}
    </div>
  )
}