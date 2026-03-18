import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";

const T = {
  bg0:"#181c1f", bg1:"#1f2428", bg2:"#272d32", bg3:"#2f363c",
  border:"#363e45", borderHover:"#4e5a62",
  accent:"#c87050", accentDim:"#7a4432",
  accentBg:"rgba(200,112,80,0.10)",
  textPrimary:"#eceef0", textSecondary:"#8e9ba6",
  textMuted:"#55646e", textDisabled:"#333d44",
  danger:"#c84848", dangerBg:"rgba(200,72,72,0.12)",
  success:"#56a872",
  fontDisplay:"'Cormorant','Palatino Linotype',Georgia,serif",
  fontBody:"'DM Sans','Segoe UI',system-ui,sans-serif",
  r8:8, r12:12, tr:"all 0.18s ease",
};

function Field({ label, type="text", value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, color:T.textMuted, letterSpacing:1.8,
        textTransform:"uppercase", fontWeight:600, marginBottom:8, fontFamily:T.fontBody }}>
        {label}
      </div>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:"100%", background:T.bg3,
          border:`1px solid ${focused?T.accent:T.border}`,
          borderRadius:T.r8, color:T.textPrimary, fontSize:15, fontFamily:T.fontBody,
          padding:"13px 16px", outline:"none", boxSizing:"border-box", transition:T.tr,
          boxShadow:focused?`0 0 0 3px ${T.accentBg}`:"none" }}/>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, fullWidth }) {
  const [h,sh] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{ background:disabled?T.bg3:h?"#d88060":T.accent,
        border:`1px solid ${disabled?T.border:h?"#d88060":T.accent}`,
        color:disabled?T.textDisabled:"#181c1f",
        fontSize:15, padding:"13px 24px", borderRadius:T.r8,
        fontFamily:T.fontBody, fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",
        width:fullWidth?"100%":"auto", transition:T.tr, outline:"none" }}>
      {children}
    </button>
  );
}

function GoogleBtn({ onClick }) {
  const [h,sh] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{ background:h?T.bg3:T.bg2, border:`1px solid ${h?T.borderHover:T.border}`,
        color:T.textPrimary, fontSize:14, padding:"12px 20px", borderRadius:T.r8,
        fontFamily:T.fontBody, fontWeight:600, cursor:"pointer", width:"100%",
        transition:T.tr, outline:"none",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
      </svg>
      Continua con Google
    </button>
  );
}

export function AuthScreen() {
  const [mode, setMode]     = useState("login");
  const [email, setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetSent, setResetSent] = useState(false);

  const errMsg = code => ({
    "auth/email-already-in-use":"Email già registrata.",
    "auth/invalid-email":"Email non valida.",
    "auth/weak-password":"Password troppo corta (min. 6 caratteri).",
    "auth/user-not-found":"Nessun account con questa email.",
    "auth/wrong-password":"Password errata.",
    "auth/invalid-credential":"Email o password errati.",
    "auth/too-many-requests":"Troppi tentativi. Riprova tra qualche minuto.",
    "auth/popup-closed-by-user":"Popup chiuso. Riprova.",
  }[code] || "Errore: "+code);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if(mode==="register") {
        if(password!==confirm){setError("Le password non corrispondono.");setLoading(false);return;}
        await createUserWithEmailAndPassword(auth,email,password);
      } else if(mode==="login") {
        await signInWithEmailAndPassword(auth,email,password);
      } else if(mode==="reset") {
        await sendPasswordResetEmail(auth,email);
        setResetSent(true);
      }
    } catch(e){ setError(errMsg(e.code)); }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch(e){ setError(errMsg(e.code)); }
    setLoading(false);
  }

  function switchMode(m){ setMode(m); setError(""); setResetSent(false); }

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, fontFamily:T.fontBody,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box}body{margin:0;background:${T.bg0}}::placeholder{color:${T.textDisabled}}`}</style>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:38, fontWeight:600,
            color:T.textPrimary, lineHeight:1.05, marginBottom:6 }}>Pathfinder 1e</div>
          <div style={{ fontSize:14, color:T.textSecondary }}>Gestione Personaggi</div>
          <div style={{ width:60, height:2, background:T.accent, margin:"14px auto 0", borderRadius:1 }}/>
        </div>
        <div style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:T.r12, padding:"28px" }}>
          {mode==="reset" ? (
            <>
              <div style={{ fontFamily:T.fontDisplay, fontSize:22, color:T.textPrimary, marginBottom:6 }}>Recupera Password</div>
              <div style={{ fontSize:13, color:T.textSecondary, marginBottom:24, lineHeight:1.6 }}>
                Inserisci la tua email e ti mandiamo un link per reimpostare la password.
              </div>
              {resetSent ? (
                <div style={{ background:"rgba(86,168,114,0.12)", border:`1px solid ${T.success}`,
                  borderRadius:T.r8, padding:"12px 16px", fontSize:14, color:T.success, marginBottom:20 }}>
                  ✓ Email inviata! Controlla la tua casella di posta.
                </div>
              ) : (
                <Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="la-tua@email.com"/>
              )}
              {error&&<div style={{ color:T.danger, fontSize:13, marginBottom:16 }}>{error}</div>}
              {!resetSent&&<PrimaryBtn onClick={handleSubmit} disabled={loading||!email} fullWidth>
                {loading?"Invio...":"Invia link"}
              </PrimaryBtn>}
              <div style={{ textAlign:"center", marginTop:20 }}>
                <button onClick={()=>switchMode("login")}
                  style={{ background:"none", border:"none", color:T.accent, fontSize:13, cursor:"pointer", fontFamily:T.fontBody }}>
                  ← Torna al login
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:T.fontDisplay, fontSize:22, color:T.textPrimary, marginBottom:24 }}>
                {mode==="login"?"Accedi":"Crea Account"}
              </div>
              <GoogleBtn onClick={handleGoogle}/>
              <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0" }}>
                <div style={{ flex:1, height:1, background:T.border }}/>
                <span style={{ fontSize:11, color:T.textMuted, letterSpacing:1 }}>OPPURE</span>
                <div style={{ flex:1, height:1, background:T.border }}/>
              </div>
              <Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="la-tua@email.com"/>
              <Field label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
              {mode==="register"&&(
                <Field label="Conferma Password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••"/>
              )}
              {error&&(
                <div style={{ background:T.dangerBg, border:`1px solid ${T.danger}`,
                  borderRadius:T.r8, padding:"10px 14px", fontSize:13, color:T.danger, marginBottom:16 }}>
                  {error}
                </div>
              )}
              <PrimaryBtn onClick={handleSubmit} disabled={loading||!email||!password} fullWidth>
                {loading?"...":mode==="login"?"Accedi":"Registrati"}
              </PrimaryBtn>
              {mode==="login"&&(
                <div style={{ textAlign:"right", marginTop:10 }}>
                  <button onClick={()=>switchMode("reset")}
                    style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", fontFamily:T.fontBody }}>
                    Password dimenticata?
                  </button>
                </div>
              )}
              <div style={{ height:1, background:T.border, margin:"20px 0" }}/>
              <div style={{ textAlign:"center", fontSize:13, color:T.textSecondary }}>
                {mode==="login"?"Non hai un account?":"Hai già un account?"}{" "}
                <button onClick={()=>switchMode(mode==="login"?"register":"login")}
                  style={{ background:"none", border:"none", color:T.accent, fontSize:13, cursor:"pointer", fontWeight:600, fontFamily:T.fontBody }}>
                  {mode==="login"?"Registrati":"Accedi"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
      }
