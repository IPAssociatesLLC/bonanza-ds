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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Mock results matching the detailed requirements with working external image URLs
const MOCK_RESULTS = [
  {
    id: 1,
    title: "Milwaukee 36 Pc Socket Set",
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80",
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
    image: "https://images.unsplash.com/photo-1544253335-515a8dbdb4e0?auto=format&fit=crop&w=400&q=80",
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

type ChatMessage = {
  id: string
  role: "user" | "ai" | "system"
  content: string
}

export function AdminAiScoutPage() {
  const [targetUrls, setTargetUrls] = useState("")
  const [minMargin, setMinMargin] = useState("40")
  const [minSearchVolume, setMinSearchVolume] = useState("500")
  const [maxDealDuration, setMaxDealDuration] = useState("7")
  const [cashbackSites, setCashbackSites] = useState("TopCashback, Rakuten")
  const [minCashbackRate, setMinCashbackRate] = useState("2.0")
  
  const [isScanning, setIsScanning] = useState(false)
  const [chatInput, setChatInput] = useState("")
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "system", content: "AI Swarm connected. Awaiting parameters..." }
  ])
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleDeploySwarm = (e: React.FormEvent) => {
    e.preventDefault()
    setIsScanning(true)
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: "Swarm deployed with custom parameters. Hunting for anomalies..." }])
    setTimeout(() => {
      setIsScanning(false)
    }, 2000)
  }

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = chatInput
    setChatInput("")
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: msg }])
    
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", content: "Acknowledged. I will prioritize deals with search volume > " + minSearchVolume + "." }])
    }, 1000)
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader 
        title="AI Scout Swarm" 
        description="Autonomous multi-agent drop shipping intelligence. Configure custom hunt parameters below."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 pb-6 items-stretch">
        
        {/* LEFT PANEL: Custom Configuration Form */}
        <div className="col-span-1 lg:col-span-4 flex flex-col h-full">
          <Card className="flex flex-col h-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-blue-500" />
                Custom Hunt Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Min Margin (%)</Label>
                  <Input type="number" value={minMargin} onChange={(e) => setMinMargin(e.target.value)} className="border-slate-300 dark:border-slate-700" />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Min Search Vol</Label>
                  <Input type="number" value={minSearchVolume} onChange={(e) => setMinSearchVolume(e.target.value)} className="border-slate-300 dark:border-slate-700" />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Max Deal Duration (Days)</Label>
                <Input type="number" value={maxDealDuration} onChange={(e) => setMaxDealDuration(e.target.value)} className="border-slate-300 dark:border-slate-700" />
              </div>
              <Separator className="bg-slate-300 dark:bg-slate-700" />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Cashback Scraper</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cashback Sites to Scan</Label>
                    <Input value={cashbackSites} onChange={(e) => setCashbackSites(e.target.value)} className="border-slate-300 dark:border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Min Rate (%)</Label>
                    <Input type="number" value={minCashbackRate} onChange={(e) => setMinCashbackRate(e.target.value)} className="border-slate-300 dark:border-slate-700" />
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-4 mt-auto border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
              <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md text-base" onClick={handleDeploySwarm} disabled={isScanning}>
                {isScanning ? <>Initializing Swarm...</> : <><Terminal className="w-5 h-5 mr-2" />Deploy AI Swarm</>}
              </Button>
            </div>
          </Card>
        </div>

        {/* MIDDLE PANEL: Command Center (AI Chat) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col h-full lg:max-h-[800px]">
          <Card className="flex flex-col h-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4 shrink-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-500" />
                Command Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4 bg-white/50 dark:bg-slate-950/50" ref={scrollRef}>
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                  <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {msg.role === "ai" ? <Bot className="w-4 h-4 text-blue-500" /> : msg.role === "system" ? <Cpu className="w-4 h-4 text-slate-500" /> : <AvatarFallback className="text-xs bg-slate-900 text-white">You</AvatarFallback>}
                  </Avatar>
                  <div className={cn("p-3 rounded-2xl text-sm max-w-[85%]", msg.role === "user" ? "bg-slate-900 text-white rounded-tr-sm" : msg.role === "system" ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-tl-sm font-mono text-xs" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm")}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shrink-0">
              <form onSubmit={handleChatSend} className="relative flex items-center">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Give rules or logic to the AI..." className="w-full border-slate-300 dark:border-slate-700 pl-4 pr-12 py-5 rounded-xl shadow-sm" />
                <Button type="submit" size="icon" disabled={!chatInput.trim()} className="absolute right-2 h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: The Trophy Room (Detailed Results) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col h-full lg:max-h-[800px]">
          <Card className="flex flex-col h-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-4 shrink-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Live Swarm Discoveries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
              {MOCK_RESULTS.map((result) => (
                <div key={result.id} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative flex items-center justify-center min-h-[160px] p-2">
                    <img src={result.image} alt={result.title} className="w-full h-40 object-contain" />
                    <Badge className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">
                      {result.status}
                    </Badge>
                  </div>
                  <div className="p-4 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {result.title}
                      </h4>
                    </div>
                    <Badge variant="outline" className="w-fit mb-3 bg-blue-50 text-blue-700 border-blue-200">
                      {result.sourceSite}
                    </Badge>
                    <Separator className="mb-3 bg-slate-200 dark:bg-slate-800" />
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Prices</p>
                        <p className="text-xs mt-0.5">Buy: <span className="font-bold text-emerald-600">{result.dealPrice}</span></p>
                        <p className="text-xs text-slate-500 line-through">Reg: {result.googlePrice}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Profitability</p>
                        <p className="text-xs mt-0.5 font-bold text-emerald-600">{result.profit} Net</p>
                        <p className="text-xs text-slate-700">{result.margin} Margin</p>
                      </div>
                      <div className="col-span-2 bg-slate-50 dark:bg-slate-900 rounded p-2 border border-slate-200 dark:border-slate-800 flex justify-between items-center mt-1">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Cashback</p>
                          <p className="text-xs font-medium">{result.cashbackSite}: <span className="text-emerald-600 font-bold">{result.cashbackAmount}</span></p>
                        </div>
                        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          Verify <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
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
