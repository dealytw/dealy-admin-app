import { useEffect, useState, useRef, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, RowDragEndEvent, SelectionChangedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

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
import { mockCouponsAdapter as couponsAdapter, mockMerchantsAdapter as merchantsAdapter } from '../data/mockCoupons'
import { Trash2, Save, RotateCcw, Users, Settings, Copy, Archive, Edit3, Clipboard } from 'lucide-react'
import { format } from 'date-fns'

interface CouponGridProps {
  coupons: Coupon[]
  onCouponsChange: () => void
}

export function CouponGrid({ coupons, onCouponsChange }: CouponGridProps) {
  const [rowData, setRowData] = useState<Coupon[]>([])
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [merchantSelectorOpen, setMerchantSelectorOpen] = useState(false)
  const [selectedRowForMerchant, setSelectedRowForMerchant] = useState<string | null>(null)
  const [filters, setFilters] = useState<CouponFilters>({})
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [copiedCoupon, setCopiedCoupon] = useState<Coupon | null>(null)
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

  useEffect(() => {
    setRowData(coupons)
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
                  value === 'upcoming' ? 'secondary' : 'outline'
    return <Badge variant={variant}>{value}</Badge>
  }

  const MerchantCell = ({ data }: any) => (
    <button
      onClick={() => {
        setSelectedRowForMerchant(data.documentId)
        setMerchantSelectorOpen(true)
      }}
      className="text-left hover:underline"
    >
      {data.merchant?.name || 'Select merchant...'}
    </button>
  )

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
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left'
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
      valueGetter: (params) => params.data.merchant?.name || ''
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
      field: 'market', 
      headerName: 'Market',
      width: 120,
      editable: true
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
      editable: true
    },
    { 
      field: 'site', 
      headerName: 'Site',
      width: 100,
      editable: true
    },
    {
      field: 'coupon_status',
      headerName: 'Status',
      width: 100,
      cellRenderer: StatusBadge,
      editable: false
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

    // Update the row data immediately for UI
    setRowData(prev => prev.map(row => 
      row.documentId === selectedRowForMerchant 
        ? { ...row, merchant }
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

  const handleBulkStatusChange = async (status: 'active' | 'upcoming' | 'expired') => {
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
          onFiltersChange={setFilters}
        />
        
        {/* Traditional Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Search titles..."
            value={filters.q || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
            className="max-w-xs"
          />
          <Input
            placeholder="Search merchant..."
            value={filters.merchant || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, merchant: e.target.value }))}
            className="max-w-xs"
          />
          <Select
            value={filters.site || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, site: value === 'all' ? undefined : value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="deals">Deals</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.market || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, market: value === 'all' ? undefined : value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="CA">CA</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.coupon_status || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, coupon_status: value === 'all' ? undefined : value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
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
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
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
      <div className="flex-1 ag-theme-alpine-dark">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={filteredColumnDefs}
          getRowId={(params) => params.data.documentId}
          onCellValueChanged={onCellValueChanged}
          onRowDragEnd={onRowDragEnd}
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          rowDragManaged
          animateRows
          suppressRowClickSelection={false}
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