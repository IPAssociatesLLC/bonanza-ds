import { useState, useEffect, useCallback } from "react"
import { useFetch, apiPut } from "@/hooks/useFetch"
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Percent,
  DollarSign,
  TrendingUp,
  Receipt,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import type { AppSettings } from "@/types"

interface PricingRules {
  default_min_margin: number
  bonanza_google_fee: number
  additional_cost_buffer: number
  default_cashback_rate: number
  cashback_apply_to: "source_cost" | "target_price"
  min_cashback_consider: number
  price_rounding: "none" | ".99" | ".95" | ".00"
  max_price_markup: number
  min_price_above_source: number
  bonanza_transaction_fee: number
  payment_processing_fee: number
  fixed_fee_per_transaction: number
}

const DEFAULTS: PricingRules = {
  default_min_margin: 30,
  bonanza_google_fee: 20,
  additional_cost_buffer: 0,
  default_cashback_rate: 0,
  cashback_apply_to: "source_cost",
  min_cashback_consider: 1,
  price_rounding: "none",
  max_price_markup: 200,
  min_price_above_source: 10,
  bonanza_transaction_fee: 3.5,
  payment_processing_fee: 2.9,
  fixed_fee_per_transaction: 0.30,
}

function getNum(settings: AppSettings | null, key: string, fallback: number): number {
  if (!settings || !settings[key]) return fallback
  const v = parseFloat(settings[key].value)
  return isNaN(v) ? fallback : v
}

function getStr(settings: AppSettings | null, key: string, fallback: string): string {
  if (!settings || !settings[key]) return fallback
  return settings[key].value
}

