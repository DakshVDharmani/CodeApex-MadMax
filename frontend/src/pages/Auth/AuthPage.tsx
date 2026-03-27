import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

// ─────────────────────────────────────────────
// OAuth providers — instantiated once at module level
// ─────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────

// LEFT panel (Signup) — warm terracotta/red
const LEFT = {
  panelBg:        '#151821',
  panelBorder:    'rgba(139,92,246,0.18)',

  accent:         '#8b5cf6', // violet
  accentMid:      'rgba(139,92,246,0.16)',
  accentSoft:     'rgba(139,92,246,0.07)',
  accentGlow:     'rgba(139,92,246,0.22)',

  fieldBorder:    'rgba(139,92,246,0.22)',
  fieldFocusBorder:'rgba(139,92,246,0.65)',
  fieldFocusShadow:'rgba(139,92,246,0.12)',

  btnGradient:    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  btnGlow:        'rgba(139,92,246,0.35)',

  label:          'rgba(139,92,246,0.75)',
  subtitle:       'rgba(255,255,255,0.38)',
  text:           '#ffffff',
};

// RIGHT panel (Login) — cool deep navy
const RIGHT = {
  panelBg:        '#0c1424',
  panelBorder:    'rgba(59,130,246,0.18)',

  accent:         '#3b82f6', // blue
  accentMid:      'rgba(59,130,246,0.16)',
  accentSoft:     'rgba(59,130,246,0.07)',
  accentGlow:     'rgba(59,130,246,0.22)',

  fieldBorder:    'rgba(59,130,246,0.22)',
  fieldFocusBorder:'rgba(59,130,246,0.65)',
  fieldFocusShadow:'rgba(59,130,246,0.12)',

  btnGradient:    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  btnGlow:        'rgba(59,130,246,0.35)',

  label:          'rgba(59,130,246,0.75)',
  subtitle:       'rgba(255,255,255,0.38)',
  text:           '#ffffff',
};

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => off ? (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
  </svg>
) : (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

// ─────────────────────────────────────────────
// Field — themed by panel color tokens
// ─────────────────────────────────────────────

interface FieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  showToggle?: boolean;
  show?: boolean;
  onToggle?: () => void;
  tokens: typeof LEFT;
}

function Field({ label, type = 'text', placeholder, value, onChange, showToggle, show, onToggle, tokens }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: tokens.label,
        fontFamily: 'inherit',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToggle ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${tokens.fieldBorder}`,
            borderRadius: 8,
            padding: '10px 14px',
            paddingRight: showToggle ? 38 : 14,
            fontSize: 13.5,
            color: tokens.text,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.target.style.borderColor = tokens.fieldFocusBorder;
            e.target.style.boxShadow = `0 0 0 3px ${tokens.fieldFocusShadow}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = tokens.fieldBorder;
            e.target.style.boxShadow = 'none';
          }}
        />
        {showToggle && (
          <button
            onClick={onToggle} type="button"
            style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
            }}
          >
            <EyeIcon off={!!show} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────

const Divider = ({ tokens }: { tokens: typeof LEFT }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 500, letterSpacing: '0.04em' }}>or continue with</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
  </div>
);

// ─────────────────────────────────────────────
// OAuth Row
// ─────────────────────────────────────────────

interface OAuthRowProps {
  onGoogle: () => void;
  onGithub: () => void;
  disabled: boolean;
  tokens: typeof LEFT;
}

const OAuthRow = ({ onGoogle, onGithub, disabled, tokens }: OAuthRowProps) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    {[
      { label: 'Google', icon: <GoogleIcon />, onClick: onGoogle },
      { label: 'GitHub', icon: <GithubIcon />, onClick: onGithub },
    ].map(({ label, icon, onClick }) => (
      <button
        key={label}
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '9px 0',
          fontSize: 13, fontWeight: 500,
          color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.72)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        }}
      >
        {icon} {label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────

const ErrorMsg = ({ msg, tokens }: { msg: string; tokens: typeof LEFT }) =>
  msg ? (
    <div style={{
      marginTop: 10,
      padding: '8px 12px',
      background: 'rgba(220,38,38,0.08)',
      border: '1px solid rgba(220,38,38,0.2)',
      borderLeft: '3px solid rgba(220,38,38,0.65)',
      borderRadius: 7,
      fontSize: 12.5,
      color: '#fca5a5',
      lineHeight: 1.4,
    }}>
      {msg}
    </div>
  ) : null;

// ─────────────────────────────────────────────
// CTA Button — themed
// ─────────────────────────────────────────────

function CtaButton({ children, loading, tokens }: { children: React.ReactNode; loading?: boolean; tokens: typeof LEFT }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: 18, width: '100%', padding: '11px 0', borderRadius: 8,
        background: loading ? 'rgba(255,255,255,0.08)' : tokens.btnGradient,
        color: '#fff', border: 'none',
        fontWeight: 600, fontSize: 13.5, letterSpacing: '0.02em',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : `0 4px 20px ${tokens.btnGlow}`,
        transition: 'opacity 0.15s, box-shadow 0.15s',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.87'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {loading ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'mm-spin 0.8s linear infinite', transformOrigin: 'center' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Processing...
        </>
      ) : children}
    </button>
  );
}

