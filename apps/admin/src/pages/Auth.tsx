import { useState } from "react";
import { Link } from "react-router-dom";
import { Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, PasswordInput, Checkbox, OtpInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Rule, Graphic } from "@belikh/jupiter-ui/Icon.tsx";

export function Auth() {
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "2fa" | "sent">("in"); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [remember, setRemember] = useState(true); const [otp, setOtp] = useState(""); const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => { e.preventDefault(); setErr(""); if (mode === "in") { if (!/.+@.+\..+/.test(email)) return setErr("Enter a valid email address."); if (pw.length < 4) return setErr("Password is too short."); setMode("2fa"); } else if (mode === "forgot") setMode("sent"); else if (mode === "up") setMode("2fa"); };
  return (
    <div className="adm-auth">
      <aside className="adm-auth__art"><div><div className="adm-brand" style={{ padding: 0 }}><Graphic id="icon-sparkle" size={26} /><span>jupiter /admin</span></div></div><Graphic id="scene-horizon" size="100%" className="adm-auth__scene" /><p>“A design system is a promise that every screen will feel like the same place.”</p></aside>
      <main className="adm-auth__form"><form onSubmit={submit} noValidate className="adm-stack" style={{ width: 360, maxWidth: "100%" }}>
        <h1>{{ in: "Sign in", up: "Create account", forgot: "Reset password", "2fa": "Two-step verification", sent: "Check your inbox" }[mode]}</h1>
        {err && <Alert s="danger" title={err} />}
        {(mode === "in" || mode === "up") && <><Field label="Email">{(id) => <TextInput id={id} type="email" value={email} onChange={setEmail} autoFocus autoComplete="username" />}</Field><Field label="Password">{(id) => mode === "up" ? <PasswordInput id={id} value={pw} onChange={setPw} /> : <TextInput id={id} type="password" value={pw} onChange={setPw} autoComplete="current-password" />}</Field>
          <div className="adm-row" style={{ justifyContent: "space-between" }}><Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />{mode === "in" && <button type="button" className="adm-link" onClick={() => setMode("forgot")}>Forgot password?</button>}</div>
          <Btn type="submit" variant="primary">{mode === "in" ? "Sign in" : "Create account"}</Btn><div className="adm-auth__or"><span>or</span></div><Btn type="button">Continue with SSO</Btn><Btn type="button">Send me a magic link</Btn></>}
        {mode === "forgot" && <><p className="jp-muted">Enter your email and we’ll send a reset link.</p><Field label="Email">{(id) => <TextInput id={id} type="email" value={email} onChange={setEmail} autoFocus />}</Field><Btn type="submit" variant="primary">Send reset link</Btn></>}
        {mode === "sent" && <><Rule name="wave" /><p>If an account exists for <b>{email || "that address"}</b>, a reset link is on its way.</p><Btn type="button" onClick={() => setMode("in")}>Back to sign in</Btn></>}
        {mode === "2fa" && <><p className="jp-muted">Enter the 6-digit code from your authenticator app.</p><OtpInput value={otp} onChange={setOtp} /><Link to="/" className={`jp-btn jp-btn--primary ${otp.length < 6 ? "is-disabled" : ""}`} aria-disabled={otp.length < 6} onClick={(e) => otp.length < 6 && e.preventDefault()}>Verify and continue</Link><button type="button" className="adm-link" onClick={() => setMode("in")}>Use a recovery code instead</button></>}
        {(mode === "in" || mode === "up") && <p className="jp-muted" style={{ textAlign: "center" }}>{mode === "in" ? <>New here? <button type="button" className="adm-link" onClick={() => setMode("up")}>Create an account</button></> : <>Have an account? <button type="button" className="adm-link" onClick={() => setMode("in")}>Sign in</button></>}</p>}
      </form></main>
    </div>
  );
}