export function PricingRulesPage() {
  const { data: settings, loading, error, refetch } = useFetch<AppSettings>("/api/settings")
  const [rules, setRules] = useState<PricingRules>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    setRules({
      default_min_margin: getNum(settings, "default_min_margin", 30),
      bonanza_google_fee: getNum(settings, "bonanza_google_fee", 20),
      additional_cost_buffer: getNum(settings, "additional_cost_buffer", 0),
      default_cashback_rate: getNum(settings, "default_cashback_rate", 0),
      cashback_apply_to: getStr(settings, "cashback_apply_to", "source_cost") as "source_cost" | "target_price",
      min_cashback_consider: getNum(settings, "min_cashback_consider", 1),
      price_rounding: getStr(settings, "price_rounding", "none") as PricingRules["price_rounding"],
      max_price_markup: getNum(settings, "max_price_markup", 200),
      min_price_above_source: getNum(settings, "min_price_above_source", 10),
      bonanza_transaction_fee: getNum(settings, "bonanza_transaction_fee", 3.5),
      payment_processing_fee: getNum(settings, "payment_processing_fee", 2.9),
      fixed_fee_per_transaction: getNum(settings, "fixed_fee_per_transaction", 0.30),
    })
  }, [settings])

  const update = useCallback(<K extends keyof PricingRules>(key: K, value: PricingRules[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const entries: { key: string; value: string; category: string; description: string }[] = [
        { key: "default_min_margin", value: String(rules.default_min_margin), category: "pricing", description: "Default minimum margin %" },
        { key: "bonanza_google_fee", value: String(rules.bonanza_google_fee), category: "pricing", description: "Bonanza Google Products fee %" },
        { key: "additional_cost_buffer", value: String(rules.additional_cost_buffer), category: "pricing", description: "Additional cost buffer %" },
        { key: "default_cashback_rate", value: String(rules.default_cashback_rate), category: "pricing", description: "Default cashback rate %" },
        { key: "cashback_apply_to", value: rules.cashback_apply_to, category: "pricing", description: "Apply cashback to" },
        { key: "min_cashback_consider", value: String(rules.min_cashback_consider), category: "pricing", description: "Min cashback to consider %" },
        { key: "price_rounding", value: rules.price_rounding, category: "pricing", description: "Price rounding strategy" },
        { key: "max_price_markup", value: String(rules.max_price_markup), category: "pricing", description: "Max price markup %" },
        { key: "min_price_above_source", value: String(rules.min_price_above_source), category: "pricing", description: "Min price above source %" },
        { key: "bonanza_transaction_fee", value: String(rules.bonanza_transaction_fee), category: "pricing", description: "Bonanza transaction fee %" },
        { key: "payment_processing_fee", value: String(rules.payment_processing_fee), category: "pricing", description: "Payment processing fee %" },
        { key: "fixed_fee_per_transaction", value: String(rules.fixed_fee_per_transaction), category: "pricing", description: "Fixed fee per transaction $" },
      ]
      await Promise.all(entries.map((e) => apiPut("/api/settings", e)))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save rules")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading pricing rules..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <PageHeader title="Pricing Rules" description="Configure default margins, fees, and pricing strategy" />

      <div className="space-y-6">
        {/* Default Margin Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Default Margin Rules</CardTitle>
                <CardDescription className="text-xs">Set baseline profitability thresholds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Default Minimum Margin</Label>
                <span className="text-sm font-medium text-primary tabular-nums">{rules.default_min_margin}%</span>
              </div>
              <Slider
                value={[rules.default_min_margin]}
                onValueChange={(v) => update("default_min_margin", v[0])}
                min={10}
                max={80}
                step={1}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bonanza Google Products Fee</Label>
                <span className="text-sm font-medium text-primary tabular-nums">{rules.bonanza_google_fee}%</span>
              </div>
              <Slider
                value={[rules.bonanza_google_fee]}
                onValueChange={(v) => update("bonanza_google_fee", v[0])}
                min={5}
                max={25}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-buffer">Additional Cost Buffer (%)</Label>
              <Input
                id="cost-buffer"
                type="number"
                min={0}
                step="0.1"
                value={rules.additional_cost_buffer}
                onChange={(e) => update("additional_cost_buffer", parseFloat(e.target.value) || 0)}
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">Extra buffer added to source cost for unexpected expenses</p>
            </div>
          </CardContent>
        </Card>

        {/* Cashback Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Cashback Settings</CardTitle>
                <CardDescription className="text-xs">Configure cashback rate application</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cashback-rate">Default Cashback Rate (%)</Label>
                <Input
                  id="cashback-rate"
                  type="number"
                  min={0}
                  step="0.1"
                  value={rules.default_cashback_rate}
                  onChange={(e) => update("default_cashback_rate", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-cashback">Min Cashback to Consider (%)</Label>
                <Input
                  id="min-cashback"
                  type="number"
                  min={0}
                  step="0.1"
                  value={rules.min_cashback_consider}
                  onChange={(e) => update("min_cashback_consider", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Apply Cashback To</Label>
              <RadioGroup
                value={rules.cashback_apply_to}
                onValueChange={(v) => update("cashback_apply_to", v as "source_cost" | "target_price")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="source_cost" id="cb-source" />
                  <Label htmlFor="cb-source" className="cursor-pointer font-normal">Source Cost</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="target_price" id="cb-target" />
                  <Label htmlFor="cb-target" className="cursor-pointer font-normal">Target Price</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Price Strategy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Price Strategy</CardTitle>
                <CardDescription className="text-xs">Control pricing and markup behavior</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Price Rounding</Label>
              <Select
                value={rules.price_rounding}
                onValueChange={(v) => update("price_rounding", v as PricingRules["price_rounding"])}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Rounding</SelectItem>
                  <SelectItem value=".99">Round to .99</SelectItem>
                  <SelectItem value=".95">Round to .95</SelectItem>
                  <SelectItem value=".00">Round to .00</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-markup">Max Price Markup (%)</Label>
                <Input
                  id="max-markup"
                  type="number"
                  min={0}
                  value={rules.max_price_markup}
                  onChange={(e) => update("max_price_markup", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-above-source">Min Price Above Source (%)</Label>
                <Input
                  id="min-above-source"
                  type="number"
                  min={0}
                  value={rules.min_price_above_source}
                  onChange={(e) => update("min_price_above_source", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Structure */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Fee Structure</CardTitle>
                <CardDescription className="text-xs">Platform and payment processing fees</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="txn-fee">Bonanza Transaction Fee (%)</Label>
                <Input
                  id="txn-fee"
                  type="number"
                  min={0}
                  step="0.1"
                  value={rules.bonanza_transaction_fee}
                  onChange={(e) => update("bonanza_transaction_fee", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proc-fee">Payment Processing Fee (%)</Label>
                <Input
                  id="proc-fee"
                  type="number"
                  min={0}
                  step="0.1"
                  value={rules.payment_processing_fee}
                  onChange={(e) => update("payment_processing_fee", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed-fee">Fixed Fee per Transaction ($)</Label>
                <Input
                  id="fixed-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.fixed_fee_per_transaction}
                  onChange={(e) => update("fixed_fee_per_transaction", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3 pb-4">
          {saveError && <span className="text-sm text-destructive">{saveError}</span>}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" /> Rules saved successfully
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Rules
          </Button>
        </div>
      </div>
    </div>
  )
}
