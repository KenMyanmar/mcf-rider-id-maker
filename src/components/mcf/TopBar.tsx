import { useEffect, useState } from "react";
import { useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AccessInfo } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function TopBar({
  email,
  access,
}: {
  email?: string | null;
  access?: AccessInfo;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("mcf_card_staff")
        .select("display_name")
        .eq("user_id", u.user.id)
        .maybeSingle<{ display_name: string | null }>();
      if (!alive) return;
      setName(data?.display_name ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      await navigate({ to: "/auth" });
    } finally {
      setBusy(false);
    }
  }

  const navLink = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      className={`text-sm font-medium ${
        active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 text-white grid place-items-center font-bold shadow-sm">
            ★
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-neutral-900 truncate">
              MCF Rider Card Desk
            </div>
            <div className="text-[11px] text-neutral-500 truncate">
              64th National Championship 2026
            </div>
          </div>
        </div>

        <nav className="ml-4 flex items-center gap-4">
          {access?.kind === "staff"
            ? navLink("/work", "Card Desk", pathname.startsWith("/work"))
            : null}
          {access && access.kind !== "none"
            ? navLink("/events", "Events", pathname.startsWith("/events"))
            : null}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight min-w-0">
            <span className="text-xs font-medium text-neutral-900 truncate max-w-[200px]">
              {name ?? email ?? "Signed in"}
            </span>
            {email && name ? (
              <span className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                {email}
              </span>
            ) : null}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPwOpen(true)} className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Change password</span>
          </Button>
          <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void signOut()}
            className="gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
