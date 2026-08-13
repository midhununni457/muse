import React, { useState } from 'react';
import Navbar from './components/Navbar';
import IdentifyView from './components/IdentifyView';
import LibraryView from './components/LibraryView';

export default function App() {
  const [activeTab, setActiveTab] = useState('identify');

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'identify' ? (
          <IdentifyView />
        ) : (
          <LibraryView />
        )}
      </main>

      <footer style={{ marginTop: '40px', padding: '20px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.82rem', borderTop: '1px solid var(--border-glass)' }}>
        <p>Muse Audio Recognition & Fingerprinting Service &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
