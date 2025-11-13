import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, LogOut } from "lucide-react";

interface NavbarProps {
  userRole?: "student" | "admin";
  userName?: string;
}

export const Navbar = ({ userRole, userName }: NavbarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
      return;
    }
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              Student Complaints Portal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {userName && (
              <div className="text-sm">
                <span className="text-muted-foreground">Welcome, </span>
                <span className="font-medium text-foreground">{userName}</span>
                {userRole && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({userRole})
                  </span>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
