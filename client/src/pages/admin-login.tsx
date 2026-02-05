import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, Shield } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/admin");
      toast({
        title: "Sikeres bejelentkezés",
        description: "Üdvözöljük az admin felületen!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bejelentkezési hiba",
        description: "Hibás felhasználónév vagy jelszó.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-700">Global Learning System</h1>
              <p className="text-sm text-neutral-500">Admin Bejelentkezés</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Shield size={20} />
              <span>Adminisztrátor Bejelentkezés</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Felhasználónév</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Adja meg a felhasználónevet"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Adja meg a jelszót"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Bejelentkezés..." : "Bejelentkezés"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 mb-2">Vagy</p>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="w-full"
              >
                Vissza a főoldalra
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}