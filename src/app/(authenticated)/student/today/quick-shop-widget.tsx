"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { MarketplaceItem } from "@/app/actions/marketplace";
import { requestPurchase } from "@/app/actions/marketplace";
import { usePoints } from "@/contexts/points-context";

interface Props {
  items: MarketplaceItem[];
  purchases: { itemId: string; status: string; note: string | null }[];
  color: string;
}

/** Compact "quick buy" widget for the Today dashboard — shows balance + the
 *  cheapest affordable, non-shared items so kids can redeem right from the
 *  spot where they're already watching their Cogs add up, instead of having
 *  to remember to click into the separate Shop page. Shared items and the
 *  full catalog still live on the full Shop page (linked below). */
export function QuickShopWidget({ items, purchases: initialPurchases, color }: Props) {
  const { balance, refreshBalance } = usePoints();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);

  const purchaseMap = Object.fromEntries(purchases.map((p) => [p.itemId, p]));

  // Quick-buy only shows simple, single-student items — shared items need a
  // co-contributor and belong on the full Shop page where that flow lives.
  const buyable = items
    .filter((item) => !item.shared)
    .sort((a, b) => a.price - b.price || a.sortOrder - b.sortOrder)
    .slice(0, 4);

  const handleBuy = (itemId: string) => {
    setPendingId(itemId);
    setErrorFor(null);
    startTransition(async () => {
      const result = await requestPurchase(itemId);
      if (result.success) {
        setPurchases((prev) => [...prev, { itemId, status: "pending", note: null }]);
        refreshBalance(1000);
      } else {
        setErrorFor(itemId);
      }
      setPendingId(null);
    });
  };

  if (buyable.length === 0) return null;

  return (
    <div className="glass" style={{ padding: "16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="cinzel" style={{ fontSize: 13, fontWeight: 700, color }}>
          Quick Shop
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Image src="/assets/icon_coin.png" alt="cogs" width={16} height={16} />
          <span className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: "#E8A820" }}>
            {balance?.toLocaleString() ?? "—"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {buyable.map((item) => {
          const myPurchase = purchaseMap[item.id];
          const isPending = myPurchase?.status === "pending";
          const isApproved = myPurchase?.status === "approved";
          const canAfford = (balance ?? 0) >= item.price;
          const isBuying = pendingId === item.id;

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#C8860A", display: "flex", alignItems: "center", gap: 4 }}>
                  <Image src="/assets/icon_coin.png" alt="" width={10} height={10} />
                  {item.price.toLocaleString()} Cogs
                </div>
              </div>
              {isApproved ? (
                <span style={{ fontSize: 11, color: "#70E090", fontWeight: 600 }}>✓ Approved</span>
              ) : isPending ? (
                <span style={{ fontSize: 11, color: "#D4A830" }}>⏳ Pending</span>
              ) : (
                <button
                  type="button"
                  className="btn-brass"
                  style={{ fontSize: 11, padding: "5px 12px", opacity: canAfford ? 1 : 0.4 }}
                  disabled={!canAfford || isBuying}
                  onClick={() => handleBuy(item.id)}
                >
                  {isBuying ? "…" : canAfford ? "Buy" : "Need more"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {errorFor && (
        <div style={{ fontSize: 11, color: "#F08080", marginTop: 8 }}>
          Couldn't request that one — try again from the Shop page.
        </div>
      )}

      <Link
        href="/student/shop"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 10,
          fontSize: 12,
          color: "#9AABBC",
          textDecoration: "none",
        }}
      >
        View full shop →
      </Link>
    </div>
  );
}
