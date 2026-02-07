import React, { useEffect, useState } from 'react';
import { Plus, FolderOpen, Edit2, Trash2, Search, ArrowRight, Save, X } from 'lucide-react';
import type { Project } from '../types';
import { cn } from '../../lib/utils';

interface ProjectsViewProps {
    onSelectProject: (path: string) => void;
}

export default function ProjectsView({ onSelectProject }: ProjectsViewProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [busy, setBusy] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Add Project State
    const [isAdding, setIsAdding] = useState(false);
    const [newPath, setNewPath] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        if (!window.dbat) return;
        try {
            const list = await window.dbat.getProjects();
            setProjects(list);
        } catch (e) {
            console.error(e);
        }
    }

    async function pickNewProject() {
        if (!window.dbat) return;
        const res = await window.dbat.pickRepo();
        if (res.ok && res.repoPath) {
            setNewPath(res.repoPath);
            // Default name to folder name
            const parts = res.repoPath.split(/[/\\]+/).filter(Boolean);
            setNewName(parts[parts.length - 1] || 'My Project');
            setIsAdding(true);
        }
    }

    async function saveNewProject() {
        if (!window.dbat) return;
        if (!newName.trim()) return;
        setBusy(true);
        try {
            await window.dbat.addProject(newName, newPath);
            setIsAdding(false);
            setNewPath('');
            setNewName('');
            await loadProjects();
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    }

    async function handleUpdate(id: number) {
        if (!window.dbat) return;
        try {
            await window.dbat.updateProject(id, editName);
            setEditingId(null);
            await loadProjects();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleDelete(id: number) {
        if (!window.dbat || !confirm('Are you sure you want to remove this project from the list?')) return;
        try {
            await window.dbat.deleteProject(id);
            await loadProjects();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleOpen(p: Project) {
        if (!window.dbat) return;
        await window.dbat.touchProject(p.id);
        onSelectProject(p.path);
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                <button
                    onClick={pickNewProject}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <Plus className="h-4 w-4" />
                    Add Project
                </button>
            </div>

            {isAdding && (
                <div className="rounded-lg border bg-card p-4 shadow-sm animate-in slide-in-from-top-2">
                    <h3 className="mb-2 font-semibold">New Project</h3>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Path</label>
                            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                <span className="truncate">{newPath}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={saveNewProject}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Save className="mr-2 h-3.5 w-3.5" /> Save
                            </button>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <X className="mr-2 h-3.5 w-3.5" /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {projects.length === 0 && !isAdding ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground bg-muted/20">
                    <FolderOpen className="mb-2 h-10 w-10 opacity-20" />
                    <p>No projects saved yet.</p>
                    <button onClick={pickNewProject} className="mt-4 text-sm font-medium text-primary hover:underline">
                        Pick a repository
                    </button>
                </div>
            ) : (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="bg-muted/50 [&_tr]:border-b">
                            <tr className="border-b transition-colors">
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Path</th>
                                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Last Opened</th>
                                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {projects.map((p) => (
                                <tr key={p.id} className="border-b transition-colors hover:bg-muted/30">
                                    <td className="p-4 align-middle font-medium">
                                        {editingId === p.id ? (
                                            <input
                                                className="h-8 w-full min-w-[150px] rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onBlur={() => handleUpdate(p.id)}
                                                onKeyDown={e => e.key === 'Enter' && handleUpdate(p.id)}
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FolderOpen className="h-4 w-4 text-primary/50" />
                                                {p.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground hidden sm:table-cell">
                                        <div className="truncate max-w-[300px]" title={p.path}>{p.path}</div>
                                    </td>
                                    <td className="p-4 align-middle text-right text-muted-foreground">
                                        {new Date(p.last_opened_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpen(p)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
                                                title="Open Project"
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
                                                title="Rename"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/30 text-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground bg-destructive/5"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
