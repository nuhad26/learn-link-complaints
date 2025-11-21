import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { z } from "zod";

const complaintSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  category: z.enum(["mentor", "admin", "academic_counsellor", "working_hub", "peer", "other"]),
  priority: z.enum(["low", "medium", "high"]),
});

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

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
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = complaintSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to submit a complaint");
      setIsSubmitting(false);
      return;
    }

    let attachmentUrl = null;

    // Upload attachment if provided
    if (attachmentFile) {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('complaint-attachments')
        .upload(fileName, attachmentFile);

      if (uploadError) {
        toast.error("Failed to upload attachment");
        console.error(uploadError);
        setIsSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('complaint-attachments')
        .getPublicUrl(fileName);
      
      attachmentUrl = publicUrl;
    }

    const { error } = await supabase.from("complaints").insert([{
      student_id: session.user.id,
      title: formData.title,
      description: formData.description,
      category: formData.category as any,
      priority: formData.priority as any,
      status: "pending" as any,
      attachment_url: attachmentUrl,
    }]);

    if (error) {
      toast.error("Failed to submit complaint");
      console.error(error);
    } else {
      toast.success("Complaint submitted successfully");
      navigate("/student");
    }

    setIsSubmitting(false);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="student" userName={profile.full_name} />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Submit New Complaint</CardTitle>
            <CardDescription>
              Provide detailed information about your concern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Complaint Title<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your complaint"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category<span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger id="category" className="bg-background border-[#E0E0E0] h-12">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-[#E0E0E0] shadow-lg z-50">
                    <SelectItem value="mentor" className="py-3 px-4 hover:bg-muted cursor-pointer">Mentor</SelectItem>
                    <SelectItem value="admin" className="py-3 px-4 hover:bg-muted cursor-pointer">Admin</SelectItem>
                    <SelectItem value="academic_counsellor" className="py-3 px-4 hover:bg-muted cursor-pointer">Academic Counsellor</SelectItem>
                    <SelectItem value="working_hub" className="py-3 px-4 hover:bg-muted cursor-pointer">Working Hub</SelectItem>
                    <SelectItem value="peer" className="py-3 px-4 hover:bg-muted cursor-pointer">Peer</SelectItem>
                    <SelectItem value="other" className="py-3 px-4 hover:bg-muted cursor-pointer">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">
                  Priority<span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  required
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Detailed Description<span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of your complaint..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 20 characters required
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachment"
                    type="file"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  {attachmentFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachmentFile(null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: Images, PDF, Word documents (Max 5MB)
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/student")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Complaint"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitComplaint;
