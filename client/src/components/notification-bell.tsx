import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, MessageCircle, Users, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface Notification {
    id: number;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    actorId: string | null;
    metadata: Record<string, any>;
    createdAt: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

const typeIcon = (type: string) => {
    switch (type) {
        case "discussion_reply": return <MessageCircle className="w-4 h-4 text-blue-500 shrink-0" />;
        case "group_join": return <Users className="w-4 h-4 text-green-500 shrink-0" />;
        case "group_activity": return <Star className="w-4 h-4 text-orange-500 shrink-0" />;
        default: return <Bell className="w-4 h-4 text-gray-400 shrink-0" />;
    }
};

function timeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "épp most";
    if (diff < 3600) return `${Math.floor(diff / 60)} perce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} órája`;
    return `${Math.floor(diff / 86400)} napja`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const { data } = useQuery<NotificationsResponse>({
        queryKey: ["/api/notifications"],
        refetchInterval: 60_000, // Poll every 60s as fallback
        staleTime: 30_000,
    });

    const notifications = data?.notifications ?? [];
    const unreadCount = data?.unreadCount ?? 0;

    // SSE connection for real-time updates
    useEffect(() => {
        let es: EventSource | null = null;
        let retryTimer: ReturnType<typeof setTimeout>;

        function connect() {
            es = new EventSource("/api/notifications/stream");
            es.addEventListener("message", (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === "notification") {
                        // Optimistically add to cache
                        queryClient.setQueryData<NotificationsResponse>(
                            ["/api/notifications"],
                            (old) => {
                                if (!old) return { notifications: [msg.data], unreadCount: 1 };
                                return {
                                    notifications: [msg.data, ...old.notifications],
                                    unreadCount: old.unreadCount + 1,
                                };
                            }
                        );
                    }
                } catch { /* ignore parse errors */ }
            });
            es.onerror = () => {
                es?.close();
                retryTimer = setTimeout(connect, 5000); // Reconnect after 5s
            };
        }

        connect();
        return () => {
            es?.close();
            clearTimeout(retryTimer);
        };
    }, [queryClient]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Mutations
    const markRead = useMutation({
        mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    const markAll = useMutation({
        mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    const deleteNotif = useMutation({
        mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    const handleClick = useCallback((notif: Notification) => {
        if (!notif.isRead) markRead.mutate(notif.id);
        if (notif.link) {
            setOpen(false);
            navigate(notif.link);
        }
    }, [markRead, navigate]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Értesítések"
                aria-label="Értesítések"
            >
                <Bell className="w-5 h-5 text-neutral-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute left-0 top-11 z-50 w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm text-neutral-800">Értesítések</span>
                            {unreadCount > 0 && (
                                <Badge className="text-xs px-1.5 py-0 h-5 bg-red-100 text-red-700 border-red-200">
                                    {unreadCount} új
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAll.mutate()}
                                    title="Összes olvasottra"
                                    className="p-1 rounded hover:bg-neutral-200 transition-colors"
                                >
                                    <CheckCheck className="w-4 h-4 text-neutral-500" />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded hover:bg-neutral-200 transition-colors"
                            >
                                <X className="w-4 h-4 text-neutral-500" />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <ScrollArea className="max-h-96">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <Bell className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm">Nincsenek értesítések</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-50">
                                {notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-neutral-50",
                                            !notif.isRead && "bg-blue-50/60 hover:bg-blue-50"
                                        )}
                                        onClick={() => handleClick(notif)}
                                    >
                                        <div className="mt-0.5">{typeIcon(notif.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm leading-snug", !notif.isRead ? "font-semibold text-neutral-900" : "text-neutral-700")}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(notif.createdAt)}</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            {!notif.isRead && (
                                                <button
                                                    title="Olvasottnak jelöl"
                                                    onClick={e => { e.stopPropagation(); markRead.mutate(notif.id); }}
                                                    className="p-1 rounded hover:bg-blue-100"
                                                >
                                                    <Check className="w-3 h-3 text-blue-600" />
                                                </button>
                                            )}
                                            <button
                                                title="Törlés"
                                                onClick={e => { e.stopPropagation(); deleteNotif.mutate(notif.id); }}
                                                className="p-1 rounded hover:bg-red-100"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
