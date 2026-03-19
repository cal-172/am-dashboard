import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Building2, DollarSign, Calendar,
  ShieldCheck, Hammer, TrendingUp, Users, Plus, Trash2,
  AlertCircle, CheckCircle2, RefreshCw
} from 'lucide-react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type LineItem = { id: number; name: string; amount: string };
type KeyDate  = { id: number; label: string; dueDate: string; completedDate: string; notes: string };
type Contact  = { id: number; label: string; name: string; emailOrUrl: string; type: string };

// ─── INITIAL STATE ───────────────────────────────────────────────────────────

const MONTHS = [
  'January 2026','February 2026','March 2026','April 2026',
  'May 2026','June 2026','July 2026','August 2026',
];

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────

function SectionBadge({ type }: { type: 'monthly' | 'setup' }) {
  return type === 'monthly'
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">Monthly</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">Setup</span>;
}

function Label({ children, helper }: { children: React.ReactNode; helper?: string }) {
  return (
    <div className="mb-1">
      <label className="text-xs font-semibold text-slate-600">{children}</label>
      {helper && <p className="text-[10px] text-slate-400 mt-0.5">{helper}</p>}
    </div>
  );
}

function Input({ placeholder = '', value = '', readOnly = false, onChange }: {
  placeholder?: string; value?: string; readOnly?: boolean; onChange?: (v: string) => void;
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      className={`w-full border rounded-lg px-3 py-2 text-sm ${
        readOnly
          ? 'bg-slate-50 text-slate-500 border-slate-100 cursor-not-allowed'
          : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none'
      }`}
    />
  );
}

function Textarea({ placeholder = '', rows = 2 }: { placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none resize-none"
    />
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function FieldCol({ label, helper, children }: {
  label: string; helper?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label helper={helper}>{label}</Label>
      {children}
    </div>
  );
}

function FieldFull({ label, helper, children }: {
  label: string; helper?: string; children: React.ReactNode;
}) {
  return (
    <div className="col-span-2">
      <Label helper={helper}>{label}</Label>
      {children}
    </div>
  );
}

function MetaRow() {
  return (
    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
      <div>
        <Label helper="Date the source data represents">As Of Date</Label>
        <Input placeholder="e.g. Aug 20, 2025" />
      </div>
      <div>
        <Label>Source</Label>
        <Input placeholder="e.g. Lender Statement" />
      </div>
      <div>
        <Label>Notes</Label>
        <Input placeholder="Optional notes..." />
      </div>
    </div>
  );
}

function ReadOnlyBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
      <RefreshCw className="w-3 h-3 text-slate-400" />
      <span className="text-xs text-slate-500 italic">{label}</span>
    </div>
  );
}

// ─── ACCORDION ───────────────────────────────────────────────────────────────

