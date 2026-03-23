
import React, { useState, useEffect, useMemo } from 'react';
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

const ManageTeamMembersModal: React.FC = () => {
  const { closeManageTeamMembersModal, updateTeam, allUsers, selectedTeam } = useAppContext();
  
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedTeam) {
      setSelectedMemberIds(new Set(selectedTeam.memberIds));
    }
  }, [selectedTeam]);

  const filteredUsers = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    let users = [...allUsers];

    if (searchTerm) {
      users = users.filter(user =>
        user.name.toLowerCase().includes(lowerCaseSearch) ||
        user.email.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    users.sort((a, b) => {
        const aIsSelected = selectedMemberIds.has(a.id);
        const bIsSelected = selectedMemberIds.has(b.id);
        if (aIsSelected === bIsSelected) {
            return a.name.localeCompare(b.name);
        }
        return aIsSelected ? -1 : 1;
    });

    return users;
  }, [searchTerm, allUsers, selectedMemberIds]);

  const handleToggleMember = (userId: string) => {
    if (userId === selectedTeam?.ownerId) return; // Owner cannot be removed
    const newSelection = new Set(selectedMemberIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMemberIds(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setIsLoading(true);
    try {
      await updateTeam(selectedTeam.id, { memberIds: Array.from(selectedMemberIds) });
      closeManageTeamMembersModal();
    } catch (error) {
      console.error("Failed to update team members:", error);
      alert("There was an error updating the team. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedTeam) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={closeManageTeamMembersModal}
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
        <div className="p-6 border-b border-outline/30 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Manage Team Members</h2>
            <p className="text-sm text-on-surface-variant">Team: &quot;{selectedTeam.name}&quot;</p>
          </div>
          <button type="button" onClick={closeManageTeamMembersModal} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 overflow-y-auto flex-1 flex flex-col">
              <div className="relative mb-4">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/50" />
                  <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-primary focus:border-primary"
                  />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 bg-surface-variant/40 p-3 rounded-lg border border-outline/30">
                {filteredUsers.map(user => {
                  const isOwner = user.id === selectedTeam.ownerId;
                  const isSelected = selectedMemberIds.has(user.id);
                  
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-on-surface/5 ${isOwner ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isOwner}
                        onChange={() => handleToggleMember(user.id)}
                        className="h-4 w-4 rounded text-primary focus:ring-primary border-outline/50"
                      />
                      <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium text-on-surface text-sm">{user.name} {isOwner && <span className="text-xs text-secondary font-semibold ml-1">(Owner)</span>}</p>
                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                      </div>
                    </label>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center text-sm text-on-surface-variant py-8">
                    No users found.
                  </div>
                )}
              </div>
          </div>

          <div className="p-4 mt-auto border-t border-outline/30 bg-surface/50 rounded-b-3xl flex justify-end items-center gap-4">
            <button type="button" onClick={closeManageTeamMembersModal} className="px-5 py-2 text-sm font-semibold text-on-surface-variant bg-surface-variant rounded-full hover:bg-on-surface/10">
                Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ManageTeamMembersModal;
