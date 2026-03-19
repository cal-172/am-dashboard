import React, { useEffect, useState } from 'react';
import {
  Building2, DollarSign, Calendar, ShieldCheck, Hammer,
  TrendingUp, TrendingDown, Users, ExternalLink, BarChart3,
  Minus, Mail, FileText, Link2
} from 'lucide-react';

// ─── HELPERS ────────────────────────────────────────────────────────────────

type Status = 'healthy' | 'watch' | 'issue';
type DateStatus = 'complete' | 'upcoming' | 'due-soon' | 'overdue';

const DATE_ORDER: Record<DateStatus, number> = { overdue: 0, 'due-soon': 1, upcoming: 2, complete: 3 };

function dscrStatus(v: number): Status      { return v >= 1.25 ? 'healthy' : v >= 1.10 ? 'watch' : 'issue'; }
function occupancyStatus(v: number): Status { return v >= 93   ? 'healthy' : v >= 90   ? 'watch' : 'issue'; }
function opReserveStatus(v: number): Status { return v >= 4.0  ? 'healthy' : v >= 2.0  ? 'watch' : 'issue'; }
function capexStatus(actual: number, expected: number): Status {
  const lag = expected - actual;
  return lag <= 10 ? 'healthy' : lag <= 20 ? 'watch' : 'issue';
}
function capexScheduleLabel(actual: number, expected: number): string {
  const diff = actual - expected;
  if (diff > 10)   return 'Ahead of schedule';
  if (diff >= 0)   return 'On track';
  if (diff >= -10) return 'Slightly behind';
  if (diff >= -20) return 'Behind schedule';
  return 'Significantly behind';
}

function keyDateStatus(date: string, completed: string | null): DateStatus {
  if (completed) return 'complete';
  const today = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'upcoming';
  if (d < today) return 'overdue';
  if (d.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000) return 'due-soon';
  return 'upcoming';
}

function parseDisplayNum(s: string | null | undefined): number | null {
  if (!s) return null;
  let str = String(s).trim();
  if (!str || str === '—') return null;
  if (str.startsWith('+')) str = str.slice(1);
  if (str.startsWith('(') && str.endsWith(')')) str = '-' + str.slice(1, -1);
  let neg = false;
  if (str.startsWith('-$')) { neg = true; str = str.slice(2); }
  else if (str.startsWith('$')) str = str.slice(1);
  let mul = neg ? -1 : 1;
  if (str.endsWith('K')) { mul *= 1e3; str = str.slice(0, -1); }
  else if (str.endsWith('M')) { mul *= 1e6; str = str.slice(0, -1); }
  else if (str.endsWith('B')) { mul *= 1e9; str = str.slice(0, -1); }
  if (str.endsWith('%')) str = str.slice(0, -1);
  if (str.endsWith('x')) str = str.slice(0, -1);
  const n = parseFloat(str.replace(/,/g, ''));
  return isNaN(n) ? null : n * mul;
}

function formatCurrency(n: number | null): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const neg = n < 0;
  let s: string;
  if (abs >= 1e9)      s = '$' + (abs / 1e9).toFixed(1) + 'B';
  else if (abs >= 1e6) s = '$' + (abs / 1e6).toFixed(1) + 'M';
  else if (abs >= 1e3) s = '$' + Math.round(abs / 1e3) + 'K';
  else                 s = '$' + Math.round(abs).toLocaleString();
  return neg ? `(${s})` : s;
}

function computeMonthsToMaturity(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const today = new Date();
  const mat = new Date(dateStr);
  if (isNaN(mat.getTime())) return 0;
  const diff = (mat.getFullYear() - today.getFullYear()) * 12 + (mat.getMonth() - today.getMonth());
  return Math.max(0, diff);
}

const STATUS_COLORS: Record<Status, { chip: string; dot: string; border: string; label: string }> = {
  healthy: { chip: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  border: 'border-l-green-500',  label: 'Healthy' },
  watch:   { chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', border: 'border-l-yellow-500', label: 'Watch'   },
  issue:   { chip: 'bg-red-100 text-red-800',       dot: 'bg-red-500',    border: 'border-l-red-500',    label: 'Issue'   },
};

const DATE_CHIP: Record<DateStatus, { cls: string; label: string }> = {
  complete:   { cls: 'bg-green-100 text-green-800',   label: 'Complete'  },
  upcoming:   { cls: 'bg-slate-100 text-slate-600',   label: 'Upcoming'  },
  'due-soon': { cls: 'bg-yellow-100 text-yellow-800', label: 'Due Soon'  },
  overdue:    { cls: 'bg-red-100 text-red-800',       label: 'Overdue'   },
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Status }) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      {c.label}
    </span>
  );
}

