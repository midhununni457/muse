import React, { useState, useEffect } from 'react';
import { Plus, Music, Trash2, Cpu, CheckCircle, AlertCircle, RefreshCw, Upload, Calendar } from 'lucide-react';

export default function LibraryView() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [processingIds, setProcessingIds] = useState({});

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) throw new Error('Failed to fetch song library');
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to API server or load songs.');
    } finally {
      setLoading(false);
    }
  };

  // Upload Song and automatically process
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !artist || !audioFile) {
      alert('Please fill out all fields and select an audio file.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading audio file...');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('audio', audioFile);

    try {
      // 1. Upload Song
      const res = await fetch('/api/songs', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload song');
      }

      const newSong = await res.json();

      // 2. Trigger Fingerprint Processing
      setUploadStatus('Processing audio fingerprints with DSP engine...');
      await triggerProcessing(newSong.id);

      // Reset form & reload list
      setTitle('');
      setArtist('');
      setAudioFile(null);
      setUploadStatus('');
      await fetchSongs();
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  // Trigger processing for a specific song ID
  const triggerProcessing = async (songId) => {
    setProcessingIds((prev) => ({ ...prev, [songId]: true }));
    try {
      const res = await fetch(`/api/songs/${songId}/process`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process song');
      }
      await fetchSongs();
    } catch (err) {
      console.error(`Processing error for song ${songId}:`, err);
      alert(`Processing error: ${err.message}`);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [songId]: false }));
    }
  };

  // Delete Song
  const handleDelete = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song and its fingerprints?')) {
      return;
    }

    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete song');
      setSongs((prev) => prev.filter((s) => s.id !== songId));
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Could not delete song.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upload New Song Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} color="var(--primary)" />
          <span>Ingest New Song into Library</span>
        </h3>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Song Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bohemian Rhapsody"
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Artist Name
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Queen"
                required
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Full Track Audio File (.mp3, .wav, .flac)
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0] || null)}
              required
              className="input-field"
              style={{ padding: '8px' }}
            />
          </div>

          {uploadStatus && (
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', marginTop: '8px' }}
          >
            <Upload size={18} />
            <span>{isUploading ? 'Ingesting Song...' : 'Upload & Process Song'}</span>
          </button>
        </form>
      </div>

      {/* Song Library List Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Library Tracks ({songs.length})</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage ingested songs available for pattern recognition</p>
          </div>

          <button onClick={fetchSongs} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <p>Loading song library...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : songs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Music size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600 }}>Your song library is empty.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Upload a song above to start building your recognition database.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {songs.map((song) => {
              const isProcessing = processingIds[song.id];
              return (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-glass)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '200px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <Music size={22} />
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{song.title}</h4>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{song.artist}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                        <Calendar size={12} />
                        <span>Added {new Date(song.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    
                    <button
                      onClick={() => triggerProcessing(song.id)}
                      disabled={isProcessing}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                      title="Re-process audio fingerprints"
                    >
                      <Cpu size={14} className={isProcessing ? 'animate-spin' : ''} />
                      <span>{isProcessing ? 'Processing...' : 'Re-process'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(song.id)}
                      className="btn btn-danger"
                      style={{ padding: '8px' }}
                      title="Delete song"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
