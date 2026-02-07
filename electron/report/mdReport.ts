const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildMarkdownReport(payload: any): string {
  const { mode } = payload ?? {};
  const title = mode === 'github' ? 'DBAT GitHub Report' : 'DBAT Local Repo Report';

  const analytics = payload?.analytics;
  const totals = analytics?.totals ?? {};
  const streak = analytics?.streak ?? {};
  const weekend = analytics?.weekendRatio ?? {};
  const focus = analytics?.focusSessions ?? {};
  const most = analytics?.mostProductive ?? {};

  const topFiles = analytics?.topFiles ?? [];
  const topRepos = payload?.topRepos ?? [];
  const techProfile = payload?.techProfile ?? [];

  const scopeLine =
    mode === 'github'
      ? `**GitHub Username:** ${payload?.username ?? 'N/A'}  \n**Repos scanned:** ${payload?.scannedRepos ?? 0} / ${payload?.totalReposFound ?? 0}`
      : `**Repository:** ${payload?.repoPath ?? 'N/A'}  \n**Date range:** ${payload?.range?.dateFrom ?? 'All time'} → ${payload?.range?.dateTo ?? 'Now'}`;

  const md: string[] = [];
  md.push(`# ${title}`);
  md.push('');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push('');
  md.push(scopeLine);
  md.push('');
  md.push('---');
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push(`- Total commits: **${totals.commits ?? 0}**`);
  md.push(`- Active days: **${totals.activeDays ?? 0}**`);
  md.push(`- Insertions / Deletions: **${totals.insertions ?? 0} / ${totals.deletions ?? 0}**`);
  md.push(`- Longest streak: **${streak.longest ?? 0} days**`);
  md.push(`- Current streak (from last active day): **${streak.current ?? 0} days**`);
  md.push(`- Weekend activity: **${weekend.weekend ?? 0}** commits (${weekend.weekendPct ?? 0}%)`);
  md.push(`- Focus sessions: **${focus.total ?? 0}**, avg duration **${focus.avgMinutes ?? 0} min**`);
  md.push(`- Most productive time: **${WEEKDAYS[most.weekday ?? 0]} @ ${String(most.hour ?? 0).padStart(2, '0')}:00**`);
  md.push('');

  if (mode === 'github') {
    md.push('---');
    md.push('');
    md.push('## GitHub Insights');
    md.push('');
    md.push(`**Open-source engagement score (heuristic):** **${payload?.engagementScore ?? 0}/100**`);
    md.push('');
    md.push('### Top repositories (by commits collected)');
    md.push('');
    md.push('| Repo | Commits |');
    md.push('|---|---:|');
    for (const r of topRepos) md.push(`| ${r.repo} | ${r.commits} |`);
    md.push('');
    md.push('### Technology profile (by bytes of code)');
    md.push('');
    md.push('| Language | Bytes |');
    md.push('|---|---:|');
    for (const t of techProfile) md.push(`| ${t.language} | ${t.bytes} |`);
    md.push('');
  } else {
    md.push('---');
    md.push('');
    md.push('## Repository Insights');
    md.push('');
    md.push('### Top modified files');
    md.push('');
    md.push('| File | Commits | Insertions | Deletions |');
    md.push('|---|---:|---:|---:|');
    for (const f of topFiles) md.push(`| ${f.path} | ${f.commits} | ${f.ins} | ${f.del} |`);
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('## Notes');
  md.push('');
  md.push('- Local mode uses Git CLI numstat for insertions/deletions.');
  md.push('- GitHub mode uses commits endpoint (bulk per-file stats not available), so file-level stats are not included.');
  md.push('- Focus sessions use a 45-minute gap rule.');
  md.push('');

  return md.join('\n');
}
