import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import type { Analytics } from '../types';
import { cn } from '../../lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function Charts({ a }: { a: Analytics }) {
  if (a.totals.commits === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed bg-muted/50 text-muted-foreground">
        No commit data available for this period.
      </div>
    );
  }

  const last30 = a.commitsByDay.slice(-30);
  const byWeekday = a.commitsByWeekday.map(x => ({ name: WEEKDAYS[x.weekday], commits: x.commits }));
  const byHour = a.commitsByHour.map(x => ({ hour: `${String(x.hour).padStart(2, '0')}`, commits: x.commits }));
  const heat = a.heatmap;

  // Transform heatmap data for grid display
  const heatRows = Array.from({ length: 7 }, (_, wd) =>
    Array.from({ length: 24 }, (_, hr) => heat.find(x => x.weekday === wd && x.hour === hr)?.commits ?? 0)
  );
  const maxHeat = Math.max(1, ...heat.map(x => x.commits));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel title="Activity Timeline (Last 30 Active Days)">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30}>
              <defs>
                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" hide />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Area type="monotone" dataKey="commits" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCommits)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Code Churn (Last 30 Active Days)">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.churnByDay.slice(-30)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" hide />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar dataKey="churn" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Languages Used">
        <div className="flex h-[250px] items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={a.languages}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="count"
                nameKey="language"
              >
                {a.languages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] text-xs">
            {a.languages.map((l, i) => (
              <div key={l.language} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="font-medium uppercase">{l.language}</span>
                <span className="text-muted-foreground">({l.count})</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Productivity by Hour">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar dataKey="commits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="col-span-1 xl:col-span-2">
        <Panel title="Activity Heatmap">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground w-10"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="p-1 text-center text-[10px] text-muted-foreground">{String(h).padStart(2, '0')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatRows.map((cells, wd) => (
                  <tr key={wd}>
                    <td className="p-2 text-xs font-medium text-muted-foreground">{WEEKDAYS[wd]}</td>
                    {cells.map((v, i) => {
                      const intensity = v / maxHeat;
                      // Use CSS variables for color scaling? manually for now
                      // bg-primary is usually green-600.
                      // We'll use opacity for simplicity or a color scale.
                      return (
                        <td key={i} className="p-0.5">
                          <div
                            title={`${WEEKDAYS[wd]} ${String(i).padStart(2, '0')}:00 - ${v} commits`}
                            className="h-6 w-full rounded-sm transition-all hover:ring-2 hover:ring-ring"
                            style={{
                              backgroundColor: `hsl(var(--primary))`,
                              opacity: 0.1 + (intensity * 0.9)
                            }}
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold leading-none tracking-tight">{title}</h3>
      {children}
    </div>
  );
}
