"use client";

import { useState, useTransition } from "react";
import type { MarketplaceItem, MarketplacePurchase, SkippableTask } from "@/app/actions/marketplace";
import {
  approvePurchase,
  approveSharedGroup,
  deleteMarketplaceItem,
  getStudentSkippableTasks,
  rejectPurchase,
  rejectSharedGroup,
  skipDayAndApprove,
  skipTaskAndApprove,
  upsertMarketplaceItem,
} from "@/app/actions/marketplace";
import type { LedgerEntry } from "@/app/actions/points";
import { PageHeader } from "@/components/ui";

interface Props {
  pending: MarketplacePurchase[];
  history: MarketplacePurchase[];
  items: (MarketplaceItem & { isActive: boolean })[];
  ledger: LedgerEntry[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Solo purchase approval card ──────────────────────────────────────────────

function PurchaseCard({ purchase, onAction }: { purchase: MarketplacePurchase; onAction: (id: string) => void }) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [skippableTasks, setSkippableTasks] = useState<SkippableTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const isSkipTask = purchase.item.id === "skip-task";
  const isDayOff = purchase.item.id === "school-day-off";
  const needsPicker = isSkipTask || isDayOff;

  const handleApproveClick = () => {
    if (isSkipTask) {
      setLoadingTasks(true);
      startTransition(async () => {
        const tasks = await getStudentSkippableTasks(purchase.student.id);
        setSkippableTasks(tasks);
        setSelectedTaskId(tasks[0]?.id ?? "");
        setLoadingTasks(false);
        setShowTaskPicker(true);
      });
    } else if (isDayOff) {
      setShowDayPicker(true);
    } else {
      startTransition(async () => {
        const result = await approvePurchase(purchase.id, note || undefined);
        if (result.success) {
          setDone(true);
          onAction(purchase.id);
        } else setErr(result.error ?? "Failed");
      });
    }
  };

  const handleSkipTaskConfirm = () => {
    if (!selectedTaskId) {
      setErr("Please select a task");
      return;
    }
    startTransition(async () => {
      const result = await skipTaskAndApprove(selectedTaskId, purchase.id, note || undefined);
      if (result.success) {
        setDone(true);
        onAction(purchase.id);
      } else setErr(result.error ?? "Failed");
    });
  };

  const handleSkipDayConfirm = () => {
    if (!selectedDate) {
      setErr("Please select a date");
      return;
    }
    startTransition(async () => {
      const result = await skipDayAndApprove(purchase.student.id, selectedDate, purchase.id, note || undefined);
      if (result.success) {
        setDone(true);
        onAction(purchase.id);
      } else setErr(result.error ?? "Failed");
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectPurchase(purchase.id, note || undefined);
      if (result.success) {
        setDone(true);
        onAction(purchase.id);
      } else setErr(result.error ?? "Failed");
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
          {/* Student's note */}
          {purchase.note && (
            <div
              style={{
                fontSize: 12,
                color: "#C8A850",
                marginTop: 4,
                fontStyle: "italic",
                background: "rgba(232,168,32,0.06)",
                padding: "4px 8px",
                borderRadius: 4,
                display: "inline-block",
              }}
            >
              "{purchase.note}"
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
            <span className="cinzel" style={{ fontSize: 13, color: "#E8A820", fontWeight: 700 }}>
              {(purchase.contributionAmount ?? purchase.item.price).toLocaleString()} Cogs
            </span>
            <span style={{ fontSize: 11, color: "#506070" }}>Requested {formatDate(purchase.requestedAt)}</span>
          </div>
        </div>
      </div>

      {showTaskPicker && (
        <div
          style={{
            background: "rgba(232,168,32,0.06)",
            border: "1px solid rgba(232,168,32,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="cinzel" style={{ fontSize: 11, color: "#C8860A", letterSpacing: "0.1em" }}>
            SELECT TASK TO SKIP
          </div>
          {loadingTasks ? (
            <div style={{ fontSize: 12, color: "#506070" }}>Loading tasks…</div>
          ) : skippableTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: "#F08080" }}>No pending tasks found for {purchase.student.name}.</div>
          ) : (
            <select
              className="inp"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              style={{ fontSize: 13, padding: "6px 10px" }}
            >
              {skippableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.date} — {t.subjectName}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => setShowTaskPicker(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-brass"
              style={{ fontSize: 12, padding: "5px 16px" }}
              onClick={handleSkipTaskConfirm}
              disabled={!selectedTaskId}
            >
              ⚡ Skip This Task & Approve
            </button>
          </div>
        </div>
      )}

      {showDayPicker && (
        <div
          style={{
            background: "rgba(232,168,32,0.06)",
            border: "1px solid rgba(232,168,32,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="cinzel" style={{ fontSize: 11, color: "#C8860A", letterSpacing: "0.1em" }}>
            SELECT DAY OFF
          </div>
          <input
            type="date"
            className="inp"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ fontSize: 13, padding: "6px 10px", width: 180 }}
          />
          <div style={{ fontSize: 11, color: "#506070" }}>All pending tasks on this date will be cancelled.</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => setShowDayPicker(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-brass"
              style={{ fontSize: 12, padding: "5px 16px" }}
              onClick={handleSkipDayConfirm}
              disabled={!selectedDate}
            >
              📚 Grant Day Off & Approve
            </button>
          </div>
        </div>
      )}

      {!showTaskPicker && !showDayPicker && (
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
            onClick={handleApproveClick}
          >
            {loadingTasks ? "Loading…" : needsPicker ? "✓ Approve →" : "✓ Approve"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "6px 14px", color: "#F08080" }}
            onClick={handleReject}
          >
            ✕ Reject
          </button>
        </div>
      )}
      {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
    </div>
  );
}

// ── Shared group approval card ───────────────────────────────────────────────

function SharedGroupCard({
  group,
  onGroupAction,
}: {
  group: MarketplacePurchase[];
  onGroupAction: (ids: string[]) => void;
}) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const item = group[0].item;
  const totalContributed = group.reduce((s, p) => s + (p.contributionAmount ?? item.price), 0);
  const isComplete = group.length >= 2;

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveSharedGroup(
        group.map((p) => p.id),
        note || undefined,
      );
      if (result.success) {
        setDone(true);
        onGroupAction(group.map((p) => p.id));
      } else setErr(result.error ?? "Failed");
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectSharedGroup(
        group.map((p) => p.id),
        note || undefined,
      );
      if (result.success) {
        setDone(true);
        onGroupAction(group.map((p) => p.id));
      } else setErr(result.error ?? "Failed");
    });
  };

  if (done) return null;

  return (
    <div
      style={{
        background: "rgba(176,160,240,0.06)",
        border: "1px solid rgba(176,160,240,0.25)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{item.name}</span>
            <span
              style={{
                fontSize: 10,
                background: "rgba(176,160,240,0.15)",
                color: "#B0A0F0",
                padding: "2px 8px",
                borderRadius: 3,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              🤝 Shared
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#7A8B9C", marginTop: 2 }}>{item.description}</div>

          {/* Individual contributions */}
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {group.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: p.student.color, fontWeight: 600 }}>{p.student.name}</span>
                <span className="cinzel" style={{ fontSize: 12, color: "#E8A820" }}>
                  {(p.contributionAmount ?? item.price).toLocaleString()} Cogs
                </span>
                <span style={{ fontSize: 12, color: "#70E090" }}>✓</span>
                {p.note && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#C8A850",
                      fontStyle: "italic",
                      background: "rgba(232,168,32,0.06)",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    "{p.note}"
                  </span>
                )}
              </div>
            ))}
            {/* Placeholder for missing contributor */}
            {!isComplete && (
              <div style={{ fontSize: 12, color: "#506070", fontStyle: "italic" }}>Waiting for co-contributor…</div>
            )}
          </div>

          {/* Total */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span className="cinzel" style={{ fontSize: 13, color: "#E8A820", fontWeight: 700 }}>
              {totalContributed.toLocaleString()} / {item.price.toLocaleString()} Cogs
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isComplete ? "#70E090" : "#D4A830" }}>
              {isComplete ? "● Ready to approve" : "● Waiting on co-contributor"}
            </span>
          </div>
        </div>
      </div>

      {/* Note + action buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="inp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to students…"
          style={{ flex: 1, minWidth: 160, fontSize: 12, padding: "5px 10px" }}
        />
        <button
          type="button"
          className="btn-brass"
          style={{ fontSize: 12, padding: "6px 16px", opacity: isComplete ? 1 : 0.4 }}
          disabled={!isComplete}
          onClick={handleApprove}
        >
          ✓ Approve Group
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 12, padding: "6px 14px", color: "#F08080" }}
          onClick={handleReject}
        >
          ✕ Reject All
        </button>
      </div>
      {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
    </div>
  );
}

// ── Item editor row ──────────────────────────────────────────────────────────

const BLANK = {
  id: "",
  name: "",
  description: "",
  price: 100,
  emoji: "🎁",
  weeklyLimit: 1,
  isActive: true,
  shared: false,
};

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
  const [form, setForm] = useState({ ...item, shared: item.shared ?? false });
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
        background: "rgba(0,0,0,0.6)",
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>{item.name}</span>
              {item.shared && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#B0A0F0",
                    background: "rgba(176,160,240,0.12)",
                    padding: "1px 6px",
                    borderRadius: 3,
                  }}
                >
                  🤝 shared
                </span>
              )}
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
            {item.price.toLocaleString()} Cogs{item.shared ? " total" : ""}
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
              placeholder="Cogs"
            />
          </div>
          <input
            className="inp"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px" }}
            placeholder="Description shown to students"
          />
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
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
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#B0A0F0",
                cursor: "pointer",
              }}
            >
              <input type="checkbox" checked={form.shared} onChange={(e) => set("shared", e.target.checked)} />🤝 Shared
              item (both students split the cost)
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
          {form.shared && (
            <div
              style={{
                fontSize: 11,
                color: "#B0A0F0",
                background: "rgba(176,160,240,0.06)",
                padding: "6px 10px",
                borderRadius: 6,
              }}
            >
              Each student contributes {Math.ceil(form.price / 2).toLocaleString()} Cogs toward this item's{" "}
              {form.price.toLocaleString()} Cog total.
            </div>
          )}
          {err && <div style={{ fontSize: 11, color: "#F08080" }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

// ── Add new item form ────────────────────────────────────────────────────────

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
            placeholder="Cogs"
          />
        </div>
        <input
          className="inp"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          style={{ fontSize: 12, padding: "5px 10px" }}
          placeholder="Description shown to students"
        />
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#B0A0F0", cursor: "pointer" }}
          >
            <input type="checkbox" checked={form.shared} onChange={(e) => set("shared", e.target.checked)} />🤝 Shared
            item (both students split the cost)
          </label>
        </div>
        {form.shared && (
          <div
            style={{
              fontSize: 11,
              color: "#B0A0F0",
              background: "rgba(176,160,240,0.06)",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            Each student contributes {Math.ceil(form.price / 2).toLocaleString()} Cogs toward this item's{" "}
            {form.price.toLocaleString()} Cog total.
          </div>
        )}
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

// ── Main client ──────────────────────────────────────────────────────────────

const LEDGER_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  task_submit: { label: "Task Submitted", icon: "⚙️" },
  task_approve: { label: "Approved", icon: "✅" },
  daily_submit_bonus: { label: "Daily Submit Bonus", icon: "🌟" },
  daily_approve_bonus: { label: "Daily Approve Bonus", icon: "🏆" },
  weekly_complete: { label: "Week Complete", icon: "📅" },
  weekly_grade_a: { label: "A Average Bonus", icon: "🎓" },
  weekly_grade_b: { label: "B Average Bonus", icon: "📚" },
  weekly_perfect: { label: "Perfect Week", icon: "💎" },
  streak_milestone: { label: "Streak Milestone", icon: "🔥" },
  marketplace_purchase: { label: "Shop Purchase", icon: "🛒" },
};

function formatLedgerTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatLedgerDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ShopAdminClient({ pending: initialPending, history, items: initialItems, ledger }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<"pending" | "history" | "items" | "ledger">("items");

  // Ledger: student filter
  const studentNames = Array.from(new Set(ledger.map((e) => e.studentName))).sort();
  const [ledgerFilter, setLedgerFilter] = useState<string>("All");

  // Compute running balance per student (ascending order)
  const sortedAsc = [...ledger].sort((a, b) => a.earned_at.localeCompare(b.earned_at));
  const perStudentRunning: Record<string, Record<string, number>> = {};
  const perStudentCumulative: Record<string, number> = {};
  for (const entry of sortedAsc) {
    if (!perStudentRunning[entry.student_id]) perStudentRunning[entry.student_id] = {};
    if (perStudentCumulative[entry.student_id] === undefined) perStudentCumulative[entry.student_id] = 0;
    perStudentCumulative[entry.student_id] += entry.points;
    perStudentRunning[entry.student_id][entry.id] = perStudentCumulative[entry.student_id];
  }

  const filteredLedger = ledgerFilter === "All" ? ledger : ledger.filter((e) => e.studentName === ledgerFilter);

  // Group filtered ledger by day (newest first, already sorted desc)
  const ledgerByDay: Record<string, LedgerEntry[]> = {};
  for (const e of filteredLedger) {
    const day = new Date(e.earned_at).toLocaleDateString("en-CA");
    if (!ledgerByDay[day]) ledgerByDay[day] = [];
    ledgerByDay[day].push(e);
  }
  const ledgerDays = Object.keys(ledgerByDay).sort((a, b) => b.localeCompare(a));

  const handleAction = (id: string) => setPending((prev) => prev.filter((p) => p.id !== id));
  const handleGroupAction = (ids: string[]) => setPending((prev) => prev.filter((p) => !ids.includes(p.id)));
  const handleSaved = (updated: MarketplaceItem & { isActive: boolean }) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  const handleDeleted = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const handleAdded = (item: MarketplaceItem & { isActive: boolean }) => setItems((prev) => [...prev, item]);

  const statusColor = (s: string) => (s === "approved" ? "#70E090" : s === "rejected" ? "#F08080" : "#D4A830");

  // Split pending into shared groups and solo
  const sharedPending = pending.filter((p) => p.item.shared);
  const soloPending = pending.filter((p) => !p.item.shared);

  // Group shared by itemId
  const sharedGroups: Record<string, MarketplacePurchase[]> = {};
  for (const p of sharedPending) {
    if (!sharedGroups[p.itemId]) sharedGroups[p.itemId] = [];
    sharedGroups[p.itemId].push(p);
  }
  const sharedGroupList = Object.values(sharedGroups);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        icon="coin"
        title="Shop"
        sub={pending.length > 0 ? `${pending.length} pending approval` : "Manage items & approve requests"}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["items", "pending", "history", "ledger"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "btn-brass" : "btn-ghost"}
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => setTab(t)}
          >
            {t === "items"
              ? "Manage Items"
              : t === "pending"
                ? `Pending${pending.length > 0 ? ` (${pending.length})` : ""}`
                : t === "history"
                  ? "History"
                  : "Ledger"}
          </button>
        ))}
      </div>

      {/* ── Pending tab ── */}
      {tab === "pending" &&
        (pending.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No pending requests.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Shared groups first */}
            {sharedGroupList.map((group) => (
              <SharedGroupCard key={group[0].itemId} group={group} onGroupAction={handleGroupAction} />
            ))}
            {/* Solo purchases */}
            {soloPending.map((p) => (
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

      {/* ── Ledger tab ── */}
      {tab === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingRight: 300 }}>
          {/* Student filter */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div className="cinzel" style={{ fontSize: 11, color: "#506070", letterSpacing: "0.08em" }}>
              FILTER:
            </div>
            {(["All", ...studentNames] as string[]).map((name) => (
              <button
                key={name}
                type="button"
                className={ledgerFilter === name ? "btn-brass" : "btn-ghost"}
                style={{ fontSize: 11, padding: "4px 12px" }}
                onClick={() => setLedgerFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {filteredLedger.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No ledger entries yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ledgerDays.map((day) => (
                <div key={day}>
                  <div
                    className="cinzel"
                    style={{ fontSize: 11, color: "#506070", letterSpacing: "0.1em", marginBottom: 6 }}
                  >
                    {formatLedgerDate(`${day}T12:00:00`)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {ledgerByDay[day].map((e) => {
                      const meta = LEDGER_CATEGORY_LABELS[e.category] ?? { label: e.category, icon: "⚙️" };
                      const runningBal = perStudentRunning[e.student_id]?.[e.id];
                      return (
                        <div
                          key={e.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "7px 12px",
                            borderRadius: 7,
                            background: "rgba(0,0,0,0.45)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {/* Student color dot */}
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: e.studentColor,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, color: "#EEE4CC" }}>{meta.label}</span>
                              <span style={{ fontSize: 11, color: e.studentColor, fontWeight: 600 }}>
                                {e.studentName}
                              </span>
                              {e.note && (
                                <span style={{ fontSize: 11, color: "#506070", fontStyle: "italic" }}>{e.note}</span>
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 1,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              className="cinzel"
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: e.points > 0 ? "#E8A820" : "#F08080",
                              }}
                            >
                              {e.points > 0 ? "+" : ""}
                              {e.points}
                            </span>
                            {runningBal !== undefined && (
                              <span style={{ fontSize: 10, color: "#506070" }}>bal: {runningBal.toLocaleString()}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#404858", flexShrink: 0, marginLeft: 4 }}>
                            {formatLedgerTime(e.earned_at)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: "#EEE4CC" }}>{p.item.name}</span>
                    <span style={{ fontSize: 12, color: p.student.color }}>{p.student.name}</span>
                    {p.item.shared && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#B0A0F0",
                          background: "rgba(176,160,240,0.1)",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        🤝
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#506070", marginTop: 2 }}>
                    {formatDate(p.requestedAt)}
                    {p.note && <span style={{ color: "#C8A850", fontStyle: "italic" }}> · "{p.note}"</span>}
                    {p.adminNote && <span> · {p.adminNote}</span>}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}
                >
                  <span className="cinzel" style={{ fontSize: 12, color: "#C8860A" }}>
                    {(p.contributionAmount ?? p.item.price).toLocaleString()} Cogs
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
