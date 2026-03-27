import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Calendar, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type ClassAnnouncement } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClassAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<ClassAnnouncement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch unacknowledged announcements
  const { data: pendingAnnouncements = [] } = useQuery<ClassAnnouncement[]>({
    queryKey: ["/api/announcements/my"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (pendingAnnouncements.length > 0 && !currentAnnouncement) {
      setCurrentAnnouncement(pendingAnnouncements[0]);
      setIsOpen(true);
    }
  }, [pendingAnnouncements, currentAnnouncement]);

  const acknowledgeMutation = useMutation({
    mutationFn: async (response: string) => {
      if (!currentAnnouncement) return;
      await apiRequest("POST", `/api/announcements/${currentAnnouncement.id}/acknowledge`, { response });
    },
    onSuccess: () => {
      setIsOpen(false);
      // Let the close animation finish before moving to the next announcement
      setTimeout(() => {
        setCurrentAnnouncement(null);
        queryClient.invalidateQueries({ queryKey: ["/api/announcements/my"] });
      }, 300);
      
      toast({
        title: "Visszaigazolva",
        description: "Az üzenetet sikeresen leigazoltad.",
      });
    },
  });

  if (!currentAnnouncement) return null;

  const getTypeIcon = () => {
    switch (currentAnnouncement.type) {
      case "event": return <Calendar className="h-6 w-6 text-blue-500" />;
      case "action_required": return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      default: return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const options = (currentAnnouncement.options as string[]) || ["Értettem"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing by clicking outside if it's action required
      if (currentAnnouncement.type === "action_required" && !open) return;
      setIsOpen(open);
      if (!open) setCurrentAnnouncement(null);
    }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Decorative Header */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full blur-3xl -translate-x-10 -translate-y-10" />
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-white rounded-full blur-3xl translate-x-10 translate-y-10" />
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
              <Bell className="h-8 w-8 text-white animate-bounce" />
            </div>
          </div>

          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  {getTypeIcon()}
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  Új üzenet az oktatódtól
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {currentAnnouncement.title}
              </DialogTitle>
            </DialogHeader>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {currentAnnouncement.content}
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              {options.map((option) => (
                <Button
                  key={option}
                  onClick={() => acknowledgeMutation.mutate(option)}
                  disabled={acknowledgeMutation.isPending}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:shadow-lg active:scale-95"
                >
                  {acknowledgeMutation.isPending ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      {option}
                    </>
                  )}
                </Button>
              ))}
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  const variants = {
    default: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-none",
    outline: "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
