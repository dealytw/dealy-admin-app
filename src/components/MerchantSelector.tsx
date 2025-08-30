import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import type { Merchant } from '../domain/coupons'
import { mockMerchantsAdapter as merchantsAdapter } from '../data/mockCoupons'
import { useToast } from '../hooks/use-toast'
import { Search, Loader2 } from 'lucide-react'

interface MerchantSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (merchant: Merchant) => void
  currentMerchant?: Merchant
}

export function MerchantSelector({
  isOpen,
  onClose,
  onSelect,
  currentMerchant,
}: MerchantSelectorProps) {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadMerchants()
    }
  }, [isOpen])

  useEffect(() => {
    if (search) {
      setFilteredMerchants(
        merchants.filter((m) =>
          m.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      setFilteredMerchants(merchants)
    }
  }, [search, merchants])

  const loadMerchants = async () => {
    setIsLoading(true)
    try {
      const data = await merchantsAdapter.list()
      setMerchants(data)
      setFilteredMerchants(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load merchants',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (merchant: Merchant) => {
    onSelect(merchant)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Merchant</DialogTitle>
          <DialogDescription>
            Choose a merchant for this coupon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search merchants</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name..."
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
                {filteredMerchants.map((merchant) => (
                  <Button
                    key={merchant.documentId}
                    variant={
                      currentMerchant?.documentId === merchant.documentId
                        ? 'default'
                        : 'outline'
                    }
                    className="w-full justify-start"
                    onClick={() => handleSelect(merchant)}
                  >
                    {merchant.name}
                  </Button>
                ))}
                {filteredMerchants.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No merchants found
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