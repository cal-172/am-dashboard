# Regatta Financial Dashboard (T12 Summary vs Budget)

## Overview
A Node.js/Express web app serving an interactive financial dashboard for the Regatta (1163_rr) property. Features session-based login, an admin panel for uploading RealPage Excel files, and a live dashboard powered by stored financial data.

## Tech Stack
- **Runtime**: Node.js 20 / Express 4
- **Authentication**: Session-based (`express-session`), credentials stored in env vars
- **File Upload**: `multer` (in-memory buffer)
- **Excel Parsing**: `xlsx` package — parses RealPage T12 Summary exports
- **Data Storage**: JSON file (`data/financial.json`)
- **Frontend**: Vanilla HTML5/CSS3/JavaScript (no framework)

## Project Structure
```
server.js              # Express app — auth, API routes, Excel parser
package.json           # npm dependencies
data/
  financial.json       # Stored financial data (months: {jan, feb, ...})
public/
  login.html           # Login page
  admin.html           # Admin panel (Excel upload + JSON editor)
  dashboard.html       # Main financial dashboard (fetches from /api/data)
```

## Routes
| Route | Access | Description |
|---|---|---|
| `GET /` | Auth required | Financial dashboard |
| `GET /login` | Public | Login page |
| `POST /login` | Public | Authenticate with ADMIN_USER/ADMIN_PASS |
| `POST /logout` | Auth required | Destroy session |
| `GET /admin` | Auth required | Admin panel |
| `GET /api/data` | Auth required | Get stored financial data (JSON) |
| `POST /api/data` | Auth required | Save financial data |
| `POST /api/upload` | Auth required | Parse RealPage Excel file |
| `POST /api/save-parsed` | Auth required | Merge parsed months into stored data |
| `DELETE /api/data/month/:m` | Auth required | Delete a month's data |

## Environment Variables
| Key | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Dashboard login username |
| `ADMIN_PASS` | `regatta2026` | Dashboard login password |
| `SESSION_SECRET` | fallback string | Express session secret |

## Data Model
Each month has `a` (actual) and `b` (budget) objects with these keys:
`pri, ltl, vac, mod, con, bd, trr, oi, ur, toi, egi, payroll, adv, ga, util, rm, contract, mgmt, mr, taxes, ins, opex, noi, amfee, debt, capex, ncf`

Derived fields (computed at runtime): `tdf, cfd, btl, netinc, phyvac, ecovac, expr, propval`

## Running the App
The "Start application" workflow runs `node server.js` on port 5000.

## Deployment
Configured as autoscale deployment.
