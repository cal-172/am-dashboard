import React from 'react';
import { MapPin, Home, DollarSign, Calendar, AlertCircle, TrendingUp } from 'lucide-react';

export function PropertySummary() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Regatta — 1163_rr</h1>
          <p className="text-slate-600 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Dallas, TX
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Property & Loan Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Property Overview Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" /> Property Details
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Units</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">200</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Unit Type</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">Apartments</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Built</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">1985</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Acquisition Date</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">Jan 2020</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Current Occupancy</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">94.5%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">NOI (LTM)</p>
                  <p className="text-lg font-bold text-green-600 mt-1">$3.2M</p>
                </div>
              </div>
            </div>

            {/* Loan Details Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" /> Loan Information
              </h2>
              <div className="space-y-6">
                <div className="pb-6 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Lender</p>
                  <p className="text-lg font-semibold text-slate-900">Metropolitan Bank</p>
                </div>
                <div className="grid grid-cols-3 gap-6 pb-6 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Original Balance</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">$28.5M</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Current Balance</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">$24.2M</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">LTV</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">65%</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 pb-6 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Interest Rate</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">4.25%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Loan Term</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">10 years</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Amortization</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">25 years</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Maturity Date</p>
                  <p className="text-lg font-bold text-slate-900">January 2030</p>
                  <p className="text-xs text-slate-500 mt-2">5 years, 9 months remaining</p>
                </div>
              </div>
            </div>

            {/* CAPEX Schedule */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" /> CAPEX Schedule
              </h2>
              <div className="space-y-4">
                {[
                  { year: 2026, item: 'Roof replacement', amount: '$450K' },
                  { year: 2026, item: 'Unit renovations (Phase 1)', amount: '$280K' },
                  { year: 2027, item: 'HVAC system upgrade', amount: '$320K' },
                  { year: 2027, item: 'Common area renovation', amount: '$200K' },
                  { year: 2028, item: 'Parking lot reseal', amount: '$85K' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">{item.item}</p>
                      <p className="text-sm text-slate-500 mt-1">Year {item.year}</p>
                    </div>
                    <p className="font-bold text-slate-900">{item.amount}</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-200 mt-4">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total 5-Year CAPEX</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">$1.335M</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Key Dates & Reserves */}
          <div className="space-y-8">
            
            {/* Key Dates Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" /> Key Dates
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Loan Maturity', value: 'Jan 15, 2030', status: 'upcoming' },
                  { label: 'Annual Review', value: 'Mar 30, 2026', status: 'upcoming' },
                  { label: 'Rate Lock Expires', value: 'May 1, 2026', status: 'upcoming' },
                  { label: 'Insurance Renewal', value: 'Aug 1, 2026', status: 'upcoming' },
                  { label: 'Tax Assessment Due', value: 'Jun 15, 2026', status: 'upcoming' },
                ].map((date, idx) => (
                  <div key={idx} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{date.label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{date.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reserves Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-600" /> Reserves & Accounts
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-600">Replacement Reserve</p>
                    <p className="text-sm font-bold text-slate-900">$680K</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">$1M target</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-600">Operating Reserve</p>
                    <p className="text-sm font-bold text-slate-900">$420K</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">$500K target</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-600">Capital Improvement</p>
                    <p className="text-sm font-bold text-slate-900">$245K</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '49%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">$500K target</p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-600 mb-3">Total Reserves</p>
                  <p className="text-3xl font-bold text-slate-900">$1.345M</p>
                </div>
              </div>
            </div>

            {/* Property Value Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
              <p className="text-sm font-medium text-blue-900 uppercase tracking-wide">Cap Rate Valuation</p>
              <p className="text-3xl font-bold text-blue-900 mt-3">$44.2M</p>
              <p className="text-xs text-blue-700 mt-3">@ 7.2% cap rate (LTM NOI: $3.2M)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
