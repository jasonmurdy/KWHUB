
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
    GoogleDriveIcon, 
    CalendarDaysIcon, 
    ChevronRightIcon,
    ListTodoIcon
} from './icons';

const ServiceCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    isEnabled: boolean;
    onToggle?: (enabled: boolean) => void;
    children?: React.ReactNode;
}> = ({ icon, title, description, isEnabled, onToggle, children }) => (
    <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col h-full bg-surface
        ${isEnabled ? 'border-primary shadow-m3-sm ring-1 ring-primary/5' : 'border-outline/10 hover:border-outline/30'}
    `}>
        <div className="flex items-start justify-between mb-8">
            <div className={`p-4 rounded-2xl ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-surface-variant/30 text-on-surface-variant'}`}>
                {icon}
            </div>
            {onToggle && (
                <button
                    onClick={() => onToggle(!isEnabled)}
                    className={`${isEnabled ? 'bg-primary' : 'bg-outline/20'} relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                >
                    <span className={`${isEnabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out`} />
                </button>
            )}
        </div>
        <div className="flex-1">
            <h3 className="text-xl font-black text-on-surface tracking-tight mb-3 uppercase">{title}</h3>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-70 mb-6">{description}</p>
            {children}
        </div>
    </div>
);

const IntegrationsView: React.FC = () => {
    const { userProfile, updateUserProfile, requestGoogleAccess } = useAuth();
    const { addToast } = useToast();
    
    const handleServiceAuth = async (service: string, enabled: boolean) => {
        if (!enabled) {
            await updateUserProfile({ [`${service}Enabled`]: false });
            return;
        }
        try {
            const { email } = await requestGoogleAccess();
            await updateUserProfile({ [`${service}Enabled`]: true, [`${service}Email`]: email });
            addToast({ type: 'success', title: 'Connected!', message: `Linked to ${email}` });
        } catch {
            addToast({ type: 'error', title: 'Connection Failed' });
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-32 px-4 sm:px-6">
            <header className="mb-16">
                <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase mb-2">Bridge Protocol</h1>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.3em] opacity-40">Connecting KW Hub to the Command Universe</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Fixed Bridge: KW Command Tasks */}
                <ServiceCard 
                    icon={<ListTodoIcon className="h-8 w-8" />}
                    title="Command Tasks"
                    description="The primary source of truth for your brokerage task list. Access your official daily assignments directly."
                    isEnabled={true}
                >
                    <a 
                        href="https://console.command.kw.com/command/task-manager" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-on-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-m3-md hover:bg-primary/90 transition-all"
                    >
                        Launch Command Tasks <ChevronRightIcon className="w-4 h-4" />
                    </a>
                </ServiceCard>

                <ServiceCard 
                    icon={<CalendarDaysIcon className="h-8 w-8" />}
                    title="Google Calendar"
                    description="Push task deadlines and project event dates to your primary Google Calendar."
                    isEnabled={!!userProfile?.googleCalendarEnabled}
                    onToggle={(e) => handleServiceAuth('googleCalendar', e)}
                />

                <ServiceCard 
                    icon={<GoogleDriveIcon className="h-8 w-8" />}
                    title="Google Drive"
                    description="Enable cloud file attachments and automated team project backups."
                    isEnabled={!!userProfile?.googleDriveEnabled}
                    onToggle={(e) => handleServiceAuth('googleDrive', e)}
                />
            </div>
        </div>
    );
};

export default IntegrationsView;
