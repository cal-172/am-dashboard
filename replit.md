# Regatta Financial Dashboard (T12 Summary vs Budget)

## Overview
A Node.js/Express web app serving an interactive financial dashboard for the Regatta (1163_rr) property. Features session-based login with role-based access, a full admin panel for managing file uploads and users, and a live dashboard powered by stored financial data.

## Tech Stack
- **Runtime**: Node.js 20 / Express 4
- **Authentication**: Session-based (`express-session`), bcrypt password hashing
- **File Upload**: `multer` (in-memory), `xlsx` for Excel parsing
- **Data Storage**: JSON files in `data/`

## Project Structure
```
server.js              # Express app — auth, API routes, Excel parser, mapping engine
package.json
data/
  financial.json       # Stored financial data (months: {jan, feb, ...})
  users.json           # User accounts (email, passwordHash, role)
  uploads.json         # Upload history log
  mappings.json        # Persistent admin-confirmed field mapping rules
public/
  login.html           # Login page (email + password)
  admin.html           # Admin panel (sidebar: File Uploads + User Permissions)
  dashboard.html       # Main financial dashboard (fetches /api/data + /api/me)
```

## Routes
| Route | Access | Description |
|---|---|---|
| `GET /` | Auth required (any role) | Financial dashboard |
| `GET /login` | Public | Login page |
| `POST /login` | Public | Authenticate via users.json |
| `POST /logout` | Auth required | Destroy session |
| `GET /admin` | Admin only | Admin panel |
| `GET /api/me` | Auth required | Current user info |
| `GET /api/data` | Auth required | Get financial data |
| `POST /api/data` | Admin only | Save financial data |
| `DELETE /api/data/month/:m` | Admin only | Delete a month |
| `POST /api/upload/parse` | Admin only | Parse Excel; returns all rows with confidence + reconciliation |
| `POST /api/upload/commit` | Admin only | Save corrected months + log upload |
| `GET /api/uploads` | Admin only | Upload history |
| `DELETE /api/uploads/:id` | Admin only | Remove upload history entry |
| `GET /api/mappings` | Admin only | Get all saved mapping rules |
| `POST /api/mappings/bulk` | Admin only | Save/update batch of mapping rules |
| `DELETE /api/mappings/:id` | Admin only | Delete a mapping rule |
| `GET /api/users` | Admin only | List users |
| `POST /api/users` | Admin only | Create user |
| `PUT /api/users/:id` | Admin only | Update user |
| `DELETE /api/users/:id` | Admin only | Delete user |

## User Roles
| Role | Dashboard | Admin Panel | Upload Files | Manage Users |
|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Viewer | ✓ | ✗ | ✗ | ✗ |

## File Upload Types
| Type | Description | Updates |
|---|---|---|
| T12 Actuals | RealPage trailing 12-month actual data | `a` (actual) fields |
| Budget | Annual budget by month | `b` (budget) fields |
| T12 vs Budget | Combined file with both Actual & Budget columns | both `a` and `b` fields |

## Environment Variables
| Key | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Initial admin email (used on first boot only) |
| `ADMIN_PASS` | `regatta2026` | Initial admin password (used on first boot only) |
| `SESSION_SECRET` | fallback string | Express session secret |

## Data Model
Each month has `a` (actual) and `b` (budget) objects with keys:
`pri, ltl, vac, mod, con, bd, trr, oi, ur, toi, egi, payroll, adv, ga, util, rm, contract, mgmt, mr, taxes, ins, opex, noi, amfee, debt, capex, ncf`

Derived at runtime: `tdf, cfd, btl, netinc, phyvac, ecovac, expr, propval`

## Upload & Mapping Workflow
**New 5-step upload flow:**
1. Select file type (T12 / Budget / T12 vs Budget)
2. Upload file (drag-drop or browse)
3. **Mapping Review** — all parsed source rows shown with confidence badges, editable dropdowns, reconciliation warnings
4. Select months to save (auto-deselects zero-value months)
5. Preview data → Save to Dashboard

**Mapping confidence levels:**
- `saved` (blue star) — matches a user-confirmed rule from `mappings.json`
- `exact` (green check) — exact match to a `ROW_PATTERNS` pattern
- `pattern` (yellow lightning) — label contains a pattern substring
- `unmapped` (red X) — no match found; row appears in table for manual assignment

**Reconciliation checks run automatically:**
- Income: TRR + TOI should ≈ EGI
- Expenses: detail sum should ≈ OPEX
- Below-line: EGI − OPEX should ≈ NOI

**Saved mappings** persist in `data/mappings.json` and are applied on all future uploads. Only user-edited assignments (not auto-pattern matches) are saved as rules.
