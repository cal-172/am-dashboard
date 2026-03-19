import React, { useState, useRef } from 'react';
import {
  Calendar, AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw,
  TrendingUp, ShieldCheck, Hammer, Building2, DollarSign, Users
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
const m = (group: string, metric: string, value: string, asOf: string, source: string, lastUpdated: string, notes = '', readOnly = false, updateGroup: UpdateGroup = 'monthly'): Metric =>
  ({ id: _uid++, group, metric, value, asOf, source, lastUpdated, notes, updateGroup, readOnly });

const INITIAL_METRICS: Metric[] = [
  // ── Monthly / Performance ─────────────────────────────────────────
  m('Performance', 'Occupancy %',    '94.5%',    'Aug 20, 2025', 'Operating Report',   'Sep 1, 2025'),
  m('Performance', 'Vacancy %',      '',         '',              '',                   '',           '', true),
  m('Performance', 'DSCR',           '1.32x',    'Aug 20, 2025', 'Lender Statement',   'Sep 1, 2025'),
  m('Performance', 'NOI (LTM)',      '$3.2M',    'Aug 20, 2025', 'Operating Report',   'Sep 1, 2025'),
  m('Performance', 'NOI vs Budget',  '+$148K',   'Aug 20, 2025', 'Budget Report',      'Sep 1, 2025'),
  m('Performance', 'NOI Status',     '',         '',              '',                   '',           '', true),
  // ── Monthly / Operating Reserves ─────────────────────────────────
  m('Operating Reserves', 'Remaining Reserve Balance',  '$582K',   'Aug 20, 2025', 'Operating Account', 'Sep 1, 2025'),
  m('Operating Reserves', 'Initial Operating Balance',  '$500K',   'Jan 15, 2020', 'Closing Docs',      'Jan 16, 2020'),
  m('Operating Reserves', 'Net Cash Flow To Date',      '+$82K',   'Aug 20, 2025', 'Operating Account', 'Sep 1, 2025'),
  m('Operating Reserves', 'Expense Coverage (Months)',  '',         '',              '',                  '',            '', true),
  // ── Monthly / CapEx ───────────────────────────────────────────────
  m('CapEx', 'CapEx Spend To Date',     '$1.28M',    'Aug 20, 2025', 'General Contractor',  'Sep 1, 2025'),
  m('CapEx', 'Target Completion Date',  'Dec 2026',  '',              '',                    'Sep 1, 2025'),
  m('CapEx', 'CapEx % Complete',        '',           '',              '',                    '',           '', true),
  m('CapEx', 'CapEx Status',            '',           '',              '',                    '',           '', true),
  // ── Monthly / Investment ──────────────────────────────────────────
  m('Investment', 'Current Distribution Ann. ($)', '$624K',   'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  m('Investment', 'Current Distribution Ann. (%)', '8.00%',   'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  m('Investment', 'ITD Distribution Paid ($)',      '$1.84M',  'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  m('Investment', 'ITD Distribution Paid (%)',      '23.6%',   'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  m('Investment', 'Cumulative Pref Shortfall',      '$320K',   'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  m('Investment', 'Capital Returned',               '$1.2M',   'Aug 20, 2025', 'Investor Records', 'Sep 1, 2025'),
  // ── Setup / Summary ──────────────────────────────────────────────
  m('Summary', 'Property Name',       'Regatta Apartments',                 '',              '',              'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Address',             '12635 Scarsdale, San Antonio TX',    '',              '',              'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Unit Count',          '200',                                '',              '',              'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Year Built',          '1985',                               '',              '',              'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Acquisition Date',    'Jan 15, 2020',                       '',              '',              'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Purchase Price',      '$32.5M',                             '',              'Closing Docs',  'Jan 16, 2020', '', false, 'setup'),
  m('Summary', 'Total Capitalization','$37.2M',                             '',              'Closing Docs',  'Jan 16, 2020', '', false, 'setup'),
  // ── Setup / Loan Details ──────────────────────────────────────────
  m('Loan Details', 'Loan Amount',          '$28.5M',              'Jan 15, 2020', 'Lender Statement',    'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'Loan to Value (LTV)',  '65.0%',               'Jan 15, 2020', 'Lender Statement',    'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'Lender',              'MetLife Insurance Co.','',              'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'Interest Rate',       '4.25%',               'Jan 15, 2020', 'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'Term',               '10 years',             '',              'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'I/O Period',         '24 months',            '',              'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'I/O Remaining (mo)', '0',                    '',              '',                    'Sep 1, 2025',  '', false, 'setup'),
  m('Loan Details', 'Prepay Penalty',     'Step-down (3-2-1-0)',  '',              'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'Maturity Date',      'Jan 15, 2030',         '',              'Loan Agreement',      'Jan 16, 2020', '', false, 'setup'),
  m('Loan Details', 'DSCR Covenant',      '1.25x',                '',              'Loan Agreement',      'Jan 16, 2020', 'Used as dashboard threshold', false, 'setup'),
];

// Group ordering
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

// ─── GRID PRIMITIVES ──────────────────────────────────────────────────────────

// Column template: Metric | Value | As Of | Source | Last Updated | Notes | Group
const COLS = 'grid grid-cols-[minmax(180px,1fr)_140px_100px_130px_110px_90px_100px]';

function ColHeaders() {
  return (
    <div className={`${COLS} px-4 py-2 bg-slate-50 border-b border-slate-200 sticky top-[49px] z-30`}>
      {['Metric','Value','As Of Date','Source','Last Updated','Notes','Group'].map(h => (
        <span key={h} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</span>
      ))}
    </div>
  );
}

function GroupHeader({ name }: { name: string }) {
  const Icon = GROUP_ICONS[name] || Building2;
  return (
    <div className="col-span-7 flex items-center gap-2 px-4 py-2 bg-slate-50/60 border-b border-slate-100">
      <Icon className="w-3 h-3 text-slate-400" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{name}</span>
    </div>
  );
}

function CellInput({ value, readOnly, placeholder = '' }: { value: string; readOnly?: boolean; placeholder?: string }) {
  if (readOnly) {
    return (
      <div className="flex items-center gap-1 text-slate-400 text-xs italic">
        <RefreshCw className="w-2.5 h-2.5 flex-shrink-0 text-slate-300" />
        <span className="truncate">Auto-calc</span>
      </div>
    );
  }
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className="w-full text-sm text-slate-800 bg-transparent border-0 border-b border-transparent
        focus:border-teal-400 focus:outline-none hover:border-slate-300 transition-colors py-0.5 truncate"
    />
  );
}

function NoteCell({ text }: { text: string }) {
  return (
    <div className="relative group/note">
      <span className="block text-xs text-slate-400 truncate max-w-[80px] cursor-default">
        {text || <span className="opacity-0">—</span>}
      </span>
      {text && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 text-white text-xs rounded px-2 py-1.5
          max-w-[200px] whitespace-normal shadow-lg opacity-0 group-hover/note:opacity-100 pointer-events-none transition-opacity">
          {text}
        </div>
      )}
    </div>
  );
}

function GroupSelect({ value, onChange }: { value: UpdateGroup; onChange: (v: UpdateGroup) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as UpdateGroup)}
      className="w-full text-xs text-slate-600 bg-transparent border-0 border-b border-transparent
        focus:border-teal-400 focus:outline-none hover:border-slate-300 cursor-pointer truncate"
    >
      <option value="monthly">Monthly</option>
      <option value="setup">Setup</option>
    </select>
  );
}

// ─── METRIC ROW ───────────────────────────────────────────────────────────────

function MetricRow({ metric, onGroupChange }: {
  metric: Metric; onGroupChange: (id: number, g: UpdateGroup) => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50/70 transition-colors items-center`}>
      <div className="text-sm text-slate-800 flex items-center gap-1.5 pr-2">
        {metric.readOnly && <RefreshCw className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />}
        <span className={metric.readOnly ? 'text-slate-400 italic' : ''}>{metric.metric}</span>
      </div>
      <CellInput value={metric.value} readOnly={metric.readOnly} placeholder="—" />
      <CellInput value={metric.asOf}  readOnly={metric.readOnly} placeholder="—" />
      <CellInput value={metric.source} readOnly={metric.readOnly} placeholder="—" />
      <span className="text-xs text-slate-400">
        {metric.readOnly ? '—' : (metric.lastUpdated || '—')}
      </span>
      <NoteCell text={metric.notes} />
      <GroupSelect value={metric.updateGroup} onChange={v => onGroupChange(metric.id, v)} />
    </div>
  );
}

// ─── DYNAMIC SECTION ROWS (reserves, escrows) ─────────────────────────────────

function LineItemRows({ items, onAdd, onRemove, namePh, amtPh }: {
  items: LineItem[]; onAdd: () => void; onRemove: (id: number) => void;
  namePh: string; amtPh: string;
}) {
  return (
    <>
      {items.map(item => (
        <div key={item.id} className="grid grid-cols-[minmax(180px,1fr)_140px_1fr_32px] px-4 py-2 border-b border-slate-100 hover:bg-slate-50/70 transition-colors items-center gap-3">
          <input type="text" defaultValue={item.name} placeholder={namePh}
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={item.amount} placeholder="$0"
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <span className="text-xs text-slate-300">—</span>
          <button onClick={() => onRemove(item.id)} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="px-4 py-2 border-b border-slate-100">
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
          <Plus className="w-3 h-3" /> Add line item
        </button>
      </div>
    </>
  );
}

function KeyDateRows({ items, onAdd, onRemove }: {
  items: KeyDate[]; onAdd: () => void; onRemove: (id: number) => void;
}) {
  return (
    <>
      {items.map(d => (
        <div key={d.id} className="grid grid-cols-[1.2fr_100px_100px_1fr_32px] px-4 py-2 border-b border-slate-100 hover:bg-slate-50/70 transition-colors items-center gap-3">
          <input type="text" defaultValue={d.label} placeholder="Date label"
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={d.dueDate} placeholder="Due date"
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={d.completed} placeholder="Completed"
            className="text-sm text-slate-400 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={d.notes} placeholder="Notes"
            className="text-sm text-slate-400 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <button onClick={() => onRemove(d.id)} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="px-4 py-2 border-b border-slate-100">
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
          <Plus className="w-3 h-3" /> Add key date
        </button>
      </div>
    </>
  );
}

function ContactRows({ items, onAdd, onRemove }: {
  items: Contact[]; onAdd: () => void; onRemove: (id: number) => void;
}) {
  return (
    <>
      {items.map(c => (
        <div key={c.id} className="grid grid-cols-[1fr_1fr_1.3fr_100px_32px] px-4 py-2 border-b border-slate-100 hover:bg-slate-50/70 transition-colors items-center gap-3">
          <input type="text" defaultValue={c.label} placeholder="Label"
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={c.name} placeholder="Name"
            className="text-sm text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <input type="text" defaultValue={c.emailOrUrl} placeholder="email or https://..."
            className="text-sm text-slate-400 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300 py-0.5" />
          <select defaultValue={c.type} className="text-xs text-slate-600 bg-transparent border-0 border-b border-transparent focus:border-teal-400 focus:outline-none hover:border-slate-300">
            <option value="email">Email</option>
            <option value="link">Link</option>
            <option value="document">Document</option>
          </select>
          <button onClick={() => onRemove(c.id)} className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="px-4 py-2 border-b border-slate-100">
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
          <Plus className="w-3 h-3" /> Add contact or link
        </button>
      </div>
    </>
  );
}

// ─── SECTION: renders all metric groups within one Update Group ──────────────

function MetricSection({
  title, description, accent, metrics, onGroupChange,
  reserves, escrows, keyDates, contacts,
  onAddReserve, onRemoveReserve,
  onAddEscrow, onRemoveEscrow,
  onAddKeyDate, onRemoveKeyDate,
  onAddContact, onRemoveContact,
}: {
  title: string; description: string; accent: boolean;
  metrics: Metric[]; onGroupChange: (id: number, g: UpdateGroup) => void;
  reserves?: LineItem[]; escrows?: LineItem[]; keyDates?: KeyDate[]; contacts?: Contact[];
  onAddReserve?: () => void; onRemoveReserve?: (id: number) => void;
  onAddEscrow?: () => void; onRemoveEscrow?: (id: number) => void;
  onAddKeyDate?: () => void; onRemoveKeyDate?: (id: number) => void;
  onAddContact?: () => void; onRemoveContact?: (id: number) => void;
}) {
  // Group metrics by group name, maintaining order
  const groups: Record<string, Metric[]> = {};
  const groupOrder: string[] = [];
  for (const m of metrics) {
    if (!groups[m.group]) { groups[m.group] = []; groupOrder.push(m.group); }
    groups[m.group].push(m);
  }
  // Sort groups by GROUP_ORDER
  groupOrder.sort((a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className={`px-5 py-4 border-b border-slate-200 ${accent ? 'bg-teal-50/50' : 'bg-slate-50/50'}`}>
        <h2 className={`text-sm font-bold ${accent ? 'text-teal-900' : 'text-slate-800'}`}>{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>

      {/* Column headers */}
      <ColHeaders />

      {/* Metric groups */}
      {groupOrder.map(groupName => (
        <React.Fragment key={groupName}>
          <div className={`${COLS} border-b border-slate-100`}>
            <GroupHeader name={groupName} />
          </div>
          {groups[groupName].map(metric => (
            <MetricRow key={metric.id} metric={metric} onGroupChange={onGroupChange} />
          ))}
        </React.Fragment>
      ))}

      {/* Dynamic sections (Setup only) */}
      {reserves && (
        <>
          <div className={`${COLS} border-b border-slate-100`}>
            <GroupHeader name="Lender Reserves" />
          </div>
          <div className="grid grid-cols-[minmax(180px,1fr)_140px_1fr_32px] px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 gap-3">
            {['Reserve Name','Amount','',''].map((h,i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <LineItemRows items={reserves!} onAdd={onAddReserve!} onRemove={onRemoveReserve!} namePh="Reserve name" amtPh="$0" />
        </>
      )}
      {escrows && (
        <>
          <div className={`${COLS} border-b border-slate-100`}>
            <GroupHeader name="Lender Escrows" />
          </div>
          <div className="grid grid-cols-[minmax(180px,1fr)_140px_1fr_32px] px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 gap-3">
            {['Escrow Name','Amount','',''].map((h,i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <LineItemRows items={escrows!} onAdd={onAddEscrow!} onRemove={onRemoveEscrow!} namePh="Escrow name" amtPh="$0" />
        </>
      )}
      {keyDates && (
        <>
          <div className={`${COLS} border-b border-slate-100`}>
            <GroupHeader name="Key Dates" />
          </div>
          <div className="grid grid-cols-[1.2fr_100px_100px_1fr_32px] px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 gap-3">
            {['Label','Due Date','Completed','Notes',''].map((h,i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <KeyDateRows items={keyDates!} onAdd={onAddKeyDate!} onRemove={onRemoveKeyDate!} />
        </>
      )}
      {contacts && (
        <>
          <div className={`${COLS} border-b border-slate-100`}>
            <GroupHeader name="Contacts & Links" />
          </div>
          <div className="grid grid-cols-[1fr_1fr_1.3fr_100px_32px] px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 gap-3">
            {['Label','Name','Email / URL','Type',''].map((h,i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <ContactRows items={contacts!} onAdd={onAddContact!} onRemove={onRemoveContact!} />
        </>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

      {/* ── Dark header ────────────────────────────────────────────────── */}
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

      {/* ── Sticky action bar ──────────────────────────────────────────── */}
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

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Monthly Updates */}
        <MetricSection
          title="Monthly Updates"
          description="These metrics are typically updated each month and drive dashboard KPIs and current-period summary values."
          accent={true}
          metrics={monthlyMetrics}
          onGroupChange={handleGroupChange}
        />

        {/* Setup */}
        <MetricSection
          title="Setup"
          description="These metrics are typically entered once or updated infrequently."
          accent={false}
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
