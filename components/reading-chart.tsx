"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ReadingChartProps {
  data: { date: string; pages: number }[]
}

export function ReadingChart({ data }: ReadingChartProps) {
  // Format dates for display
  const formattedData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  }))

  const chartConfig = {
    pages: {
      label: "Pages Read",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pages Read per Day</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pages" fill="var(--color-pages)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
