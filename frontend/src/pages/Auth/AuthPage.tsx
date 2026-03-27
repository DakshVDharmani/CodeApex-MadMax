import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

// ── Tiny SVG icons (no external deps) ───────────────────────────────────────

const EyeIcon = ({ off }: { off: boolean }) =>
  off ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center' }} />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'signup';

// ── Field component ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  isPassword?: boolean;
  required?: boolean;
}

function Field({ label, type = 'text', placeholder, value, onChange, isPassword }: FieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,26,26,0.7)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={isPassword ? 'current-password' : type === 'email' ? 'email' : 'off'}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,26,26,0.2)',
            padding: '10px 14px',
            paddingRight: isPassword ? 38 : 14,
            fontSize: 13,
            color: '#e8e0d0',
            outline: 'none',
            fontFamily: 'Share Tech Mono, monospace',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'rgba(255,26,26,0.7)';
            e.target.style.boxShadow = '0 0 0 3px rgba(255,26,26,0.08), inset 0 0 12px rgba(255,26,26,0.04)';
          }}
          onBlur={e => {
            e.target.style.borderColor = 'rgba(255,26,26,0.2)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}
          >
            <EyeIcon off={show} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from: string = (location.state as any)?.from?.pathname ?? '/home';

  const [mode, setMode] = useState<Mode>('login');
  const isLogin = mode === 'login';

  // Shared state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Signup-only state
  const [username, setUsername]     = useState('');
  const [confirm, setConfirm]       = useState('');

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError('');
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        username,
        email,
        createdAt: serverTimestamp(),
        role: 'analyst',
      });
      navigate('/home', { replace: true });
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&family=Libre+Baskerville:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes crt-flicker { 0%,94%,100%{opacity:1} 95%{opacity:.85} 97%{opacity:.7} }
        @keyframes scanline { from{top:-4px} to{top:100vh} }
        @keyframes fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes slide-in { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        .auth-input-focus { border-color: rgba(255,26,26,0.7) !important; }
        ::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>

      {/* Page wrapper */}
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', overflow: 'hidden', fontFamily: 'Libre Baskerville, serif', animation: 'crt-flicker 10s infinite' }}>

        {/* CRT scanlines */}
        <div style={{ position: 'fixed', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)', pointerEvents: 'none', zIndex: 99 }} />
        <div style={{ position: 'fixed', width: '100%', height: 3, background: 'linear-gradient(transparent,rgba(255,26,26,0.12),transparent)', animation: 'scanline 7s linear infinite', pointerEvents: 'none', zIndex: 98, top: 0 }} />

        {/* Ambient glow */}
        <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,0,0,0.18) 0%,transparent 70%)', top: '10%', left: '-10%', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,80,80,0.1) 0%,transparent 70%)', bottom: '10%', right: '-5%', pointerEvents: 'none', filter: 'blur(40px)' }} />

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10, animation: 'fade-up 0.5s ease both' }}>

          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: 'VT323, monospace', fontSize: '3.5rem', color: '#ff1a1a', letterSpacing: '0.1em', textShadow: '0 0 20px rgba(255,26,26,0.6),0 0 50px rgba(255,26,26,0.3)', lineHeight: 1, marginBottom: 4 }}>
              MADMAX
            </div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,26,26,0.5)', marginBottom: 20 }}>
              // REALITY DEFENSE SYSTEM
            </div>

            {/* Mode toggle tabs */}
            <div style={{ display: 'inline-flex', border: '1px solid rgba(255,26,26,0.2)', overflow: 'hidden' }}>
              {(['login', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  style={{
                    padding: '8px 28px',
                    background: mode === m ? 'rgba(255,26,26,0.15)' : 'transparent',
                    border: 'none',
                    borderRight: m === 'login' ? '1px solid rgba(255,26,26,0.2)' : 'none',
                    color: mode === m ? '#ff1a1a' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 11,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
          </div>

          {/* Form card */}
          <div style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,26,26,0.15)', padding: '32px 30px', position: 'relative', boxShadow: '0 0 60px rgba(255,26,26,0.06), inset 0 0 40px rgba(0,0,0,0.5)' }}>

            {/* Corner accents */}
            {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
              <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...pos, borderTop: (pos as any).top === 0 ? '2px solid rgba(255,26,26,0.5)' : 'none', borderBottom: (pos as any).bottom === 0 ? '2px solid rgba(255,26,26,0.5)' : 'none', borderLeft: (pos as any).left === 0 ? '2px solid rgba(255,26,26,0.5)' : 'none', borderRight: (pos as any).right === 0 ? '2px solid rgba(255,26,26,0.5)' : 'none' }} />
            ))}

            {/* Status line */}
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,26,26,0.45)', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: '#ff1a1a', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #ff1a1a', animation: 'blink 1.4s infinite' }} />
              {isLogin ? '> AWAITING CREDENTIALS...' : '> OPEN ENROLLMENT ACTIVE'}
            </div>

            <form onSubmit={isLogin ? handleLogin : handleSignup} key={mode} style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'slide-in 0.25s ease both' }}>

              {/* Signup-only fields */}
              {!isLogin && (
                <Field label="Operative Name" placeholder="YourCallsign" value={username} onChange={setUsername} />
              )}

              <Field label="Email Address" type="email" placeholder="agent@madmax.net" value={email} onChange={setEmail} />
              <Field label="Password" isPassword placeholder={isLogin ? '••••••••' : 'Min 6 characters'} value={password} onChange={setPassword} />

              {!isLogin && (
                <Field label="Confirm Password" isPassword placeholder="Repeat password" value={confirm} onChange={setConfirm} />
              )}

              {/* Forgot password */}
              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: -6 }}>
                  <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,26,26,0.5)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.15em', cursor: 'pointer' }}>
                    FORGOT PASSWORD?
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: 'rgba(255,26,26,0.08)', border: '1px solid rgba(255,26,26,0.3)', borderLeft: '3px solid #ff1a1a', padding: '10px 14px', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff6b6b', letterSpacing: '0.05em' }}>
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '12px 0',
                  background: loading ? 'rgba(139,0,0,0.4)' : 'linear-gradient(135deg,rgba(255,26,26,0.9),rgba(139,0,0,0.9))',
                  border: '1px solid rgba(255,26,26,0.4)',
                  color: '#fff',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 12,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 0.15s',
                  boxShadow: '0 0 20px rgba(255,26,26,0.2)',
                }}
                onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
              >
                {loading ? <><Spinner />{isLogin ? 'AUTHENTICATING...' : 'REGISTERING...'}</> : isLogin ? '▸ AUTHENTICATE' : '▸ CREATE ACCOUNT'}
              </button>

            </form>

            {/* Switch mode link */}
            <p style={{ marginTop: 20, textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)' }}>
              {isLogin ? 'No account?' : 'Already registered?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,26,26,0.7)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isLogin ? 'Register' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p style={{ marginTop: 16, textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase' }}>
            MADMAX © {new Date().getFullYear()} — All credentials encrypted
          </p>
        </div>
      </div>
    </>
  );
}

// ── Firebase error → human message ───────────────────────────────────────────

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':      'No account found with this email.',
    'auth/wrong-password':      'Incorrect password. Try again.',
    'auth/invalid-email':       'Please enter a valid email address.',
    'auth/email-already-in-use':'This email is already registered.',
    'auth/weak-password':       'Password is too weak. Min 6 characters.',
    'auth/too-many-requests':   'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential':  'Invalid credentials. Please try again.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}