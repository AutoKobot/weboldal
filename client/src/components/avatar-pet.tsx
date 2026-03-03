/**
 * AvatarPet – Kísérleti avatar rendszer
 * Jelenleg csak a "BorgaI74" felhasználónak elérhető.
 * Mindenki másnak "Hamarosan érkezik" üzenet látható.
 */

import { useState, useEffect, useRef } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Shield, Crown, Zap, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// ─── XP számítás ──────────────────────────────────────────────────────────────
function calcXP(completedModules: number[], testResults?: { score: number }[]): number {
    const moduleXP = (completedModules?.length || 0) * 30;
    const testXP = (testResults || []).reduce((sum, t) => {
        const score = t.score;
        if (score >= 95) return sum + 100;
        if (score >= 80) return sum + 70;
        if (score >= 70) return sum + 50;
        if (score >= 60) return sum + 30;
        return sum + 10;
    }, 0);
    return moduleXP + testXP;
}

function calcLevel(xp: number): { level: number; title: string; nextLevelXP: number; currentLevelXP: number } {
    const thresholds = [
        { level: 1, title: "Kis Drákó", xp: 0 },
        { level: 2, title: "Füstöcske", xp: 200 },
        { level: 3, title: "Ifjú Sárkány", xp: 500 },
        { level: 4, title: "Harcos Sárkány", xp: 1000 },
        { level: 5, title: "Mester Sárkány", xp: 2000 },
        { level: 6, title: "Legendás Sárkány", xp: 3500 },
        { level: 7, title: "Örök Sárkány", xp: 5000 },
    ];
    let current = thresholds[0];
    let next = thresholds[1];
    for (let i = 0; i < thresholds.length - 1; i++) {
        if (xp >= thresholds[i].xp) {
            current = thresholds[i];
            next = thresholds[i + 1] || { ...thresholds[i], xp: 99999 };
        }
    }
    return { level: current.level, title: current.title, nextLevelXP: next.xp, currentLevelXP: current.xp };
}

// Feloldott itemek XP alapján
function getUnlockedItems(xp: number) {
    return {
        hat: xp >= 200 ? (xp >= 1000 ? "crown" : "simple") : null,
        armor: xp >= 500 ? (xp >= 2000 ? "gold" : xp >= 1000 ? "silver" : "bronze") : null,
        effect: xp >= 3500 ? "lightning" : xp >= 2000 ? "sparkles" : null,
        background: xp >= 500 ? (xp >= 2000 ? "castle" : "workshop") : "meadow",
    };
}

// ─── Lottie URL-ek állapotonként ──────────────────────────────────────────────
// Publikus Lottie animációk a lottie.host CDN-ről
const DRAGON_ANIMS = {
    idle: "https://lottie.host/2c24f5f0-8f2d-4ea6-8c35-a59c0e4e94b5/bsZwjx7nSa.json",
    happy: "https://lottie.host/5b3fe8fc-1e6c-4f3e-8a3b-8e2e7f7e7f7e/happy.json",
};

