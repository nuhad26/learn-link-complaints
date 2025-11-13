import { Badge } from "@/components/ui/badge";

type Priority = "low" | "medium" | "high";

interface PriorityBadgeProps {
  priority: Priority;
}

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const priorityConfig = {
    low: {
      label: "Low",
      className: "bg-muted text-muted-foreground hover:bg-muted/80",
    },
    medium: {
      label: "Medium",
      className: "bg-warning text-warning-foreground hover:bg-warning/80",
    },
    high: {
      label: "High",
      className: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    },
  };

  const config = priorityConfig[priority];

  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
};
