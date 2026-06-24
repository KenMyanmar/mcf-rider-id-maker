import { createFileRoute } from "@tanstack/react-router";
import { RiderCardWorkspace } from "@/components/mcf/RiderCardWorkspace";

export const Route = createFileRoute("/_authenticated/work")({
  head: () => ({ meta: [{ title: "MCF Rider Card Desk" }] }),
  component: WorkPage,
});

function WorkPage() {
  return <RiderCardWorkspace />;
}