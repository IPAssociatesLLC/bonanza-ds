import { useState, useRef, useEffect } from "react"
import { PageHeader } from "@/components/PageParts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Bot, BrainCircuit, Sparkles, Target, Zap, 
  Send, Search, Clock, DollarSign, Activity,
  ShieldCheck, Crosshair, Cpu, Terminal
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock Data for UI Layout
const SAVED_METHODS = [
  { id: 1, name: "High-Ticket Tech Sniping", desc: ">$200 retail, 40%+ margin on ShopSavvy", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: 2, name: "Seasonal Watercraft", desc: "Electric surfboards & floats, ignoring Aliexpress", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { id: 3, name: "Micro-Margin Volume", desc: "<$20 cost, >10k search vol, fast shipping", icon: Activity, color: "text-green-400", bg: "bg-green-500/10" },
]

const MOCK_TROPHIES = [
  { 
    id: 101, 
    title: "Milwaukee 36 Pc Socket Set", 
    margin: "52.8%", 
    profit: "$94.50", 
    dealEnds: "24h", 
    status: "Verified",
    searchVol: "1,200/mo",
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=200" 
  },
  { 
    id: 102, 
    title: "Waydoo Flyer ONE Plus E-Foil", 
    margin: "31.0%", 
    profit: "$1,850.00", 
    dealEnds: "3 Days", 
    status: "Verified",
    searchVol: "4,500/mo",
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=200" 
  }
]

interface Message {
  id: string
  role: "user" | "ai" | "system"
  content: string
  timestamp: Date
}

export function AdminAiScoutPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello Admin. The Multi-Agent Swarm is online. I am connected to the 7-stage profit engine and the Bright Data Web Unlocker. Which hunting method shall we deploy today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    const newMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, newMsg])
    setInput("")

    // Simulate AI thinking
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: "[The Hunter] Booting scraping protocols for specified keywords...",
        timestamp: new Date()
      }])
    }, 800)
  }

  const deployMethod = (methodName: string) => {
    const msg: Message = { id: Date.now().toString(), role: "user", content: `Deploy Method: ${methodName}`, timestamp: new Date() }
    setMessages(prev => [...prev, msg])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-blue-500" />
            AI Scout Swarm
          </h1>
          <p className="text-muted-foreground mt-1">Autonomous multi-agent drop shipping intelligence.</p>
        </div>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 px-3 py-1">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Swarm Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT PANEL: The Armory */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-indigo-400" />
                The Armory
              </CardTitle>
              <CardDescription>Saved hunting methods & logic</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
              {SAVED_METHODS.map(method => (
                <div 
                  key={method.id}
                  className="group relative p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden"
                  onClick={() => deployMethod(method.name)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", method.bg, method.color)}>
                      <method.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{method.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{method.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-muted-foreground">
                + Create New Method
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE PANEL: Command Center */}
        <div className="col-span-1 lg:col-span-6 flex flex-col">
          <Card className="border-white/5 bg-black/60 backdrop-blur-2xl shadow-2xl flex-1 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            
            <CardHeader className="pb-3 border-b border-white/5 bg-black/20 relative z-10">
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                Command Center
              </CardTitle>
            </CardHeader>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map(msg => (
                <div key={msg.id} className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}>
                  <Avatar className={cn(
                    "w-8 h-8 border",
                    msg.role === "ai" ? "border-blue-500/30 bg-blue-500/10" : 
                    msg.role === "system" ? "border-orange-500/30 bg-orange-500/10" :
                    "border-white/10 bg-white/5"
                  )}>
                    {msg.role === "ai" ? <Bot className="w-4 h-4 text-blue-400" /> : 
                     msg.role === "system" ? <Cpu className="w-4 h-4 text-orange-400" /> :
                     <AvatarFallback className="text-xs">You</AvatarFallback>}
                  </Avatar>
                  
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : 
                    msg.role === "system" ? "bg-orange-500/10 text-orange-200 border border-orange-500/20 rounded-tl-sm font-mono text-xs" :
                    "bg-white/5 text-foreground border border-white/5 rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/40 relative z-10">
              <form onSubmit={handleSend} className="relative flex items-center">
                <Input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Command the swarm (e.g., 'Find electric watercraft on ShopSavvy...')"
                  className="w-full bg-white/5 border-white/10 pl-4 pr-12 py-6 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-blue-500/50"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!input.trim()}
                  className="absolute right-2 h-8 w-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: The Trophy Room */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Trophy Room
              </CardTitle>
              <CardDescription>Live validated discoveries</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
              {MOCK_TROPHIES.map(trophy => (
                <div key={trophy.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="h-24 w-full relative">
                    <img src={trophy.image} alt={trophy.title} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-green-400 border-green-500/30">
                      {trophy.margin} Margin
                    </Badge>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">{trophy.title}</h4>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-black/40 rounded p-2 border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Net Profit</p>
                        <p className="text-sm font-medium text-green-400 flex items-center mt-0.5">
                          {trophy.profit}
                        </p>
                      </div>
                      <div className="bg-black/40 rounded p-2 border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Search Vol</p>
                        <p className="text-sm font-medium text-blue-400 flex items-center gap-1 mt-0.5">
                          <Search className="w-3 h-3" /> {trophy.searchVol}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ends in {trophy.dealEnds}</span>
                      <span className="flex items-center gap-1 text-primary"><ShieldCheck className="w-3 h-3" /> {trophy.status}</span>
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
