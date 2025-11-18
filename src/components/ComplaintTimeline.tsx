import { format } from "date-fns";
import { CheckCircle2, Clock, MessageSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  type: "created" | "status_change" | "response";
  timestamp: string;
  description: string;
  author?: string;
}

interface ComplaintTimelineProps {
  events: TimelineEvent[];
}

export const ComplaintTimeline = ({ events }: ComplaintTimelineProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "created":
        return <FileText className="h-4 w-4" />;
      case "status_change":
        return <Clock className="h-4 w-4" />;
      case "response":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              {getIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-px h-full bg-border mt-2" />
            )}
          </div>
          <div className="pb-8 flex-1">
            <p className="text-sm font-medium text-foreground">
              {event.description}
            </p>
            {event.author && (
              <p className="text-xs text-muted-foreground mt-1">by {event.author}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(event.timestamp), "PPp")}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
