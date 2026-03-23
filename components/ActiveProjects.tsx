import React from 'react';
import { Project, User } from '../types';
import { Avatar } from './Avatar';

interface ActiveProjectsProps {
    projects: Project[];
    allUsers: User[];
}

export const ActiveProjects: React.FC<ActiveProjectsProps> = ({ projects, allUsers }) => {
    const activeProjects = projects.filter(p => !p.isArchived).slice(0, 3);

    return (
        <section className="bg-surface rounded-[2.5rem] border border-outline/20 shadow-md p-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface mb-6">Active Projects</h3>
            <div className="space-y-4">
                {activeProjects.map(project => {
                    const members = (project.memberIds || [])
                        .map(id => allUsers.find(u => u.id === id))
                        .filter((u): u is User => !!u);
                    
                    return (
                        <div key={project.id} className="p-5 bg-surface-variant/20 rounded-2xl border border-outline/10 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-on-surface">{project.name}</h4>
                                <div className="w-48 h-2 bg-outline/20 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                            <div className="flex -space-x-2">
                                {members.slice(0, 3).map(member => (
                                    <Avatar key={member.id} src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                                ))}
                                {members.length > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold border-2 border-surface text-on-surface-variant">
                                        +{members.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
