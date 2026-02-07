import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { LayoutDashboard, BarChart3, FileText, Settings, Moon, Sun, Laptop, Sparkles, Trees, FolderGit2 } from 'lucide-react';

export type View = 'dashboard' | 'analytics' | 'reports' | 'settings' | 'projects';

type Theme = 'light' | 'dark' | 'midnight' | 'forest' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'midnight', 'forest');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

const ThemeContext = React.createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function useTheme() {
    const context = React.useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}

export function Layout({ children, currentView, onNavigate }: { children: React.ReactNode; currentView: View; onNavigate: (v: View) => void }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            <Sidebar currentView={currentView} onNavigate={onNavigate} />
            <main className="flex-1 overflow-auto p-8 pt-6">
                {children}
            </main>
        </div>
    );
}

function Sidebar({ currentView, onNavigate }: { currentView: View; onNavigate: (v: View) => void }) {
    const { theme, setTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);

    const navItem = (view: View, label: string, Icon: any) => (
        <button
            onClick={() => onNavigate(view)}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all text-sm font-medium",
                currentView === view
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );

    const currentThemeIcon = () => {
        switch (theme) {
            case 'light': return Sun;
            case 'dark': return Moon;
            case 'midnight': return Sparkles;
            case 'forest': return Trees;
            default: return Laptop;
        }
    };
    const ThemeIcon = currentThemeIcon();

    return (
        <div className="hidden border-r bg-card md:flex w-64 flex-col transition-colors duration-300">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <span>DBAT</span>
                </span>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 lg:px-4 gap-1">
                    {navItem('dashboard', 'Dashboard', LayoutDashboard)}
                    {navItem('projects', 'Projects', FolderGit2)}
                    {navItem('analytics', 'Analytics', BarChart3)}
                    {navItem('reports', 'Reports', FileText)}
                    {navItem('settings', 'Settings', Settings)}
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex w-full items-center justify-between rounded-lg border bg-background p-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <ThemeIcon className="h-4 w-4" />
                            <span className="capitalize">{theme} Theme</span>
                        </span>
                    </button>

                    {menuOpen && (
                        <div className="absolute bottom-full mb-2 left-0 w-full rounded-lg border bg-popover p-1 shadow-md animate-in slide-in-from-bottom-2 fade-in-20">
                            {[
                                { t: 'light', label: 'Light', icon: Sun },
                                { t: 'dark', label: 'Dark', icon: Moon },
                                { t: 'midnight', label: 'Midnight', icon: Sparkles },
                                { t: 'forest', label: 'Forest', icon: Trees },
                                { t: 'system', label: 'System', icon: Laptop },
                            ].map((opt) => (
                                <button
                                    key={opt.t}
                                    onClick={() => { setTheme(opt.t as Theme); setMenuOpen(false); }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                                        theme === opt.t ? "bg-accent text-accent-foreground" : "text-popover-foreground"
                                    )}
                                >
                                    <opt.icon className="h-4 w-4" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
