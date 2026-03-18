const express = require('express');
const session = require('express-session');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE     = path.join(__dirname, 'data', 'financial.json');
const USERS_FILE    = path.join(__dirname, 'data', 'users.json');
const UPLOADS_FILE  = path.join(__dirname, 'data', 'uploads.json');
const MAPPINGS_FILE = path.join(__dirname, 'data', 'mappings.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'regatta-dashboard-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/* ══════════════════════════════════════════════════════
   DATA HELPERS
══════════════════════════════════════════════════════ */
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readData()     { return readJSON(DATA_FILE,     { property: 'Regatta — 1163_rr', year: 2026, months: {}, updatedAt: new Date().toISOString() }); }
function readUsers()    { return readJSON(USERS_FILE,    []); }
function readUploads()  { return readJSON(UPLOADS_FILE,  []); }
function readMappings() { return readJSON(MAPPINGS_FILE, []); }

function writeData(d)      { d.updatedAt = new Date().toISOString(); writeJSON(DATA_FILE, d); }
function writeUsers(u)     { writeJSON(USERS_FILE, u); }
function writeUploads(u)   { writeJSON(UPLOADS_FILE, u); }
function writeMappings(m)  { writeJSON(MAPPINGS_FILE, m); }

/* ── Bootstrap initial admin user ── */
async function initUsers() {
  const users = readUsers();
  if (users.length === 0) {
    const ADMIN_EMAIL = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS  = process.env.ADMIN_PASS  || 'regatta2026';
    const hash = await bcrypt.hash(ADMIN_PASS, 10);
    users.push({ id: uuidv4(), email: ADMIN_EMAIL, passwordHash: hash, role: 'admin', createdAt: new Date().toISOString() });
    writeUsers(users);
    console.log(`Created initial admin user: ${ADMIN_EMAIL}`);
  }
}

/* ══════════════════════════════════════════════════════
   AUTH MIDDLEWARE
══════════════════════════════════════════════════════ */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Admin access required' });
  res.redirect('/');
}

/* ══════════════════════════════════════════════════════
   AUTH ROUTES
══════════════════════════════════════════════════════ */
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (user && await bcrypt.compare(password || '', user.passwordHash)) {
    req.session.userId    = user.id;
    req.session.email     = user.email;
    req.session.role      = user.role;
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

/* ══════════════════════════════════════════════════════
   PAGES
══════════════════════════════════════════════════════ */
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ══════════════════════════════════════════════════════
   API — SESSION INFO
══════════════════════════════════════════════════════ */
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ email: req.session.email, role: req.session.role });
});

/* ══════════════════════════════════════════════════════
   API — FINANCIAL DATA
══════════════════════════════════════════════════════ */
app.get('/api/data', requireAuth, (req, res) => {
  res.json(readData());
});

