"use client"

import {
  Bar, BarChart,
  Line, LineChart,
  Area, AreaChart,
  XAxis, YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Purple that reads well in both light and dark mode
const CHART_PURPLE = "#8b5cf6"
const CHART_AVERAGE = "#f97316" // orange — contrasts with purple, readable both modes

export interface VisualizationData {
  title: string
  chartType: "bar" | "line" | "area"
  data: { date: string; pages: number }[]
  showAverage?: boolean
  average?: number
}

const chartConfig = {
  pages: { label: "Pages Read", color: CHART_PURPLE },
}

export function VisualizationChart({ title, chartType, data, showAverage, average }: VisualizationData) {
  const formattedData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  }))

  const avg =
    average ??
    (data.length > 0 ? Math.round((data.reduce((s, d) => s + d.pages, 0) / data.length) * 10) / 10 : 0)

  const axisProps = {
    tick: { fontSize: 10, fill: "currentColor", className: "opacity-50" } as React.SVGProps<SVGTextElement>,
    tickLine: false as const,
    axisLine: false as const,
  }

  const avgLine = showAverage ? (
    <ReferenceLine
      y={avg}
      stroke={CHART_AVERAGE}
      strokeWidth={1.5}
      strokeDasharray="5 4"
      label={{
        value: `Avg ${avg}`,
        position: "insideTopRight" as const,
        fontSize: 10,
        fill: CHART_AVERAGE,
        dy: -6,
      }}
    />
  ) : null

  const renderInner = () => {
    if (chartType === "line") {
      return (
        <LineChart data={formattedData}>
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="pages"
            stroke={CHART_PURPLE}
            strokeWidth={2}
            dot={{ fill: CHART_PURPLE, r: 3 }}
            activeDot={{ r: 5 }}
          />
          {avgLine}
        </LineChart>
      )
    }
    if (chartType === "area") {
      return (
        <AreaChart data={formattedData}>
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="pages"
            stroke={CHART_PURPLE}
            fill={CHART_PURPLE}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          {avgLine}
        </AreaChart>
      )
    }
    // default: bar
    return (
      <BarChart data={formattedData}>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="pages" fill={CHART_PURPLE} radius={[4, 4, 0, 0]} />
        {avgLine}
      </BarChart>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderInner()}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/** Backward-compat wrapper used by existing getDailyReadingStats flow */
export function ReadingChart({ data }: { data: { date: string; pages: number }[] }) {
  return <VisualizationChart title="Pages Read per Day" chartType="bar" data={data} />
}
