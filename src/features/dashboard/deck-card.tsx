"use client";

import { Check, FileText, ImageIcon, Video, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { StatusPill } from "@/components/patterns/status-pill";
import { DELIVERABLE_TYPE_LABEL } from "@/lib/domain/deliverables";
import { participationStatus } from "@/lib/domain/status";
import type { CampaignListItem, DiscoverableCampaign } from "@/lib/api/client";
import { formatMoney } from "@/lib/format/currency";
import { formatRelativeDeadline } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

/** Horizontal drag distance, in px, that commits a swipe on release. */
const COMMIT_THRESHOLD = 110;
/** Drag distance at which the rotation caps out. */
const ROTATION_CAP_DISTANCE = 220;
const MAX_ROTATION_DEG = 16;
/** Anything smaller than this is a tap, not a drag. */
const TAP_SLOP = 6;

export type SwipeDirection = "right" | "left";

/**
 * A card in the discovery deck is one of two shapes:
 *  - "invite": an existing invitation, with an assignment and deliverables —
 *    the same data `/discover` used last session. Swiping right accepts it.
 *  - "open": an eligible open-application campaign with no assignment yet.
 *    Swiping right applies to it.
 *
 * A discriminated union rather than one interface with optional fields,
 * because the two cards render genuinely different data (deliverables and a
 * response deadline vs. neither) and mixing them into one shape would mean
 * every render branch re-deriving which fields are meaningful.
 */
export type DeckItem =
  | { kind: "invite"; key: string; row: CampaignListItem }
  | { kind: "open"; key: string; item: DiscoverableCampaign };

interface DeckCardProps {
  item: DeckItem;
  /** Only the top card is interactive; cards behind it render statically. */
  isTop: boolean;
  /** 0 = top of stack. Used purely for the static peek offset. */
  stackIndex: number;
  onSwipe: (direction: SwipeDirection) => void;
  onTap: () => void;
  disabled?: boolean;
  prefersReducedMotion: boolean;
}

/**
 * A single card in the home discovery deck. Pointer events drive a live
 * `translateX/rotate` while dragging; on release the drag either commits
 * (flies off screen, then calls `onSwipe`) or springs back to center. A
 * near-zero-distance pointer down/up counts as a tap and opens the details
 * sheet instead — drag and tap never both fire for the same gesture.
 */
export function DeckCard({
  item,
  isTop,
  stackIndex,
  onSwipe,
  onTap,
  disabled,
  prefersReducedMotion,
}: DeckCardProps) {
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exiting, setExiting] = useState<SwipeDirection | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const canDrag = isTop && !disabled && !exiting;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canDrag) return;
    if (e.button !== undefined && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    cardRef.current?.setPointerCapture(e.pointerId);
    setDrag({ x: 0, active: true });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!canDrag || pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startRef.current.x;
    setDrag({ x: dx, active: true });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!canDrag || pointerIdRef.current !== e.pointerId) return;
    cardRef.current?.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;

    const dx = drag.x;

    if (Math.abs(dx) < TAP_SLOP) {
      setDrag({ x: 0, active: false });
      onTap();
      return;
    }

    if (Math.abs(dx) >= COMMIT_THRESHOLD) {
      const direction: SwipeDirection = dx > 0 ? "right" : "left";
      commitSwipe(direction, dx);
    } else {
      setDrag({ x: 0, active: false });
    }
  }

  function commitSwipe(direction: SwipeDirection, fromX: number) {
    setExiting(direction);
    if (prefersReducedMotion) {
      onSwipe(direction);
      return;
    }
    const flightMs = 220;
    setDrag({ x: fromX, active: false });
    window.setTimeout(() => onSwipe(direction), flightMs);
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setDrag({ x: 0, active: false });
  }

  const dx = drag.x;
  const rotation = prefersReducedMotion
    ? 0
    : clamp(dx / ROTATION_CAP_DISTANCE, -1, 1) * MAX_ROTATION_DEG;

  const flyOffX = exiting
    ? (exiting === "right" ? 1 : -1) * Math.max(Math.abs(dx), 400)
    : dx;

  const transform =
    isTop && !prefersReducedMotion
      ? `translateX(${exiting ? flyOffX : dx}px) rotate(${rotation}deg)`
      : isTop && prefersReducedMotion && exiting
        ? "translateX(0)"
        : undefined;

  const cueStrength = clamp(Math.abs(dx) / COMMIT_THRESHOLD, 0, 1);
  const showRightCue = isTop && dx > 24;
  const showLeftCue = isTop && dx < -24;

  const peekScale = isTop ? 1 : 1 - stackIndex * 0.04;
  const peekOffsetY = isTop ? 0 : stackIndex * 10;

  const { campaign, brand, image } = deckItemCore(item);
  const rightLabel = item.kind === "invite" ? "Accept" : "Apply";
  const leftLabel = item.kind === "invite" ? "Decline" : "Pass";
  const ariaVerb = item.kind === "invite" ? "Invitation from" : "Open campaign from";

  return (
    <div
      ref={cardRef}
      role={isTop ? "group" : undefined}
      aria-roledescription={isTop ? "swipeable card" : undefined}
      aria-label={isTop ? `${ariaVerb} ${brand.name}: ${campaign.name}` : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={handlePointerCancel}
      className={cn(
        "card-hard-lg absolute inset-0 overflow-hidden rounded-[var(--radius-lg)] bg-card",
        isTop && "touch-none select-none",
        isTop && drag.active
          ? ""
          : "transition-[transform,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
        !isTop && "pointer-events-none",
      )}
      style={{
        transform: transform ?? `translateY(${peekOffsetY}px) scale(${peekScale})`,
        zIndex: 100 - stackIndex,
        opacity: exiting && prefersReducedMotion ? 0 : 1,
      }}
    >
      {/* Directional cue — subtle tint + label, on-brand tokens only. */}
      {showRightCue && (
        <span
          className="absolute top-5 left-5 z-10 rounded-md border-[1.5px] border-[var(--pm-lime-700)] bg-card/90 px-2 py-1 font-display text-sm tracking-wide text-[var(--pm-lime-700)] uppercase"
          style={{ opacity: cueStrength }}
          aria-hidden
        >
          {rightLabel}
        </span>
      )}
      {showLeftCue && (
        <span
          className="absolute top-5 right-5 z-10 rounded-md border-[1.5px] border-status-danger-fg bg-card/90 px-2 py-1 font-display text-sm tracking-wide text-status-danger-fg uppercase"
          style={{ opacity: cueStrength }}
          aria-hidden
        >
          {leftLabel}
        </span>
      )}

      {image ? (
        <ImageFace image={image} priority={isTop} />
      ) : (
        <IconFace brandName={brand.name} />
      )}

      <div className="relative flex h-full flex-col justify-end">
        {item.kind === "invite" ? (
          <InviteFace row={item.row} />
        ) : (
          <OpenFace item={item.item} />
        )}
      </div>

      {/* Screen-reader / keyboard hint icons — decorative, real actions are
          the Accept/Reject or Apply/Pass buttons below the stack. */}
      <div
        className="pointer-events-none absolute inset-x-5 bottom-5 flex justify-between opacity-0"
        aria-hidden
      >
        <X className="size-5" />
        <Check className="size-5" />
      </div>
    </div>
  );
}

