import React, { useState, useEffect, useMemo } from 'react';
import { Form, FormResponse } from '../types';
import { useAppContext } from '../contexts/AppContext';
/* Fix: Added FormInputIcon to the imports */
import { XIcon, FileTextIcon, ListTodoIcon, ShareIcon, ChartPieIcon, TableIcon, FormInputIcon } from './icons';
import { Modal } from './Modal';
import DonutChart from './charts/DonutChart';

interface FormResponsesModalProps {
    form: Form;
    onClose: () => void;
}

const FormResponsesModal: React.FC<FormResponsesModalProps> = ({ form, onClose }) => {
    const { fetchFormResponses } = useAppContext();
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'data' | 'summary'>('data');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await fetchFormResponses(form.id);
                setResponses(data);
            } catch (err) {
                console.error("Failed to load responses:", err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [form.id, fetchFormResponses]);

    const analyticsData = useMemo(() => {
        if (responses.length === 0) return null;
        
        const charts: { title: string; type: string; data: { name: string; value: number; color: string }[] }[] = [];

        form.fields.forEach(field => {
            if (field.type === 'select') {
                const counts: Record<string, number> = {};
                responses.forEach(r => {
                    const val = r.answers[field.id];
                    if (val !== undefined && val !== null) {
                        const key = String(val);
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });

                const data = Object.entries(counts).map(([name, value]) => ({
                    name,
                    value,
                    color: `hsl(${Math.random() * 360}, 70%, 60%)`
                }));

                charts.push({ title: field.label, type: 'donut', data });
            }
        });

        return charts;
    }, [responses, form.fields]);

    const handleExportCSV = () => {
        if (responses.length === 0) return;
        const headers = ['Submitted At', ...form.fields.map(f => `"${f.label.replace(/"/g, '""')}"`)];
        const rows = responses.map(r => {
            const date = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '';
            const answerValues = form.fields.map(f => {
                const rawVal = r.answers[f.id];
                if (rawVal === undefined || rawVal === null) return '""';
                
                let val: string;
                if (typeof rawVal === 'object' && rawVal !== null && 'name' in rawVal) {
                    val = String((rawVal as { name: string }).name);
                } else if (typeof rawVal === 'object' && rawVal !== null) {
                    try {
                        val = JSON.stringify(rawVal);
                    } catch {
                        val = '[Complex Object]';
                    }
                } else {
                    val = String(rawVal);
                }
                
                val = val.replace(/"/g, '""');
                return `"${val}"`;
            });
            return [`"${date}"`, ...answerValues].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal onClose={onClose} containerClassName="z-[250] flex items-center justify-center" panelClassName="w-full max-w-6xl h-[90vh] bg-surface border border-outline/30 rounded-[3rem] shadow-m3-lg flex flex-col overflow-hidden">
            <div className="p-8 border-b border-outline/10 flex justify-between items-center bg-surface/80 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-5">
                    {/* Fix: FormInputIcon is now available from imports */}
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                        <FormInputIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight leading-none truncate max-w-md">{form.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                             <div className="flex items-center gap-1 p-1 bg-surface-variant/40 rounded-xl border border-outline/10">
                                <button onClick={() => setActiveTab('data')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'data' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}><TableIcon className="inline w-3 h-3 mr-1"/> Raw Data</button>
                                <button onClick={() => setActiveTab('summary')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'summary' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}><ChartPieIcon className="inline w-3 h-3 mr-1"/> Intelligence</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportCSV} 
                        disabled={responses.length === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-surface hover:bg-primary/5 border border-outline/20 rounded-2xl text-[10px] font-black text-on-surface-variant hover:text-primary uppercase tracking-[0.2em] transition-all disabled:opacity-30"
                    >
                        <ShareIcon className="h-4 w-4" /> Export CSV
                    </button>
                    <button type="button" onClick={onClose} className="p-4 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-[1.8rem] transition-all border border-outline/10">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-surface-variant/5">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" /></div>
                ) : responses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/20 py-32">
                        <ListTodoIcon className="h-20 w-20 mb-6 opacity-10" />
                        <p className="font-black uppercase tracking-[0.2em]">Silence Detected</p>
                        <p className="text-xs font-bold mt-2 opacity-60">No data records found for this engine version.</p>
                    </div>
                ) : activeTab === 'data' ? (
                    <div className="p-8">
                        <div className="overflow-x-auto rounded-[2rem] border border-outline/10 shadow-sm bg-surface">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-variant/20 border-b border-outline/10 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                                        <th className="p-6 min-w-[200px] sticky left-0 bg-surface z-10">Sync Timestamp</th>
                                        {form.fields.map(field => (
                                            <th key={field.id} className="p-6 min-w-[250px] border-l border-outline/10">{field.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {responses.map((response) => (
                                        <tr key={response.id} className="border-b border-outline/5 last:border-0 hover:bg-primary/[0.01] transition-colors group">
                                            <td className="p-6 font-bold text-on-surface sticky left-0 bg-surface z-10 border-r border-outline/10 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-tight">{response.submittedAt ? new Date(response.submittedAt).toLocaleDateString() : 'N/A'}</span>
                                                    <span className="text-[9px] font-bold text-on-surface-variant opacity-40 uppercase">{response.submittedAt ? new Date(response.submittedAt).toLocaleTimeString() : ''}</span>
                                                </div>
                                            </td>
                                            {form.fields.map(field => {
                                                const val = response.answers[field.id];
                                                return (
                                                    <td key={field.id} className="p-6 text-on-surface-variant font-medium border-l border-outline/5 leading-relaxed">
                                                        {field.type === 'file' && val && typeof val === 'object' && 'name' in val ? (
                                                            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase">
                                                                <FileTextIcon className="w-4 h-4" /> Attached Asset: {(val as { name: string }).name}
                                                            </div>
                                                        ) : typeof val === 'boolean' ? (
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${val ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{val ? 'Verified' : 'Unchecked'}</span>
                                                        ) : (
                                                            String(val || '-')
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 space-y-12 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm">
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-2">Total Lifecycle Syncs</p>
                                <p className="text-4xl font-black text-on-surface">{responses.length}</p>
                            </div>
                            <div className="p-8 bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm">
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-2">Completion Velocity</p>
                                <p className="text-4xl font-black text-success">100%</p>
                            </div>
                            <div className="p-8 bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm">
                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-2">Active Version</p>
                                <p className="text-4xl font-black text-primary">v{form.version}.0</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {analyticsData?.map((chart, i) => (
                                <div key={i} className="p-10 bg-surface rounded-[3.5rem] border border-outline/10 shadow-sm">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-on-surface mb-8 border-b border-outline/5 pb-4">{chart.title} Distribution</h3>
                                    <div className="h-64 flex items-center justify-center">
                                        <DonutChart data={chart.data} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default FormResponsesModal;