app.post('/api/data', requireAuth, requireAdmin, (req, res) => {
  try {
    const current = readData();
    const { months, property, year } = req.body;
    if (months)   current.months   = months;
    if (property) current.property = property;
    if (year)     current.year     = year;
    writeData(current);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/data/month/:month', requireAuth, requireAdmin, (req, res) => {
  try {
    const data = readData();
    delete data.months[req.params.month];
    writeData(data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════
   API — FILE UPLOADS
══════════════════════════════════════════════════════ */

/* Parse + preview (does not save to DB yet) */
app.post('/api/upload/parse', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileType     = req.body.fileType || 'combined'; // t12 | budget | combined
    const savedMappings = readMappings();
    const workbook     = XLSX.read(req.file.buffer, { type: 'buffer' });
    const result       = parseRealPageWorkbook(workbook, fileType, savedMappings);
    result.originalName = req.file.originalname;
    result.fileType     = fileType;
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Parse error: ' + e.message }); }
});

/* Commit parsed data + record upload history */
app.post('/api/upload/commit', requireAuth, requireAdmin, (req, res) => {
  try {
    const { months, fileType, originalName, sheetName } = req.body;
    if (!months) return res.status(400).json({ error: 'No months data' });

    const current = readData();
    const monthsAffected = [];

    for (const [m, mdata] of Object.entries(months)) {
      if (!current.months[m]) current.months[m] = { a: {}, b: {} };
      if (fileType === 't12' || fileType === 'combined') {
        Object.assign(current.months[m].a, mdata.a || {});
      }
      if (fileType === 'budget' || fileType === 'combined') {
        Object.assign(current.months[m].b, mdata.b || {});
      }
      monthsAffected.push(m);
    }
    writeData(current);

    const uploads = readUploads();
    uploads.unshift({
      id: uuidv4(),
      originalName: originalName || 'unknown',
      fileType,
      sheetName: sheetName || '',
      monthsAffected,
      uploadedBy: req.session.email,
      uploadedAt: new Date().toISOString()
    });
    writeUploads(uploads.slice(0, 100)); // keep last 100

    res.json({ success: true, monthsAffected });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Upload history */
app.get('/api/uploads', requireAuth, requireAdmin, (req, res) => {
  res.json(readUploads());
});

/* Delete an upload record (does not revert data) */
app.delete('/api/uploads/:id', requireAuth, requireAdmin, (req, res) => {
  const uploads = readUploads().filter(u => u.id !== req.params.id);
  writeUploads(uploads);
  res.json({ success: true });
});

/* ══════════════════════════════════════════════════════
   API — MAPPING RULES
══════════════════════════════════════════════════════ */
app.get('/api/mappings', requireAuth, requireAdmin, (req, res) => {
  res.json(readMappings());
});

app.post('/api/mappings/bulk', requireAuth, requireAdmin, (req, res) => {
  try {
    const { mappings: incoming } = req.body;
    if (!Array.isArray(incoming)) return res.status(400).json({ error: 'mappings must be an array' });
    const existing = readMappings();
    const now = new Date().toISOString();
    let added = 0, updated = 0;
    for (const m of incoming) {
      if (!m.sourceLabel || !m.dashboardKey) continue;
      const idx = existing.findIndex(e => cleanStr(e.sourceLabel) === cleanStr(m.sourceLabel));
      if (idx >= 0) {
        existing[idx].dashboardKey = m.dashboardKey;
        existing[idx].confirmedAt  = now;
        existing[idx].confirmedBy  = req.session.email;
        updated++;
      } else {
        existing.push({ id: uuidv4(), sourceLabel: m.sourceLabel, dashboardKey: m.dashboardKey,
          method: 'user', scope: 'global', confirmedAt: now, confirmedBy: req.session.email });
        added++;
      }
    }
    writeMappings(existing);
    res.json({ success: true, added, updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/mappings/:id', requireAuth, requireAdmin, (req, res) => {
  writeMappings(readMappings().filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

/* API: save-parsed kept for backward compat */
app.post('/api/save-parsed', requireAuth, requireAdmin, (req, res) => {
  try {
    const { months } = req.body;
    const current = readData();
    if (months) Object.assign(current.months, months);
    writeData(current);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════
   API — USER MANAGEMENT (admin only)
══════════════════════════════════════════════════════ */
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const users = readUsers().map(({ id, email, role, createdAt }) => ({ id, email, role, createdAt }));
  res.json(users);
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!['admin','viewer'].includes(role)) return res.status(400).json({ error: 'Role must be admin or viewer' });

    const users = readUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: uuidv4(), email, passwordHash, role, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeUsers(users);
    res.json({ success: true, user: { id: newUser.id, email, role, createdAt: newUser.createdAt } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { email, password, role } = req.body;

    // Prevent removing the last admin
    if (role === 'viewer' && users[idx].role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot demote the only admin user' });
    }

    if (email) {
      const conflict = users.find((u, i) => i !== idx && u.email.toLowerCase() === email.toLowerCase());
      if (conflict) return res.status(409).json({ error: 'Email already in use' });
      users[idx].email = email;
    }
    if (password) {
      users[idx].passwordHash = await bcrypt.hash(password, 10);
    }
    if (role) users[idx].role = role;

    writeUsers(users);
    const { passwordHash: _, ...safe } = users[idx];
    res.json({ success: true, user: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting yourself
    if (user.id === req.session.userId) return res.status(400).json({ error: 'Cannot delete your own account' });

    // Prevent deleting last admin
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only admin user' });
    }

    writeUsers(users.filter(u => u.id !== req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════
   REALPAGE EXCEL PARSER
   fileType: 'combined' | 't12' | 'budget'
══════════════════════════════════════════════════════ */
const ALL_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_NAMES = {
  january:'jan',february:'feb',march:'mar',april:'apr',may:'may',june:'jun',
  july:'jul',august:'aug',september:'sep',october:'oct',november:'nov',december:'dec',
  jan:'jan',feb:'feb',mar:'mar',apr:'apr',jun:'jun',jul:'jul',
  aug:'aug',sep:'sep',oct:'oct',nov:'nov',dec:'dec'
};

const ROW_PATTERNS = [
  { key:'pri',      patterns:['potential rental income','scheduled rent','gross potential rent','market rent','gross scheduled rent'] },
  { key:'ltl',      patterns:['loss to lease','loss-to-lease'] },
  { key:'vac',      patterns:['total vacancy','vacancy loss','physical vacancy loss','total physical vacancy'] },
  { key:'mod',      patterns:['model','model/admin','model / admin','total nonrevenue','nonrevenue units','employee units'] },
  { key:'con',      patterns:['total concessions','concession','concessions'] },
  { key:'bd',       patterns:['bad debt','bad debts','total delinq','delinquency','bad debt expense'] },
  { key:'trr',      patterns:['total rental revenue','gross rental revenue','net rental revenue','total rental income'] },
  { key:'ur',       patterns:['utility reimbursement','utility reimbursements','total utility income','utility income','rubs program','rubs'] },
  { key:'oi',       patterns:['total other misc income','total other miscellaneous income','total miscellaneous income','other revenues total','total non-rental other income'] },
  { key:'toi',      patterns:['total parking/utilities/other','total parking utilities other','total other income','total other revenues','total non-rental income','parking/utilities/other income','parking utilities other income'] },
  { key:'egi',      patterns:['effective gross income','effective gross revenue','total revenue','total income'] },
  { key:'payroll',  patterns:['total payroll','payroll & benefits','total payroll & benefits','salaries and wages'] },
  { key:'adv',      patterns:['total leasing & marketing','total leasing and marketing','advertising & marketing','advertising and marketing','total advertising','leasing & marketing'] },
  { key:'ga',       patterns:['total general & admin','total general and admin','general & administrative','general and administrative','g&a','admin expenses'] },
  { key:'util',     patterns:['total utilities','utility expense','utility expenses','utilities expense'] },
  { key:'rm',       patterns:['total repairs & maintenance','repairs & maintenance','repairs and maintenance','total r&m'] },
  { key:'contract', patterns:['contract services','contracted services','total contract services','total landscaping','total security'] },
  { key:'mgmt',     patterns:['total management fees','total management fee','property management fee','property management'] },
  { key:'mr',       patterns:['make ready','make-ready','unit turns','turnover','total t/o refurbishment','total turnover','total unit turns'] },
  { key:'taxes',    patterns:['total taxes & other','total taxes and other','taxes & other assessments','real estate taxes','property taxes','real estate tax'] },
  { key:'ins',      patterns:['total insurance','insurance'] },
  { key:'opex',     patterns:['total operating expenses','total expenses','operating expenses total'] },
  { key:'noi',      patterns:['net operating income','noi'] },
  { key:'amfee',    patterns:['total asset & other fees','asset management fee','asset management fees','asset mgmt fee','am fee'] },
  { key:'debt',     patterns:['total debt service','debt service','mortgage','loan payment','principal & interest','interest expense'] },
  { key:'capex',    patterns:['total replacement reserves','replacement reserves','capital expenditures','capex','capital improvements','capital expenses'] },
  { key:'ncf',      patterns:['net cash flow','cash flow after debt'] },
];

function cleanStr(s) {
  return s.toLowerCase().replace(/[^a-z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchKey(label) {
  const clean = cleanStr(label);
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) { if (clean === cleanStr(p)) return key; }
  }
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) { if (clean.includes(cleanStr(p))) return key; }
  }
  return null;
}

function matchKeyWithConfidence(label, savedMappings) {
  const clean = cleanStr(label);
  // 1. Saved user-confirmed mapping (highest priority)
  for (const sm of savedMappings) {
    if (cleanStr(sm.sourceLabel) === clean) {
      return { key: sm.dashboardKey, method: 'saved', confidence: 'high' };
    }
  }
  // 2. Exact pattern match
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) {
      if (clean === cleanStr(p)) return { key, method: 'exact', confidence: 'high' };
    }
  }
  // 3. Pattern substring match (label contains pattern)
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) {
      if (clean.includes(cleanStr(p))) return { key, method: 'pattern', confidence: 'medium' };
    }
  }
  return { key: null, method: 'unmapped', confidence: 'none' };
}

/* Keys that are detail (sum-able) vs. calculated subtotals */
const INCOME_DETAIL  = ['pri','ltl','vac','mod','con','bd'];
const EXPENSE_DETAIL = ['payroll','adv','ga','util','rm','contract','mgmt','mr','taxes','ins'];

function runReconciliation(months) {
  const issues = [];
  for (const [month, md] of Object.entries(months)) {
    const a = md.a || {};
    /* Income: TRR + TOI should ≈ EGI */
    if (a.egi !== undefined && (a.trr !== undefined || a.toi !== undefined)) {
      const computed = (a.trr || 0) + (a.toi || 0);
      const variance = Math.abs(computed - (a.egi || 0));
      if (variance > 100 && (a.egi ? variance / Math.abs(a.egi) : 1) > 0.005) {
        issues.push({ type:'income', month, label:'Income: TRR + TOI ≠ EGI',
          computed: Math.round(computed), expected: Math.round(a.egi||0), variance: Math.round(variance) });
      }
    }
    /* Expenses: detail sum should ≈ OPEX */
    if (a.opex !== undefined) {
      const computed = EXPENSE_DETAIL.reduce((s,k) => s + Math.abs(a[k]||0), 0);
      const opex = Math.abs(a.opex || 0);
      if (computed > 0 && opex > 0) {
        const variance = Math.abs(computed - opex);
        if (variance > 100 && variance / opex > 0.01) {
          issues.push({ type:'expense', month, label:'Expenses: detail sum ≠ OPEX',
            computed: Math.round(computed), expected: Math.round(opex), variance: Math.round(variance) });
        }
      }
    }
    /* Below-line: NOI + OPEX should ≈ EGI */
    if (a.egi !== undefined && a.opex !== undefined && a.noi !== undefined) {
      const computed = (a.egi || 0) - Math.abs(a.opex || 0);
      const variance = Math.abs(computed - (a.noi || 0));
      if (variance > 100 && Math.abs(a.egi||1) > 0 && variance / Math.abs(a.egi) > 0.005) {
        issues.push({ type:'noi', month, label:'NOI: EGI − OPEX ≠ NOI',
          computed: Math.round(computed), expected: Math.round(a.noi||0), variance: Math.round(variance) });
      }
    }
  }
  return issues;
}

function cellNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$()%]/g,'').trim());
  if (isNaN(n)) return 0;
  if (String(val).includes('(') || (typeof val === 'string' && val.trim().startsWith('('))) return -Math.abs(n);
  return n;
}

function parseRealPageWorkbook(workbook, fileType = 'combined', savedMappings = []) {
  const results = { months: {}, rows: [], warnings: [], unmapped: [], sheetName: '', reconciliation: [] };

  const preferred = workbook.SheetNames.find(n => /t12|summary|budget|income|financial/i.test(n));
  const sheetName = preferred || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  results.sheetName = sheetName;

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? cell.v : null);
    }
    rows.push(row);
  }

  let headerRow = -1;
  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const monthCount = rows[r].filter(v => {
      if (!v) return false;
      const s = String(v).toLowerCase();
      return Object.keys(MONTH_NAMES).some(m => s.startsWith(m));
    }).length;
    if (monthCount >= 2) { headerRow = r; break; }
  }

  if (headerRow < 0) {
    results.warnings.push('Could not detect month columns. Please verify the Excel format.');
    return results;
  }

  const colMonths = [];
  const hdr = rows[headerRow];
  let lastMonth = null;

  for (let c = 0; c < hdr.length; c++) {
    const v = String(hdr[c] || '').toLowerCase().trim();
    const monthKey = Object.keys(MONTH_NAMES).find(m => v.startsWith(m));
    if (monthKey) {
      lastMonth = MONTH_NAMES[monthKey];
      colMonths.push({ col: c, month: lastMonth, type: fileType === 'budget' ? 'budget' : 'actual' });
    } else if (fileType === 'combined' && lastMonth) {
      if (/budget/i.test(v))              colMonths.push({ col: c, month: lastMonth, type: 'budget' });
      else if (/actual/i.test(v))         colMonths[colMonths.length-1] = { col: c, month: lastMonth, type: 'actual' };
      else if (/variance|delta/i.test(v)) { /* skip */ }
    }
  }

  if (colMonths.length === 0) {
    results.warnings.push('No month columns found after header detection.');
    return results;
  }

  const monthCols = {};
  for (const { col, month, type } of colMonths) {
    if (!monthCols[month]) monthCols[month] = {};
    monthCols[month][type] = col;
  }

  // Auto-detect label column by scoring pre-month columns
  const firstMonthCol = Math.min(...colMonths.map(cm => cm.col));
  const labelColScores = {};
  const sampleEnd = Math.min(rows.length, headerRow + 60);
  for (let r = headerRow + 1; r < sampleEnd; r++) {
    for (let c = 0; c < firstMonthCol; c++) {
      const v = String(rows[r]?.[c] || '').trim();
      if (v && matchKey(v)) labelColScores[c] = (labelColScores[c] || 0) + 1;
    }
  }
  let labelCol = 0, bestScore = 0;
  for (const [c, score] of Object.entries(labelColScores)) {
    if (score > bestScore) { bestScore = score; labelCol = parseInt(c); }
  }

  // Track which keys are already mapped (for duplicate detection)
  const mappedKeys = {};

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const label = String(row[labelCol] || '').trim();
    if (!label || /^-+$/.test(label) || label.length <= 1) continue;

    const { key, method, confidence } = matchKeyWithConfidence(label, savedMappings);

    // Collect per-month values
    const monthValues = {};
    let totalActual = 0, totalBudget = 0;
    for (const [month, cols] of Object.entries(monthCols)) {
      const actual = cols.actual !== undefined ? cellNum(row[cols.actual]) : null;
      const budget = cols.budget !== undefined ? cellNum(row[cols.budget]) : null;
      monthValues[month] = { actual, budget };
      if (actual !== null) totalActual += Math.abs(actual);
      if (budget !== null) totalBudget += Math.abs(budget);
    }

    const isHeader = !key && totalActual < 1 && totalBudget < 1;
    const isDuplicate = key && mappedKeys[key] !== undefined;

    const rowObj = {
      rowIndex: r,
      label,
      key,
      method,
      confidence,
      excluded: false,
      isHeader,
      isDuplicate,
      monthValues,
      totalActual: Math.round(totalActual),
      totalBudget: Math.round(totalBudget)
    };
    results.rows.push(rowObj);

    if (key) {
      if (isDuplicate) {
        results.warnings.push(`Duplicate mapping: "${label}" and "${mappedKeys[key]}" both map to ${key} — only the first will be used`);
      } else {
        mappedKeys[key] = label;
        for (const [month, vals] of Object.entries(monthValues)) {
          if (!results.months[month]) results.months[month] = { a: {}, b: {} };
          if (vals.actual !== null && fileType !== 'budget')   results.months[month].a[key] = vals.actual;
          if (vals.budget !== null && fileType !== 't12')      results.months[month].b[key] = vals.budget;
        }
      }
    } else if (!isHeader) {
      results.unmapped.push(label);
    }
  }

  if (Object.keys(results.months).length === 0) {
    results.warnings.push('No data extracted. The file layout may be unsupported.');
  }

  results.reconciliation = runReconciliation(results.months);
  return results;
}

/* ── STATIC ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── START ── */
initUsers().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Regatta Dashboard running on port ${PORT}`);
  });
});
