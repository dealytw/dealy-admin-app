import { useEffect, useState, useRef, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, RowDragEndEvent, SelectionChangedEvent, ICellEditorParams } from 'ag-grid-community'
// Import AG Grid CSS for proper styling
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
import { MerchantSelector } from './MerchantSelector'
import { MarketSelector } from './MarketSelector'
import { SavedViewsManager } from './SavedViewsManager'
import { ValidationCell } from './ValidationBadges'
import { RichTextRenderer } from './RichTextRenderer'
import { RichTextCellEditor } from './RichTextCellEditor'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useToast } from '../hooks/use-toast'
import type { Coupon, CouponFilters, Merchant, Site } from '../domain/coupons'
import { couponsAdapter, merchantsAdapter, sitesAdapter } from '../data/strapiCoupons'
import { Trash2, Save, RotateCcw, Users, Settings, Copy, Archive, Edit3, Clipboard, CalendarIcon, Search } from 'lucide-react'
import { format } from 'date-fns'
import { revalidateCache, extractMerchantSlugs } from '../lib/cacheRevalidation'

// API Token for Strapi Cloud authentication (same as strapiClient.ts)
const API_TOKEN = '78691c3d235968dc74694b86e2806cf5b982f373a89feae13b2195c740f58829144a8f0ac34f3652fcdf4d28a2eb8c1da457b7c53e70a9eb7b4602a0460aab4a70202e093a2c5a8c29ed8e02b686c8e437c7df758c75bfee6cae7db659c1bbc2472f54b82e476fd492721cefac6fc4c3d8125363a0ff90c5b534050ac5f4bc3e';

// --- util: optional auth header from session (works for JWT or proxy) ---
function authHeaders() {
  try {
    const raw = sessionStorage.getItem('auth');
    if (!raw) return {};
    const { jwt } = JSON.parse(raw);
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  } catch {
    return {};
  }
}

// --- util: run promises with limited concurrency ---
async function runWithConcurrency(tasks: Array<() => Promise<any>>, limit = 4) {
  const q = tasks.slice();
  const workers = Array.from({ length: Math.min(limit, q.length) }, async () => {
    while (q.length) {
      const fn = q.shift()!;
      try { await fn(); } catch (e) { console.error('reorder op failed:', e); }
    }
  });
  await Promise.all(workers);
}

// --- config: how to bucket priorities ---
// Default: per merchant only. If you want per (merchant+market+site), set COMPOSITE_KEY = true.
const COMPOSITE_KEY = false;
function bucketKey(row: any) {
  const m = row.merchant?.documentId || 'none';
  if (!COMPOSITE_KEY) return m;
  const market = row.market || '';
  const site = row.site || '';
  return `${m}|${market}|${site}`;
}

interface CouponGridProps {
  coupons: Coupon[]
  onCouponsChange: () => void
  filters: CouponFilters
  onFiltersChange: (filters: CouponFilters) => void
}