function TrendBadge({ delta, up }: { delta: string; up: boolean }) {
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      <Icon className="w-3 h-3" />
      {delta}
    </span>
  );
}

function KpiCard({
  icon: Icon, title, main, sub, status, trend, note
}: {
  icon: React.ElementType;
  title: string;
  main: React.ReactNode;
  sub: string;
  status: Status;
  trend?: { delta: string; up: boolean };
  note?: string;
}) {
  const c = STATUS_COLORS[status];
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${c.border} p-5 flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{main}</p>
        <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
      </div>
      <div className="flex items-center justify-between">
        <StatusChip status={status} />
        {trend && <TrendBadge {...trend} />}
      </div>
      {note && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-0.5">{note}</p>
      )}
    </div>
  );
}

function CardMeta({ source, asOf, updated }: { source?: string; asOf?: string; updated?: string }) {
  return (
    <div className="flex flex-wrap gap-3 pt-3 mt-4 border-t border-slate-100">
      {source  && <span className="text-xs text-slate-400">Source: {source}</span>}
      {asOf    && <span className="text-xs text-slate-400">As Of: {asOf}</span>}
      {updated && <span className="text-xs text-slate-400">Updated: {updated}</span>}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, children, meta, highlight = false
}: {
  title: string; icon?: React.ElementType; children: React.ReactNode; meta?: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${highlight ? 'border-teal-300 bg-teal-50/30' : 'border-slate-200'} p-6`}>
      <div className="flex items-center gap-2 mb-5">
        {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-teal-600' : 'text-slate-400'}`} />}
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
      {meta}
    </div>
  );
}

