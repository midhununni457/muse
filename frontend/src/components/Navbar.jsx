import React from 'react';
import { AudioWaveform, Disc, Sliders, Radio, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="chassis-panel rounded-2xl p-4 md:px-6 mb-8 relative">
      {/* Decorative Hardware Corner Rivets */}
      <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700/80 shadow-inner" />
      <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700/80 shadow-inner" />
      <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700/80 shadow-inner" />
      <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700/80 shadow-inner" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand / Studio Console Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/50 flex items-center justify-center shadow-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <AudioWaveform size={22} className="text-orange-500 transition-transform group-hover:scale-110" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white uppercase">
                Muse
              </span>
              <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 tracking-wider uppercase">
              Audio Recognition Engine
            </p>
          </div>
        </div>

        {/* Live System Telemetry Status (Studio Rack Lights) */}
        <div className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-xl chassis-bay font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 led-glow-emerald animate-pulse" />
            <span className="text-zinc-400">ENGINE:</span>
            <span className="text-emerald-400 font-medium">READY</span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>AUDIO:</span>
            <span className="text-zinc-200">44.1 kHz</span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>DATABASE:</span>
            <span className="text-emerald-400 font-semibold">CONNECTED</span>
          </div>
        </div>

        {/* Tactile Hardware Mode Switcher */}
        <nav className="flex p-1 rounded-xl chassis-bay border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('identify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'identify'
                ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20 border-t border-orange-400/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Radio size={14} className={activeTab === 'identify' ? 'animate-pulse' : ''} />
            <span>Identify</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20 border-t border-orange-400/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Database size={14} />
            <span>Library</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
