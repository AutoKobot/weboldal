import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Send, 
  User, 
  MessageSquare,
  ArrowLeft,
  Loader2,
  Clock,
  MoreVertical,
  SearchIcon,
  Circle,
  Menu
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import BottomNav from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface UserDetails {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isOnline?: boolean;
}

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Parse query params
  const searchParams = new URLSearchParams(window.location.search);
  const initialPartnerId = searchParams.get('partnerId');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(initialPartnerId);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  // Fetch all messages for the current user
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch conversation partners (users we've talked to)
  const { data: partners = [], isLoading: partnersLoading } = useQuery<UserDetails[]>({
    queryKey: ["/api/messages/partners"],
    queryFn: async () => {
      const res = await fetch("/api/messages/partners");
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    }
  });

  // Fetch all students if teacher, or assigned teacher if student
  const { data: allAvailableUsers = [] } = useQuery<UserDetails[]>({
    queryKey: [user?.role === 'teacher' ? "/api/teacher/students" : `/api/user/details/${user?.id}`],
    queryFn: async () => {
      const url = user?.role === 'teacher' ? "/api/teacher/students" : `/api/user/details/${user?.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch available users");
      return res.json();
    },
    enabled: !!user,
  });

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { receiverId: string, message: string }) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => {
      toast({
        title: "Hiba",
        description: "Nem sikerült elküldeni az üzenetet.",
        variant: "destructive",
      });
    },
  });

  // Mutation for marking messages as read
  const markReadMutation = useMutation({
    mutationFn: async (senderId: string) => {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedPartnerId]);

  useEffect(() => {
    if (selectedPartnerId) {
      const hasUnread = messages.some(m => m.senderId === selectedPartnerId && !m.isRead);
      if (hasUnread) {
        markReadMutation.mutate(selectedPartnerId);
      }
      
      // Update URL without reloading if it's different
      if (initialPartnerId !== selectedPartnerId) {
        window.history.replaceState({}, '', `/messages?partnerId=${selectedPartnerId}`);
      }
    }
  }, [selectedPartnerId, messages]);

  const handleSend = () => {
    if (!selectedPartnerId || !messageText.trim()) return;
    sendMessageMutation.mutate({
      receiverId: selectedPartnerId,
      message: messageText.trim(),
    });
  };

  const currentConversation = messages.filter(
    m => (m.senderId === selectedPartnerId && m.receiverId === user?.id) ||
         (m.senderId === user?.id && m.receiverId === selectedPartnerId)
  );

  const selectedPartner = partners.find(p => p.id === selectedPartnerId) || 
                         allAvailableUsers.find(p => p.id === selectedPartnerId);

  // Group messages by date
  const groupedMessages: { [key: string]: Message[] } = {};
  currentConversation.forEach(m => {
    const date = format(new Date(m.createdAt), "yyyy. MMMM d.", { locale: hu });
    if (!groupedMessages[date]) groupedMessages[date] = [];
    groupedMessages[date].push(m);
  });

  // Filter partners AND searchable users by search term
  const filteredPartners = partners.filter(p => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || p.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const searchableNewUsers = searchTerm.length >= 2 
    ? allAvailableUsers.filter(u => {
        const isAlreadyPartner = partners.some(p => p.id === u.id);
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return !isAlreadyPartner && u.id !== user.id && 
               (name.includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));
      })
    : [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {user && <Sidebar user={user} />}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {user && (
          <MobileNav 
            isOpen={isMobileNavOpen} 
            onClose={() => setIsMobileNavOpen(false)} 
            user={user} 
          />
        )}
        
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List Sidebar */}
          <div className={`w-full md:w-80 border-r flex flex-col bg-gray-50 ${selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b bg-white flex items-center justify-between">
              <h1 className="text-xl font-black tracking-tight">Üzenetek</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden p-2 hover:bg-neutral-100 rounded-xl" 
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Beállítások megnyitása"
                title="Beállítások"
              >
                <Settings className="h-5 w-5 text-neutral-500" />
              </Button>
            </div>
            <div className="p-4 bg-white">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Keresés..." 
                  className="pl-9 bg-gray-50 border-none focus-visible:ring-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {partnersLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (filteredPartners.length === 0 && searchableNewUsers.length === 0) ? (
                  <div className="text-center p-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{searchTerm ? "Nincs találat" : "Nincsenek üzenetek"}</p>
                  </div>
                ) : (
                  <>
                    {/* Existing Conversations */}
                    {filteredPartners.map(partner => {
                    const lastMessage = messages
                      .filter(m => m.senderId === partner.id || m.receiverId === partner.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                    
                    const unreadCount = messages.filter(m => m.senderId === partner.id && !m.isRead).length;

                    return (
                      <button
                        key={partner.id}
                        onClick={() => setSelectedPartnerId(partner.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          selectedPartnerId === partner.id ? 'bg-blue-50' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${partner.firstName} ${partner.lastName}`} />
                            <AvatarFallback>{partner.firstName?.[0]}{partner.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          {partner.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-semibold text-sm truncate">
                              {partner.lastName} {partner.firstName}
                            </span>
                            {lastMessage && (
                              <span className="text-[10px] text-gray-400">
                                {format(new Date(lastMessage.createdAt), "HH:mm")}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 truncate">
                              {lastMessage?.senderId === user?.id ? "Te: " : ""}{lastMessage?.message}
                            </p>
                            {unreadCount > 0 && (
                              <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-blue-600">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    )})}

                    {/* New Conversations Search Results */}
                    {searchableNewUsers.length > 0 && (
                      <div className="mt-4">
                        <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Új beszélgetés indítása</p>
                        {searchableNewUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => setSelectedPartnerId(u.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                              selectedPartnerId === u.id ? 'bg-blue-50' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.firstName} ${u.lastName}`} />
                              <AvatarFallback>{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{u.lastName} {u.firstName}</p>
                              <p className="text-[10px] text-blue-500 font-medium uppercase tracking-tight">Kattints a kezdéshez</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col min-w-0 pb-20 md:pb-0 ${!selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
            {selectedPartnerId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden" 
                      onClick={() => setSelectedPartnerId(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedPartner?.firstName} ${selectedPartner?.lastName}`} />
                      <AvatarFallback>{selectedPartner?.firstName?.[0]}{selectedPartner?.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-bold text-sm leading-tight">
                        {selectedPartner?.lastName} {selectedPartner?.firstName}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Circle className={`h-2 w-2 ${selectedPartner?.isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} />
                        <span className="text-[10px] text-gray-500">
                          {selectedPartner?.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </Button>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                  <div className="space-y-6">
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date} className="space-y-4">
                        <div className="flex justify-center">
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full uppercase tracking-wider">
                            {date}
                          </span>
                        </div>
                        {msgs.map((msg) => {
                          const isOwn = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                                  isOwn 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-gray-100 text-gray-900 rounded-tl-none'
                                }`}>
                                  {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                  {format(new Date(msg.createdAt), "HH:mm")}
                                  {isOwn && (
                                    <span className={msg.isRead ? "text-blue-500" : "text-gray-300"}>
                                      ✓✓
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-white border-t">
                  <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Írj üzenetet..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        className="pr-10 bg-gray-50 border-none focus-visible:ring-1 py-6 rounded-xl"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {/* More tools could go here */}
                      </div>
                    </div>
                    <Button 
                      onClick={handleSend} 
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 h-12 w-12 rounded-xl shadow-lg shadow-blue-200 p-0"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 p-8 text-center pb-24 md:pb-8">
                <div className="max-w-md">
                  <div className="h-20 w-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <MessageSquare className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Szia {user?.firstName}!</h2>
                  <p className="text-gray-500 mb-8">
                    Válassz ki egy beszélgetést a bal oldali listából, vagy keress rá valakire, akinek üzenni szeretnél.
                  </p>
                  
                  {/* Quick access for students: Message Teacher */}
                  {user?.role === 'student' && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Gyors elérés</p>
                      <Button 
                        onClick={() => {
                          // Check if teacher is in partners or allAvailableUsers
                          const teacher = partners.find(p => p.role === 'teacher') || 
                                         allAvailableUsers.find(p => p.role === 'teacher');
                          
                          if (teacher) {
                            setSelectedPartnerId(teacher.id);
                          } else {
                            toast({
                              title: "Figyelem",
                              description: "Keresd meg a tanárod a keresővel, vagy várj, amíg üzen neked.",
                            });
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full py-6 rounded-2xl shadow-lg shadow-blue-100 font-bold flex items-center justify-center gap-2"
                      >
                        <UserIcon className="h-5 w-5" />
                        Üzenet küldése a tanáromnak
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
