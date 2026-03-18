# Regatta Financial Dashboard (T12 Summary vs Budget)

## Overview
A static financial dashboard for the Regatta (1163_rr) property. Displays a Trailing 12 Months (T12) summary compared against budget, covering Net Operating Income (NOI), Effective Gross Income (EGI), and Cap Rate valuation metrics.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) — single file `t12_dashboard.html`
- **Server**: Python 3 built-in HTTP server (`server.py`) — serves on port 5000
- **Data**: Hardcoded in the HTML file as a JavaScript object (`RAW`)
- **State**: Browser `localStorage` for persisting Cap Rate and Units settings

## Project Structure
```
t12_dashboard.html   # Main dashboard application (all-in-one HTML/CSS/JS)
server.py            # Python HTTP server, redirects / → t12_dashboard.html
```

## Running the App
The "Start application" workflow runs `python3 server.py` on port 5000.

## Deployment
Configured as a **static** deployment with `publicDir: "."`.

## Features
- Month selector (Jan/Feb 2026 etc.)
- Amount vs Per Unit view toggle
- Adjustable Cap Rate and Units inputs
- Color-coded variance analysis (red/yellow/green)
- Data sourced from RealPage on accrual basis