function deckItemCore(item: DeckItem) {
  if (item.kind === "invite") {
    return { campaign: item.row.campaign, brand: item.row.brand, image: item.row.campaign.image };
  }
  return { campaign: item.item.campaign, brand: item.item.brand, image: item.item.campaign.image };
}

/** The campaign photo, full-bleed at the top of the card, Hinge/Tinder-style,
 *  with a bottom gradient scrim so the overlaid text stays legible. */
function ImageFace({ image, priority }: { image: string; priority?: boolean }) {
  return (
    <div className="absolute inset-0">
      <Image
        src={image}
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 480px) 100vw, 384px"
        unoptimized
        priority={priority}
        loading={priority ? "eager" : undefined}
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--pm-ink-900) 0%, rgba(0,0,0,0.55) 32%, rgba(0,0,0,0) 62%)",
        }}
      />
    </div>
  );
}

/** Fallback when a campaign has no image — the original hard-shadow card
 *  treatment with a brand initial, kept exactly so nothing looks broken. */
function IconFace({ brandName }: { brandName: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--pm-paper-200)]">
      <span className="flex size-24 items-center justify-center rounded-full border-2 border-[var(--pm-ink-900)] bg-card font-display text-h1 text-[var(--pm-ink-900)]">
        {brandName.charAt(0).toUpperCase()}
      </span>
      <ImageIcon
        className="absolute right-4 bottom-4 size-5 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

