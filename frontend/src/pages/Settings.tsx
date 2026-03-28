import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Save, 
  Trash2, 
  AlertTriangle, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/* Unified Light Mode Design Tokens */
const T = {
  bg: "#ffffff",
  bg2: "#f8f9fa",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.16)",

  text: "#0f172a",
  text2: "#475569",
  text3: "#64748b",

  violet: "#7c3aed",
  violetMid: "rgba(124,58,237,0.12)",
  violetGlow: "rgba(124,58,237,0.25)",

  cyan: "#06b6d4",
  red: "#ef4444",
  redSoft: "rgba(239,68,68,0.12)",

  success: "#22c55e",

  mono: '"JetBrains Mono", monospace',
  serif: '"Playfair Display", Georgia, serif',
  sans: '"Inter", system-ui, sans-serif',
};

const SettingRow = ({ 
  label, 
  description, 
  active, 
  onToggle 
}: { 
  label: string; 
  description: string; 
  active: boolean; 
  onToggle: () => void; 
}) => (
  <motion.div
    whileHover={{ x: 4 }}
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 32px',
      borderBottom: `1px solid ${T.border}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ 
        fontFamily: T.serif, 
        fontSize: 18, 
        fontWeight: 600, 
        color: T.text,
        marginBottom: 4 
      }}>
        {label}
      </div>
      <div style={{ 
        fontFamily: T.mono, 
        fontSize: 13, 
        color: T.text3,
        lineHeight: 1.5 
      }}>
        {description}
      </div>
    </div>

    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      style={{
        color: active ? T.cyan : T.text3,
        transition: 'color 0.2s ease',
      }}
    >
      {active ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
    </motion.div>
  </motion.div>
);

export const Settings = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [settings, setSettings] = useState({
    sound: true,
    notifications: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const ref = doc(db, 'settings', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            sound: data.audio ?? true,
            notifications: data.notifications ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const ref = doc(db, 'settings', user.uid);
      await updateDoc(ref, {
        audio: settings.sound,
        notifications: settings.notifications,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!user || !user.email) return;

    try {
      setDeleting(true);
      setAuthError(null);

      const credential = EmailAuthProvider.credential(user.email, passwordConfirm);
      await reauthenticateWithCredential(user, credential);

      await deleteDoc(doc(db, 'settings', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);

      setShowDeleteModal(false);
      navigate('/signup');
    } catch (err: any) {
      console.error('Account deletion failed:', err);

      if (err.code === 'auth/wrong-password') {
        setAuthError('Incorrect password.');
      } else if (err.code === 'auth/requires-recent-login') {
        setAuthError('Please re-authenticate and try again.');
      } else {
        setAuthError('Failed to delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.text3 }}>Loading settings...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: T.sans,
      padding: '24px 32px 60px',
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32, textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{
                width: 40,
                height: 40,
                background: T.violetMid,
                border: `1px solid rgba(124,58,237,0.3)`,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon size={20} color={T.violet} />
            </motion.div>

            <h1 style={{
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              System Configuration
            </h1>
          </div>

          <p style={{
            fontFamily: T.mono,
            fontSize: 13,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: T.text3,
          }}>
            Customize your MADMAX experience
          </p>
        </motion.header>

        {/* Interface Settings */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div style={{ padding: '20px 32px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3 }}>INTERFACE</div>
            <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.text }}>Preferences</div>
          </div>

          <SettingRow
            label="Audio Feedback"
            description="Enable sound effects for UI interactions and system alerts"
            active={settings.sound}
            onToggle={() => toggleSetting('sound')}
          />

          <SettingRow
            label="Notifications"
            description="Receive real-time alerts for system updates and threat detections"
            active={settings.notifications}
            onToggle={() => toggleSetting('notifications')}
          />
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 48 }}
        >
          <motion.button
            onClick={saveSettings}
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px 28px',
              background: `linear-gradient(135deg, ${T.violet}, #6d28d9)`,
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontFamily: T.mono,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {saving ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Save size={18} />
                </motion.div>
                SAVING...
              </>
            ) : (
              <>
                <Save size={18} />
                SAVE SETTINGS
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{
            background: T.bg2,
            border: `1px solid ${T.red}30`,
            borderRadius: 24,
            padding: 24,
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.red }}>DANGER ZONE</div>
              <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.text }}>Account Deletion</div>
            </div>

            <p style={{ color: T.text2, lineHeight: 1.7, marginBottom: 24 }}>
              Permanently delete your account and all associated data. 
              This action cannot be undone.
            </p>

            <motion.button
              onClick={() => setShowDeleteModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 28px',
                background: T.red,
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontFamily: T.mono,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Trash2 size={18} />
              DELETE ACCOUNT
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.85)',
              backdropFilter: 'blur(20px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                maxWidth: 460,
                width: '100%',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ padding: '40px 40px 28px', textAlign: 'center' }}>
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ 
                    margin: '0 auto 24px', 
                    width: 64, 
                    height: 64, 
                    background: T.redSoft, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  <AlertTriangle size={32} color={T.red} />
                </motion.div>

                <h3 style={{ 
                  fontFamily: T.serif, 
                  fontSize: 26, 
                  fontWeight: 700, 
                  color: T.text, 
                  marginBottom: 12 
                }}>
                  Delete Account Permanently?
                </h3>
                <p style={{ color: T.text2, lineHeight: 1.7 }}>
                  This will permanently delete your account and all associated data. 
                  This action cannot be undone.
                </p>
              </div>

              <div style={{ padding: '0 40px 40px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3, marginBottom: 8 }}>Confirm Password</div>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: T.bg2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      fontSize: 15,
                      color: T.text,
                    }}
                  />
                </div>

                {authError && (
                  <div style={{ color: T.red, fontSize: 13, marginBottom: 16 }}>{authError}</div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <motion.button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: T.bg2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      color: T.text2,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    onClick={confirmDeleteAccount}
                    disabled={deleting || !passwordConfirm}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: T.red,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 600,
                      cursor: deleting || !passwordConfirm ? 'not-allowed' : 'pointer',
                      opacity: deleting || !passwordConfirm ? 0.7 : 1,
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Deletion'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};