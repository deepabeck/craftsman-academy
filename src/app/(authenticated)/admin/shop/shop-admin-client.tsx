"use client";

import { useState, useTransition } from "react";
import type { MarketplacePurchase } from "@/app/actions/marketplace";
import { approvePurchase, rejectPurchase } from "@/app/actions/marketplace";
import { PageHeader } from "@/components/ui";

interface Props {
  pending: MarketplacePurchase[];
  history: MarketplacePurchase[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PurchaseCard({
  purchase,
  onAction,
}: {
  purchase: MarketplacePurchase;
  onAction: (id: string, action: "approved" | "rejected") => void;
}) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const handle = (action: "approved" | "rejected") => {
    startTransition(async () => {
      const fn = action === "approved" ? approvePurchase : rejectPurchase;
      const result = await fn(purchase.id, note || undefined);
      if (result.success) {
        setDone(true);
        onAction(purchase.id, action);
      } else {
        setErr(result.error ?? "Failed");
      }
    });
  };

  if (done) return null;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{purchase.item.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{purchase.item.name}</span>
            <span style={{ fontSize: 12, color: purchase.student.color, fontWeight: 600 }}>
              {purchase.student.name}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#7A8B9C", marginTop: 2 }}>{purchase.item.description}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
            <span className="cinzel" style={{ fontSize: 13, color: "#E8A820", fontWeight: 700 }}>
              {purchase.item.price.toLocaleString()} COGS
            </span>
            <span style={{ fontSize: 11, color: "#506070" }}>Requested {formatDate(purchase.requestedAt)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="inp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to student…"
          style={{ flex: 1, minWidth: 160, fontSize: 12, padding: "5px 10px" }}
        />
        <button
          type="button"
          className="btn-brass"
          style={{ fontSize: 12, padding: "6px 16px" }}
          onClick={() => handle("approved")}
        >
          ✓ Approve
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 12, padding: "6px 14px", color: "#F08080" }}
          onClick={() => handle("rejected")}
        >
          ✕ Reject
        </button>
      </div>
      {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
    </div>
  );
}

export function ShopAdminClient({ pending: initialPending, history }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const handleAction = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const statusColor = (s: string) => (s === "approved" ? "#70E090" : s === "rejected" ? "#F08080" : "#D4A830");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="review" title="Shop Requests" sub={`${pending.length} pending approval`} />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={tab === "pending" ? "btn-brass" : "btn-ghost"}
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => setTab("pending")}
          >
            Pending {pending.length > 0 && `(${pending.length})`}
          </button>
          <button
            type="button"
            className={tab === "history" ? "btn-brass" : "btn-ghost"}
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>
      </div>

      {tab === "pending" && (
        <>
          {pending.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No pending requests.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.map((p) => (
                <PurchaseCard key={p.id} purchase={p} onAction={handleAction} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No purchase history yet.</div>
          ) : (
            history.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 24 }}>{p.item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: "#EEE4CC" }}>{p.item.name}</span>
                    <span style={{ fontSize: 12, color: p.student.color }}>{p.student.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#506070", marginTop: 2 }}>
                    {formatDate(p.requestedAt)}
                    {p.adminNote && ` · ${p.adminNote}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="cinzel" style={{ fontSize: 12, color: "#C8860A" }}>
                    {p.item.price} COGS
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: statusColor(p.status),
                      textTransform: "capitalize",
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
