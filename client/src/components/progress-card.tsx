import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ProgressCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'accent';
}

export default function ProgressCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: ProgressCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'secondary':
        return {
          bg: 'bg-secondary/10',
          text: 'text-secondary',
        };
      case 'accent':
        return {
          bg: 'bg-accent/10',
          text: 'text-accent',
        };
      default:
        return {
          bg: 'bg-primary/10',
          text: 'text-primary',
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <Card className="glassmorphism gradient-overlay hover-lift interactive-element border-white/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-lg font-semibold text-neutral-700">
            {title}
          </CardTitle>
          <div className={`w-12 h-12 ${colorClasses.bg} rounded-full flex items-center justify-center`}>
            <Icon className={colorClasses.text} size={20} />
          </div>
        </div>
        <div className="text-3xl font-bold text-neutral-700 mb-2">
          {value}
        </div>
        <p className="text-sm text-neutral-400">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
