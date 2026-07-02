import { useState, useRef, useEffect } from "react"
import { Bot, Crosshair, Terminal, ShieldCheck, Cpu, Send, Search, Clock, ExternalLink, Save } from "lucide-react"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Mock results matching the detailed requirements
const MOCK_RESULTS = [
  {
    id: 1,
    title: "Milwaukee 36 Pc Socket Set",
    image: "https://images.thdstatic.com/productImages/0c441dc4-b772-4632-9c16-98bb4b5314b9/svn/milwaukee-socket-sets-48-22-9004-64_1000.jpg",
    sourceSite: "ShopSavvy",
    sourceUrl: "#",
    dealPrice: "$45.00",
    googlePrice: "$99.99",
    margin: "52.8%",
    profit: "$54.99",
    cashbackSite: "TopCashback",
    cashbackAmount: "5.0%",
    searchVol: "1,200/mo",
    dealEnds: "24h",
    status: "Verified",
  },
  {
    id: 2,
    title: "Waydoo Flyer ONE Plus E-Foil",
    image: "https://waydootech.com/cdn/shop/files/1_c8d28a30-819f-4f81-a96e-a74577ab0a70.png?v=1706692736",
    sourceSite: "AliExpress SuperDeals",
    sourceUrl: "#",
    dealPrice: "$4,100.00",
    googlePrice: "$5,999.00",
    margin: "31.0%",
    profit: "$1,899.00",
    cashbackSite: "Rakuten",
    cashbackAmount: "3.5%",
    searchVol: "4,500/mo",
    dealEnds: "3 Days",
    status: "Verified",
  }
]

export function AdminAiScoutPage() {
  const [targetUrls, setTargetUrls] = useState("")
  const [minMargin, setMinMargin] = useState("40")
  const [minSearchVolume, setMinSearchVolume] = useState("500")
  const [maxDealDuration, setMaxDealDuration] = useState("7")
  const [cashbackSites, setCashbackSites] = useState("TopCashback, Rakuten")
  const [minCashbackRate, setMinCashbackRate] = useState("2.0")
  
  const [isScanning, setIsScanning] = useState(false)

  const handleDeploySwarm = (e: React.FormEvent) => {
    e.preventDefault()
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <PageHeader 
        title="AI Scout Swarm" 
        description="Autonomous multi-agent drop shipping intelligence. Configure custom hunt parameters below."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 min-h-0 pb-6">
        
        {/* LEFT PANEL: Custom Configuration Form */}
        <div className="col-span-1 lg:col-span-5 flex flex-col h-full overflow-hidden">
          <Card className="flex flex-col h-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-blue-500" />
                Custom Hunt Parameters
              </CardTitle>
              <CardDescription className="text-sm mt-1 text-foreground/70">
                Dial in the exact logic for the AI Swarm to execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="space-y-3">
                <Label className="text-base font-semibold">Target Source Sites / URLs</Label>
                <Textarea 
                  placeholder="https://shopsavvy.com/deals&#10;https://aliexpress.com/superdeals"
                  value={targetUrls}
                  onChange={(e) => setTargetUrls(e.target.value)}
                  className="min-h-[100px] border-slate-300 dark:border-slate-700"
                />
              </div>

              <Separator className="bg-slate-300 dark:bg-slate-700" />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Min Profit Margin (%)</Label>
                  <Input 
                    type="number" 
                    value={minMargin}
                    onChange={(e) => setMinMargin(e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Min Search Volume</Label>
                  <Input 
                    type="number" 
                    value={minSearchVolume}
                    onChange={(e) => setMinSearchVolume(e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Max Deal Duration (Days Left)</Label>
                <Input 
                  type="number" 
                  value={maxDealDuration}
                  onChange={(e) => setMaxDealDuration(e.target.value)}
                  className="border-slate-300 dark:border-slate-700"
                  placeholder="e.g. 7"
                />
              </div>

              <Separator className="bg-slate-300 dark:bg-slate-700" />

              <div className="space-y-3">
                <Label className="text-base font-semibold">Cashback Scraper</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Cashback Sites to Scan</Label>
                    <Input 
                      value={cashbackSites}
                      onChange={(e) => setCashbackSites(e.target.value)}
                      className="border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Min Rate (%)</Label>
                    <Input 
                      type="number" 
                      value={minCashbackRate}
                      onChange={(e) => setMinCashbackRate(e.target.value)}
                      className="border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
            
            <div className="p-4 border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
              <Button 
                size="lg" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md text-base"
                onClick={handleDeploySwarm}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>Initializing Swarm...</>
                ) : (
                  <>
                    <Terminal className="w-5 h-5 mr-2" />
                    Deploy AI Swarm Now
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: The Trophy Room (Detailed Results) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col h-full overflow-hidden">
          <Card className="flex flex-col h-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Live Swarm Discoveries
              </CardTitle>
              <CardDescription className="text-sm mt-1 text-foreground/70">
                Highly detailed breakdown of validated opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-6">
              
              {MOCK_RESULTS.map((result) => (
                <div key={result.id} className="bg-white dark:bg-slate-950 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
                  
                  {/* Image Section - Taller, object-contain, no dark overlays */}
                  <div className="md:w-1/3 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative flex items-center justify-center p-4 min-h-[250px]">
                    <img 
                      src={result.image} 
                      alt={result.title} 
                      className="w-full h-full object-contain max-h-[250px]" 
                    />
                    <Badge className="absolute top-3 left-3 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
                      {result.status}
                    </Badge>
                  </div>

                  {/* Data Section */}
                  <div className="md:w-2/3 p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {result.title}
                      </h4>
                      <Badge variant="outline" className="ml-2 whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                        {result.sourceSite}
                      </Badge>
                    </div>

                    <Separator className="my-3 bg-slate-200 dark:bg-slate-800" />
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 flex-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prices</p>
                        <p className="text-sm mt-1">
                          Buy: <span className="font-bold text-emerald-600">{result.dealPrice}</span>
                        </p>
                        <p className="text-sm text-slate-500 line-through">
                          Reg: {result.googlePrice}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profitability</p>
                        <p className="text-sm mt-1 font-bold text-emerald-600">
                          {result.profit} Net
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {result.margin} Margin
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Google Demand</p>
                        <p className="text-sm mt-1 flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          <Search className="w-3 h-3" /> {result.searchVol}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deal Details</p>
                        <p className="text-sm mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" /> {result.dealEnds}
                        </p>
                      </div>

                      <div className="col-span-2 bg-slate-50 dark:bg-slate-900 rounded p-3 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Best Cashback</p>
                          <p className="text-sm font-medium mt-0.5">
                            {result.cashbackSite}: <span className="text-emerald-600 font-bold">{result.cashbackAmount}</span>
                          </p>
                        </div>
                        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
                          Verify Deal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save to Opportunities
                      </Button>
                    </div>
                  </div>

                </div>
              ))}
              
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
