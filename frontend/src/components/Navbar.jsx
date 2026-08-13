import React from 'react';
import { Disc3, Radio, Library } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="glass-panel p-4 md:px-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Disc3 size={24} className="text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">
              Muse<span className="text-cyan-400">.</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Audio Fingerprinting Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('identify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'identify'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={18} />
            <span>Identify Song</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Library size={18} />
            <span>Song Library</span>
          </button>
        </nav>

      </div>
    </header>
  );
}
