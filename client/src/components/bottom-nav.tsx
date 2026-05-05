
import { Link, useLocation } from "wouter";
import { Home, BookOpen, TrendingUp, MessageSquare, Bot, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  // Fetch unread messages count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000,
  });

  const navItems = [
    { icon: Home, label: "Főoldal", href: "/" },
    { icon: BookOpen, label: "Tananyag", href: "/tananyagok" },
    { icon: Bot, label: "AI Segéd", href: "/chat" },
    { icon: MessageSquare, label: "Üzenetek", href: "/messages", unreadCount: unreadData?.count },
    { icon: TrendingUp, label: "Haladás", href: "/progress" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-neutral-200 px-2 pb-safe-area-inset-bottom">
      <nav className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 relative",
              isActive ? "text-primary scale-110" : "text-neutral-400"
            )}
          >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[10px] font-bold mt-1 tracking-tight",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
              
              {item.unreadCount && item.unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-none h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center animate-pulse">
                  {item.unreadCount}
                </Badge>
              )}

              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              )}
          </Link>
          );
        })}
      </nav>
    </div>
  );
}
