import React from 'react';
import type { Analytics } from '../types';
import { cn } from '../../lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function KpiCards({ a }: { a: Analytics }) {
  const mp = a.mostProductive;
  const avgChurn = Math.round((a.totals.insertions + a.totals.deletions) / (a.totals.activeDays || 1));

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card label="Impact Score" value={a.impactScore} className="bg-primary/5 border-primary/20" valueClass="text-primary" />
      <Card label="Active Days" value={a.totals.activeDays} />
      <Card label="Longest Streak" value={`${a.streak.longest} days`} />
      <Card label="Total Commits" value={a.totals.commits} />

      <Card label=" Avg Churn / Day" value={avgChurn} />
      <Card label="Weekend Ratio" value={`${a.weekendRatio.weekendPct}%`} />
      <Card label="Focus Sessions" value={a.focusSessions.total} />
      <Card label="Best Time" value={`${WEEKDAYS[mp.weekday]} ${String(mp.hour).padStart(2, '0')}:00`} />
    </div>
  );
}

function Card({ label, value, className, valueClass }: { label: string; value: React.ReactNode, className?: string, valueClass?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md", className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("mt-2 text-2xl font-bold tracking-tight", valueClass)}>{value}</div>
    </div>
  );
}
