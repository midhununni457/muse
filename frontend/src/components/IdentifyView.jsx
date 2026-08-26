import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Music2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Volume2,
  RotateCcw,
  FileAudio,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function IdentifyView() {
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'upload'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, [recordedAudioUrl]);

  const resetIdentify = () => {
    setMatchResult(null);
    setErrorMsg(null);
    setSelectedFile(null);
    setIsRecording(false);
    setIsDragging(false);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

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
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setMatchResult(null);
    }
  };


  const startRecording = async () => {
    setErrorMsg(null);
    setMatchResult(null);
    setSelectedFile(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        await processAudioForIdentification(audioBlob, 'recorded_clip.webm');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMsg('Microphone access denied or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
      setMatchResult(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    await processAudioForIdentification(selectedFile, selectedFile.name);
  };

  const processAudioForIdentification = async (audioBlobOrFile, filename) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setMatchResult(null);

    const formData = new FormData();
    formData.append('audio', audioBlobOrFile, filename);

    try {
      const res = await fetch(`${API_BASE}/identify`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to identify audio clip');
      }

      const data = await res.json();
      setMatchResult(data);
    } catch (err) {
      console.error('Identification error:', err);
      setErrorMsg(err.message || 'An error occurred while matching audio.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatOffset = (ms) => {
    if (ms === null || ms === undefined) return '0:00';
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div className="glass-panel glass-panel-accent p-6 md:p-10 text-center relative overflow-hidden transition-all">
        {!matchResult ? (
          <>
            {/* Header & Mode Toggle */}
            <div className="flex flex-col items-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Identify Any Song in{' '}
                <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  Seconds
                </span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                Record ambient audio through your microphone or upload an audio sample clip to match against your database library.
              </p>

              {/* Mode Toggle Pills */}
              <div className="inline-flex p-1.5 bg-slate-950/80 border border-white/10 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('record');
                    setErrorMsg(null);
                  }}
                  disabled={isAnalyzing || isRecording}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'record'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mic size={16} />
                  <span>Record Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setErrorMsg(null);
                  }}
                  disabled={isAnalyzing || isRecording}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Upload size={16} />
                  <span>Upload Clip</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Record Ambient Audio */}
            {activeTab === 'record' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isAnalyzing}
                    className="flex items-center gap-3 px-8 py-4 text-base font-bold rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-violet-600 text-white shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mic size={22} />
                    <span>Tap to Listen</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-3 px-8 py-4 text-base font-bold rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <Square size={22} />
                    <span>Stop Recording ({recordingTime}s)</span>
                  </button>
                )}

                {/* Live Visualizer */}
                {isRecording && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-1.5 h-12">
                      {[...Array(14)].map((_, i) => (
                        <div key={i} className="wave-bar" />
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-pink-400 mt-2">
                      Listening to ambient audio...
                    </p>
                  </div>
                )}

                {/* Replay Recorded Clip */}
                {recordedAudioUrl && !isRecording && !isAnalyzing && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-violet-500/30 w-full max-w-md animate-fade-in flex flex-col items-center gap-2.5 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                      <Volume2 size={16} className="text-pink-400" />
                      <span>Recorded Audio Clip</span>
                    </div>
                    <audio
                      controls
                      src={recordedAudioUrl}
                      className="w-full h-9 rounded-lg outline-none accent-violet-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Upload Clip File */}
            {activeTab === 'upload' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-md mx-auto">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full p-8 md:p-10 rounded-2xl bg-slate-950/70 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 relative ${
                    isDragging
                      ? 'border-violet-500 bg-violet-500/10 scale-[1.02] shadow-xl shadow-violet-500/20'
                      : 'border-white/20 hover:border-violet-500/50'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      isDragging
                        ? 'bg-violet-500 text-white scale-110'
                        : 'bg-violet-500/15 border border-violet-500/30 text-violet-400'
                    }`}
                  >
                    <FileAudio size={28} />
                  </div>

                  <div className="text-center">
                    <p className="text-sm sm:text-base font-bold text-white mb-1">
                      {selectedFile ? selectedFile.name : 'Drag & drop audio clip here'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedFile
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : 'or click button below (.mp3, .wav, .flac, .m4a up to 50MB)'}
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="audio/*"
                    id="clip-upload-input"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="clip-upload-input"
                    className="mt-1 px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:scale-105"
                  >
                    {selectedFile ? 'Change File' : 'Choose File'}
                  </label>
                </div>

                {selectedFile && (
                  <button
                    onClick={handleFileUpload}
                    disabled={isAnalyzing}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    <span>Identify Uploaded Clip</span>
                  </button>
                )}
              </div>
            )}


            {/* Analyzing Loading Indicator */}
            {isAnalyzing && (
              <div className="mt-8 p-6 rounded-2xl bg-slate-950/70 border border-violet-500/30 text-center animate-fade-in">
                <RefreshCw size={32} className="text-violet-400 animate-spin mx-auto mb-3" />
                <h4 className="text-base font-bold text-white">Analyzing Audio Fingerprints</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Cross-referencing landmark peak pairs against song library...
                </p>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="mt-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-left animate-fade-in">
                <div className="flex items-center gap-3 text-red-400 font-semibold text-xs sm:text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Match Result Mode inside the card */
          <div className="animate-fade-in flex flex-col items-center">
            {matchResult.success && matchResult.match ? (
              <div className="w-full">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-6">
                  <CheckCircle2 size={16} />
                  <span>SONG MATCH FOUND</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8 text-center sm:text-left">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-violet-600/30 shrink-0">
                    <Music2 size={48} className="text-white" />
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      {matchResult.match.title}
                    </h3>
                    <p className="text-base sm:text-lg text-slate-300 font-semibold mt-1">
                      {matchResult.match.artist}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-8">
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10">
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">
                      Confidence Score
                    </p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">
                      {Math.round((matchResult.confidence || 0) * 100)}%
                    </p>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((matchResult.confidence || 0) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10">
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-cyan-400" />
                      <span>Matched Offset</span>
                    </p>
                    <p className="text-2xl font-black text-cyan-400 mt-1">
                      Starts at {formatOffset(matchResult.alignOffsetMs)}
                    </p>
                    <p className="text-[0.75rem] text-slate-500 mt-1">
                      Time position in source audio
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full py-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-amber-400 mb-2">No Match Found</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  We couldn't find a matching song in your library. Try recording a clearer clip or ingest more songs into your library.
                </p>
              </div>
            )}

            {/* Record Again Reset Button */}
            <button
              onClick={resetIdentify}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <RotateCcw size={18} />
              <span>Record Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
