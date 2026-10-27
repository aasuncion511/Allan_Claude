"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HoldStatus = "held" | "expired" | "payment_pending" | "checkout_pending" | "confirmed";

/**
 * Server-authoritative countdown for a free vehicle hold. The display timer
 * ticks locally once a second, but NEVER owns the deadline — every mount,
 * tab focus, visibility change, "online" event, and periodic poll re-fetches
 * the true expiresAtUtc/serverNowUtc from the server via getHoldState, so
 * refresh/navigation/returning from PayMongo can never reset it (v2 handoff
 * §3, acceptance tests 2-5).
 */
export function HoldCountdown({
  bookingId,
  initialServerNowUtc,
  initialExpiresAtUtc,
  getHoldState,
  onExpired,
  onConfirmed,
  children,
}: {
  bookingId: string;
  initialServerNowUtc: string;
  initialExpiresAtUtc: string;
  /** Server action — kept generic so this component has no route-specific imports. */
  getHoldState: (bookingId: string) => Promise<
    | { status: "NOT_FOUND" }
    | { status: "EXPIRED"; serverNowUtc: string }
    | { status: "PAYMENT_PENDING"; serverNowUtc: string }
    | { status: "CHECKOUT_PENDING"; serverNowUtc: string }
    | { status: "CONFIRMED"; serverNowUtc: string }
    | { status: "HELD"; serverNowUtc: string; expiresAtUtc: string; [k: string]: unknown }
  >;
  onExpired?: () => void;
  onConfirmed?: () => void;
  /** Render prop — receives the current remaining seconds and status. */
  children: (state: { remainingSeconds: number; status: HoldStatus }) => React.ReactNode;
}) {
  // clockOffsetMs = serverNow - Date.now() at last sync. Using this (instead
  // of trusting the client clock directly) means a wrong local clock never
  // throws the displayed countdown off. Starts at 0 (corrected by the
  // mount-effect's first resync) — deliberately NOT computed from
  // Date.now() here, since reading the live clock during render is impure.
  const clockOffsetRef = useRef(0);
  const expiresAtMsRef = useRef(new Date(initialExpiresAtUtc).getTime());
  const [status, setStatus] = useState<HoldStatus>("held");
  // First-paint estimate from the two server-supplied timestamps alone (both
  // deterministic props, no live clock read) — refined moments later by the
  // mount-effect's resync.
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(
      0,
      Math.round((new Date(initialExpiresAtUtc).getTime() - new Date(initialServerNowUtc).getTime()) / 1000)
    )
  );

  const resync = useCallback(async () => {
    const state = await getHoldState(bookingId);
    if (state.status === "NOT_FOUND" || state.status === "EXPIRED") {
      setStatus("expired");
      onExpired?.();
      return;
    }
    if (state.status === "CONFIRMED") {
      setStatus("confirmed");
      onConfirmed?.();
      return;
    }
    if (state.status === "PAYMENT_PENDING") {
      clockOffsetRef.current = new Date(state.serverNowUtc).getTime() - Date.now();
      setStatus("payment_pending");
      return;
    }
    if (state.status === "CHECKOUT_PENDING") {
      clockOffsetRef.current = new Date(state.serverNowUtc).getTime() - Date.now();
      setStatus("checkout_pending");
      return;
    }
    // HELD
    clockOffsetRef.current = new Date(state.serverNowUtc).getTime() - Date.now();
    expiresAtMsRef.current = new Date(state.expiresAtUtc).getTime();
    setStatus("held");
  }, [bookingId, getHoldState, onExpired, onConfirmed]);

  useEffect(() => {
    // Syncing server state into this component on mount — legitimate use of
    // an effect (same pattern/justification as elsewhere in this codebase).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resync();
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    // Poll faster while waiting on a webhook — a customer staring at
    // "confirming payment" wants that to resolve in seconds, not 30s.
    const intervalMs = status === "checkout_pending" || status === "payment_pending" ? 3_000 : 30_000;
    const pollId = setInterval(resync, intervalMs);
    return () => clearInterval(pollId);
  }, [status, resync]);

  useEffect(() => {
    if (status !== "held") return;
    const tick = () => {
      const now = Date.now() + clockOffsetRef.current;
      const remaining = Math.max(0, Math.round((expiresAtMsRef.current - now) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) resync(); // confirm with the server rather than just declaring expired locally
    };
    tick();
    const tickId = setInterval(tick, 1000);
    return () => clearInterval(tickId);
  }, [status, resync]);

  return <>{children({ remainingSeconds, status })}</>;
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
