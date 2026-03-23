
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, SearchIcon } from './icons';
import { motion, Variants } from 'framer-motion';

// Animation variants
const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "50px", opacity: 0, scale: 0.95 },
  visible: {
    y: "0px",
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: { y: "50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 }, pointerEvents: "none" },
};

const CreateTeamModal: React.FC = () => {
  const { closeCreateTeamModal, createTeam, allUsers, currentUser } = useAppContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteeIds, setInviteeIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleInvitee = (userId: string) => {
    const newSelection = new Set(inviteeIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setInviteeIds(newSelection);
  };
  
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return allUsers.filter(user => 
        user.id !== currentUser?.id &&
        !inviteeIds.has(user.id) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allUsers, currentUser, inviteeIds]);

  const invitees = useMemo(() => {
      return allUsers.filter(user => inviteeIds.has(user.id));
  }, [inviteeIds, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await createTeam(name, description, Array.from(inviteeIds));
      closeCreateTeamModal();
      // Reset form
      setName('');
      setDescription('');
      setInviteeIds(new Set());
    } catch (error) {
      console.error("Failed to create team:", error);
      alert("There was an error creating your team. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={closeCreateTeamModal}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="bg-surface border border-outline/30 rounded-3xl w-full h-full max-w-full lg:max-w-2xl max-h-[90vh] flex flex-col shadow-m3-lg"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 border-b border-outline/30 flex justify-between items-center">
            <h2 className="text-xl font-bold text-on-surface">Create New Team</h2>
            <button type="button" onClick={closeCreateTeamModal} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-on-surface-variant mb-1">Team Name</label>
              <input type="text" id="team-name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="team-description" className="block text-sm font-medium text-on-surface-variant mb-1">Description (Optional)</label>
              <textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Invite Members</label>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/50" />
                    <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg pl-10 pr-4 py-2 text-sm"
                    />
                </div>

                {searchTerm && (
                    <div className="mt-2 max-h-40 overflow-y-auto bg-surface border border-outline/30 rounded-lg">
                        {searchResults.map(user => (
                            <button
                                type="button"
                                key={user.id}
                                onClick={() => { handleToggleInvitee(user.id); setSearchTerm(''); }}
                                className="w-full text-left flex items-center gap-3 p-2 hover:bg-on-surface/5"
                            >
                                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
                                <div>
                                    <p className="font-medium text-sm">{user.name}</p>
                                    <p className="text-xs text-on-surface-variant">{user.email}</p>
                                </div>
                            </button>
                        ))}
                        {searchResults.length === 0 && <p className="text-center text-xs text-on-surface-variant p-4">No users found.</p>}
                    </div>
                )}
                
                <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase text-on-surface-variant mb-2">Members to Invite ({invitees.length})</h4>
                    <div className="flex flex-wrap gap-2">
                        {currentUser && (
                            <div className="flex items-center gap-2 p-1 pr-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
                                <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-6 w-6 rounded-full" />
                                <span className="text-sm font-medium">{currentUser.name} (You)</span>
                            </div>
                        )}
                        {invitees.map(user => (
                            <div key={user.id} className="flex items-center gap-2 p-1 pr-2 rounded-full bg-surface-variant border border-outline/50">
                                <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                                <span className="text-sm font-medium">{user.name}</span>
                                <button type="button" onClick={() => handleToggleInvitee(user.id)} className="text-on-surface-variant/50 hover:text-on-surface"><XIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          <div className="p-4 border-t border-outline/30 bg-surface/50 rounded-b-3xl flex justify-end items-center">
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Team & Invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateTeamModal;
