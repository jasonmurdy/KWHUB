import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UsersIcon, GoogleDriveIcon, TrashIcon, FolderKanbanIcon, PlusIcon, EditIcon, UploadCloudIcon, WebhookIcon, RefreshCwIcon, CalendarClockIcon, LinkIcon, FileTextIcon, XIcon, LayoutDashboardIcon, ListIcon, ShareIcon, ShieldCheckIcon, RocketIcon, ActivityIcon, CheckCircle2, RadioIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamGoal, MemberStatus, JobContact, TeamRole, User, Attachment } from '../types';
import TeamAvailabilityView from './TeamAvailabilityView';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { Modal } from './Modal';
import { FrequentCollaborators } from './FrequentCollaborators';
import { ActiveProjects } from './ActiveProjects';

const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    return Math.floor(interval) + "m ago";
};

const MemberPulseCard: React.FC<{ status: MemberStatus & { user?: User } }> = ({ status }) => {
    const typeColors: Record<string, string> = {
        'working': 'bg-success/10 text-success border-success/20',
        'ooo': 'bg-warning/10 text-warning border-warning/20',
        'celebrating': 'bg-secondary/10 text-secondary border-secondary/20'
    };
    return (
        <motion.div layout className={`p-4 rounded-2xl bg-surface border shadow-md flex items-start gap-4 ${typeColors[status.type] || 'border-outline/30'}`}>
            <img src={status.user?.avatarUrl} className="h-12 w-12 rounded-full border-2 border-surface object-cover shadow-sm" />
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-on-surface truncate">{status.user?.name}</h4>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wide opacity-70 mb-1">Updated {timeAgo(new Date(status.updatedAt))}</p>
                <div className="bg-surface/50 backdrop-blur-sm p-2 rounded-lg text-sm text-on-surface-variant italic leading-relaxed">&quot;{status.status}&quot;</div>
            </div>
        </motion.div>
    );
};

const RichGoalCard: React.FC<{ goal: TeamGoal; onUpdate: (updatedGoal: TeamGoal) => void; onDelete: () => void; members: User[] }> = ({ goal, onUpdate, onDelete, members }) => {
    const owner = members.find(m => m.id === goal.ownerId);
    return (
        <div className="bg-surface rounded-2xl border border-outline/40 shadow-m3-md p-5 flex flex-col h-full group relative">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-on-surface leading-tight">{goal.title}</h3>
                <button onClick={onDelete} className="p-1 text-on-surface-variant hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4" /></button>
            </div>
            <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold text-on-surface-variant mb-1"><span>Progress</span><span>{goal.progress}%</span></div>
                <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                </div>
                <input type="range" min="0" max="100" value={goal.progress} onChange={(e) => onUpdate({...goal, progress: parseInt(e.target.value)})} className="w-full h-1 mt-2 appearance-none cursor-pointer" />
            </div>
            <div className="flex-1 space-y-2 mb-4">
                {(goal.keyResults || []).map(kr => (
                    <div key={kr.id} className="flex items-start gap-2 group/kr">
                        <AnimatedCheckbox checked={kr.isCompleted} onChange={() => onUpdate({ ...goal, keyResults: (goal.keyResults || []).map(k => k.id === kr.id ? { ...k, isCompleted: !k.isCompleted } : k) })} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs flex-1 ${kr.isCompleted ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>{kr.title}</span>
                    </div>
                ))}
            </div>
            <div className="mt-auto pt-3 border-t border-outline/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {owner ? <img src={owner.avatarUrl} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center text-xs">?</div>}
                    <span className="text-xs text-on-surface-variant">{owner?.name || 'Unassigned'}</span>
                </div>
            </div>
        </div>
    );
};