function Accordion({
  id, title, icon: Icon, badge, meta, open, onToggle, children
}: {
  id: string; title: string; icon?: React.ElementType; badge: 'monthly' | 'setup';
  meta?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{title}</span>
              <SectionBadge type={badge} />
            </div>
            {meta && <p className="text-xs text-slate-400 mt-0.5">{meta}</p>}
          </div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── DYNAMIC LIST ─────────────────────────────────────────────────────────────

function DynamicLineItems({
  items, onAdd, onRemove, labelPlaceholder = 'Item name', amountPlaceholder = 'Amount'
}: {
  items: LineItem[]; onAdd: () => void; onRemove: (id: number) => void;
  labelPlaceholder?: string; amountPlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="flex-1">
            <Input placeholder={labelPlaceholder} value={item.name} />
          </div>
          <div className="w-40">
            <Input placeholder={amountPlaceholder} value={item.amount} />
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2 py-1 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add line item
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function PropertySummaryAdmin() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [hasChanges, setHasChanges] = useState(true);

  // Track open accordion sections
  const [open, setOpen] = useState<Set<string>>(new Set([
    'perf', 'op-reserves'
  ]));
  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Dynamic lists
  const [reserves, setReserves] = useState<LineItem[]>([
    { id: 1, name: 'Debt Service Reserve', amount: '$850K' },
    { id: 2, name: 'Repair Escrow',         amount: '$120K' },
    { id: 3, name: 'Replacement Reserve',   amount: '$680K' },
  ]);
  const [escrows, setEscrows] = useState<LineItem[]>([
    { id: 1, name: 'Insurance Escrow', amount: '$48K'  },
    { id: 2, name: 'Tax Escrow',       amount: '$142K' },
  ]);
  const [keyDates, setKeyDates] = useState<KeyDate[]>([
    { id: 1, label: 'Lender 90-Day Repairs',  dueDate: 'Apr 1, 2026',  completedDate: '',            notes: '' },
    { id: 2, label: 'Lender 360-Day Repairs', dueDate: 'Jan 1, 2027',  completedDate: '',            notes: '' },
    { id: 3, label: 'Property Tax',           dueDate: 'Jun 15, 2026', completedDate: 'Jun 10, 2025', notes: '' },
    { id: 4, label: 'Insurance Renewal',      dueDate: 'Sep 5, 2025',  completedDate: '',            notes: '' },
  ]);
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, label: 'Lender Contact',   name: 'John Smith', emailOrUrl: 'john.smith@metlife.com', type: 'email' },
    { id: 2, label: 'Property Manager', name: 'Emily Chen', emailOrUrl: 'emily@regattapm.com',    type: 'email' },
    { id: 3, label: 'SharePoint',       name: 'Document Library',   emailOrUrl: 'https://sharepoint.com/...', type: 'link' },
    { id: 4, label: 'Investor Portal',  name: 'Contact Directory',  emailOrUrl: 'https://portal.example.com', type: 'link' },
  ]);

  let nextId = 100;
  const addReserve  = () => setReserves(p  => [...p,  { id: nextId++, name: '', amount: '' }]);
  const addEscrow   = () => setEscrows(p   => [...p,  { id: nextId++, name: '', amount: '' }]);
  const addKeyDate  = () => setKeyDates(p  => [...p,  { id: nextId++, label: '', dueDate: '', completedDate: '', notes: '' }]);
  const addContact  = () => setContacts(p  => [...p,  { id: nextId++, label: '', name: '', emailOrUrl: '', type: 'email' }]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">

      {/* ── App Header ───────────────────────────────────────────────────── */}
      <div className="bg-[#0D3D45] text-white px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-1">
                Asset Management › Admin
              </p>
              <h1 className="text-2xl font-bold">Property Summary Admin</h1>
              <p className="text-sm opacity-60 mt-0.5">Manage Property Summary Inputs</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-50 uppercase tracking-widest mb-1">Property</p>
              <p className="text-sm font-bold">Regatta Apartments</p>
              <p className="text-xs font-mono opacity-60">1163_rr</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">

        {/* ── Month Context Banner ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-teal-200 border-l-4 border-l-teal-500 shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-teal-600" />
            <div>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">Monthly Update Period</p>
              <p className="text-sm text-slate-600 mt-0.5">Editing data for the selected period below.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:border-teal-500 outline-none"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            A. MONTHLY UPDATE SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-teal-50/40">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Monthly Update</h2>
              <SectionBadge type="monthly" />
            </div>
            <p className="text-xs text-slate-500">
              These fields typically change month to month and drive dashboard KPIs and summary metrics.
              Currently updating: <span className="font-semibold text-teal-700">{selectedMonth}</span>
            </p>
          </div>

          {/* ── 1. Performance Snapshot ───────────────────────────────── */}
          <Accordion
            id="perf" title="Performance Snapshot" icon={TrendingUp} badge="monthly"
            meta="Occupancy, DSCR, NOI — Source: Operating Reports | As Of: Aug 20, 2025"
            open={open.has('perf')} onToggle={() => toggle('perf')}
          >
            <FieldRow>
              <FieldCol label="Occupancy %">
                <Input placeholder="e.g. 94.5" value="94.5" />
              </FieldCol>
              <FieldCol label="Vacancy %" helper="Display only — auto-calculated">
                <ReadOnlyBadge label="Calculated from Occupancy %" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="DSCR">
                <Input placeholder="e.g. 1.32" value="1.32" />
              </FieldCol>
              <FieldCol label="NOI (LTM)">
                <Input placeholder="e.g. $3.2M" value="$3.2M" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="NOI vs Budget">
                <Input placeholder="e.g. +$148K" value="+$148K" />
              </FieldCol>
              <FieldCol label="NOI Status" helper="Display only">
                <ReadOnlyBadge label="Derived from NOI vs Budget" />
              </FieldCol>
            </FieldRow>
            <MetaRow />
          </Accordion>

          {/* ── 2. Operating Reserves ─────────────────────────────────── */}
          <Accordion
            id="op-reserves" title="Operating Reserves" icon={ShieldCheck} badge="monthly"
            meta="Reserve balance and coverage — Source: Operating Account | As Of: Aug 20, 2025"
            open={open.has('op-reserves')} onToggle={() => toggle('op-reserves')}
          >
            <FieldRow>
              <FieldCol label="Remaining Operating Reserve Balance">
                <Input placeholder="e.g. $582K" value="$582K" />
              </FieldCol>
              <FieldCol label="Initial Operating Balance">
                <Input placeholder="e.g. $500K" value="$500K" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="Net Cash Flow To Date" helper="Operating surplus or draw since inception">
                <Input placeholder="e.g. +$82K" value="+$82K" />
              </FieldCol>
              <FieldCol label="Expense Coverage (Months)" helper="Display only — auto-calculated">
                <ReadOnlyBadge label="Calculated from balance ÷ monthly expenses" />
              </FieldCol>
            </FieldRow>
            <MetaRow />
          </Accordion>

          {/* ── 3. CapEx Progress ─────────────────────────────────────── */}
          <Accordion
            id="capex" title="CapEx Progress" icon={Hammer} badge="monthly"
            meta="Spend tracking and schedule — Source: General Contractor | As Of: Aug 20, 2025"
            open={open.has('capex')} onToggle={() => toggle('capex')}
          >
            <FieldRow>
              <FieldCol label="CapEx Spend To Date">
                <Input placeholder="e.g. $1.28M" value="$1.28M" />
              </FieldCol>
              <FieldCol label="CapEx % Complete" helper="Display only — calculated vs initial amount">
                <ReadOnlyBadge label="Calculated from spend ÷ initial CapEx amount" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="Target Completion Date">
                <Input placeholder="e.g. Dec 2026" value="Dec 2026" />
              </FieldCol>
              <FieldCol label="CapEx Status" helper="Display only">
                <ReadOnlyBadge label="Derived from % complete vs expected schedule" />
              </FieldCol>
            </FieldRow>
            <MetaRow />
          </Accordion>

          {/* ── 4. Investment / Distribution Update ───────────────────── */}
          <Accordion
            id="investment" title="Investment / Distribution Update" icon={TrendingUp} badge="monthly"
            meta="Distributions and returns — Source: Investor Records | As Of: Aug 20, 2025"
            open={open.has('investment')} onToggle={() => toggle('investment')}
          >
            <FieldRow>
              <FieldCol label="Current Distribution Annualized ($)">
                <Input placeholder="e.g. $624K" value="$624K" />
              </FieldCol>
              <FieldCol label="Current Distribution Annualized (%)">
                <Input placeholder="e.g. 8.00%" value="8.00%" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="ITD Distribution Paid ($)">
                <Input placeholder="e.g. $1.84M" value="$1.84M" />
              </FieldCol>
              <FieldCol label="ITD Distribution Paid (%)">
                <Input placeholder="e.g. 23.6%" value="23.6%" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="Cumulative Pref Shortfall To Date ($)">
                <Input placeholder="e.g. $320K" value="$320K" />
              </FieldCol>
              <FieldCol label="Capital Returned">
                <Input placeholder="e.g. $1.2M" value="$1.2M" />
              </FieldCol>
            </FieldRow>
            <MetaRow />
          </Accordion>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            B. PROPERTY SETUP SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900">Property Setup</h2>
              <SectionBadge type="setup" />
            </div>
            <p className="text-xs text-slate-500">
              These fields are typically entered once and updated infrequently. Changes here affect the static sections of the Property Summary.
            </p>
          </div>

          {/* ── 1. Summary ────────────────────────────────────────────── */}
          <Accordion
            id="summary" title="Summary" icon={Building2} badge="setup"
            meta="Property basics — Last Updated: Aug 20, 2025"
            open={open.has('summary')} onToggle={() => toggle('summary')}
          >
            <FieldRow>
              <FieldCol label="Property Name">
                <Input placeholder="Property name" value="Regatta Apartments" />
              </FieldCol>
              <FieldCol label="Unit Count">
                <Input placeholder="e.g. 200" value="200" />
              </FieldCol>
            </FieldRow>
            <div>
              <Label>Address</Label>
              <Input placeholder="Full address" value="12635 Scarsdale, San Antonio, TX 78217" />
            </div>
            <FieldRow>
              <FieldCol label="Year Built">
                <Input placeholder="e.g. 1985" value="1985" />
              </FieldCol>
              <FieldCol label="Acquisition Date">
                <Input placeholder="e.g. Jan 15, 2020" value="Jan 15, 2020" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="Purchase Price">
                <Input placeholder="e.g. $32.5M" value="$32.5M" />
              </FieldCol>
              <FieldCol label="Total Capitalization">
                <Input placeholder="e.g. $37.2M" value="$37.2M" />
              </FieldCol>
            </FieldRow>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <AlertCircle className="w-3 h-3" />
              <span>Last Updated is system-generated and cannot be manually edited.</span>
            </div>
          </Accordion>

          {/* ── 2. Loan Details ───────────────────────────────────────── */}
          <Accordion
            id="loan" title="Loan Details" icon={DollarSign} badge="setup"
            meta="Lender, rate, maturity — Source: Lender Statement | As Of: Aug 20, 2025"
            open={open.has('loan')} onToggle={() => toggle('loan')}
          >
            <FieldRow>
              <FieldCol label="Loan Amount">
                <Input placeholder="e.g. $28.5M" value="$28.5M" />
              </FieldCol>
              <FieldCol label="Loan to Value (LTV)">
                <Input placeholder="e.g. 65.0%" value="65.0%" />
              </FieldCol>
            </FieldRow>
            <div>
              <Label>Lender</Label>
              <Input placeholder="Lender name" value="Metropolitan Life Insurance Co." />
            </div>
            <FieldRow>
              <FieldCol label="Interest Rate">
                <Input placeholder="e.g. 4.25%" value="4.25%" />
              </FieldCol>
              <FieldCol label="Term">
                <Input placeholder="e.g. 10 years" value="10 years" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="I/O Period">
                <Input placeholder="e.g. 24 months" value="24 months" />
              </FieldCol>
              <FieldCol label="I/O Remaining (mo)">
                <Input placeholder="e.g. 0" value="0" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="Prepay Penalty">
                <Input placeholder="e.g. Step-down (3-2-1-0)" value="Step-down (3-2-1-0)" />
              </FieldCol>
              <FieldCol label="Maturity Date">
                <Input placeholder="e.g. Jan 15, 2030" value="Jan 15, 2030" />
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldCol label="DSCR Covenant / Threshold" helper="Used as the reference threshold on the dashboard">
                <Input placeholder="e.g. 1.25x" value="1.25x" />
              </FieldCol>
              <FieldCol label="Initial Equity Invested">
                <Input placeholder="e.g. $7.8M" value="$7.8M" />
              </FieldCol>
            </FieldRow>
            <MetaRow />
          </Accordion>

          {/* ── 3. Lender Reserves ────────────────────────────────────── */}
          <Accordion
            id="lender-reserves" title="Lender Reserves" icon={ShieldCheck} badge="setup"
            meta="Dynamic line items — add or remove as needed"
            open={open.has('lender-reserves')} onToggle={() => toggle('lender-reserves')}
          >
            <div className="flex items-center gap-4 mb-2">
              <span className="text-xs font-semibold text-slate-500 flex-1">Reserve Name</span>
              <span className="text-xs font-semibold text-slate-500 w-40">Amount</span>
              <span className="w-8"></span>
            </div>
            <DynamicLineItems
              items={reserves}
              onAdd={addReserve}
              onRemove={id => setReserves(p => p.filter(r => r.id !== id))}
              labelPlaceholder="Reserve name"
              amountPlaceholder="$0"
            />
            <MetaRow />
          </Accordion>

          {/* ── 4. Lender Escrows ─────────────────────────────────────── */}
          <Accordion
            id="lender-escrows" title="Lender Escrows" icon={ShieldCheck} badge="setup"
            meta="Dynamic line items — add or remove as needed"
            open={open.has('lender-escrows')} onToggle={() => toggle('lender-escrows')}
          >
            <div className="flex items-center gap-4 mb-2">
              <span className="text-xs font-semibold text-slate-500 flex-1">Escrow Name</span>
              <span className="text-xs font-semibold text-slate-500 w-40">Amount</span>
              <span className="w-8"></span>
            </div>
            <DynamicLineItems
              items={escrows}
              onAdd={addEscrow}
              onRemove={id => setEscrows(p => p.filter(e => e.id !== id))}
              labelPlaceholder="Escrow name"
              amountPlaceholder="$0"
            />
            <MetaRow />
          </Accordion>

          {/* ── 5. Key Dates ──────────────────────────────────────────── */}
          <Accordion
            id="key-dates" title="Key Dates" icon={Calendar} badge="setup"
            meta="Deadlines and milestones — tracked with status"
            open={open.has('key-dates')} onToggle={() => toggle('key-dates')}
          >
            <div className="space-y-3">
              {keyDates.map(d => (
                <div key={d.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 mr-3">
                      <Label>Date Label</Label>
                      <Input placeholder="e.g. Insurance Renewal" value={d.label} />
                    </div>
                    <button
                      onClick={() => setKeyDates(p => p.filter(x => x.id !== d.id))}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Due Date</Label>
                      <Input placeholder="e.g. Aug 1, 2026" value={d.dueDate} />
                    </div>
                    <div>
                      <Label helper="Leave blank if not yet complete">Completed Date</Label>
                      <Input placeholder="Optional" value={d.completedDate} />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input placeholder="Optional" value={d.notes} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addKeyDate}
                className="flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900 py-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add key date
              </button>
            </div>
          </Accordion>

          {/* ── 6. Contacts & Links ───────────────────────────────────── */}
          <Accordion
            id="contacts" title="Contacts & Links" icon={Users} badge="setup"
            meta="People and documents associated with this asset"
            open={open.has('contacts')} onToggle={() => toggle('contacts')}
          >
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 mr-3">
                      <Label>Label</Label>
                      <Input placeholder="e.g. Lender Contact" value={c.label} />
                    </div>
                    <button
                      onClick={() => setContacts(p => p.filter(x => x.id !== c.id))}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input placeholder="e.g. John Smith" value={c.name} />
                    </div>
                    <div>
                      <Label>Email or URL</Label>
                      <Input placeholder="email or https://..." value={c.emailOrUrl} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select
                        defaultValue={c.type}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:border-teal-500 outline-none"
                      >
                        <option value="email">Email / Contact</option>
                        <option value="link">Link</option>
                        <option value="document">Document</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addContact}
                className="flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900 py-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add contact or link
              </button>
            </div>
          </Accordion>
        </div>

      </div>

      {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg px-8 py-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges
              ? <><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-sm text-amber-700 font-medium">Unsaved changes</span></>
              : <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm text-green-700 font-medium">All changes saved</span></>
            }
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHasChanges(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setHasChanges(false)}
              className="px-5 py-2 text-sm font-semibold bg-[#0D3D45] text-white rounded-lg hover:bg-teal-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
