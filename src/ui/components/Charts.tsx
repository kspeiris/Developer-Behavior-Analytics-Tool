import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import type { Analytics } from '../types';
import { cn } from '../../lib/utils';
import { Layers } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function Charts({ a }: { a: Analytics }) {
  if (a.totals.commits === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
        <Layers className="h-10 w-10 opacity-20" />
        <p>No activity recorded in this period.</p>
      </div>
    );
  }

  const last30 = a.commitsByDay.slice(-30);
  const byHour = a.commitsByHour.map(x => ({ hour: `${String(x.hour).padStart(2, '0')}`, commits: x.commits }));
  const heat = a.heatmap;

  // Heatmap prep
  const heatRows = Array.from({ length: 7 }, (_, wd) =>
    Array.from({ length: 24 }, (_, hr) => heat.find(x => x.weekday === wd && x.hour === hr)?.commits ?? 0)
  );
  const maxHeat = Math.max(1, ...heat.map(x => x.commits));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel title="Activity Timeline" subtitle="Last 30 active days">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30}>
              <defs>
                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" hide />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="commits" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Code Churn" subtitle="Insertions & Deletions">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.churnByDay.slice(-30)} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" hide />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="churn" name="Churn" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Languages" subtitle="File extension breakdown">
        <div className="flex h-[300px] items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={a.languages}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={4}
                dataKey="count"
                nameKey="language"
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {a.languages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex max-h-[250px] w-48 flex-col gap-2 overflow-y-auto pl-4 text-xs scrollbar-thin scrollbar-thumb-muted">
            {a.languages.map((l, i) => (
              <div key={l.language} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="font-medium truncate flex-1">{l.language}</span>
                <span className="text-muted-foreground">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Productivity by Hour" subtitle="Commits distribution">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} content={<CustomTooltip />} />
              <Bar dataKey="commits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="col-span-1 xl:col-span-2">
        <Panel title="Activity Heatmap" subtitle="Intensity by day & hour">
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="w-12"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="p-1 text-center text-[10px] text-muted-foreground font-normal">{String(h).padStart(2, '0')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatRows.map((cells, wd) => (
                  <tr key={wd}>
                    <td className="pr-2 text-right text-[10px] font-medium text-muted-foreground uppercase">{WEEKDAYS[wd]}</td>
                    {cells.map((v, i) => {
                      const intensity = v > 0 ? (v / maxHeat) : 0;
                      return (
                        <td key={i} className="p-[2px]">
                          <div
                            className={cn(
                              "h-6 w-full rounded-[2px] transition-all hover:scale-110 hover:shadow-sm",
                              v === 0 ? "bg-muted/30" : "bg-primary"
                            )}
                            style={{ opacity: v === 0 ? 1 : 0.2 + (intensity * 0.8) }}
                            title={`${WEEKDAYS[wd]} ${String(i).padStart(2, '0')}:00 — ${v} commits`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/10">
      <div className="mb-6 space-y-1">
        <h3 className="text-base font-semibold leading-none tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
        <div className="mb-1 text-xs font-semibold">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill || p.color }}></span>
            <span className="text-muted-foreground uppercase">{p.name}:</span>
            <span className="font-mono font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
