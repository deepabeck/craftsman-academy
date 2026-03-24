"use client";

import { useState, useTransition } from "react";
import type { MarketplaceItem, MarketplacePurchase } from "@/app/actions/marketplace";
import {
  approvePurchase,
  deleteMarketplaceItem,
  rejectPurchase,
  upsertMarketplaceItem,
} from "@/app/actions/marketplace";
import { PageHeader } from "@/components/ui";

interface Props {
  pending: MarketplacePurchase[];
  history: MarketplacePurchase[];
  items: (MarketplaceItem & { isActive: boolean })[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Purchase approval card ──────────────────────────────────────────────────

function PurchaseCard({ purchase, onAction }: { purchase: MarketplacePurchase; onAction: (id: string) => void }) {
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
        onAction(purchase.id);
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

// ── Item editor row ─────────────────────────────────────────────────────────

const BLANK = { id: "", name: "", description: "", price: 100, emoji: "🎁", weeklyLimit: 1, isActive: true };

function ItemRow({
  item,
  onSaved,
  onDeleted,
}: {
  item: MarketplaceItem & { isActive: boolean };
  onSaved: (updated: MarketplaceItem & { isActive: boolean }) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...item });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    startTransition(async () => {
      const result = await upsertMarketplaceItem(form);
      if (result.success) {
        setSaved(true);
        onSaved(form);
        setTimeout(() => {
          setSaved(false);
          setEditing(false);
        }, 1500);
      } else {
        setErr(result.error ?? "Failed");
      }
    });
  };

  const remove = () => {
    if (!confirm(`Remove "${item.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteMarketplaceItem(item.id);
      if (result.success) onDeleted(item.id);
      else setErr(result.error ?? "Failed");
    });
  };

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.22)",
        border: `1px solid ${item.isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
        borderRadius: 8,
        padding: "12px 14px",
        opacity: item.isActive ? 1 : 0.5,
      }}
    >
      {!editing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>{item.name}</span>
              {!item.isActive && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#F08080",
                    background: "rgba(240,128,128,0.15)",
                    padding: "1px 6px",
                    borderRadius: 3,
                  }}
                >
                  hidden
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#506070", marginTop: 1 }}>{item.description}</div>
          </div>
          <span className="cinzel" style={{ fontSize: 13, color: "#E8A820", fontWeight: 700, flexShrink: 0 }}>
            {item.price.toLocaleString()} COGS
          </span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "4px 12px" }}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "4px 10px", color: "#F08080" }}
            onClick={remove}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="inp"
              value={form.emoji}
              onChange={(e) => set("emoji", e.target.value)}
              style={{ width: 56, fontSize: 20, textAlign: "center", padding: "4px 6px" }}
              placeholder="emoji"
            />
            <input
              className="inp"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              style={{ flex: 1, minWidth: 140, fontSize: 13, padding: "5px 10px" }}
              placeholder="Name"
            />
            <input
              type="number"
              className="inp"
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value))}
              style={{ width: 90, fontSize: 13, padding: "5px 10px" }}
              placeholder="COGS"
            />
          </div>
          <input
            className="inp"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px" }}
            placeholder="Description shown to students"
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#9AABBC",
                cursor: "pointer",
              }}
            >
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Visible in shop
            </label>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "5px 14px" }}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn-brass" style={{ fontSize: 12, padding: "5px 16px" }} onClick={save}>
              {saved ? "✓ Saved" : "Save"}
            </button>
          </div>
          {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

// ── Add new item form ───────────────────────────────────────────────────────

function AddItemForm({ onAdded }: { onAdded: (item: MarketplaceItem & { isActive: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) {
      setErr("Name is required");
      return;
    }
    startTransition(async () => {
      const result = await upsertMarketplaceItem(form);
      if (result.success) {
        const id = form.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        onAdded({ ...form, id, weeklyLimit: form.weeklyLimit, sortOrder: 0 });
        setForm({ ...BLANK });
        setOpen(false);
      } else {
        setErr(result.error ?? "Failed");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost"
        style={{ fontSize: 13, padding: "8px 18px", alignSelf: "flex-start" }}
        onClick={() => setOpen(true)}
      >
        + Add Item
      </button>
    );
  }

  return (
    <div
      style={{
        background: "rgba(232,168,32,0.05)",
        border: "1px solid rgba(232,168,32,0.2)",
        borderRadius: 8,
        padding: "14px",
      }}
    >
      <div className="cinzel" style={{ fontSize: 11, color: "#C8860A", letterSpacing: "0.1em", marginBottom: 10 }}>
        NEW ITEM
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="inp"
            value={form.emoji}
            onChange={(e) => set("emoji", e.target.value)}
            style={{ width: 56, fontSize: 20, textAlign: "center", padding: "4px 6px" }}
            placeholder="emoji"
          />
          <input
            className="inp"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            style={{ flex: 1, minWidth: 140, fontSize: 13, padding: "5px 10px" }}
            placeholder="Name"
          />
          <input
            type="number"
            className="inp"
            value={form.price}
            onChange={(e) => set("price", Number(e.target.value))}
            style={{ width: 90, fontSize: 13, padding: "5px 10px" }}
            placeholder="COGS"
          />
        </div>
        <input
          className="inp"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          style={{ fontSize: 12, padding: "5px 10px" }}
          placeholder="Description shown to students"
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "5px 14px" }}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button type="button" className="btn-brass" style={{ fontSize: 12, padding: "5px 16px" }} onClick={save}>
            Add to Shop
          </button>
        </div>
        {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
      </div>
    </div>
  );
}

// ── Main client ─────────────────────────────────────────────────────────────

export function ShopAdminClient({ pending: initialPending, history, items: initialItems }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<"pending" | "history" | "items">("pending");

  const handleAction = (id: string) => setPending((prev) => prev.filter((p) => p.id !== id));
  const handleSaved = (updated: MarketplaceItem & { isActive: boolean }) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  const handleDeleted = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const handleAdded = (item: MarketplaceItem & { isActive: boolean }) => setItems((prev) => [...prev, item]);

  const statusColor = (s: string) => (s === "approved" ? "#70E090" : s === "rejected" ? "#F08080" : "#D4A830");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader
          icon="review"
          title="Shop"
          sub={pending.length > 0 ? `${pending.length} pending approval` : "Manage items & approve requests"}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={tab === "pending" ? "btn-brass" : "btn-ghost"}
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => setTab("pending")}
          >
            Pending{pending.length > 0 ? ` (${pending.length})` : ""}
          </button>
          <button
            type="button"
            className={tab === "items" ? "btn-brass" : "btn-ghost"}
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => setTab("items")}
          >
            Manage Items
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

      {/* ── Pending tab ── */}
      {tab === "pending" &&
        (pending.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No pending requests.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map((p) => (
              <PurchaseCard key={p.id} purchase={p} onAction={handleAction} />
            ))}
          </div>
        ))}

      {/* ── Manage Items tab ── */}
      {tab === "items" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onSaved={handleSaved} onDeleted={handleDeleted} />
          ))}
          <AddItemForm onAdded={handleAdded} />
        </div>
      )}

      {/* ── History tab ── */}
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
                    style={{ fontSize: 11, fontWeight: 700, color: statusColor(p.status), textTransform: "capitalize" }}
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
