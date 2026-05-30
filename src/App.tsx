import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Settings as SettingsIcon, 
  Search, 
  Send, 
  Sparkles,
  Building,
  User,
  Plus,
  Clock,
  ChevronRight,
  MapPin,
  Tag,
  ArrowRight,
  X,
  Trash2,
  Globe,
  Zap,
  DollarSign
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

interface PropertyData {
  title: string;
  location: string;
  price: string;
  features: string;
}

interface TextPart {
  type: 'text';
  value: string;
}

interface PropertyPart {
  type: 'property';
  value: PropertyData;
}

type ContentPart = TextPart | PropertyPart;

interface UserPreferences {
  maxPrice: number;
  currency: 'NGN' | 'USD';
  tone: 'simple' | 'pro';
  preferredArea: string;
}
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

const PropertyCard = ({ property, onDetails }: { property: PropertyData, onDetails: (title: string) => void }) => {
  return (
    <div className="bg-surfaceActive rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
      <div className="h-40 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute top-4 left-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Available Now</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-textMain leading-tight">{property.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-textDim">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">{property.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-accent" />
          <span className="text-xl font-black text-accentBright">{property.price}</span>
        </div>

        <p className="text-sm text-textMuted font-medium line-clamp-2">
          {property.features}
        </p>

        <button 
          onClick={() => onDetails(property.title)}
          className="w-full flex items-center justify-center gap-3 bg-white text-background py-4 rounded-2xl font-bold text-sm transition-all hover:bg-accentBright active:scale-95"
        >
          View Details <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hi! I'm here to help you find a great house. What are you looking for today?",
      timestamp: new Date()
    }
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Looking...');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [prefs, setPrefs] = useState<UserPreferences>({
    maxPrice: 200000000,
    currency: 'NGN',
    tone: 'simple',
    preferredArea: 'All Lagos'
  });

  const suggestedPrompts = [
    "Houses under 50 Million",
    "Houses with a swimming pool",
    "3 bedroom flats in Victoria Island",
    "Offices with parking space"
  ];

  const fetchConversations = async () => {
    try {
      const response = await fetch(apiUrl('/api/conversations'));
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const startNewSearch = () => {
    setCurrentConversationId(null);
    setMessages([{ 
      role: 'assistant', 
      content: "Hi! I'm here to help you find a great house. What are you looking for today?",
      timestamp: new Date()
    }]);
  };

  const loadConversation = async (id: number) => {
    try {
      const response = await fetch(apiUrl(`/api/conversations/${id}`));
      const data = await response.json();
      setCurrentConversationId(data.id);
      setMessages(data.messages.map((m: { role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp)
      })));
    } catch (error) {
      console.error("Failed to load conversation", error);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    const loadingSteps = ["Checking our list of houses...", "Finding the best matches...", "Almost there..."];
    let step = 0;
    const interval = setInterval(() => {
      setLoadingMessage(loadingSteps[step % loadingSteps.length]);
      step++;
    }, 1200);

    try {
      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          conversation_id: currentConversationId,
          user_id: 'default_user'
        })
      });
      const data = await response.json();
      
      clearInterval(interval);
      setIsTyping(false);
      
      const aiMsg: Message = { role: 'assistant', content: data.response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      
      if (!currentConversationId) {
        setCurrentConversationId(data.conversation_id);
        fetchConversations();
      }
    } catch {
      clearInterval(interval);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting. Please check your internet.",
        timestamp: new Date()
      }]);
    }
  };

  const parseContent = (content: string): ContentPart[] => {
    const propertyRegex = /PROPERTY_START([\s\S]*?)PROPERTY_END/g;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = propertyRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }
      const propLines = match[1].trim().split('\n');
      const propData: Record<string, string> = {};
      propLines.forEach(line => {
        const [key, ...val] = line.split(':');
        if (key && val) propData[key.trim().toLowerCase()] = val.join(':').trim();
      });
      parts.push({
        type: 'property',
        value: {
          title: propData.title ?? '',
          location: propData.location ?? '',
          price: propData.price ?? '',
          features: propData.features ?? ''
        }
      });
      lastIndex = propertyRegex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.substring(lastIndex) });
    }
    return parts.length === 0 ? [{ type: 'text', value: content }] : parts;
  };

  return (
    <div className="flex h-screen bg-background text-textMain font-sans selection:bg-accent/20 overflow-hidden antialiased">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative border border-white/5">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-8 right-8 p-3 bg-surfaceActive hover:bg-background rounded-full transition-all text-textDim hover:text-textMain"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-10 md:p-14 space-y-12">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Settings</h2>
                <p className="text-textMuted font-medium">Customize your house finding experience.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Currency */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-accent" />
                    <span className="text-sm font-black uppercase tracking-widest text-textDim">Currency</span>
                  </div>
                  <div className="flex bg-surfaceActive p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setPrefs({...prefs, currency: 'NGN'})}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${prefs.currency === 'NGN' ? 'bg-white text-background shadow-lg' : 'text-textMuted'}`}
                    >
                      NGN (₦)
                    </button>
                    <button 
                      onClick={() => setPrefs({...prefs, currency: 'USD'})}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${prefs.currency === 'USD' ? 'bg-white text-background shadow-lg' : 'text-textMuted'}`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                {/* AI Tone */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-accent" />
                    <span className="text-sm font-black uppercase tracking-widest text-textDim">Chat Tone</span>
                  </div>
                  <div className="flex bg-surfaceActive p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setPrefs({...prefs, tone: 'simple'})}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${prefs.tone === 'simple' ? 'bg-white text-background shadow-lg' : 'text-textMuted'}`}
                    >
                      Simple
                    </button>
                    <button 
                      onClick={() => setPrefs({...prefs, tone: 'pro'})}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${prefs.tone === 'pro' ? 'bg-white text-background shadow-lg' : 'text-textMuted'}`}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                {/* Max Price */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-accent" />
                    <span className="text-sm font-black uppercase tracking-widest text-textDim">Max Budget</span>
                  </div>
                  <input 
                    type="range" min="10000000" max="500000000" step="10000000" 
                    value={prefs.maxPrice} 
                    onChange={(e) => setPrefs({...prefs, maxPrice: parseInt(e.target.value)})}
                    className="w-full h-2 bg-surfaceActive rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="text-xl font-black text-accentBright">
                    {prefs.currency === 'NGN' ? '₦' : '$'} {(prefs.maxPrice / (prefs.currency === 'USD' ? 1500 : 1)).toLocaleString()}
                  </div>
                </div>

                {/* Data Cleanup */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-black uppercase tracking-widest text-textDim">Danger Zone</span>
                  </div>
                  <button className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-sm font-bold transition-all border border-red-500/20">
                    Wipe All Search History
                  </button>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-5 bg-textMain text-background rounded-2xl font-black text-lg transition-all active:scale-95 shadow-2xl shadow-white/5"
                >
                  Save My Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className="w-80 bg-surface hidden md:flex flex-col relative z-20 shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-textMain flex items-center justify-center shadow-lg shadow-white/5">
              <Building className="w-6 h-6 text-background" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight text-textMain">EstateAI</h1>
              <span className="text-[10px] text-textMuted font-bold uppercase tracking-[0.2em] leading-none">House Finder</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <button onClick={startNewSearch} className="w-full flex items-center justify-center gap-3 bg-textMain hover:bg-accentBright text-background py-3.5 px-4 rounded-2xl transition-all duration-300 shadow-xl active:scale-[0.98]">
            <Plus className="w-5 h-5" />
            <span className="font-bold text-sm">New Search</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-8">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-[11px] font-black text-textDim uppercase tracking-widest">Previous Searches</p>
              <Clock className="w-3 h-3 text-textDim" />
            </div>
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => loadConversation(conv.id)} className={`w-full flex items-center justify-between group px-3 py-3 rounded-2xl transition-all duration-300 text-left ${currentConversationId === conv.id ? 'bg-surfaceActive shadow-lg shadow-black/20' : 'hover:bg-surfaceHover'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${currentConversationId === conv.id ? 'text-accentBright' : 'text-textDim group-hover:text-accent'}`} />
                  <span className={`text-sm truncate font-medium transition-colors ${currentConversationId === conv.id ? 'text-textMain' : 'text-textMuted group-hover:text-textMain'}`}>{conv.title}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all ${currentConversationId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface/80 backdrop-blur-2xl">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-[1.25rem] bg-surfaceActive shadow-inner group hover:bg-surfaceHover transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shadow-lg group-hover:bg-textMain group-hover:text-background transition-all">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-textMain">My Account</span>
                <span className="text-[10px] text-textDim font-medium tracking-wide">Adjust Preferences</span>
              </div>
            </div>
            <SettingsIcon className="w-4 h-4 text-textDim group-hover:text-textMain" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-background">
        <header className="hidden md:flex h-20 items-center justify-between px-10 bg-background/60 backdrop-blur-3xl sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-surface rounded-xl shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[10px] font-black text-textMain uppercase tracking-widest">Online</span>
            </div>
            <h2 className="text-sm font-bold text-textMain tracking-tight">House Finder</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 text-textDim hover:text-textMain hover:bg-surface rounded-xl transition-all"><Search className="w-4 h-4" /></button>
            <div className="w-1.5 h-1.5 bg-surface rounded-full mx-1"></div>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surfaceHover text-textMuted hover:text-textMain rounded-xl transition-all shadow-sm">
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Settings</span>
            </button>
          </div>
        </header>

        <header className="md:hidden h-16 bg-surface flex items-center px-4 justify-between sticky top-0 z-30 shadow-lg">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-textMain flex items-center justify-center"><Building className="w-5 h-5 text-background" /></div><h1 className="text-lg font-bold text-textMain tracking-tight">EstateAI</h1></div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-textMuted hover:text-textMain bg-surfaceHover rounded-xl transition-all active:scale-95"><SettingsIcon className="w-5 h-5" /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 scroll-smooth relative z-0 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-12">
            {messages.length === 1 && (
              <div className="text-center py-10 animate-in fade-in zoom-in duration-1000">
                <div className="w-24 h-24 bg-surface rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative overflow-hidden"><Sparkles className="w-10 h-10 text-accentBright relative z-10" /></div>
                <h2 className="text-4xl md:text-5xl font-black text-textMain mb-6 tracking-tight">Find Your <br /><span className="text-accentBright">Dream Home</span></h2>
                <p className="text-textMuted max-w-xl mx-auto text-lg font-medium leading-relaxed mb-14 opacity-70">Just tell me what kind of house you are looking for. I can search through our lists and find the perfect one for you.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button key={idx} onClick={() => handleSend(prompt)} className="bg-surface/50 hover:bg-surfaceActive transition-all duration-500 p-6 rounded-3xl text-left flex items-start gap-5 group active:scale-[0.98] shadow-sm hover:shadow-xl">
                      <div className="w-10 h-10 rounded-2xl bg-surfaceActive flex items-center justify-center shrink-0 shadow-inner group-hover:bg-background transition-all"><Search className="w-4 h-4 text-textDim group-hover:text-accentBright" /></div>
                      <span className="text-sm text-textMuted font-bold leading-snug group-hover:text-textMain transition-colors">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
                <div className={`max-w-[90%] md:max-w-[80%] p-6 rounded-[2rem] ${msg.role === 'user' ? 'bg-textMain text-background shadow-2xl font-bold' : 'bg-surface text-textMain shadow-inner font-medium'}`}>
                  <div className="space-y-4">
                    {parseContent(msg.content).map((part, i) => (
                      part.type === 'property' ? (
                        <PropertyCard key={i} property={part.value} onDetails={(title) => handleSend(`Tell me more about ${title}`)} />
                      ) : (
                        <p key={i} className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{part.value}</p>
                      )
                    ))}
                  </div>
                  <div className={`flex items-center gap-2 mt-5 opacity-30 text-[9px] font-black uppercase tracking-[0.3em] ${msg.role === 'user' ? 'text-background' : 'text-textMuted'}`}>
                    {msg.role === 'assistant' && <Sparkles className="w-3 h-3" />}
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-surface px-7 py-4.5 rounded-[1.75rem] flex items-center gap-5 shadow-xl">
                  <div className="flex space-x-2"><div className="w-1.5 h-1.5 bg-accentBright rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-1.5 h-1.5 bg-accentBright rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-accentBright rounded-full animate-bounce"></div></div>
                  <span className="text-[10px] font-black text-textDim uppercase tracking-[0.3em]">{loadingMessage}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 md:p-12 bg-gradient-to-t from-background via-background to-transparent relative z-20">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] blur-3xl group-focus-within:bg-white/10 transition-all duration-700"></div>
            <div className="relative flex items-center">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about houses..." className="w-full bg-surface/90 backdrop-blur-3xl text-textMain rounded-[2.5rem] pl-8 pr-16 py-6.5 focus:outline-none focus:ring-4 focus:ring-white/5 placeholder-textDim shadow-2xl transition-all font-bold" onKeyDown={(e) => {if (e.key === 'Enter') handleSend(input);}} />
              <button onClick={() => handleSend(input)} className={`absolute right-3.5 p-4.5 rounded-full transition-all duration-500 ${input.trim() ? 'bg-textMain text-background hover:scale-110 shadow-2xl active:scale-95' : 'bg-surfaceActive text-textDim cursor-not-allowed'}`} disabled={!input.trim()}><Send className="w-5.5 h-5.5" /></button>
            </div>
          </div>
          <div className="flex justify-center items-center gap-4 mt-8 opacity-40"><p className="text-[9px] text-textDim uppercase tracking-[0.4em] font-black">EstateAI House Helper</p></div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

export default App;
