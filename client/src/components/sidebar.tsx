import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { GraduationCap, Home, BookOpen, TrendingUp, Bot, Settings, LogOut, Users, Search, X, School, User as UserIcon, MessageSquare, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NotificationBell from "@/components/notification-bell";

interface SidebarProps {
  user: User;
}

interface Module {
  id: number;
  title: string;
  content: string;
  conciseContent?: string;
  detailedContent?: string;
  subjectId: number;
  subjectName?: string;
}

interface SearchResult {
  module: Module;
  matches: Array<{
    field: 'title' | 'content' | 'conciseContent' | 'detailedContent';
    snippet: string;
    position: number;
  }>;
}

export default function Sidebar({ user }: SidebarProps) {
  if (!user) return null;
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  // Fetch unread messages count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch all modules for search
  const { data: modules } = useQuery<Module[]>({
    queryKey: ['/api/public/modules'],
    retry: false,
  });

  // Fetch AI queue status
  const { data: queueStatus } = useQuery<any>({
    queryKey: ["/api/ai/queue-status"],
    refetchInterval: (data: any) => (data?.queueSize > 0 || data?.processing > 0) ? 3000 : 30000,
  });

  const totalActive = (queueStatus?.queueSize || 0) + (queueStatus?.processing || 0);

  // Search function
  const performSearch = (query: string) => {
    console.log('Search query:', query);
    if (!modules || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length >= 2); // Allow 2+ character terms
    console.log('Search terms:', searchTerms);
    console.log('Available modules:', modules?.length);

    modules.forEach(module => {
      const matches: SearchResult['matches'] = [];

      // Search in title
      const titleMatches = findMatches(module.title, searchTerms, 'title');
      matches.push(...titleMatches);

      // Search in content
      const contentMatches = findMatches(module.content, searchTerms, 'content');
      matches.push(...contentMatches);

      // Search in concise content if available
      if (module.conciseContent) {
        const conciseMatches = findMatches(module.conciseContent, searchTerms, 'conciseContent');
        matches.push(...conciseMatches);
      }

      // Search in detailed content if available
      if (module.detailedContent) {
        const detailedMatches = findMatches(module.detailedContent, searchTerms, 'detailedContent');
        matches.push(...detailedMatches);
      }

      if (matches.length > 0) {
        results.push({ module, matches });
      }
    });

    // Sort by relevance (number of matches)
    results.sort((a, b) => b.matches.length - a.matches.length);
    console.log('Search results found:', results.length, results);
    setSearchResults(results);
    setIsSearching(false);
  };

  const findMatches = (text: string, searchTerms: string[], field: SearchResult['matches'][0]['field']) => {
    const matches: SearchResult['matches'] = [];
    const lowerText = text.toLowerCase();

    searchTerms.forEach(term => {
      let index = 0;
      let foundCount = 0;
      while ((index = lowerText.indexOf(term, index)) !== -1) {
        foundCount++;
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + term.length + 50);
        let snippet = text.substring(start, end);

        // Add ellipsis if truncated
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        matches.push({
          field,
          snippet,
          position: index
        });

        index += term.length;
      }
      if (foundCount > 0) {
        console.log(`Found ${foundCount} matches for "${term}" in ${field}`);
      }
    });

    return matches.slice(0, 3); // Limit to 3 matches per field
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, modules]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

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
    { icon: Home, label: "Admin Panel", href: "/" },
  ] : user.role === 'teacher' ? [
    { icon: Home, label: "Home", href: "/" },
    { icon: BookOpen, label: "Szakmák", href: "/tananyagok" },
    { icon: Settings, label: "Tartalomkezelő", href: "/teacher/content" },
    { icon: Users, label: "Közösségi Tanulás", href: "/community" },
    { icon: TrendingUp, label: "Tanulóim", href: "/teacher" },
    { icon: MessageSquare, label: "Üzenetek", href: "/messages", unreadCount: unreadData?.count },
    { icon: Settings, label: "Beállítások", href: "/settings" },
  ] : [
    { icon: Home, label: "Főoldal", href: "/", description: "Kezdőlap és műszerfal" },
    { icon: BookOpen, label: "Szakmák", href: "/tananyagok", description: "Válaszd ki a szakmád és tanulj" },
    { icon: Users, label: "Közösségi Tanulás", href: "/community", description: "Tanulj és fejlődj másokkal" },
    { icon: TrendingUp, label: "Haladásom", href: "/progress", description: "Jegyek, kész modulok, célok" },
    { icon: MessageSquare, label: "Üzenetek", href: "/messages", description: "Beszélgess a tanáraiddal", unreadCount: unreadData?.count },
    { icon: Settings, label: "Beállítások", href: "/settings", description: "Profil és fiókkezelés" },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-100 flex-shrink-0 bg-[#635c5c4f]">
        
        {totalActive > 0 && (
          <div className="mb-6 p-3 bg-blue-50/50 border border-blue-100 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">AI Háttérmunka</span>
            </div>
            <p className="text-xs text-blue-700 font-medium">
              {queueStatus?.processing > 0 ? "Feldolgozás alatt..." : "Várakozás a sorban..."}
            </p>
            <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: '40%' }}></div>
            </div>
            <p className="mt-1 text-[10px] text-blue-500 text-right">{totalActive} elem hátralévő</p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-700">Global Learning System</h1>
              <p className="text-sm text-[#1c1b1b]">AI Oktatási Platform</p>
            </div>
          </div>
          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </div>
      {/* Search Section */}
      <div className="p-4 border-b border-neutral-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Keresés modulokban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>
      {/* Navigation */}
      <nav className="p-4 pb-8 flex-1 overflow-y-auto min-h-0 text-left bg-[#7cd1323b] custom-scrollbar">
        {/* Search Results */}
        {searchQuery && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Keresési eredmények {searchResults.length > 0 && `(${searchResults.length})`}
            </h3>
            {isSearching ? (
              <div className="text-sm text-gray-500">Keresés...</div>
            ) : searchResults.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <Link
                        href={`/modules/${result.module.id}`}
                        className="block hover:bg-gray-100 rounded-md p-1 -m-1"
                      >
                        <div className="font-medium text-sm text-blue-600 hover:text-blue-800 mb-1">
                          {result.module.title}
                        </div>
                        <div className="space-y-1">
                          {result.matches.slice(0, 2).map((match, matchIndex) => (
                            <div key={matchIndex} className="text-xs">
                              <Badge variant="outline" className="text-xs mb-1">
                                {match.field === 'title' ? 'Cím' :
                                  match.field === 'content' ? 'Tartalom' :
                                    match.field === 'conciseContent' ? 'Tömör' : 'Részletes'}
                              </Badge>
                              <div className="text-gray-600 leading-tight">
                                {match.snippet}
                              </div>
                            </div>
                          ))}
                          {result.matches.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{result.matches.length - 2} további találat
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-gray-500">Nincs találat</div>
            )}
          </div>
        )}

        {/* Regular Navigation */}
        <ul className="space-y-2">
          {navItems.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="flex items-center space-x-3 p-3 rounded-lg transition-colors text-neutral-700 hover:bg-neutral-50 bg-[#8ad14b]"
              >
                <item.icon size={20} className="flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{item.label}</span>
                  {('unreadCount' in item) && (item.unreadCount as number) > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white border-none h-5 px-1.5 min-w-[20px] flex items-center justify-center">
                      {item.unreadCount as number}
                    </Badge>
                  )}
                  {'description' in item && item.description && (
                    <span className="text-xs text-neutral-600 font-normal truncate opacity-90">{item.description}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* User Profile */}
      <div className="p-4 border-t border-neutral-100 flex-shrink-0 bg-[#8ea64c4a]">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="relative group mb-3">
              <Avatar className="h-16 w-16 border-2 border-white shadow-md transition-transform group-hover:scale-105">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}&backgroundColor=6366f1,06b6d4,8b5cf6`} />
                <AvatarFallback className="bg-primary text-white text-lg font-bold">
                  {(user.firstName?.[0] || '') + (user.lastName?.[0] || user.username?.[0] || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={10} className="text-neutral-400" />
              </div>
            </div>
            <div className="w-full">
              <p className="text-sm font-bold text-neutral-800 truncate px-1">
                {user.lastName && user.firstName
                  ? `${user.lastName} ${user.firstName}`
                  : user.username
                }
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>

          {/* Student-specific information */}
          {user.role === 'student' && (
            <StudentInfo user={user} />
          )}

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full bg-neutral-100/50 hover:bg-red-50 text-neutral-600 hover:text-red-600 text-xs font-bold transition-all"
            >
              <LogOut size={14} className="mr-2" />
              Kijelentkezés
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Component for displaying student-specific information
function StudentInfo({ user }: { user: User }) {
  const { data: userDetails } = useQuery({
    queryKey: ['/api/user/details', user.id],
    queryFn: async () => {
      const response = await fetch(`/api/user/details/${user.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });

  return (
    <div className="space-y-1 mb-3">
      {userDetails?.schoolName && (
        <div className="flex items-center text-xs text-neutral-600">
          <School size={12} className="mr-2" />
          <span className="truncate">{userDetails.schoolName}</span>
        </div>
      )}
      {userDetails?.className && (
        <div className="flex items-center text-xs text-neutral-600">
          <Users size={12} className="mr-2" />
          <span className="truncate">{userDetails.className}</span>
        </div>
      )}
      {userDetails?.teacherName && (
        <div className="flex items-center text-xs text-neutral-600">
          <UserIcon size={12} className="mr-2" />
          <span className="truncate">{userDetails.teacherName}</span>
        </div>
      )}
    </div>
  );
}
