import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { format } from "date-fns";

interface Response {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [complaint, setComplaint] = useState<any>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [newResponse, setNewResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
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
      setIsAdmin(hasAdminRole || false);

      setProfile(profileData);
      await fetchComplaintDetails();
    };

    checkAuthAndFetch();
  }, [id, navigate]);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    
    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .select(`
        *,
        profiles:student_id (
          full_name,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (complaintError) {
      toast.error("Failed to load complaint");
      navigate(-1);
      return;
    }

    setComplaint(complaintData);
    setNewStatus(complaintData.status);

    const { data: responsesData, error: responsesError } = await supabase
      .from("complaint_responses")
      .select(`
        *,
        profiles:admin_id (
          full_name,
          role
        )
      `)
      .eq("complaint_id", id)
      .order("created_at", { ascending: true });

    if (!responsesError) {
      setResponses(responsesData || []);
    }

    setLoading(false);
  };

  const handleSubmitResponse = async () => {
    if (!newResponse.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in");
      setIsSubmitting(false);
      return;
    }

    const { error: responseError } = await supabase
      .from("complaint_responses")
      .insert({
        complaint_id: id,
        admin_id: session.user.id,
        message: newResponse,
      });

    if (responseError) {
      toast.error("Failed to submit response");
      setIsSubmitting(false);
      return;
    }

    if (newStatus !== complaint.status) {
      const { error: statusError } = await supabase
        .from("complaints")
        .update({ status: newStatus as any })
        .eq("id", id);

      if (statusError) {
        toast.error("Failed to update status");
        setIsSubmitting(false);
        return;
      }
    }

    toast.success("Response submitted successfully");
    setNewResponse("");
    await fetchComplaintDetails();
    setIsSubmitting(false);
  };

  const getCategoryDisplay = (category: string) => {
    return category.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (loading || !profile || !complaint) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const backPath = isAdmin ? "/admin" : "/student";

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole={isAdmin ? "admin" : "student"} userName={profile.full_name} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(backPath)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl">{complaint.title}</CardTitle>
                <CardDescription className="mt-2">
                  Submitted by {complaint.profiles?.full_name || "Unknown Student"}
                  <br />
                  {getCategoryDisplay(complaint.category)} • 
                  {format(new Date(complaint.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <PriorityBadge priority={complaint.priority as "low" | "medium" | "high"} />
                <StatusBadge status={complaint.status as "pending" | "in_progress" | "resolved"} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{complaint.description}</p>
            
            {complaint.attachment_url && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Attachment:</span>
                  <a
                    href={complaint.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Attachment
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No responses yet
              </p>
            ) : (
              <div className="space-y-4">
                {responses.map((response, index) => (
                  <div key={response.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-foreground">
                            {response.profiles?.full_name || "Unknown Admin"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            (Admin)
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">
                        {response.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Update Status
                    </label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Add Response
                    </label>
                    <Textarea
                      placeholder="Type your response here..."
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Response"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplaintDetail;
