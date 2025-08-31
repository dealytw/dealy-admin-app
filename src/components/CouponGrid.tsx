import { useEffect, useState, useRef, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, RowDragEndEvent, SelectionChangedEvent } from 'ag-grid-community'
// Import AG Grid CSS for proper styling
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { MerchantSelector } from './MerchantSelector'
import { SavedViewsManager } from './SavedViewsManager'
import { ValidationCell } from './ValidationBadges'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useToast } from '../hooks/use-toast'
import type { Coupon, CouponFilters, Merchant } from '../domain/coupons'
import { couponsAdapter, merchantsAdapter } from '../data/strapiCoupons'
import { Trash2, Save, RotateCcw, Users, Settings, Copy, Archive, Edit3, Clipboard } from 'lucide-react'
import { format } from 'date-fns'

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
  const [selectedRowForMerchant, setSelectedRowForMerchant] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [copiedCoupon, setCopiedCoupon] = useState<Coupon | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([]) // Store all merchants for lookup
  const [visibleColumns, setVisibleColumns] = useState({
    merchant: true,
    coupon_title: true,
    value: true,
    code: true,
    coupon_type: true,
    affiliate_link: true,
    description: true,
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

  useEffect(() => {
    setRowData(coupons)
    // Debug: log coupon data to see merchant structure
    console.log('Coupons loaded:', coupons.map(c => ({
      documentId: c.documentId,
      merchant: c.merchant,
      merchant_name: c.merchant_name,
      merchant_id: c.merchant_id
    })))
  }, [coupons])

  // Enhanced keyboard shortcuts
  const handleCopy = useCallback((coupon: Coupon) => {
    setCopiedCoupon(coupon)
    toast({
      title: 'Coupon copied',
      description: `"${coupon.coupon_title}" ready to paste`,
    })
  }, [toast])

  const handlePaste = useCallback(async () => {
    if (!copiedCoupon) return
    
    try {
      const { documentId, coupon_uid, createdAt, updatedAt, merchant, ...couponData } = copiedCoupon
      const newCoupon = await couponsAdapter.create({
        ...couponData,
        merchant: merchant?.documentId,
        coupon_title: `${copiedCoupon.coupon_title} (Copy)`,
        priority: Math.max(...rowData.map(r => r.priority)) + 1
      })
      
      onCouponsChange()
      toast({
        title: 'Coupon pasted',
        description: 'New coupon created below selection',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Paste failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [copiedCoupon, rowData, onCouponsChange, toast])

  const handleSave = useCallback(async () => {
    if (Object.keys(pendingChanges).length === 0) return

    setIsSaving(true)
    try {
      const updatePromises = Object.entries(pendingChanges).map(([documentId, changes]) =>
        couponsAdapter.update(documentId, changes)
      )
      
      await Promise.all(updatePromises)
      setPendingChanges({})
      onCouponsChange()
      
      toast({
        title: 'Changes saved',
        description: `Updated ${Object.keys(pendingChanges).length} coupons`,
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
  }, [pendingChanges, onCouponsChange, toast])

  useKeyboardShortcuts({
    gridRef,
    onSave: handleSave,
    onCopy: handleCopy,
    onPaste: handlePaste,
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

  const DeleteCell = ({ data }: any) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleDelete(data.documentId)}
      className="h-8 w-8 p-0 text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

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
      headerName: '#',
      width: 60,
      rowDrag: true,
      editable: true,
      type: 'numericColumn'
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
       editable: true,
       cellEditor: 'agSelectCellEditor',
       cellEditorParams: {
         values: ['HK', 'TW', 'JP', 'KR', 'SG', 'MY']
       }
     },
    { 
      field: 'coupon_title', 
      headerName: 'Title',
      width: 200,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellEditor: 'agTextAreaCellEditor'
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
      width: 150,
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
      width: 200,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellEditor: 'agTextAreaCellEditor'
    },
    { 
      field: 'editor_tips', 
      headerName: 'Editor Tips',
      width: 150,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellEditor: 'agTextAreaCellEditor'
    },
    { 
      field: 'starts_at', 
      headerName: 'Starts',
      width: 120,
      editable: true,
      valueFormatter: (params) => 
        params.value ? format(new Date(params.value), 'MMM dd, yyyy') : ''
    },
    { 
      field: 'expires_at', 
      headerName: 'Expires',
      width: 120,
      editable: true,
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
      width: 150,
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

    // Get all visible node IDs in order
    const allRowIds: string[] = []
    gridRef.current?.api.forEachNodeAfterFilterAndSort((node) => {
      allRowIds.push(node.data.documentId)
    })

    handleReorder(allRowIds)
  }, [])

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selectedNodes = event.api.getSelectedNodes()
    const selectedIds = selectedNodes.map(node => node.data.documentId)
    setSelectedRows(selectedIds)
  }, [])

  const handleReorder = async (documentIds: string[]) => {
    try {
      await couponsAdapter.reorder(documentIds)
      onCouponsChange()
      toast({
        title: 'Order updated',
        description: 'Coupon priorities have been updated',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Reorder failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

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
        const { documentId, coupon_uid, createdAt, updatedAt, merchant, ...couponData } = coupon
        return couponsAdapter.create({
          ...couponData,
          merchant: merchant?.documentId,
          coupon_title: `${coupon.coupon_title} (Copy)`,
          priority: Math.max(...rowData.map(r => r.priority)) + 1
        })
      })
      
      await Promise.all(createPromises)
      setSelectedRows([])
      onCouponsChange()
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
      setSelectedRows([])
      onCouponsChange()
      toast({
        title: 'Status updated',
        description: `${selectedRows.length} coupons updated to ${status}`,
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
        />
        
        {/* Traditional Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Search titles..."
            value={filters.q || ''}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            className="max-w-xs"
          />
          <Input
            placeholder="Search merchant..."
            value={filters.merchant || ''}
            onChange={(e) => onFiltersChange({ ...filters, merchant: e.target.value })}
            className="max-w-xs"
          />
          
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
          Ctrl/Cmd+S to save • Enter to edit • Ctrl/Cmd+C/V to copy/paste
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
      <div className="flex-1 ag-theme-quartz">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={filteredColumnDefs}
          getRowId={(params) => params.data.documentId}
          onCellValueChanged={onCellValueChanged}
          onRowDragEnd={onRowDragEnd}
          onSelectionChanged={onSelectionChanged}

          rowSelection="multiple"
          suppressRowClickSelection={false}
          rowDragManaged
          animateRows
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            cellStyle: { lineHeight: '1.4' }
          }}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
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
    </div>
  )
}