import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrashIcon } from './icons';
import { TemplateTask } from '../types';

interface SortableTaskItemProps {
  task: TemplateTask;
  index: number;
  availableRoles: string[];
  handleTaskChange: (index: number, field: 'title' | 'description' | 'assigneeRole' | 'section', value: string) => void;
  removeTask: (index: number) => void;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, index, availableRoles, handleTaskChange, removeTask }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-surface p-5 rounded-[2rem] shadow-sm border border-outline/10 hover:border-primary/20 transition-all group/row">
        <div {...attributes} {...listeners} className="lg:col-span-1 flex justify-center opacity-30 cursor-grab">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        <div className="lg:col-span-2">
            <input 
                value={task.section || ''} 
                onChange={e => handleTaskChange(index, 'section', e.target.value)} 
                placeholder="Phase" 
                className="w-full text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 focus:ring-2 ring-primary/20 rounded-xl px-4 py-2 placeholder:opacity-30"
            />
        </div>
        <div className="lg:col-span-4">
            <input value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} placeholder="Checkpoint Title" className="w-full text-sm font-black uppercase tracking-tight bg-transparent focus:ring-0 outline-none border-b border-transparent focus:border-primary px-1 py-1" />
        </div>
        <div className="lg:col-span-3">
            <input value={task.description} onChange={e => handleTaskChange(index, 'description', e.target.value)} placeholder="Detailed action steps..." className="w-full text-xs bg-transparent focus:ring-0 outline-none border-b border-transparent focus:border-outline/50 px-1 py-1 text-on-surface-variant font-medium" />
        </div>
        <div className="lg:col-span-2 flex items-center gap-2">
            <select 
                value={task.assigneeRole || ''} 
                onChange={e => handleTaskChange(index, 'assigneeRole', e.target.value)}
                className="w-full text-[10px] font-black uppercase tracking-widest bg-surface-variant/30 border border-outline/10 rounded-xl px-3 py-2 text-on-surface-variant outline-none"
            >
                <option value="">No Role</option>
                {availableRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                ))}
            </select>
            <button type="button" onClick={() => removeTask(index)} className="text-on-surface-variant/30 hover:text-danger p-2 hover:bg-danger/5 rounded-xl transition-all opacity-0 group-hover/row:opacity-100"><TrashIcon className="h-5 w-5"/></button>
        </div>
    </div>
  );
};