// Fallback – ha a Lottie CDN nem elérhető, CSS animált SVG sárkányt mutatunk
function DragonFallback({ mood }: { mood: "idle" | "happy" | "excited" | "sad" }) {
    const colors = {
        idle: { body: "#4f46e5", eye: "#fbbf24", fire: "#f97316" },
        happy: { body: "#16a34a", eye: "#fbbf24", fire: "#f97316" },
        excited: { body: "#dc2626", eye: "#fbbf24", fire: "#f97316" },
        sad: { body: "#6b7280", eye: "#60a5fa", fire: "#93c5fd" },
    };
    const c = colors[mood];

    return (
        <motion.div
            className="relative"
            animate={mood === "happy" || mood === "excited"
                ? { y: [0, -14, 0], rotate: [0, -5, 5, 0] }
                : mood === "sad"
                    ? { y: [0, 4, 0] }
                    : { y: [0, -6, 0] }
            }
            transition={{
                duration: mood === "excited" ? 0.5 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            <svg viewBox="0 0 120 140" width="120" height="140" xmlns="http://www.w3.org/2000/svg">
                {/* Farok */}
                <motion.path
                    d="M40 110 Q10 130 20 145 Q35 140 45 120"
                    fill={c.body} stroke="#3730a3" strokeWidth="1.5"
                    animate={{
                        d: ["M40 110 Q10 130 20 145 Q35 140 45 120",
                            "M40 110 Q5 125 18 142 Q33 138 43 118",
                            "M40 110 Q10 130 20 145 Q35 140 45 120"]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Test */}
                <ellipse cx="60" cy="90" rx="35" ry="40" fill={c.body} stroke="#3730a3" strokeWidth="1.5" />
                {/* Has */}
                <ellipse cx="60" cy="95" rx="22" ry="28" fill="#818cf8" opacity="0.5" />
                {/* Fej */}
                <circle cx="60" cy="50" r="28" fill={c.body} stroke="#3730a3" strokeWidth="1.5" />
                {/* Fülek/szarvak */}
                <polygon points="42,28 36,10 50,24" fill="#4338ca" stroke="#3730a3" strokeWidth="1" />
                <polygon points="78,28 84,10 70,24" fill="#4338ca" stroke="#3730a3" strokeWidth="1" />
                {/* Szem fehérje */}
                <ellipse cx="50" cy="47" rx="9" ry="10" fill="white" />
                <ellipse cx="70" cy="47" rx="9" ry="10" fill="white" />
                {/* Pupilla */}
                <motion.circle
                    cx="51" cy="48" r="5" fill={c.eye}
                    animate={{ cx: [51, 53, 51, 49, 51] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.circle
                    cx="71" cy="48" r="5" fill={c.eye}
                    animate={{ cx: [71, 73, 71, 69, 71] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                {/* Pupilla sötét */}
                <circle cx="52" cy="49" r="3" fill="#1e1b4b" />
                <circle cx="72" cy="49" r="3" fill="#1e1b4b" />
                {/* Szárnyak */}
                <motion.path
                    d="M25 75 Q5 50 15 35 Q28 55 32 70"
                    fill="#6366f1" stroke="#4338ca" strokeWidth="1" opacity="0.8"
                    animate={{
                        d: ["M25 75 Q5 50 15 35 Q28 55 32 70",
                            "M25 75 Q0 45 12 30 Q26 52 30 68",
                            "M25 75 Q5 50 15 35 Q28 55 32 70"]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                    d="M95 75 Q115 50 105 35 Q92 55 88 70"
                    fill="#6366f1" stroke="#4338ca" strokeWidth="1" opacity="0.8"
                    animate={{
                        d: ["M95 75 Q115 50 105 35 Q92 55 88 70",
                            "M95 75 Q120 45 108 30 Q94 52 90 68",
                            "M95 75 Q115 50 105 35 Q92 55 88 70"]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Száj / tűz */}
                {mood === "happy" || mood === "excited" ? (
                    <>
                        <path d="M50 62 Q60 70 70 62" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <motion.path
                            d="M56 65 Q60 80 64 65"
                            fill={c.fire} opacity="0.9"
                            animate={{ opacity: [0.9, 0.4, 0.9], scaleY: [1, 1.3, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        />
                    </>
                ) : mood === "sad" ? (
                    <path d="M50 66 Q60 60 70 66" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
                ) : (
                    <path d="M50 63 Q60 67 70 63" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
                )}
            </svg>
        </motion.div>
    );
}

// ─── Fő Avatar komponens ──────────────────────────────────────────────────────
interface AvatarPetProps {
    user: {
        username: string;
        firstName?: string;
        completedModules?: number[];
        testResults?: { score: number }[];
    };
}

export default function AvatarPet({ user }: AvatarPetProps) {
    const BETA_USERNAME = "BorgaI74";
    const isBetaUser = user.username === BETA_USERNAME;

    // ── "Hamarosan jön" nézet mindenki másnak ─────────────────────────────────
    if (!isBetaUser) {
        return (
            <Card className="overflow-hidden border-0 ring-1 ring-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50">
                <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-2xl shadow-md flex-shrink-0">
                        🥚
                    </div>
                    <div>
                        <p className="font-semibold text-purple-800">Hamarosan érkezik az avatárod!</p>
                        <p className="text-sm text-purple-600 mt-0.5">Egy egyedi, fejleszthető kísérőállatod készül...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Avatar (csak BorgaI74-nek) ────────────────────────────────────────────
    return <AvatarPetFull user={user} />;
}

// ─── Teljes avatar (béta nézet) ───────────────────────────────────────────────
function AvatarPetFull({ user }: AvatarPetProps) {
    const xp = calcXP(user.completedModules || [], user.testResults);
    const { level, title, nextLevelXP, currentLevelXP } = calcLevel(xp);
    const items = getUnlockedItems(xp);
    const progressInLevel = xp - currentLevelXP;
    const progressNeeded = nextLevelXP - currentLevelXP;
    const progressPct = Math.min(100, Math.round((progressInLevel / progressNeeded) * 100));

    const [mood, setMood] = useState<"idle" | "happy" | "excited" | "sad">("idle");
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const prevLevelRef = useRef(level);

    // Szint emelkedés detektálása
    useEffect(() => {
        if (level > prevLevelRef.current) {
            setShowLevelUp(true);
            setMood("excited");
            setTimeout(() => { setShowLevelUp(false); setMood("idle"); }, 3000);
            prevLevelRef.current = level;
        }
    }, [level]);

    const handleClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);
        if (newCount % 5 === 0) {
            setMood("excited");
            setTimeout(() => setMood("idle"), 2000);
        } else {
            setMood("happy");
            setTimeout(() => setMood("idle"), 1500);
        }
    };

    const bgColors: Record<string, string> = {
        meadow: "from-green-100 to-emerald-200",
        workshop: "from-amber-100 to-orange-200",
        castle: "from-purple-100 to-indigo-200",
    };
    const bgClass = bgColors[items.background || "meadow"];

    return (
        <Card className={`overflow-hidden border-0 ring-1 ring-purple-200 bg-gradient-to-br ${bgClass} shadow-md`}>
            <CardContent className="p-0">
                {/* Fejléc */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white text-xs px-2 py-0.5">
                            Szint {level}
                        </Badge>
                        <span className="text-xs font-semibold text-indigo-800">{title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {xp} XP
                    </div>
                </div>

                {/* Avatar terület */}
                <div className="relative flex justify-center items-end py-2 min-h-[160px]">

                    {/* Effektek */}
                    {items.effect === "sparkles" && (
                        <div className="absolute inset-0 pointer-events-none">
                            {[...Array(6)].map((_, i) => (
                                <motion.div key={i}
                                    className="absolute text-yellow-400 text-xs"
                                    style={{ left: `${15 + i * 13}%`, top: `${10 + (i % 3) * 20}%` }}
                                    animate={{ opacity: [0, 1, 0], y: [-5, -15, -5], scale: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                                >✨</motion.div>
                            ))}
                        </div>
                    )}
                    {items.effect === "lightning" && (
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div className="absolute top-2 right-4 text-yellow-300 text-xl"
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>⚡</motion.div>
                            <motion.div className="absolute top-6 left-4 text-yellow-300 text-sm"
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }}>⚡</motion.div>
                        </div>
                    )}

                    {/* Kattintható avatár */}
                    <motion.div
                        className="cursor-pointer relative select-none"
                        onClick={handleClick}
                        whileTap={{ scale: 0.92 }}
                        title="Kattints rám!"
                    >
                        {/* Sisak/Korona felette */}
                        <AnimatePresence>
                            {items.hat && (
                                <motion.div
                                    initial={{ scale: 0, y: -10 }} animate={{ scale: 1, y: 0 }}
                                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl z-10"
                                >
                                    {items.hat === "crown" ? "👑" : "🎓"}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Páncél jelzés (a test alá kerül vizuálisan) */}
                        {items.armor && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20">
                                <span className="text-sm">
                                    {items.armor === "gold" ? "🛡️" : items.armor === "silver" ? "⚔️" : "🔰"}
                                </span>
                            </div>
                        )}

                        {/* Sárkány */}
                        <DragonFallback mood={mood} />

                        {/* Humor buborék */}
                        <AnimatePresence>
                            {mood === "happy" && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute -top-8 -right-4 bg-white rounded-full px-2 py-1 text-xs shadow-md border border-yellow-200"
                                >
                                    😄
                                </motion.div>
                            )}
                            {mood === "excited" && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: 3, duration: 0.3 }}
                                    exit={{ scale: 0 }}
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-400 rounded-full px-3 py-1 text-xs font-bold shadow-md"
                                >
                                    🔥 WOW!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Szint UP felugró üzenet */}
                    <AnimatePresence>
                        {showLevelUp && (
                            <motion.div
                                initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0, y: -20 }}
                                className="absolute inset-0 flex items-center justify-center bg-yellow-400/90 rounded-lg z-30"
                            >
                                <div className="text-center">
                                    <div className="text-3xl mb-1">🎉</div>
                                    <p className="font-black text-lg text-yellow-900">SZINT UP!</p>
                                    <p className="text-sm text-yellow-800">{title}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* XP Progress */}
                <div className="px-4 pb-4 space-y-2">
                    <div className="flex justify-between text-xs text-indigo-700">
                        <span className="font-medium">Következő szint</span>
                        <span>{progressInLevel} / {progressNeeded} XP</span>
                    </div>
                    <Progress value={progressPct} className="h-2 bg-indigo-200" />

                    {/* Feloldott tárgyak */}
                    {(items.hat || items.armor || items.effect) && (
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            <span className="text-xs text-indigo-500">Felszerelve:</span>
                            {items.hat && <span className="text-sm" title="Fejdísz">{items.hat === "crown" ? "👑" : "🎓"}</span>}
                            {items.armor && <span className="text-sm" title="Páncél">
                                {items.armor === "gold" ? "🏆" : items.armor === "silver" ? "🥈" : "🥉"}
                            </span>}
                            {items.effect && <span className="text-sm" title="Effekt">
                                {items.effect === "lightning" ? "⚡" : "✨"}
                            </span>}
                        </div>
                    )}

                    <p className="text-xs text-indigo-400 text-center pt-1">
                        👆 Kattints a sárkányra!
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
