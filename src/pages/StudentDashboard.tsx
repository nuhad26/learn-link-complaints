import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = userRoles?.some(r => r.role === "admin");

      if (hasAdminRole) {
        navigate("/admin");
        return;
      }

      setProfile(profileData);
      fetchComplaints(session.user.id);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchComplaints = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching complaints:", error);
    } else {
      setComplaints(data || []);
    }
    setLoading(false);
  };

  const getCategoryDisplay = (category: string) => {
    return category.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="student" userName={profile.full_name} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">My Complaints</h2>
            <p className="text-muted-foreground mt-1">
              Track and manage your submitted complaints
            </p>
          </div>
          <Button onClick={() => navigate("/student/submit")}>
            <Plus className="h-4 w-4 mr-2" />
            Submit New Complaint
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No complaints submitted yet</p>
              <Button onClick={() => navigate("/student/submit")}>
                Submit Your First Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <Card
                key={complaint.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/student/complaint/${complaint.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{complaint.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {getCategoryDisplay(complaint.category)} • 
                        Submitted {format(new Date(complaint.created_at), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <PriorityBadge priority={complaint.priority as any} />
                      <StatusBadge status={complaint.status as any} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {complaint.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
