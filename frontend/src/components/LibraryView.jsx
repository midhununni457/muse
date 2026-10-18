import React, { useState, useEffect } from 'react';
import {
  Plus,
  Music,
  Trash2,
  Cpu,
  AlertCircle,
  RefreshCw,
  Upload,
  Calendar,
  AlertTriangle,
  X,
  Search,
  SlidersHorizontal,
  HardDrive,
  FileAudio,
} from 'lucide-react';
import { useServerStatus } from '../context/ServerStatusContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function LibraryView() {
  const { isReady } = useServerStatus();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!isReady) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAudioFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  // When server finishes cold-starting and becomes ready, refresh the songs list
  useEffect(() => {
    if (isReady) {
      fetchSongs(false);
    }
  }, [isReady]);


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
    setUploadStatus('Uploading master track file...');

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
      setUploadStatus('Computing 2D spectrogram landmarks & hash table index...');
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

  // Filter songs by search term
  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 relative max-w-4xl mx-auto w-full">
      {/* Track Ingest Bay */}
      <div className="chassis-panel rounded-2xl p-6 md:p-8 relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm" />
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
              AUDIO INGESTION
            </h3>
          </div>
          <span className="font-mono text-[11px] text-zinc-500">MP3, WAV, FLAC, M4A</span>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          {!isReady && (
            <div className="p-3.5 rounded-xl chassis-bay border border-amber-500/30 bg-amber-500/5 flex items-center justify-center gap-2.5 text-amber-400 font-mono text-xs">
              <RefreshCw size={14} className="animate-spin text-amber-400 shrink-0" />
              <span>Waking up server & audio engine...</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 font-bold">
                Song Title
              </label>
              <input
                type="text"
                value={title}
                disabled={!isReady || isUploading}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bohemian Rhapsody"
                required
                className="w-full px-4 py-2.5 rounded-xl chassis-bay text-white text-sm font-sans focus:outline-none focus:border-orange-500/80 transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 font-bold">
                Artist / Band Name
              </label>
              <input
                type="text"
                value={artist}
                disabled={!isReady || isUploading}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Queen"
                required
                className="w-full px-4 py-2.5 rounded-xl chassis-bay text-white text-sm font-sans focus:outline-none focus:border-orange-500/80 transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 font-bold">
              Song Audio File
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-6 md:p-8 rounded-2xl chassis-bay border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2.5 relative ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isDragging
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                }`}
              >
                <Upload size={22} />
              </div>

              <div className="text-center">
                <p className="text-sm font-bold text-white mb-0.5">
                  {audioFile ? audioFile.name : 'Drop full song audio file here'}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  {audioFile
                    ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB // READY TO UPLOAD`
                    : 'Supports MP3, WAV, FLAC, M4A'}
                </p>
              </div>

              <input
                type="file"
                accept="audio/*"
                id="library-audio-file-input"
                disabled={!isReady || isUploading}
                onChange={(e) => setAudioFile(e.target.files[0] || null)}
                className="hidden"
              />

              <label
                htmlFor="library-audio-file-input"
                className={`mt-1 px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                  !isReady || isUploading
                    ? 'opacity-40 cursor-not-allowed pointer-events-none'
                    : 'hover:bg-zinc-800 cursor-pointer hover:border-orange-500/50'
                }`}
              >
                {audioFile ? 'Change Audio File' : 'Browse Files'}
              </label>
            </div>
          </div>

          {uploadStatus && (
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <RefreshCw size={14} className="animate-spin" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isReady || isUploading}
            className="self-start px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-mono text-xs uppercase tracking-widest font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed btn-hardware"
          >
            <Plus size={16} />
            <span>{isUploading ? 'Adding Song...' : 'Add Song to Library'}</span>
          </button>
        </form>
      </div>

      {/* Catalog Listing */}
      <div className="chassis-panel rounded-2xl p-6 md:p-8 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm" />
            <div>
              <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
                SONG LIBRARY ({songs.length} TRACKS)
              </h3>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">
                Tracks available for audio recognition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search filter input */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter catalog..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg chassis-bay text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <button
              onClick={fetchSongs}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Refresh catalog"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-orange-500" />
            <p>READING FINGERPRINT DATABASE...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            <HardDrive size={36} className="opacity-30 mx-auto mb-3" />
            <p className="font-bold text-zinc-400 uppercase tracking-wider">Archive is currently empty</p>
            <p className="text-zinc-600 mt-1">Upload an audio master above to compile the first constellation map.</p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 font-mono text-xs">
            <p>NO TRACKS MATCHING "{searchQuery}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredSongs.map((song, index) => {
              const isProcessing = !!processingIds[song.id] || !!processingIds[String(song.id)];
              const isDeleting = !!deletingIds[song.id] || !!deletingIds[String(song.id)];
              const channelIndex = String(index + 1).padStart(2, '0');

              return (
                <div
                  key={song.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:px-4 rounded-xl chassis-bay border border-zinc-800/80 gap-3 hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Channel Number */}
                    <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                      CH{channelIndex}
                    </span>

                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 group-hover:border-orange-500/40 group-hover:text-orange-400 transition-colors">
                      <Music size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                        {song.title}
                      </h4>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 mt-0.5 truncate">
                        <span className="truncate">{song.artist}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500 text-[10px] shrink-0">
                          {new Date(song.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => triggerProcessing(song.id)}
                      disabled={isProcessing || isDeleting}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-700"
                      title="Re-compile landmark peak hash table"
                    >
                      <Cpu size={12} className={isProcessing ? 'animate-spin text-orange-400' : ''} />
                      <span>{isProcessing ? 'COMPUTING...' : 'RE-INDEX'}</span>
                    </button>

                    <button
                      onClick={() => openDeleteModal(song)}
                      disabled={isDeleting || isProcessing}
                      className="p-1.5 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/40 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
                      title="Purge song from archive"
                    >
                      {isDeleting ? (
                        <RefreshCw size={14} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {songToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="chassis-panel max-w-md w-full p-6 space-y-4 border border-red-500/40 rounded-2xl relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSongToDelete(null)}
              disabled={deletingIds[songToDelete.id]}
              className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  DELETE SONG FROM LIBRARY
                </h4>
                <p className="text-[11px] font-mono text-zinc-500">
                  THIS ACTION CANNOT BE UNDONE
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-mono leading-relaxed">
              Are you sure you want to delete <span className="text-white font-bold">"{songToDelete.title}"</span> by{' '}
              <span className="text-zinc-200">{songToDelete.artist}</span>? This song will no longer be recognizable by the engine.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSongToDelete(null)}
                disabled={deletingIds[songToDelete.id]}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingIds[songToDelete.id]}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider font-bold shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingIds[songToDelete.id] ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
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
