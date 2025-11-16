import { TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'

interface StickyBidBarProps {
  minBid: number
  bidStep: number
  onPlaceBid: (value: number) => Promise<void>
  disabled?: boolean
  className?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function StickyBidBar({
  minBid,
  bidStep,
  onPlaceBid,
  disabled = false,
  className,
}: StickyBidBarProps) {
  const [bidValue, setBidValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const value = parseFloat(bidValue)
    if (isNaN(value) || value < minBid) return

    setSubmitting(true)
    try {
      await onPlaceBid(value)
      setBidValue('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickBid = async (value: number) => {
    setSubmitting(true)
    try {
      await onPlaceBid(value)
    } finally {
      setSubmitting(false)
    }
  }

  const quickBids = [minBid, minBid + bidStep * 5, minBid + bidStep * 10]

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-background/95 backdrop-blur-sm border-t shadow-2xl',
        'p-3 pb-safe',
        className
      )}
    >
      <div className="container mx-auto max-w-2xl space-y-2">
        {/* Main Bid Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={formatCurrency(minBid)}
            value={bidValue}
            onChange={(e) => setBidValue(e.target.value)}
            step={bidStep}
            min={minBid}
            disabled={submitting || disabled}
            className="min-h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || disabled || !bidValue}
            className="min-h-12 px-6"
            size="lg"
          >
            {submitting ? (
              <Spinner className="size-4" />
            ) : (
              <>
                <TrendingUp className="size-4 mr-2" />
                Lance
              </>
            )}
          </Button>
        </div>

        {/* Quick Bid Buttons */}
        <div className="flex gap-2">
          <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
            Rápido:
          </span>
          {quickBids.map((value) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickBid(value)}
              disabled={submitting || disabled}
              className="flex-1 min-h-9 text-xs"
            >
              {formatCurrency(value)}
            </Button>
          ))}
        </div>

        {/* Min Bid Info */}
        <p className="text-xs text-center text-muted-foreground">
          Lance mínimo: {formatCurrency(minBid)}
        </p>
      </div>
    </div>
  )
}
