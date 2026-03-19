import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw,
  TrendingUp, ShieldCheck, Hammer, Building2, DollarSign, Users,
  ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type UpdateGroup = 'monthly' | 'setup';

type Metric = {
  id: number;
  key: string;
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
type Contact  = { id: number; label: string; name: string; emailOrUrl: string; type: string; notes: string; lastUpdated: string };

// ─── STATIC MONTHLY METRIC STRUCTURE ─────────────────────────────────────────
// Defines the ordered rows (including calculated placeholders) for Monthly Updates

const MONTHLY_STRUCTURE: Array<{ key: string; name: string; group: string; readOnly: boolean }> = [
  { key: 'occupancy_pct',           name: 'Occupancy %',               group: 'Performance',      readOnly: false },
  { key: 'vacancy_pct',             name: 'Vacancy %',                 group: 'Performance',      readOnly: true  },
  { key: 'dscr',                    name: 'DSCR',                      group: 'Performance',      readOnly: false },
  { key: 'noi_ltm',                 name: 'NOI (LTM)',                 group: 'Performance',      readOnly: false },
  { key: 'noi_vs_budget',           name: 'NOI vs Budget',             group: 'Performance',      readOnly: false },
  { key: 'noi_status',              name: 'NOI Status',                group: 'Performance',      readOnly: true  },

  { key: 'remaining_reserve_bal',   name: 'Remaining Reserve Balance', group: 'Operating Reserves',readOnly: false },
  { key: 'initial_op_balance',      name: 'Initial Operating Balance', group: 'Operating Reserves',readOnly: false },
  { key: 'net_cash_flow',           name: 'Net Cash Flow To Date',     group: 'Operating Reserves',readOnly: false },
  { key: 'expense_coverage_months', name: 'Expense Coverage (Months)', group: 'Operating Reserves',readOnly: true  },

  { key: 'capex_spend',             name: 'CapEx Spend To Date',       group: 'CapEx',             readOnly: false },
  { key: 'target_completion_date',  name: 'Target Completion Date',    group: 'CapEx',             readOnly: false },
  { key: 'capex_pct_complete',      name: 'CapEx % Complete',          group: 'CapEx',             readOnly: true  },
  { key: 'capex_status',            name: 'CapEx Status',              group: 'CapEx',             readOnly: true  },

  { key: 'current_distrib_ann_usd', name: 'Current Distrib. Ann. ($)', group: 'Investment',        readOnly: false },
  { key: 'current_distrib_ann_pct', name: 'Current Distrib. Ann. (%)', group: 'Investment',        readOnly: false },
  { key: 'itd_distrib_paid_usd',    name: 'ITD Distribution Paid ($)', group: 'Investment',        readOnly: false },
  { key: 'itd_distrib_paid_pct',    name: 'ITD Distribution Paid (%)', group: 'Investment',        readOnly: false },
  { key: 'cum_pref_shortfall',      name: 'Cumulative Pref Shortfall', group: 'Investment',        readOnly: false },
  { key: 'capital_returned',        name: 'Capital Returned',          group: 'Investment',        readOnly: false },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toMonthKey(label: string): string {
  const parts = label.trim().split(/\s+/);
  const year  = parts[parts.length - 1];
  const month = parts[0].slice(0, 3).toLowerCase();
  return `${year}-${month}`;
}

function buildMonthlyMetrics(apiMetrics: any[]): Metric[] {
  const map: Record<string, any> = {};
  for (const m of apiMetrics) map[m.key] = m;
  return MONTHLY_STRUCTURE.map((s, i) => {
    const d = map[s.key] || {};
    return {
      id: i + 1,
      key: s.key,
      group: s.group,
      metric: s.name,
      value: d.value || '',
      asOf: d.asOf || '',
      source: d.source || '',
      lastUpdated: d.lastUpdated || '',
      notes: d.notes || '',
      updateGroup: 'monthly' as UpdateGroup,
      readOnly: s.readOnly,
    };
  });
}

function buildSetupMetrics(apiMetrics: any[]): Metric[] {
  return apiMetrics.map((m, i) => ({
    id: 1000 + i,
    key: m.key,
    group: m.group,
    metric: m.name,
    value: m.value || '',
    asOf: m.asOf || '',
    source: m.source || '',
    lastUpdated: m.lastUpdated || '',
    notes: m.notes || '',
    updateGroup: 'setup' as UpdateGroup,
    readOnly: false,
  }));
}

function serializeMetrics(metrics: Metric[], updateGroup: UpdateGroup) {
  return metrics
    .filter(m => m.updateGroup === updateGroup && !m.readOnly)
    .map(m => ({ key: m.key, name: m.metric, group: m.group, value: m.value, asOf: m.asOf, source: m.source, notes: m.notes }));
}

// ─── GROUPING / ORDERING ───────────────────────────────────────────────────────

const GROUP_ORDER: Record<string, number> = {
  'Performance': 0, 'Operating Reserves': 1, 'CapEx': 2, 'Investment': 3,
  'Summary': 0, 'Loan Details': 1, 'Lender Reserves': 2, 'Lender Escrows': 3, 'Key Dates': 4,
};
const GROUP_ICONS: Record<string, React.ElementType> = {
  'Performance': TrendingUp, 'Operating Reserves': ShieldCheck, 'CapEx': Hammer, 'Investment': TrendingUp,
  'Summary': Building2, 'Loan Details': DollarSign, 'Lender Reserves': ShieldCheck,
  'Lender Escrows': ShieldCheck, 'Key Dates': Calendar,
};

const MONTHS = [
  'January 2026','February 2026','March 2026','April 2026',
  'May 2026','June 2026','July 2026','August 2026',
];

// ─── UNIFIED GRID TEMPLATE ────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[minmax(140px,0.7fr)_130px_95px_115px_100px_minmax(120px,1fr)_90px] gap-x-4';

// ─── ALIGNMENT ────────────────────────────────────────────────────────────────

const isRightAlign = (v: string) => {
  const s = v.trim();
  if (!s) return false;
  if (/^[\+\-]?\$?[\d,\.]+[KMBx%]?$/.test(s)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(s)) return true;
  if (/^\d{4}$/.test(s)) return true;
  if (/^\d+\s+(years?|months?|mo)$/i.test(s)) return true;
  return false;
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function ColHeaders({ accentTop }: { accentTop?: boolean }) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-200 ${accentTop ? 'bg-teal-50/40' : 'bg-slate-50'}`}>
      {['Metric','Value','As Of Date','Source','Last Updated','Notes','Group'].map((h, i) => (
        <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</span>
      ))}
    </div>
  );
}

function GroupHeader({ name }: { name: string }) {
  const Icon = GROUP_ICONS[name] || Building2;
  return (
    <div className={`${COLS} col-span-full px-4 py-1.5 bg-slate-50/60 border-b border-slate-100`}>
      <div className="flex items-center gap-1.5 col-span-7">
        <Icon className="w-3 h-3 text-teal-500 flex-shrink-0" />
        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">{name}</span>
      </div>
    </div>
  );
}

const cellCls = `w-full text-sm text-slate-800 bg-transparent border-0 border-b border-transparent
  focus:border-teal-400 focus:outline-none hover:border-slate-300 transition-colors py-0.5 truncate`;

function CellInp({ value, readOnly, placeholder = '—', right = false, onChange }: {
  value: string; readOnly?: boolean; placeholder?: string; right?: boolean; onChange?: (v: string) => void;
}) {
  if (readOnly) {
    return (
      <div className={`flex items-center gap-1 text-slate-300 ${right ? 'justify-end' : ''}`}>
        <RefreshCw className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="text-xs italic text-slate-400">Auto-calc</span>
      </div>
    );
  }
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      className={`${cellCls} ${right ? 'text-right' : ''}`}
    />
  );
}

function CellSel({ value, onChange, children }: { value: string; onChange?: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      className={`${cellCls} cursor-pointer`}
    >
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
      <span/><span/><span/><span/><span/><span/>
    </div>
  );
}

// ─── METRIC ROW ───────────────────────────────────────────────────────────────

function MetricRow({ metric, onGroupChange, onUpdate }: {
  metric: Metric;
  onGroupChange: (id: number, g: UpdateGroup) => void;
  onUpdate: (id: number, field: 'value'|'asOf'|'source'|'notes', v: string) => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <div className="flex items-center gap-1.5 pr-2 min-w-0">
        {metric.readOnly && <RefreshCw className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />}
        <span className={`text-sm truncate ${metric.readOnly ? 'text-slate-400 italic' : 'text-slate-800'}`}>
          {metric.metric}
        </span>
      </div>
      <CellInp value={metric.value}  readOnly={metric.readOnly} right={metric.readOnly || isRightAlign(metric.value)} onChange={v => onUpdate(metric.id, 'value', v)} />
      <CellInp value={metric.asOf}   readOnly={metric.readOnly} placeholder="—" right onChange={v => onUpdate(metric.id, 'asOf', v)} />
      <CellInp value={metric.source} readOnly={metric.readOnly} placeholder="—" onChange={v => onUpdate(metric.id, 'source', v)} />
      <span className="text-xs text-slate-400 truncate text-right">{metric.readOnly ? '—' : (metric.lastUpdated || '—')}</span>
      <NoteCell text={metric.notes} />
      <GroupSel value={metric.updateGroup} onChange={v => onGroupChange(metric.id, v)} />
    </div>
  );
}

// ─── DYNAMIC ROWS ─────────────────────────────────────────────────────────────

function ReserveRow({ item, onUpdate, onRemove }: {
  item: LineItem; onUpdate: (id: number, field: 'name'|'amount', v: string) => void; onRemove: () => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.name}   placeholder="Reserve name" onChange={v => onUpdate(item.id, 'name', v)} />
      <CellInp value={item.amount} placeholder="$0" right={isRightAlign(item.amount)} onChange={v => onUpdate(item.id, 'amount', v)} />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function EscrowRow({ item, onUpdate, onRemove }: {
  item: LineItem; onUpdate: (id: number, field: 'name'|'amount', v: string) => void; onRemove: () => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.name}   placeholder="Escrow name" onChange={v => onUpdate(item.id, 'name', v)} />
      <CellInp value={item.amount} placeholder="$0" right={isRightAlign(item.amount)} onChange={v => onUpdate(item.id, 'amount', v)} />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function KeyDateRow({ item, onUpdate, onRemove }: {
  item: KeyDate; onUpdate: (id: number, field: 'label'|'dueDate'|'completed'|'notes', v: string) => void; onRemove: () => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.label}     placeholder="Label"     onChange={v => onUpdate(item.id, 'label', v)} />
      <CellInp value={item.dueDate}   placeholder="Due date"  onChange={v => onUpdate(item.id, 'dueDate', v)} />
      <CellInp value={item.completed} placeholder="Completed" onChange={v => onUpdate(item.id, 'completed', v)} />
      <span className="text-slate-300 text-xs">—</span>
      <span className="text-slate-300 text-xs">—</span>
      <CellInp value={item.notes}     placeholder="Notes"     onChange={v => onUpdate(item.id, 'notes', v)} />
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function ContactRow({ item, onUpdate, onRemove }: {
  item: Contact; onUpdate: (id: number, field: 'label'|'name'|'emailOrUrl'|'type', v: string) => void; onRemove: () => void;
}) {
  return (
    <div className={`${COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
      <CellInp value={item.label}      placeholder="Label"        onChange={v => onUpdate(item.id, 'label', v)} />
      <CellInp value={item.name}       placeholder="Name"         onChange={v => onUpdate(item.id, 'name', v)} />
      <CellInp value={item.emailOrUrl} placeholder="email or url" onChange={v => onUpdate(item.id, 'emailOrUrl', v)} />
      <CellSel value={item.type} onChange={v => onUpdate(item.id, 'type', v)}>
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
  metrics, onGroupChange, onMetricUpdate,
  reserves, escrows, keyDates,
  onAddReserve, onRemoveReserve, onReserveUpdate,
  onAddEscrow, onRemoveEscrow, onEscrowUpdate,
  onAddKeyDate, onRemoveKeyDate, onKeyDateUpdate,
}: {
  title: string; description: string; accent: boolean; defaultExpanded: boolean; ungrouped?: boolean;
  metrics: Metric[];
  onGroupChange: (id: number, g: UpdateGroup) => void;
  onMetricUpdate: (id: number, field: 'value'|'asOf'|'source'|'notes', v: string) => void;
  reserves?: LineItem[]; onAddReserve?: () => void; onRemoveReserve?: (id: number) => void;
  onReserveUpdate?: (id: number, field: 'name'|'amount', v: string) => void;
  escrows?: LineItem[];  onAddEscrow?: () => void;  onRemoveEscrow?: (id: number) => void;
  onEscrowUpdate?: (id: number, field: 'name'|'amount', v: string) => void;
  keyDates?: KeyDate[]; onAddKeyDate?: () => void; onRemoveKeyDate?: (id: number) => void;
  onKeyDateUpdate?: (id: number, field: 'label'|'dueDate'|'completed'|'notes', v: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const groups: Record<string, Metric[]> = {};
  const groupOrder: string[] = [];
  for (const m of metrics) {
    if (!groups[m.group]) { groups[m.group] = []; groupOrder.push(m.group); }
    groups[m.group].push(m);
  }
  groupOrder.sort((a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99));

  const totalRows = metrics.length
    + (reserves?.length ?? 0) + (escrows?.length ?? 0)
    + (keyDates?.length ?? 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

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

          {ungrouped
            ? metrics.sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99)).map(metric => (
                <MetricRow key={metric.id} metric={metric} onGroupChange={onGroupChange} onUpdate={onMetricUpdate} />
              ))
            : groupOrder.map(groupName => (
                <React.Fragment key={groupName}>
                  <div className={COLS}>
                    <GroupHeader name={groupName} />
                  </div>
                  {groups[groupName].map(metric => (
                    <MetricRow key={metric.id} metric={metric} onGroupChange={onGroupChange} onUpdate={onMetricUpdate} />
                  ))}
                </React.Fragment>
              ))
          }

          {reserves && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Lender Reserves" /></div>}
            {reserves.map(item => (
              <ReserveRow key={item.id} item={item}
                onUpdate={onReserveUpdate!}
                onRemove={() => onRemoveReserve!(item.id)} />
            ))}
            <AddRowBtn label="Add reserve" onClick={onAddReserve!} />
          </>)}

          {escrows && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Lender Escrows" /></div>}
            {escrows.map(item => (
              <EscrowRow key={item.id} item={item}
                onUpdate={onEscrowUpdate!}
                onRemove={() => onRemoveEscrow!(item.id)} />
            ))}
            <AddRowBtn label="Add escrow" onClick={onAddEscrow!} />
          </>)}

          {keyDates && (<>
            {!ungrouped && <div className={COLS}><GroupHeader name="Key Dates" /></div>}
            <div className={`${COLS} px-4 py-1 bg-slate-50/40 border-b border-slate-100`}>
              {['Label','Due Date','Completed','','','Notes',''].map((h, i) => (
                <span key={i} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {keyDates.map(d => (
              <KeyDateRow key={d.id} item={d}
                onUpdate={onKeyDateUpdate!}
                onRemove={() => onRemoveKeyDate!(d.id)} />
            ))}
            <AddRowBtn label="Add key date" onClick={onAddKeyDate!} />
          </>)}
        </>
      )}
    </div>
  );
}

// ─── CONTACTS SECTION (standalone, own column structure) ─────────────────────

const CONTACT_COLS = 'grid grid-cols-[1fr_1fr_1.5fr_100px_1fr_110px_36px] gap-x-4';

function ContactsSection({ items, onAdd, onRemove, onUpdate }: {
  items: Contact[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: 'label'|'name'|'emailOrUrl'|'type', v: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 hover:brightness-95 transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800">Contacts &amp; Links</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-500 uppercase tracking-wider">
              {items.length} rows
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">People, portals, and documents associated with this asset.</p>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <>
          {/* Column headers */}
          <div className={`${CONTACT_COLS} px-4 py-2 border-b border-slate-200 bg-slate-50`}>
            {['Label','Name','Email / URL','Type','Notes','Last Updated',''].map((h, i) => (
              <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</span>
            ))}
          </div>

          {items.map(c => (
            <div key={c.id} className={`${CONTACT_COLS} px-4 py-2 border-b border-slate-100 hover:bg-slate-50/80 transition-colors items-center`}>
              <CellInp value={c.label}      placeholder="Label"        onChange={v => onUpdate(c.id, 'label', v)} />
              <CellInp value={c.name}       placeholder="Name"         onChange={v => onUpdate(c.id, 'name', v)} />
              <CellInp value={c.emailOrUrl} placeholder="email or url" onChange={v => onUpdate(c.id, 'emailOrUrl', v)} />
              <CellSel value={c.type} onChange={v => onUpdate(c.id, 'type', v)}>
                <option value="email">Email</option>
                <option value="link">Link</option>
                <option value="document">Document</option>
              </CellSel>
              <span className="text-xs text-slate-400 truncate">{c.notes || '—'}</span>
              <span className="text-xs text-slate-400 truncate text-right">{c.lastUpdated || '—'}</span>
              <RemoveBtn onClick={() => onRemove(c.id)} />
            </div>
          ))}

          <div className={`${CONTACT_COLS} px-4 py-2 border-b border-slate-100`}>
            <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
              <Plus className="w-3 h-3" /> Add contact or link
            </button>
            <span/><span/><span/><span/><span/><span/>
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function PropertySummaryAdmin() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null);
  const [loading, setLoading] = useState(true);

  const [metrics,  setMetrics]  = useState<Metric[]>([]);
  const [reserves, setReserves] = useState<LineItem[]>([]);
  const [escrows,  setEscrows]  = useState<LineItem[]>([]);
  const [keyDates, setKeyDates] = useState<KeyDate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  let _dynId = 9000;
  const nextId = () => ++_dynId;

  const loadData = useCallback(async (monthLabel: string) => {
    setLoading(true);
    setHasChanges(false);
    setSaveMsg(null);
    try {
      const key = toMonthKey(monthLabel);
      const res = await fetch(`/api/property-summary/admin?month=${key}`);
      const data = await res.json();
      setMetrics([
        ...buildMonthlyMetrics(data.monthlyMetrics || []),
        ...buildSetupMetrics(data.setupMetrics || []),
      ]);
      setReserves((data.reserves || []).map((r: any, i: number) => ({ ...r, id: r.id ?? 200 + i })));
      setEscrows((data.escrows   || []).map((e: any, i: number) => ({ ...e, id: e.id ?? 300 + i })));
      setKeyDates((data.keyDates || []).map((d: any, i: number) => ({ ...d, id: d.id ?? 400 + i })));
      setContacts((data.contacts || []).map((c: any, i: number) => ({
        id: c.id ?? 500 + i, label: c.label || '', name: c.name || '',
        emailOrUrl: c.emailOrUrl || '', type: c.type || 'email',
        notes: c.notes || '', lastUpdated: c.lastUpdated || '',
      })));
    } catch (e) {
      console.error('Failed to load property summary data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(selectedMonth); }, [selectedMonth, loadData]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleGroupChange = (id: number, newGroup: UpdateGroup) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, updateGroup: newGroup } : m));
    setHasChanges(true);
  };

  const handleMetricUpdate = (id: number, field: 'value'|'asOf'|'source'|'notes', v: string) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, [field]: v } : m));
    setHasChanges(true);
  };

  const handleReserveUpdate = (id: number, field: 'name'|'amount', v: string) => {
    setReserves(prev => prev.map(r => r.id === id ? { ...r, [field]: v } : r));
    setHasChanges(true);
  };

  const handleEscrowUpdate = (id: number, field: 'name'|'amount', v: string) => {
    setEscrows(prev => prev.map(e => e.id === id ? { ...e, [field]: v } : e));
    setHasChanges(true);
  };

  const handleKeyDateUpdate = (id: number, field: 'label'|'dueDate'|'completed'|'notes', v: string) => {
    setKeyDates(prev => prev.map(d => d.id === id ? { ...d, [field]: v } : d));
    setHasChanges(true);
  };

  const handleContactUpdate = (id: number, field: 'label'|'name'|'emailOrUrl'|'type', v: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: v } : c));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const key = toMonthKey(selectedMonth);
      const res = await fetch('/api/property-summary/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: key,
          setupMetrics:   serializeMetrics(metrics, 'setup'),
          monthlyMetrics: serializeMetrics(metrics, 'monthly'),
          reserves,
          escrows,
          keyDates,
          contacts,
        }),
      });
      if (res.ok) {
        setSaveMsg('saved');
        setHasChanges(false);
      } else {
        setSaveMsg('error');
      }
    } catch {
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { loadData(selectedMonth); };

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
              onChange={e => handleMonthChange(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1 text-sm font-semibold text-teal-700 bg-white focus:border-teal-500 outline-none"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            {saving ? (
              <><RefreshCw className="w-3.5 h-3.5 text-teal-500 animate-spin" /><span className="text-xs text-teal-700 font-medium">Saving…</span></>
            ) : saveMsg === 'saved' ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-700 font-medium">All changes saved</span></>
            ) : saveMsg === 'error' ? (
              <><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-700 font-medium">Save failed — try again</span></>
            ) : hasChanges ? (
              <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-700 font-medium">Unsaved changes</span></>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-700 font-medium">All changes saved</span></>
            )}
          </div>
          <button onClick={handleCancel} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs font-semibold bg-[#0D3D45] text-white rounded-md hover:bg-teal-800 transition-colors disabled:opacity-40">
            Save Changes
          </button>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="max-w-screen-xl mx-auto px-6 py-16 flex items-center justify-center">
          <span className="text-slate-400 text-sm">Loading…</span>
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

          <MetricSection
            title="Monthly Updates"
            description="Metrics that are typically updated each month — drive dashboard KPIs and current-period summary values."
            accent={true}
            defaultExpanded={true}
            metrics={monthlyMetrics}
            onGroupChange={handleGroupChange}
            onMetricUpdate={handleMetricUpdate}
          />

          <MetricSection
            title="Setup"
            description="Metrics entered once or updated infrequently — property details, loan structure, reserves, and key dates."
            accent={false}
            defaultExpanded={true}
            metrics={setupMetrics}
            onGroupChange={handleGroupChange}
            onMetricUpdate={handleMetricUpdate}
            reserves={reserves}
            escrows={escrows}
            keyDates={keyDates}
            onAddReserve={() => setReserves(p => [...p, { id: nextId(), name: '', amount: '' }])}
            onRemoveReserve={id => { setReserves(p => p.filter(r => r.id !== id)); setHasChanges(true); }}
            onReserveUpdate={handleReserveUpdate}
            onAddEscrow={() => setEscrows(p => [...p, { id: nextId(), name: '', amount: '' }])}
            onRemoveEscrow={id => { setEscrows(p => p.filter(e => e.id !== id)); setHasChanges(true); }}
            onEscrowUpdate={handleEscrowUpdate}
            onAddKeyDate={() => setKeyDates(p => [...p, { id: nextId(), label: '', dueDate: '', completed: '', notes: '' }])}
            onRemoveKeyDate={id => { setKeyDates(p => p.filter(d => d.id !== id)); setHasChanges(true); }}
            onKeyDateUpdate={handleKeyDateUpdate}
          />

          <ContactsSection
            items={contacts}
            onAdd={() => setContacts(p => [...p, { id: nextId(), label: '', name: '', emailOrUrl: '', type: 'email', notes: '', lastUpdated: '' }])}
            onRemove={id => { setContacts(p => p.filter(c => c.id !== id)); setHasChanges(true); }}
            onUpdate={handleContactUpdate}
          />

          <div className="h-8" />
        </div>
      )}
    </div>
  );
}
