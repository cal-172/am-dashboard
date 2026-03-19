import React, { useState } from 'react';
import {
  Calendar, AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw,
  TrendingUp, ShieldCheck, Hammer, Building2, DollarSign, Users,
  ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type UpdateGroup = 'monthly' | 'setup';

type Metric = {
  id: number;
  group: string;
  metric: string;
  value: string;
  asOf: string;
  source: string;
  lastUpdated: string;
  notes: string;
  updateGroup: UpdateGroup;
  readOnly?: boolean;
};

type LineItem = { id: number; name: string; amount: string };
type KeyDate  = { id: number; label: string; dueDate: string; completed: string; notes: string };
type Contact  = { id: number; label: string; name: string; emailOrUrl: string; type: string };

// ─── INITIAL METRIC DATA ──────────────────────────────────────────────────────

let _uid = 1;
const mk = (
  group: string, metric: string, value: string,
  asOf: string, source: string, lastUpdated: string,
  notes = '', readOnly = false, updateGroup: UpdateGroup = 'monthly'
): Metric => ({ id: _uid++, group, metric, value, asOf, source, lastUpdated, notes, updateGroup, readOnly });

const INITIAL_METRICS: Metric[] = [
  mk('Performance', 'Occupancy %',    '94.5%',   'Aug 20, 2025', 'Operating Report',  'Sep 1, 2025'),
  mk('Performance', 'Vacancy %',      '',        '',              '',                  '',           '', true),
  mk('Performance', 'DSCR',           '1.32x',   'Aug 20, 2025', 'Lender Statement',  'Sep 1, 2025'),
  mk('Performance', 'NOI (LTM)',      '$3.2M',   'Aug 20, 2025', 'Operating Report',  'Sep 1, 2025'),
  mk('Performance', 'NOI vs Budget',  '+$148K',  'Aug 20, 2025', 'Budget Report',     'Sep 1, 2025'),
  mk('Performance', 'NOI Status',     '',        '',              '',                  '',           '', true),

  mk('Operating Reserves', 'Remaining Reserve Balance', '$582K',  'Aug 20, 2025', 'Operating Account', 'Sep 1, 2025'),
  mk('Operating Reserves', 'Initial Operating Balance', '$500K',  'Jan 15, 2020', 'Closing Docs',      'Jan 16, 2020'),
  mk('Operating Reserves', 'Net Cash Flow To Date',     '+$82K',  'Aug 20, 2025', 'Operating Account', 'Sep 1, 2025'),
  mk('Operating Reserves', 'Expense Coverage (Months)', '',       '',              '',                  '',           '', true),

  mk('CapEx', 'CapEx Spend To Date',    '$1.28M',  'Aug 20, 2025', 'General Contractor', 'Sep 1, 2025'),
  mk('CapEx', 'Target Completion Date', 'Dec 2026','',              '',                   'Sep 1, 2025'),
  mk('CapEx', 'CapEx % Complete',       '',        '',              '',                   '',           '', true),
  mk('CapEx', 'CapEx Status',           '',        '',              '',                   '',           '', true),

  mk('Investment', 'Current Distrib. Ann. ($)',  '$624K',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  mk('Investment', 'Current Distrib. Ann. (%)',  '8.00%',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  mk('Investment', 'ITD Distribution Paid ($)',  '$1.84M', 'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  mk('Investment', 'ITD Distribution Paid (%)',  '23.6%',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  mk('Investment', 'Cumulative Pref Shortfall',  '$320K',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  mk('Investment', 'Capital Returned',           '$1.2M',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),

  mk('Summary', 'Property Name',        'Regatta Apartments',             '', '',             'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Address',              '12635 Scarsdale, San Antonio TX','', '',             'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Unit Count',           '200',                            '', '',             'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Year Built',           '1985',                           '', '',             'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Acquisition Date',     'Jan 15, 2020',                   '', '',             'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Purchase Price',       '$32.5M',                         '', 'Closing Docs', 'Jan 16, 2020', '', false, 'setup'),
  mk('Summary', 'Total Capitalization', '$37.2M',                         '', 'Closing Docs', 'Jan 16, 2020', '', false, 'setup'),

  mk('Loan Details', 'Loan Amount',         '$28.5M',             'Jan 15, 2020', 'Lender Statement', 'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'Loan to Value (LTV)', '65.0%',              'Jan 15, 2020', 'Lender Statement', 'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'Lender',             'MetLife Insurance',  '',              'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'Interest Rate',      '4.25%',              'Jan 15, 2020', 'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'Term',              '10 years',            '',              'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'I/O Period',        '24 months',           '',              'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'I/O Remaining (mo)','0',                   '',              '',                 'Sep 1, 2025',  '',                            false, 'setup'),
  mk('Loan Details', 'Prepay Penalty',    'Step-down (3-2-1-0)', '',              'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'Maturity Date',     'Jan 15, 2030',        '',              'Loan Agreement',   'Jan 16, 2020', '',                            false, 'setup'),
  mk('Loan Details', 'DSCR Covenant',     '1.25x',               '',              'Loan Agreement',   'Jan 16, 2020', 'Used as dashboard threshold', false, 'setup'),
];

const GROUP_ORDER: Record<string, number> = {
  'Performance': 0, 'Operating Reserves': 1, 'CapEx': 2, 'Investment': 3,
  'Summary': 0, 'Loan Details': 1, 'Lender Reserves': 2, 'Lender Escrows': 3, 'Key Dates': 4, 'Contacts & Links': 5,
};
const GROUP_ICONS: Record<string, React.ElementType> = {
  'Performance': TrendingUp, 'Operating Reserves': ShieldCheck, 'CapEx': Hammer, 'Investment': TrendingUp,
  'Summary': Building2, 'Loan Details': DollarSign, 'Lender Reserves': ShieldCheck,
  'Lender Escrows': ShieldCheck, 'Key Dates': Calendar, 'Contacts & Links': Users,
};

const MONTHS = [
  'January 2026','February 2026','March 2026','April 2026',
  'May 2026','June 2026','July 2026','August 2026',
];

// ─── UNIFIED GRID TEMPLATE ────────────────────────────────────────────────────
// Columns: Metric | Value | As Of | Source | Last Updated | Notes | Group/Action
const COLS = 'grid grid-cols-[minmax(140px,0.7fr)_130px_95px_115px_100px_minmax(120px,1fr)_90px]';

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function ColHeaders({ accentTop }: { accentTop?: boolean }) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-200 ${accentTop ? 'bg-teal-50/30' : 'bg-slate-50'}`}>
      {['Metric','Value','As Of Date','Source','Last Updated','Notes','Group'].map(h => (
        <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
      ))}
    </div>
  );
}

function GroupHeader({ name }: { name: string }) {
  const Icon = GROUP_ICONS[name] || Building2;
  return (
    <div className="col-span-7 flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 border-t border-t-slate-200 mt-0">
      <Icon className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
      <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{name}</span>
    </div>
  );
}

const cellCls = `w-full text-sm text-slate-800 bg-transparent border-0 border-b border-transparent
  focus:border-teal-400 focus:outline-none hover:border-slate-300 transition-colors py-0.5 truncate`;

function CellInp({ value, readOnly, placeholder = '—' }: { value: string; readOnly?: boolean; placeholder?: string }) {
  if (readOnly) {
    return (
      <div className="flex items-center gap-1 text-slate-300">
        <RefreshCw className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="text-xs italic text-slate-400">Auto-calc</span>
      </div>
    );
  }
  return <input type="text" defaultValue={value} placeholder={placeholder} className={cellCls} />;
}

function CellSel({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <select defaultValue={value} className={`${cellCls} cursor-pointer`}>
      {children}
    </select>
  );
}

function NoteCell({ text }: { text: string }) {
  return (
    <div className="relative group/note overflow-hidden">
      <span className="block text-sm text-slate-500 truncate cursor-default">
        {text || <span className="text-slate-300">—</span>}
      </span>
      {text && (
        <div className="absolute left-0 bottom-full mb-1 z-50 bg-slate-800 text-white text-xs rounded px-2 py-1.5
          max-w-[240px] whitespace-normal shadow-xl opacity-0 group-hover/note:opacity-100 pointer-events-none transition-opacity">
          {text}
        </div>
      )}
    </div>
  );
}

function GroupSel({ value, onChange }: { value: UpdateGroup; onChange: (v: UpdateGroup) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as UpdateGroup)}
      className="w-full text-xs text-slate-500 bg-transparent border-0 border-b border-transparent
        focus:border-teal-400 focus:outline-none hover:border-slate-300 cursor-pointer"
    >
      <option value="monthly">Monthly</option>
      <option value="setup">Setup</option>
    </select>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function AddRowBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100`}>
      <button onClick={onClick} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
        <Plus className="w-3 h-3" /> {label}
      </button>
      {/* fill remaining cols */}
      <span/><span/><span/><span/><span/><span/>
    </div>
  );
}

// ─── METRIC ROW ───────────────────────────────────────────────────────────────

function MetricRow({ metric, onGroupChange }: {
  metric: Metric; onGroupChange: (id: number, g: UpdateGroup) => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <div className="flex items-center gap-1.5 pr-2 min-w-0">
        {metric.readOnly && <RefreshCw className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />}
        <span className={`text-sm truncate ${metric.readOnly ? 'text-slate-400 italic' : 'text-slate-800'}`}>
          {metric.metric}
        </span>
      </div>
      <CellInp value={metric.value} readOnly={metric.readOnly} />
      <CellInp value={metric.asOf}  readOnly={metric.readOnly} placeholder="—" />
      <CellInp value={metric.source} readOnly={metric.readOnly} placeholder="—" />
      <span className="text-xs text-slate-400 truncate">{metric.readOnly ? '—' : (metric.lastUpdated || '—')}</span>
      <NoteCell text={metric.notes} />
      <GroupSel value={metric.updateGroup} onChange={v => onGroupChange(metric.id, v)} />
    </div>
  );
}

// ─── DYNAMIC ROWS (all aligned to COLS) ──────────────────────────────────────
// Column mapping per section type:
//   Metric    | Value   | As Of     | Source | Last Upd | Notes   | Group/Action

function ReserveRow({ item, onRemove }: { item: LineItem; onRemove: () => void }) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.name}   placeholder="Reserve name" />
      <CellInp value={item.amount} placeholder="$0" />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function EscrowRow({ item, onRemove }: { item: LineItem; onRemove: () => void }) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.name}   placeholder="Escrow name" />
      <CellInp value={item.amount} placeholder="$0" />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function KeyDateRow({ item, onRemove }: { item: KeyDate; onRemove: () => void }) {
  // Metric=label | Value=dueDate | AsOf=completed | Source=— | LastUpd=— | Notes=notes | Action
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.label}     placeholder="Label" />
      <CellInp value={item.dueDate}   placeholder="Due date" />
      <CellInp value={item.completed} placeholder="Completed" />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <CellInp value={item.notes}     placeholder="Notes" />
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function ContactRow({ item, onRemove }: { item: Contact; onRemove: () => void }) {
  // Metric=label | Value=name | AsOf=emailOrUrl | Source=type | LastUpd=— | Notes=— | Action
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.label}      placeholder="Label" />
      <CellInp value={item.name}       placeholder="Name" />
      <CellInp value={item.emailOrUrl} placeholder="email or url" />
      <CellSel value={item.type}>
        <option value="email">Email</option>
        <option value="link">Link</option>
        <option value="document">Document</option>
      </CellSel>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

