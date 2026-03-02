import { useState } from "react";
import { Lock, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AdminDashboard from "@/pages/admin-dashboard";

const CONTENT_PASSWORD = "tananyag";
const SESSION_KEY = "teacher_content_unlocked";

export default function TeacherContentGuard() {
    const [unlocked, setUnlocked] = useState<boolean>(
        () => sessionStorage.getItem(SESSION_KEY) === "1"
    );
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === CONTENT_PASSWORD) {
            sessionStorage.setItem(SESSION_KEY, "1");
            setUnlocked(true);
            setError(false);
        } else {
            setError(true);
            setShake(true);
            setPassword("");
            setTimeout(() => setShake(false), 600);
        }
    };

    if (unlocked) {
        return <AdminDashboard />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className={`w-full max-w-md shadow-xl ${shake ? "animate-shake" : ""}`}
                style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}>
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                        Tartalomkezelő
                    </CardTitle>
                    <CardDescription className="text-gray-500 mt-1">
                        A tartalomkezelő jelszóval védett terület.<br />
                        Kérjük, adja meg a jelszót a belépéshez.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Jelszó"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(false);
                                    }}
                                    className={`pr-10 text-center text-lg tracking-widest ${error ? "border-red-500 focus-visible:ring-red-500" : ""
                                        }`}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {error && (
                                <p className="text-sm text-red-600 text-center font-medium">
                                    ❌ Hibás jelszó. Próbálja újra!
                                </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" size="lg">
                            <Lock className="h-4 w-4 mr-2" />
                            Belépés
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
        </div>
    );
}
