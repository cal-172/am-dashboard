import React from 'react';
import {
  Building2, DollarSign, Calendar, ShieldCheck, Hammer,
  TrendingUp, TrendingDown, Users, ExternalLink, BarChart3, Minus
} from 'lucide-react';

// ─── MOCK DATA (fed from Admin in production) ───────────────────────────────
const PROPERTY = {
  name: 'Regatta Apartments',
  address: '12635 Scarsdale, San Antonio, TX 78217',
  units: 200,
  yearBuilt: 1985,
  occupancy: 94.5,
  preleased: 3.2,
  acquisitionDate: 'Jan 15, 2020',
  purchasePrice: '$32.5M',
  totalCapitalization: '$37.2M',
  updatedAt: 'Aug 20, 2025',
};

const LOAN = {
  amount: '$28.5M',
  ltv: '65.0%',
  lender: 'Metropolitan Life Insurance Co.',
  term: '10 years',
  rate: '4.25%',
  ioPeriod: '24 months',
  ioRemaining: 0,
  prepayPenalty: 'Step-down (3-2-1-0)',
  maturityDate: 'Jan 15, 2030',
  dscr: 1.32,
  dscrPrev: 1.24,
  monthsToMaturity: 45,
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const INVESTMENT = {
  initialEquity: '$7.8M',
  capitalReturned: '$1.2M',
  unreturnedCapital: '$6.6M',
  preferredReturn: '7.00%',
  currentDistributionAnnualized: '$624K',
  currentDistributionAnnualizedPct: '8.00%',
  cumPrefShortfall: '$320K',
  itdDistributionPaid: '$1.84M',
  itdDistributionPaidPct: '23.6%',
  asOf: 'Aug 20, 2025',
  source: 'Investor Records',
};

const LENDER_RESERVES = {
  debtServiceReserve: '$850K',
  repairEscrow: '$120K',
  replacementReserve: '$680K',
  total: '$1.65M',
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const LENDER_ESCROWS = {
  insuranceEscrow: '$48K',
  taxEscrow: '$142K',
  total: '$190K',
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const OP_RESERVES = {
  initialBalance: '$500K',
  netCashFlowToDate: '+$82K',
  remainingBalance: '$582K',
  monthsOfCoverage: 4.8,
  monthsOfCoveragePrev: 4.5,
  asOf: 'Aug 20, 2025',
  source: 'Operating Account',
};

const CAPEX = {
  initialAmount: '$2.1M',
  raiseShortfall: '($150K)',
  spendToDate: '$1.28M',
  remaining: '$670K',
  pctComplete: 61,
  expectedPct: 55,
  pctCompletePrev: 57,
  targetCompletion: 'Dec 2026',
  asOf: 'Aug 20, 2025',
  source: 'General Contractor',
};

const NOI = {
  current: '$3.2M',
  vsBudget: '+$148K',
  favorable: true,
  period: 'LTM',
  asOf: 'Aug 20, 2025',
};

// Due Soon = within 30 days from today (mock today = Aug 20, 2025)
const KEY_DATES = [
  { label: 'Lender 90-Day Repairs',   date: 'Apr 1, 2026',  completedDate: null },
  { label: 'Lender 360-Day Repairs',  date: 'Jan 1, 2027',  completedDate: null },
  { label: 'Property Tax',            date: 'Jun 15, 2026', completedDate: 'Jun 10, 2025' },
  { label: 'Insurance Renewal',       date: 'Sep 5, 2025',  completedDate: null },
];

const CONTACTS = [
  { label: 'Lender Contact',   name: 'John Smith',   detail: 'john.smith@metlife.com', href: '#' },
  { label: 'Property Manager', name: 'Emily Chen',   detail: 'emily@regattapm.com',    href: '#' },
  { label: 'SharePoint',       name: 'Document Library',   detail: 'View files →',     href: '#' },
  { label: 'Investor Portal',  name: 'Contact Directory',  detail: 'View contacts →',  href: '#' },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

type Status = 'healthy' | 'watch' | 'issue';
type DateStatus = 'complete' | 'upcoming' | 'due-soon' | 'overdue';

function dscrStatus(v: number): Status   { return v >= 1.25 ? 'healthy' : v >= 1.10 ? 'watch' : 'issue'; }
function occupancyStatus(v: number): Status { return v >= 93 ? 'healthy' : v >= 90 ? 'watch' : 'issue'; }
function opReserveStatus(v: number): Status { return v >= 4.0 ? 'healthy' : v >= 2.0 ? 'watch' : 'issue'; }
function capexStatus(actual: number, expected: number): Status {
  const lag = expected - actual;
  return lag <= 0 ? 'healthy' : lag <= 10 ? 'healthy' : lag <= 20 ? 'watch' : 'issue';
}
function capexScheduleLabel(actual: number, expected: number): string {
  const diff = actual - expected;
  if (diff > 10)  return 'Ahead of schedule';
  if (diff >= 0)  return 'On track';
  if (diff >= -10) return 'Slightly behind';
  if (diff >= -20) return 'Behind schedule';
  return 'Significantly behind';
}

const TODAY = new Date('2025-08-20');
function keyDateStatus(date: string, completed: string | null): DateStatus {
  if (completed) return 'complete';
  const d = new Date(date);
  if (d < TODAY) return 'overdue';
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  if (d.getTime() - TODAY.getTime() <= msIn30Days) return 'due-soon';
  return 'upcoming';
}

const STATUS_COLORS: Record<Status, { chip: string; dot: string; border: string; label: string }> = {
  healthy: { chip: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  border: 'border-l-green-500',  label: 'Healthy' },
  watch:   { chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', border: 'border-l-yellow-500', label: 'Watch'   },
  issue:   { chip: 'bg-red-100 text-red-800',       dot: 'bg-red-500',    border: 'border-l-red-500',    label: 'Issue'   },
};

const DATE_CHIP: Record<DateStatus, { cls: string; label: string }> = {
  complete:  { cls: 'bg-green-100 text-green-800',  label: 'Complete'  },
  upcoming:  { cls: 'bg-slate-100 text-slate-600',  label: 'Upcoming'  },
  'due-soon':{ cls: 'bg-yellow-100 text-yellow-800',label: 'Due Soon'  },
  overdue:   { cls: 'bg-red-100 text-red-800',      label: 'Overdue'   },
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

function TrendBadge({ delta, up, neutral = false }: { delta: string; up: boolean; neutral?: boolean }) {
  if (neutral) return <span className="flex items-center gap-0.5 text-xs text-slate-400"><Minus className="w-3 h-3" />{delta}</span>;
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
  const dStatus = dscrStatus(LOAN.dscr);
  const oStatus = occupancyStatus(PROPERTY.occupancy);
  const rStatus = opReserveStatus(OP_RESERVES.monthsOfCoverage);
  const cStatus = capexStatus(CAPEX.pctComplete, CAPEX.expectedPct);
  const scheduleLabel = capexScheduleLabel(CAPEX.pctComplete, CAPEX.expectedPct);

  const dscrDelta = LOAN.dscr - LOAN.dscrPrev;
  const mosDelta  = OP_RESERVES.monthsOfCoverage - OP_RESERVES.monthsOfCoveragePrev;
  const capexDeltaPct = CAPEX.pctComplete - CAPEX.pctCompletePrev;

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

        {/* ── NOI Signal Strip ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">NOI Performance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{NOI.current}</span>
            <span className="text-xs text-slate-400">{NOI.period}</span>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${NOI.favorable ? 'text-green-600' : 'text-red-500'}`}>
            {NOI.favorable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{NOI.vsBudget} vs Budget</span>
            <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${NOI.favorable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {NOI.favorable ? 'Favorable' : 'Unfavorable'}
            </span>
          </div>
          <span className="ml-auto text-xs text-slate-400">As Of: {NOI.asOf}</span>
        </div>

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp}
            title="DSCR"
            main={LOAN.dscr.toFixed(2) + 'x'}
            sub="Debt service coverage ratio"
            status={dStatus}
            trend={{ delta: (dscrDelta >= 0 ? '+' : '') + dscrDelta.toFixed(2) + ' vs last mo', up: dscrDelta >= 0 }}
            note={'Covenant: 1.25x · Headroom: ' + (LOAN.dscr - 1.25).toFixed(2) + 'x'}
          />
          <KpiCard
            icon={Building2}
            title="Occupancy"
            main={PROPERTY.occupancy.toFixed(1) + '%'}
            sub={`Vacancy: ${(100 - PROPERTY.occupancy).toFixed(1)}%`}
            status={oStatus}
            trend={{ delta: '▼ −0.6% vs last mo', up: false }}
          />
          <KpiCard
            icon={ShieldCheck}
            title="Operating Reserves"
            main={OP_RESERVES.monthsOfCoverage.toFixed(1) + ' mo'}
            sub={`${OP_RESERVES.remainingBalance} remaining balance`}
            status={rStatus}
            trend={{ delta: (mosDelta >= 0 ? '+' : '') + mosDelta.toFixed(1) + ' mo vs last mo', up: mosDelta >= 0 }}
          />
          <KpiCard
            icon={Hammer}
            title="CapEx Progress"
            main={CAPEX.pctComplete + '%'}
            sub={`${scheduleLabel} · ${CAPEX.spendToDate} of ${CAPEX.initialAmount}`}
            status={cStatus}
            trend={{ delta: '+' + capexDeltaPct + '% vs last update', up: true }}
          />
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Summary */}
            <SectionCard title="Summary" icon={Building2}>
              <Field label="Property Name"       value={PROPERTY.name} />
              <Field label="Address"             value={PROPERTY.address} />
              <Field label="Unit Count"          value={PROPERTY.units} />
              <Field label="Year Built"          value={PROPERTY.yearBuilt} />
              <Field label="Occupancy"           value={PROPERTY.occupancy.toFixed(1) + '%'} />
              <Field label="Pre-Leased"          value={PROPERTY.preleased.toFixed(1) + '%'} />
              <Field label="Acquisition Date"    value={PROPERTY.acquisitionDate} />
              <Field label="Purchase Price"      value={PROPERTY.purchasePrice} mono />
              <Field label="Total Capitalization" value={PROPERTY.totalCapitalization} mono />
              <CardMeta updated={PROPERTY.updatedAt} />
            </SectionCard>

            {/* Loan Details — grouped into 3 sub-sections */}
            <SectionCard title="Loan Details" icon={DollarSign}>
              <SubGroupHeader label="Structure" />
              <Field label="Loan Amount"         value={LOAN.amount} mono />
              <Field label="Loan to Value (LTV)" value={LOAN.ltv} />
              <Field label="Lender"              value={LOAN.lender} />

              <SubGroupHeader label="Terms" />
              <Field label="Interest Rate"       value={LOAN.rate} highlight bold />
              <Field label="Term"                value={LOAN.term} />
              <Field label="I/O Period"          value={LOAN.ioPeriod} />
              <Field label="I/O Remaining"       value={LOAN.ioRemaining + ' mo'} />
              <Field label="Prepay Penalty"      value={LOAN.prepayPenalty} />

              <SubGroupHeader label="Risk &amp; Timing" />
              <Field
                label="Maturity Date"
                value={
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-teal-700">{LOAN.maturityDate}</span>
                    <span className="text-xs text-slate-400 font-normal">{LOAN.monthsToMaturity} months remaining</span>
                  </span>
                }
              />
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                <span className="text-xs text-slate-500 font-medium">DSCR</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{LOAN.dscr.toFixed(2)}x</span>
                  <StatusChip status={dStatus} />
                </span>
              </div>
              <CardMeta source={LOAN.source} asOf={LOAN.asOf} updated={PROPERTY.updatedAt} />
            </SectionCard>

            {/* Investment Details — grouped into Capital / Returns / Performance */}
            <SectionCard title="Investment Details" icon={TrendingUp}>
              <SubGroupHeader label="Capital" />
              <Field label="Initial Equity Invested" value={INVESTMENT.initialEquity}     mono />
              <Field label="Capital Returned"        value={INVESTMENT.capitalReturned}   mono />
              <Field label="Unreturned Capital"      value={INVESTMENT.unreturnedCapital} mono highlight />

              <SubGroupHeader label="Returns" />
              <Field label="Preferred Return"               value={INVESTMENT.preferredReturn} />
              <Field label="Current Distribution (Ann.)"    value={INVESTMENT.currentDistributionAnnualized}    mono />
              <Field label="Current Distribution %"         value={INVESTMENT.currentDistributionAnnualizedPct} />

              <SubGroupHeader label="Performance" />
              <Field label="Cumulative Pref Shortfall"  value={INVESTMENT.cumPrefShortfall}    mono />
              <Field label="ITD Distribution Paid ($)"  value={INVESTMENT.itdDistributionPaid} mono />
              <Field label="ITD Distribution Paid (%)"  value={INVESTMENT.itdDistributionPaidPct} />
              <CardMeta source={INVESTMENT.source} asOf={INVESTMENT.asOf} />
            </SectionCard>

          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Lender Reserves */}
            <SectionCard title="Lender Reserves" icon={ShieldCheck}>
              <Field label="Debt Service Reserve" value={LENDER_RESERVES.debtServiceReserve} mono />
              <Field label="Repair Escrow"         value={LENDER_RESERVES.repairEscrow}       mono />
              <Field label="Replacement Reserve"   value={LENDER_RESERVES.replacementReserve} mono />
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Reserves</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_RESERVES.total}</span>
              </div>
              <CardMeta source={LENDER_RESERVES.source} asOf={LENDER_RESERVES.asOf} />
            </SectionCard>

            {/* Lender Escrows */}
            <SectionCard title="Lender Escrows" icon={ShieldCheck}>
              <Field label="Insurance Escrow" value={LENDER_ESCROWS.insuranceEscrow} mono />
              <Field label="Tax Escrow"        value={LENDER_ESCROWS.taxEscrow}       mono />
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Escrows</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_ESCROWS.total}</span>
              </div>
              <CardMeta source={LENDER_ESCROWS.source} asOf={LENDER_ESCROWS.asOf} />
            </SectionCard>

            {/* Operating Reserves — months of coverage prominently first */}
            <SectionCard title="Operating Reserves" icon={ShieldCheck} highlight>
              {/* Months of coverage — primary emphasis */}
              <div className="flex items-end justify-between mb-4 pb-4 border-b border-teal-100">
                <div>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Months of Coverage</p>
                  <p className="text-4xl font-bold text-slate-900 leading-none">{OP_RESERVES.monthsOfCoverage.toFixed(1)}</p>
                  <p className="text-sm text-slate-500 mt-1">months</p>
                </div>
                <div className="text-right">
                  <StatusChip status={rStatus} />
                  <TrendBadge delta={`+${mosDelta.toFixed(1)} mo vs last mo`} up />
                </div>
              </div>
              {/* Secondary detail fields */}
              <Field label="Remaining Balance"      value={OP_RESERVES.remainingBalance}  mono highlight />
              <Field label="Initial Balance"        value={OP_RESERVES.initialBalance}    mono />
              <Field label="Net Cash Flow To Date"  value={OP_RESERVES.netCashFlowToDate} mono />
              <CardMeta source={OP_RESERVES.source} asOf={OP_RESERVES.asOf} />
            </SectionCard>

            {/* CapEx */}
            <SectionCard title="CapEx" icon={Hammer}>
              <Field label="Initial CapEx Amount"  value={CAPEX.initialAmount}  mono />
              <Field label="Less Raise Shortfall"  value={CAPEX.raiseShortfall} mono />
              <Field label="CapEx Spend To Date"   value={CAPEX.spendToDate}    mono highlight />
              <Field label="CapEx Remaining"       value={CAPEX.remaining}      mono />
              <Field label="Target Completion"     value={CAPEX.targetCompletion} />
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">CapEx % Complete</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{CAPEX.pctComplete}%</span>
                    <StatusChip status={cStatus} />
                  </span>
                </div>
                {/* Plain-English schedule status */}
                <p className={`text-xs font-semibold mb-2 ${cStatus === 'healthy' ? 'text-green-700' : cStatus === 'watch' ? 'text-yellow-700' : 'text-red-600'}`}>
                  {scheduleLabel} — {CAPEX.pctComplete - CAPEX.expectedPct > 0
                    ? `${CAPEX.pctComplete - CAPEX.expectedPct}% ahead of expected ${CAPEX.expectedPct}%`
                    : `${CAPEX.expectedPct - CAPEX.pctComplete}% behind expected ${CAPEX.expectedPct}%`
                  }
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2.5 relative">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full"
                    style={{ width: `${CAPEX.pctComplete}%` }}
                  ></div>
                  {/* Expected marker */}
                  <div
                    className="absolute top-0 h-2.5 border-r-2 border-dashed border-slate-500 opacity-70"
                    style={{ left: `${CAPEX.expectedPct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">0%</span>
                  <span className="text-xs text-slate-400">Expected: {CAPEX.expectedPct}%</span>
                  <span className="text-xs text-slate-400">100%</span>
                </div>
              </div>
              <CardMeta source={CAPEX.source} asOf={CAPEX.asOf} />
            </SectionCard>

            {/* Key Dates — Complete / Upcoming / Due Soon / Overdue */}
            <SectionCard title="Key Dates" icon={Calendar}>
              <div className="space-y-0">
                {KEY_DATES.map((d, i) => {
                  const s = keyDateStatus(d.date, d.completedDate);
                  const chip = DATE_CHIP[s];
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

            {/* Contacts */}
            <SectionCard title="Contacts &amp; Links" icon={Users}>
              <div className="space-y-0">
                {CONTACTS.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{c.label}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{c.name}</p>
                    </div>
                    <a
                      href={c.href}
                      className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:text-teal-900 transition-colors"
                    >
                      {c.detail}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </SectionCard>

          </div>
        </div>
      </div>
    </div>
  );
}
