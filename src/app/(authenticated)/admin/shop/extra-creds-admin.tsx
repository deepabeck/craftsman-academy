"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { ExtraCredsClaim, ExtraCredsTask, RepeatRule } from "@/app/actions/extra-creds";
import {
  approveExtraClaim,
  deleteExtraCredsTask,
  rejectExtraClaim,
  saveExtraCredsTask,
} from "@/app/actions/extra-creds";
import { Icon } from "@/components/ui";
import { computeSplit } from "@/lib/extra-creds";

const ROOM_ICONS = [
  "media-room",
  "game-room",
  "playroom",
  "living-room",
  "bedroom",
  "bathroom",
  "kitchen",
  "mudroom",
  "garage",
  "yard",
];

const TASK_ICONS = [
  "tidy",
  "laundry",
  "dishes",
  "sweep",
  "trash",
  "windows",
  "organize",
  "car-wash",
  "pets",
  "groceries",
  "cooking",
  "outdoors",
];

const REPEAT_LABEL: Record<RepeatRule, string> = {
  once: "One time only",
  daily: "Once a day",
  weekly: "Once a week",
  unlimited: "Any time",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CredsAmount({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Image src="/assets/icon_creds.png" alt="" width={size} height={size} />
      <span className="cinzel" style={{ fontSize: size, fontWeight: 700, color: "#E8A820" }}>
        {n.toLocaleString()}
      </span>
    </span>
  );
}

// ── Job editor ───────────────────────────────────────────────────────────────

type Draft = {
  id?: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  shareable: boolean;
  repeatRule: RepeatRule;
  isActive: boolean;
};

const BLANK: Draft = {
  title: "",
  description: "",
  icon: "tidy",
  reward: 20,
  shareable: true,
  repeatRule: "once",
  isActive: true,
};

function JobEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Draft;
  onCancel: () => void;
  onSaved: (task: ExtraCredsTask) => void;
}) {
  const [form, setForm] = useState<Draft>(initial);
  const [err, setErr] = useState("");
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setErr("");
    startTransition(async () => {
      const res = await saveExtraCredsTask(form);
      if (!res.success || !res.id) {
        setErr(res.error ?? "Could not save");
        return;
      }
      onSaved({ ...form, id: res.id, sortOrder: 0 });
    });
  };

  return (
    <div
      style={{
        background: "rgba(8, 17, 30, 0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(232,168,32,0.3)",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <input
        className="inp"
        placeholder="Job name, e.g. Tidy the game room"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
      />
      <textarea
        className="inp"
        placeholder="What counts as done? (kids see this)"
        value={form.description}
        rows={2}
        onChange={(e) => set("description", e.target.value)}
        style={{ resize: "vertical" }}
      />
      <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2" }}>ROOMS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ROOM_ICONS.map((ic) => (
          <button
            key={ic}
            type="button"
            aria-label={ic}
            title={ic.replace(/-/g, " ")}
            onClick={() => set("icon", ic)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: form.icon === ic ? "rgba(232,168,32,0.18)" : "rgba(255,255,255,0.04)",
              border: form.icon === ic ? "1px solid #E8A820" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Icon name={ic} size={24} />
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2" }}>TASKS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TASK_ICONS.map((ic) => (
          <button
            key={ic}
            type="button"
            aria-label={ic}
            onClick={() => set("icon", ic)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: form.icon === ic ? "rgba(232,168,32,0.18)" : "rgba(255,255,255,0.04)",
              border: form.icon === ic ? "1px solid #E8A820" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Icon name={ic} size={24} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#8A9BB2", display: "flex", alignItems: "center", gap: 6 }}>
          Total Creds
          <input
            className="inp"
            type="number"
            min={1}
            value={form.reward}
            onChange={(e) => set("reward", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            style={{ width: 90 }}
          />
        </label>
        <label style={{ fontSize: 12, color: "#8A9BB2", display: "flex", alignItems: "center", gap: 6 }}>
          Repeat
          <select
            className="inp"
            value={form.repeatRule}
            onChange={(e) => set("repeatRule", e.target.value as RepeatRule)}
          >
            {(Object.keys(REPEAT_LABEL) as RepeatRule[]).map((r) => (
              <option key={r} value={r}>
                {REPEAT_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "#C9D5E4", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={form.shareable} onChange={(e) => set("shareable", e.target.checked)} />
          Can be shared (reward splits)
        </label>
        <label style={{ fontSize: 12, color: "#C9D5E4", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Visible to kids
        </label>
      </div>
      {err && <div style={{ fontSize: 12, color: "#F08080" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-brass"
          style={{ fontSize: 12, padding: "6px 18px", flex: 1 }}
          disabled={pending}
          onClick={save}
        >
          {pending ? "Saving…" : "Save job"}
        </button>
      </div>
    </div>
  );
}

export function ExtraCredsJobsPanel({ initialTasks }: { initialTasks: ExtraCredsTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const upsert = (t: ExtraCredsTask) => {
    setTasks((prev) => (prev.some((p) => p.id === t.id) ? prev.map((p) => (p.id === t.id ? t : p)) : [...prev, t]));
    setEditing(null);
  };

  const remove = (t: ExtraCredsTask) => {
    if (!confirm(`Remove "${t.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteExtraCredsTask(t.id);
      if (!res.success) {
        setErr(res.error ?? "Failed");
        return;
      }
      if (res.hidden) setTasks((prev) => prev.map((p) => (p.id === t.id ? { ...p, isActive: false } : p)));
      else setTasks((prev) => prev.filter((p) => p.id !== t.id));
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
      {tasks.length === 0 && editing !== "new" && (
        <div style={{ color: "#506070", fontSize: 13, padding: "8px 2px" }}>
          No extra jobs yet. Add one and the kids will see it under Extra Creds in their Shop.
        </div>
      )}
      {tasks.map((t) =>
        editing === t.id ? (
          <JobEditor
            key={t.id}
            initial={{
              id: t.id,
              title: t.title,
              description: t.description,
              icon: t.icon,
              reward: t.reward,
              shareable: t.shareable,
              repeatRule: t.repeatRule,
              isActive: t.isActive,
            }}
            onCancel={() => setEditing(null)}
            onSaved={upsert}
          />
        ) : (
          <div
            key={t.id}
            style={{
              background: "rgba(8, 17, 30, 0.88)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: t.isActive ? 1 : 0.8,
            }}
          >
            <Icon name={t.icon} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EEE4CC" }}>
                {t.title}
                {!t.isActive && <span style={{ fontSize: 11, color: "#7F8FA3", marginLeft: 8 }}>hidden</span>}
              </div>
              <div style={{ fontSize: 11, color: "#7A8B9C", marginTop: 2 }}>
                {REPEAT_LABEL[t.repeatRule]} · {t.shareable ? "Can be shared" : "Solo only"}
              </div>
            </div>
            <CredsAmount n={t.reward} />
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => setEditing(t.id)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => remove(t)}
            >
              ✕
            </button>
          </div>
        ),
      )}
      {err && <div style={{ fontSize: 12, color: "#F08080" }}>{err}</div>}
      {editing === "new" ? (
        <JobEditor initial={BLANK} onCancel={() => setEditing(null)} onSaved={upsert} />
      ) : (
        <button
          type="button"
          className="btn-brass"
          style={{ fontSize: 12, padding: "8px 16px", alignSelf: "flex-start" }}
          onClick={() => setEditing("new")}
        >
          + Add an extra job
        </button>
      )}
    </div>
  );
}

// ── Claim review ─────────────────────────────────────────────────────────────

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2", marginBottom: 4 }}>{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {/* biome-ignore lint/performance/noImgElement: short-lived signed URL */}
          <img
            src={url}
            alt={label}
            style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6, display: "block" }}
          />
        </a>
      ) : (
        <div style={{ fontSize: 12, color: "#F08080" }}>Photo unavailable</div>
      )}
    </div>
  );
}

function ClaimCard({ claim, onDone }: { claim: ExtraCredsClaim; onDone: (id: string) => void }) {
  const ids = claim.participants.map((p) => p.id);
  const split = computeSplit(claim.reward, ids, claim.submittedBy);
  const [amounts, setAmounts] = useState<Record<string, number>>(split);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();

  const total = ids.reduce((s, id) => s + (amounts[id] ?? 0), 0);
  const overridden = ids.some((id) => amounts[id] !== split[id]);

  const act = (kind: "approve" | "reject") => {
    setErr("");
    startTransition(async () => {
      const res =
        kind === "approve" ? await approveExtraClaim(claim.id, amounts, note) : await rejectExtraClaim(claim.id, note);
      if (res.success) onDone(claim.id);
      else setErr(res.error ?? "Failed");
    });
  };

  return (
    <div
      style={{
        background: "rgba(8, 17, 30, 0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(212,168,48,0.3)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name={claim.taskIcon} size={28} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{claim.taskTitle}</div>
          <div style={{ fontSize: 11, color: "#7A8B9C" }}>{formatWhen(claim.submittedAt)}</div>
        </div>
        <CredsAmount n={claim.reward} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Photo url={claim.beforeUrl} label="BEFORE" />
        <Photo url={claim.afterUrl} label="AFTER" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2" }}>
          {ids.length > 1 ? "SHARED — EQUAL SPLIT (EDIT TO OVERRIDE)" : "DONE SOLO"}
        </div>
        {claim.participants.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
            <input
              className="inp"
              type="number"
              min={0}
              value={amounts[p.id] ?? 0}
              onChange={(e) =>
                setAmounts((a) => ({ ...a, [p.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
              }
              style={{ width: 90, fontSize: 13, padding: "5px 8px" }}
            />
            <span style={{ fontSize: 11, color: "#7A8B9C" }}>Creds</span>
          </div>
        ))}
        {(overridden || total !== claim.reward) && (
          <div style={{ fontSize: 11, color: total > claim.reward ? "#F0B060" : "#7A8B9C" }}>
            Paying {total} of {claim.reward}.{" "}
            <button
              type="button"
              onClick={() => setAmounts(split)}
              style={{
                background: "none",
                border: "none",
                color: "#E8A820",
                cursor: "pointer",
                padding: 0,
                fontSize: 11,
              }}
            >
              Reset to equal split
            </button>
          </div>
        )}
      </div>

      <input
        className="inp"
        placeholder="Note to the kids (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ fontSize: 12, padding: "6px 10px" }}
      />
      {err && <div style={{ fontSize: 12, color: "#F08080" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 12, padding: "6px 14px" }}
          disabled={busy}
          onClick={() => act("reject")}
        >
          Not yet
        </button>
        <button
          type="button"
          className="btn-brass"
          style={{ fontSize: 12, padding: "6px 18px", flex: 1 }}
          disabled={busy}
          onClick={() => act("approve")}
        >
          {busy ? "Working…" : `Approve · pay ${total} Creds`}
        </button>
      </div>
    </div>
  );
}

export function ExtraCredsClaimsPanel({
  initialPending,
  history,
}: {
  initialPending: ExtraCredsClaim[];
  history: ExtraCredsClaim[];
}) {
  const [pending, setPending] = useState(initialPending);
  const done = (id: string) => setPending((p) => p.filter((c) => c.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {pending.length === 0 ? (
        <div style={{ color: "#506070", fontSize: 13, padding: "8px 2px" }}>No extra jobs waiting for review.</div>
      ) : (
        pending.map((c) => <ClaimCard key={c.id} claim={c} onDone={done} />)
      )}

      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560, marginTop: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2" }}>RECENTLY REVIEWED</div>
          {history.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: "#C9D5E4",
                background: "rgba(8, 17, 30, 0.86)",
                backdropFilter: "blur(12px)",
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              <Icon name={c.taskIcon} size={18} />
              <span style={{ flex: 1 }}>
                {c.taskTitle} ·{" "}
                {c.participants
                  .map((p) => (c.status === "approved" ? `${p.name} +${p.amount ?? 0}` : p.name))
                  .join(", ")}
              </span>
              <span style={{ color: c.status === "approved" ? "#70E090" : "#F08080" }}>
                {c.status === "approved" ? "Approved" : "Not yet"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
