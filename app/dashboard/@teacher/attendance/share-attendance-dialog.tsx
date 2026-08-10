"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getAttendanceSessionById, type AttendanceSession } from "@/lib/api/attendance-session";
import { Loader2 } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

interface ShareAttendanceDialogProps {
  session: AttendanceSession | null;
  onClose: () => void;
}

export function ShareAttendanceDialog({ session, onClose }: ShareAttendanceDialogProps) {
  const [shareType, setShareType] = useState<"absent" | "present">("absent");
  const [shareNames, setShareNames] = useState<boolean>(false);
  const [fullSession, setFullSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!session) {
      setFullSession(null);
      return;
    }

    if (session.records && Array.isArray(session.records)) {
      setFullSession(session);
      return;
    }

    setLoading(true);
    getAttendanceSessionById(session._id)
      .then(setFullSession)
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load session details.");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [session, onClose]);

  if (!session) return null;

  const handleShareAction = async (action: "share" | "copy") => {
    if (!fullSession) return;
    const records = fullSession.records || [];
    const filteredRecords = records.filter(r => r.status === shareType);
    
    filteredRecords.sort((a, b) => {
      const rollA = String((a.student.profile as any)?.adm_number || (a.student.profile as any)?.candidate_code || '').trim();
      const rollB = String((b.student.profile as any)?.adm_number || (b.student.profile as any)?.candidate_code || '').trim();
      if (rollA && rollB) return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
      return (a.student.name || '').localeCompare(b.student.name || '');
    });

    let listText = "";
    if (shareNames) {
      listText = filteredRecords.map(r => {
        const roll = String((r.student.profile as any)?.candidate_code || (r.student.profile as any)?.adm_number || "").slice(-3);
        return `${roll} - ${toTitleCase(r.student.name)}`;
      }).join("\n");
    } else {
      listText = filteredRecords.map(r => {
        return String((r.student.profile as any)?.candidate_code || (r.student.profile as any)?.adm_number || "").slice(-3);
      }).join(", ");
    }

    const durationHrs = fullSession.hours_taken;
    const dateStr = format(new Date(fullSession.start_time), "MMM dd, yyyy");
    const timeStr = `${format(new Date(fullSession.start_time), "hh:mm a")} to ${format(new Date(fullSession.end_time), "hh:mm a")} (${durationHrs} hour${durationHrs === 1 ? '' : 's'})`;
    const title = `${fullSession.subject.name} - ${shareType === 'absent' ? 'Absentees' : 'Presentees'}`;

    const text = `Subject: ${fullSession.subject.name}\nDate: ${dateStr}\nTime: ${timeStr}\n${shareType === 'absent' ? 'Absentees' : 'Presentees'}:\n${listText}`;

    try {
      if (action === "share" && navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Share Attendance</CardTitle>
          <CardDescription>
            Configure how you want to share the attendance records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[200px]">
          {loading || !fullSession ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
            </div>
          ) : (
            <>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{fullSession.subject.name}</p>
                <p className="text-sm text-muted-foreground">
                  {fullSession.batch?.name ?? "N/A"} • {format(new Date(fullSession.start_time), "MMM dd, yyyy hh:mm a")}
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Share Type</label>
                  <Select value={shareType} onValueChange={(v: "absent" | "present") => setShareType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absent">Absentees</SelectItem>
                      <SelectItem value="present">Presentees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">List Format</label>
                  <Select value={shareNames ? "names" : "rolls"} onValueChange={(v) => setShareNames(v === "names")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rolls">Only Roll No's</SelectItem>
                      <SelectItem value="names">Roll No's & Names</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => handleShareAction("copy")}>
                  Copy
                </Button>
                <Button onClick={() => handleShareAction("share")}>
                  Share
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
