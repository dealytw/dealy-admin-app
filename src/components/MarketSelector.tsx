import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import type { Site } from '../domain/coupons'
import { sitesAdapter } from '../data/strapiCoupons'
import { useToast } from '../hooks/use-toast'
import { Search, Loader2 } from 'lucide-react'

interface MarketSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (site: Site) => void
  currentSite?: Site
}

export function MarketSelector({
  isOpen,
  onClose,
  onSelect,
  currentSite,
}: MarketSelectorProps) {
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadSites()
    }
  }, [isOpen])

  useEffect(() => {
    if (search) {
      setFilteredSites(
        sites.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.key && s.key.toLowerCase().includes(search.toLowerCase()))
        )
      )
    } else {
      setFilteredSites(sites)
    }
  }, [search, sites])

  const loadSites = async () => {
    setIsLoading(true)
    try {
      const data = await sitesAdapter.list()
      setSites(data)
      setFilteredSites(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load markets',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (site: Site) => {
    onSelect(site)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Market</DialogTitle>
          <DialogDescription>
            Choose a market for this coupon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search markets</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or key..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredSites.map((site) => (
                  <Button
                    key={site.documentId}
                    variant={
                      currentSite?.documentId === site.documentId
                        ? 'default'
                        : 'outline'
                    }
                    className="w-full justify-start"
                    onClick={() => handleSelect(site)}
                  >
                    {site.name} {site.key && `(${site.key})`}
                  </Button>
                ))}
                {filteredSites.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No markets found
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
