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

const MONTHS = [
  'January 2026','February 2026','March 2026','April 2026',
  'May 2026','June 2026','July 2026','August 2026',
];

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function SectionBadge({ type }: { type: 'monthly' | 'setup' }) {
  return type === 'monthly'
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">Monthly</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">Setup</span>;
}

function Lbl({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-1">
      <label className="text-xs font-semibold text-slate-600 leading-tight">{children}</label>
      {sub && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</p>}
    </div>
  );
}

function Inp({ placeholder = '', value = '', readOnly = false }: {
  placeholder?: string; value?: string; readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full border rounded-md px-2.5 py-1.5 text-sm ${
        readOnly
          ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed italic'
          : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none'
      }`}
    />
  );
}

function Sel({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <select
      defaultValue={value}
      className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 bg-white focus:border-teal-500 outline-none"
    >
      {children}
    </select>
  );
}

function CalcField({ label, hint }: { label: string; hint: string }) {
  return (
    <div>
      <Lbl sub={hint}>{label}</Lbl>
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
        <RefreshCw className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="text-xs text-slate-400 italic">Auto-calculated</span>
      </div>
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3">{children}</div>;
}

function MetaRow() {
  return (
    <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100">
      <div><Lbl sub="Date the source data represents">As Of Date</Lbl><Inp placeholder="Aug 20, 2025" /></div>
      <div><Lbl>Source</Lbl><Inp placeholder="e.g. Lender Statement" /></div>
      <div><Lbl>Notes</Lbl><Inp placeholder="Optional" /></div>
    </div>
  );
}

function SysNote() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>Last Updated is system-generated and cannot be manually edited.</span>
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
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{title}</span>
              <SectionBadge type={badge} />
            </div>
            {meta && <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{meta}</p>}
          </div>
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── DYNAMIC SIMPLE LIST (reserves / escrows) ────────────────────────────────
function LineItemList({ items, onAdd, onRemove, namePh = 'Item name', amtPh = 'Amount' }: {
  items: LineItem[]; onAdd: () => void; onRemove: (id: number) => void;
  namePh?: string; amtPh?: string;
}) {
  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_140px_32px] gap-2 mb-1.5 px-0.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Name</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Amount</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
            <Inp placeholder={namePh} value={item.name} />
            <Inp placeholder={amtPh} value={item.amount} />
            <button onClick={() => onRemove(item.id)} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2.5 transition-colors">
        <Plus className="w-3 h-3" /> Add line item
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function PropertySummaryAdmin() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [hasChanges, setHasChanges] = useState(true);

  // All setup sections open by default for this design pass
  const [open, setOpen] = useState<Set<string>>(new Set([
    'perf', 'op-reserves', 'capex', 'investment',
    'summary', 'loan', 'lender-reserves', 'lender-escrows', 'key-dates', 'contacts',
  ]));
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  let uid = 200;
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
    { id: 1, label: 'Lender 90-Day Repairs',  dueDate: 'Apr 1, 2026',  completedDate: '',             notes: '' },
    { id: 2, label: 'Lender 360-Day Repairs', dueDate: 'Jan 1, 2027',  completedDate: '',             notes: '' },
    { id: 3, label: 'Property Tax',           dueDate: 'Jun 15, 2026', completedDate: 'Jun 10, 2025', notes: '' },
    { id: 4, label: 'Insurance Renewal',      dueDate: 'Sep 5, 2025',  completedDate: '',             notes: '' },
  ]);
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, label: 'Lender Contact',   name: 'John Smith',        emailOrUrl: 'john.smith@metlife.com',     type: 'email' },
    { id: 2, label: 'Property Manager', name: 'Emily Chen',        emailOrUrl: 'emily@regattapm.com',        type: 'email' },
    { id: 3, label: 'SharePoint',       name: 'Document Library',  emailOrUrl: 'https://sharepoint.com/...', type: 'link'  },
    { id: 4, label: 'Investor Portal',  name: 'Contact Directory', emailOrUrl: 'https://portal.example.com', type: 'link'  },
  ]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* ── Dark header ──────────────────────────────────────────────────── */}
      <div className="bg-[#0D3D45] text-white px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50">Asset Management › Admin</p>
            <h1 className="text-xl font-bold mt-0.5">Property Summary Admin</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-50 uppercase tracking-widest">Property</p>
            <p className="text-sm font-bold">Regatta Apartments</p>
            <p className="text-xs font-mono opacity-50">1163_rr</p>
          </div>
        </div>
      </div>

      {/* ── Sticky action bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-2.5 flex items-center gap-4">
          {/* Month context */}
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <Calendar className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Updating:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1 text-sm font-semibold text-teal-700 bg-white focus:border-teal-500 outline-none"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* Unsaved indicator */}
          <div className="flex items-center gap-1.5 flex-1">
            {hasChanges
              ? <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-700 font-medium">Unsaved changes</span></>
              : <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-700 font-medium">Saved</span></>
            }
          </div>
          {/* Actions */}
          <button
            onClick={() => setHasChanges(false)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setHasChanges(false)}
            className="px-4 py-1.5 text-xs font-semibold bg-[#0D3D45] text-white rounded-md hover:bg-teal-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

        {/* ════════════════════════════════════════════════════════════════
            A. MONTHLY UPDATE
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-teal-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">Monthly Update</h2>
              <SectionBadge type="monthly" />
            </div>
            <p className="text-xs text-slate-500">
              Fields that change each month ·{' '}
              <span className="font-semibold text-teal-700">{selectedMonth}</span>
            </p>
          </div>

          {/* 1. Performance Snapshot */}
          <Accordion id="perf" title="Performance Snapshot" icon={TrendingUp} badge="monthly"
            meta="Occupancy · DSCR · NOI" open={open.has('perf')} onToggle={() => toggle('perf')}>
            <Row2>
              <div><Lbl>Occupancy %</Lbl><Inp placeholder="e.g. 94.5" value="94.5" /></div>
              <CalcField label="Vacancy %" hint="Display only — auto-calculated" />
            </Row2>
            <Row2>
              <div><Lbl>DSCR</Lbl><Inp placeholder="e.g. 1.32" value="1.32" /></div>
              <div><Lbl>NOI (LTM)</Lbl><Inp placeholder="e.g. $3.2M" value="$3.2M" /></div>
            </Row2>
            <Row2>
              <div><Lbl>NOI vs Budget</Lbl><Inp placeholder="e.g. +$148K" value="+$148K" /></div>
              <CalcField label="NOI Status" hint="Display only — derived from variance" />
            </Row2>
            <MetaRow />
          </Accordion>

          {/* 2. Operating Reserves */}
          <Accordion id="op-reserves" title="Operating Reserves" icon={ShieldCheck} badge="monthly"
            meta="Balance · coverage" open={open.has('op-reserves')} onToggle={() => toggle('op-reserves')}>
            <Row2>
              <div><Lbl>Remaining Reserve Balance</Lbl><Inp placeholder="e.g. $582K" value="$582K" /></div>
              <div><Lbl>Initial Operating Balance</Lbl><Inp placeholder="e.g. $500K" value="$500K" /></div>
            </Row2>
            <Row2>
              <div><Lbl sub="Surplus or draw since inception">Net Cash Flow To Date</Lbl><Inp placeholder="e.g. +$82K" value="+$82K" /></div>
              <CalcField label="Expense Coverage (Months)" hint="Display only — balance ÷ monthly expenses" />
            </Row2>
            <MetaRow />
          </Accordion>

          {/* 3. CapEx Progress */}
          <Accordion id="capex" title="CapEx Progress" icon={Hammer} badge="monthly"
            meta="Spend · schedule" open={open.has('capex')} onToggle={() => toggle('capex')}>
            <Row2>
              <div><Lbl>CapEx Spend To Date</Lbl><Inp placeholder="e.g. $1.28M" value="$1.28M" /></div>
              <CalcField label="CapEx % Complete" hint="Display only — spend ÷ initial CapEx amount" />
            </Row2>
            <Row2>
              <div><Lbl>Target Completion Date</Lbl><Inp placeholder="e.g. Dec 2026" value="Dec 2026" /></div>
              <CalcField label="CapEx Status" hint="Display only — % complete vs expected schedule" />
            </Row2>
            <MetaRow />
          </Accordion>

          {/* 4. Investment / Distribution */}
          <Accordion id="investment" title="Investment / Distribution Update" icon={TrendingUp} badge="monthly"
            meta="Distributions · returns" open={open.has('investment')} onToggle={() => toggle('investment')}>
            <Row2>
              <div><Lbl>Current Distribution Annualized ($)</Lbl><Inp placeholder="e.g. $624K" value="$624K" /></div>
              <div><Lbl>Current Distribution Annualized (%)</Lbl><Inp placeholder="e.g. 8.00%" value="8.00%" /></div>
            </Row2>
            <Row2>
              <div><Lbl>ITD Distribution Paid ($)</Lbl><Inp placeholder="e.g. $1.84M" value="$1.84M" /></div>
              <div><Lbl>ITD Distribution Paid (%)</Lbl><Inp placeholder="e.g. 23.6%" value="23.6%" /></div>
            </Row2>
            <Row2>
              <div><Lbl>Cumulative Pref Shortfall ($)</Lbl><Inp placeholder="e.g. $320K" value="$320K" /></div>
              <div><Lbl>Capital Returned</Lbl><Inp placeholder="e.g. $1.2M" value="$1.2M" /></div>
            </Row2>
            <MetaRow />
          </Accordion>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            B. PROPERTY SETUP
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Property Setup</h2>
              <SectionBadge type="setup" />
            </div>
            <p className="text-xs text-slate-500">Entered once · updated infrequently</p>
          </div>

          {/* 1. Summary */}
          <Accordion id="summary" title="Summary" icon={Building2} badge="setup"
            meta="Property basics" open={open.has('summary')} onToggle={() => toggle('summary')}>
            <Row2>
              <div><Lbl>Property Name</Lbl><Inp value="Regatta Apartments" /></div>
              <div><Lbl>Unit Count</Lbl><Inp value="200" /></div>
            </Row2>
            <div><Lbl>Address</Lbl><Inp value="12635 Scarsdale, San Antonio, TX 78217" /></div>
            <Row2>
              <div><Lbl>Year Built</Lbl><Inp value="1985" /></div>
              <div><Lbl>Acquisition Date</Lbl><Inp value="Jan 15, 2020" /></div>
            </Row2>
            <Row2>
              <div><Lbl>Purchase Price</Lbl><Inp value="$32.5M" /></div>
              <div><Lbl>Total Capitalization</Lbl><Inp value="$37.2M" /></div>
            </Row2>
            <SysNote />
          </Accordion>

          {/* 2. Loan Details */}
          <Accordion id="loan" title="Loan Details" icon={DollarSign} badge="setup"
            meta="Lender · rate · maturity" open={open.has('loan')} onToggle={() => toggle('loan')}>
            <Row2>
              <div><Lbl>Loan Amount</Lbl><Inp value="$28.5M" /></div>
              <div><Lbl>Loan to Value (LTV)</Lbl><Inp value="65.0%" /></div>
            </Row2>
            <div><Lbl>Lender</Lbl><Inp value="Metropolitan Life Insurance Co." /></div>
            <Row3>
              <div><Lbl>Interest Rate</Lbl><Inp value="4.25%" /></div>
              <div><Lbl>Term</Lbl><Inp value="10 years" /></div>
              <div><Lbl>Maturity Date</Lbl><Inp value="Jan 15, 2030" /></div>
            </Row3>
            <Row3>
              <div><Lbl>I/O Period</Lbl><Inp value="24 months" /></div>
              <div><Lbl>I/O Remaining (mo)</Lbl><Inp value="0" /></div>
              <div><Lbl>Prepay Penalty</Lbl><Inp value="Step-down (3-2-1-0)" /></div>
            </Row3>
            <Row2>
              <div><Lbl sub="Used as the covenant threshold on the dashboard">DSCR Covenant</Lbl><Inp value="1.25x" /></div>
              <div><Lbl>Initial Equity Invested</Lbl><Inp value="$7.8M" /></div>
            </Row2>
            <MetaRow />
          </Accordion>

          {/* 3. Lender Reserves */}
          <Accordion id="lender-reserves" title="Lender Reserves" icon={ShieldCheck} badge="setup"
            meta="Dynamic line items" open={open.has('lender-reserves')} onToggle={() => toggle('lender-reserves')}>
            <LineItemList
              items={reserves}
              onAdd={() => setReserves(p => [...p, { id: uid++, name: '', amount: '' }])}
              onRemove={id => setReserves(p => p.filter(r => r.id !== id))}
              namePh="Reserve name" amtPh="$0"
            />
            <MetaRow />
          </Accordion>

          {/* 4. Lender Escrows */}
          <Accordion id="lender-escrows" title="Lender Escrows" icon={ShieldCheck} badge="setup"
            meta="Dynamic line items" open={open.has('lender-escrows')} onToggle={() => toggle('lender-escrows')}>
            <LineItemList
              items={escrows}
              onAdd={() => setEscrows(p => [...p, { id: uid++, name: '', amount: '' }])}
              onRemove={id => setEscrows(p => p.filter(e => e.id !== id))}
              namePh="Escrow name" amtPh="$0"
            />
            <MetaRow />
          </Accordion>

          {/* 5. Key Dates */}
          <Accordion id="key-dates" title="Key Dates" icon={Calendar} badge="setup"
            meta="Deadlines · milestones" open={open.has('key-dates')} onToggle={() => toggle('key-dates')}>
            {/* Column headers */}
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_28px] gap-2 mb-1 px-0.5">
              {['Label','Due Date','Completed','Notes',''].map((h, i) =>
                <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {keyDates.map(d => (
                <div key={d.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_28px] gap-2 items-center">
                  <Inp placeholder="Label" value={d.label} />
                  <Inp placeholder="Due Date" value={d.dueDate} />
                  <Inp placeholder="Completed" value={d.completedDate} />
                  <Inp placeholder="Notes" value={d.notes} />
                  <button onClick={() => setKeyDates(p => p.filter(x => x.id !== d.id))} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setKeyDates(p => [...p, { id: uid++, label: '', dueDate: '', completedDate: '', notes: '' }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2.5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add key date
            </button>
          </Accordion>

          {/* 6. Contacts & Links */}
          <Accordion id="contacts" title="Contacts &amp; Links" icon={Users} badge="setup"
            meta="People · documents · links" open={open.has('contacts')} onToggle={() => toggle('contacts')}>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_1.3fr_120px_28px] gap-2 mb-1 px-0.5">
              {['Label','Name','Email / URL','Type',''].map((h, i) =>
                <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {contacts.map(c => (
                <div key={c.id} className="grid grid-cols-[1fr_1fr_1.3fr_120px_28px] gap-2 items-center">
                  <Inp placeholder="Label" value={c.label} />
                  <Inp placeholder="Name" value={c.name} />
                  <Inp placeholder="email or https://..." value={c.emailOrUrl} />
                  <Sel value={c.type}>
                    <option value="email">Email</option>
                    <option value="link">Link</option>
                    <option value="document">Document</option>
                  </Sel>
                  <button onClick={() => setContacts(p => p.filter(x => x.id !== c.id))} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setContacts(p => [...p, { id: uid++, label: '', name: '', emailOrUrl: '', type: 'email' }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2.5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add contact or link
            </button>
          </Accordion>
        </div>

        {/* Bottom breathing room */}
        <div className="h-8" />
      </div>
    </div>
  );
}
