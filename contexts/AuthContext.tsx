
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { auth, db, storage } from '../services/firebase';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithPopup,
    linkWithPopup,
    GoogleAuthProvider,
    unlink,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from '../types';
import { GOOGLE_API_SCOPES, GOOGLE_CLIENT_ID } from '../constants';

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (resp: GoogleTokenResponse) => void;
      }) => {
        requestAccessToken: (options: { prompt: string }) => void;
        callback: (resp: GoogleTokenResponse) => void;
      };
    };
  };
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

declare const window: Window & typeof globalThis;

type SimpleUser = {
  uid: string;
  email: string | null;
  providerIds: string[];
};

interface AuthContextType {
  currentUser: SimpleUser | null;
  userProfile: User | null;
  googleAccessToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (name:string, email:string, password:string) => Promise<void>;
  logIn: (email:string, password:string) => Promise<void>;
  logOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  updateUserProfile: (updates: Partial<User> & { avatarFile?: File }) => Promise<void>;
  clearGoogleToken: () => void;
  getValidGoogleToken: (interactive?: boolean) => Promise<string | null>;
  requestGoogleAccess: () => Promise<{ token: string; email: string | null }>;
  fetchGoogleTaskLists: () => Promise<{ id: string; title: string }[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => localStorage.getItem('googleAccessToken'));
  const [tokenExpiration, setTokenExpiration] = useState<number | null>(() => {
    const stored = localStorage.getItem('googleTokenExpiration');
    return stored ? parseInt(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const tokenClient = useRef<{
    requestAccessToken: (options: { prompt: string }) => void;
    callback: (resp: GoogleTokenResponse) => void;
  } | null>(null);

  const isAdmin = useMemo(() => userProfile?.email === 'jason.murdy@kw.com', [userProfile]);

  const clearGoogleToken = useCallback(() => {
    setGoogleAccessToken(null);
    setTokenExpiration(null);
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('googleTokenExpiration');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !tokenClient.current) {
        const initClient = () => {
             if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                tokenClient.current = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: GOOGLE_API_SCOPES,
                    callback: () => {}, 
                });
            } else {
                setTimeout(initClient, 500);
            }
        };
        initClient();
    }
  }, []);

  const requestGoogleAccess = useCallback((): Promise<{ token: string; email: string | null }> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient.current) {
             reject("Google Identity Services not ready.");
             return;
        }
        
        tokenClient.current.callback = async (resp: GoogleTokenResponse) => {
            if (resp.error) {
                reject(resp);
            } else {
                const expiresIn = resp.expires_in || 3599;
                const newExpiration = Date.now() + (expiresIn * 1000);
                const token = resp.access_token;
                setGoogleAccessToken(token);
                setTokenExpiration(newExpiration);
                localStorage.setItem('googleAccessToken', token);
                localStorage.setItem('googleTokenExpiration', newExpiration.toString());
                
                const email = await fetchAuthenticatedEmail(token);
                resolve({ token, email });
            }
        };

        tokenClient.current.requestAccessToken({ prompt: 'select_account' });
    });
  }, []);

  const getValidGoogleToken = useCallback(async (interactive: boolean = false) => {
    if (googleAccessToken && tokenExpiration && Date.now() < tokenExpiration - 60000) {
        return googleAccessToken;
    }
    
    if (interactive) {
        try {
            const res = await requestGoogleAccess();
            return res.token;
        } catch (e) {
            console.error("Interactive token request failed", e);
            return null;
        }
    }

    return null;
  }, [googleAccessToken, tokenExpiration, requestGoogleAccess]);

  const fetchAuthenticatedEmail = async (token: string): Promise<string | null> => {
      try {
          const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
              const data = await resp.json();
              return data.email || null;
          }
      } catch (e) {
          console.error("Failed to fetch account email:", e);
      }
      return null;
  };

  const fetchGoogleTaskLists = useCallback(async (): Promise<{ id: string; title: string }[]> => {
      const token = await getValidGoogleToken(false);
      if (!token) return [];
      try {
          const resp = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
              const data = await resp.json();
              return (data.items || []).map((l: { id: string; title: string }) => ({ id: l.id, title: l.title }));
          }
      } catch (e) {
          console.error("Failed to fetch task lists:", e);
      }
      return [];
  }, [getValidGoogleToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user ? { uid: user.uid, email: user.email, providerIds: user.providerData.map(p => p.providerId) } : null);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
            if (user.providerData.some(p => p.providerId === 'google.com')) {
                const newUserProfile: User = {
                    id: user.uid,
                    name: user.displayName || 'Google User',
                    email: user.email || '',
                    avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                    googleCalendarEnabled: true,
                    googleDriveEnabled: true,
                };
                await setDoc(userDocRef, newUserProfile);
                setUserProfile(newUserProfile);
            }
        }
      } else {
        setUserProfile(null);
        clearGoogleToken();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [clearGoogleToken]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      id: user.uid,
      name,
      email: user.email,
      avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}`, 
      googleCalendarEnabled: false,
      googleDriveEnabled: false,
    });
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);
  
  const logOut = useCallback(async () => {
    await signOut(auth);
    clearGoogleToken();
  }, [clearGoogleToken]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) throw new Error("No session.");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || 'Google User',
          email: user.email || '',
          avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          googleCalendarEnabled: true,
          googleDriveEnabled: true,
        });
      }
    } catch (error) {
      console.error("Popup Error:", error);
      throw error;
    }
  }, []);
  
  const linkGoogleAccount = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No user session.");
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
  }, []);

  const updateUserProfileFn = useCallback(async (updates: Partial<User> & { avatarFile?: File }) => {
    if (!auth.currentUser || !userProfile) throw new Error("No profile session.");
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const finalUpdates: Partial<User> = { ...updates };
    if (updates.avatarFile) {
        const storagePath = `avatars/${auth.currentUser.uid}/${updates.avatarFile.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, updates.avatarFile);
        finalUpdates.avatarUrl = await getDownloadURL(fileRef);
        delete (finalUpdates as Partial<User> & { avatarFile?: File }).avatarFile;
    }
    await updateDoc(userDocRef, finalUpdates as Record<string, unknown>);
    setUserProfile(prev => prev ? { ...prev, ...finalUpdates } : null);
  }, [userProfile]);

  const disconnectGoogle = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No profile session.");
    try {
        await unlink(auth.currentUser, 'google.com');
        if (userProfile) {
            await updateUserProfileFn({ 
                googleCalendarEnabled: false, 
                googleDriveEnabled: false,
                googleTasksEnabled: false,
                googleCalendarEmail: null,
                googleDriveEmail: null,
                googleTasksEmail: null,
                selectedTasksListId: null,
                selectedTasksListName: null
            });
        }
        clearGoogleToken();
    } catch (error) {
        console.error("Disconnect Error:", error);
        throw error;
    }
  }, [userProfile, clearGoogleToken, updateUserProfileFn]);

  const value = useMemo(() => ({
    currentUser, userProfile, googleAccessToken, loading, isAdmin, 
    signUp, logIn, logOut, changePassword, signInWithGoogle, 
    linkGoogleAccount, disconnectGoogle, updateUserProfile: updateUserProfileFn,
    clearGoogleToken, getValidGoogleToken, requestGoogleAccess, fetchGoogleTaskLists
  }), [
    currentUser, userProfile, googleAccessToken, loading, isAdmin, 
    signUp, logIn, logOut, changePassword, signInWithGoogle, 
    linkGoogleAccount, disconnectGoogle, updateUserProfileFn,
    clearGoogleToken, getValidGoogleToken, requestGoogleAccess, fetchGoogleTaskLists
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
