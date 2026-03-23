import React from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';

interface FrequentCollaboratorsProps {
    users: User[];
}

export const FrequentCollaborators: React.FC<FrequentCollaboratorsProps> = ({ users }) => {
    // For now, just show the first few users as "frequent"
    const collaborators = users.slice(0, 5);

    return (
        <section className="bg-surface rounded-[2.5rem] border border-outline/20 shadow-md p-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface mb-6">Meet Your Team</h3>
            <div className="flex gap-6">
                {collaborators.map(user => (
                    <div key={user.id} className="flex flex-col items-center gap-3">
                        <Avatar src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full border-2 border-surface shadow-md" />
                        <span className="text-xs font-bold text-on-surface truncate max-w-[80px]">{user.name.split(' ')[0]} {user.name.split(' ')[1]?.[0]}.</span>
                    </div>
                ))}
            </div>
        </section>
    );
};