// ─── SECTION ──────────────────────────────────────────────────────────────────

function MetricSection({
  title, description, accent, defaultExpanded, ungrouped,
  metrics, onGroupChange,
  reserves, escrows, keyDates, contacts,
  onAddReserve, onRemoveReserve,
  onAddEscrow, onRemoveEscrow,
  onAddKeyDate, onRemoveKeyDate,
  onAddContact, onRemoveContact,
}: {
  title: string; description: string; accent: boolean; defaultExpanded: boolean; ungrouped?: boolean;
  metrics: Metric[]; onGroupChange: (id: number, g: UpdateGroup) => void;
  reserves?: LineItem[]; escrows?: LineItem[]; keyDates?: KeyDate[]; contacts?: Contact[];
  onAddReserve?: () => void; onRemoveReserve?: (id: number) => void;
  onAddEscrow?: () => void; onRemoveEscrow?: (id: number) => void;
  onAddKeyDate?: () => void; onRemoveKeyDate?: (id: number) => void;
  onAddContact?: () => void; onRemoveContact?: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Group metrics, maintaining sorted order
  const groups: Record<string, Metric[]> = {};
  const groupOrder: string[] = [];
  for (const m of metrics) {
    if (!groups[m.group]) { groups[m.group] = []; groupOrder.push(m.group); }
    groups[m.group].push(m);
  }
  groupOrder.sort((a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99));

  const totalRows = metrics.length
    + (reserves?.length ?? 0) + (escrows?.length ?? 0)
    + (keyDates?.length ?? 0) + (contacts?.length ?? 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Collapsible section header ─── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center justify-between px-5 py-4 border-b border-slate-200 transition-colors hover:brightness-95 ${
          accent ? 'bg-teal-50/60' : 'bg-slate-50'
        }`}
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h2 className={`text-sm font-bold ${accent ? 'text-teal-900' : 'text-slate-800'}`}>{title}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-500 uppercase tracking-wider">
              {totalRows} rows
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <>
          <ColHeaders accentTop={accent} />

          {/* Regular metric groups */}
          {ungrouped
            ? metrics.sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99)).map(metric => (
                <MetricRow key={metric.id} metric={metric} onGroupChange={onGroupChange} />
              ))
            : groupOrder.map(groupName => (
                <React.Fragment key={groupName}>
                  <div className={COLS}>
                    <GroupHeader name={groupName} />
                  </div>
                  {groups[groupName].map(metric => (
                    <MetricRow key={metric.id} metric={metric} onGroupChange={onGroupChange} />
                  ))}
                </React.Fragment>
              ))
          }

          {/* Lender Reserves */}
          {reserves && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Lender Reserves" /></div>}
            {reserves.map(item => (
              <ReserveRow key={item.id} item={item} onRemove={() => onRemoveReserve!(item.id)} />
            ))}
            <AddRowBtn label="Add reserve" onClick={onAddReserve!} />
          </>)}

          {/* Lender Escrows */}
          {escrows && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Lender Escrows" /></div>}
            {escrows.map(item => (
              <EscrowRow key={item.id} item={item} onRemove={() => onRemoveEscrow!(item.id)} />
            ))}
            <AddRowBtn label="Add escrow" onClick={onAddEscrow!} />
          </>)}

          {/* Key Dates */}
          {keyDates && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Key Dates" /></div>}
            <div className={`${COLS} px-4 py-1 bg-slate-50/40 border-b border-slate-100`}>
              {['Label','Due Date','Completed','','','Notes',''].map((h,i) => (
                <span key={i} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {keyDates.map(d => (
              <KeyDateRow key={d.id} item={d} onRemove={() => onRemoveKeyDate!(d.id)} />
            ))}
            <AddRowBtn label="Add key date" onClick={onAddKeyDate!} />
          </>)}

          {/* Contacts & Links */}
          {contacts && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Contacts &amp; Links" /></div>}
            <div className={`${COLS} px-4 py-1 bg-slate-50/40 border-b border-slate-100`}>
              {['Label','Name','Email / URL','Type','','',''].map((h,i) => (
                <span key={i} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {contacts.map(c => (
              <ContactRow key={c.id} item={c} onRemove={() => onRemoveContact!(c.id)} />
            ))}
            <AddRowBtn label="Add contact or link" onClick={onAddContact!} />
          </>)}
        </>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function PropertySummaryAdmin() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [hasChanges, setHasChanges] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>(INITIAL_METRICS);

  let dynId = 500;
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
    { id: 1, label: 'Lender 90-Day Repairs',  dueDate: 'Apr 1, 2026',  completed: '',             notes: '' },
    { id: 2, label: 'Lender 360-Day Repairs', dueDate: 'Jan 1, 2027',  completed: '',             notes: '' },
    { id: 3, label: 'Property Tax',           dueDate: 'Jun 15, 2026', completed: 'Jun 10, 2025', notes: '' },
    { id: 4, label: 'Insurance Renewal',      dueDate: 'Sep 5, 2025',  completed: '',             notes: '' },
  ]);
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, label: 'Lender Contact',   name: 'John Smith',       emailOrUrl: 'john.smith@metlife.com',     type: 'email' },
    { id: 2, label: 'Property Manager', name: 'Emily Chen',       emailOrUrl: 'emily@regattapm.com',        type: 'email' },
    { id: 3, label: 'SharePoint',       name: 'Document Library', emailOrUrl: 'https://sharepoint.com/...', type: 'link'  },
    { id: 4, label: 'Investor Portal',  name: 'Contact Dir.',     emailOrUrl: 'https://portal.example.com', type: 'link'  },
  ]);

  const handleGroupChange = (id: number, newGroup: UpdateGroup) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, updateGroup: newGroup } : m));
    setHasChanges(true);
  };

  const monthlyMetrics = metrics.filter(m => m.updateGroup === 'monthly');
  const setupMetrics   = metrics.filter(m => m.updateGroup === 'setup');

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* Dark header */}
      <div className="bg-[#0D3D45] text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
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

      {/* Sticky action bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-2.5 flex items-center gap-4">
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
          <div className="flex items-center gap-1.5 flex-1">
            {hasChanges
              ? <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-700 font-medium">Unsaved changes</span></>
              : <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-700 font-medium">All changes saved</span></>
            }
          </div>
          <button onClick={() => setHasChanges(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={() => setHasChanges(false)} className="px-4 py-1.5 text-xs font-semibold bg-[#0D3D45] text-white rounded-md hover:bg-teal-800 transition-colors">Save Changes</button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        <MetricSection
          title="Monthly Updates"
          description="Metrics that are typically updated each month — drive dashboard KPIs and current-period summary values."
          accent={true}
          defaultExpanded={true}
          metrics={monthlyMetrics}
          onGroupChange={handleGroupChange}
        />

        <MetricSection
          title="Setup"
          description="Metrics entered once or updated infrequently — property details, loan structure, reserves, and contacts."
          accent={false}
          defaultExpanded={false}
          ungrouped={true}
          metrics={setupMetrics}
          onGroupChange={handleGroupChange}
          reserves={reserves}
          escrows={escrows}
          keyDates={keyDates}
          contacts={contacts}
          onAddReserve={() => setReserves(p => [...p, { id: dynId++, name: '', amount: '' }])}
          onRemoveReserve={id => setReserves(p => p.filter(r => r.id !== id))}
          onAddEscrow={() => setEscrows(p => [...p, { id: dynId++, name: '', amount: '' }])}
          onRemoveEscrow={id => setEscrows(p => p.filter(e => e.id !== id))}
          onAddKeyDate={() => setKeyDates(p => [...p, { id: dynId++, label: '', dueDate: '', completed: '', notes: '' }])}
          onRemoveKeyDate={id => setKeyDates(p => p.filter(d => d.id !== id))}
          onAddContact={() => setContacts(p => [...p, { id: dynId++, label: '', name: '', emailOrUrl: '', type: 'email' }])}
          onRemoveContact={id => setContacts(p => p.filter(c => c.id !== id))}
        />

        <div className="h-8" />
      </div>
    </div>
  );
}
