import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ChatInterface from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
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
        <header className="bg-white shadow-sm border-b border-neutral-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden flex-shrink-0"
              >
                <Menu size={20} />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold text-neutral-800 truncate">
                  AI Tanár Chat
                </h1>
                <p className="text-sm lg:text-base text-neutral-600 truncate">
                  Beszélgess az AI tanárral és kérdezz bármit a tananyaggal kapcsolatban
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <ChatInterface 
              userId={user.id} 
              onQuizStart={() => console.log("Quiz started from chat page")}
            />
          </div>
        </main>
      </div>
    </div>
  );
}