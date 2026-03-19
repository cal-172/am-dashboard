import React from 'react';
import {
  Building2, DollarSign, Calendar, ShieldCheck, Hammer,
  TrendingUp, Users, Mail, ExternalLink, AlertTriangle
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
  purchasePrice: '$32,500,000',
  totalCapitalization: '$37,200,000',
  updatedAt: 'Aug 20, 2025',
};

const LOAN = {
  amount: '$28,500,000',
  ltv: '65.0%',
  lender: 'Metropolitan Life Insurance Co.',
  term: '10 years',
  rate: '4.25%',
  ioPeriod: '24 months',
  ioRemaining: 0,
  prepayPenalty: 'Step-down (3-2-1-0)',
  maturityDate: 'Jan 15, 2030',
  dscr: 1.32,
  monthsToMaturity: 45,
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const INVESTMENT = {
  initialEquity: '$7,800,000',
  capitalReturned: '$1,200,000',
  unreturnedCapital: '$6,600,000',
  preferredReturn: '7.00%',
  currentDistributionAnnualized: '$624,000',
  currentDistributionAnnualizedPct: '8.00%',
  cumPrefShortfall: '$320,000',
  itdDistributionPaid: '$1,840,000',
  itdDistributionPaidPct: '23.6%',
  asOf: 'Aug 20, 2025',
  source: 'Investor Records',
};

const LENDER_RESERVES = {
  debtServiceReserve: '$850,000',
  repairEscrow: '$120,000',
  replacementReserve: '$680,000',
  total: '$1,650,000',
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const LENDER_ESCROWS = {
  insuranceEscrow: '$48,000',
  taxEscrow: '$142,000',
  total: '$190,000',
  asOf: 'Aug 20, 2025',
  source: 'Lender Statement',
};

const OP_RESERVES = {
  initialBalance: '$500,000',
  surplusDrawToDate: '+$82,000',
  remainingBalance: '$582,000',
  monthsOfCoverage: 4.8,
  asOf: 'Aug 20, 2025',
  source: 'Operating Account',
};

const CAPEX = {
  initialAmount: '$2,100,000',
  raiseShortfall: '($150,000)',
  spendToDate: '$1,280,000',
  remaining: '$670,000',
  pctComplete: 61,
  expectedPct: 55,
  targetCompletion: 'Dec 2026',
  asOf: 'Aug 20, 2025',
  source: 'General Contractor',
};

const KEY_DATES = [
  { label: 'Lender 90-Day Repairs', date: 'Apr 1, 2026', completedDate: null },
  { label: 'Lender 360-Day Repairs', date: 'Jan 1, 2027', completedDate: null },
  { label: 'Property Tax', date: 'Jun 15, 2026', completedDate: 'Jun 10, 2025' },
  { label: 'Insurance Renewal', date: 'Aug 1, 2026', completedDate: null },
];

const CONTACTS = [
  { label: 'Lender Contact', name: 'John Smith', detail: 'john.smith@metlife.com', href: '#' },
  { label: 'Property Manager', name: 'Emily Chen', detail: 'emily@regattapm.com', href: '#' },
  { label: 'SharePoint', name: 'Document Library', detail: 'View files →', href: '#' },
  { label: 'Investor Portal', name: 'Contact Directory', detail: 'View contacts →', href: '#' },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

type Status = 'healthy' | 'watch' | 'issue';

function dscrStatus(v: number): Status { return v >= 1.25 ? 'healthy' : v >= 1.10 ? 'watch' : 'issue'; }
function occupancyStatus(v: number): Status { return v >= 93 ? 'healthy' : v >= 90 ? 'watch' : 'issue'; }
function opReserveStatus(v: number): Status { return v >= 4.0 ? 'healthy' : v >= 2.0 ? 'watch' : 'issue'; }
function capexStatus(actual: number, expected: number): Status {
  const lag = expected - actual;
  return lag <= 10 ? 'healthy' : lag <= 20 ? 'watch' : 'issue';
}
function dateStatus(date: string, completed: string | null): 'complete' | 'upcoming' | 'overdue' {
  if (completed) return 'complete';
  return new Date(date) > new Date() ? 'upcoming' : 'overdue';
}

const STATUS_COLORS: Record<Status, { chip: string; dot: string; border: string; label: string }> = {
  healthy: { chip: 'bg-green-100 text-green-800', dot: 'bg-green-500', border: 'border-l-green-500', label: 'Healthy' },
  watch:   { chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', border: 'border-l-yellow-500', label: 'Watch' },
  issue:   { chip: 'bg-red-100 text-red-800', dot: 'bg-red-500', border: 'border-l-red-500', label: 'Issue' },
};

const DATE_CHIP: Record<string, string> = {
  complete:  'bg-green-100 text-green-800',
  upcoming:  'bg-blue-100 text-blue-800',
  overdue:   'bg-red-100 text-red-800',
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

function KpiCard({
  icon: Icon, title, main, sub, status
}: {
  icon: React.ElementType; title: string; main: string; sub: string; status: Status;
}) {
  const c = STATUS_COLORS[status];
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${c.border} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{main}</p>
        <p className="text-xs text-slate-500 mt-2">{sub}</p>
      </div>
      <StatusChip status={status} />
    </div>
  );
}

function CardMeta({ source, asOf, updated }: { source?: string; asOf?: string; updated?: string }) {
  return (
    <div className="flex flex-wrap gap-3 pt-3 mt-4 border-t border-slate-100">
      {source && <span className="text-xs text-slate-400">Source: {source}</span>}
      {asOf && <span className="text-xs text-slate-400">As Of: {asOf}</span>}
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
    <div className={`bg-white rounded-xl shadow-sm border ${highlight ? 'border-teal-200' : 'border-slate-200'} p-6`}>
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
  label, value, highlight = false, mono = false
}: {
  label: string; value: React.ReactNode; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium leading-tight max-w-[52%]">{label}</span>
      <span className={`text-sm font-semibold text-right leading-tight ${highlight ? 'text-teal-700' : 'text-slate-900'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function PropertySummary() {
  const dStatus = dscrStatus(LOAN.dscr);
  const oStatus = occupancyStatus(PROPERTY.occupancy);
  const rStatus = opReserveStatus(OP_RESERVES.monthsOfCoverage);
  const cStatus = capexStatus(CAPEX.pctComplete, CAPEX.expectedPct);

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

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp}
            title="DSCR"
            main={LOAN.dscr.toFixed(2) + 'x'}
            sub="Debt coverage health"
            status={dStatus}
          />
          <KpiCard
            icon={Building2}
            title="Occupancy"
            main={PROPERTY.occupancy.toFixed(1) + '%'}
            sub={`Vacancy: ${(100 - PROPERTY.occupancy).toFixed(1)}%`}
            status={oStatus}
          />
          <KpiCard
            icon={ShieldCheck}
            title="Operating Reserves"
            main={'$' + (parseInt(OP_RESERVES.remainingBalance.replace(/[$,]/g, '')) / 1000).toFixed(0) + 'K'}
            sub={`${OP_RESERVES.monthsOfCoverage.toFixed(1)} months of coverage`}
            status={rStatus}
          />
          <KpiCard
            icon={Hammer}
            title="CapEx Progress"
            main={CAPEX.pctComplete + '%'}
            sub={`$1.28M of $2.1M spent · Target ${CAPEX.targetCompletion}`}
            status={cStatus}
          />
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Summary */}
            <SectionCard title="Summary" icon={Building2}>
              <Field label="Property Name" value={PROPERTY.name} />
              <Field label="Address" value={PROPERTY.address} />
              <Field label="Unit Count" value={PROPERTY.units} />
              <Field label="Year Built" value={PROPERTY.yearBuilt} />
              <Field label="Occupancy" value={PROPERTY.occupancy.toFixed(1) + '%'} />
              <Field label="Pre-Leased" value={PROPERTY.preleased.toFixed(1) + '%'} />
              <Field label="Acquisition Date" value={PROPERTY.acquisitionDate} />
              <Field label="Purchase Price" value={PROPERTY.purchasePrice} mono />
              <Field label="Total Capitalization" value={PROPERTY.totalCapitalization} mono />
              <CardMeta updated={PROPERTY.updatedAt} />
            </SectionCard>

            {/* Loan Details */}
            <SectionCard title="Loan Details" icon={DollarSign}>
              <Field label="Loan Amount" value={LOAN.amount} mono />
              <Field label="Loan to Value (LTV)" value={LOAN.ltv} />
              <Field label="Lender" value={LOAN.lender} />
              <Field label="Term" value={LOAN.term} />
              <Field label="Interest Rate" value={LOAN.rate} highlight />
              <Field label="I/O Period" value={LOAN.ioPeriod} />
              <Field label="I/O Remaining" value={LOAN.ioRemaining + ' mo'} />
              <Field label="Prepay Penalty" value={LOAN.prepayPenalty} />
              <Field
                label="Maturity Date"
                value={
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-teal-700">{LOAN.maturityDate}</span>
                    <span className="text-xs text-slate-400 font-normal">{LOAN.monthsToMaturity} months remaining</span>
                  </span>
                }
              />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-slate-500 font-medium">DSCR</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{LOAN.dscr.toFixed(2)}x</span>
                  <StatusChip status={dStatus} />
                </span>
              </div>
              <CardMeta source={LOAN.source} asOf={LOAN.asOf} updated={PROPERTY.updatedAt} />
            </SectionCard>

            {/* Investment Details */}
            <SectionCard title="Investment Details" icon={TrendingUp}>
              <Field label="Initial Equity Invested" value={INVESTMENT.initialEquity} mono />
              <Field label="Capital Returned" value={INVESTMENT.capitalReturned} mono />
              <Field label="Unreturned Capital" value={INVESTMENT.unreturnedCapital} mono highlight />
              <Field label="Preferred Return" value={INVESTMENT.preferredReturn} />
              <div className="my-3 border-t border-slate-100" />
              <Field label="Current Distribution (Ann.)" value={INVESTMENT.currentDistributionAnnualized} mono />
              <Field label="Current Distribution %" value={INVESTMENT.currentDistributionAnnualizedPct} />
              <Field label="Cumulative Pref Shortfall" value={INVESTMENT.cumPrefShortfall} mono />
              <div className="my-3 border-t border-slate-100" />
              <Field label="ITD Distribution Paid ($)" value={INVESTMENT.itdDistributionPaid} mono />
              <Field label="ITD Distribution Paid (%)" value={INVESTMENT.itdDistributionPaidPct} />
              <CardMeta source={INVESTMENT.source} asOf={INVESTMENT.asOf} />
            </SectionCard>

          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Lender Reserves */}
            <SectionCard title="Lender Reserves" icon={ShieldCheck}>
              <Field label="Debt Service Reserve" value={LENDER_RESERVES.debtServiceReserve} mono />
              <Field label="Repair Escrow" value={LENDER_RESERVES.repairEscrow} mono />
              <Field label="Replacement Reserve" value={LENDER_RESERVES.replacementReserve} mono />
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Reserves</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_RESERVES.total}</span>
              </div>
              <CardMeta source={LENDER_RESERVES.source} asOf={LENDER_RESERVES.asOf} />
            </SectionCard>

            {/* Lender Escrows */}
            <SectionCard title="Lender Escrows" icon={ShieldCheck}>
              <Field label="Insurance Escrow" value={LENDER_ESCROWS.insuranceEscrow} mono />
              <Field label="Tax Escrow" value={LENDER_ESCROWS.taxEscrow} mono />
              <div className="flex items-center justify-between py-3 mt-3 bg-slate-50 rounded-lg px-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Lender Escrows</span>
                <span className="text-base font-bold text-slate-900 font-mono">{LENDER_ESCROWS.total}</span>
              </div>
              <CardMeta source={LENDER_ESCROWS.source} asOf={LENDER_ESCROWS.asOf} />
            </SectionCard>

            {/* Operating Reserves */}
            <SectionCard title="Operating Reserves" icon={ShieldCheck} highlight>
              <Field label="Initial Operating Balance" value={OP_RESERVES.initialBalance} mono />
              <Field label="Surplus / (Draw) To Date" value={OP_RESERVES.surplusDrawToDate} mono />
              <Field label="Remaining Balance" value={OP_RESERVES.remainingBalance} mono highlight />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-slate-500 font-medium">Months of Coverage</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{OP_RESERVES.monthsOfCoverage.toFixed(1)} mo</span>
                  <StatusChip status={rStatus} />
                </span>
              </div>
              <CardMeta source={OP_RESERVES.source} asOf={OP_RESERVES.asOf} />
            </SectionCard>

            {/* CapEx */}
            <SectionCard title="CapEx" icon={Hammer}>
              <Field label="Initial CapEx Amount" value={CAPEX.initialAmount} mono />
              <Field label="Less Raise Shortfall" value={CAPEX.raiseShortfall} mono />
              <Field label="CapEx Spend To Date" value={CAPEX.spendToDate} mono highlight />
              <Field label="CapEx Remaining" value={CAPEX.remaining} mono />
              <Field label="Target Completion" value={CAPEX.targetCompletion} />
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">CapEx % Complete</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{CAPEX.pctComplete}%</span>
                    <StatusChip status={cStatus} />
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 relative">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full"
                    style={{ width: `${CAPEX.pctComplete}%` }}
                  ></div>
                  {/* Expected marker */}
                  <div
                    className="absolute top-0 h-2.5 border-r-2 border-slate-500"
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

            {/* Key Dates */}
            <SectionCard title="Key Dates" icon={Calendar}>
              <div className="space-y-3">
                {KEY_DATES.map((d, i) => {
                  const s = dateStatus(d.date, d.completedDate);
                  return (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{d.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.date}</p>
                        {d.completedDate && (
                          <p className="text-xs text-green-600 mt-0.5">Completed: {d.completedDate}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DATE_CHIP[s]}`}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Contacts */}
            <SectionCard title="Contacts & Links" icon={Users}>
              <div className="space-y-3">
                {CONTACTS.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
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
