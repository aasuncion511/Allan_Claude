"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a scannable QR for a payment link — generated locally in the
 *  browser (no network call), for handing the customer a link at the counter
 *  without them having to type or receive anything. */
export function CheckoutQr({ url, size = 160 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: size, margin: 1 })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="Scan to pay" width={size} height={size} className="rounded-lg border border-line" />;
}
