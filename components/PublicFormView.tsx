import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { Form, Project, FormField, Template, FormStyle, User } from '../types';
import { KWHubLogoFull, CheckCircle2, AlertCircleIcon, UploadCloudIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDownIcon, LinkIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../services/notificationService';

interface PublicFormViewProps {
    formId: string;
}

const DEFAULT_STYLE: FormStyle = {
    primaryColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#1c2024',
    fontFamily: 'Inter',
    borderRadius: '16px'
};

const PublicFormView: React.FC<PublicFormViewProps> = ({ formId }) => {
    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Conversational State
    const [currentStep, setCurrentStep] = useState(0);
    
    // Helper to find a name if one exists in the answers for the task title
    const editName = useMemo(() => {
        const nameField = form?.fields.find(f => f.label.toLowerCase().includes('name'));
        if (nameField && answers[nameField.id]) return answers[nameField.id];
        return '';
    }, [form, answers]);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const formDoc = await getDoc(doc(db, 'forms', formId));
                if (formDoc.exists()) {
                    setForm({ id: formDoc.id, ...formDoc.data() } as Form);
                } else {
                    setError('Form not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load form.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchForm();
    }, [formId]);

    const handleInputChange = (fieldId: string, value: unknown) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileUpload = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleInputChange(fieldId, { name: file.name, data: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const nextStep = () => {
        const field = form?.fields[currentStep];
        if (field?.required && !answers[field.id]) {
            alert(`"${field.label}" is required.`);
            return;
        }
        if (form && currentStep < form.fields.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        // Final Validation
        for (const field of form.fields) {
            if (field.required && !answers[field.id]) {
                alert(`Please fill out the required field: ${field.label}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // 1. Save Response
            await addDoc(collection(db, 'form_responses'), {
                formId: form.id,
                formTitle: form.title,
                formVersion: form.version || 1,
                projectId: form.projectId || null,
                answers,
                submittedAt: serverTimestamp(),
                userAgent: navigator.userAgent
            });

            // 2. Metadata Updates
            try {
                await updateDoc(doc(db, 'forms', form.id), { responseCount: increment(1) });
            } catch {
                // Ignore metadata update errors
            }

            // 3. Operational Automation (Task & Template Trigger)
            if (form.projectId) {
                const projectDoc = await getDoc(doc(db, 'projects', form.projectId));
                const projectData = projectDoc.exists() ? projectDoc.data() as Project : null;

                const now = new Date();
                const submissionDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const submissionTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                // Refined block formatting for easy copy-paste and readability
                const header = `========================================\nINBOUND INTAKE: ${form.title.toUpperCase()}\n========================================\n`;
                const metadata = `SYNCED: ${submissionDate} @ ${submissionTime}\n\n`;
                
                const responseData = form.fields.map(field => {
                    const ans = answers[field.id];
                    const label = field.label.toUpperCase();
                    let formattedAns = '';

                    if (field.type === 'file' && ans) {
                        const fileAns = ans as { name: string; data: string };
                        formattedAns = `[ATTACHED ASSET: ${fileAns.name}]`;
                    } else if (typeof ans === 'boolean') {
                        formattedAns = ans ? 'YES / VERIFIED' : 'NO / UNCHECKED';
                    } else {
                        formattedAns = (ans as string) || 'NOT PROVIDED';
                    }

                    return `${label}\n----------------------------------------\n${formattedAns}`;
                }).join('\n\n');

                const footer = `\n\n========================================\nEND OF DATA TRANSMISSION\n========================================`;
                
                const formattedDescription = `${header}${metadata}${responseData}${footer}`;

                const memberIdsSet = new Set<string>();
                if (projectData?.memberIds) projectData.memberIds.forEach(id => memberIdsSet.add(id));
                if (form.creatorId) memberIdsSet.add(form.creatorId);

                const taskDefaults = form.taskDefaults;
                const finalAssigneeId = taskDefaults?.autoAssigneeId || form.creatorId;

                const newTaskRef = await addDoc(collection(db, 'tasks'), {
                    projectId: form.projectId,
                    title: `${form.title}: ${editName || 'New Intake'}`,
                    description: formattedDescription,
                    status: taskDefaults?.status || 'backlog',
                    priority: taskDefaults?.priority || 'High',
                    memberIds: Array.from(memberIdsSet),
                    assigneeIds: finalAssigneeId ? [finalAssigneeId] : [],
                    tags: ['Form Submission', ...(taskDefaults?.autoTags || [])],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    startDate: serverTimestamp(),
                    dueDate: serverTimestamp(),
                    order: Date.now(),
                    subtasks: [],
                    attachments: [],
                    comments: [],
                    auditTrail: [{
                        id: Date.now().toString(),
                        user: { id: 'system', name: 'Engine Bot', avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' },
                        action: 'Automated Lifecycle Triggered',
                        timestamp: new Date()
                    }]
                });

                // 4. Trigger Template Workflow
                if (taskDefaults?.autoApplyTemplateId) {
                    const templateDoc = await getDoc(doc(db, 'templates', taskDefaults.autoApplyTemplateId));
                    if (templateDoc.exists()) {
                        const templateData = templateDoc.data() as Template;
                        const subtaskItems = (templateData.tasks || []).map(t => ({
                            id: Math.random().toString(36).substr(2, 9),
                            title: t.title,
                            isCompleted: false,
                            section: t.section || 'Template Intake'
                        }));
                        await updateDoc(newTaskRef, { subtasks: subtaskItems });
                    }
                }
            }

            // 5. Send Webhook Notification
            if (form.creatorId) {
                const creatorDoc = await getDoc(doc(db, 'users', form.creatorId));
                if (creatorDoc.exists()) {
                    const creatorData = creatorDoc.data() as User;
                    if (creatorData.googleChatWebhook) {
                        await notificationService.sendGoogleChatWebhook(
                            creatorData.googleChatWebhook,
                            `🔔 *New Form Submission*\n\nForm: *${form.title}*\n\nSubmitted at: ${new Date().toLocaleString()}`
                        );
                    }
                }
            }

            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            alert('Submission error. Connection lost.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center p-8"><div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" /></div>;

    if (error || !form) return <div className="min-h-screen flex items-center justify-center p-8 text-center"><div className="bg-surface p-12 rounded-[3rem] border border-outline/10 shadow-m3-lg max-w-lg"><AlertCircleIcon className="w-16 h-16 text-danger mx-auto mb-4" /><h2 className="text-2xl font-black uppercase">Engine Offline</h2><p className="text-on-surface-variant mt-2">This intake engine has been decommissioned or moved.</p></div></div>;

    const style = form.style || DEFAULT_STYLE;
    const progress = ((currentStep + 1) / form.fields.length) * 100;

    const renderField = (field: FormField) => {
        const commonClasses = "w-full bg-surface-variant/30 border-2 border-outline/10 rounded-2xl px-6 py-4 text-lg font-bold focus:ring-4 ring-primary/10 focus:border-primary outline-none transition-all transition-colors placeholder:opacity-20";
        
        switch(field.type) {
            case 'textarea': return <textarea rows={5} value={(answers[field.id] as string) || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} className={commonClasses} placeholder="Type your response here..." />;
            case 'select': return (
                <div className="relative">
                    <select value={(answers[field.id] as string) || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} className={`${commonClasses} appearance-none pr-12 cursor-pointer`}>
                        <option value="">Select an option...</option>
                        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-30 pointer-events-none" />
                </div>
            );
            case 'checkbox': return (
                <label className="flex items-center gap-6 p-6 bg-surface-variant/20 border-2 border-outline/10 rounded-3xl cursor-pointer hover:bg-surface-variant/40 transition-all">
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${answers[field.id] ? 'bg-primary border-primary' : 'border-outline/40'}`}>
                        {answers[field.id] && <CheckCircle2 className="w-5 h-5 text-white" />}
                    </div>
                    <input type="checkbox" checked={!!answers[field.id]} onChange={e => handleInputChange(field.id, e.target.checked)} className="sr-only" />
                    <span className="text-lg font-black uppercase tracking-tight opacity-70">I Confirm / Agree</span>
                </label>
            );
            case 'file': return (
                <div className="relative">
                    <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-outline/30 rounded-[2.5rem] bg-surface-variant/10 hover:bg-surface-variant/20 cursor-pointer transition-all group">
                        <UploadCloudIcon className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform" />
                        <p className="mt-4 font-black uppercase tracking-widest text-sm">
                            {answers[field.id] ? (answers[field.id] as { name: string }).name : 'Upload Document or Photo'}
                        </p>
                        <p className="text-xs font-bold text-on-surface-variant opacity-40 mt-1 uppercase">Max 5MB • PDF, JPG, PNG</p>
                        <input type="file" onChange={e => handleFileUpload(field.id, e)} className="sr-only" />
                    </label>
                </div>
            );
            default: return <input type={field.type} value={(answers[field.id] as string) || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} className={commonClasses} placeholder="Type response..." />;
        }
    };

    if (isSuccess) {
        const leadMagnetUrl = form.automation?.leadMagnetUrl;
        const qrUrl = leadMagnetUrl ? `https://quickchart.io/qr?text=${encodeURIComponent(leadMagnetUrl)}&size=200&margin=2&ecLevel=H` : null;

        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-surface-variant/10" style={{ fontFamily: style.fontFamily }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface p-12 sm:p-16 rounded-[4rem] border border-outline/10 shadow-m3-lg max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-success text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-m3-md"><CheckCircle2 className="w-10 h-10" /></div>
                    <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">Submission Synchronized</h2>
                    <p className="text-lg text-on-surface-variant font-medium leading-relaxed mb-10 opacity-70">
                        {form.automation?.successMessage || "Thank you for your input. Your data is now processing."}
                    </p>

                    {leadMagnetUrl && (
                        <div className="bg-surface-variant/20 p-8 rounded-[3rem] border border-outline/10 mb-10 animate-fade-in">
                            <div className="flex flex-col items-center gap-6">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Your Resource is Ready</p>
                                {qrUrl && (
                                    <div className="bg-white p-4 rounded-[2.5rem] shadow-inner border border-outline/5">
                                        <img src={qrUrl} alt="Resource QR" className="w-40 h-40" />
                                    </div>
                                )}
                                <div className="space-y-3 w-full">
                                    <a 
                                        href={leadMagnetUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-on-primary rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-m3-md hover:scale-[1.02] active:scale-95 transition-all"
                                        style={{ backgroundColor: style.primaryColor }}
                                    >
                                        <LinkIcon className="w-5 h-5" /> Download Resource
                                    </a>
                                    <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Scan the code or click the button</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => window.location.reload()} className="text-on-surface-variant/40 font-black uppercase tracking-[0.25em] text-[10px] hover:text-primary transition-colors decoration-2 underline-offset-8">Intake another record</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-500 pb-20" style={{ backgroundColor: style.backgroundColor, fontFamily: style.fontFamily, color: style.textColor }}>
            {/* Header Branding */}
            {style.headerImage && <div className="h-64 w-full overflow-hidden border-b border-outline/10"><img src={style.headerImage} alt="Header" className="w-full h-full object-cover" /></div>}
            
            <div className="max-w-3xl mx-auto w-full px-6 flex flex-col items-center">
                <div className="flex justify-center mt-12 mb-8 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                    {style.logoUrl ? <img src={style.logoUrl} className="h-12 w-auto" /> : <KWHubLogoFull className="scale-75" />}
                </div>

                <div className="w-full bg-surface p-12 rounded-[3.5rem] border border-outline/10 shadow-m3-sm relative overflow-hidden mb-10">
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: style.primaryColor }} />
                    <h1 className="text-5xl font-black tracking-tighter mb-4 uppercase leading-none">{form.title}</h1>
                    <p className="text-lg opacity-60 font-medium leading-relaxed">{form.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-12">
                    {form.isConversational ? (
                        <AnimatePresence mode="wait">
                            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em]">Step {currentStep + 1} of {form.fields.length}</span>
                                        <div className="w-48 h-2 bg-surface-variant/30 rounded-full overflow-hidden border border-outline/10">
                                            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: style.primaryColor }} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black tracking-tight leading-tight">{form.fields[currentStep].label}{form.fields[currentStep].required && <span className="text-danger ml-2">*</span>}</h3>
                                    {renderField(form.fields[currentStep])}
                                </div>
                                <div className="flex items-center justify-between pt-8 border-t border-outline/10">
                                    <button type="button" onClick={prevStep} disabled={currentStep === 0} className="flex items-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-widest text-on-surface-variant disabled:opacity-0 transition-all hover:bg-surface-variant/30 rounded-2xl">
                                        <ChevronLeftIcon className="w-5 h-5" /> Back
                                    </button>
                                    {currentStep === form.fields.length - 1 ? (
                                        <button type="submit" disabled={isSubmitting} className="px-12 py-5 bg-primary text-on-primary rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50" style={{ backgroundColor: style.primaryColor }}>
                                            {isSubmitting ? 'Syncing...' : 'Finalize Submission'}
                                        </button>
                                    ) : (
                                        <button type="button" onClick={nextStep} className="px-12 py-5 bg-primary text-on-primary rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: style.primaryColor }}>
                                            Next Step <ChevronRightIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <div className="space-y-6">
                            {form.fields.map(field => (
                                <div key={field.id} className="p-10 bg-surface rounded-[3rem] border border-outline/10 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
                                    <label className="block text-xl font-black uppercase tracking-tight mb-6">{field.label}{field.required && <span className="text-danger ml-2">*</span>}</label>
                                    {renderField(field)}
                                </div>
                            ))}
                            <div className="flex justify-end pt-8">
                                <button type="submit" disabled={isSubmitting} className="px-16 py-6 bg-primary text-on-primary rounded-[2.5rem] font-black text-xl uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50" style={{ backgroundColor: style.primaryColor }}>
                                    {isSubmitting ? 'Syncing...' : 'Transmit Data'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
            <div className="mt-24 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Secure KW Hub Operational Endpoint • v{form.version}.0</p>
            </div>
        </div>
    );
};

export default PublicFormView;