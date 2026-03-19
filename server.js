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
const MAPPINGS_FILE   = path.join(__dirname, 'data', 'mappings.json');
const SEEN_ROWS_FILE      = path.join(__dirname, 'data', 'seen_rows.json');
const RAW_UPLOADS_FILE    = path.join(__dirname, 'data', 'raw_uploads.json');

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
function readMappings()  { return readJSON(MAPPINGS_FILE,  []); }
function readSeenRows() { return readJSON(SEEN_ROWS_FILE, []); }

function writeData(d)      { d.updatedAt = new Date().toISOString(); writeJSON(DATA_FILE, d); }
function writeUsers(u)     { writeJSON(USERS_FILE, u); }
function writeUploads(u)   { writeJSON(UPLOADS_FILE, u); }
function writeMappings(m)  { writeJSON(MAPPINGS_FILE, m); }
function writeSeenRows(r)  { writeJSON(SEEN_ROWS_FILE, r); }
function readRawUploads()  { return readJSON(RAW_UPLOADS_FILE, []); }
function writeRawUploads(r){ writeJSON(RAW_UPLOADS_FILE, r); }

/* SUMIF aggregation — re-computes the months dict from raw stored rows and
   current mapping rules. Called at read time so mapping changes are instant.
   Uploads processed oldest→newest so newer uploads win for the same month. */
function aggregateFromRawData() {
  const rawUploads    = readRawUploads().sort((a, b) => new Date(a.committedAt) - new Date(b.committedAt));
  const savedMappings = readMappings();
  const months        = {};

  for (const upload of rawUploads) {
    const { fileType, rows, monthsCommitted } = upload;
    for (const row of (rows || [])) {
      // Apply current mappings; fall back to the original key recorded at commit time
      const { key: resolved, method: resolvedMethod } = matchKeyWithConfidence(row.label, row.code, savedMappings);
      // If a saved mapping rule explicitly excludes or marks as header, respect it — never fall back
      if (resolved === '_exclude' || resolved === '_header') continue;
      // Use saved/pattern-matched key; only fall back to originalKey when no mapping was found
      const validKey = k => k && k !== '_exclude' && k !== '_header';
      const key = validKey(resolved)
        ? resolved
        : (resolvedMethod === 'unmapped' && validKey(row.originalKey) ? row.originalKey : null);
      if (!key) continue;

      for (const [month, vals] of Object.entries(row.monthValues || {})) {
        if (monthsCommitted && !monthsCommitted.includes(month)) continue;
        if (!months[month]) months[month] = { a: {}, b: {} };

        // SUM all rows that share the same dashboard key — multiple source rows can map to one category
        if (fileType !== 'budget' && vals.actual !== null && vals.actual !== undefined) {
          months[month].a[key] = (months[month].a[key] || 0) + vals.actual;
        }
        if (fileType !== 't12' && vals.budget !== null && vals.budget !== undefined) {
          months[month].b[key] = (months[month].b[key] || 0) + vals.budget;
        }
      }
    }
  }

  return months;
}

/* Record every code+label pair encountered in a parsed file */
function updateSeenRows(parsedRows) {
  const existing = readSeenRows();
  const now = new Date().toISOString();
  for (const row of parsedRows) {
    const code  = String(row.code  || '').trim();
    const label = String(row.label || '').trim();
    if (!label) continue;
    let idx = -1;
    if (code) idx = existing.findIndex(e => String(e.code || '').trim() === code);
    if (idx < 0) idx = existing.findIndex(e => !String(e.code || '').trim() && cleanStr(e.label) === cleanStr(label));
    const isHeader = !!(row.isHeader);
    if (idx >= 0) {
      existing[idx].label    = label;
      existing[idx].lastSeen = now;
      if (isHeader) existing[idx].isHeader = true; // once detected as header, persist it
    } else {
      existing.push({ code, label, isHeader: isHeader || undefined, firstSeen: now, lastSeen: now });
    }
  }
  writeSeenRows(existing);
}

/* ── Migrate raw uploads from bare month keys (jan) to year-prefixed (2026-jan) ── */
function migrateRawUploadsToYearKeys() {
  const meta = readData();
  const defaultYear = meta.year || 2026;
  const raw = readRawUploads();
  let changed = false;

  for (const upload of raw) {
    const needsMigration = (upload.monthsCommitted || []).some(m => !/^\d{4}-/.test(m));
    if (!needsMigration) continue;
    changed = true;

    upload.monthsCommitted = (upload.monthsCommitted || []).map(m =>
      /^\d{4}-/.test(m) ? m : defaultYear + '-' + m
    );

    for (const row of (upload.rows || [])) {
      const oldValues = row.monthValues || {};
      const newValues = {};
      for (const [m, vals] of Object.entries(oldValues)) {
        const newKey = /^\d{4}-/.test(m) ? m : defaultYear + '-' + m;
        newValues[newKey] = vals;
      }
      row.monthValues = newValues;
    }
  }

  if (changed) {
    writeRawUploads(raw);
    console.log(`Migrated raw uploads to year-prefixed month keys (default year: ${defaultYear})`);
  }
}

