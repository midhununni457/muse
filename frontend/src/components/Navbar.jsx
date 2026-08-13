import React from 'react';
import { Disc3, Radio, Library } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
          }}>
            <Disc3 size={24} color="#ffffff" className="animate-spin-slow" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>
              Muse<span style={{ color: '#06b6d4' }}>.</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audio Fingerprinting Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <button
            onClick={() => setActiveTab('identify')}
            className={`btn ${activeTab === 'identify' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Radio size={18} />
            <span>Identify Song</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`btn ${activeTab === 'library' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Library size={18} />
            <span>Song Library</span>
          </button>
        </nav>

      </div>
    </header>
  );
}
