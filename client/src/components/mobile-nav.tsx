import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { GraduationCap, Home, BookOpen, TrendingUp, Bot, Settings, LogOut, X, Users } from "lucide-react";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function MobileNav({ isOpen, onClose, user }: MobileNavProps) {
  const [location] = useLocation();

  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');

      toast({
        title: "Sikeres kijelentkezés",
        description: "Viszlát!",
      });
      // Force reload to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Kijelentkezési hiba",
        description: "Nem sikerült kijelentkezni. Kérjük, próbálja újra.",
        variant: "destructive",
      });
    }
  };

  const navItems = user.role === 'admin' ? [
    { icon: Home, label: "Home", href: "/" },
    { icon: Settings, label: "Admin", href: "/admin" },
    { icon: BookOpen, label: "Tananyagok", href: "/tananyagok" },
    { icon: Settings, label: "Beállítások", href: "/settings" },
  ] : user.role === 'teacher' ? [
    { icon: Home, label: "Home", href: "/" },
    { icon: BookOpen, label: "Szakmák", href: "/tananyagok" },
    { icon: Settings, label: "Tartalomkezelő", href: "/teacher/content" },
    { icon: Users, label: "Közösségi Tanulás", href: "/community" },
    { icon: TrendingUp, label: "Tanulóim", href: "/tanulóim" },
    { icon: Settings, label: "Beállítások", href: "/settings" },
  ] : [
    { icon: Home, label: "Home", href: "/" },
    { icon: BookOpen, label: "Tananyagok", href: "/tananyagok" },
    { icon: TrendingUp, label: "Haladásom", href: "/progress" },
    { icon: Bot, label: "AI Chat", href: "/chat" },
    { icon: Settings, label: "Beállítások", href: "/settings" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white" size={20} />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-neutral-700">Global Learning System</SheetTitle>
                <p className="text-sm text-neutral-400">AI Oktatási Platform</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </SheetHeader>

        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location === item.href
                    ? "bg-primary text-white"
                    : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 truncate">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email
                }
              </p>
              <p className="text-xs text-neutral-400 capitalize">{user.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-neutral-400 hover:text-neutral-700 p-1"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
