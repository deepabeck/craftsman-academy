"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { MarketplaceItem } from "@/app/actions/marketplace";
import { requestPurchase } from "@/app/actions/marketplace";
import { PageHeader } from "@/components/ui";
import { usePoints } from "@/contexts/points-context";

interface Props {
  items: MarketplaceItem[];
  weeklyPurchases: { itemId: string; status: string }[];
}

export function ShopClient({ items, weeklyPurchases: initialPurchases }: Props) {
  const { balance, refreshBalance } = usePoints();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, string>>({});

  const purchaseMap = Object.fromEntries(purchases.map((p) => [p.itemId, p.status]));

  const handleRequest = (itemId: string) => {
    startTransition(async () => {
      const result = await requestPurchase(itemId);
      if (result.success) {
        setPurchases((prev) => [...prev, { itemId, status: "pending" }]);
        setMessages((prev) => ({ ...prev, [itemId]: "Requested! Waiting for approval." }));
        refreshBalance(1000);
      } else {
        setMessages((prev) => ({ ...prev, [itemId]: result.error ?? "Error" }));
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="customize" title="COGS Shop" sub="Spend your earned COGS on rewards" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "rgba(232,168,32,0.08)",
            border: "1px solid rgba(232,168,32,0.3)",
            borderRadius: 8,
          }}
        >
          <Image src="/assets/icon_coin.png" alt="cogs" width={22} height={22} />
          <span className="cinzel" style={{ fontSize: 18, fontWeight: 700, color: "#E8A820" }}>
            {balance?.toLocaleString() ?? "—"}
          </span>
          <span className="cinzel" style={{ fontSize: 11, color: "#C8860A", letterSpacing: "0.15em" }}>
            COGS
          </span>
        </div>
      </div>

      {/* Items grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => {
          const status = purchaseMap[item.id];
          const isPending = status === "pending";
          const isApproved = status === "approved";
          const canAfford = (balance ?? 0) >= item.price;
          const msg = messages[item.id];

          return (
            <div
              key={item.id}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${isApproved ? "rgba(112,224,144,0.35)" : isPending ? "rgba(212,168,48,0.35)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: !canAfford && !status ? 0.65 : 1,
              }}
            >
              <div style={{ fontSize: 36, lineHeight: 1 }}>{item.emoji}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#7A8B9C", marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <Image src="/assets/icon_coin.png" alt="" width={14} height={14} />
                <span className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: "#E8A820" }}>
                  {item.price.toLocaleString()}
                </span>
                <span className="cinzel" style={{ fontSize: 10, color: "#C8860A", letterSpacing: "0.15em" }}>
                  COGS
                </span>
              </div>

              {/* Action */}
              <div style={{ marginTop: 4 }}>
                {isApproved ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#70E090",
                      fontWeight: 600,
                      padding: "6px 0",
                    }}
                  >
                    ✓ Approved — enjoy!
                  </div>
                ) : isPending ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#D4A830",
                      padding: "6px 0",
                    }}
                  >
                    ⏳ Pending approval
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-brass"
                    style={{ fontSize: 12, padding: "7px 16px", width: "100%", opacity: canAfford ? 1 : 0.4 }}
                    disabled={!canAfford}
                    onClick={() => handleRequest(item.id)}
                  >
                    {canAfford ? "Request" : "Not enough COGS"}
                  </button>
                )}
                {msg && !isPending && !isApproved && (
                  <div style={{ fontSize: 11, color: "#F08080", marginTop: 4 }}>{msg}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
