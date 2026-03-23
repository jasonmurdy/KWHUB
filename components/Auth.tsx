
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { KWHubLogoFull } from './icons';

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.8 0 265.8 0 129.8 110.3 20 244 20c66.3 0 121.3 24.4 166.3 65.8l-67.4 64.8C297.3 113.8 273.5 96 244 96c-87.5 0-159.2 71.6-159.2 169.8s71.7 169.8 159.2 169.8c99.1 0 134-66.6 138.3-102.3H244v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path>
    </svg>
);

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [isLoading, setIsLoading] = useState(false);
  const { logIn, signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
      setIsLoading(true);
      setError('');
      try {
          await signInWithGoogle();
      } catch (err: unknown) {
          console.error("Google Sign-in Error:", err);
          const firebaseError = err as { code?: string; message?: string };
          if (firebaseError.code === 'auth/unauthorized-domain') {
              const currentDomain = window.location.hostname;
              setError(
                  <div className="space-y-3 text-left">
                    <p className="font-bold text-sm">Authentication Blocked (Unauthorized Domain)</p>
                    <p className="text-xs">The domain <code className="bg-surface-variant px-1 rounded">{currentDomain}</code> is not authorized in your Firebase Console.</p>
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                        <p className="text-[11px] font-semibold text-primary uppercase">To fix this:</p>
                        <ol className="text-[11px] list-decimal list-inside mt-1 space-y-1">
                            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a></li>
                            <li>Select your project</li>
                            <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong></li>
                            <li>Click <strong>Authorized Domains</strong></li>
                            <li>Add <strong>{currentDomain}</strong> to the list</li>
                        </ol>
                    </div>
                  </div>
              );
          } else if (firebaseError.code === 'auth/popup-closed-by-user') {
              // Ignore
          } else if (firebaseError.code === 'auth/popup-blocked') {
              setError('Sign-in popup was blocked. Please allow popups for this site.');
          } else {
              setError(firebaseError.message || 'Failed to sign in with Google.');
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await logIn(email, password);
    } catch (err: unknown) {
        console.error(err);
        const firebaseError = err as { code?: string; message?: string };
        switch (firebaseError.code) {
            case 'auth/invalid-email':
                setError('Please enter a valid email address.');
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                setError('Invalid email or password.');
                break;
            case 'auth/email-already-in-use':
                setError('An account with this email already exists.');
                break;
            default:
                setError(firebaseError.message || 'An unexpected error occurred.');
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <KWHubLogoFull className="w-48 h-auto mx-auto" />
            <p className="text-on-surface-variant mt-2">Welcome! Please log in to continue.</p>
        </div>
        <div className="bg-surface p-8 rounded-2xl shadow-m3-md border border-outline/30">
          <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-outline rounded-full text-sm font-medium text-primary bg-surface hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                  <GoogleIcon />
                  Sign in with Google
              </button>

              <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-outline/50" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-surface text-on-surface-variant">Or continue with</span>
                  </div>
              </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-4 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface-variant">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-surface-variant/70 border border-outline/50 rounded-lg text-sm shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-on-surface-variant">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-surface-variant/70 border border-outline/50 rounded-lg text-sm shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && (
                <div className="text-sm p-4 rounded-xl bg-danger/5 text-danger border border-danger/20 shadow-sm">
                    {error}
                </div>
            )}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-m3-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary/90 transition-all disabled:bg-on-surface-variant/50"
              >
                {isLoading ? 'Processing...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
