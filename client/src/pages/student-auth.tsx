import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { localUserLoginSchema } from "@shared/schema";
import { signInWithGoogle, handleGoogleRedirect, isFirebaseEnabled } from "@/lib/firebase";
import AnimatedSection from "@/components/animated-section";
import loginBackground from "@/assets/login-background.svg";
import type { z } from "zod";

type LoginFormData = z.infer<typeof localUserLoginSchema>;

export default function StudentAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(localUserLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });



  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Sikeres bejelentkezés",
        description: "Üdvözöljük a Global Learning System-ben!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Bejelentkezési hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Handle Firebase redirect on page load
  useEffect(() => {
    const handleFirebaseRedirect = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result?.user) {
          // User signed in with Google, create or login user on backend
          const userData = {
            id: result.user.uid,
            email: result.user.email,
            firstName: result.user.displayName?.split(' ')[0] || '',
            lastName: result.user.displayName?.split(' ')[1] || '',
            profileImageUrl: result.user.photoURL,
            authType: 'google'
          };

          // Send to backend to create/login user
          const response = await apiRequest('POST', '/api/auth/google-login', userData);
          const user = await response.json();

          queryClient.setQueryData(['/api/auth/user'], user);
          toast({
            title: "Sikeres bejelentkezés",
            description: "Üdvözöljük a Global Learning System-ben!",
          });
          setLocation("/");
        }
      } catch (error: any) {
        console.error('Firebase redirect error:', error);
        toast({
          title: "Bejelentkezési hiba",
          description: "Google bejelentkezés sikertelen",
          variant: "destructive",
        });
      }
    };

    handleFirebaseRedirect();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Google bejelentkezési hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };



  return (
    <div
      className="min-h-screen bg-student-warm flex items-center justify-center p-4 animate-slide-up relative"
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
      <div className="w-full max-w-4xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Hero Section */}
          <AnimatedSection animation="fade-left" delay={200}>
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <h1 className="responsive-heading text-4xl font-bold text-white mb-4 drop-shadow-lg">
                  Global Learning System
                </h1>
                <p className="responsive-text text-lg text-white/90 mb-6 drop-shadow-md">
                  AI-alapú személyre szabott tanulási élmény. Csatlakozz és fejleszd készségeidet intelligens oktatási rendszerünkkel.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg"></div>
                  <span className="text-white/90 drop-shadow-md">AI-generált kérdések és értékelés</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full shadow-lg"></div>
                  <span className="text-white/90 drop-shadow-md">Hangos magyarázatok és interaktív chat</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full shadow-lg"></div>
                  <span className="text-white/90 drop-shadow-md">Szakmák és modulok strukturált tanulása</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Auth Section */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Bejelentkezés</CardTitle>
                <CardDescription>
                  Válassz bejelentkezési módot a folytatáshoz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Google Login - csak ha Firebase be van állítva */}
                  {isFirebaseEnabled() && (
                    <Button
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Átirányítás...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>Bejelentkezés Google-lel</span>
                        </>
                      )}
                    </Button>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        <span>Vagy</span>
                      </span>
                    </div>
                  </div>

                  {/* Csak bejelentkezés - regisztrációt az iskolai admin kezeli */}
                  <div className="w-full">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-full p-2 border rounded-lg bg-muted">
                        <User className="mr-2 h-4 w-4" />
                        <span>Bejelentkezés</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Új tanulók regisztrációját az iskolai admin kezeli
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Felhasználónév</FormLabel>
                                <FormControl>
                                  <Input placeholder="felhasználónév" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jelszó</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="jelszó" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Bejelentkezés...</span>
                              </>
                            ) : (
                              <span>Bejelentkezés</span>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}