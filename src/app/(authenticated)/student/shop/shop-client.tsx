"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { MarketplaceItem, SharedContribution } from "@/app/actions/marketplace";
import { requestPurchase } from "@/app/actions/marketplace";
import { PageHeader } from "@/components/ui";
import { usePoints } from "@/contexts/points-context";

interface Props {
  items: MarketplaceItem[];
  weeklyPurchases: { itemId: string; status: string; note: string | null }[];
  sharedContributions: SharedContribution[];
  currentStudentId: string;
}

export function ShopClient({ items, weeklyPurchases: initialPurchases, sharedContributions, currentStudentId }: Props) {
  const { balance, refreshBalance } = usePoints();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, string>>({});

  // Two-step request: null = idle, itemId = confirm step
  const [requesting, setRequesting] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const purchaseMap = Object.fromEntries(purchases.map((p) => [p.itemId, p]));

  const handleRequest = (itemId: string) => {
    const note = noteInputs[itemId] ?? "";
    startTransition(async () => {
      const result = await requestPurchase(itemId, note || undefined);
      if (result.success) {
        setPurchases((prev) => [...prev, { itemId, status: "pending", note: note || null }]);
        setRequesting(null);
        setNoteInputs((prev) => ({ ...prev, [itemId]: "" }));
        setMessages((prev) => ({ ...prev, [itemId]: "" }));
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
        <PageHeader icon="coin" title="Cogs Shop" sub="Spend your earned Cogs on rewards" />
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
            Cogs
          </span>
        </div>
      </div>

      {/* Items grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {items.map((item) => {
          const myPurchase = purchaseMap[item.id];
          const isPending = myPurchase?.status === "pending";
          const isApproved = myPurchase?.status === "approved";

          // Shared item logic
          const myShare = item.shared ? Math.ceil(item.price / 2) : item.price;
          const canAfford = (balance ?? 0) >= myShare;
          const allContributors = sharedContributions.filter((c) => c.itemId === item.id);
          const otherContributors = allContributors.filter((c) => c.studentId !== currentStudentId);
          const bothContributed = item.shared && allContributors.length >= 2;

          const isConfirming = requesting === item.id;
          const msg = messages[item.id];

          return (
            <div
              key={item.id}
              style={{
                background: "rgba(0,0,0,0.65)",
                border: `1px solid ${
                  isApproved
                    ? "rgba(112,224,144,0.35)"
                    : isPending
                      ? "rgba(212,168,48,0.35)"
                      : item.shared
                        ? "rgba(176,160,240,0.25)"
                        : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: 10,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: !canAfford && !myPurchase ? 0.65 : 1,
              }}
            >
              {/* Emoji + shared badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{item.emoji}</div>
                {item.shared && (
                  <span
                    style={{
                      fontSize: 10,
                      background: "rgba(176,160,240,0.15)",
                      color: "#B0A0F0",
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    🤝 Shared
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#7A8B9C", marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <Image src="/assets/icon_coin.png" alt="" width={14} height={14} />
                <span className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: "#E8A820" }}>
                  {item.shared ? myShare.toLocaleString() : item.price.toLocaleString()}
                </span>
                <span className="cinzel" style={{ fontSize: 10, color: "#C8860A", letterSpacing: "0.15em" }}>
                  {item.shared ? `Cogs your share` : "Cogs"}
                </span>
                {item.shared && (
                  <span style={{ fontSize: 10, color: "#506070", marginLeft: 2 }}>
                    ({item.price.toLocaleString()} total)
                  </span>
                )}
              </div>

              {/* Shared contributor status */}
              {item.shared && (isPending || isApproved || otherContributors.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "6px 10px",
                    background: "rgba(176,160,240,0.07)",
                    borderRadius: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Me */}
                  <span style={{ fontSize: 11 }}>
                    <span style={{ color: "#B0A0F0", fontWeight: 600 }}>You</span>{" "}
                    {isPending || isApproved ? (
                      <span style={{ color: "#70E090" }}>✓</span>
                    ) : (
                      <span style={{ color: "#506070" }}>—</span>
                    )}
                  </span>
                  {/* Other contributors */}
                  {otherContributors.map((c) => (
                    <span key={c.studentId} style={{ fontSize: 11 }}>
                      <span style={{ color: c.studentColor, fontWeight: 600 }}>{c.studentName}</span>{" "}
                      {c.status === "pending" || c.status === "approved" ? (
                        <span style={{ color: "#70E090" }}>✓</span>
                      ) : (
                        <span style={{ color: "#506070" }}>—</span>
                      )}
                    </span>
                  ))}
                  {/* Status message */}
                  <span style={{ fontSize: 11, color: bothContributed ? "#70E090" : "#D4A830", marginLeft: "auto" }}>
                    {bothContributed ? "Both in ✓" : "Waiting on co-contributor"}
                  </span>
                </div>
              )}

              {/* Action area */}
              <div style={{ marginTop: 4 }}>
                {isApproved ? (
                  <div style={{ fontSize: 12, color: "#70E090", fontWeight: 600, padding: "6px 0" }}>
                    ✓ Approved — enjoy!
                  </div>
                ) : isPending ? (
                  <div style={{ fontSize: 12, color: "#D4A830", padding: "6px 0" }}>
                    ⏳{" "}
                    {item.shared && !bothContributed
                      ? "Your contribution is in · Waiting on co-contributor"
                      : "Pending approval"}
                    {myPurchase?.note && <span style={{ color: "#506070", marginLeft: 6 }}>"{myPurchase.note}"</span>}
                  </div>
                ) : isConfirming ? (
                  /* Confirm step: note + submit */
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      className="inp"
                      placeholder={
                        item.shared ? "What's this for? e.g. Minecraft Legends (optional)" : "Add a note (optional)"
                      }
                      value={noteInputs[item.id] ?? ""}
                      onChange={(e) => setNoteInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      style={{ fontSize: 12, padding: "6px 10px" }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                        onClick={() => setRequesting(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-brass"
                        style={{ fontSize: 12, padding: "5px 16px", flex: 1 }}
                        onClick={() => handleRequest(item.id)}
                      >
                        {item.shared ? `Contribute ${myShare.toLocaleString()} Cogs` : `Confirm Request`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-brass"
                    style={{ fontSize: 12, padding: "7px 16px", width: "100%", opacity: canAfford ? 1 : 0.4 }}
                    disabled={!canAfford}
                    onClick={() => setRequesting(item.id)}
                  >
                    {canAfford
                      ? item.shared
                        ? `Contribute ${myShare.toLocaleString()} Cogs`
                        : "Request"
                      : "Not enough Cogs"}
                  </button>
                )}
                {msg && !isPending && !isApproved && !isConfirming && (
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
