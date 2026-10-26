"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Rivet } from "@/components/ui";
import { BASE_STUDENTS } from "@/lib/constants";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { LoginProfileData } from "./page";

// Email addresses must match what you created in Supabase Auth.
// Set these in your .env.local (or Vercel environment variables).
const PROFILES = [
  {
    id: "admin",
    email: process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "",
    color: "#C8860A",
    label: process.env.NEXT_PUBLIC_ADMIN_NAME ?? "Admin",
    sub: process.env.NEXT_PUBLIC_ADMIN_TAGLINE ?? "",
    img: "/assets/profile-admin.png",
  },
  {
    id: "student1",
    email: process.env.NEXT_PUBLIC_STUDENT1_EMAIL ?? "",
    color: BASE_STUDENTS.deven.color,
    label: process.env.NEXT_PUBLIC_STUDENT1_NAME ?? "Student 1",
    sub: process.env.NEXT_PUBLIC_STUDENT1_TAGLINE ?? "",
    img: BASE_STUDENTS.deven.avatar,
  },
  {
    id: "student2",
    email: process.env.NEXT_PUBLIC_STUDENT2_EMAIL ?? "",
    color: BASE_STUDENTS.shaan.color,
    label: process.env.NEXT_PUBLIC_STUDENT2_NAME ?? "Student 2",
    sub: process.env.NEXT_PUBLIC_STUDENT2_TAGLINE ?? "",
    img: BASE_STUDENTS.shaan.avatar,
  },
].filter((p) => p.email !== "");

interface Props {
  profileMap: Record<string, LoginProfileData>;
}

export function LoginClient({ profileMap }: Props) {
  const [who, setWho] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("loginPath", "/login");
  }, []);

  // Redirect once Supabase session is loaded and user profile is set
  useEffect(() => {
    if (user) {
      router.push(user.role === "admin" ? "/admin/dashboard" : "/student/today");
    }
  }, [user, router]);

  const attempt = async () => {
    if (!who) return;
    const profile = PROFILES.find((p) => p.id === who);
    if (!profile) return;

    localStorage.setItem("loginPath", "/login");
    setLoading(true);
    setErr("");
    const result = await signIn(profile.email, password);
    setLoading(false);

    if (!result.success) {
      setErr(result.error || "Incorrect password.");
      setPassword("");
    }
    // On success: onAuthStateChange in auth-provider sets user, useEffect above redirects
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        paddingTop: 0,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, marginTop: -30 }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-craftsmanacademy.png"
            alt="Craftsman Academy"
            style={{ width: 128, display: "block", margin: "0 auto" }}
          />
          <div
            className="cinzel brass"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1.1, marginTop: 8 }}
          >
            CRAFTSMAN
          </div>
          <div
            className="cinzel brass"
            style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.32em", marginTop: 3 }}
          >
            ACADEMY
          </div>
        </div>
        <div
          style={{
            position: "relative",
            borderRadius: 12,
            backgroundImage: "url('/assets/placard.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            border: "1px solid rgba(232,168,32,0.40)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,168,32,0.12)",
            aspectRatio: "1492/620",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "3% 7%",
          }}
        >
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <Rivet />
          </div>
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <Rivet />
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8 }}>
            <Rivet />
          </div>
          <div style={{ position: "absolute", bottom: 8, right: 8 }}>
            <Rivet />
          </div>

          {!who ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%" }}>
              {PROFILES.map((o) => {
                // Prefer the real uploaded photo (profiles.avatar_url) over the
                // static seed image baked into the bundle — otherwise a new
                // photo uploaded in Admin → Profiles never shows up here.
                const avatarSrc = profileMap[o.email]?.avatarUrl ?? o.img;
                return (
                  <div
                    key={o.id}
                    onClick={() => setWho(o.id)}
                    onKeyDown={(e) => e.key === "Enter" && setWho(o.id)}
                    role="button"
                    tabIndex={0}
                    style={{
                      cursor: "pointer",
                      textAlign: "center",
                      padding: "0 0 12px",
                      borderRadius: 10,
                      border: `1px solid ${rgba(o.color, 0.5)}`,
                      background: "rgba(10,16,28,0.72)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      transition: "all 0.2s",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(20,30,50,0.85)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(10,16,28,0.72)";
                    }}
                  >
                    {/*
                      Photo frame — fixed 170px tall.
                      The inner wrapper is sized to the frame's exact native aspect ratio
                      (1024×1536) so the frame image fills it with zero distortion and
                      no objectFit scaling is needed.  The photo is clipped to the
                      transparent window area so it never bleeds into the corner/edge
                      transparent pixels of the frame PNG.
                    */}
                    <div
                      style={{
                        width: "100%",
                        height: 170,
                        marginBottom: 6,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          boxSizing: "border-box",
                          padding: 5,
                          background: "#0a0a0c",
                          borderRadius: 2,
                          boxShadow: "0 4px 14px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
                        }}
                      >
                        {/* Simple black frame: photo area is a fixed 3:4 box, same shape the cropper outputs */}
                        <div style={{ height: "100%", aspectRatio: "3 / 4", overflow: "hidden" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarSrc}
                            alt={o.label}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "top center",
                              display: "block",
                            }}
                            onError={(e) => {
                              e.currentTarget.src = o.img;
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className="cinzel"
                      style={{ fontSize: 13, color: o.color, letterSpacing: "0.1em", padding: "0 10px" }}
                    >
                      {o.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#506070", marginTop: 3, lineHeight: 1.3, padding: "0 10px" }}>
                      {/* Saved tagline (Admin → Profiles) wins; the env value is only a
                          fallback when the profile couldn't be loaded. */}
                      {profileMap[o.email] ? profileMap[o.email].tagline : o.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Back button — top-left of the placard */}
              <button
                type="button"
                onClick={() => {
                  setWho(null);
                  setPassword("");
                  setErr("");
                }}
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background: "rgba(10,16,28,0.72)",
                  border: "1px solid rgba(232,168,32,0.4)",
                  borderRadius: 7,
                  color: "#D4A830",
                  fontSize: 13,
                  padding: "6px 14px",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                ← Back
              </button>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div
                  className="cinzel"
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    color: "#7A5010",
                    textShadow: "0 1px 0 rgba(255,200,80,0.18), 0 -1px 2px rgba(0,0,0,0.8)",
                  }}
                >
                  {(() => {
                    const profile = PROFILES.find((p) => p.id === who);
                    return profile?.id === "admin"
                      ? "PARENT ACCESS"
                      : `${profile?.label.toUpperCase() ?? ""} — ENTER PASSWORD`;
                  })()}
                </div>
              </div>
              <input
                className="inp"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && attempt()}
                style={{ textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 10 }}
              />
              {err && <div style={{ color: "#F08080", fontSize: 13, textAlign: "center", marginBottom: 8 }}>{err}</div>}
              <button
                type="button"
                className="btn-brass"
                style={{ width: "100%", padding: "12px", fontSize: 14, letterSpacing: "0.1em" }}
                onClick={attempt}
                disabled={loading}
              >
                {loading ? "..." : "ENGAGE"}
              </button>
            </>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#3A4858", letterSpacing: "0.12em" }}>
          {(process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "CRAFTSMAN ACADEMY").toUpperCase()} &middot; HOMESCHOOL PORTAL
        </div>
      </div>
    </div>
  );
}
