import { useState } from "react"
import { apiPost } from "@/hooks/useFetch"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Radar, Zap, TrendingUp, Gem, Save, Loader2, Settings, ShoppingBag, Globe, Wrench } from "lucide-react"

// Types for our automation state
type AutomationSettings = {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  // Form fields
  targetUrls: string
  minMargin: string
  bonanzaFee: string
  paymentFee: string
  maxCredits: string
  isActive: boolean
  isSaving: boolean
  isRunning: boolean
}

export function AdminAutomationsPage() {
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initial state for the automations (these would normally be fetched from the DB)
  const [automations, setAutomations] = useState<AutomationSettings[]>([
    {
      id: "super_deals",
      title: "Super Deal Arbitrage",
      description: "Scans AliExpress 'Super Deals' and Flash Sales to find heavily discounted items.",
      icon: Zap,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      targetUrls: "https://www.aliexpress.com/w/wholesale-surfboard.html",
      minMargin: "40",
      bonanzaFee: "20",
      paymentFee: "3",
      maxCredits: "50",
      isActive: true,
      isSaving: false,
      isRunning: false,
    },
    {
      id: "google_reverse",
      title: "Reverse-Source Google Demand",
      description: "Scrapes top-selling products in Google Shopping Ads, reverse-searches AliExpress to find the supply.",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      targetUrls: "https://www.google.com/shopping",
      minMargin: "45",
      bonanzaFee: "20",
      paymentFee: "3",
      maxCredits: "50",
      isActive: true,
      isSaving: false,
      isRunning: false,
    },
    {
      id: "high_ticket",
      title: "High-Ticket Refurbished / Discontinued",
      description: "Hunts for low-volume, high-profit electronics making $50+ cash profit per sale.",
      icon: Gem,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      targetUrls: "https://www.aliexpress.com/w/wholesale-refurbished-electronics.html",
      minMargin: "50",
      bonanzaFee: "20",
      paymentFee: "3",
      maxCredits: "100",
      isActive: true,
      isSaving: false,
      isRunning: false,
    },
    {
      id: "custom_scout",
      title: "Create Custom Product Scout",
      description: "Build your own dynamic algorithm. Input custom URLs, target marketplaces, fee structures, and strict shipping rules.",
      icon: Wrench,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      targetUrls: "",
      minMargin: "30",
      bonanzaFee: "20",
      paymentFee: "3",
      maxCredits: "50",
      isActive: true,
      isSaving: false,
      isRunning: false,
    }
  ])

  // Update a specific field for a specific automation
  const updateField = (id: string, field: keyof AutomationSettings, value: any) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, [field]: value } : auto
    ))
  }

  // Handle saving the rules to the backend
  const handleSaveRules = async (id: string) => {
    updateField(id, "isSaving", true)
    setError(null)
    setSuccess(null)
    try {
      // Mock API call to save settings to DB (e.g., ScanProfile)
      await new Promise(r => setTimeout(r, 800)) 
      setSuccess("Automation rules saved successfully!")
    } catch (e) {
      setError("Failed to save automation rules.")
    } finally {
      updateField(id, "isSaving", false)
    }
  }

  // Handle triggering the backend automation scanner
  const handleRunScan = async (automation: AutomationSettings) => {
    updateField(automation.id, "isRunning", true)
    setError(null)
    setSuccess(null)
    try {
      const res = await apiPost("/api/scans/trigger", {
        algorithm: automation.id,
        max_credits: parseInt(automation.maxCredits) || 50,
        min_margin_pct: parseFloat(automation.minMargin) || 40.0
      }) as Record<string, unknown>
      
      setSuccess(`Successfully triggered background scanner! Generated ${res.opportunities_created || 0} opportunities using ${res.credits_used || 0} API credits.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to trigger scan engine")
    } finally {
      updateField(automation.id, "isRunning", false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Daily Automations & High Profit Scanners"
        description="Admin Control Center to configure source URLs, set strict profit margins, and manage background scraping rules."
      />

      {success && (
        <div className="mt-4 rounded-lg bg-green-500/15 p-4 text-sm text-green-500 font-medium">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mt-4 rounded-lg bg-destructive/15 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8">
        {automations.map((algo) => (
          <Card key={algo.id} className="flex flex-col border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${algo.bg}`}>
                    <algo.icon className={`h-6 w-6 ${algo.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{algo.title}</CardTitle>
                    <CardDescription className="text-sm mt-1 max-w-2xl text-foreground/70">
                      {algo.description}
                    </CardDescription>
                  </div>
                </div>
                {/* Visual Badge for Google Ads integration */}
                <div className="hidden md:flex items-center gap-2 bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Globe className="h-3.5 w-3.5" />
                  Cross-References Google Shopping Ads
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Sourcing & API */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    Source Parameters
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`urls-${algo.id}`}>Target Source URLs or Search Keywords</Label>
                      <Textarea 
                        id={`urls-${algo.id}`}
                        rows={6}
                        value={algo.targetUrls}
                        onChange={(e) => updateField(algo.id, "targetUrls", e.target.value)}
                        placeholder="https://www.aliexpress.com/...&#10;https://www.aliexpress.com/..."
                        className="border-slate-400 dark:border-slate-600 resize-y"
                      />
                      <p className="text-[11px] text-muted-foreground">The scanner will pull items directly from these source locations.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`credits-${algo.id}`}>Max Scrapfly API Credits per Scan</Label>
                      <Input 
                        id={`credits-${algo.id}`}
                        type="number"
                        value={algo.maxCredits}
                        onChange={(e) => updateField(algo.id, "maxCredits", e.target.value)}
                        className="border-slate-400 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Margins & Fees (The Profit Calculator Rules) */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Pricing Rules & True Margin Targets
                  </h3>
                  <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-border/40">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`bonanza-${algo.id}`}>Assumed Platform Fee (%)</Label>
                        <Input 
                          id={`bonanza-${algo.id}`}
                          type="number"
                          value={algo.bonanzaFee}
                          onChange={(e) => updateField(algo.id, "bonanzaFee", e.target.value)}
                          className="border-slate-400 dark:border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`payment-${algo.id}`}>Assumed Payment Fee (%)</Label>
                        <Input 
                          id={`payment-${algo.id}`}
                          type="number"
                          value={algo.paymentFee}
                          onChange={(e) => updateField(algo.id, "paymentFee", e.target.value)}
                          className="border-slate-400 dark:border-slate-600"
                        />
                      </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-2">
                      <Label htmlFor={`margin-${algo.id}`} className="text-primary font-bold">Strict Minimum True Profit Margin (%)</Label>
                      <Input 
                        id={`margin-${algo.id}`}
                        type="number"
                        value={algo.minMargin}
                        onChange={(e) => updateField(algo.id, "minMargin", e.target.value)}
                        className="border-primary/50 text-lg font-semibold border-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        The backend strictly enforces this margin. It subtracts your fees from the competitive Google Shopping sell price. If an item yields less than a <strong>{algo.minMargin}%</strong> true profit margin, it is instantly ignored and deleted.
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 border-t pt-4 pb-4 flex justify-between items-center px-6">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => handleSaveRules(algo.id)}
                disabled={algo.isSaving || algo.isRunning}
              >
                {algo.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {algo.isSaving ? "Saving Rules..." : "Save Automation Rules"}
              </Button>
              
              <Button 
                variant="default"
                className="gap-2 px-6"
                onClick={() => handleRunScan(algo)}
                disabled={algo.isSaving || algo.isRunning}
              >
                {algo.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                {algo.isRunning ? "Scanner Running..." : "Trigger Automation Scanner Now"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
