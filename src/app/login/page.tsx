"use client";

import { useState } from "react";
import { Rivet } from "@/components/ui";
import { BASE_STUDENTS } from "@/lib/constants";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const PROFILES = [
  { id: "admin", color: "#C8860A", label: "DEE", sub: "Operations Engineer", img: "/assets/profile-admin-framed.png" },
  {
    id: "deven",
    color: BASE_STUDENTS.deven.color,
    label: "DEVEN",
    sub: BASE_STUDENTS.deven.tagline,
    img: BASE_STUDENTS.deven.avatar,
  },
  {
    id: "shaan",
    color: BASE_STUDENTS.shaan.color,
    label: "SHAAN",
    sub: BASE_STUDENTS.shaan.tagline,
    img: BASE_STUDENTS.shaan.avatar,
  },
];

const PIN_HINTS: Record<string, string> = {
  admin: "Demo PIN: 1234",
  deven: "Demo PIN: 0001",
  shaan: "Demo PIN: 0002",
};

export default function LoginPage() {
  const [who, setWho] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const { signIn } = useAuth();

  const attempt = () => {
    if (!who) return;
    const result = signIn(who, pin);
    if (!result.success) {
      setErr(result.error || "Incorrect PIN.");
      setPin("");
    }
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
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-craftsmanacademy.png"
            alt="Craftsman Academy"
            style={{ width: 216, display: "block", margin: "0 auto" }}
          />
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
              {PROFILES.map((o) => (
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.img}
                    alt={o.label}
                    style={{
                      width: "100%",
                      height: 170,
                      objectFit: "cover",
                      objectPosition: "top",
                      display: "block",
                      marginBottom: 6,
                    }}
                  />
                  <div className="cinzel" style={{ fontSize: 11, color: o.color, letterSpacing: "0.1em" }}>
                    {o.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#506070", marginTop: 3, lineHeight: 1.3 }}>{o.sub}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setWho(null);
                  setPin("");
                  setErr("");
                }}
                style={{ marginBottom: 16, fontSize: 12, padding: "5px 12px" }}
              >
                &larr; Back
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
                  {who === "admin" ? "PARENT ACCESS" : `${who.toUpperCase()} — ENTER PIN`}
                </div>
                <div style={{ fontSize: 10, color: "#506070", marginTop: 3 }}>{PIN_HINTS[who] || ""}</div>
              </div>
              <input
                className="inp"
                type="password"
                maxLength={6}
                placeholder="Enter PIN..."
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && attempt()}
                style={{ textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 10 }}
              />
              {err && <div style={{ color: "#F08080", fontSize: 12, textAlign: "center", marginBottom: 8 }}>{err}</div>}
              <button
                type="button"
                className="btn-brass"
                style={{ width: "100%", padding: "12px", fontSize: 14, letterSpacing: "0.1em" }}
                onClick={attempt}
              >
                ENGAGE
              </button>
            </>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 10, color: "#3A4858", letterSpacing: "0.12em" }}>
          CRAFTSMAN ACADEMY &middot; HOMESCHOOL PORTAL
        </div>
      </div>
    </div>
  );
}
