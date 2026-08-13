import React, { useState } from 'react';
import Navbar from './components/Navbar';
import IdentifyView from './components/IdentifyView';
import LibraryView from './components/LibraryView';

export default function App() {
  const [activeTab, setActiveTab] = useState('identify');

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 flex flex-col min-h-screen">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'identify' ? (
          <IdentifyView />
        ) : (
          <LibraryView />
        )}
      </main>

      <footer className="mt-10 py-5 text-center text-slate-500 text-xs border-t border-white/10">
        <p>Muse Audio Recognition & Fingerprinting Service &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