function CardText({
  children,
  hasImage,
}: {
  children: React.ReactNode;
  hasImage: boolean;
}) {
  return (
    <div
      className={cn(
        "relative z-[1] p-5",
        hasImage ? "text-[var(--pm-paper-50)]" : "text-[var(--pm-ink-900)]",
      )}
    >
      {children}
    </div>
  );
}

function InviteFace({ row }: { row: CampaignListItem }) {
  const { assignment, campaign, brand, deliverables } = row;
  const deadline = assignment.accept_by ? formatRelativeDeadline(assignment.accept_by) : null;
  const nextDue = [...deliverables].sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
  const hasImage = campaign.image !== null;

  return (
    <CardText hasImage={hasImage}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm", hasImage ? "text-[var(--pm-paper-200)]" : "text-muted-foreground")}>
            {brand.name}
          </p>
          <p className="mt-0.5 font-display text-h1 leading-tight text-balance">
            {campaign.name}
          </p>
        </div>
        <StatusPill size="sm" status={participationStatus(assignment.participation_status)} />
      </div>

      <p
        className={cn(
          "mt-3 text-sm",
          hasImage ? "text-[var(--pm-paper-100)]" : "text-muted-foreground",
        )}
      >
        {campaign.objective}
      </p>

      {/* Financials are always on the card face — never gated behind expand. */}
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {assignment.visible_to_creator && assignment.fee_amount !== null && (
            <span className="font-display text-h2 tabular">
              {formatMoney(assignment.fee_amount)}
            </span>
          )}
          {deadline && (
            <span
              className={cn(
                "font-mono text-caption tabular",
                deadline.isOverdue ? "text-status-danger-fg" : "text-energy",
              )}
            >
              Respond in {deadline.text.replace(" left", "")}
            </span>
          )}
        </div>

        {nextDue && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
              hasImage
                ? "border-white/20 bg-black/30 text-[var(--pm-paper-100)]"
                : "bg-surface-sunken text-muted-foreground",
            )}
          >
            {nextDue.type === "video" ? (
              <Video className="size-4 shrink-0" aria-hidden />
            ) : (
              <FileText className="size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {DELIVERABLE_TYPE_LABEL[nextDue.type]} · {deliverables.length} deliverable
              {deliverables.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <p
          className={cn(
            "text-center text-caption",
            hasImage ? "text-[var(--pm-paper-200)]" : "text-muted-foreground",
          )}
        >
          Tap for full details
        </p>
      </div>
    </CardText>
  );
}

function OpenFace({ item }: { item: DiscoverableCampaign }) {
  const { campaign, brand } = item;
  const hasImage = campaign.image !== null;
  const feeLabel = feeSummary();

  return (
    <CardText hasImage={hasImage}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm", hasImage ? "text-[var(--pm-paper-200)]" : "text-muted-foreground")}>
            {brand.name}
          </p>
          <p className="mt-0.5 font-display text-h1 leading-tight text-balance">
            {campaign.name}
          </p>
        </div>
        <StatusPill size="sm" status={{ tone: "info", icon: "circle", label: "Open" }} />
      </div>

      <p
        className={cn(
          "mt-3 text-sm",
          hasImage ? "text-[var(--pm-paper-100)]" : "text-muted-foreground",
        )}
      >
        {campaign.objective}
      </p>

      {/* No assignment exists yet, so there is no fee_amount — the campaign
          does not carry one either, per the current data model. Rather than
          render nothing where a fee usually sits (which would look broken
          next to invite cards), the card says so plainly. */}
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-display text-h2 tabular">{feeLabel}</span>
        </div>

        <p
          className={cn(
            "text-center text-caption",
            hasImage ? "text-[var(--pm-paper-200)]" : "text-muted-foreground",
          )}
        >
          Tap for full details
        </p>
      </div>
    </CardText>
  );
}

/**
 * Open-application campaigns have no `CampaignAssignment` yet, so there is no
 * `fee_amount` to read the way invite cards do — the field lives on the
 * assignment, not the campaign, and none exists before applying. Rather than
 * invent a number, the card says plainly that pay is confirmed on selection,
 * which is also true of how the open-application state machine actually
 * works (applied → shortlisted → selected). This keeps the "fee never
 * silently renders undefined" rule intact without fabricating data.
 */
function feeSummary(): string {
  return "Pay confirmed if selected";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
