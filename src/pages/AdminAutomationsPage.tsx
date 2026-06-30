import { useState } from "react"
import { useFetch, apiPost } from "@/hooks/useFetch"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Radar, Zap, TrendingUp, Gem, Wrench, Loader2, Info } from "lucide-react"

export function AdminAutomationsPage() {
  const [activeAlgorithm, setActiveAlgorithm] = useState<string | null>(null)
  const [maxCredits, setMaxCredits] = useState("50")
  const [targetMargin, setTargetMargin] = useState("30")
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const algorithms = [
    {
      id: "super_deals",
      title: "Super Deal Arbitrage",
      icon: Zap,
      description: "Scans AliExpress 'Super Deals' and Flash Sales. Filters out heavy/food items and requires Free Shipping.",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      id: "google_reverse",
      title: "Reverse-Source Google Demand",
      icon: TrendingUp,
      description: "Scrapes top-selling products in Google Shopping Ads, reverse-searches AliExpress to find the exact supply, and calculates profit margins.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      id: "high_ticket",
      title: "High-Ticket Refurbished / Discontinued",
      icon: Gem,
      description: "Hunts for low-volume, high-profit electronics (e.g. refurbished smart watches, discontinued toys) making $50+ cash profit per sale.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      id: "custom_scout",
      title: "Create Custom Product Scout",
      icon: Wrench,
      description: "Build your own dynamic algorithm. Input custom URLs, target marketplaces, fee structures, and strict shipping rules.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      disabled: true, 
    },
  ]

  async function handleRunScan() {
    if (!activeAlgorithm) return
    setIsRunning(true)
    setError(null)
    setSuccess(null)
    
    try {
      const res = await apiPost("/api/scans/trigger", {
        algorithm: activeAlgorithm,
        max_credits: parseInt(maxCredits) || 50,
        min_margin_pct: parseFloat(targetMargin) || 30.0
      })
      setSuccess(`Successfully triggered scan engine! Scraped ${res.items_found || 0} potential items, generated ${res.opportunities_created || 0} opportunities using ${res.credits_used || 0} API credits.`)
      setActiveAlgorithm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run scan engine")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Automations & High Profit Finders"
        description="Admin Control Center for managing background scraping algorithms and deal engines."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {algorithms.map((algo) => (
          <Card key={algo.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${algo.bg}`}>
                  <algo.icon className={`h-5 w-5 ${algo.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{algo.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-sm text-foreground/80 leading-relaxed">
                {algo.description}
              </CardDescription>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                variant={algo.disabled ? "outline" : "default"} 
                className="w-full gap-2"
                disabled={algo.disabled}
                onClick={() => setActiveAlgorithm(algo.id)}
              >
                <Radar className="h-4 w-4" />
                {algo.disabled ? "Coming Soon" : "Run Test Scan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {success && (
        <div className="mt-8 rounded-lg bg-green-500/15 p-4 text-sm text-green-500 font-medium">
          {success}
        </div>
      )}

      {/* Credit Limiter Modal */}
      <Dialog open={activeAlgorithm !== null} onOpenChange={(open) => !open && !isRunning && setActiveAlgorithm(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border border-border">
          <DialogHeader>
            <DialogTitle>Configure Engine Execution</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <div className="rounded-lg bg-primary/10 p-3 flex gap-3 text-sm text-primary">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <p>The engine will physically abort once it reaches your API credit limit to protect your monthly billing cycle.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max_credits">Maximum API Credits to Spend</Label>
                <Input 
                  id="max_credits"
                  type="number" 
                  value={maxCredits}
                  onChange={(e) => setMaxCredits(e.target.value)}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_margin">Target Minimum Profit Margin (%)</Label>
                <Input 
                  id="target_margin"
                  type="number" 
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">Lower this number if the engine returns 0 opportunities. (Excludes cashback).</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAlgorithm(null)} disabled={isRunning}>Cancel</Button>
            <Button onClick={handleRunScan} disabled={isRunning} className="gap-2">
              {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRunning ? "Running Engine..." : "Start Engine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
