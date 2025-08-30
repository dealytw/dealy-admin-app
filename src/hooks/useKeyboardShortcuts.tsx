import { useEffect, useRef, useCallback } from 'react'
import type { GridApi } from 'ag-grid-community'
import type { Coupon } from '../domain/coupons'

interface UseKeyboardShortcutsProps {
  gridRef: React.RefObject<any>
  onSave: () => void
  onCopy: (coupon: Coupon) => void
  onPaste: () => void
  copiedCoupon: Coupon | null
}

export function useKeyboardShortcuts({
  gridRef,
  onSave,
  onCopy,
  onPaste,
  copiedCoupon
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const gridApi = gridRef.current?.api as GridApi | undefined
    if (!gridApi) return

    // Save shortcut (Ctrl/Cmd + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      onSave()
      return
    }

    // Copy shortcut (Ctrl/Cmd + C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const selectedNodes = gridApi.getSelectedNodes()
      if (selectedNodes.length === 1) {
        e.preventDefault()
        onCopy(selectedNodes[0].data)
        return
      }
    }

    // Paste shortcut (Ctrl/Cmd + V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedCoupon) {
      const selectedNodes = gridApi.getSelectedNodes()
      if (selectedNodes.length === 1) {
        e.preventDefault()
        onPaste()
        return
      }
    }

    // Enter to start editing
    if (e.key === 'Enter') {
      const focusedCell = gridApi.getFocusedCell()
      if (focusedCell) {
        e.preventDefault()
        gridApi.startEditingCell({
          rowIndex: focusedCell.rowIndex,
          colKey: focusedCell.column.getColId()
        })
        return
      }
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const focusedCell = gridApi.getFocusedCell()
      if (focusedCell && !gridApi.getEditingCells().length) {
        e.preventDefault()
        const direction = e.key === 'ArrowUp' ? 'up' : 'down'
        const nextRowIndex = direction === 'up' 
          ? Math.max(0, focusedCell.rowIndex - 1)
          : Math.min(gridApi.getDisplayedRowCount() - 1, focusedCell.rowIndex + 1)
        
        gridApi.setFocusedCell(nextRowIndex, focusedCell.column)
        gridApi.getRowNode(`${nextRowIndex}`)?.setSelected(true, true)
        return
      }
    }
  }, [gridRef, onSave, onCopy, onPaste, copiedCoupon])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}