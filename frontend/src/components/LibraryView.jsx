import React, { useState, useEffect } from 'react';
import { Plus, Music, Trash2, Cpu, AlertCircle, RefreshCw, Upload, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
      const res = await fetch(`${API_BASE}/songs`);
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
      const res = await fetch(`${API_BASE}/songs`, {
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

  const triggerProcessing = async (songId) => {
    setProcessingIds((prev) => ({ ...prev, [songId]: true }));
    try {
      const res = await fetch(`${API_BASE}/songs/${songId}/process`, {
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

  const handleDelete = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song and its fingerprints?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/songs/${songId}`, {
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
    <div className="flex flex-col gap-6">
      
      {/* Upload Song Card */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-violet-400" />
          <span>Ingest New Song into Library</span>
        </h3>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Song Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bohemian Rhapsody"
                required
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Artist Name
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Queen"
                required
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Full Track Audio File (.mp3, .wav, .flac)
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0] || null)}
              required
              className="w-full p-2 bg-slate-950/80 border border-white/10 rounded-xl text-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
            />
          </div>

          {uploadStatus && (
            <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium">
              <RefreshCw size={16} className="animate-spin" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="self-start mt-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={18} />
            <span>{isUploading ? 'Ingesting Song...' : 'Upload & Process Song'}</span>
          </button>
        </form>
      </div>

      {/* Library Song List */}
      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Library Tracks ({songs.length})</h3>
            <p className="text-xs text-slate-400">Manage ingested songs available for pattern recognition</p>
          </div>

          <button
            onClick={fetchSongs}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-violet-500" />
            <p className="text-sm">Loading song library...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Music size={40} className="opacity-30 mx-auto mb-3" />
            <p className="font-semibold text-slate-400">Your song library is empty.</p>
            <p className="text-xs text-slate-500 mt-1">Upload a song above to start building your recognition database.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {songs.map((song) => {
              const isProcessing = processingIds[song.id];
              return (
                <div
                  key={song.id}
                  className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-white/10 gap-3 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                      <Music size={22} />
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{song.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium">{song.artist}</p>
                      <div className="flex items-center gap-1.5 text-[0.75rem] text-slate-500 mt-1">
                        <Calendar size={12} />
                        <span>Added {new Date(song.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    
                    <button
                      onClick={() => triggerProcessing(song.id)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Re-process audio fingerprints"
                    >
                      <Cpu size={14} className={isProcessing ? 'animate-spin text-violet-400' : ''} />
                      <span>{isProcessing ? 'Processing...' : 'Re-process'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(song.id)}
                      className="p-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-red-400 transition-colors cursor-pointer"
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
