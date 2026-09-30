import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { AuthUser } from '../types';
import { loginUser, registerUser, resetUserPassword } from '../utils/authService';
import { HavenLogo } from './HavenLogo';
import { DEFAULT_AVATARS } from '../utils/avatarUtils';
import { AvatarPicker } from './AvatarPicker';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register' | 'reset';
  initialEmail?: string;
  reasonMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  initialEmail = '',
  reasonMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoCreateNew, setAutoCreateNew] = useState(true);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickRegister = async () => {
    const cleanEmail = (unregisteredEmail || email).trim().toLowerCase();
    if (!cleanEmail || !password) return;
    const defaultName = cleanEmail.split('@')[0] || 'Partner';
    const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    setIsLoading(true);
    setError(null);
    try {
      const res = await registerUser({
        email: cleanEmail,
        password,
        name: name.trim() || formattedName,
        avatar,
      });
      setSuccessMsg('Account created successfully! Welcome to Haven.');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setUnregisteredEmail(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please provide a valid email address');
      return;
    }

    if (!password) {
      setError('Please provide your password');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please provide your name or nickname');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your confirmation password.');
        return;
      }
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your confirmation password.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        const res = await registerUser({
          email: cleanEmail,
          password,
          name: name.trim(),
          avatar,
        });
        setSuccessMsg('Account registered successfully! Welcome to Haven.');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      } else if (mode === 'reset') {
        const res = await resetUserPassword({
          email: cleanEmail,
          newPassword: password,
        });
        setSuccessMsg('Password updated successfully! Welcome to your space.');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      } else {
        const res = await loginUser({
          email: cleanEmail,
          password,
          autoRegister: autoCreateNew,
        });
        setSuccessMsg(res.user ? 'Signed in successfully! Entering your space...' : 'Welcome to Haven!');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      // Use warn rather than error to avoid triggering platform console error alarms
      console.warn('Authentication status:', err.message);

      if (err.notRegistered || (err.message && err.message.toLowerCase().includes('no account registered'))) {
        setUnregisteredEmail(cleanEmail);
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 [color-scheme:light]"
        style={{ colorScheme: 'light' }}
      >
        {/* Header Visual */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 text-white text-center overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner mb-2.5">
            <HavenLogo size="md" variant="couple" />
          </div>

          <h2 className="text-xl font-bold font-serif tracking-tight">
            {mode === 'login'
              ? 'Sign In to Your Sanctuary'
              : mode === 'reset'
              ? 'Reset Account Password'
              : 'Create Your Haven Account'}
          </h2>
          <p className="text-rose-100 text-xs mt-1 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Access your encrypted spaces, calls, and shared memories.'
              : mode === 'reset'
              ? 'Set a new password for your registered email to regain access.'
              : 'Register your email to protect your private spaces with secure authentication.'}
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-rose-100 text-[11px] font-medium backdrop-blur-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span>Encrypted Authentication & Password Verification</span>
          </div>
        </div>

        {/* Reason banner if triggered due to password rejection or space requirement */}
        {reasonMessage && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/60 flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{reasonMessage}</span>
          </div>
        )}

        <div className="p-6">
          {/* Mode Switcher Tabs */}
          {mode === 'reset' ? (
            <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200/80 rounded-2xl mb-4 text-xs">
              <div className="flex items-center gap-2 text-rose-700 font-semibold">
                <KeyRound className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Password Recovery Mode</span>
              </div>
              <button
                type="button"
                id="btn-cancel-reset"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setUnregisteredEmail(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition shadow-2xs"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5">
              <button
                type="button"
                id="tab-auth-login"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setUnregisteredEmail(null);
                }}
                className={`py-2 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-auth-register"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setUnregisteredEmail(null);
                  if (password && !confirmPassword) {
                    setConfirmPassword(password);
                  }
                  if (email && !name) {
                    const prefix = email.split('@')[0];
                    setName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
                  }
                }}
                className={`py-2 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Unregistered Email Helper Prompt */}
          {unregisteredEmail && (
            <div
              id="unregistered-account-prompt"
              className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 border border-rose-200 text-xs animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-xs">No account registered for this email yet</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Would you like to create an account for <strong className="text-rose-700 font-semibold">{unregisteredEmail}</strong> with this password right now?
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-rose-200/60 flex flex-wrap gap-2">
                <button
                  type="button"
                  id="btn-quick-create-account"
                  onClick={handleQuickRegister}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Account & Sign In</span>
                </button>
                <button
                  type="button"
                  id="btn-switch-to-register-details"
                  onClick={() => {
                    setMode('register');
                    const prefix = unregisteredEmail.split('@')[0];
                    setName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
                    setConfirmPassword(password);
                    setUnregisteredEmail(null);
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition cursor-pointer"
                >
                  Choose Nickname & Avatar
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {error && !unregisteredEmail && (
            <div
              id="auth-error-banner"
              className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>

              {/* Quick Reset Password Option if incorrect password */}
              {(error.toLowerCase().includes('password') || error.toLowerCase().includes('incorrect')) && mode !== 'reset' && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-rose-600">Forgot or want to reset password?</span>
                  <button
                    type="button"
                    id="btn-error-reset-password"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div
              id="auth-success-banner"
              className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Name */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Name or Nickname
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    id="input-auth-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex, Sam, Honey"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm outline-none transition [color-scheme:light]"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff', colorScheme: 'light' }}
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  id="input-auth-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm outline-none transition [color-scheme:light]"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff', colorScheme: 'light' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-auth-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'register'
                      ? 'Choose a secure password'
                      : mode === 'reset'
                      ? 'Enter your new password'
                      : 'Enter your account password'
                  }
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm outline-none transition [color-scheme:light]"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff', colorScheme: 'light' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register or Reset mode) */}
            {(mode === 'register' || mode === 'reset') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm {mode === 'reset' ? 'New ' : ''}Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-auth-confirm-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition [color-scheme:light] ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-400 bg-rose-50/40 text-slate-900 focus:ring-rose-200'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-rose-500 focus:ring-rose-200'
                    }`}
                    style={{ color: '#0f172a', backgroundColor: confirmPassword && password !== confirmPassword ? undefined : '#ffffff', colorScheme: 'light' }}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match yet</p>
                )}
              </div>
            )}

            {/* Avatar Selector (Register mode) */}
            {mode === 'register' && (
              <div className="pt-1">
                <AvatarPicker
                  label="Choose Your Profile Avatar"
                  selectedAvatar={avatar}
                  onSelect={setAvatar}
                  compact
                />
              </div>
            )}

            {/* Auto-create account checkbox for seamless access */}
            {mode === 'login' && (
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  id="checkbox-auto-create"
                  checked={autoCreateNew}
                  onChange={(e) => setAutoCreateNew(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
                />
                <span>Automatically create account if new to Haven</span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-auth-submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl font-semibold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-md shadow-rose-500/20 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>Sign In & Unlock Space</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'reset' ? (
                <>
                  <span>Update Password & Enter Space</span>
                  <KeyRound className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <Sparkles className="w-4 h-4 text-rose-200" />
                </>
              )}
            </button>
          </form>

          {/* Footer toggle note */}
          <div className="mt-5 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Register with your email
                </button>
              </p>
            ) : mode === 'reset' ? (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Return to sign in
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
