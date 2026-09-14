"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, ArrowLeft, Loader2, CheckCircle2, Camera, X, AlertCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: string;
  image?: string;
}

const STORAGE_KEY = "ai_advisor_history";
const INITIAL_MSG: ChatMessage = {
  role: "assistant",
  content: "Halo! Saya AI Advisor baru kamu. Kini saya tahu seluruh isi dompet, riwayat transaksi, dan budget kamu. Saya bisa jawab pertanyaan atau disuruh untuk nambah/hapus data! (Contoh: 'Berapa total saldoku?', 'Tolong hapus pengeluaran kopi kemarin', 'Buat dompet baru namanya OVO saldo 100rb')."
};

export function AIAdvisorContent({ user }: { user: any }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([INITIAL_MSG]);
      }
    } else {
      setMessages([INITIAL_MSG]);
    }
  }, []);

  // Save history & scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset
  };

  const clearHistory = () => {
    setMessages([INITIAL_MSG]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSend = async () => {
    if (!input.trim() && !imagePreview) return;

    const userText = input.trim();
    const currentImage = imagePreview;
    
    setMessages(prev => [...prev, { role: "user", content: userText, image: currentImage || undefined }]);
    setInput("");
    setImagePreview(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText, imageBase64: currentImage })
      });

      if (!res.ok) throw new Error("Gagal menghubungi AI");

      const aiResponse = await res.json();
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: aiResponse.message || "Done!",
        action: aiResponse.action
      }]);
      
      // Jika AI melakukan perubahan data, refresh aplikasi
      if (aiResponse.action && aiResponse.action !== "answer" && aiResponse.action !== "error") {
        router.refresh();
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Duh, ada sedikit gangguan sistem saat memproses permintaan kamu. Coba lagi nanti ya." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-card rounded-[2rem] border border-border/50 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center justify-center h-10 w-10 bg-primary/20 rounded-full">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold">AI Advisor</h2>
            <p className="text-xs text-muted-foreground">Online & Memiliki Akses Penuh</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-muted-foreground">
          Hapus Chat
        </Button>
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                : 'bg-secondary text-foreground rounded-bl-sm'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="rounded-xl mb-2 max-h-48 object-cover" />
              )}
              {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
              
              {msg.action && msg.action !== "answer" && msg.action !== "error" && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary py-1 px-2 rounded-lg w-max">
                  <CheckCircle2 className="h-3 w-3" /> Berhasil Update Data
                </div>
              )}
              {msg.action === "error" && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold bg-destructive/10 text-destructive py-1 px-2 rounded-lg w-max">
                  <AlertCircle className="h-3 w-3" /> Gagal mengeksekusi aksi
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-muted/30 flex flex-col gap-2">
        {imagePreview && (
          <div className="relative w-max">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-border" />
            <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-md">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileChange}
          />
          <Button 
            variant="outline"
            onClick={() => fileInputRef.current?.click()} 
            disabled={isLoading}
            className="rounded-full h-10 w-10 p-0 shrink-0 border-border/50 bg-background"
          >
            <Camera className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Tanya info atau perintahkan AI..."
            className="rounded-full border-border/50 bg-background flex-1"
            disabled={isLoading}
          />
          
          <Button 
            onClick={handleSend} 
            disabled={(!input.trim() && !imagePreview) || isLoading}
            className="rounded-full h-10 w-10 p-0 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