// ─────────────────────────────────────────────
// Firebase error map
// ─────────────────────────────────────────────

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/email-already-in-use':   'This email is already registered.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/popup-closed-by-user':   'Sign-in window was closed. Please try again.',
    'auth/popup-blocked':          'Popup blocked — please allow popups for this site.',
    'auth/cancelled-popup-request':'Only one sign-in popup can be open at a time.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email. Try a different sign-in method.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

// ─────────────────────────────────────────────
// upsertOAuthUser
// ─────────────────────────────────────────────

async function upsertOAuthUser(uid: string, email: string | null, displayName: string | null) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      username:  displayName ?? email?.split('@')[0] ?? 'Agent',
      email:     email ?? '',
      createdAt: serverTimestamp(),
      role:      'analyst',
    });
  }
}

// ─────────────────────────────────────────────
// Overlay Panel — themed switcher
// ─────────────────────────────────────────────

interface OverlayPanelProps {
  isSignup: boolean;
  onSwitch: () => void;
}

function OverlayPanel({ isSignup, onSwitch }: OverlayPanelProps) {
  // Interpolate between LEFT (signup active) and RIGHT (login active) color schemes
  const tokens = isSignup ? LEFT : RIGHT;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: isSignup ? '50%' : '0%',
      width: '50%',
      height: '100%',
      background: tokens.panelBg,
      borderLeft:  isSignup ? `1px solid ${tokens.panelBorder}` : 'none',
      borderRight: isSignup ? 'none' : `1px solid ${tokens.panelBorder}`,
      transition: 'left 0.55s cubic-bezier(0.77, 0, 0.18, 1), background 0.55s ease',
      zIndex: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 40px',
      boxSizing: 'border-box' as const,
      textAlign: 'center' as const,
      overflow: 'hidden',
    }}>
      {/* Ambient glows — accent color changes with panel */}
      <div style={{
        position: 'absolute', top: '-25%', right: '-20%',
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${tokens.accentMid} 0%, transparent 70%)`,
        filter: 'blur(30px)', pointerEvents: 'none',
        transition: 'background 0.55s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: '-25%', left: '-15%',
        width: 260, height: 260, borderRadius: '50%',
        background: `radial-gradient(circle, ${tokens.accentSoft} 0%, transparent 70%)`,
        filter: 'blur(25px)', pointerEvents: 'none',
        transition: 'background 0.55s ease',
      }} />

      {/* Subtle dot grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${tokens.accentGlow} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        opacity: 0.45,
        transition: 'background-image 0.55s ease',
      }} />

      {/* Panel content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, marginBottom: 38 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: tokens.accentMid,
            border: `1px solid ${tokens.accentGlow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: tokens.accent,
            transition: 'background 0.4s, border-color 0.4s, color 0.4s',
          }}>
            <ShieldIcon />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>MADMAX</div>
            <div style={{ fontSize: 10, color: tokens.label, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, transition: 'color 0.4s' }}>Reality Defense</div>
          </div>
        </div>

        {/* Accent rule */}
        <div style={{
          width: 36, height: 1.5,
          background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
          margin: '0 auto 28px',
          transition: 'background 0.4s',
        }} />

        <h2 style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 12, letterSpacing: '-0.02em' }}>
          {isSignup ? 'Already have an account?' : 'New to MADMAX?'}
        </h2>

        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 32, maxWidth: 215, margin: '0 auto 32px' }}>
          {isSignup
            ? 'Sign in to access your dashboard and resume your mission.'
            : 'Create an account and start detecting deepfakes and misinformation.'}
        </p>

        <button
          type="button"
          onClick={onSwitch}
          style={{
            background: 'transparent',
            border: `1.5px solid ${tokens.panelBorder}`,
            borderRadius: 8,
            color: '#fff',
            padding: '10px 34px',
            fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            fontFamily: 'inherit',
            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = tokens.accentMid;
            e.currentTarget.style.borderColor = tokens.accent;
            e.currentTarget.style.boxShadow = `0 0 18px ${tokens.accentSoft}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = tokens.panelBorder;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isSignup ? 'Sign In' : 'Create Account'}
        </button>

        {/* System badge */}
        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: tokens.accent,
            animation: 'mm-pulse 2.2s ease infinite',
            transition: 'background 0.4s',
          }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
            System Online
          </span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AuthPage
// ─────────────────────────────────────────────

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from: string = (location.state as any)?.from?.pathname ?? '/home';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const isSignup = mode === 'signup';

  // Login
  const [loginEmail,   setLoginEmail]   = useState('');
  const [loginPw,      setLoginPw]      = useState('');
  const [showLoginPw,  setShowLoginPw]  = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail,    setSignupEmail]    = useState('');
  const [signupPw,       setSignupPw]       = useState('');
  const [signupCf,       setSignupCf]       = useState('');
  const [showSignupPw,   setShowSignupPw]   = useState(false);
  const [showSignupCf,   setShowSignupCf]   = useState(false);
  const [signupError,    setSignupError]    = useState('');
  const [signupLoading,  setSignupLoading]  = useState(false);

  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError,   setOauthError]   = useState('');

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setLoginError('');
    setSignupError('');
    setOauthError('');
    setShowLoginPw(false);
    setShowSignupPw(false);
    setShowSignupCf(false);
  };

  // ── Email/password ───────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPw) { setLoginError('Please fill in all fields.'); return; }
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPw);
      navigate(from, { replace: true });
    } catch (err: any) {
      setLoginError(friendlyError(err.code));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!signupUsername || !signupEmail || !signupPw || !signupCf) { setSignupError('Please fill in all fields.'); return; }
    if (signupPw.length < 6) { setSignupError('Password must be at least 6 characters.'); return; }
    if (signupPw !== signupCf) { setSignupError('Passwords do not match.'); return; }
    setSignupLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPw);
      await setDoc(doc(db, 'users', cred.user.uid), {
        username:  signupUsername,
        email:     signupEmail,
        createdAt: serverTimestamp(),
        role:      'analyst',
      });
      navigate('/home', { replace: true });
    } catch (err: any) {
      setSignupError(friendlyError(err.code));
    } finally {
      setSignupLoading(false);
    }
  };

  // ── OAuth ────────────────────────────────────

  const handleOAuth = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setOauthError('');
    setOauthLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await upsertOAuthUser(result.user.uid, result.user.email, result.user.displayName);
      navigate('/home', { replace: true });
    } catch (err: any) {
      setOauthError(friendlyError(err.code));
    } finally {
      setOauthLoading(false);
    }
  };

  const handleGoogle = () => handleOAuth(googleProvider);
  const handleGithub = () => handleOAuth(githubProvider);

  const anyLoading = loginLoading || signupLoading || oauthLoading;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes mm-spin { to { transform: rotate(360deg); } }
        @keyframes mm-pulse-red  { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(192,57,43,0.9)}  50%{opacity:0.5;box-shadow:0 0 2px rgba(192,57,43,0.3)} }
        @keyframes mm-pulse-blue { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(37,99,235,0.9)}  50%{opacity:0.5;box-shadow:0 0 2px rgba(37,99,235,0.3)} }
        @keyframes mm-pulse      { 0%,100%{opacity:1} 50%{opacity:0.45} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: rgba(255,255,255,0.16) !important; font-size: 13px; }
        input:-webkit-autofill, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 60px #0d0d14 inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>

      {/* ── Page background: white with very subtle warm grid ── */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f4f2',
        backgroundImage: [
          'radial-gradient(circle at 18% 30%, rgba(192,57,43,0.06) 0%, transparent 50%)',
          'radial-gradient(circle at 80% 70%, rgba(37,99,235,0.07) 0%, transparent 50%)',
          'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
        padding: 20,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Card container — floating shadow on white bg */}
        <div style={{
          width: '100%',
          maxWidth: 880,
          minHeight: 570,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: [
            '0 2px 4px rgba(0,0,0,0.04)',
            '0 8px 16px rgba(0,0,0,0.07)',
            '0 20px 40px rgba(0,0,0,0.1)',
            '0 40px 80px rgba(0,0,0,0.12)',
          ].join(', '),
          zIndex: 1,
        }}>

          {/* ══ SIGN UP FORM — LEFT (terracotta red theme) ══ */}
          <form
            onSubmit={handleSignup}
            style={{
              background: LEFT.panelBg,
              padding: '46px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              opacity: isSignup ? 1 : 0,
              transform: isSignup ? 'translateX(0) scale(1)' : 'translateX(-14px) scale(0.98)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              transitionDelay: isSignup ? '0.2s' : '0s',
              pointerEvents: isSignup ? 'auto' : 'none',
              zIndex: 1,
            }}
          >
            <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: LEFT.label, marginBottom: 6 }}>
              Get started
            </p>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: '#fff', marginBottom: 5, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Create your account
            </h1>
            <p style={{ fontSize: 13, color: LEFT.subtitle, marginBottom: 28, lineHeight: 1.5 }}>
              Join the MADMAX reality defense network.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Field label="Display Name"      placeholder="Your callsign"        value={signupUsername} onChange={setSignupUsername} tokens={LEFT} />
              <Field label="Email" type="email" placeholder="you@example.com"     value={signupEmail}    onChange={setSignupEmail}    tokens={LEFT} />
              <Field label="Password"          showToggle show={showSignupPw} onToggle={() => setShowSignupPw(v => !v)} placeholder="At least 6 characters" value={signupPw} onChange={setSignupPw} tokens={LEFT} />
              <Field label="Confirm Password"  showToggle show={showSignupCf} onToggle={() => setShowSignupCf(v => !v)} placeholder="Repeat password"       value={signupCf} onChange={setSignupCf} tokens={LEFT} />
            </div>

            <ErrorMsg msg={signupError}                          tokens={LEFT} />
            {oauthError && isSignup && <ErrorMsg msg={oauthError} tokens={LEFT} />}
            <CtaButton loading={signupLoading} tokens={LEFT}>Create Account</CtaButton>
            <Divider tokens={LEFT} />
            <OAuthRow onGoogle={handleGoogle} onGithub={handleGithub} disabled={anyLoading} tokens={LEFT} />
          </form>

          {/* ══ LOGIN FORM — RIGHT (navy blue theme) ══ */}
          <form
            onSubmit={handleLogin}
            style={{
              background: RIGHT.panelBg,
              padding: '46px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              opacity: !isSignup ? 1 : 0,
              transform: !isSignup ? 'translateX(0) scale(1)' : 'translateX(14px) scale(0.98)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              transitionDelay: !isSignup ? '0.2s' : '0s',
              pointerEvents: !isSignup ? 'auto' : 'none',
              zIndex: 1,
            }}
          >
            <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: RIGHT.label, marginBottom: 6 }}>
              Welcome back
            </p>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: '#fff', marginBottom: 5, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Sign in to MADMAX
            </h1>
            <p style={{ fontSize: 13, color: RIGHT.subtitle, marginBottom: 28, lineHeight: 1.5 }}>
              Continue defending reality.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Field label="Email" type="email" placeholder="you@example.com" value={loginEmail} onChange={setLoginEmail} tokens={RIGHT} />
              <Field label="Password"           showToggle show={showLoginPw} onToggle={() => setShowLoginPw(v => !v)} placeholder="••••••••" value={loginPw} onChange={setLoginPw} tokens={RIGHT} />
            </div>

            <div style={{ textAlign: 'right', marginTop: 9 }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', fontSize: 12,
                  color: 'rgba(37,99,235,0.55)',
                  cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  letterSpacing: '0.01em', transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(37,99,235,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(37,99,235,0.55)')}
              >
                Forgot password?
              </button>
            </div>

            <ErrorMsg msg={loginError}                           tokens={RIGHT} />
            {oauthError && !isSignup && <ErrorMsg msg={oauthError} tokens={RIGHT} />}
            <CtaButton loading={loginLoading} tokens={RIGHT}>Sign In</CtaButton>
            <Divider tokens={RIGHT} />
            <OAuthRow onGoogle={handleGoogle} onGithub={handleGithub} disabled={anyLoading} tokens={RIGHT} />
          </form>

          {/* ══ SLIDING OVERLAY PANEL ══ */}
          <OverlayPanel isSignup={isSignup} onSwitch={() => switchMode(isSignup ? 'login' : 'signup')} />

        </div>
      </div>
    </>
  );
}