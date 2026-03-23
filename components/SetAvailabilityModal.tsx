
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { XIcon, TrashIcon } from './icons';
import { motion, Variants } from 'framer-motion';

const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "50px", opacity: 0, scale: 0.95 },
  visible: { y: "0px", opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { y: "50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 }, pointerEvents: "none" },
};

const SetAvailabilityModal: React.FC = () => {
    const { closeSetAvailabilityModal, availabilityBlocks, addAvailabilityBlock, deleteAvailabilityBlock, selectedTeam } = useAppContext();
    const { userProfile, updateUserProfile } = useAuth();
    
    const [workingHours, setWorkingHours] = useState({
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5] // Mon-Fri
    });

    const [newBlock, setNewBlock] = useState({
        title: '',
        type: 'OOO' as 'OOO' | 'Focus Time' | 'Meeting',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: ''
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile?.workingHours) {
            setWorkingHours(userProfile.workingHours);
        }
    }, [userProfile]);
    
    const myAvailabilityBlocks = useMemo(() => 
        availabilityBlocks
            .filter(b => b.userId === userProfile?.id)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [availabilityBlocks, userProfile]);

    const handleWorkingHoursDayToggle = (day: number) => {
        setWorkingHours(prev => {
            const days = new Set(prev.days);
            if (days.has(day)) days.delete(day);
            else days.add(day);
            return { ...prev, days: Array.from(days).sort() };
        });
    };

    const handleSaveWorkingHours = async () => {
        setIsSaving(true);
        await updateUserProfile({ workingHours });
        setIsSaving(false);
    };
    
    const handleAddBlock = async () => {
        if (!selectedTeam || !userProfile || !newBlock.title || !newBlock.startDate || !newBlock.startTime || !newBlock.endDate || !newBlock.endTime) {
            alert("Please fill all fields for the new block.");
            return;
        }
        
        const startTime = new Date(`${newBlock.startDate}T${newBlock.startTime}`);
        const endTime = new Date(`${newBlock.endDate}T${newBlock.endTime}`);

        if (endTime <= startTime) {
            alert("End time must be after start time.");
            return;
        }

        await addAvailabilityBlock({
            userId: userProfile.id,
            teamId: selectedTeam.id,
            startTime,
            endTime,
            title: newBlock.title,
            type: newBlock.type,
        });

        setNewBlock({ title: '', type: 'OOO', startDate: '', startTime: '', endDate: '', endTime: '' });
    };

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeSetAvailabilityModal}
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
        >
          <motion.div
            className="bg-surface border border-outline/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-m3-lg"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <div className="p-6 border-b border-outline/30 flex justify-between items-center">
              <h2 className="text-xl font-bold text-on-surface">Set Your Availability</h2>
              <button type="button" onClick={closeSetAvailabilityModal} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5"><XIcon className="h-6 w-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: General Working Hours */}
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-on-surface mb-3">Default Working Hours</h3>
                        <div className="p-4 bg-surface-variant/40 rounded-xl border border-outline/30 space-y-4">
                            <div className="flex justify-center gap-2">
                                {weekDays.map((day, i) => (
                                    <button
                                        key={day}
                                        onClick={() => handleWorkingHoursDayToggle(i)}
                                        className={`w-10 h-10 rounded-full font-semibold text-sm transition-colors ${workingHours.days.includes(i) ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-on-surface/10'}`}
                                    >{day.charAt(0)}</button>
                                ))}
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <input type="time" value={workingHours.start} onChange={e => setWorkingHours(p => ({...p, start: e.target.value}))} className="bg-surface border border-outline/50 rounded-lg p-2 text-sm" />
                                <span>to</span>
                                <input type="time" value={workingHours.end} onChange={e => setWorkingHours(p => ({...p, end: e.target.value}))} className="bg-surface border border-outline/50 rounded-lg p-2 text-sm" />
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleSaveWorkingHours} disabled={isSaving} className="px-4 py-1.5 text-xs font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90">{isSaving ? 'Saving...' : 'Save Default'}</button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-on-surface mb-3">My Scheduled Time Off</h3>
                        <div className="p-4 bg-surface-variant/40 rounded-xl border border-outline/30 space-y-2 max-h-60 overflow-y-auto">
                            {myAvailabilityBlocks.map(block => (
                                <div key={block.id} className="bg-surface p-2 rounded-md flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-semibold">{block.title} <span className="text-xs text-secondary">({block.type})</span></p>
                                        <p className="text-xs text-on-surface-variant">{block.startTime.toLocaleString()} - {block.endTime.toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => deleteAvailabilityBlock(block.id)} className="p-1 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            ))}
                            {myAvailabilityBlocks.length === 0 && <p className="text-xs text-center text-on-surface-variant p-4">No specific time off scheduled.</p>}
                        </div>
                    </div>
                </div>

                {/* Right: Add Specific Time Off */}
                <div>
                    <h3 className="font-bold text-on-surface mb-3">Add Specific Time Off / Focus Time</h3>
                    <div className="p-4 bg-surface-variant/40 rounded-xl border border-outline/30 space-y-4">
                        <div><label className="text-xs font-medium">Title</label><input type="text" placeholder="e.g. Doctor's Appointment" value={newBlock.title} onChange={e => setNewBlock(p => ({...p, title: e.target.value}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"/></div>
                        <div><label className="text-xs font-medium">Type</label><select value={newBlock.type} onChange={e => setNewBlock(p => ({...p, type: e.target.value as 'OOO' | 'Focus Time' | 'Meeting'}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"><option>OOO</option><option>Focus Time</option><option>Meeting</option></select></div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="text-xs font-medium">Start Date</label><input type="date" value={newBlock.startDate} onChange={e => setNewBlock(p => ({...p, startDate: e.target.value}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"/></div>
                           <div><label className="text-xs font-medium">Start Time</label><input type="time" value={newBlock.startTime} onChange={e => setNewBlock(p => ({...p, startTime: e.target.value}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"/></div>
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div><label className="text-xs font-medium">End Date</label><input type="date" value={newBlock.endDate} onChange={e => setNewBlock(p => ({...p, endDate: e.target.value}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"/></div>
                           <div><label className="text-xs font-medium">End Time</label><input type="time" value={newBlock.endTime} onChange={e => setNewBlock(p => ({...p, endTime: e.target.value}))} className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-sm mt-1"/></div>
                        </div>
                        <div className="flex justify-end"><button onClick={handleAddBlock} className="w-full px-4 py-2 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90">Add Block</button></div>
                    </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
    );
};

export default SetAvailabilityModal;
