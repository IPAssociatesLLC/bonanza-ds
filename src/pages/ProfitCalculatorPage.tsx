import { useState, useMemo } from "react"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { Calculator, TrendingUp, TrendingDown, DollarSign, Percent, Sparkles, ArrowRight } from "lucide-react"

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

interface CalcResult {
  totalCost: number
  bonanzaFee: number
  grossProfit: number
  marginPct: number
  cashbackAmount: number
  finalProfit: number
  finalMarginPct: number
}

function calculate(
  sourcePrice: number,
  shippingCost: number,
  targetPrice: number,
  bonanzaFeePct: number,
  cashbackRatePct: number,
  additionalCosts: number,
): CalcResult {
  const totalCost = sourcePrice + shippingCost + additionalCosts
  const bonanzaFee = targetPrice * (bonanzaFeePct / 100)
  const grossProfit = targetPrice - bonanzaFee - totalCost
  const marginPct = targetPrice > 0 ? (grossProfit / targetPrice) * 100 : 0
  const cashbackAmount = sourcePrice * (cashbackRatePct / 100)
  const finalProfit = grossProfit + cashbackAmount
  const finalMarginPct = targetPrice > 0 ? (finalProfit / targetPrice) * 100 : 0
  return { totalCost, bonanzaFee, grossProfit, marginPct, cashbackAmount, finalProfit, finalMarginPct }
}

