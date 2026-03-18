const express = require('express');
const session = require('express-session');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data', 'financial.json');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'regatta2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'regatta-dashboard-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.redirect('/login');
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { property: 'Regatta — 1163_rr', year: 2026, months: {}, updatedAt: new Date().toISOString() };
  }
}

function writeData(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ── AUTH ROUTES ── */
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

/* ── DASHBOARD ── */
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

/* ── ADMIN ── */
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ── API: get financial data ── */
app.get('/api/data', requireAuth, (req, res) => {
  res.json(readData());
});

/* ── API: save edited data ── */
app.post('/api/data', requireAuth, (req, res) => {
  try {
    const current = readData();
    const incoming = req.body;
    if (incoming.months) current.months = incoming.months;
    if (incoming.property) current.property = incoming.property;
    if (incoming.year) current.year = incoming.year;
    writeData(current);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: parse Excel upload ── */
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const result = parseRealPageWorkbook(workbook);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Parse error: ' + e.message });
  }
});

/* ── API: save parsed data from upload ── */
app.post('/api/save-parsed', requireAuth, (req, res) => {
  try {
    const { months, property, year } = req.body;
    const current = readData();
    if (months) {
      Object.assign(current.months, months);
    }
    if (property) current.property = property;
    if (year) current.year = parseInt(year);
    writeData(current);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── API: delete a month ── */
app.delete('/api/data/month/:month', requireAuth, (req, res) => {
  try {
    const data = readData();
    delete data.months[req.params.month];
    writeData(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ══════════════════════════════════════════════════════
   REALPAGE EXCEL PARSER
══════════════════════════════════════════════════════ */
const ALL_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_NAMES = {
  january:'jan', february:'feb', march:'mar', april:'apr', may:'may', june:'jun',
  july:'jul', august:'aug', september:'sep', october:'oct', november:'nov', december:'dec',
  jan:'jan', feb:'feb', mar:'mar', apr:'apr', jun:'jun', jul:'jul',
  aug:'aug', sep:'sep', oct:'oct', nov:'nov', dec:'dec'
};

const ROW_PATTERNS = [
  { key:'pri',      patterns:['potential rental income','scheduled rent','gross potential rent','market rent'] },
  { key:'ltl',      patterns:['loss to lease','loss-to-lease'] },
  { key:'vac',      patterns:['vacancy loss','vacancy','physical vacancy loss'] },
  { key:'mod',      patterns:['model','admin','model/admin','model / admin'] },
  { key:'con',      patterns:['concession','concessions'] },
  { key:'bd',       patterns:['bad debt','bad debts'] },
  { key:'trr',      patterns:['total rental revenue','gross rental revenue','net rental revenue'] },
  { key:'oi',       patterns:['other income','miscellaneous income','other revenues'] },
  { key:'ur',       patterns:['utility reimbursement','utility reimbursements','utility income','rubs'] },
  { key:'toi',      patterns:['total other income','other income total'] },
  { key:'egi',      patterns:['effective gross income','effective gross revenue','total revenue','total income'] },
  { key:'payroll',  patterns:['payroll','salaries','wages','payroll & benefits','labor'] },
  { key:'adv',      patterns:['advertising','marketing','advertising & marketing','advertising and marketing'] },
  { key:'ga',       patterns:['general & administrative','general and administrative','g&a','admin expenses'] },
  { key:'util',     patterns:['utilities','utility expense','utility expenses'] },
  { key:'rm',       patterns:['repairs & maintenance','repairs and maintenance','r&m','maintenance'] },
  { key:'contract', patterns:['contract services','contract','contracted services'] },
  { key:'mgmt',     patterns:['management fee','management fees','property management fee'] },
  { key:'mr',       patterns:['make ready','make-ready','unit turns','turnover'] },
  { key:'taxes',    patterns:['taxes','real estate taxes','property taxes','real estate tax'] },
  { key:'ins',      patterns:['insurance'] },
  { key:'opex',     patterns:['total operating expenses','total expenses','operating expenses total'] },
  { key:'noi',      patterns:['net operating income','noi'] },
  { key:'amfee',    patterns:['asset management fee','asset mgmt fee','am fee'] },
  { key:'debt',     patterns:['debt service','mortgage','loan payment','principal & interest','interest expense'] },
  { key:'capex',    patterns:['capital expenditures','capex','capital improvements','capital expenses'] },
  { key:'ncf',      patterns:['net cash flow','net income','cash flow'] },
];

function matchKey(label) {
  const clean = label.toLowerCase().replace(/[^a-z0-9& ]/g, '').trim();
  for (const { key, patterns } of ROW_PATTERNS) {
    for (const p of patterns) {
      if (clean === p || clean.includes(p) || p.includes(clean)) return key;
    }
  }
  return null;
}

function cellNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$()%]/g, '').trim());
  if (isNaN(n)) return 0;
  if (String(val).includes('(') || (typeof val === 'string' && val.trim().startsWith('('))) return -Math.abs(n);
  return n;
}

function parseRealPageWorkbook(workbook) {
  const results = { months: {}, warnings: [], unmapped: [], sheetName: '' };

  let sheet = null;
  let sheetName = '';

  const preferred = workbook.SheetNames.find(n =>
    /t12|summary|budget|income|financial/i.test(n)
  );
  sheetName = preferred || workbook.SheetNames[0];
  sheet = workbook.Sheets[sheetName];
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

  const colMonths = [];
  let headerRow = -1;

  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const monthCount = rows[r].filter(v => {
      if (!v) return false;
      const s = String(v).toLowerCase();
      return Object.keys(MONTH_NAMES).some(m => s.startsWith(m));
    }).length;
    if (monthCount >= 2) { headerRow = r; break; }
  }

  if (headerRow >= 0) {
    const hdr = rows[headerRow];
    let lastMonth = null;
    for (let c = 0; c < hdr.length; c++) {
      const v = String(hdr[c] || '').toLowerCase().trim();
      const monthKey = Object.keys(MONTH_NAMES).find(m => v.startsWith(m));
      if (monthKey) {
        lastMonth = MONTH_NAMES[monthKey];
        colMonths.push({ col: c, month: lastMonth, type: 'actual' });
      } else if (lastMonth && /budget/i.test(v)) {
        colMonths.push({ col: c, month: lastMonth, type: 'budget' });
      } else if (lastMonth && /actual/i.test(v)) {
        colMonths[colMonths.length - 1] = { col: c, month: lastMonth, type: 'actual' };
      } else if (lastMonth && /variance|delta/i.test(v)) {
        // skip variance columns
      }
    }
  }

  if (colMonths.length === 0) {
    results.warnings.push('Could not detect month columns automatically. Please verify the Excel format.');
    return results;
  }

  const monthCols = {};
  for (const { col, month, type } of colMonths) {
    if (!monthCols[month]) monthCols[month] = {};
    monthCols[month][type] = col;
  }

  const labelCol = 0;
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const label = String(row[labelCol] || '').trim();
    if (!label) continue;

    const key = matchKey(label);
    if (!key) {
      if (label.length > 2 && !/^-+$/.test(label)) {
        results.unmapped.push(label);
      }
      continue;
    }

    for (const [month, cols] of Object.entries(monthCols)) {
      if (!results.months[month]) {
        results.months[month] = { a: {}, b: {} };
      }
      if (cols.actual !== undefined) {
        results.months[month].a[key] = cellNum(row[cols.actual]);
      }
      if (cols.budget !== undefined) {
        results.months[month].b[key] = cellNum(row[cols.budget]);
      }
    }
  }

  if (Object.keys(results.months).length === 0) {
    results.warnings.push('No monthly data could be extracted. The file may use an unsupported layout.');
  }

  return results;
}

/* ── STATIC ── */
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Regatta Dashboard running on port ${PORT}`);
});
