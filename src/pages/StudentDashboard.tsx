import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    const categoryMap: Record<string, string> = {
      'mentor': 'Mentor',
      'admin': 'Admin',
      'academic_counsellor': 'Academic Counsellor',
      'working_hub': 'Working Hub',
      'peer': 'Peer',
      'other': 'Other',
      // Keep old categories for backward compatibility
      'academic': 'Academic',
      'hostel': 'Hostel',
      'transport': 'Transport',
      'finance': 'Finance',
      'disciplinary': 'Disciplinary',
      'others': 'Others'
    };
    return categoryMap[category] || category.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Filter complaints based on search
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = searchQuery === "" || 
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredComplaints.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedComplaints = filteredComplaints.slice(startIndex, startIndex + pageSize);

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

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
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
        ) : filteredComplaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No complaints match your search</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {paginatedComplaints.map((complaint) => (
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
