import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const err =
    pw && pw.length < 8
      ? "At least 8 characters"
      : pw2 && pw !== pw2
        ? "Passwords do not match"
        : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (err || !pw || pw !== pw2) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    setPw("");
    setPw2("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="np2">Repeat new password</Label>
            <Input id="np2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !!err || !pw || pw !== pw2}>
              {busy ? "Saving…" : "Save password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
