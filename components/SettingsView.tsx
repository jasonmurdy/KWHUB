
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { WebhookIcon, GavelIcon, EditIcon, LinkIcon, GoogleDriveIcon, CalendarDaysIcon, RefreshCwIcon, PlusIcon, SettingsIcon } from './icons';
import { ThemePicker } from './ThemePicker';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPanel: React.FC = () => {
    const { signUp } = useAuth();
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signUp(name, email, password);
            addToast({ type: 'success', title: 'User Created', message: `Account for ${email} has been successfully created.` });
            setName('');
            setEmail('');
            setPassword('');
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Admin user creation failed:", err);
            addToast({ type: 'error', title: 'Creation Failed', message: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card p-8 rounded-2xl shadow-m3-sm border-2 border-primary/30">
            <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-3"><GavelIcon className="h-5 w-5 text-primary"/>Admin Panel</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
                <h3 className="text-lg font-semibold text-on-surface">Create New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-surface-variant/70 border border-outline rounded-lg p-2 text-on-surface"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-surface-variant/70 border border-outline rounded-lg p-2 text-on-surface"/>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Temporary Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-surface-variant/70 border border-outline rounded-lg p-2 text-on-surface"/>
                </div>
                <div className="flex justify-end">
                     <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50"
                        >
                        {isLoading ? 'Creating...' : 'Create User Account'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const SettingsView: React.FC = () => {
  const { currentUser, userProfile, logOut, updateUserProfile, changePassword, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setDashboardLayout, setActiveView, generateMissingShareTokens } = useAppContext();
  const { addToast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [googleChatWebhook, setGoogleChatWebhook] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    mentions: true,
    assignments: true,
    deadlines: true,
    goals: true,
    forms: true,
    handoffs: true,
    teamAlerts: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  // ID-Lock to prevent background updates from wiping user typing
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (userProfile && userProfile.id !== lastUserId.current) {
      lastUserId.current = userProfile.id;
      setName(userProfile.name);
      setEmail(userProfile.email);
      setGoogleChatWebhook(userProfile.googleChatWebhook || '');
      if (userProfile.notificationPreferences) {
          setNotificationPreferences(userProfile.notificationPreferences);
      }
      setHasChanges(false);
    }
  }, [userProfile]);

  const handleNameChange = (val: string) => {
      setName(val);
      setHasChanges(true);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !name.trim()) return;
    setIsSaving(true);
    try {
      await updateUserProfile({ 
          name: name.trim(),
          googleChatWebhook: googleChatWebhook.trim(),
          notificationPreferences
      });
      setHasChanges(false);
      addToast({ type: 'success', title: 'Profile Updated' });
    } catch (error) {
      console.error("Error updating profile:", error);
      addToast({ type: 'error', title: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await updateUserProfile({ avatarFile: file });
      addToast({ type: 'success', title: 'Avatar updated' });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      addToast({ type: 'error', title: 'Failed to upload avatar' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordChangeSuccess(false);

    if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
    }
    if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters long.");
        return;
    }

    setIsChangingPassword(true);
    try {
        await changePassword(currentPassword, newPassword);
        setPasswordChangeSuccess(true);
        addToast({ type: 'success', title: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordChangeSuccess(false), 3000);
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error(err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            setPasswordError('Incorrect current password.');
        } else if (err.code === 'auth/weak-password') {
            setPasswordError('Password is too weak. Please use a stronger password.');
        } else if (err.code === 'auth/requires-recent-login') {
            setPasswordError('This action requires recent sign-in. Please log out and log back in to change your password.');
        } else {
            setPasswordError(err.message || 'An unexpected error occurred.');
        }
    } finally {
        setIsChangingPassword(false);
    }
  };

  const handleResetDashboard = () => {
    if (window.confirm("Are you sure you want to reset your dashboard layout?")) {
        setDashboardLayout(['welcome', 'stats', 'tasks', 'activity']);
        addToast({ type: 'success', title: 'Dashboard reset' });
    }
  };

  const handleDefaultViewChange = async (view: 'kanban' | 'list' | 'gantt' | 'table') => {
      if (userProfile?.defaultProjectView === view) return;
      try {
          await updateUserProfile({ defaultProjectView: view });
          addToast({ type: 'success', title: 'Default view updated!' });
      } catch {
          addToast({ type: 'error', title: 'Failed to update preference.' });
      }
  };

  if (!userProfile) return null;
  const isPasswordUser = currentUser?.providerIds?.includes('password');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-1">Manage your account and preferences.</p>
      </div>

      <AnimatePresence>
        {hasChanges && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <RefreshCwIcon className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <p className="text-sm font-black text-primary uppercase tracking-widest">You have unsaved changes</p>
                </div>
                <button 
                    onClick={handleProfileSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:scale-105 transition-all"
                >
                    {isSaving ? 'Saving...' : 'Sync Profile'}
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      {isAdmin && <AdminPanel />}

      {/* Administrative Tools */}
      {isAdmin && (
        <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
            <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-8">Administrative Tools</h2>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-sm font-bold text-on-surface">Generate Missing Share Tokens</h3>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-1">Generate share tokens for all existing tasks that lack them.</p>
                </div>
                <button
                    onClick={generateMissingShareTokens}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-m3-md"
                >
                    Generate Tokens
                </button>
            </div>
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-8 flex items-center gap-3">
            <EditIcon className="w-5 h-5 text-primary" /> Profile Identity
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative flex-shrink-0">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-32 h-32 rounded-[2.5rem] object-cover shadow-m3-md transition-transform group-hover:scale-[1.02]"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                        <EditIcon className="w-8 h-8 text-white" />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-on-primary rounded-2xl flex items-center justify-center border-4 border-surface shadow-md hover:scale-110 transition-transform"
                >
                    {isUploading ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="h-5 w-5" />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" hidden />
            </div>
            
            <div className="flex-1 w-full space-y-6">
                <div>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Full Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => handleNameChange(e.target.value)} 
                        required 
                        className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-lg font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Account Email</label>
                    <input type="email" value={email} disabled className="w-full bg-surface-variant/10 border border-outline/5 rounded-2xl px-5 py-4 text-sm font-medium text-on-surface-variant/50 cursor-not-allowed"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2"><WebhookIcon className="w-3 h-3" /> Personal Google Chat Webhook (Private Notifications)</span>
                        {googleChatWebhook && (
                            <button 
                                onClick={async () => {
                                    try {
                                        await fetch(googleChatWebhook, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ text: `🔔 *Test Notification*\n\nThis is a test message to verify your personal webhook configuration in ProjectFlow.` }),
                                            mode: 'no-cors'
                                        });
                                        addToast({ type: 'success', title: 'Test Message Sent' });
                                    } catch {
                                        addToast({ type: 'error', title: 'Test Failed', message: 'Could not send test message.' });
                                    }
                                }}
                                className="text-[10px] text-primary hover:underline"
                            >
                                Test Webhook
                            </button>
                        )}
                    </label>
                    <input 
                        type="url" 
                        value={googleChatWebhook} 
                        onChange={(e) => { setGoogleChatWebhook(e.target.value); setHasChanges(true); }} 
                        placeholder="https://chat.googleapis.com/v1/spaces/..."
                        className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 ring-primary/20 outline-none transition-all"
                    />
                    <p className="text-[10px] text-on-surface-variant/60 mt-2 italic">Add your personal webhook here to receive private notifications for tasks assigned specifically to you.</p>
                </div>
            </div>
          </div>

          <div className="pt-8 border-t border-outline/10">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-tight mb-6 flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-primary" /> Notification Controls
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(notificationPreferences) as Array<keyof typeof notificationPreferences>).map((key) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-surface-variant/20 rounded-2xl border border-outline/5">
                          <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">
                              {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <button
                              type="button"
                              onClick={() => {
                                  setNotificationPreferences(prev => ({ ...prev, [key]: !prev[key] }));
                                  setHasChanges(true);
                              }}
                              className={`w-12 h-6 rounded-full transition-all relative ${notificationPreferences[key] ? 'bg-primary' : 'bg-outline/20'}`}
                          >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationPreferences[key] ? 'left-7' : 'left-1'}`} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-m3-md
                    ${hasChanges ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-surface border border-outline/20 text-on-surface-variant opacity-40 cursor-not-allowed'}
                `}
            >
                {isSaving ? 'Syncing...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Workspace Integrations */}
      <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30 relative overflow-hidden group">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-4 flex items-center gap-3">
            <LinkIcon className="h-6 w-6 text-primary" /> Cloud Orchestration
        </h2>
        <p className="text-on-surface-variant text-sm font-medium leading-relaxed mb-8 max-w-lg">
            KW Hub synchronizes with your entire Google workspace. Manage task calendars, drive attachments, and automated backups from a centralized integration hub.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-variant/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant border border-outline/10">
                <GoogleDriveIcon className="h-4 w-4" /> Drive
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-variant/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant border border-outline/10">
                <CalendarDaysIcon className="h-4 w-4" /> Calendar
            </div>
            <div className="flex-1" />
            <button 
                onClick={() => setActiveView('integrations')}
                className="px-6 py-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
                Connect Workspace
            </button>
        </div>
      </div>

      {/* Appearance & Prefs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
            <h2 className="text-lg font-black text-on-surface uppercase tracking-tight mb-6">Visual Engine</h2>
            <ThemePicker currentTheme={theme} onSelect={setTheme} />
          </div>

          <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30 flex flex-col">
            <h2 className="text-lg font-black text-on-surface uppercase tracking-tight mb-8">System Preferences</h2>
            <div className="space-y-8 flex-1">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-on-surface">Dashboard Layout</h3>
                        <p className="text-[11px] text-on-surface-variant font-medium mt-1">Revert widgets to factory default orientation.</p>
                    </div>
                    <button onClick={handleResetDashboard} className="px-4 py-2 bg-surface-variant/50 hover:bg-surface-variant border border-outline/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reset</button>
                </div>
                <div className="pt-6 border-t border-outline/10">
                    <h3 className="text-sm font-bold text-on-surface mb-4">Board Entry Point</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {(['kanban', 'list', 'gantt', 'table'] as const).map(view => {
                            const isActive = userProfile?.defaultProjectView === view || (!userProfile?.defaultProjectView && view === 'kanban');
                            return (
                                <button
                                    key={view}
                                    onClick={() => handleDefaultViewChange(view)}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isActive ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bg-surface-variant/20 border-outline/10 text-on-surface-variant hover:bg-surface-variant/40'}`}
                                >
                                    {view}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
          </div>
      </div>
      
      {/* Account Control */}
      <div className="bg-card p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-8">Security & Access</h2>

        {isPasswordUser && (
            <form onSubmit={handleChangePassword} className="space-y-6 mb-10 pb-10 border-b border-outline/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Current PIN</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">New PIN</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Confirm PIN</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none" />
                    </div>
                </div>
                
                <div className="flex justify-between items-center">
                    <div className="flex-1">
                        {passwordError && <p className="text-xs font-bold text-danger uppercase tracking-tight">{passwordError}</p>}
                        {passwordChangeSuccess && <p className="text-xs font-bold text-success uppercase tracking-tight">Access updated successfully.</p>}
                    </div>
                    <button type="submit" disabled={isChangingPassword} className="px-8 py-3 bg-on-surface text-surface rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-on-surface/90 transition-all disabled:opacity-30">
                        {isChangingPassword ? 'Updating...' : 'Cycle Access Keys'}
                    </button>
                </div>
            </form>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
                <h3 className="text-sm font-bold text-on-surface">Terminate Session</h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-1">Safely sign out of your KW Hub account on this device.</p>
            </div>
            <button
                onClick={logOut}
                className="px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-danger bg-danger/10 rounded-2xl hover:bg-danger hover:text-white transition-all border border-danger/20"
            >
                End Session
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
