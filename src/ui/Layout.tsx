import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

const ThemeContext = React.createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function useTheme() {
    const context = React.useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 pt-6">
                {children}
            </main>
        </div>
    );
}

function Sidebar() {
    const { toggleTheme } = useTheme();

    return (
        <div className="hidden border-r bg-card md:block w-64 flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <span className="flex items-center gap-2 font-semibold">
                    <span className="h-6 w-6 rounded-lg bg-primary"></span>
                    <span>DBAT</span>
                </span>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <a href="#" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary">
                        Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                        Analytics
                    </a>
                    <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                        Reports
                    </a>
                    <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                        Settings
                    </a>
                </nav>
            </div>
            <div className="mt-auto p-4">
                <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-2 rounded-lg border bg-background p-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                >
                    Toggle Theme
                </button>
            </div>
        </div>
    );
}
