"use client";

import { useRef, useState, useTransition } from "react";
import { saveBgColor } from "@/app/actions/customize";
import {
  changeOwnPassword,
  saveHouseholdIcalUrl,
  setStudentEmail,
  setStudentPassword,
  updateAvatarUrl,
  updateProfile,
  uploadAvatar,
} from "@/app/actions/profiles";
import { HexPicker, Icon, PageHeader } from "@/components/ui";
import { gradeLabel, rgba } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import type { AdminProfileData, ProfileData } from "./page";

interface Props {
  profiles: ProfileData[];
  adminProfile: AdminProfileData;
}

const labelStyle = {
  fontSize: 13,
  color: "#506070",
  marginBottom: 4,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

export function ProfilesClient({ profiles: initialProfiles, adminProfile: initialAdmin }: Props) {
  const { setBgColor } = useTheme();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [activeId, setActiveId] = useState(initialProfiles[0]?.id ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Student email state
  const [newEmail, setNewEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEmailPending, startEmailTransition] = useTransition();

  // Student password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [isPwPending, startPwTransition] = useTransition();

  // Admin profile state
  const [admin, setAdmin] = useState(initialAdmin);
  const [adminSaved, setAdminSaved] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminUploading, setAdminUploading] = useState(false);
  const [isAdminPending, startAdminTransition] = useTransition();
  const adminFileRef = useRef<HTMLInputElement>(null);

  // Admin password state
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPwSaved, setAdminPwSaved] = useState(false);
  const [adminPwError, setAdminPwError] = useState<string | null>(null);
  const [isAdminPwPending, startAdminPwTransition] = useTransition();

  // iCal state
  const [icalUrl, setIcalUrl] = useState(initialAdmin.icalUrl);
  const [icalSaved, setIcalSaved] = useState(false);
  const [icalError, setIcalError] = useState<string | null>(null);
  const [isIcalPending, startIcalTransition] = useTransition();

  // Admin bg color state
  const [adminBgColor, setAdminBgColor] = useState(initialAdmin.bgColor);
  const [bgSaved, setBgSaved] = useState(false);
  const bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdminBgColorChange = (newBg: string) => {
    setAdminBgColor(newBg);
    setBgColor(newBg);
    setBgSaved(false);
    if (bgTimer.current) clearTimeout(bgTimer.current);
    bgTimer.current = setTimeout(async () => {
      await saveBgColor(newBg);
      setBgSaved(true);
      setTimeout(() => setBgSaved(false), 2500);
    }, 600);
  };

  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0];

  if (!profile) {
    return <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No student profiles found.</div>;
  }

  const handleSetEmail = () => {
    setEmailError(null);
    setEmailSaved(false);
    startEmailTransition(async () => {
      const result = await setStudentEmail(profile.id, newEmail);
      if (result.error) {
        setEmailError(result.error);
      } else {
        setEmailSaved(true);
        setNewEmail("");
        setTimeout(() => setEmailSaved(false), 3000);
      }
    });
  };

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

  const handleIcalSave = () => {
    setIcalError(null);
    setIcalSaved(false);
    startIcalTransition(async () => {
      const result = await saveHouseholdIcalUrl(icalUrl);
      if (result.error) {
        setIcalError(result.error);
      } else {
        setIcalSaved(true);
        setTimeout(() => setIcalSaved(false), 3000);
      }
    });
  };

  const handleAdminPassword = () => {
    setAdminPwError(null);
    setAdminPwSaved(false);
    startAdminPwTransition(async () => {
      const result = await changeOwnPassword(adminPassword);
      if (result.error) {
        setAdminPwError(result.error);
      } else {
        setAdminPwSaved(true);
        setAdminPassword("");
        setTimeout(() => setAdminPwSaved(false), 3000);
      }
    });
  };

  const handleAdminSave = () => {
    setAdminError(null);
    setAdminSaved(false);
    startAdminTransition(async () => {
      const result = await updateProfile({
        id: admin.id,
        displayName: admin.displayName,
        tagline: admin.tagline,
        avatarUrl: admin.avatarUrl,
      });
      if (result.error) {
        setAdminError(result.error);
      } else {
        setAdminSaved(true);
        setTimeout(() => setAdminSaved(false), 3000);
      }
    });
  };

  const handleAdminAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setAdmin((prev) => ({ ...prev, avatarUrl: localUrl }));
    setAdminUploading(true);
    setAdminError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentKey", `admin-${admin.id}`);
      const { url, error: uploadErr } = await uploadAvatar(formData);
      if (uploadErr || !url) {
        setAdminError(uploadErr ?? "Upload failed");
        setAdmin((prev) => ({ ...prev, avatarUrl: initialAdmin.avatarUrl }));
      } else {
        const { error: saveErr } = await updateAvatarUrl(admin.id, url);
        if (saveErr) {
          setAdminError(saveErr);
          setAdmin((prev) => ({ ...prev, avatarUrl: initialAdmin.avatarUrl }));
        } else {
          setAdmin((prev) => ({ ...prev, avatarUrl: url }));
          setAdminSaved(true);
          setTimeout(() => setAdminSaved(false), 3000);
        }
      }
    } finally {
      setAdminUploading(false);
      if (adminFileRef.current) adminFileRef.current.value = "";
    }
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
        const { error: saveErr } = await updateAvatarUrl(profile.id, url);
        if (saveErr) {
          setError(saveErr);
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === profile.id
                ? { ...p, avatarUrl: initialProfiles.find((ip) => ip.id === p.id)?.avatarUrl ?? null }
                : p,
            ),
          );
        } else {
          setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, avatarUrl: url } : p)));
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }
      }
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fallbackAvatar = `/assets/profile-${profile.studentKey || "deven"}.png`;
  const avatarSrc = profile.avatarUrl ?? fallbackAvatar;

  const adminAvatarSrc = admin.avatarUrl ?? "/assets/icon-profile.png";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <PageHeader icon="profile" title="Profiles" sub="Manage admin and student accounts" />

      {/* ── Admin Profile ─────────────────────────────────────────────────── */}
      <div>
        <div
          className="cinzel brass"
          style={{ fontSize: 11, letterSpacing: "0.12em", marginBottom: 10, paddingLeft: 2 }}
        >
          MY PROFILE
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 14, alignItems: "start" }}>
          {/* Photo */}
          <div
            className="glass-warm"
            style={{ padding: 16, borderColor: "rgba(232,168,32,0.32)", textAlign: "center" }}
          >
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em", marginBottom: 12 }}>
              PROFILE PHOTO
            </div>
            <button
              type="button"
              style={{
                position: "relative",
                width: "85%",
                margin: "0 auto",
                lineHeight: 0,
                cursor: "pointer",
                padding: 0,
                border: "none",
                background: "none",
                display: "block",
              }}
              onClick={() => adminFileRef.current?.click()}
            >
              {/* biome-ignore lint/performance/noImgElement: dynamic Supabase URL */}
              <img
                src={adminAvatarSrc}
                alt={admin.displayName}
                onError={(e) => {
                  e.currentTarget.src = "/assets/icon-profile.png";
                }}
                style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  objectFit: "cover",
                  objectPosition: "top",
                  display: "block",
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: adminUploading ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
                  transition: "background 0.2s",
                  fontSize: 12,
                  color: adminUploading ? "#E8C870" : "transparent",
                  fontWeight: 600,
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => {
                  if (!adminUploading) {
                    e.currentTarget.style.background = "rgba(0,0,0,0.55)";
                    e.currentTarget.style.color = "#E8C870";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!adminUploading) {
                    e.currentTarget.style.background = "rgba(0,0,0,0)";
                    e.currentTarget.style.color = "transparent";
                  }
                }}
              >
                {adminUploading ? "Uploading…" : "Change Photo"}
              </div>
            </button>
            <input
              ref={adminFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAdminAvatarChange}
            />
            <div style={{ fontSize: 11, color: "#404858", marginTop: 8, lineHeight: 1.5 }}>Click photo to upload</div>
          </div>

          {/* Identity */}
          <div className="glass-warm" style={{ padding: 18, borderColor: "rgba(232,168,32,0.32)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em" }}>
                IDENTITY
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {adminSaved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
                {adminError && <span style={{ fontSize: 12, color: "#F08080" }}>{adminError}</span>}
                <button
                  type="button"
                  className="btn-brass"
                  style={{ padding: "7px 16px", fontSize: 13 }}
                  onClick={handleAdminSave}
                  disabled={isAdminPending}
                >
                  {isAdminPending ? "Saving…" : "Save Name & Tagline"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={labelStyle}>Display Name</div>
                <input
                  className="inp"
                  value={admin.displayName}
                  onChange={(e) => setAdmin((p) => ({ ...p, displayName: e.target.value }))}
                />
              </div>
              <div>
                <div style={labelStyle}>Title / Tagline</div>
                <input
                  className="inp"
                  value={admin.tagline}
                  onChange={(e) => setAdmin((p) => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Operations Engineer"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="glass-warm" style={{ padding: 18, borderColor: "rgba(232,168,32,0.32)" }}>
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em", marginBottom: 14 }}>
              PASSWORD
            </div>
            <div>
              <div style={labelStyle}>Set New Password</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    className="inp"
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="New password…"
                    style={{ paddingRight: 34, width: "100%", boxSizing: "border-box" }}
                    onKeyDown={(e) => e.key === "Enter" && adminPassword.length >= 6 && handleAdminPassword()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#506070",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    {showAdminPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-brass"
                  style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={handleAdminPassword}
                  disabled={isAdminPwPending || adminPassword.length < 6}
                >
                  {isAdminPwPending ? "…" : "Set"}
                </button>
              </div>
              {adminPwError && <div style={{ fontSize: 12, color: "#F08080", marginTop: 4 }}>{adminPwError}</div>}
              {adminPwSaved && (
                <div style={{ fontSize: 12, color: "#70E090", marginTop: 4, fontWeight: 600 }}>✓ Password updated</div>
              )}
              <div style={{ fontSize: 11, color: "#404858", marginTop: 4 }}>
                Min 6 characters · takes effect immediately
              </div>
            </div>
          </div>

          {/* Background color — spans all 3 columns */}
          <div
            className="glass-warm"
            style={{ padding: 18, borderColor: "rgba(232,168,32,0.32)", gridColumn: "1 / -1" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em" }}>
                WORLD BACKGROUND COLOR
              </div>
              {bgSaved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
            </div>
            <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 14, lineHeight: 1.6 }}>
              Tint the Academy&apos;s atmosphere. The steampunk details stay fixed — only the ambient color shifts.
            </div>
            <HexPicker value={adminBgColor} onChange={handleAdminBgColorChange} label="Hue Tint" />
            <div style={{ marginTop: 10, fontSize: 12, color: "#404858", lineHeight: 1.6 }}>
              Try deep blues (#1A3A5C), forest greens (#1A3A28), or warm ambers (#3A2010).
            </div>
          </div>
        </div>
      </div>

      {/* ── Calendar Feed ─────────────────────────────────────────────────── */}
      <div>
        <div className="glass-warm" style={{ padding: 18, borderColor: "rgba(232,168,32,0.32)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em" }}>
              CALENDAR FEED (iCal)
            </div>
            {icalSaved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
            {icalError && <span style={{ fontSize: 12, color: "#F08080" }}>{icalError}</span>}
          </div>
          <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 12, lineHeight: 1.6 }}>
            Paste a webcal:// or https:// iCal URL to show your family calendar in the Schedule and Today views. Apple
            Calendar: share any calendar → copy the webcal link.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="inp"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://p00-caldav.icloud.com/published/2/..."
              style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}
            />
            <button
              type="button"
              className="btn-brass"
              style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}
              onClick={handleIcalSave}
              disabled={isIcalPending}
            >
              {isIcalPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Student Profiles ──────────────────────────────────────────────── */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <div className="cinzel brass" style={{ fontSize: 11, letterSpacing: "0.12em", paddingLeft: 2 }}>
            STUDENT PROFILES
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
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px" }}
            >
              {/* biome-ignore lint/performance/noImgElement: dynamic Supabase URL */}
              <img
                src={p.avatarUrl ?? `/assets/profile-${p.studentKey || "deven"}.png`}
                alt={p.displayName}
                onError={(e) => {
                  e.currentTarget.src = `/assets/profile-${p.studentKey || "deven"}.png`;
                }}
                style={{ width: 24, height: 24, borderRadius: 3, objectFit: "cover", objectPosition: "top" }}
              />
              {p.displayName}
            </button>
          ))}
        </div>

        {/* Top row: Photo + 2 editing panels */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 14, alignItems: "start" }}>
          {/* Photo */}
          <div
            className="glass-warm"
            style={{ padding: 16, borderColor: rgba(profile.color, 0.32), textAlign: "center" }}
          >
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em", marginBottom: 12 }}>
              PROFILE PHOTO
            </div>
            <button
              type="button"
              style={{
                position: "relative",
                width: "85%",
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
              {/* biome-ignore lint/performance/noImgElement: dynamic Supabase URL */}
              <img
                src={avatarSrc}
                alt={profile.displayName}
                onError={(e) => {
                  e.currentTarget.src = fallbackAvatar;
                }}
                style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  objectFit: "cover",
                  objectPosition: "top",
                  display: "block",
                  borderRadius: 6,
                }}
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
                  fontSize: 12,
                  color: uploading ? "#E8C870" : "transparent",
                  fontWeight: 600,
                  borderRadius: 6,
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <div style={{ fontSize: 11, color: "#404858", marginTop: 8, lineHeight: 1.5 }}>Click photo to upload</div>
          </div>

          {/* Identity */}
          <div className="glass-warm" style={{ padding: 18, borderColor: rgba(profile.color, 0.32) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em" }}>
                IDENTITY
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {saved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
                {error && <span style={{ fontSize: 12, color: "#F08080" }}>{error}</span>}
                <button
                  type="button"
                  className="btn-brass"
                  style={{ padding: "7px 16px", fontSize: 13 }}
                  onClick={handleSave}
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Save Name & Tagline"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={labelStyle}>Display Name</div>
                <input
                  className="inp"
                  value={profile.displayName}
                  onChange={(e) => upd("displayName", e.target.value)}
                />
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
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 13,
                    color: "#9AABBC",
                  }}
                >
                  {gradeLabel(profile.currentGrade)}
                  {profile.yearLabel && <span style={{ color: "#506070", marginLeft: 8 }}>· {profile.yearLabel}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#404858", marginTop: 4 }}>
                  Auto-advances on the 2nd Monday of August
                </div>
              </div>
            </div>
          </div>

          {/* Login & Access */}
          <div className="glass-warm" style={{ padding: 18, borderColor: rgba(profile.color, 0.32) }}>
            <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.1em", marginBottom: 14 }}>
              LOGIN & ACCESS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={labelStyle}>Email</div>
                <div style={{ fontSize: 12, color: "#506070", fontFamily: "monospace", marginBottom: 6 }}>
                  {profile.email || "—"}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="inp"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address…"
                    style={{ flex: 1, fontSize: 13 }}
                    onKeyDown={(e) => e.key === "Enter" && newEmail.includes("@") && handleSetEmail()}
                  />
                  <button
                    type="button"
                    className="btn-brass"
                    style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                    onClick={handleSetEmail}
                    disabled={isEmailPending || !newEmail.includes("@")}
                  >
                    {isEmailPending ? "…" : "Set"}
                  </button>
                </div>
                {emailError && <div style={{ fontSize: 12, color: "#F08080", marginTop: 4 }}>{emailError}</div>}
                {emailSaved && (
                  <div style={{ fontSize: 12, color: "#70E090", marginTop: 4, fontWeight: 600 }}>✓ Email updated</div>
                )}
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
                      placeholder="New password…"
                      style={{ paddingRight: 34, width: "100%", boxSizing: "border-box" }}
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
                        fontSize: 13,
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
                {pwError && <div style={{ fontSize: 12, color: "#F08080", marginTop: 4 }}>{pwError}</div>}
                {pwSaved && (
                  <div style={{ fontSize: 12, color: "#70E090", marginTop: 4, fontWeight: 600 }}>
                    ✓ Password updated
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#404858", marginTop: 4 }}>
                  Min 6 characters · takes effect immediately
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Subjects */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.08em", marginBottom: 14 }}>
            ENROLLED SUBJECTS ({profile.subjects.length})
          </div>
          {profile.subjects.length === 0 ? (
            <div style={{ fontSize: 13, color: "#404858", fontStyle: "italic" }}>No active subjects assigned.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {profile.subjects.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.25)",
                    border: `1px solid ${rgba(sub.color, 0.25)}`,
                  }}
                >
                  <Icon name={sub.icon} size={26} />
                  <div style={{ minWidth: 0 }}>
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
                    <div style={{ fontSize: 11, color: "#506070", marginTop: 2 }}>{sub.days.join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
