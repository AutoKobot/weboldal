import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import BottomNav from "@/components/bottom-nav";
import ChatInterface from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";

export default function ChatPage() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-student-warm">
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </div>
      
      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
        user={user} 
      />
      
      <div className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-neutral-800 tracking-tight">AI Segéd</h1>
              <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Azonnali szakmai segítség</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 hover:bg-neutral-100 rounded-xl"
              aria-label="Beállítások megnyitása"
              title="Beállítások"
            >
              <Settings size={22} className="text-neutral-500" />
            </Button>
          </div>
        </header>

        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="max-w-4xl mx-auto">
            <ChatInterface 
              userId={user.id} 
              onQuizStart={() => console.log("Quiz started from chat page")}
            />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}