function Field({
  label, value, highlight = false, mono = false, bold = false
}: {
  label: string; value: React.ReactNode; highlight?: boolean; mono?: boolean; bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium leading-tight max-w-[52%]">{label}</span>
      <span className={`text-sm text-right leading-tight ${bold ? 'font-bold' : 'font-semibold'} ${highlight ? 'text-teal-700' : 'text-slate-900'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function SubGroupHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1 first:mt-0">{label}</p>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function PropertySummary() {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/property-summary/viewer')
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading…</span>
      </div>
    );
  }

  const d = apiData || {};
  const kpi = d.kpi || {};

  // ── Derive numeric KPIs (null-safe) ────────────────────────────────────────
  const dscr         = kpi.dscr         ?? null;
  const dscrPrev     = kpi.dscrPrev     ?? null;
  const occupancy    = kpi.occupancy    ?? null;
  const occupancyPrev= kpi.occupancyPrev?? null;
  const capexPct     = kpi.capexPct     ?? null;
  const capexPctPrev = kpi.capexPctPrev ?? null;
  const monthsCoverage= null; // not yet calculable without expense data

  // Deltas (null if either side missing)
  const dscrDelta      = dscr != null && dscrPrev != null    ? dscr - dscrPrev          : null;
  const occupancyDelta = occupancy != null && occupancyPrev != null ? occupancy - occupancyPrev : null;
  const mosDelta       = null;
  const capexDeltaPct  = capexPct != null && capexPctPrev != null ? capexPct - capexPctPrev : null;

  // Status — fall back to 'watch' when no data
  const dStatus: Status = dscr != null      ? dscrStatus(dscr)              : 'watch';
  const oStatus: Status = occupancy != null ? occupancyStatus(occupancy)    : 'watch';
  const rStatus: Status = monthsCoverage != null ? opReserveStatus(monthsCoverage) : 'watch';
  const capexExpected  = capexPctPrev ?? capexPct ?? 0;
  const cStatus: Status = capexPct != null  ? capexStatus(capexPct, capexExpected) : 'watch';
  const scheduleLabel   = capexPct != null  ? capexScheduleLabel(capexPct, capexExpected) : '—';

  // ── Named constants matching the original mock shape ──────────────────────
  const prop = d.property || {};
  const loan = d.loan || {};
  const inv  = d.investment || {};
  const opRes= d.opReserves || {};
  const capex= d.capex || {};
  const noi  = d.noi || {};
  const lr   = d.lenderReserves || {};
  const le   = d.lenderEscrows  || {};

  const PROPERTY = {
    name:             prop.name            || 'Regatta Apartments',
    address:          prop.address         || '—',
    units:            prop.units           || '—',
    yearBuilt:        prop.yearBuilt       || '—',
    occupancy:        occupancy            ?? 0,
    occupancyPrev:    occupancyPrev        ?? 0,
    acquisitionDate:  prop.acquisitionDate || '—',
    purchasePrice:    prop.purchasePrice   || '—',
    totalCapitalization: prop.totalCap    || '—',
    updatedAt:        prop.updatedAt       || '—',
  };

  const LOAN = {
    amount:          loan.amount          || '—',
    ltv:             loan.ltv             || '—',
    lender:          loan.lender          || '—',
    rate:            loan.rate            || '—',
    term:            loan.term            || '—',
    ioPeriod:        loan.ioPeriod        || '—',
    ioRemaining:     loan.ioRemaining     ?? 0,
    prepayPenalty:   loan.prepayPenalty   || '—',
    maturityDate:    loan.maturityDate    || '—',
    monthsToMaturity:computeMonthsToMaturity(loan.maturityDate),
    dscr:            dscr                 ?? 0,
    dscrPrev:        dscrPrev             ?? 0,
    asOf:            loan.asOf            || '',
    source:          loan.source          || '',
  };

  const equityNum   = parseDisplayNum(inv.initialEquity);
  const returnedNum = parseDisplayNum(inv.capitalReturned);
  const unreturnedNum = equityNum != null && returnedNum != null ? equityNum - returnedNum : null;

  const INVESTMENT = {
    initialEquity:               inv.initialEquity               || '—',
    capitalReturned:             inv.capitalReturned             || '—',
    unreturnedCapital:           formatCurrency(unreturnedNum),
    preferredReturn:             inv.preferredReturn             || '—',
    currentDistributionAnnualized:    inv.currentDistribAnnualized    || '—',
    currentDistributionAnnualizedPct: inv.currentDistribAnnualizedPct || '—',
    cumPrefShortfall:            inv.cumPrefShortfall            || '—',
    itdDistributionPaid:         inv.itdDistribPaid              || '—',
    itdDistributionPaidPct:      inv.itdDistribPaidPct           || '—',
    asOf:                        inv.asOf                        || '',
    source:                      inv.source                      || '',
  };

  const OP_RESERVES = {
    initialBalance:    opRes.initialBalance    || '—',
    netCashFlowToDate: opRes.netCashFlowToDate || '—',
    remainingBalance:  opRes.remainingBalance  || '—',
    monthsOfCoverage:  monthsCoverage          ?? 0,
    monthsOfCoveragePrev: 0,
    targetMonths:      opRes.targetMonths      ?? 4.0,
    asOf:              opRes.asOf              || '',
    source:            opRes.source            || '',
  };

  const capexBudgetNum = parseDisplayNum(capex.budget);
  const capexSpendNum  = parseDisplayNum(capex.spendToDate);
  const capexRemainingNum = capexBudgetNum != null && capexSpendNum != null ? capexBudgetNum - capexSpendNum : null;

  const CAPEX = {
    initialAmount:   capex.budget          || '—',
    raiseShortfall:  '—',
    spendToDate:     capex.spendToDate     || '—',
    remaining:       formatCurrency(capexRemainingNum),
    pctComplete:     capexPct              ?? 0,
    expectedPct:     capexExpected,
    pctCompletePrev: capexPctPrev          ?? 0,
    targetCompletion:capex.targetCompletion|| '—',
    asOf:            capex.asOf            || '',
    source:          capex.source          || '',
  };

  const NOI = {
    current:  noi.current  || '—',
    vsBudget: noi.vsBudget || '—',
    favorable:noi.favorable ?? true,
    period:   'LTM',
    asOf:     noi.asOf     || '',
  };

  const LENDER_RESERVES = {
    items: lr.items || [],
    total: lr.total || '—',
    asOf:  lr.asOf  || '',
    source:lr.source|| '',
  };

  const LENDER_ESCROWS = {
    items: le.items || [],
    total: le.total || '—',
    asOf:  le.asOf  || '',
    source:le.source|| '',
  };

  const rawContacts: any[] = d.contacts || [];
  const CONTACTS = rawContacts.map(c => {
    const iconMap: Record<string, React.ElementType> = { email: Mail, link: Link2, document: FileText };
    const icon = iconMap[c.type] || Link2;
    const isEmail = c.type === 'email';
    const href = isEmail ? `mailto:${c.emailOrUrl}` : (c.emailOrUrl || '#');
    const detail = isEmail ? c.emailOrUrl : 'View →';
    return { label: c.label, name: c.name, detail, href, icon };
  });

  const rawKeyDates: any[] = d.keyDates || [];
  const KEY_DATES_RAW = rawKeyDates.map(kd => ({
    label: kd.label,
    date: kd.dueDate,
    completedDate: kd.completed || null,
  }));

  const KEY_DATES = [...KEY_DATES_RAW]
    .map(d => ({ ...d, _status: keyDateStatus(d.date, d.completedDate) }))
    .sort((a, b) => DATE_ORDER[a._status] - DATE_ORDER[b._status]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-[#0D3D45] text-white px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 opacity-60" />
                <span className="text-xs font-semibold uppercase tracking-widest opacity-60">Property Summary</span>
              </div>
              <h1 className="text-3xl font-bold">{PROPERTY.name}</h1>
              <p className="text-sm opacity-70 mt-1">{PROPERTY.address}</p>
              <div className="flex items-center gap-4 mt-3 text-xs opacity-60">
                <span>{PROPERTY.units} Units</span>
                <span>·</span>
                <span>Built {PROPERTY.yearBuilt}</span>
                <span>·</span>
                <span>Updated: {PROPERTY.updatedAt}</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-50">Asset ID</span>
              <p className="text-sm font-mono font-bold opacity-80 mt-1">1163_rr</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* ── NOI Signal Strip ──────────────────────────────────────────────── */}
        <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${NOI.favorable ? 'border-l-green-500' : 'border-l-red-500'} shadow-sm px-6 py-4 flex items-center gap-6 flex-wrap`}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">NOI Performance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{NOI.current}</span>
            <span className="text-xs text-slate-400">{NOI.period}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${NOI.favorable ? 'text-green-700' : 'text-red-600'}`}>
            {NOI.favorable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-semibold">{NOI.vsBudget} vs Budget</span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${NOI.favorable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {NOI.favorable ? 'Healthy' : 'Issue'}
          </span>
          <span className="ml-auto text-xs text-slate-400">As Of: {NOI.asOf}</span>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp}
            title="DSCR"
            main={dscr != null ? dscr.toFixed(2) + 'x' : '—'}
            sub="Debt service coverage ratio"
            status={dStatus}
            trend={dscrDelta != null ? { delta: (dscrDelta >= 0 ? '+' : '') + dscrDelta.toFixed(2) + ' vs last mo', up: dscrDelta >= 0 } : undefined}
            note={dscr != null ? 'Covenant: 1.25x · Headroom: ' + (dscr - 1.25).toFixed(2) + 'x' : undefined}
          />
          <KpiCard
            icon={Building2}
            title="Occupancy"
            main={occupancy != null ? occupancy.toFixed(1) + '%' : '—'}
            sub={occupancy != null ? `Vacancy: ${(100 - occupancy).toFixed(1)}%` : 'No data'}
            status={oStatus}
            trend={occupancyDelta != null ? { delta: (occupancyDelta >= 0 ? '+' : '') + occupancyDelta.toFixed(1) + '% vs last mo', up: occupancyDelta >= 0 } : undefined}
            note="Target: 93.0%"
          />
          <KpiCard
            icon={ShieldCheck}
            title="Operating Reserves"
            main={monthsCoverage != null ? monthsCoverage.toFixed(1) + ' mo' : OP_RESERVES.remainingBalance}
            sub={monthsCoverage != null ? `${OP_RESERVES.remainingBalance} remaining balance` : 'Remaining balance'}
            status={rStatus}
            trend={mosDelta != null ? { delta: (mosDelta >= 0 ? '+' : '') + (mosDelta as number).toFixed(1) + ' mo vs last mo', up: (mosDelta as number) >= 0 } : undefined}
            note={'Target: ' + OP_RESERVES.targetMonths.toFixed(1) + ' mo of expense coverage'}
          />
          <KpiCard
            icon={Hammer}
            title="CapEx Progress"
            main={capexPct != null ? capexPct + '%' : '—'}
            sub={capexPct != null ? `${scheduleLabel} · ${CAPEX.spendToDate} of ${CAPEX.initialAmount}` : 'No data'}
            status={cStatus}
            trend={capexDeltaPct != null ? { delta: '+' + capexDeltaPct + '% vs last update', up: true } : undefined}
            note={capexPct != null ? 'Expected: ' + CAPEX.expectedPct + '% · Target: ' + CAPEX.targetCompletion : undefined}
          />
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            <SectionCard title="Summary" icon={Building2}>
              <Field label="Address"              value={PROPERTY.address} />
              <Field label="Unit Count"           value={PROPERTY.units} />
              <Field label="Year Built"           value={PROPERTY.yearBuilt} />
              <Field label="Occupancy"            value={occupancy != null ? occupancy.toFixed(1) + '%' : '—'} />
              <Field label="Acquisition Date"     value={PROPERTY.acquisitionDate} />
              <Field label="Purchase Price"       value={PROPERTY.purchasePrice} mono />
              <Field label="Total Capitalization" value={PROPERTY.totalCapitalization} mono />
              <CardMeta updated={PROPERTY.updatedAt} />
            </SectionCard>

            <SectionCard title="Loan Details" icon={DollarSign}>
              <SubGroupHeader label="Structure" />
              <Field label="Loan Amount"         value={LOAN.amount} mono />
              <Field label="Loan to Value (LTV)" value={LOAN.ltv} />
              <Field label="Lender"              value={LOAN.lender} />

              <SubGroupHeader label="Terms" />
              <Field label="Interest Rate"  value={LOAN.rate} highlight bold />
              <Field label="Term"           value={LOAN.term} />
              <Field label="I/O Period"     value={LOAN.ioPeriod} />
              <Field label="I/O Remaining"  value={LOAN.ioRemaining + ' mo'} />
              <Field label="Prepay Penalty" value={LOAN.prepayPenalty} />

              <SubGroupHeader label="Risk &amp; Timing" />
              <Field
                label="Maturity Date"
                value={
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-teal-700">{LOAN.maturityDate}</span>
                    <span className="text-sm font-bold text-slate-700">{LOAN.monthsToMaturity} months remaining</span>
                  </span>
                }
              />
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                <span className="text-xs text-slate-500 font-medium">DSCR</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{dscr != null ? dscr.toFixed(2) + 'x' : '—'}</span>
                  <StatusChip status={dStatus} />
                </span>
              </div>
              <CardMeta source={LOAN.source} asOf={LOAN.asOf} updated={PROPERTY.updatedAt} />
            </SectionCard>

            <SectionCard title="Investment Details" icon={TrendingUp}>
              <SubGroupHeader label="Capital" />
              <Field label="Initial Equity Invested" value={INVESTMENT.initialEquity}     mono />
              <Field label="Capital Returned"        value={INVESTMENT.capitalReturned}   mono />
              <Field label="Unreturned Capital"      value={INVESTMENT.unreturnedCapital} mono highlight />

              <SubGroupHeader label="Returns" />
              <Field label="Preferred Return" value={INVESTMENT.preferredReturn} />
              <Field
                label="Current Distribution (Ann.)"
                value={
                  <span className="font-mono font-semibold text-slate-900">
                    {INVESTMENT.currentDistributionAnnualized}{' '}
                    <span className="text-slate-500 font-normal">({INVESTMENT.currentDistributionAnnualizedPct})</span>
                  </span>
                }
              />

              <SubGroupHeader label="Performance" />
              <Field label="Cumulative Pref Shortfall" value={INVESTMENT.cumPrefShortfall} mono />
              <Field
                label="ITD Distribution Paid"
                value={
                  <span className="font-mono font-semibold text-slate-900">
                    {INVESTMENT.itdDistributionPaid}{' '}
                    <span className="text-slate-500 font-normal">({INVESTMENT.itdDistributionPaidPct})</span>
                  </span>
                }
              />
              <CardMeta source={INVESTMENT.source} asOf={INVESTMENT.asOf} />
            </SectionCard>

            <SectionCard title="Contacts &amp; Links" icon={Users}>
              <div>
                {CONTACTS.length === 0 && <p className="text-sm text-slate-400">No contacts configured.</p>}
                {CONTACTS.map((c, i) => {
                  const ContactIcon = c.icon;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-start gap-3">
                        <ContactIcon className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 font-medium">{c.label}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{c.name}</p>
                        </div>
                      </div>
                      <a
                        href={c.href}
                        className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:text-teal-900 transition-colors flex-shrink-0"
                      >
                        {c.detail}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div className="space-y-6">

            <SectionCard title="Lender Reserves" icon={ShieldCheck}>
              {LENDER_RESERVES.items.map((r: any, i: number) => (
                <Field key={i} label={r.name} value={r.amount} mono />
              ))}
              {LENDER_RESERVES.items.length === 0 && <p className="text-sm text-slate-400">No reserves configured.</p>}
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Reserves</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_RESERVES.total}</span>
              </div>
              <CardMeta source={LENDER_RESERVES.source} asOf={LENDER_RESERVES.asOf} />
            </SectionCard>

            <SectionCard title="Lender Escrows" icon={ShieldCheck}>
              {LENDER_ESCROWS.items.map((e: any, i: number) => (
                <Field key={i} label={e.name} value={e.amount} mono />
              ))}
              {LENDER_ESCROWS.items.length === 0 && <p className="text-sm text-slate-400">No escrows configured.</p>}
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Escrows</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_ESCROWS.total}</span>
              </div>
              <CardMeta source={LENDER_ESCROWS.source} asOf={LENDER_ESCROWS.asOf} />
            </SectionCard>

            <SectionCard title="Operating Reserves" icon={ShieldCheck}>
              <div className="flex items-end justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Expense Coverage (Months)</p>
                  <p className="text-4xl font-bold text-slate-900 leading-none">
                    {monthsCoverage != null ? monthsCoverage.toFixed(1) : '—'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">months</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusChip status={rStatus} />
                  {mosDelta != null && <TrendBadge delta={`+${(mosDelta as number).toFixed(1)} mo vs last mo`} up />}
                </div>
              </div>
              <Field label="Remaining Balance"     value={OP_RESERVES.remainingBalance}  mono highlight />
              <Field label="Initial Balance"       value={OP_RESERVES.initialBalance}    mono />
              <Field label="Net Cash Flow To Date" value={OP_RESERVES.netCashFlowToDate} mono />
              <CardMeta source={OP_RESERVES.source} asOf={OP_RESERVES.asOf} />
            </SectionCard>

            <SectionCard title="CapEx Progress" icon={Hammer}>
              <div className="mb-5 pb-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">% Complete</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{capexPct != null ? capexPct + '%' : '—'}</span>
                    <StatusChip status={cStatus} />
                  </span>
                </div>
                {capexPct != null ? (
                  <>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 relative">
                      <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${CAPEX.pctComplete}%` }}></div>
                      <div className="absolute top-0 h-2.5 border-r-2 border-dashed border-slate-500 opacity-70" style={{ left: `${CAPEX.expectedPct}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1 mb-2">
                      <span className="text-xs text-slate-400">0%</span>
                      <span className="text-xs text-slate-400">Expected: {CAPEX.expectedPct}%</span>
                      <span className="text-xs text-slate-400">100%</span>
                    </div>
                    <p className={`text-xs font-semibold ${cStatus === 'healthy' ? 'text-green-700' : cStatus === 'watch' ? 'text-yellow-700' : 'text-red-600'}`}>
                      {scheduleLabel} — {CAPEX.pctComplete - CAPEX.expectedPct > 0
                        ? `${CAPEX.pctComplete - CAPEX.expectedPct}% ahead of expected ${CAPEX.expectedPct}%`
                        : `${CAPEX.expectedPct - CAPEX.pctComplete}% behind expected ${CAPEX.expectedPct}%`
                      }
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No CapEx data available.</p>
                )}
              </div>
              <Field label="Initial CapEx Amount" value={CAPEX.initialAmount}    mono />
              <Field label="Less Raise Shortfall" value={CAPEX.raiseShortfall}   mono />
              <Field label="CapEx Spend To Date"  value={CAPEX.spendToDate}      mono highlight />
              <Field label="CapEx Remaining"      value={CAPEX.remaining}        mono />
              <Field label="Target Completion"    value={CAPEX.targetCompletion} />
              <CardMeta source={CAPEX.source} asOf={CAPEX.asOf} />
            </SectionCard>

            <SectionCard title="Key Dates" icon={Calendar}>
              <div>
                {KEY_DATES.length === 0 && <p className="text-sm text-slate-400">No key dates configured.</p>}
                {KEY_DATES.map((d, i) => {
                  const chip = DATE_CHIP[d._status];
                  return (
                    <div key={i} className="flex items-start justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{d.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.date}</p>
                        {d.completedDate && (
                          <p className="text-xs text-green-600 mt-0.5">Completed: {d.completedDate}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${chip.cls}`}>
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

          </div>
        </div>
      </div>
    </div>
  );
}