const StakeholderModal: React.FC<{ stakeholder?: JobContact; onClose: () => void; onSave: (contact: JobContact) => void }> = ({ stakeholder, onClose, onSave }) => {
    const [name, setName] = useState(stakeholder?.name || '');
    const [role, setRole] = useState(stakeholder?.role || '');
    const [email, setEmail] = useState(stakeholder?.email || '');
    const [phone, setPhone] = useState(stakeholder?.phone || '');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !role.trim()) return;
        onSave({ id: stakeholder?.id || Math.random().toString(36).substr(2, 9), name: name.trim(), role: role.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
    };

    return (
        <Modal onClose={onClose} containerClassName="z-[200]">
            <form onSubmit={handleSave} className="flex flex-col h-full">
                <div className="p-6 border-b border-outline/30 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-on-surface">{stakeholder ? 'Edit Stakeholder' : 'Add Stakeholder'}</h2>
                    <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Full Name</label>
                        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Jenkins" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Role / Company</label>
                        <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Principal Broker" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@example.com" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Phone Number</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-primary/20" />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-outline/30 bg-surface/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-on-surface/5 rounded-xl transition-all">Cancel</button>
                    <button type="submit" disabled={!name.trim() || !role.trim()} className="px-8 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest shadow-m3-md hover:bg-primary/90 transition-all disabled:opacity-50">Save Contact</button>
                </div>
            </form>
        </Modal>
    );
};

