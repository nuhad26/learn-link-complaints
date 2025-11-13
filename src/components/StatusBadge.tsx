import { Badge } from "@/components/ui/badge";

type Status = "pending" | "in_progress" | "resolved";

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: "Pending",
      className: "bg-warning text-warning-foreground hover:bg-warning/80",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-info text-info-foreground hover:bg-info/80",
    },
    resolved: {
      label: "Resolved",
      className: "bg-success text-success-foreground hover:bg-success/80",
    },
  };

  const config = statusConfig[status];

  return <Badge className={config.className}>{config.label}</Badge>;
};
