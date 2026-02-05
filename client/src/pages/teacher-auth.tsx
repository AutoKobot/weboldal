import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";

export default function TeacherAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "teacher" }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Bejelentkezési hiba");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres bejelentkezés!",
        description: "Üdvözöljük a tanári felületen!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600 mr-2" />
            <BookOpen className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Tanári Portál</h1>
          <p className="text-gray-600 mt-2">
            Szakmai képzési platform tanároknak
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">
              Tanári bejelentkezés
            </CardTitle>
            <p className="text-sm text-gray-600">
              Jelentkezzen be tanári fiókjával
            </p>
            <p className="text-xs text-gray-500">
              Új tanárok regisztrációját az iskolai admin kezeli
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Felhasználónév</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="felhasználónév"
                  value={formData.username}
                  onChange={handleInputChange("username")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="jelszó"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bejelentkezés...
                  </>
                ) : (
                  "Bejelentkezés"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Vissza a{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              főoldalra
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}