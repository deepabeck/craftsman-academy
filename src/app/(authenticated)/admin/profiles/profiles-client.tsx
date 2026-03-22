"use client";

import { useRef, useState, useTransition } from "react";
import { setStudentPassword, updateProfile, uploadAvatar } from "@/app/actions/profiles";
import { HexPicker, Icon, PageHeader } from "@/components/ui";
import { rgba } from "@/lib/utils";
import type { ProfileData } from "./page";

interface Props {
  profiles: ProfileData[];
}

const labelStyle = {
  fontSize: 13,
  color: "#506070",
  marginBottom: 4,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

export function ProfilesClient({ profiles: initialProfiles }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [activeId, setActiveId] = useState(initialProfiles[0]?.id ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [isPwPending, startPwTransition] = useTransition();

  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0];

  if (!profile) {
    return <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No student profiles found.</div>;
  }

  const handleSetPassword = () => {
    setPwError(null);
    setPwSaved(false);
    startPwTransition(async () => {
      const result = await setStudentPassword(profile.id, newPassword);
      if (result.error) {
        setPwError(result.error);
      } else {
        setPwSaved(true);
        setNewPassword("");
        setTimeout(() => setPwSaved(false), 3000);
      }
    });
  };

  const upd = (key: keyof ProfileData, value: string) => {
    setSaved(false);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, [key]: value } : p)));
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({
        id: profile.id,
        displayName: profile.displayName,
        tagline: profile.tagline,
        grade: profile.grade,
        color: profile.color,
        avatarUrl: profile.avatarUrl,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, avatarUrl: localUrl } : p)));

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentKey", profile.studentKey);
      const { url, error: uploadErr } = await uploadAvatar(formData);

      if (uploadErr || !url) {
        setError(uploadErr ?? "Upload failed");
        // Revert to original
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id
              ? { ...p, avatarUrl: initialProfiles.find((ip) => ip.id === p.id)?.avatarUrl ?? null }
              : p,
          ),
        );
      } else {
        // Update to the real Supabase URL and save to DB
        setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, avatarUrl: url } : p)));
        // Auto-save avatar_url to DB
        startTransition(async () => {
          await updateProfile({
            id: profile.id,
            displayName: profile.displayName,
            tagline: profile.tagline,
            grade: profile.grade,
            color: profile.color,
            avatarUrl: url,
          });
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const avatarSrc = profile.avatarUrl ?? `/assets/avatar-${profile.studentKey || "deven"}.png`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="profile" title="Student Profiles" sub="Manage student settings and photo" />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 13, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
          {error && <span style={{ fontSize: 13, color: "#F08080" }}>{error}</span>}
          <button
            type="button"
            className="btn-brass"
            style={{ padding: "9px 20px", fontSize: 14 }}
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Student tabs */}
      <div style={{ display: "flex", gap: 10 }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActiveId(p.id);
              setSaved(false);
              setError(null);
              setNewPassword("");
              setPwSaved(false);
              setPwError(null);
            }}
            className={p.id === activeId ? "btn-brass" : "btn-ghost"}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
          >
            {/* biome-ignore lint/performance/noImgElement: dynamic Supabase URL */}
            <img
              src={p.avatarUrl ?? `/assets/avatar-${p.studentKey || "deven"}.png`}
              alt={p.displayName}
              style={{ width: 22, height: 22, borderRadius: 3, objectFit: "cover", objectPosition: "top" }}
            />
            {p.displayName}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, alignItems: "start" }}>
        {/* Photo */}
        <div
          className="glass-warm"
          style={{ padding: 16, borderColor: rgba(profile.color, 0.32), textAlign: "center" }}
        >
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 12 }}>
            PROFILE PHOTO
          </div>
          {/* Avatar with hover-to-change overlay */}
          <button
            type="button"
            style={{
              position: "relative",
              width: "78%",
              margin: "0 auto",
              lineHeight: 0,
              cursor: "pointer",
              padding: 0,
              border: "none",
              background: "none",
              display: "block",
            }}
            onClick={() => fileRef.current?.click()}
          >
            {/* biome-ignore lint/performance/noImgElement: dynamic Supabase URL, next/image requires domain config */}
            <img
              src={avatarSrc}
              alt={profile.displayName}
              style={{ width: "100%", display: "block", borderRadius: 4 }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: uploading ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
                transition: "background 0.2s",
                fontSize: 13,
                color: uploading ? "#E8C870" : "transparent",
                fontWeight: 600,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = "rgba(0,0,0,0.55)";
                  e.currentTarget.style.color = "#E8C870";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = "rgba(0,0,0,0)";
                  e.currentTarget.style.color = "transparent";
                }
              }}
            >
              {uploading ? "Uploading…" : "Change Photo"}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          <div style={{ fontSize: 13, color: "#506070", marginTop: 8, lineHeight: 1.5 }}>
            Click photo to upload. Saves automatically.
          </div>
        </div>

        {/* Identity */}
        <div className="glass-warm" style={{ padding: 18, borderColor: rgba(profile.color, 0.32) }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 14 }}>
            IDENTITY
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={labelStyle}>Display Name</div>
              <input className="inp" value={profile.displayName} onChange={(e) => upd("displayName", e.target.value)} />
            </div>
            <div>
              <div style={labelStyle}>Tagline / Title</div>
              <input
                className="inp"
                value={profile.tagline}
                onChange={(e) => upd("tagline", e.target.value)}
                placeholder="e.g. Explorer of Systems"
              />
            </div>
            <div>
              <div style={labelStyle}>Grade</div>
              <input
                className="inp"
                value={profile.grade}
                onChange={(e) => upd("grade", e.target.value)}
                placeholder="e.g. 5th Grade"
              />
            </div>
          </div>
        </div>

        {/* Login & Access */}
        <div className="glass-warm" style={{ padding: 18, borderColor: rgba(profile.color, 0.32) }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 14 }}>
            LOGIN & ACCESS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={labelStyle}>Email</div>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 13,
                  color: "#6A7A8A",
                  fontFamily: "monospace",
                }}
              >
                {profile.studentKey === "deven"
                  ? process.env.NEXT_PUBLIC_DEVEN_EMAIL
                  : process.env.NEXT_PUBLIC_SHAAN_EMAIL}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Set New Password</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    className="inp"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password…"
                    style={{ paddingRight: 36, width: "100%", boxSizing: "border-box" }}
                    onKeyDown={(e) => e.key === "Enter" && newPassword.length >= 6 && handleSetPassword()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#506070",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-brass"
                  style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={handleSetPassword}
                  disabled={isPwPending || newPassword.length < 6}
                >
                  {isPwPending ? "…" : "Set"}
                </button>
              </div>
              {pwError && (
                <div style={{ fontSize: 12, color: "#F08080", marginTop: 4 }}>{pwError}</div>
              )}
              {pwSaved && (
                <div style={{ fontSize: 12, color: "#70E090", marginTop: 4, fontWeight: 600 }}>
                  ✓ Password updated
                </div>
              )}
              <div style={{ fontSize: 12, color: "#404858", marginTop: 5, lineHeight: 1.5 }}>
                Min 6 characters. Takes effect immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Accent Color */}
        <div className="glass-warm" style={{ padding: 18, borderColor: rgba(profile.color, 0.32) }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 14 }}>
            ACCENT COLOR
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: profile.color,
                boxShadow: `0 0 12px ${profile.color}`,
                border: "2px solid rgba(255,255,255,0.15)",
              }}
            />
            <div style={{ fontSize: 13, color: "#9AABBC" }}>Used on nav, cards, and progress bars</div>
          </div>
          <HexPicker value={profile.color} onChange={(c) => upd("color", c)} />
          <div style={{ marginTop: 14 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Preview</div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 7,
                background: rgba(profile.color, 0.12),
                border: `1px solid ${rgba(profile.color, 0.35)}`,
                fontSize: 13,
                color: profile.color,
                fontWeight: 600,
              }}
            >
              {profile.displayName} &mdash; {profile.grade || "Grade TBD"}
            </div>
          </div>
        </div>

        {/* Enrolled Subjects */}
        <div className="glass" style={{ padding: 16 }}>
          <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.08em", marginBottom: 12 }}>
            ENROLLED SUBJECTS ({profile.subjects.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {profile.subjects.length === 0 && (
              <div style={{ fontSize: 13, color: "#404858", fontStyle: "italic" }}>No active subjects assigned.</div>
            )}
            {profile.subjects.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${rgba(sub.color, 0.22)}`,
                }}
              >
                <Icon name={sub.icon} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#EEE4CC",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sub.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#506070", marginTop: 1 }}>{sub.days.join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