/* ── Bootstrap initial admin user ── */
async function initUsers() {
  migrateRawUploadsToYearKeys();
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

app.get('/property-summary', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'property-summary.html'));
});

app.get('/property-summary-admin', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'property-summary-admin.html'));
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
  const meta = readData(); // {property, year, updatedAt, months (legacy fallback)}
  const rawUploads = readRawUploads();
  if (rawUploads.length) {
    // SUMIF approach: aggregate from raw rows using current mapping rules
    const months = aggregateFromRawData();
    res.json({ property: meta.property, year: meta.year, updatedAt: meta.updatedAt, months });
  } else {
    // Legacy fallback: serve pre-aggregated data already in financial.json
    res.json(meta);
  }
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
    updateSeenRows(result.rows);
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Parse error: ' + e.message }); }
});

/* Commit parsed data + record upload history */
app.post('/api/upload/commit', requireAuth, requireAdmin, (req, res) => {
  try {
    const { rows, fileType, originalName, sheetName } = req.body;
    if (!rows || !rows.length) return res.status(400).json({ error: 'No row data to commit' });

    // Derive which months are covered by the committed rows
    const monthsAffected = [...new Set(rows.flatMap(r => Object.keys(r.monthValues || {})))].sort();
    const uploadId = uuidv4();
    const now      = new Date().toISOString();

    // Store raw rows — this is the source of truth for SUMIF aggregation
    const rawUploads = readRawUploads();
    rawUploads.push({
      id:               uploadId,
      fileType,
      originalName:     originalName || 'unknown',
      committedAt:      now,
      committedBy:      req.session.email,
      monthsCommitted:  monthsAffected,
      rows:             rows.map(r => ({
        code:        r.code  || '',
        label:       r.label || '',
        originalKey: r.key   || null,
        monthValues: r.monthValues || {}
      }))
    });
    writeRawUploads(rawUploads);

    // Update metadata timestamp in financial.json (keep property/year intact)
    const meta = readData();
    writeJSON(DATA_FILE, { property: meta.property, year: meta.year, updatedAt: now });

    // Upload history log
    const uploads = readUploads();
    uploads.unshift({
      id: uploadId, originalName: originalName || 'unknown', fileType,
      sheetName: sheetName || '', monthsAffected,
      uploadedBy: req.session.email, uploadedAt: now
    });
    writeUploads(uploads.slice(0, 100));

    res.json({ success: true, monthsAffected });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Upload history */
app.get('/api/uploads', requireAuth, requireAdmin, (req, res) => {
  res.json(readUploads());
});

/* Delete an upload record — removes raw rows too so SUMIF aggregation excludes it */
app.delete('/api/uploads/:id', requireAuth, requireAdmin, (req, res) => {
  const id = req.params.id;
  writeUploads(readUploads().filter(u => u.id !== id));
  writeRawUploads(readRawUploads().filter(r => r.id !== id));
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
      const codeStr = String(m.sourceCode || '').trim();
      // Find existing rule: prefer code match, fall back to label match
      let idx = -1;
      if (codeStr) idx = existing.findIndex(e => e.sourceCode && String(e.sourceCode).trim() === codeStr);
      if (idx < 0)  idx = existing.findIndex(e => cleanStr(e.sourceLabel) === cleanStr(m.sourceLabel));
      if (idx >= 0) {
        existing[idx].dashboardKey = m.dashboardKey;
        existing[idx].sourceCode   = codeStr || existing[idx].sourceCode;
        existing[idx].sourceLabel  = m.sourceLabel;
        existing[idx].confirmedAt  = now;
        existing[idx].confirmedBy  = req.session.email;
        updated++;
      } else {
        existing.push({ id: uuidv4(), sourceCode: codeStr, sourceLabel: m.sourceLabel,
          dashboardKey: m.dashboardKey, method: 'user', scope: 'global',
          confirmedAt: now, confirmedBy: req.session.email });
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

/* All seen code+label rows merged with current mappings */
app.get('/api/seen-rows', requireAuth, requireAdmin, (req, res) => {
  const seenRows = readSeenRows();
  const mappings = readMappings();
  const result = seenRows.map(row => {
    const codeStr = String(row.code || '').trim();
    let mapping = null;
    if (codeStr) mapping = mappings.find(m => m.sourceCode && String(m.sourceCode).trim() === codeStr);
    if (!mapping) mapping = mappings.find(m => cleanStr(m.sourceLabel) === cleanStr(row.label));
    return {
      code:        row.code || '',
      label:       row.label,
      isHeader:    row.isHeader || false,
      firstSeen:   row.firstSeen,
      lastSeen:    row.lastSeen,
      dashboardKey: mapping ? mapping.dashboardKey : null,
      mappingId:    mapping ? mapping.id : null,
      savedBy:      mapping ? mapping.confirmedBy : null,
      savedAt:      mapping ? mapping.confirmedAt : null
    };
  });
  res.json(result);
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

function matchKeyWithConfidence(label, code, savedMappings) {
  const clean   = cleanStr(label);
  const codeStr = String(code || '').trim();
  // 1. Saved mapping matched by account code (most reliable — codes are stable even if labels change)
  if (codeStr) {
    for (const sm of savedMappings) {
      if (sm.sourceCode && String(sm.sourceCode).trim() === codeStr) {
        return { key: sm.dashboardKey, method: 'saved-code', confidence: 'high' };
      }
    }
  }
  // 2. Saved mapping matched by label
  for (const sm of savedMappings) {
    if (cleanStr(sm.sourceLabel) === clean) {
      return { key: sm.dashboardKey, method: 'saved-label', confidence: 'high' };
    }
  }
  // 3. Exact pattern match on label
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) {
      if (clean === cleanStr(p)) return { key, method: 'exact', confidence: 'high' };
    }
  }
  // 4. Pattern substring match on label
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
  let lastYk = null, lastYear = new Date().getFullYear();

  for (let c = 0; c < hdr.length; c++) {
    const raw = String(hdr[c] || '');
    const v = raw.toLowerCase().trim();
    const monthKey = Object.keys(MONTH_NAMES).find(m => v.startsWith(m));
    if (monthKey) {
      const yearMatch = raw.match(/\b(20\d{2})\b/);
      if (yearMatch) lastYear = parseInt(yearMatch[1]);
      lastYk = lastYear + '-' + MONTH_NAMES[monthKey];
      colMonths.push({ col: c, month: lastYk, type: fileType === 'budget' ? 'budget' : 'actual' });
    } else if (fileType === 'combined' && lastYk) {
      if (/budget/i.test(v))              colMonths.push({ col: c, month: lastYk, type: 'budget' });
      else if (/actual/i.test(v))         colMonths[colMonths.length-1] = { col: c, month: lastYk, type: 'actual' };
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

  // Code column: the column immediately before the label column (account codes in RealPage)
  const codeCol = labelCol > 0 ? labelCol - 1 : -1;

  // Track which keys are already mapped (for duplicate detection)
  const mappedKeys = {};

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const label = String(row[labelCol] || '').trim();
    if (!label || /^-+$/.test(label) || label.length <= 1) continue;
    const code = codeCol >= 0 ? String(row[codeCol] || '').trim() : '';

    const { key, method, confidence } = matchKeyWithConfidence(label, code, savedMappings);

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
      code,
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
      mappedKeys[key] = label; // track last-seen label for this key (informational)
      for (const [month, vals] of Object.entries(monthValues)) {
        if (!results.months[month]) results.months[month] = { a: {}, b: {} };
        // SUM — all source rows that share a dashboard key are accumulated
        if (vals.actual !== null && fileType !== 'budget')
          results.months[month].a[key] = (results.months[month].a[key] || 0) + vals.actual;
        if (vals.budget !== null && fileType !== 't12')
          results.months[month].b[key] = (results.months[month].b[key] || 0) + vals.budget;
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

/* ══════════════════════════════════════════════════════
   PROPERTY SUMMARY — DATA FILES
══════════════════════════════════════════════════════ */
const PROP_SETUP_FILE     = path.join(__dirname, 'data', 'property_setup_metrics.json');
const PROP_MONTHLY_FILE   = path.join(__dirname, 'data', 'property_monthly_metrics.json');
const PROP_RESERVES_FILE  = path.join(__dirname, 'data', 'property_reserves.json');
const PROP_ESCROWS_FILE   = path.join(__dirname, 'data', 'property_escrows.json');
const PROP_KEYDATES_FILE  = path.join(__dirname, 'data', 'property_keydates.json');
const PROP_CONTACTS_FILE  = path.join(__dirname, 'data', 'property_contacts.json');
const PROP_SNAPSHOTS_FILE = path.join(__dirname, 'data', 'property_kpi_snapshots.json');
const PROP_SECTIONS_FILE  = path.join(__dirname, 'data', 'property_metric_sections.json');

function readSetupMetrics()       { return readJSON(PROP_SETUP_FILE,    []); }
function readMonthlyMetrics()     { return readJSON(PROP_MONTHLY_FILE,  {}); }
function readReserves()           { return readJSON(PROP_RESERVES_FILE,  []); }
function readEscrows()            { return readJSON(PROP_ESCROWS_FILE,   []); }
function readKeyDates()           { return readJSON(PROP_KEYDATES_FILE,  []); }
function readContacts()           { return readJSON(PROP_CONTACTS_FILE,  []); }
function readSnapshots()          { return readJSON(PROP_SNAPSHOTS_FILE, {}); }
function readSectionAssignments() { return readJSON(PROP_SECTIONS_FILE,  {}); }

/* ── Number parser: "$3.2M" → 3200000, "94.5%" → 94.5, "1.32x" → 1.32 ── */
function parseMetricNum(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/,/g, '');
  if (!s || s === '—') return null;
  // Handle accounting negative: ($31,680) or (31680)
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  if (s.startsWith('$')) s = s.slice(1);
  let mul = 1;
  if (s.endsWith('K')) { mul = 1e3;  s = s.slice(0, -1); }
  if (s.endsWith('M')) { mul = 1e6;  s = s.slice(0, -1); }
  if (s.endsWith('B')) { mul = 1e9;  s = s.slice(0, -1); }
  if (s.endsWith('%')) s = s.slice(0, -1);
  if (s.endsWith('x')) s = s.slice(0, -1);
  const n = parseFloat(s);
  return isNaN(n) ? null : (neg ? -n : n) * mul;
}

/* ── Status helpers ── */
function dscrStatusStr(v)    { return v == null ? null : v >= 1.25 ? 'healthy' : v >= 1.10 ? 'watch' : 'issue'; }
function occupancyStatusStr(v){ return v == null ? null : v >= 93  ? 'healthy' : v >= 90   ? 'watch' : 'issue'; }
function reserveStatusStr(v) { return v == null ? null : v >= 4.0  ? 'healthy' : v >= 2.0  ? 'watch' : 'issue'; }
function noiStatusStr(vs)    {
  if (vs == null) return null;
  return vs >= 0 ? 'healthy' : 'issue';
}
function capexStatusStr(pct, expected) {
  if (pct == null) return null;
  const exp = expected ?? pct;
  const lag = exp - pct;
  return lag <= 10 ? 'healthy' : lag <= 20 ? 'watch' : 'issue';
}

/* ── Build a KPI snapshot from saved metric data ── */
function buildSnapshot(monthKey) {
  const allMonthly = readMonthlyMetrics();
  const monthMetrics = allMonthly[monthKey] || [];
  const setup = readSetupMetrics();
  const allMetrics = [...setup, ...monthMetrics];

  const get = key => {
    const m = allMetrics.find(x => x.key === key);
    return m ? parseMetricNum(m.value) : null;
  };
  const getRaw = key => {
    const m = allMetrics.find(x => x.key === key);
    return m ? m.value : null;
  };

  const occupancy   = get('occupancy_pct');
  const dscr        = get('dscr');
  const noiLtm      = get('noi_ltm');
  const noiVsBudget = get('noi_vs_budget');
  const reserveBal  = get('remaining_reserve_bal');
  const capexSpend  = get('capex_spend');
  const capexBudget = get('capex_budget');
  const capexPct    = capexBudget && capexSpend != null ? Math.round((capexSpend / capexBudget) * 100) : null;

  // Expense coverage months = operating reserve balance / monthly operating expenses
  const agg = aggregateFromRawData();
  const monthlyOpex = agg[monthKey]?.a?.opex ?? null;
  const expCovMonths = (reserveBal != null && monthlyOpex != null && monthlyOpex > 0)
    ? Math.round((reserveBal / monthlyOpex) * 100) / 100
    : null;

  const reserves  = readReserves();
  const escrows   = readEscrows();
  const totalRes  = reserves.reduce((s, r) => s + (parseMetricNum(r.amount) || 0), 0);
  const totalEsc  = escrows.reduce((s,  e) => s + (parseMetricNum(e.amount) || 0), 0);

  return {
    noi_ltm:              noiLtm,
    noi_vs_budget:        noiVsBudget,
    dscr,
    occupancy_pct:        occupancy,
    vacancy_pct:          occupancy != null ? Math.round((100 - occupancy) * 10) / 10 : null,
    reserve_balance:      reserveBal,
    expense_coverage_months: expCovMonths,
    monthly_opex:         monthlyOpex,
    capex_pct_complete:   capexPct,
    total_lender_reserves: totalRes || null,
    total_lender_escrows:  totalEsc || null,
    noi_status:      noiStatusStr(noiVsBudget),
    dscr_status:     dscrStatusStr(dscr),
    occupancy_status:occupancyStatusStr(occupancy),
    reserve_status:  reserveStatusStr(expCovMonths),
    capex_status:    capexStatusStr(capexPct, null),
    snapshot_created_at: new Date().toISOString(),
  };
}

/* ── Find sorted month keys from snapshot store ── */
function sortedMonthKeys(snapshots) {
  return Object.keys(snapshots).sort((a, b) => {
    const MONTHS_MAP = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const parse = k => { const [y, m] = k.split('-'); return parseInt(y) * 100 + (MONTHS_MAP[m] || 0); };
    return parse(a) - parse(b);
  });
}

/* ══════════════════════════════════════════════════════
   PROPERTY SUMMARY — API ROUTES
══════════════════════════════════════════════════════ */

/* GET /api/property-summary/actuals-months
   Returns months (descending) that have at least one actual value uploaded */
app.get('/api/property-summary/actuals-months', requireAuth, (req, res) => {
  const MONTH_ORDER = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const agg = aggregateFromRawData();
  const withActuals = Object.entries(agg)
    .filter(([, v]) => Object.keys(v.a || {}).length > 0)
    .map(([k]) => k)
    .sort((a, b) => {
      const [ay, am] = a.split('-');
      const [by, bm] = b.split('-');
      const aNum = parseInt(ay) * 100 + (MONTH_ORDER[am] || 0);
      const bNum = parseInt(by) * 100 + (MONTH_ORDER[bm] || 0);
      return bNum - aNum; // descending: most recent first
    });
  res.json({ months: withActuals });
});

/* GET /api/property-summary/admin?month=2026-mar */
app.get('/api/property-summary/admin', requireAuth, (req, res) => {
  const month = req.query.month || '2026-mar';
  const setupMetrics   = readSetupMetrics();
  const allMonthly     = readMonthlyMetrics();
  let monthlyMetrics   = [...(allMonthly[month] || [])];

  // Always merge live NOI/budget data from aggregated actuals — no save required
  try {
    const agg   = aggregateFromRawData();
    const mData = agg[month];
    if (mData) {
      const now    = new Date().toISOString().slice(0, 10);
      const noiFin = mData.a && mData.a.noi != null ? mData.a.noi : null;
      const budNoi = mData.b && mData.b.noi != null ? mData.b.noi : null;
      if (noiFin != null) {
        const idxN = monthlyMetrics.findIndex(m => m.key === 'noi_ltm');
        const noiRow = { key:'noi_ltm', name:'NOI (LTM)', group:'Performance',
          value:`$${Math.round(Math.abs(noiFin)).toLocaleString()}`,
          source:'Financial Actuals', notes:'Auto-populated from uploaded actuals', lastUpdated: now };
        if (idxN >= 0) monthlyMetrics[idxN] = noiRow; else monthlyMetrics.push(noiRow);
      }
      if (noiFin != null && budNoi != null) {
        const vs    = noiFin - budNoi;
        const idx2  = monthlyMetrics.findIndex(m => m.key === 'noi_vs_budget');
        const vsRow = { key:'noi_vs_budget', name:'NOI vs Budget', group:'Performance',
          value: vs >= 0 ? `$${Math.round(vs).toLocaleString()}` : `($${Math.round(Math.abs(vs)).toLocaleString()})`,
          source:'Financial Actuals', notes:'Auto-populated from uploaded actuals', lastUpdated: now };
        if (idx2 >= 0) monthlyMetrics[idx2] = vsRow; else monthlyMetrics.push(vsRow);

        // Derive NOI status from the live variance
        const status  = noiStatusStr(vs);
        const idxSt   = monthlyMetrics.findIndex(m => m.key === 'noi_status');
        const stRow   = { key:'noi_status', name:'NOI Status', group:'Performance',
          value: status, source:'Financial Actuals', notes:'Derived from NOI vs Budget', lastUpdated: now };
        if (idxSt >= 0) monthlyMetrics[idxSt] = stRow; else monthlyMetrics.push(stRow);
      }
    }
  } catch (_) { /* no actuals data */ }

  res.json({
    setupMetrics,
    monthlyMetrics,
    sectionAssignments: readSectionAssignments(),
    reserves:  readReserves(),
    escrows:   readEscrows(),
    keyDates:  readKeyDates(),
    contacts:  readContacts(),
  });
});

/* POST /api/property-summary/admin/save */
app.post('/api/property-summary/admin/save', requireAuth, (req, res) => {
  const { month, setupMetrics, monthlyMetrics, sectionAssignments, reserves, escrows, keyDates, contacts } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  const now = new Date().toISOString().slice(0, 10);

  // Save property-level section assignments (separate from month data)
  if (sectionAssignments && typeof sectionAssignments === 'object' && !Array.isArray(sectionAssignments)) {
    writeJSON(PROP_SECTIONS_FILE, sectionAssignments);
  }

  if (Array.isArray(setupMetrics)) {
    // Strip section field — stored in PROP_SECTIONS_FILE, not per-record
    const updated = setupMetrics.map(({ section, ...m }) => ({ ...m, lastUpdated: now }));
    writeJSON(PROP_SETUP_FILE, updated);
  }

  if (Array.isArray(monthlyMetrics)) {
    const all = readMonthlyMetrics();
    // Strip section field — stored in PROP_SECTIONS_FILE, not per-month
    let processed = monthlyMetrics.map(({ section, ...m }) => ({ ...m, lastUpdated: now }));

    // Auto-compute Remaining Reserve Balance = Initial Operating Balance + Net Cash Flow
    const getMetricNum = key => {
      const m = processed.find(x => x.key === key);
      return m ? parseMetricNum(m.value) : null;
    };
    const initial  = getMetricNum('initial_op_balance');
    const netCF    = getMetricNum('net_cash_flow');
    if (initial != null && netCF != null) {
      const remaining = initial + netCF;
      const idx = processed.findIndex(m => m.key === 'remaining_reserve_bal');
      const computedRow = {
        key: 'remaining_reserve_bal', name: 'Remaining Reserve Balance',
        group: 'Operating Reserves',
        value: `$${Math.round(remaining).toLocaleString()}`,
        source: 'System', notes: 'Auto-calculated: Initial Balance + Net Cash Flow', lastUpdated: now
      };
      if (idx >= 0) processed[idx] = computedRow; else processed.push(computedRow);
    }

    // Pull NOI from aggregated actuals/budget data
    try {
      const agg = aggregateFromRawData();
      const mData = agg[month]; // key format matches: "2026-feb"
      if (mData) {
        const noiFin = mData.a && mData.a.noi != null ? mData.a.noi : null;
        const budNoi = mData.b && mData.b.noi != null ? mData.b.noi : null;
        if (noiFin != null) {
          const idxN = processed.findIndex(m => m.key === 'noi_ltm');
          const noiRow = { key:'noi_ltm', name:'NOI (LTM)', group:'Performance',
            value:`$${Math.round(Math.abs(noiFin)).toLocaleString()}`, source:'Financial Actuals',
            notes:'Auto-populated from uploaded actuals', lastUpdated: now };
          if (idxN >= 0) processed[idxN] = noiRow; else processed.push(noiRow);
        }
        if (noiFin != null && budNoi != null) {
          const vs    = noiFin - budNoi;
          const idx2  = processed.findIndex(m => m.key === 'noi_vs_budget');
          const vsRow = { key:'noi_vs_budget', name:'NOI vs Budget', group:'Performance',
            value: vs >= 0 ? `$${Math.round(vs).toLocaleString()}` : `($${Math.round(Math.abs(vs)).toLocaleString()})`,
            source:'Financial Actuals', notes:'Auto-populated from uploaded actuals', lastUpdated: now };
          if (idx2 >= 0) processed[idx2] = vsRow; else processed.push(vsRow);

          // Derive NOI status from variance
          const status  = noiStatusStr(vs);
          const idxSt   = processed.findIndex(m => m.key === 'noi_status');
          const stRow   = { key:'noi_status', name:'NOI Status', group:'Performance',
            value: status, source:'Financial Actuals', notes:'Derived from NOI vs Budget', lastUpdated: now };
          if (idxSt >= 0) processed[idxSt] = stRow; else processed.push(stRow);
        }
      }
    } catch (_) { /* no actuals data yet */ }

    all[month] = processed;
    writeJSON(PROP_MONTHLY_FILE, all);
  }

  if (Array.isArray(reserves))  writeJSON(PROP_RESERVES_FILE, reserves);
  if (Array.isArray(escrows))   writeJSON(PROP_ESCROWS_FILE,  escrows);
  if (Array.isArray(keyDates))  writeJSON(PROP_KEYDATES_FILE, keyDates);
  if (Array.isArray(contacts))  writeJSON(PROP_CONTACTS_FILE, contacts);

  if (Array.isArray(monthlyMetrics) && monthlyMetrics.length > 0) {
    const snapshots = readSnapshots();
    snapshots[month] = buildSnapshot(month);
    writeJSON(PROP_SNAPSHOTS_FILE, snapshots);
  }

  res.json({ ok: true, month });
});

/* GET /api/property-summary/viewer */
app.get('/api/property-summary/viewer', requireAuth, (req, res) => {
  const setup    = readSetupMetrics();
  const allMonthly = readMonthlyMetrics();
  const snapshots  = readSnapshots();

  const get = (src, key) => { const m = src.find(x => x.key === key); return m ? m.value : null; };
  const getMeta = (src, key) => {
    const m = src.find(x => x.key === key);
    return m ? { value: m.value, asOf: m.asOf, source: m.source, lastUpdated: m.lastUpdated } : null;
  };

  const sortedKeys   = sortedMonthKeys(snapshots);
  const latestKey    = sortedKeys[sortedKeys.length - 1] || null;
  const priorKey     = sortedKeys[sortedKeys.length - 2] || null;
  const currentSnap  = latestKey ? snapshots[latestKey]  : null;
  const priorSnap    = priorKey  ? snapshots[priorKey]   : null;

  const latestMonthly   = latestKey ? (allMonthly[latestKey]  || []) : [];
  const getLM = key => get(latestMonthly, key);
  const getLMMeta = key => getMeta(latestMonthly, key);

  const reserves = readReserves();
  const escrows  = readEscrows();

  const sumItems = items => {
    const t = items.reduce((s, i) => s + (parseMetricNum(i.amount) || 0), 0);
    if (!t) return null;
    if (t >= 1e6) return `$${(t/1e6).toFixed(2)}M`;
    if (t >= 1e3) return `$${Math.round(t/1e3)}K`;
    return `$${t}`;
  };

  // Build a live snapshot for the latest month — used by both kpi and opReserves
  const liveSnap = latestKey ? buildSnapshot(latestKey) : null;

  // Income statement (EGI / Expenses / NOI) from raw aggregated actuals vs budget
  const aggIS    = aggregateFromRawData();
  const latestIS = latestKey ? (aggIS[latestKey] || null) : null;
  const srvFmt   = n => {
    if (n == null) return null;
    const abs = Math.abs(n);
    let s;
    if      (abs >= 1e9) s = '$' + (abs/1e9).toFixed(1) + 'B';
    else if (abs >= 1e6) s = '$' + (abs/1e6).toFixed(1) + 'M';
    else if (abs >= 1e3) s = '$' + Math.round(abs/1e3)  + 'K';
    else                 s = '$' + Math.round(abs).toLocaleString();
    return n < 0 ? `(${s})` : s;
  };
  const aEgi  = latestIS?.a?.egi  != null ? Math.abs(latestIS.a.egi)  : null;
  const bEgi  = latestIS?.b?.egi  != null ? Math.abs(latestIS.b.egi)  : null;
  const aOpex = latestIS?.a?.opex != null ? Math.abs(latestIS.a.opex) : null;
  const bOpex = latestIS?.b?.opex != null ? Math.abs(latestIS.b.opex) : null;
  const aNoi  = latestIS?.a?.noi  != null ? latestIS.a.noi  : null;
  const bNoi  = latestIS?.b?.noi  != null ? latestIS.b.noi  : null;

  const egiVsN   = (aEgi  != null && bEgi  != null) ? aEgi  - bEgi  : null;  // +good
  const opexVsN  = (aOpex != null && bOpex != null) ? aOpex - bOpex : null;  // +bad (over budget)
  const noiVsN   = (aNoi  != null && bNoi  != null) ? aNoi  - bNoi  : null;  // +good

  const egiStatus  = aEgi  == null ? 'nodata' : egiVsN  == null ? 'nodata' : egiVsN  >= 0 ? 'healthy' : (bEgi  > 0 && Math.abs(egiVsN) /bEgi  < 0.05) ? 'watch' : 'issue';
  const opexStatus = aOpex == null ? 'nodata' : opexVsN == null ? 'nodata' : opexVsN <= 0 ? 'healthy' : (bOpex > 0 && opexVsN /bOpex < 0.05) ? 'watch' : 'issue';
  const noiISStatus= aNoi  == null ? 'nodata' : noiVsN  == null ? 'nodata' : noiVsN  >= 0 ? 'healthy' : 'issue';

  // Economic Vacancy = 1 - (TRR / GPR)  where TRR = trr, GPR = pri
  const aPri   = latestIS?.a?.pri != null ? Math.abs(latestIS.a.pri) : null;
  const aTrr   = latestIS?.a?.trr != null ? Math.abs(latestIS.a.trr) : null;
  const evPct  = (aTrr != null && aPri != null && aPri > 0)
    ? Math.round((1 - aTrr / aPri) * 1000) / 10   // one decimal place
    : null;
  const evStatus = evPct == null ? 'nodata' : evPct < 5 ? 'healthy' : evPct < 10 ? 'watch' : 'issue';

  res.json({
    property: {
      name:            get(setup, 'property_name'),
      address:         get(setup, 'address'),
      units:           get(setup, 'unit_count'),
      yearBuilt:       get(setup, 'year_built'),
      acquisitionDate: get(setup, 'acquisition_date'),
      purchasePrice:   get(setup, 'purchase_price'),
      totalCap:        get(setup, 'total_cap'),
      updatedAt:       latestKey,
    },
    loan: {
      amount:       get(setup, 'loan_amount'),
      ltv:          get(setup, 'ltv'),
      lender:       get(setup, 'lender'),
      rate:         get(setup, 'interest_rate'),
      term:         get(setup, 'term'),
      ioPeriod:     get(setup, 'io_period'),
      ioRemaining:  get(setup, 'io_remaining_mo'),
      prepayPenalty:get(setup, 'prepay_penalty'),
      maturityDate: get(setup, 'maturity_date'),
      dscrCovenant: get(setup, 'dscr_covenant'),
      dscr:         currentSnap?.dscr ?? null,
      dscrPrev:     priorSnap?.dscr   ?? null,
      asOf:         getLMMeta('dscr')?.asOf    || null,
      source:       getLMMeta('dscr')?.source  || null,
    },
    investment: {
      initialEquity:               get(setup, 'initial_equity'),
      capitalReturned:             getLM('capital_returned'),
      preferredReturn:             get(setup, 'preferred_return'),
      currentDistribAnnualized:    getLM('current_distrib_ann_usd'),
      currentDistribAnnualizedPct: getLM('current_distrib_ann_pct'),
      cumPrefShortfall:            getLM('cum_pref_shortfall'),
      itdDistribPaid:              getLM('itd_distrib_paid_usd'),
      itdDistribPaidPct:           getLM('itd_distrib_paid_pct'),
      asOf:   getLMMeta('capital_returned')?.asOf   || null,
      source: getLMMeta('capital_returned')?.source || null,
    },
    opReserves: {
      initialBalance:    getLM('initial_op_balance'),
      netCashFlowToDate: getLM('net_cash_flow'),
      remainingBalance:  getLM('remaining_reserve_bal'),
      monthsOfCoverage:  liveSnap?.expense_coverage_months  ?? currentSnap?.expense_coverage_months ?? null,
      monthsOfCoveragePrev: priorSnap?.expense_coverage_months ?? null,
      monthlyOpex:       liveSnap?.monthly_opex ?? null,
      targetMonths:      4.0,
      asOf:   getLMMeta('remaining_reserve_bal')?.asOf   || null,
      source: getLMMeta('remaining_reserve_bal')?.source || null,
    },
    lenderReserves: {
      items: reserves,
      total: sumItems(reserves),
      asOf:   getLMMeta('remaining_reserve_bal')?.asOf   || null,
      source: getLMMeta('remaining_reserve_bal')?.source || null,
    },
    lenderEscrows: {
      items: escrows,
      total: sumItems(escrows),
      asOf:   getLMMeta('remaining_reserve_bal')?.asOf   || null,
      source: getLMMeta('remaining_reserve_bal')?.source || null,
    },
    capex: {
      budget:          get(setup, 'capex_budget'),
      spendToDate:     getLM('capex_spend'),
      pctComplete:     currentSnap?.capex_pct_complete  ?? null,
      pctCompletePrev: priorSnap?.capex_pct_complete    ?? null,
      targetCompletion:getLM('target_completion_date'),
      asOf:   getLMMeta('capex_spend')?.asOf   || null,
      source: getLMMeta('capex_spend')?.source || null,
    },
    noi: {
      current:    getLM('noi_ltm'),
      vsBudget:   getLM('noi_vs_budget'),
      favorable:  (() => { const v = parseMetricNum(getLM('noi_vs_budget')); return v != null ? v >= 0 : true; })(),
      asOf:   getLMMeta('noi_ltm')?.asOf   || null,
      source: getLMMeta('noi_ltm')?.source || null,
    },
    incomeStatement: {
      egi:              srvFmt(aEgi),
      egiVsBudget:      egiVsN,
      egiStatus,
      opex:             srvFmt(aOpex),
      opexVsBudget:     opexVsN,
      opexStatus,
      noi:              srvFmt(aNoi != null ? Math.abs(aNoi) : null),
      noiVsBudget:      noiVsN,
      noiStatus:        noiISStatus,
      econVacancyPct:   evPct,
      econVacancyStatus:evStatus,
      econVacancyTrr:   aTrr,
      econVacancyGpr:   aPri,
      hasData:          aEgi != null || aOpex != null || aNoi != null,
    },
    kpi: {
      occupancy:      liveSnap?.occupancy_pct           ?? currentSnap?.occupancy_pct     ?? null,
      occupancyPrev:  priorSnap?.occupancy_pct          ?? null,
      dscr:           liveSnap?.dscr                    ?? currentSnap?.dscr              ?? null,
      dscrPrev:       priorSnap?.dscr                   ?? null,
      reserveMos:     liveSnap?.expense_coverage_months ?? currentSnap?.expense_coverage_months ?? null,
      reserveMosPrev: priorSnap?.expense_coverage_months ?? null,
      capexPct:       liveSnap?.capex_pct_complete      ?? currentSnap?.capex_pct_complete ?? null,
      capexPctPrev:   priorSnap?.capex_pct_complete     ?? null,
      noiStatus:      liveSnap?.noi_status              ?? null,
      dscrStatus:     liveSnap?.dscr_status             ?? null,
      occupancyStatus:liveSnap?.occupancy_status        ?? null,
      reserveStatus:  liveSnap?.reserve_status          ?? null,
      capexStatus:    liveSnap?.capex_status            ?? null,
      latestMonth:    latestKey,
    },
    keyDates: readKeyDates(),
    contacts: readContacts(),
  });
});

/* ── STATIC ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── START ── */
initUsers().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Regatta Dashboard running on port ${PORT}`);
  });
});
