import { useEffect, useState, useRef, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, RowDragEndEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { MerchantSelector } from './MerchantSelector'
import { useToast } from '../hooks/use-toast'
import type { Coupon, CouponFilters, Merchant } from '../domain/coupons'
import { couponsAdapter } from '../data/strapiCoupons'
import { Trash2, Save, RotateCcw, Users } from 'lucide-react'
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
  const gridRef = useRef<AgGridReact>(null)
  const { toast } = useToast()

  useEffect(() => {
    setRowData(coupons)
  }, [coupons])

  const StatusBadge = ({ value }: { value: string }) => {
    const variant = value === 'active' ? 'default' : 
                  value === 'upcoming' ? 'secondary' : 'outline'
    return <Badge variant={variant}>{value}</Badge>
  }

  const MerchantCell = ({ data, node }: any) => (
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
      editable: true
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

  const handleSave = async () => {
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
  }

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

  const pendingCount = Object.keys(pendingChanges).length

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex gap-4 p-4 border-b bg-card">
        <Input
          placeholder="Search titles..."
          value={filters.q || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
          className="max-w-xs"
        />
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
        <div className="flex-1" />
        {pendingCount > 0 && (
          <>
            <Button
              variant="outline"
              onClick={() => setPendingChanges({})}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save ({pendingCount})
            </Button>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-alpine-dark">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.documentId}
          onCellValueChanged={onCellValueChanged}
          onRowDragEnd={onRowDragEnd}
          rowDragManaged
          animateRows
          suppressRowClickSelection
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
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