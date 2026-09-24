import Link from "next/link";

import type { WindowTileFill } from "@/components/domain/window-tile";
import { StatusPill } from "@/components/patterns/status-pill";
import { participationStatus } from "@/lib/domain/status";
import type { CampaignListItem } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const FILL_CLASS: WindowTileFill[] = ["lime", "paper", "neutral"];
// lime/paper are always-light Layer 1 primitives, never remapped for dark
// mode — `on-light-fill` pins their text to ink regardless of theme.
const FILL_BG: Record<WindowTileFill, string> = {
  lime: "bg-[var(--pm-lime-200)] on-light-fill",
  paper: "bg-[var(--pm-paper-200)] on-light-fill",
  neutral: "bg-[var(--surface-raised)]",
  orange: "bg-[var(--pm-orange-100)] on-light-fill",
};

interface CampaignTileRowProps {
  rows: CampaignListItem[];
  className?: string;
}

/**
 * Fitness-style horizontally-scrollable row of campaign tiles, replacing the
 * old full-width bordered list rows. A single scroll region — nested inside
 * nothing else that scrolls — so it never traps the page's vertical scroll.
 *
 * Exposed as an accessible list of links: `role="list"` on the scroller,
 * `role="listitem"` on each tile, real `<Link>`s inside so keyboard tab
 * order and focus rings work without any extra wiring.
 */
export function CampaignTileRow({ rows, className }: CampaignTileRowProps) {
  return (
    <div
      role="list"
      aria-label="My campaigns"
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 scrollbar-hide",
        className,
      )}
    >
      {rows.map((row, i) => {
        const fill = FILL_CLASS[i % FILL_CLASS.length];
        return (
          <Link
            key={row.assignment.id}
            role="listitem"
            href={`/campaigns/${row.campaign.id}`}
            className={cn(
              fill === "neutral" ? "card-hard" : "card-hard-on-light",
              "press-hard flex h-40 w-[calc(100%-2.5rem)] shrink-0 snap-start flex-col justify-between rounded-[var(--radius-lg)] p-4 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              FILL_BG[fill],
            )}
          >
            <StatusPill
              size="sm"
              status={participationStatus(row.assignment.participation_status)}
              className="self-start bg-[var(--card)]"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-h2 leading-tight">
                {row.campaign.name}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {row.brand.name}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
