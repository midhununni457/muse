import React, { useState } from 'react';
import Navbar from './components/Navbar';
import IdentifyView from './components/IdentifyView';
import LibraryView from './components/LibraryView';

export default function App() {
  const [activeTab, setActiveTab] = useState('identify');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col min-h-screen">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'identify' ? (
          <IdentifyView />
        ) : (
          <LibraryView />
        )}
      </main>

      <footer className="mt-14 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span>MUSE DSP ENGINE // SYSTEM ARCHITECTURE</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-600">
          <span>FAST FOURIER TRANSFORM</span>
          <span>•</span>
          <span>LANDMARK PAIR HASHING</span>
          <span>•</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