export function CouponGrid({ coupons, onCouponsChange, filters, onFiltersChange }: CouponGridProps) {
  const [rowData, setRowData] = useState<Coupon[]>([])
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [merchantSelectorOpen, setMerchantSelectorOpen] = useState(false)
  const [marketSelectorOpen, setMarketSelectorOpen] = useState(false)
  const [selectedRowForMerchant, setSelectedRowForMerchant] = useState<string | null>(null)
  const [selectedRowForMarket, setSelectedRowForMarket] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [copiedCoupon, setCopiedCoupon] = useState<Coupon | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([]) // Store all merchants for lookup
  const [sites, setSites] = useState<Site[]>([]) // Store all sites for lookup
  const [merchantSearchInput, setMerchantSearchInput] = useState('') // Local state for merchant search input
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuRowData, setContextMenuRowData] = useState<Coupon | null>(null)
  
  // Excel-like clipboard state
  const [clipboardData, setClipboardData] = useState<{ value: any; field: string } | null>(null)
  
  // Excel-like keyboard shortcuts - temporarily disabled to fix blank page issue
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     // Only handle shortcuts when grid is focused and Ctrl is pressed
  //     if (!event.ctrlKey) return
      
  //     // Check if grid is ready and has data
  //     if (!gridRef.current?.api || !rowData || rowData.length === 0) return
      
  //     const gridApi = gridRef.current.api
  //     const focusedCell = gridApi.getFocusedCell()
  //     if (!focusedCell) return
      
  //     const rowNode = gridApi.getRowNode(focusedCell.rowIndex.toString())
  //     if (!rowNode || !rowNode.data) return
      
  //     const rowData = rowNode.data as Coupon
  //     const field = focusedCell.column.getColId()
      
  //     try {
  //       switch (event.key.toLowerCase()) {
  //         case 'c':
  //           // Ctrl+C: Copy cell value
  //           event.preventDefault()
  //           const cellValue = rowData[field as keyof Coupon]
  //           setClipboardData({ value: cellValue, field })
  //           toast({
  //             title: 'Cell copied',
  //             description: `"${cellValue}" copied to clipboard`,
  //           })
  //           break
            
  //         case 'v':
  //           // Ctrl+V: Paste cell value
  //           if (clipboardData && clipboardData.field === field) {
  //             event.preventDefault()
  //             const updates = { [field]: clipboardData.value }
  //             setPendingChanges(prev => ({
  //               ...prev,
  //               [rowData.documentId]: { ...prev[rowData.documentId], ...updates }
  //             }))
  //             toast({
  //               title: 'Cell pasted',
  //               description: `"${clipboardData.value}" pasted`,
  //             })
  //           }
  //           break
  //       }
  //     } catch (error) {
  //       console.error('Keyboard shortcut error:', error)
  //     }
  //   }
    
  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => document.removeEventListener('keydown', handleKeyDown)
  // }, [clipboardData, toast, rowData])
  const [visibleColumns, setVisibleColumns] = useState({
    merchant: true,
    coupon_title: true,
    value: true,
    code: true,
    coupon_type: true,
    affiliate_link: true,
    description: true,
    editor_tips: true,
    priority: true,
    starts_at: true,
    expires_at: true,
    coupon_status: true,
    market: true,
    site: true,
    validation: true,
    actions: true
  })
  const [showColumnToggle, setShowColumnToggle] = useState(false)
  const gridRef = useRef<AgGridReact>(null)
  const { toast } = useToast()

  // --- core reorder function ---
  const STRAPI_BASE = import.meta.env.VITE_STRAPI_URL?.replace(/\/$/, '');

  const reorderByBucket = useCallback(async (api: any) => {
    try {
      console.log('Starting reorderByBucket...');
      // 1) group visible/sorted nodes by bucket
      const buckets = new Map<string, any[]>();
      api.forEachNodeAfterFilterAndSort((n: any) => {
        const k = bucketKey(n.data);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(n.data);
      });
      
      console.log('Buckets created:', buckets.size);

      // 2) build update jobs; top row gets largest number
      const jobs: Array<() => Promise<any>> = [];
      const updatesForUi: any[] = [];

             for (const [, rows] of buckets) {
         const max = rows.length;
         rows.forEach((row, idxFromTop) => {
           const desired = idxFromTop + 1; // top = 1 (highest priority)
           console.log(`Row ${row.documentId}: current priority=${row.priority}, desired=${desired}`);
           if (row.priority !== desired) {
             const documentId = row.documentId;
             console.log(`Updating ${documentId} to priority ${desired}`);
             // optimistic UI update
             updatesForUi.push({ ...row, priority: desired });

             jobs.push(() => fetch(`${STRAPI_BASE}/api/coupons/${documentId}`, {
               method: 'PUT',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_TOKEN}` },
               body: JSON.stringify({ data: { priority: desired } }), // v5 requires {data}
               cache: 'no-store',
             }).then(r => {
               if (!r.ok) return r.text().then(t => Promise.reject(new Error(`${r.status} ${t}`)));
               console.log(`Successfully updated ${documentId} to priority ${desired}`);
             }));
           }
         });
       }

      // 3) apply optimistic UI once
      if (updatesForUi.length) {
        api.applyTransaction({ update: updatesForUi });
        toast({
          title: 'Reordering...',
          description: `Updating ${updatesForUi.length} coupon priorities`,
        });
      } else {
        toast({
          title: 'No changes needed',
          description: 'Priorities are already in the correct order',
        });
        return;
      }

      // 4) flush to server (gentle concurrency)
      await runWithConcurrency(jobs, 4);

      // 5) (optional) refresh cells so the priority column re-renders
      api.refreshCells({ force: true });

      toast({
        title: 'Priorities updated',
        description: `Successfully updated ${updatesForUi.length} coupon priorities`,
      });
    } catch (error) {
      console.error('Reorder failed:', error);
      toast({
        variant: 'destructive',
        title: 'Reorder failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [STRAPI_BASE, toast])

  // Load merchants for lookup
  useEffect(() => {
    const loadMerchants = async () => {
      try {
        console.log('Loading merchants for lookup...')
        const merchantData = await merchantsAdapter.list()
        console.log('Loaded merchants:', merchantData)
        setMerchants(merchantData)
      } catch (error) {
        console.error('Failed to load merchants for lookup:', error)
      }
    }
    loadMerchants()
  }, [])

  // Load sites for lookup
  useEffect(() => {
    const loadSites = async () => {
      try {
        console.log('Loading sites for lookup...')
        const siteData = await sitesAdapter.list()
        console.log('Loaded sites:', siteData)
        setSites(siteData)
      } catch (error) {
        console.error('Failed to load sites for lookup:', error)
      }
    }
    loadSites()
  }, [])

  useEffect(() => {
    setRowData(coupons)
    // Debug: log coupon data to see merchant and market structure
    console.log('Coupons loaded:', coupons.map(c => ({
      documentId: c.documentId,
      merchant: c.merchant,
      market: c.market,
      merchant_name: c.merchant_name,
      merchant_id: c.merchant_id
    })))
  }, [coupons])

  // Sync merchant search input with current filter
  useEffect(() => {
    setMerchantSearchInput(filters.merchant || '')
  }, [filters.merchant])

  // Apply sorting by priority when data changes
  useEffect(() => {
    // Removed automatic sorting to show natural order
  }, [rowData]);

  // Enhanced keyboard shortcuts
  const handleCopy = useCallback((coupon: Coupon) => {
    setCopiedCoupon(coupon)
    toast({
      title: 'Coupon copied',
      description: `"${coupon.coupon_title}" ready to paste`,
    })
  }, [toast])

  const handleDuplicate = useCallback(async (coupon: Coupon) => {
    try {
      // Remove fields that shouldn't be copied for a new coupon
      const { 
        documentId, 
        coupon_uid, // Don't copy UID - let lifecycle generate new one
        createdAt, 
        updatedAt, 
        merchant, 
        id, // Remove the id field that's causing the validation error
        priority, // Don't copy priority - let lifecycle assign based on merchant
        ...couponData 
      } = coupon
      
      const duplicateData = {
        ...couponData,
        merchant: merchant?.documentId,
        market: coupon.market?.documentId, // Include market relation
        coupon_title: `${coupon.coupon_title} (Copy)`,
        // Don't set priority - let CMS lifecycle handle it based on merchant
      };
      
      const newCoupon = await couponsAdapter.create(duplicateData)
      
      // Add the new coupon to the existing data instead of reloading everything
      setRowData(prevData => [...prevData, newCoupon])
      
      toast({
        title: 'Coupon duplicated',
        description: 'New coupon created successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Duplicate failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [onCouponsChange, toast])

  const handleSave = useCallback(async () => {
    if (Object.keys(pendingChanges).length === 0) return

    setIsSaving(true)
    try {
      // Separate new rows from updates
      const newRows = rowData.filter(row => row.documentId.startsWith('temp_'))
      const updatePromises = Object.entries(pendingChanges).map(([documentId, changes]) =>
        couponsAdapter.update(documentId, changes)
      )
      
      // Create new rows
      const createPromises = newRows.map(row => {
        const { documentId: tempId, isNew, ...couponData } = row
        return couponsAdapter.create(couponData)
      })
      
      await Promise.all([...updatePromises, ...createPromises])
      setPendingChanges({})
      onCouponsChange()
      
      // Extract affected merchants for cache revalidation
      const affectedCoupons = [
        ...Object.keys(pendingChanges).map(id => rowData.find(row => row.documentId === id)).filter(Boolean),
        ...newRows
      ].filter(Boolean) as Coupon[]
      
      const affectedMerchants = extractMerchantSlugs(affectedCoupons)
      
      // Trigger cache revalidation for affected merchants
      if (affectedMerchants.length > 0) {
        console.log('🔄 Triggering cache revalidation for merchants:', affectedMerchants)
        
        const cacheSuccess = await revalidateCache({
          merchants: affectedMerchants,
          tags: ['merchants:list'], // Also refresh merchants list page
          purge: true
        })
        
        if (cacheSuccess) {
          console.log('✅ Cache revalidation completed successfully')
        } else {
          console.warn('⚠️ Cache revalidation failed, but coupon save was successful')
        }
      }
      
      toast({
        title: 'Changes saved',
        description: `Updated ${Object.keys(pendingChanges).length} coupons and created ${newRows.length} new coupons${affectedMerchants.length > 0 ? ` • Cache refreshed for ${affectedMerchants.length} merchants` : ''}`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [pendingChanges, rowData, onCouponsChange, toast])

  useKeyboardShortcuts({
    gridRef,
    onSave: handleSave,
    onCopy: handleCopy,
    copiedCoupon
  })

     const StatusBadge = ({ value }: { value: string }) => {
     const variant = value === 'active' ? 'default' : 
                   value === 'scheduled' ? 'secondary' : 
                   value === 'expired' ? 'destructive' : 'outline'
     return <Badge variant={variant}>{value}</Badge>
   }

    const MerchantCell = ({ data }: any) => {
    // Get merchant name by looking up the merchant ID
    const getMerchantName = () => {
      console.log('MerchantCell data:', {
        documentId: data.documentId,
        merchant: data.merchant,
        merchant_name: data.merchant_name,
        merchant_id: data.merchant_id,
        merchantsLoaded: merchants.length
      })

      // If merchant is a populated relation object with merchant_name
      if (data.merchant?.merchant_name) {
        console.log('Found merchant_name in relation:', data.merchant.merchant_name)
        return data.merchant.merchant_name
      }
      // If merchant is a populated relation object with name
      if (data.merchant?.name) {
        console.log('Found name in relation:', data.merchant.name)
        return data.merchant.name
      }
      // If merchant is just an ID (string), look it up in our merchants array
      if (data.merchant && typeof data.merchant === 'string') {
        console.log('Looking up merchant ID:', data.merchant)
        const foundMerchant = merchants.find(m => m.documentId === data.merchant)
        console.log('Found merchant:', foundMerchant)
        return foundMerchant ? foundMerchant.name : data.merchant // Return ID if not found
      }
      // If merchant is a populated object with documentId, look it up
      if (data.merchant?.documentId) {
        const foundMerchant = merchants.find(m => m.documentId === data.merchant.documentId)
        console.log('Looking up merchant documentId:', data.merchant.documentId, 'Found:', foundMerchant)
        return foundMerchant ? foundMerchant.name : data.merchant.merchant_name || data.merchant.documentId
      }
      // Fallback to direct fields
      const fallback = data.merchant_name || data.merchant_id || 'Select merchant...'
      console.log('Using fallback:', fallback)
      return fallback
    }
    
    return (
      <button
        onClick={() => {
          setSelectedRowForMerchant(data.documentId)
          setMerchantSelectorOpen(true)
        }}
        className="text-left hover:underline"
      >
        {getMerchantName()}
      </button>
    )
  }

  const MarketCell = ({ data }: any) => {
    // Get market name by looking up the market ID
    const getMarketName = () => {
      console.log('MarketCell data:', {
        documentId: data.documentId,
        market: data.market,
        sitesLoaded: sites.length
      })

      // If market is a populated relation object with name
      if (data.market?.name) {
        console.log('Found market name in relation:', data.market.name)
        return data.market.name
      }
      // If market is just an ID (string), look it up in our sites array
      if (data.market && typeof data.market === 'string') {
        console.log('Looking up market ID:', data.market)
        const foundSite = sites.find(s => s.documentId === data.market)
        console.log('Found site:', foundSite)
        return foundSite ? foundSite.name : data.market // Return ID if not found
      }
      // If market is a populated object with documentId, look it up
      if (data.market?.documentId) {
        const foundSite = sites.find(s => s.documentId === data.market.documentId)
        console.log('Looking up market documentId:', data.market.documentId, 'Found:', foundSite)
        return foundSite ? foundSite.name : data.market.name || data.market.documentId
      }
      // Fallback
      const fallback = 'Select market...'
      console.log('Using fallback:', fallback)
      return fallback
    }
    
    return (
      <button
        onClick={() => {
          setSelectedRowForMarket(data.documentId)
          setMarketSelectorOpen(true)
        }}
        className="text-left hover:underline"
      >
        {getMarketName()}
      </button>
    )
  }

  const DeleteCell = ({ data }: any) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDuplicate(data)}
        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
        title="Duplicate coupon"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDelete(data.documentId)}
        className="h-8 w-8 p-0 text-destructive"
        title="Delete coupon"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  const PriorityCell = ({ value }: { value: number }) => (
    <div className="flex items-center justify-center h-full min-h-[40px] gap-2">
      {/* Drag handle - visual only, AG Grid handles the drag */}
      <div 
        className="cursor-move text-gray-400 hover:text-gray-600 select-none"
        style={{ 
          width: '12px', 
          height: '12px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Ccircle cx='2' cy='2' r='1' fill='%236b7280'/%3E%3Ccircle cx='6' cy='2' r='1' fill='%236b7280'/%3E%3Ccircle cx='10' cy='2' r='1' fill='%236b7280'/%3E%3Ccircle cx='2' cy='6' r='1' fill='%236b7280'/%3E%3Ccircle cx='6' cy='6' r='1' fill='%236b7280'/%3E%3Ccircle cx='10' cy='6' r='1' fill='%236b7280'/%3E%3Ccircle cx='2' cy='10' r='1' fill='%236b7280'/%3E%3Ccircle cx='6' cy='10' r='1' fill='%236b7280'/%3E%3Ccircle cx='10' cy='10' r='1' fill='%236b7280'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      {/* Priority badge */}
      <Badge variant="secondary" className="font-mono text-xs">
        {value || 0}
      </Badge>
    </div>
  );

  // Custom Date Picker Cell Editor
  const DatePickerCellEditor = ({ value, onValueChange }: { value: string, onValueChange: (value: string) => void }) => {
    const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined)
    const [open, setOpen] = useState(false)

    const handleSelect = (selectedDate: Date | undefined) => {
      setDate(selectedDate)
      if (selectedDate) {
        const isoString = selectedDate.toISOString().split('T')[0] // YYYY-MM-DD format
        onValueChange(isoString)
      } else {
        // Clear the date
        onValueChange('')
      }
      setOpen(false)
    }

    const handleClear = () => {
      setDate(undefined)
      onValueChange('')
      setOpen(false)
    }

    return (
      <div className="flex items-center gap-1 w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-start text-left font-normal h-8"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'MMM dd, yyyy') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
            />
            {date && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Clear Date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {date && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
            title="Clear date"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  const columnDefs: ColDef<Coupon>[] = [
    {
      headerName: '',
      width: 50,
      pinned: 'left',
      suppressMenu: true,
      sortable: false,
      filter: false,
      checkboxSelection: true,
      headerCheckboxSelection: true
    },
    { 
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      rowDrag: true,
      editable: false,
      sortable: true,
      cellStyle: { 
        paddingLeft: '8px',
        paddingRight: '8px',
        textAlign: 'center',
        cursor: 'grab',
        userSelect: 'none'
      }
    },
    { 
      field: 'coupon_uid', 
      headerName: 'UID',
      width: 120,
      editable: false,
      cellStyle: { color: '#6b7280' }
    },
    {
      field: 'merchant',
      headerName: 'Merchant',
      width: 150,
      cellRenderer: MerchantCell,
      editable: false,
      comparator: (valueA, valueB) => {
        // Case-sensitive sorting: A comes before a
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        return 0;
      },
      valueGetter: (params) => {
        const data = params.data
        // Handle Strapi relation structure
        if (data.merchant?.merchant_name) {
          return data.merchant.merchant_name
        }
        if (data.merchant?.name) {
          return data.merchant.name
        }
        if (data.merchant && typeof data.merchant === 'string') {
          // Look up merchant name from our merchants array
          const foundMerchant = merchants.find(m => m.documentId === data.merchant)
          return foundMerchant ? foundMerchant.name : data.merchant
        }
        return data.merchant_name || data.merchant_id || ''
      }
    },
         { 
       field: 'market', 
       headerName: 'Market',
       width: 100,
       editable: false,
       cellRenderer: MarketCell
     },
    { 
      field: 'coupon_title', 
      headerName: 'Title',
      width: 300,
      minWidth: 200,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellEditor: 'agTextAreaCellEditor',
      cellStyle: { 
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        minHeight: '40px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal'
      }
    },
    { 
      field: 'value', 
      headerName: 'Value',
      width: 100,
      editable: true
    },
    { 
      field: 'code', 
      headerName: 'Code',
      width: 120,
      editable: true
    },
         { 
       field: 'coupon_type', 
       headerName: 'Type',
       width: 120,
       editable: true,
       cellEditor: 'agSelectCellEditor',
       cellEditorParams: {
         values: ['promo_code', 'coupon', 'discount']
       }
     },
    { 
      field: 'affiliate_link', 
      headerName: 'Affiliate Link',
      width: 250,
      minWidth: 150,
      editable: true,
      cellRenderer: ({ value }: any) => (
        <div className="truncate" title={value}>
          {value || ''}
        </div>
      )
    },
    { 
      field: 'description', 
      headerName: 'Description',
      width: 300,
      minWidth: 200,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: ({ value }: any) => <RichTextRenderer value={value} />,
      cellEditor: RichTextCellEditor,
      cellEditorParams: {
        suppressKeyboardEvent: () => true // Prevent default keyboard handling
      },
      cellStyle: { 
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        minHeight: '40px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal'
      }
    },
    { 
      field: 'editor_tips', 
      headerName: 'Editor Tips',
      width: 300,
      minWidth: 200,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: ({ value }: any) => <RichTextRenderer value={value} />,
      cellEditor: RichTextCellEditor,
      cellEditorParams: {
        suppressKeyboardEvent: () => true // Prevent default keyboard handling
      }
    },
         { 
       field: 'starts_at', 
       headerName: 'Starts',
       width: 120,
       editable: true,
       cellRenderer: ({ value }: any) => (
         <div className="flex items-center gap-2">
           <span>{value ? format(new Date(value), 'MMM dd, yyyy') : ''}</span>
           <CalendarIcon className="h-3 w-3 text-muted-foreground" />
         </div>
       ),
       cellEditor: DatePickerCellEditor,
       valueFormatter: (params) => 
         params.value ? format(new Date(params.value), 'MMM dd, yyyy') : ''
     },
     { 
       field: 'expires_at', 
       headerName: 'Expires',
       width: 120,
       editable: true,
       cellRenderer: ({ value }: any) => (
         <div className="flex items-center gap-2">
           <span>{value ? format(new Date(value), 'MMM dd, yyyy') : ''}</span>
           <CalendarIcon className="h-3 w-3 text-muted-foreground" />
         </div>
       ),
       cellEditor: DatePickerCellEditor,
       valueFormatter: (params) => 
         params.value ? format(new Date(params.value), 'MMM dd, yyyy') : ''
     },
         {
       field: 'coupon_status',
       headerName: 'Status',
       width: 100,
       editable: true,
       cellEditor: 'agSelectCellEditor',
       cellEditorParams: {
         values: ['active', 'scheduled', 'expired', 'archived']
       },
       cellRenderer: StatusBadge
     },
    {
      field: 'user_count',
      headerName: 'Users',
      width: 80,
      editable: false,
      cellRenderer: ({ value }: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {value || 0}
        </div>
      )
    },
    { 
      field: 'last_click_at', 
      headerName: 'Last Click',
      width: 120,
      editable: false,
      valueFormatter: (params) => 
        params.value ? format(new Date(params.value), 'MMM dd, yyyy HH:mm') : ''
    },
    {
      field: 'display_count',
      headerName: 'Displays',
      width: 80,
      editable: false,
      type: 'numericColumn'
    },
    
    {
      headerName: 'Issues',
      width: 200,
      cellRenderer: ValidationCell,
      editable: false,
      sortable: false,
      filter: false,
      cellStyle: { padding: '4px' }
    },
    {
      headerName: 'Delete',
      width: 80,
      cellRenderer: DeleteCell,
      editable: false,
      sortable: false,
      filter: false
    }
  ]

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const { data, colDef, newValue } = event
    const field = colDef.field!
    
    setPendingChanges(prev => ({
      ...prev,
      [data.documentId]: {
        ...prev[data.documentId],
        [field]: newValue
      }
    }))
  }, [])

  const onRowDragEnd = useCallback((event: RowDragEndEvent) => {
    const movingNode = event.node
    const overNode = event.overNode
    
    if (!overNode || movingNode === overNode) return

    // Use the new merchant-based reordering
    void reorderByBucket(event.api)
  }, [reorderByBucket])

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selectedNodes = event.api.getSelectedNodes()
    const selectedIds = selectedNodes.map(node => node.data.documentId)
    setSelectedRows(selectedIds)
  }, [])

  const handleMerchantSearch = useCallback(() => {
    onFiltersChange({ ...filters, merchant: merchantSearchInput })
  }, [filters, merchantSearchInput, onFiltersChange])

  // Custom context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, rowData: Coupon) => {
    console.log('handleContextMenu called with:', { event, rowData })
    event.preventDefault()
    event.stopPropagation()
    
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
    setContextMenuRowData(rowData)
    setContextMenuOpen(true)
    console.log('Context menu should now be open:', true)
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuOpen) {
        setContextMenuOpen(false)
      }
    }

    if (contextMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenuOpen])

  // Prevent browser context menu globally when our menu is open
  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      if (contextMenuOpen) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    }

    if (contextMenuOpen) {
      document.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true })
      return () => document.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true })
    }
  }, [contextMenuOpen])

  const handleCopyRowData = useCallback(() => {
    if (contextMenuRowData) {
      const textToCopy = `${contextMenuRowData.coupon_title} | ${contextMenuRowData.value} | ${contextMenuRowData.code} | ${contextMenuRowData.affiliate_link}`
      navigator.clipboard.writeText(textToCopy)
      toast({
        title: 'Copied to clipboard',
        description: 'Row data has been copied',
      })
    }
    setContextMenuOpen(false)
  }, [contextMenuRowData, toast])

  const handleDuplicateRow = useCallback(async () => {
    if (contextMenuRowData) {
      try {
        const couponData = {
          coupon_title: `${contextMenuRowData.coupon_title} (Copy)`,
          merchant: contextMenuRowData.merchant?.documentId,
          market: contextMenuRowData.market?.documentId,
          value: contextMenuRowData.value,
          code: contextMenuRowData.code,
          coupon_type: contextMenuRowData.coupon_type,
          affiliate_link: contextMenuRowData.affiliate_link,
          description: contextMenuRowData.description,
          editor_tips: contextMenuRowData.editor_tips,
          // Don't set priority - let CMS lifecycle handle it based on merchant
          starts_at: contextMenuRowData.starts_at,
          expires_at: contextMenuRowData.expires_at,
          coupon_status: contextMenuRowData.coupon_status || 'active',
          user_count: contextMenuRowData.user_count,
          display_count: contextMenuRowData.display_count,
          site: contextMenuRowData.site
        }
        
        const newCoupon = await couponsAdapter.create(couponData)
        
        // Add the new coupon to the existing data instead of reloading everything
        setRowData(prevData => [...prevData, newCoupon])
        
        toast({
          title: 'Coupon duplicated',
          description: 'New coupon created successfully',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Duplicate failed',
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    setContextMenuOpen(false)
  }, [contextMenuRowData, couponsAdapter, onCouponsChange, toast])

  const handleAddNewBelow = useCallback(() => {
    if (contextMenuRowData) {
      const rowIndex = rowData.findIndex(row => row.documentId === contextMenuRowData.documentId)
      const newCoupon = {
        documentId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate temporary ID
        coupon_title: 'New Coupon',
        merchant: contextMenuRowData.merchant?.documentId,
        market: contextMenuRowData.market?.documentId,
        value: '',
        code: '',
        coupon_type: 'promo_code',
        affiliate_link: '',
        description: '',
        editor_tips: '',
        // Don't set priority - let CMS lifecycle handle it based on merchant
        starts_at: '',
        expires_at: '',
        coupon_status: 'active',
        user_count: 0,
        display_count: 0,
        site: contextMenuRowData.site,
        isNew: true // Mark as new row for saving logic
      }
      
      const newRowData = [...rowData]
      newRowData.splice(rowIndex + 1, 0, newCoupon)
      setRowData(newRowData)
      
      toast({
        title: 'New row added',
        description: 'New coupon row inserted below',
      })
    }
    setContextMenuOpen(false)
  }, [contextMenuRowData, rowData, toast])

  const handleDeleteRow = useCallback(async () => {
    if (contextMenuRowData && confirm('Are you sure you want to delete this coupon?')) {
      try {
        if (contextMenuRowData.documentId.startsWith('temp_')) {
          // For temporary rows, just remove from local state
          setRowData(prev => prev.filter(row => row.documentId !== contextMenuRowData.documentId))
          toast({
            title: 'Row removed',
            description: 'Unsaved row has been removed',
          })
        } else {
          // For saved rows, delete from database
          await couponsAdapter.remove(contextMenuRowData.documentId)
          onCouponsChange()
          toast({
            title: 'Coupon deleted',
            description: 'Coupon has been removed',
          })
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    setContextMenuOpen(false)
  }, [contextMenuRowData, couponsAdapter, onCouponsChange, toast])

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      await couponsAdapter.remove(documentId)
      onCouponsChange()
      toast({
        title: 'Coupon deleted',
        description: 'The coupon has been removed',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleMerchantSelect = async (merchant: Merchant) => {
    if (!selectedRowForMerchant) return

    setPendingChanges(prev => ({
      ...prev,
      [selectedRowForMerchant]: {
        ...prev[selectedRowForMerchant],
        merchant: merchant.documentId
      }
    }))

    // Update the row data immediately for UI with the full merchant object
    setRowData(prev => prev.map(row => 
      row.documentId === selectedRowForMerchant 
        ? { 
            ...row, 
            merchant: {
              documentId: merchant.documentId,
              merchant_name: merchant.name,
              slug: merchant.slug
            }
          }
        : row
    ))
  }

  const handleMarketSelect = async (site: Site) => {
    if (!selectedRowForMarket) return

    setPendingChanges(prev => ({
      ...prev,
      [selectedRowForMarket]: {
        ...prev[selectedRowForMarket],
        market: site.documentId
      }
    }))

    // Update the row data immediately for UI with the full site object
    setRowData(prev => prev.map(row => 
      row.documentId === selectedRowForMarket 
        ? { 
            ...row, 
            market: {
              documentId: site.documentId,
              name: site.name,
              key: site.key
            }
          }
        : row
    ))
  }

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} coupons?`)) return

    try {
      const deletePromises = selectedRows.map(id => couponsAdapter.remove(id))
      await Promise.all(deletePromises)
      setSelectedRows([])
      onCouponsChange()
      toast({
        title: 'Coupons deleted',
        description: `${selectedRows.length} coupons have been removed`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bulk delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleBulkDuplicate = async () => {
    if (selectedRows.length === 0) return

    try {
      const selectedCoupons = rowData.filter(row => selectedRows.includes(row.documentId))
      const createPromises = selectedCoupons.map(async coupon => {
        // Only include fields that are valid for creating a new coupon
        const couponData = {
          coupon_title: `${coupon.coupon_title} (Copy)`,
          merchant: coupon.merchant?.documentId,
          market: coupon.market?.documentId,
          value: coupon.value,
          code: coupon.code,
          coupon_type: coupon.coupon_type,
          affiliate_link: coupon.affiliate_link,
          description: coupon.description,
          editor_tips: coupon.editor_tips,
          // Don't set priority - let CMS lifecycle handle it based on merchant
          starts_at: coupon.starts_at,
          expires_at: coupon.expires_at,
          coupon_status: coupon.coupon_status || 'active',
          user_count: coupon.user_count,
          display_count: coupon.display_count,
          site: coupon.site
        }
        
        return couponsAdapter.create(couponData)
      })
      
      const newCoupons = await Promise.all(createPromises)
      
      // Add the new coupons to the existing data instead of reloading everything
      setRowData(prevData => [...prevData, ...newCoupons])
      setSelectedRows([])
      
      toast({
        title: 'Coupons duplicated',
        description: `${selectedRows.length} coupons have been duplicated`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bulk duplicate failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

     const handleBulkStatusChange = async (status: 'active' | 'expired' | 'scheduled' | 'archived') => {
    if (selectedRows.length === 0) return

    try {
      const updatePromises = selectedRows.map(id => 
        couponsAdapter.update(id, { coupon_status: status })
      )
      
      await Promise.all(updatePromises)
      
      // Extract affected merchants for cache revalidation
      const affectedCoupons = selectedRows.map(id => rowData.find(row => row.documentId === id)).filter(Boolean) as Coupon[]
      const affectedMerchants = extractMerchantSlugs(affectedCoupons)
      
      // Trigger cache revalidation for affected merchants
      if (affectedMerchants.length > 0) {
        console.log('🔄 Triggering cache revalidation for bulk status change:', affectedMerchants)
        
        const cacheSuccess = await revalidateCache({
          merchants: affectedMerchants,
          tags: ['merchants:list'],
          purge: true
        })
        
        if (cacheSuccess) {
          console.log('✅ Cache revalidation completed successfully')
        } else {
          console.warn('⚠️ Cache revalidation failed, but status update was successful')
        }
      }
      
      setSelectedRows([])
      onCouponsChange()
      toast({
        title: 'Status updated',
        description: `${selectedRows.length} coupons updated to ${status}${affectedMerchants.length > 0 ? ` • Cache refreshed for ${affectedMerchants.length} merchants` : ''}`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bulk status update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const pendingCount = Object.keys(pendingChanges).length

  const columnToggleOptions = [
    { key: 'merchant', label: 'Merchant' },
    { key: 'coupon_title', label: 'Title' },
    { key: 'value', label: 'Value' },
    { key: 'code', label: 'Code' },
    { key: 'coupon_type', label: 'Type' },
    { key: 'affiliate_link', label: 'Affiliate Link' },
    { key: 'description', label: 'Description' },
    { key: 'priority', label: 'Priority' },
    { key: 'starts_at', label: 'Starts At' },
    { key: 'expires_at', label: 'Expires At' },
    { key: 'coupon_status', label: 'Status' },
    { key: 'market', label: 'Market' },
    { key: 'site', label: 'Site' },
    { key: 'validation', label: 'Issues' },
    { key: 'actions', label: 'Actions' },
  ]

  // Filter column definitions based on visibility
  const filteredColumnDefs = columnDefs.filter(col => {
    // Always show checkbox column
    if (col.headerName === '') {
      return true
    }
    
    const field = col.field as keyof typeof visibleColumns
    if (field) {
      return visibleColumns[field]
    }
    // Always show actions column
    if (col.headerName === 'Delete') {
      return visibleColumns.actions
    }
    // Show validation column
    if (col.headerName === 'Issues') {
      return visibleColumns.validation
    }
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Filters with Saved Views */}
      <div className="flex flex-col gap-4 p-4 border-b bg-card">
                 {/* Saved Views */}
         <SavedViewsManager 
           filters={filters}
           onFiltersChange={onFiltersChange}
           visibleColumns={visibleColumns}
           onVisibleColumnsChange={setVisibleColumns}
         />
        
        {/* Traditional Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Search titles..."
            value={filters.q || ''}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            className="max-w-xs"
          />
          <div className="flex gap-2 max-w-xs">
            <Input
              placeholder="Search merchant..."
              value={merchantSearchInput}
              onChange={(e) => setMerchantSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMerchantSearch()
                }
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleMerchantSearch}
              className="px-3"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
                               <Select
            value={filters.market || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, market: value === 'all' ? undefined : value })}
          >
             <SelectTrigger className="w-32">
               <SelectValue placeholder="Market" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Markets</SelectItem>
               <SelectItem value="HK">HK</SelectItem>
               <SelectItem value="TW">TW</SelectItem>
               <SelectItem value="JP">JP</SelectItem>
               <SelectItem value="KR">KR</SelectItem>
               <SelectItem value="SG">SG</SelectItem>
               <SelectItem value="MY">MY</SelectItem>
             </SelectContent>
           </Select>
          <Select
            value={filters.coupon_status || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, coupon_status: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
                         <SelectContent>
               <SelectItem value="all">All Status</SelectItem>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="expired">Expired</SelectItem>
               <SelectItem value="scheduled">Scheduled</SelectItem>
               <SelectItem value="archived">Archived</SelectItem>
             </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnToggle(!showColumnToggle)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <div className="flex-1" />
          
          {/* Bulk Actions */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDuplicate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
                             <Select onValueChange={handleBulkStatusChange}>
                 <SelectTrigger className="w-32">
                   <SelectValue placeholder="Set Status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="active">Active</SelectItem>
                   <SelectItem value="scheduled">Scheduled</SelectItem>
                   <SelectItem value="expired">Expired</SelectItem>
                   <SelectItem value="archived">Archived</SelectItem>
                 </SelectContent>
               </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              {copiedCoupon && (
                <Button variant="outline" size="sm">
                  <Clipboard className="h-4 w-4 mr-2" />
                  "{copiedCoupon.coupon_title}" copied
                </Button>
              )}
            </div>
          )}
          
          {/* Reorder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const api = (window as any).gridApi;
              if (api) { void reorderByBucket(api); }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Recompute Priorities
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        <Button
          onClick={handleSave}
          disabled={pendingCount === 0 || isSaving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save {pendingCount > 0 ? `(${pendingCount})` : ''}
        </Button>
        
        {pendingCount > 0 && (
          <Badge variant="secondary">
            {pendingCount} unsaved changes
          </Badge>
        )}
        
        <div className="text-sm text-muted-foreground">
          Ctrl/Cmd+S to save • Enter to edit
        </div>
      </div>

      {/* Column Toggle Panel */}
      {showColumnToggle && (
        <div className="p-4 border-b bg-muted/50">
          <h4 className="font-medium mb-3">Toggle Columns:</h4>
          <div className="grid grid-cols-4 gap-4">
            {columnToggleOptions.map(option => (
              <div key={option.key} className="flex items-center space-x-2">
                <Checkbox
                  id={option.key}
                  checked={visibleColumns[option.key as keyof typeof visibleColumns]}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({
                      ...prev,
                      [option.key]: !!checked
                    }))
                  }
                />
                <label 
                  htmlFor={option.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div 
        className="flex-1 ag-theme-quartz w-full"
        style={{ width: '100%', minWidth: '100%' }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
        }}
      >
        <style>{`
          .ag-theme-quartz {
            width: 100% !important;
            height: 600px !important;
          }
          .ag-theme-quartz .ag-root-wrapper {
            width: 100% !important;
          }
          .ag-theme-quartz .ag-body-viewport {
            overflow-x: auto !important;
          }
          .ag-theme-quartz .ag-row-drag {
            cursor: move;
            display: flex !important;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }
          .ag-theme-quartz .ag-row-drag-handle {
            display: none !important;
          }
          .ag-theme-quartz .ag-cell[col-id="priority"] {
            cursor: grab !important;
            user-select: none !important;
          }
          .ag-theme-quartz .ag-cell[col-id="priority"] .ag-row-drag {
            opacity: 0 !important;
            position: absolute !important;
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 1 !important;
          }
          .ag-theme-quartz .ag-cell[col-id="priority"]:active {
            cursor: grabbing !important;
          }
          .ag-theme-quartz .ag-context-menu {
            z-index: 1000 !important;
          }
          .ag-theme-quartz .ag-context-menu .ag-menu-option {
            padding: 8px 16px !important;
            cursor: pointer !important;
          }
          .ag-theme-quartz .ag-context-menu .ag-menu-option:hover {
            background-color: #f3f4f6 !important;
          }
        `}</style>
                 <AgGridReact
           ref={gridRef}
           rowData={rowData}
           columnDefs={filteredColumnDefs}
           components={{
             RichTextCellEditor: RichTextCellEditor
           }}
           getRowId={(params) => params.data.documentId}
           onCellValueChanged={onCellValueChanged}
           onRowDragEnd={onRowDragEnd}
           onSelectionChanged={onSelectionChanged}
           suppressContextMenu={true}
           onCellContextMenu={(event) => {
             console.log('AG Grid onCellContextMenu triggered:', event)
             // Prevent browser context menu completely
             event.event.preventDefault()
             event.event.stopPropagation()
             event.event.stopImmediatePropagation()
             // Handle custom context menu
             handleContextMenu(event.event as any, event.data)
           }}
           onBodyContextMenu={(event) => {
             // Prevent browser context menu on empty areas
             event.preventDefault()
             event.stopPropagation()
             event.stopImmediatePropagation()
           }}
          onGridReady={(p) => { 
            (window as any).gridApi = p.api;
            // Set default sort to Merchant ascending (A-Z)
            p.api.applyColumnState({
              state: [{ colId: 'merchant', sort: 'asc' }],
              defaultState: { sort: null }
            });
            
            // Session-only column state persistence (not across reloads)
            // Apply with delay to ensure grid is fully initialized
            setTimeout(() => {
              try {
                const saved = sessionStorage.getItem('coupon-grid-column-state')
                if (saved) {
                  const state = JSON.parse(saved)
                  if (state && state.length > 0) {
                    console.log('Applying saved column state:', state)
                    p.api.applyColumnState({ 
                      state: state,
                      applyOrder: true,
                      defaultState: { sort: null }
                    })
                  }
                }
              } catch (error) {
                console.warn('Failed to load column state:', error)
              }
            }, 100)
            
            // Save column state when resized (session only)
            p.api.addEventListener('columnResized', (event: any) => {
              if (event.finished) {
                try {
                  const state = p.api.getColumnState()
                  console.log('Saving column state on resize:', state)
                  sessionStorage.setItem('coupon-grid-column-state', JSON.stringify(state))
                } catch (error) {
                  console.warn('Failed to save column state:', error)
                }
              }
            })
            
            // Also save on column moved
            p.api.addEventListener('columnMoved', (event: any) => {
              if (event.finished) {
                try {
                  const state = p.api.getColumnState()
                  console.log('Saving column state on move:', state)
                  sessionStorage.setItem('coupon-grid-column-state', JSON.stringify(state))
                } catch (error) {
                  console.warn('Failed to save column state:', error)
                }
              }
            })
            
            // Prevent column state reset during cell interactions
            let isApplyingState = false
            p.api.addEventListener('columnStateChanged', (event: any) => {
              if (!isApplyingState) {
                try {
                  const state = p.api.getColumnState()
                  console.log('Saving column state on change:', state)
                  sessionStorage.setItem('coupon-grid-column-state', JSON.stringify(state))
                } catch (error) {
                  console.warn('Failed to save column state:', error)
                }
              }
            })
            
            // Re-apply column state after cell value changes to prevent resets
            p.api.addEventListener('cellValueChanged', () => {
              setTimeout(() => {
                try {
                  const saved = sessionStorage.getItem('coupon-grid-column-state')
                  if (saved) {
                    const state = JSON.parse(saved)
                    if (state && state.length > 0) {
                      isApplyingState = true
                      p.api.applyColumnState({ 
                        state: state,
                        applyOrder: true,
                        defaultState: { sort: null }
                      })
                      setTimeout(() => { isApplyingState = false }, 100)
                    }
                  }
                } catch (error) {
                  console.warn('Failed to re-apply column state:', error)
                }
              }, 50)
            })
          }}

           rowSelection={{
             type: 'multiple',
             enableClickSelection: false,
             copySelectedRows: false
           }}
           suppressRowClickSelection={false}
           rowDragManaged
           rowDragText={(params) => `Priority ${params.rowNode.data.priority}`}
           suppressMoveWhenRowDragging
           animateRows
           
           // Grid sizing and responsiveness
           domLayout="normal"
           suppressHorizontalScroll={false}
           suppressColumnVirtualisation={true}
           maintainColumnOrder={true}
           suppressColumnMoveAnimation={true}
           
           // Disable AG Grid's copy/paste functionality
           suppressCopyRowsToClipboard={true}
           suppressCopySingleCellRanges={true}
           suppressPasteSingleCellRanges={true}
           
           defaultColDef={{
             sortable: true,
             filter: true,
             resizable: true,
             editable: true,
             // Excel-like single-click editing
             singleClickEdit: true,
             suppressKeyboardEvent: (params) => {
               // Disable AG Grid's copy/paste handling
               const key = params.event.key.toLowerCase()
               if ((params.event.ctrlKey || params.event.metaKey) && (key === 'c' || key === 'v')) {
                 return false // Let browser handle it
               }
               return true
             },
             cellStyle: { 
               lineHeight: '1.4',
               display: 'flex',
               alignItems: 'center',
               height: '100%',
               minHeight: '40px',
               overflow: 'hidden',
               textOverflow: 'ellipsis'
             }
           }}
           enterNavigatesVertically={true}
           enterNavigatesVerticallyAfterEdit={true}
           suppressColumnVirtualisation={true}
           maintainColumnOrder={true}
           suppressColumnMoveAnimation={true}
         />
      </div>

      <MerchantSelector
        isOpen={merchantSelectorOpen}
        onClose={() => {
          setMerchantSelectorOpen(false)
          setSelectedRowForMerchant(null)
        }}
        onSelect={handleMerchantSelect}
        currentMerchant={
          selectedRowForMerchant
            ? rowData.find(r => r.documentId === selectedRowForMerchant)?.merchant
            : undefined
        }
      />

      <MarketSelector
        isOpen={marketSelectorOpen}
        onClose={() => {
          setMarketSelectorOpen(false)
          setSelectedRowForMarket(null)
        }}
        onSelect={handleMarketSelect}
        currentSite={
          selectedRowForMarket
            ? rowData.find(r => r.documentId === selectedRowForMarket)?.market
            : undefined
        }
      />

      {/* Custom Context Menu */}
      {contextMenuOpen && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[160px]"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y,
          }}
          onMouseLeave={() => setContextMenuOpen(false)}
        >
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
            onClick={handleCopyRowData}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Row Data
          </button>
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
            onClick={handleDuplicateRow}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Row
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
            onClick={handleAddNewBelow}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Add New Below
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm text-red-600"
            onClick={handleDeleteRow}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Row
          </button>
        </div>
      )}
    </div>
  )
}