function suggestMinPrice(
  sourcePrice: number,
  shippingCost: number,
  bonanzaFeePct: number,
  cashbackRatePct: number,
  additionalCosts: number,
  targetMarginPct: number = 30,
): number {
  // Solve for targetPrice where finalMarginPct = targetMarginPct
  // finalMarginPct = (finalProfit / targetPrice) * 100
  // finalProfit = targetPrice - bonanzaFee - totalCost + cashbackAmount
  //             = targetPrice * (1 - feePct/100) - totalCost + cashbackAmount
  // targetMarginPct/100 = (targetPrice * (1 - feePct/100) - totalCost + cashbackAmount) / targetPrice
  // targetMarginPct/100 = (1 - feePct/100) - (totalCost - cashbackAmount) / targetPrice
  // (totalCost - cashbackAmount) / targetPrice = (1 - feePct/100) - targetMarginPct/100
  // targetPrice = (totalCost - cashbackAmount) / ((1 - feePct/100) - targetMarginPct/100)
  const totalCost = sourcePrice + shippingCost + additionalCosts
  const cashbackAmount = sourcePrice * (cashbackRatePct / 100)
  const denominator = (1 - bonanzaFeePct / 100) - targetMarginPct / 100
  if (denominator <= 0) return 0
  const minPrice = (totalCost - cashbackAmount) / denominator
  return Math.max(0, Math.ceil(minPrice * 100) / 100)
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export function ProfitCalculatorPage() {
  const [sourcePrice, setSourcePrice] = useState("10.00")
  const [shippingCost, setShippingCost] = useState("2.50")
  const [targetPrice, setTargetPrice] = useState("24.99")
  const [bonanzaFeePct, setBonanzaFeePct] = useState("20")
  const [cashbackRatePct, setCashbackRatePct] = useState("0")
  const [additionalCosts, setAdditionalCosts] = useState("0")
  const [calculated, setCalculated] = useState(false)

  const result = useMemo(() => {
    return calculate(
      parseFloat(sourcePrice) || 0,
      parseFloat(shippingCost) || 0,
      parseFloat(targetPrice) || 0,
      parseFloat(bonanzaFeePct) || 0,
      parseFloat(cashbackRatePct) || 0,
      parseFloat(additionalCosts) || 0,
    )
  }, [sourcePrice, shippingCost, targetPrice, bonanzaFeePct, cashbackRatePct, additionalCosts])

  const isProfitable = result.finalMarginPct >= 30

  const chartData = useMemo(() => [
    { name: "Without Cashback", margin: parseFloat(result.marginPct.toFixed(1)) },
    { name: "With Cashback", margin: parseFloat(result.finalMarginPct.toFixed(1)) },
  ], [result])

  function handleSuggestPrice() {
    const suggested = suggestMinPrice(
      parseFloat(sourcePrice) || 0,
      parseFloat(shippingCost) || 0,
      parseFloat(bonanzaFeePct) || 0,
      parseFloat(cashbackRatePct) || 0,
      parseFloat(additionalCosts) || 0,
    )
    if (suggested > 0) {
      setTargetPrice(suggested.toFixed(2))
      setCalculated(true)
    }
  }

  function handleCalculate() {
    setCalculated(true)
  }

  return (
    <div>
      <PageHeader
        title="Profit Calculator"
        description="Calculate drop shipping margins and profitability"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              Input Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="source-price">Source Price ($)</Label>
                <Input
                  id="source-price"
                  type="number"
                  step="0.01"
                  value={sourcePrice}
                  onChange={(e) => setSourcePrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipping-cost">Shipping Cost ($)</Label>
                <Input
                  id="shipping-cost"
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-price">Target Price — Bonanza ($)</Label>
                <Input
                  id="target-price"
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="additional-costs">Additional Costs ($)</Label>
                <Input
                  id="additional-costs"
                  type="number"
                  step="0.01"
                  value={additionalCosts}
                  onChange={(e) => setAdditionalCosts(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bonanza-fee">Bonanza Fee (%)</Label>
                <Input
                  id="bonanza-fee"
                  type="number"
                  step="0.1"
                  value={bonanzaFeePct}
                  onChange={(e) => setBonanzaFeePct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cashback-rate">Cashback Rate (%)</Label>
                <Input
                  id="cashback-rate"
                  type="number"
                  step="0.1"
                  value={cashbackRatePct}
                  onChange={(e) => setCashbackRatePct(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCalculate} className="flex-1">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate
              </Button>
              <Button variant="outline" onClick={handleSuggestPrice}>
                <Sparkles className="mr-2 h-4 w-4" />
                Suggest Price (30% margin)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Margin indicator */}
            <div className={`flex items-center justify-between rounded-lg border p-4 ${
              isProfitable
                ? "border-green-500/30 bg-green-500/10"
                : "border-destructive/30 bg-destructive/10"
            }`}>
              <div className="flex items-center gap-3">
                {isProfitable ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Final Margin</p>
                  <p className={`text-2xl font-bold ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                    {result.finalMarginPct.toFixed(1)}%
                  </p>
                </div>
              </div>
              <Badge className={isProfitable ? "bg-green-500/15 text-green-500 hover:bg-green-500/20" : "bg-destructive/15 text-destructive hover:bg-destructive/20"}>
                {isProfitable ? "Profitable" : "Below Target"}
              </Badge>
            </div>

            {/* Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium text-foreground">{formatCurrency(result.totalCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bonanza Fee</span>
                <span className="font-medium text-foreground">–{formatCurrency(result.bonanzaFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gross Profit</span>
                <span className={`font-medium ${result.grossProfit >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {formatCurrency(result.grossProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margin (before cashback)</span>
                <span className="font-medium text-foreground">{result.marginPct.toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cashback Amount</span>
                <span className="font-medium text-green-500">+{formatCurrency(result.cashbackAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-foreground">Final Profit</span>
                <span className={`font-bold ${result.finalProfit >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {formatCurrency(result.finalProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Percent className="h-4 w-4" />
                  Final Margin
                </span>
                <span className={`font-bold ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                  {result.finalMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {calculated && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>
                    {isProfitable
                      ? `This product meets the 30% margin target with ${result.finalMarginPct.toFixed(1)}% final margin.`
                      : `This product is below the 30% margin target. Consider increasing the price or reducing costs.`}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Margin Comparison: With vs Without Cashback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => `${(v as number).toFixed(1)}%`}
              />
              <Bar dataKey="margin" radius={[4, 4, 0, 0]} name="Margin %">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.margin >= 30 ? "hsl(142 71% 45%)" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
