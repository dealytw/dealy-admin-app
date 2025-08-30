import { Badge } from './ui/badge'
import { AlertTriangle, Link, Code, Clock } from 'lucide-react'
import type { Coupon } from '../domain/coupons'

interface ValidationBadgesProps {
  coupon: Coupon
}

interface ValidationIssue {
  type: 'missing-link' | 'missing-code' | 'expiring-soon'
  message: string
  severity: 'error' | 'warning'
}

function getValidationIssues(coupon: Coupon): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  // Missing affiliate link
  if (!coupon.affiliate_link?.trim()) {
    issues.push({
      type: 'missing-link',
      message: 'Missing affiliate link',
      severity: 'error'
    })
  }
  
  // Missing code for promo code types
  if (coupon.coupon_type === 'promo_code' && !coupon.code?.trim()) {
    issues.push({
      type: 'missing-code', 
      message: 'Missing promo code',
      severity: 'error'
    })
  }
  
  // Expiring soon (within 48 hours)
  if (coupon.expires_at) {
    const expiryDate = new Date(coupon.expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 48) {
      issues.push({
        type: 'expiring-soon',
        message: `Expires in ${Math.round(hoursUntilExpiry)}h`,
        severity: 'warning'
      })
    }
  }
  
  return issues
}

function getIcon(type: ValidationIssue['type']) {
  switch (type) {
    case 'missing-link':
      return <Link className="h-3 w-3" />
    case 'missing-code':
      return <Code className="h-3 w-3" />
    case 'expiring-soon':
      return <Clock className="h-3 w-3" />
    default:
      return <AlertTriangle className="h-3 w-3" />
  }
}

export function ValidationBadges({ coupon }: ValidationBadgesProps) {
  const issues = getValidationIssues(coupon)
  
  if (issues.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((issue, index) => (
        <Badge
          key={index}
          variant={issue.severity === 'error' ? 'destructive' : 'secondary'}
          className="text-xs flex items-center gap-1"
        >
          {getIcon(issue.type)}
          {issue.message}
        </Badge>
      ))}
    </div>
  )
}

export function ValidationCell({ data }: { data: Coupon }) {
  return <ValidationBadges coupon={data} />
}