import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { School, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Felhasználónév szükséges"),
  password: z.string().min(1, "Jelszó szükséges"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function SchoolAdminAuth() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sikeres bejelentkezés",
          description: "Üdvözöljük az iskolai admin felületen!",
        });
        navigate("/school-admin-dashboard");
      } else {
        const error = await response.json();
        toast({
          title: "Bejelentkezési hiba",
          description: error.message || "Helytelen felhasználónév vagy jelszó",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <School size={40} className="text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Iskolai Admin Bejelentkezés
          </CardTitle>
          <CardDescription className="text-gray-600">
            Jelentkezzen be az iskolai adminisztrációs felületre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Felhasználónév</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Adja meg a felhasználónevét"
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Jelszó</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Adja meg a jelszavát"
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff size={16} className="text-gray-500" />
                          ) : (
                            <Eye size={16} className="text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Bejelentkezés...</span>
                  </div>
                ) : (
                  "Bejelentkezés"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}