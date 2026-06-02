import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import cherryLogo from "@/assets/cherry-logo.png";
import { PricingPlans } from "@/components/pricing-plans";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Cherry Executive AI Assistant" },
      {
        name: "description",
        content:
          "Choose the Cherry plan that fits how you work. Free for everyday use, Pro for the most advanced model, longer context, and priority access.",
      },
      { property: "og:title", content: "Cherry — Plans & Pricing" },
      {
        property: "og:description",
        content: "Free and Pro plans for the Cherry executive AI assistant.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={cherryLogo}
              alt="Cherry logo"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Cherry</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                EXECUTIVE AI ASSISTANT
              </div>
            </div>
          </Link>
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Plans
          </div>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight">
            Choose your <span className="italic text-muted-foreground">Cherry</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Cherry is precise, calm, and grounded. Start free — upgrade when you
            need the most advanced model, longer context, and priority access.
          </p>
        </div>

        <PricingPlans
          onChoose={(plan) =>
            toast.success(
              `${plan.name} selected — billing isn't wired up yet, but your choice is noted.`,
            )
          }
        />

        <p className="mt-10 text-center text-[11px] tracking-wide text-muted-foreground">
          Jilla Kirthan @ Cherry — Prices in USD. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
