import { TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import { supabase } from '~/lib/supabase'
import { cn } from '~/lib/utils'
import type { Tables } from '~/types/database'

type Bid = Tables<'bids'>

interface BidChartProps {
  itemId: string
  startingBid: number
  compact?: boolean
  className?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatTime(date: string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const chartConfig = {
  value: {
    label: 'Lance',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

export function BidChart({
  itemId,
  startingBid,
  compact = false,
  className,
}: BidChartProps) {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBids()

    // Subscribe to new bids
    const channel = supabase
      .channel(`bid-chart:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          fetchBids()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId])

  const fetchBids = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('item_id', itemId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(30)

      if (error) throw error

      setBids(data || [])
    } catch (err) {
      console.error('Error fetching bids for chart:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  // If no bids, don't show the chart
  if (bids.length === 0) {
    return null
  }

  // Prepare chart data
  const chartData = [
    // Add starting point
    {
      time: 'Início',
      value: startingBid,
      created_at: '',
    },
    // Add all bids
    ...bids.map((bid, index) => ({
      time: bid.created_at ? formatTime(bid.created_at) : '—',
      value: bid.value,
      created_at: bid.created_at || '',
      bidNumber: index + 1,
    })),
  ]

  const maxValue = Math.max(...chartData.map((d) => d.value))
  const minValue = Math.min(...chartData.map((d) => d.value))
  const trend =
    bids.length > 1 ? bids[bids.length - 1].value - bids[0].value : 0

  const chartHeight = compact ? 'h-[150px]' : 'h-[200px]'

  const chartElement = (
    <ChartContainer config={chartConfig} className={cn(chartHeight, 'w-full')}>
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-value)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-value)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: compact ? 10 : 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: compact ? 10 : 12 }}
          tickFormatter={(value) => `R$ ${(value / 1).toLocaleString('pt-BR')}`}
          domain={[minValue * 0.95, maxValue * 1.05]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload as any
                  if (data.bidNumber) {
                    return `Lance #${data.bidNumber}`
                  }
                }
                return value
              }}
              formatter={(value) => formatCurrency(value as number)}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fill="url(#fillValue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Evolução
          </h3>
          <p className="text-xs text-muted-foreground">
            {bids.length} {bids.length === 1 ? 'lance' : 'lances'}
            {trend > 0 && (
              <span className="ml-1 text-primary font-medium">
                +{formatCurrency(trend)}
              </span>
            )}
          </p>
        </div>
        {chartElement}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="size-4" />
          Evolução dos Lances
        </CardTitle>
        <CardDescription>
          {bids.length} {bids.length === 1 ? 'lance' : 'lances'} registrados
          {trend > 0 && (
            <span className="ml-2 text-primary">
              (+{formatCurrency(trend)})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 px-4">{chartElement}</CardContent>
    </Card>
  )
}
