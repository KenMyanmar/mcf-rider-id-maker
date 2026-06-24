import { createFileRoute } from "@tanstack/react-router";
import { RiderCardWorkspace } from "@/components/mcf/RiderCardWorkspace";

export const Route = createFileRoute("/_authenticated/work/$reg")({
  head: () => ({ meta: [{ title: "MCF Rider Card Desk" }] }),
  component: WorkRegPage,
});

function WorkRegPage() {
  const { reg } = Route.useParams();
  return <RiderCardWorkspace initialReg={reg} />;
}