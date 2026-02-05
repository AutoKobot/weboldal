import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings as SettingsIcon, User, Bell, Shield, Menu } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const { toast } = useToast();

  if (!user) return null;

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

  return (
    <div className="min-h-screen bg-student-warm flex">
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      <main className="flex-1 lg:ml-0">
        <header className="bg-student-warm shadow-sm p-4 lg:hidden">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 rounded-lg hover:bg-neutral-100"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-800 mb-2">Beállítások</h1>
            <p className="text-neutral-600">Kezelje a fiókját és az alkalmazás beállításait.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User size={20} />
                  <span>Profil Információk</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-neutral-600">{user.email}</p>
                    <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell size={20} />
                  <span>Értesítések</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Új tananyag értesítések</span>
                    <Button variant="outline" size="sm">Bekapcsolva</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AI tanár válaszok</span>
                    <Button variant="outline" size="sm">Bekapcsolva</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Haladás emlékeztetők</span>
                    <Button variant="outline" size="sm">Kikapcsolva</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield size={20} />
                  <span>Biztonság</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-neutral-600">
                  A fiókja Replit Auth által védett, amely biztonságos hitelesítést biztosít.
                </div>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full"
                >
                  Kijelentkezés
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <SettingsIcon size={20} />
                  <span>Alkalmazás Beállítások</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sötét téma</span>
                  <Button variant="outline" size="sm">Kikapcsolva</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nyelv</span>
                  <Button variant="outline" size="sm">Magyar</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Automatikus mentés</span>
                  <Button variant="outline" size="sm">Bekapcsolva</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}