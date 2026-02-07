import React from 'react';
import type { Analytics } from '../types';
import { cn } from '../../lib/utils';
import { GitCommit, TrendingUp, Zap, Clock, Calendar, Activity, Laptop, Flame } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function KpiCards({ a }: { a: Analytics }) {
  const mp = a.mostProductive;
  const avgChurn = Math.round((a.totals.insertions + a.totals.deletions) / (a.totals.activeDays || 1));

  const items = [
    { label: 'Impact Score', value: a.impactScore, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Total Commits', value: a.totals.commits, icon: GitCommit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Days', value: a.totals.activeDays, icon: Calendar, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Longest Streak', value: `${a.streak.longest} days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Avg Churn / Day', value: avgChurn, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Weekend Ratio', value: `${a.weekendRatio.weekendPct}%`, icon: Laptop, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Focus Sessions', value: a.focusSessions.total, icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Most Productive', value: `${WEEKDAYS[mp.weekday]} ${String(mp.hour).padStart(2, '0')}:00`, icon: TrendingUp, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} {...item} />
      ))}
    </div>
  );
}

function Card({ label, value, icon: Icon, color, bg }: { label: string; value: React.ReactNode, icon: any, color: string, bg: string }) {
  return (
    <div className="group overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("p-2 rounded-lg transition-colors group-hover:bg-opacity-80", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