const TeamsView: React.FC = () => {
    const { selectedTeam, addTeamFile, deleteTeamFile, viewFile, updateTeam, currentUser, backupTeamToDrive, openManageTeamMembersModal, allUsers, sendWeeklySummary, sendDailyStandup, triggerDailySummary, projects } = useAppContext();
    const { isAdmin } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'availability' | 'stakeholders' | 'files' | 'roles' | 'automation'>('overview');
    const [fileViewMode, setFileViewMode] = useState<'tile' | 'list'>('tile');
    
    const [myStatus, setMyStatus] = useState('');
    const [statusType, setStatusType] = useState<'working' | 'ooo' | 'celebrating'>('working');
    const [teamWebhook, setTeamWebhook] = useState('');
    const [weeklyWebhook, setWeeklyWebhook] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [editingStakeholder, setEditingStakeholder] = useState<JobContact | 'new' | null>(null);

    const teamUploadRef = useRef<HTMLInputElement>(null);
    const lastTeamId = useRef<string | null>(null);

    useEffect(() => { 
        if (selectedTeam && selectedTeam.id !== lastTeamId.current) {
            lastTeamId.current = selectedTeam.id;
            setTeamWebhook(selectedTeam.dailySummaryWebhook || ''); 
            setWeeklyWebhook(selectedTeam.weeklySummaryWebhook || '');
        }
    }, [selectedTeam]);

    const teamMembers = useMemo(() => {
        if (!selectedTeam || !allUsers) return [];
        return (selectedTeam.memberIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
    }, [selectedTeam, allUsers]);

    const handleUpdateStatus = async () => {
        if (!selectedTeam || !currentUser || !myStatus.trim()) return;
        const newStatus = { userId: currentUser.id, status: myStatus, updatedAt: new Date(), type: statusType };
        const updated = (selectedTeam.statuses || []).filter(s => s.userId !== currentUser.id);
        await updateTeam(selectedTeam.id, { statuses: [newStatus, ...updated] });
        setMyStatus('');
    };

    const handleTeamFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedTeam) return;
        setIsUploading(true);
        try {
            const fileRef = ref(storage, `team_files/${selectedTeam.id}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            await addTeamFile(selectedTeam.id, { id: Date.now().toString(), name: file.name, url: url, fileType: 'upload' });
            addToast({ type: 'success', title: 'File Uploaded' });
        } catch (error) {
            console.error("Upload failed", error);
            addToast({ type: 'error', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
            if (teamUploadRef.current) teamUploadRef.current.value = '';
        }
    };

    const handleAddLink = async () => {
        if (!selectedTeam) return;
        const name = prompt("Enter a name for this resource:");
        if (!name) return;
        const url = prompt("Enter the URL:");
        if (!url) return;
        await addTeamFile(selectedTeam.id, { id: Date.now().toString(), name, url, fileType: 'link' });
        addToast({ type: 'success', title: 'Link Added' });
    };

    const handleViewResource = (f: Attachment) => {
        viewFile(f);
    };

    const handleAddRole = async () => {
        if (!selectedTeam) return;
        const name = prompt("Enter Role Name (e.g. Transaction Coordinator):");
        if (!name) return;
        const newRole: TeamRole = { id: `role-${Date.now()}`, name, memberIds: [] };
        await updateTeam(selectedTeam.id, { roles: [...(selectedTeam.roles || []), newRole] });
        addToast({ type: 'success', title: 'Role Architecture Updated' });
    };

    const handleToggleRoleMember = async (roleId: string, userId: string) => {
        if (!selectedTeam) return;
        const updatedRoles = (selectedTeam.roles || []).map(role => {
            if (role.id === roleId) {
                const currentIds = new Set(role.memberIds);
                if (currentIds.has(userId)) currentIds.delete(userId);
                else currentIds.add(userId);
                return { ...role, memberIds: Array.from(currentIds) };
            }
            return role;
        });
        await updateTeam(selectedTeam.id, { roles: updatedRoles });
    };

    const handleSaveAutomation = async () => {
        if (!selectedTeam) return;
        await updateTeam(selectedTeam.id, { 
            dailySummaryWebhook: teamWebhook.trim(),
            weeklySummaryWebhook: weeklyWebhook.trim()
        });
        addToast({ type: 'success', title: 'Automation Protocol Synced' });
    };

    const handleTestWebhook = async (url: string, type: string) => {
        if (!url.trim()) {
            addToast({ type: 'error', title: 'Missing URL', message: 'Please provide a webhook URL first.' });
            return;
        }
        
        try {
            const payload = {
                text: `🚀 **Hub Connection Test: ${type}**\n\nThis is a test message from the **${selectedTeam?.name}** Command Center. Webhook connection is active and ready for mission updates!\n\n*Thread Identity: team_${selectedTeam?.id}*`,
                thread: {
                    threadKey: `team_${selectedTeam?.id}`
                }
            };

            await fetch(url.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                mode: 'no-cors'
            });

            addToast({ type: 'success', title: 'Test Dispatched', message: 'Check your Google Chat thread.' });
        } catch (error) {
            console.error("Webhook test failed:", error);
            addToast({ type: 'error', title: 'Test Failed', message: 'Check your webhook URL and try again.' });
        }
    };

    if (!selectedTeam) return <div className="h-full flex items-center justify-center p-8 text-on-surface-variant">Select a team to continue.</div>;

    const isOwner = selectedTeam.ownerId === currentUser?.id || isAdmin;

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">{selectedTeam.name}</h1>
                    <p className="text-on-surface-variant mt-1">{selectedTeam.description || 'Team Command Center'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={openManageTeamMembersModal} className="px-4 py-2 bg-surface border border-outline/30 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-on-surface/5"><UsersIcon className="h-4 w-4" /> Members</button>
                    {isOwner && <button onClick={() => backupTeamToDrive(selectedTeam.id)} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-semibold flex items-center gap-2 shadow-m3-md hover:bg-primary/90"><GoogleDriveIcon className="h-4 w-4" /> Backup</button>}
                </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-outline/40 shadow-md">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Set My Pulse</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select value={statusType} onChange={e => setStatusType(e.target.value as 'working' | 'ooo' | 'celebrating')} className="bg-surface-variant border border-outline/30 rounded-xl px-3 py-2 text-sm font-medium">
                        <option value="working">🚀 Working</option>
                        <option value="ooo">🏖️ OOO</option>
                        <option value="celebrating">🎉 Celebrating</option>
                    </select>
                    <input type="text" value={myStatus} onChange={e => setMyStatus(e.target.value)} placeholder="What's your focus right now?" className="flex-1 bg-surface-variant/50 border border-outline/30 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" onKeyDown={e => e.key === 'Enter' && handleUpdateStatus()} />
                    <button onClick={handleUpdateStatus} className="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold text-sm">Post</button>
                    <button 
                        onClick={() => {
                            sendDailyStandup(selectedTeam.id);
                        }} 
                        className="bg-secondary text-on-secondary px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                        title="Broadcast all team statuses to Google Chat"
                    >
                        <RadioIcon className="h-4 w-4" />
                        Broadcast Stand-up
                    </button>
                </div>
            </div>

            <div className="flex gap-2 border-b border-outline/30 overflow-x-auto no-scrollbar">
                {(['overview', 'goals', 'availability', 'stakeholders', 'files', 'roles', 'automation'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-colors ${activeTab === tab ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}>{tab}</button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FrequentCollaborators users={teamMembers} />
                            <ActiveProjects projects={projects} allUsers={allUsers} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Array.isArray(selectedTeam.statuses) ? selectedTeam.statuses : []).map(s => <MemberPulseCard key={s.userId} status={{ ...s, user: teamMembers.find(m => m.id === s.userId) }} />)}
                        </div>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-xl font-bold text-on-surface">Shared Resources</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex p-1 bg-surface-variant/50 rounded-xl border border-outline/10 mr-2">
                                    <button onClick={() => setFileViewMode('tile')} className={`p-1.5 rounded-lg transition-all ${fileViewMode === 'tile' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant/40'}`}><LayoutDashboardIcon className="w-4 h-4"/></button>
                                    <button onClick={() => setFileViewMode('list')} className={`p-1.5 rounded-lg transition-all ${fileViewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant/40'}`}><ListIcon className="w-4 h-4"/></button>
                                </div>
                                <button onClick={() => teamUploadRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-surface border border-outline/30 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-on-surface/5 disabled:opacity-50"><UploadCloudIcon className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload'}</button>
                                <input type="file" ref={teamUploadRef} className="hidden" onChange={handleTeamFileUpload} />
                                <button onClick={handleAddLink} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold flex items-center gap-2 shadow-m3-md hover:bg-primary/90"><LinkIcon className="h-4 w-4" /> Link</button>
                            </div>
                        </div>
                        
                        {fileViewMode === 'tile' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(Array.isArray(selectedTeam.files) ? selectedTeam.files : []).map(f => (
                                    <div key={f.id} onClick={() => handleViewResource(f)} className="p-5 bg-surface rounded-2xl border border-outline/30 shadow-sm cursor-pointer hover:border-primary hover:shadow-m3-md transition-all group relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-2.5 bg-surface-variant rounded-xl text-primary shadow-sm">
                                                {f.fileType === 'drive' ? <GoogleDriveIcon className="h-6 w-6" /> : f.fileType === 'link' ? <LinkIcon className="h-6 w-6" /> : <FileTextIcon className="h-6 w-6" />}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {f.fileType === 'link' && (
                                                    <button onClick={(e) => { e.stopPropagation(); window.open(f.url, '_blank'); }} className="p-1.5 text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-all bg-surface rounded-lg border border-outline/10 shadow-sm" title="Open Link Externally">
                                                        <ShareIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete resource?')) deleteTeamFile(selectedTeam.id, f.id); }} className="p-1.5 text-on-surface-variant hover:text-danger opacity-0 group-hover:opacity-100 transition-all bg-surface rounded-lg border border-outline/10 shadow-sm"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-sm text-on-surface truncate pr-2">{f.name}</h4>
                                        <p className="text-[10px] text-on-surface-variant/50 uppercase font-black tracking-widest mt-1.5 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${f.fileType === 'link' ? 'bg-secondary' : 'bg-primary'}`} />{f.fileType}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-surface rounded-2xl border border-outline/10 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[auto_1fr_120px_100px] gap-4 px-6 py-3 bg-surface-variant/20 border-b border-outline/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                                    <div className="w-8"></div>
                                    <div>Resource Name</div>
                                    <div>Protocol</div>
                                    <div className="text-right">Action</div>
                                </div>
                                {(Array.isArray(selectedTeam.files) ? selectedTeam.files : []).map(f => (
                                    <div key={f.id} onClick={() => handleViewResource(f)} className="grid grid-cols-[auto_1fr_120px_100px] gap-4 px-6 py-4 border-b border-outline/5 last:border-0 hover:bg-primary/[0.02] cursor-pointer group items-center transition-colors">
                                        <div className="w-8 flex items-center justify-center text-primary">{f.fileType === 'drive' ? <GoogleDriveIcon className="w-4 h-4" /> : f.fileType === 'link' ? <LinkIcon className="h-4 w-4" /> : <FileTextIcon className="w-4 h-4" />}</div>
                                        <div className="text-sm font-bold text-on-surface truncate">{f.name}</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">{f.fileType}</div>
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {f.fileType === 'link' && <button onClick={(e) => { e.stopPropagation(); window.open(f.url, '_blank'); }} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg" title="External Access"><ShareIcon className="w-4 h-4"/></button>}
                                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete resource?')) deleteTeamFile(selectedTeam.id, f.id); }} className="p-1.5 text-on-surface-variant hover:text-danger rounded-lg"><TrashIcon className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {(selectedTeam.files || []).length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[3rem] text-on-surface-variant/30">
                                <FolderKanbanIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-[0.2em] text-sm text-center">Team Vault Empty</p>
                                <p className="text-xs font-bold mt-2 opacity-60">Store listing agreements, contracts, and shared assets here.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'availability' && <TeamAvailabilityView />}
                {activeTab === 'goals' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-on-surface">Team Goals</h2><button onClick={() => {const t = prompt("Goal Title:"); if(t) updateTeam(selectedTeam.id, { goals: [...(selectedTeam.goals || []), { id: Date.now().toString(), title: t, progress: 0, color: '#3b82f6', status: 'on-track', ownerId: currentUser?.id, keyResults: [] }] })}} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-primary/20"><PlusIcon className="h-4 w-4" /> New Goal</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(Array.isArray(selectedTeam.goals) ? selectedTeam.goals : []).map(g => <RichGoalCard key={g.id} goal={g} members={teamMembers} onDelete={() => updateTeam(selectedTeam.id, { goals: selectedTeam.goals?.filter(x => x.id !== g.id) })} onUpdate={(ug) => updateTeam(selectedTeam.id, { goals: selectedTeam.goals?.map(x => x.id === ug.id ? ug : x) })} />)}
                        </div>
                    </div>
                )}
                {activeTab === 'stakeholders' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-on-surface">Stakeholder Directory</h2>
                            <button onClick={() => setEditingStakeholder('new')} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold flex items-center gap-2 shadow-m3-md"><PlusIcon className="h-4 w-4" /> Add Contact</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Array.isArray(selectedTeam.stakeholders) ? selectedTeam.stakeholders : []).map(s => (
                                <div key={s.id} className="group flex items-center gap-3 p-3 bg-surface border border-outline/20 rounded-2xl shadow-sm relative">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xs shrink-0">{s.name.charAt(0)}</div>
                                    <div className="flex-1 min-w-0"><h4 className="font-bold text-xs text-on-surface truncate">{s.name}</h4><p className="text-[10px] font-medium text-on-surface-variant/70 truncate">{s.role}</p></div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface/80 backdrop-blur-sm rounded-lg p-0.5">
                                        <button onClick={() => setEditingStakeholder(s)} className="p-1 text-on-surface-variant hover:text-primary"><EditIcon className="w-3 h-3" /></button>
                                        <button onClick={() => {if(confirm('Remove?')) updateTeam(selectedTeam.id, { stakeholders: (selectedTeam.stakeholders || []).filter(x => x.id !== s.id) })}} className="p-1 text-on-surface-variant hover:text-danger"><TrashIcon className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-on-surface uppercase tracking-tight">Team Architecture</h2>
                                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">Define operational responsibilities</p>
                            </div>
                            <button 
                                onClick={handleAddRole}
                                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest shadow-m3-sm hover:bg-primary/90 flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Role
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(Array.isArray(selectedTeam.roles) ? selectedTeam.roles : []).map((role) => (
                                <div key={role.id} className="bg-surface rounded-[2.5rem] border border-outline/30 p-8 shadow-sm flex flex-col group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform"><ShieldCheckIcon className="w-32 h-32 text-primary" /></div>
                                    
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="min-w-0">
                                            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-2 truncate">{role.name}</h3>
                                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">{role.memberIds.length} Assigned Members</p>
                                        </div>
                                        <button 
                                            onClick={() => { if(confirm('Dissolve this role?')) updateTeam(selectedTeam.id, { roles: selectedTeam.roles?.filter(r => r.id !== role.id) }); }}
                                            className="p-2 text-on-surface-variant/20 hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em]">Assign Operatives</p>
                                        <div className="flex flex-wrap gap-2">
                                            {teamMembers.map(member => {
                                                const isAssigned = role.memberIds.includes(member.id);
                                                return (
                                                    <button 
                                                        key={member.id}
                                                        onClick={() => handleToggleRoleMember(role.id, member.id)}
                                                        className={`flex items-center gap-2 p-1 pr-3 rounded-full border transition-all
                                                            ${isAssigned ? 'bg-primary/10 border-primary/20 text-primary shadow-sm' : 'bg-surface border-outline/10 text-on-surface-variant/40 hover:border-outline/30 hover:bg-surface-variant/5'}
                                                        `}
                                                    >
                                                        <img src={member.avatarUrl} className={`w-6 h-6 rounded-full border-2 border-surface ${!isAssigned && 'grayscale'}`} />
                                                        <span className="text-[10px] font-bold">{member.name.split(' ')[0]}</span>
                                                        {isAssigned && <CheckCircle2 className="w-3 h-3" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(selectedTeam.roles || []).length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center bg-surface-variant/5 border-4 border-dashed border-outline/10 rounded-[3rem] text-on-surface-variant/30">
                                    <ShieldCheckIcon className="w-16 h-16 mb-4 opacity-10" />
                                    <p className="font-black uppercase tracking-[0.2em]">No Roles Defined</p>
                                    <p className="text-[10px] font-bold mt-2 uppercase">Create roles to standardize task assignments</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="animate-fade-in space-y-8 max-w-2xl">
                        <header>
                            <h2 className="text-xl font-bold text-on-surface uppercase tracking-tight">Team Engines</h2>
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">Automate outbound communications</p>
                        </header>

                        <div className="bg-surface rounded-[2.5rem] border border-outline/30 p-8 shadow-sm space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform"><WebhookIcon className="w-48 h-48 text-primary" /></div>
                            
                            <section>
                                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <ActivityIcon className="w-4 h-4" /> Daily Pulse Sync
                                </h3>
                                <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-70 mb-6">
                                    Define a webhook URL to receive a daily transmission of team progress, achieved goals, and overdue objectives. (Supports Google Chat & Slack)
                                </p>
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Endpoint Uplink URL</label>
                                        <input 
                                            type="url" 
                                            value={teamWebhook}
                                            onChange={e => setTeamWebhook(e.target.value)}
                                            placeholder="https://chat.googleapis.com/v1/spaces/..."
                                            className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button 
                                            onClick={() => handleTestWebhook(teamWebhook, 'Daily Pulse Sync')}
                                            className="px-6 py-4 bg-surface border border-outline/30 text-on-surface rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-on-surface/5 transition-all flex items-center gap-3"
                                        >
                                            <RocketIcon className="w-4 h-4" /> Test Connection
                                        </button>
                                        <button 
                                            onClick={() => selectedTeam && triggerDailySummary(selectedTeam.id)}
                                            className="px-6 py-4 bg-secondary text-on-secondary rounded-2xl text-xs font-black uppercase tracking-widest shadow-m3-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                                            title="Manually trigger the daily summary webhook for this team"
                                        >
                                            <ActivityIcon className="w-4 h-4" /> Trigger Daily Summary
                                        </button>
                                        <button 
                                            onClick={handleSaveAutomation}
                                            className="px-10 py-4 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-m3-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                                        >
                                            <RefreshCwIcon className="w-4 h-4" /> Sync Protocol
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-outline/10">
                                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <CalendarClockIcon className="w-4 h-4" /> Weekly Performance Summary
                                </h3>
                                <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-70 mb-6">
                                    A comprehensive transmission of the week&apos;s achievements, velocity metrics, and upcoming mission objectives.
                                </p>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Weekly Endpoint URL</label>
                                        <input 
                                            type="url" 
                                            value={weeklyWebhook}
                                            onChange={e => setWeeklyWebhook(e.target.value)}
                                            placeholder="https://chat.googleapis.com/v1/spaces/..."
                                            className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button 
                                            onClick={() => handleTestWebhook(weeklyWebhook, 'Weekly Summary')}
                                            className="px-6 py-4 bg-surface border border-outline/30 text-on-surface rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-on-surface/5 transition-all flex items-center gap-3"
                                        >
                                            <RocketIcon className="w-4 h-4" /> Test Connection
                                        </button>
                                        <button 
                                            onClick={() => selectedTeam && sendWeeklySummary(selectedTeam.id)}
                                            className="px-10 py-4 bg-secondary text-on-secondary rounded-2xl text-xs font-black uppercase tracking-widest shadow-m3-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                                        >
                                            <CalendarClockIcon className="w-4 h-4" /> Dispatch Summary
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0"><RocketIcon className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-xs font-black text-on-surface uppercase tracking-tight mb-1">Operational Intelligence</p>
                                    <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">
                                        When active, the Hub will push a status summary at 08:00 EST daily to this endpoint, ensuring all operatives are aligned on mission objectives.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editingStakeholder && (
                    <StakeholderModal stakeholder={editingStakeholder === 'new' ? undefined : editingStakeholder} onClose={() => setEditingStakeholder(null)} onSave={async (c) => {
                        const cur = [...(selectedTeam.stakeholders || [])];
                        const idx = cur.findIndex(s => s.id === c.id);
                        if(idx > -1) cur[idx] = c; else cur.push(c);
                        await updateTeam(selectedTeam.id, { stakeholders: cur });
                        setEditingStakeholder(null);
                    }} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeamsView;