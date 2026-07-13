'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Settings, Cpu, ChevronRight, Activity, Search } from 'lucide-react';

export default function HomePage() {
  const [token, setToken] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      router.push(`/track/${token.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-slate-900 font-outfit">RepairFlow</span>
            <span className="text-[10px] block text-slate-500 uppercase tracking-widest font-mono">Platform</span>
          </div>
        </div>
        <div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg hover-slide"
          >
            Staff Portal
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-grow flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 mb-6">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          Live Repair Tracking System
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 font-outfit max-w-3xl leading-tight">
          Track Every Device, Repair & Customer <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">From Intake to Delivery</span>
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-xl">
          Enter your secure tracking code below to view real-time diagnosis details, approve repair estimates, and view invoice receipts.
        </p>

        {/* Tracking Input */}
        <form onSubmit={handleTrack} className="mt-8 w-full max-w-md">
          <div className="relative flex items-center bg-white rounded-xl shadow-premium border border-slate-200 p-2">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="Paste your secure tracking token here..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder-slate-400 focus:outline-none text-sm"
              required
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-3 rounded-lg hover-slide"
            >
              Track
            </button>
          </div>
        </form>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left hover-slide">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 font-outfit">Secure Access</h3>
            <p className="text-xs text-slate-500 mt-2">
              Authentication-free tracking using military-grade secure expiring access token links.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left hover-slide">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 font-outfit">Live Updates</h3>
            <p className="text-xs text-slate-500 mt-2">
              See live technician workbench statuses from intake diagnosis to ready for pickup.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left hover-slide">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center mb-4">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 font-outfit">One-Click Approval</h3>
            <p className="text-xs text-slate-500 mt-2">
              Approve or reject diagnostic item estimates directly from your dashboard.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} RepairFlow. All rights reserved.
      </footer>
    </div>
  );
}
