import React, { useState, useEffect } from 'react';
import { Plus, Music, Trash2, Cpu, AlertCircle, RefreshCw, Upload, Calendar, AlertTriangle, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function LibraryView() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [processingIds, setProcessingIds] = useState({});

  // Deletion modal and loading states
  const [deletingIds, setDeletingIds] = useState({});
  const [songToDelete, setSongToDelete] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAudioFile(e.dataTransfer.files[0]);
    }
  };


  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async (showFullLoading = true) => {
    if (showFullLoading) setLoading(true);
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
      if (showFullLoading) setLoading(false);
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
      await fetchSongs(false);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const triggerProcessing = async (songId) => {
    const idKey = String(songId);
    setProcessingIds((prev) => ({ ...prev, [idKey]: true }));
    try {
      const res = await fetch(`${API_BASE}/songs/${songId}/process`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Failed to process song');
      }
      await fetchSongs(false);
    } catch (err) {
      console.error(`Processing error for song ${songId}:`, err);
      alert(`Processing error: ${err.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = { ...prev };
        delete next[idKey];
        delete next[songId];
        return next;
      });
    }
  };


  const openDeleteModal = (song) => {
    setSongToDelete(song);
  };

  const confirmDelete = async () => {
    if (!songToDelete) return;
    const songId = songToDelete.id;

    setDeletingIds((prev) => ({ ...prev, [songId]: true }));
    try {
      const res = await fetch(`${API_BASE}/songs/${songId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete song');
      }
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setSongToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Could not delete song.');
    } finally {
      setDeletingIds((prev) => ({ ...prev, [songId]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      
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
              Full Track Audio File
            </label>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-8 md:p-10 rounded-2xl bg-slate-950/80 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 relative ${
                isDragging
                  ? 'border-violet-500 bg-violet-500/10 scale-[1.01] shadow-xl shadow-violet-500/20'
                  : 'border-white/10 hover:border-violet-500/40'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isDragging
                    ? 'bg-violet-500 text-white scale-110'
                    : 'bg-violet-500/15 border border-violet-500/30 text-violet-400'
                }`}
              >
                <Upload size={26} />
              </div>

              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">
                  {audioFile ? audioFile.name : 'Drag & drop full track audio file here'}
                </p>
                <p className="text-xs text-slate-400">
                  {audioFile
                    ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'or click button below (.mp3, .wav, .flac, .m4a)'}
                </p>
              </div>

              <input
                type="file"
                accept="audio/*"
                id="song-audio-file-input"
                onChange={(e) => setAudioFile(e.target.files[0] || null)}
                className="hidden"
              />

              <label
                htmlFor="song-audio-file-input"
                className="mt-1 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-600/30 cursor-pointer transition-all hover:scale-105"
              >
                {audioFile ? 'Change Audio File' : 'Choose File'}
              </label>
            </div>
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
              const isProcessing = !!processingIds[song.id] || !!processingIds[String(song.id)];
              const isDeleting = !!deletingIds[song.id] || !!deletingIds[String(song.id)];
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
                      disabled={isProcessing || isDeleting}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Re-process audio fingerprints"
                    >
                      <Cpu size={14} className={isProcessing ? 'animate-spin text-violet-400' : ''} />
                      <span>{isProcessing ? 'Processing...' : 'Re-process'}</span>
                    </button>

                    <button
                      onClick={() => openDeleteModal(song)}
                      disabled={isDeleting || isProcessing}
                      className="p-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete song"
                    >
                      {isDeleting ? (
                        <RefreshCw size={16} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Custom Confirmation Modal */}
      {songToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="glass-panel max-w-md w-full p-6 space-y-5 border border-red-500/20 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSongToDelete(null)}
              disabled={deletingIds[songToDelete.id]}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Delete Song</h4>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{songToDelete.title}"</span> by <span className="font-semibold text-slate-200">{songToDelete.artist}</span>? This will permanently remove the track and all associated audio fingerprints.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSongToDelete(null)}
                disabled={deletingIds[songToDelete.id]}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingIds[songToDelete.id]}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingIds[songToDelete.id] ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Song</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

