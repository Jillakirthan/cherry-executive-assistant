import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

export const PLANS: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Get started with Cherry's everyday intelligence.",
    features: [
      "Unlimited chat with the standard model",
      "Voice input & spoken replies",
      "Conversation history (local)",
      "Strategy, writing, analysis & code prompts",
    ],
    cta: "Your current plan",
  },
  {
    name: "Pro",
    price: "$20",
    period: "per month",
    tagline: "For executives who want Cherry at full power.",
    features: [
      "Everything in Free",
      "Priority access to the most advanced model",
      "Live web facts & deeper reasoning",
      "Longer context for documents & briefs",
      "Faster responses, even at peak times",
      "Early access to new Cherry features",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

export function PricingPlans({
  onChoose,
  compact = false,
}: {
  onChoose?: (plan: PricingPlan) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-5 ${
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2"
      }`}
    >
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={`relative flex flex-col rounded-2xl border bg-card p-6 transition ${
            plan.highlight
              ? "border-primary shadow-elegant"
              : "border-border"
          }`}
        >
          {plan.highlight && (
            <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              Most popular
            </div>
          )}
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cherry {plan.name}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif text-4xl leading-none text-foreground">
                {plan.price}
              </span>
              <span className="text-[12px] text-muted-foreground">
                / {plan.period}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
              {plan.tagline}
            </p>
          </div>

          <ul className="mb-6 space-y-2.5">
            {plan.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-[13.5px] leading-6 text-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            onClick={() => onChoose?.(plan)}
            disabled={!plan.highlight}
            className={`mt-auto h-10 w-full rounded-lg text-[13px] font-medium ${
              plan.highlight
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {plan.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}
