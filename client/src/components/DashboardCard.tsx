import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "warning" | "destructive";
  trend?: {
    value: number;
    label: string;
  };
}

export default function DashboardCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  variant = "default",
  trend 
}: DashboardCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
      case "destructive":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      default:
        return "";
    }
  };

  return (
    <Card className={`hover-elevate ${getVariantClasses()}`} data-testid={`card-dashboard-${title.toLowerCase().replace(/\\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\\s+/g, '-')}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <Badge 
              variant={trend.value >= 0 ? "default" : "secondary"}
              className="text-xs"
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}