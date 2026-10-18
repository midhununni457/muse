import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Disc3,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Volume2,
  RotateCcw,
  FileAudio,
  Radio,
  Search,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
  Activity,
  Cpu,
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import { useServerStatus } from '../context/ServerStatusContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function IdentifyView() {
  const { isReady } = useServerStatus();
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'upload'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Robust recording timer: increments every second when isRecording is true
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Cleanup object URLs on unmount or replacement
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, [recordedAudioUrl]);

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioStream]);

  const resetIdentify = () => {
    setMatchResult(null);
    setErrorMsg(null);
    setSelectedFile(null);
    setIsRecording(false);
    setIsDragging(false);
    setRecordingTime(0);
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
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
    if (!isReady) return;
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
      setAudioStream(stream);

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
        setAudioStream(null);
        await processAudioForIdentification(audioBlob, 'recorded_clip.webm');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMsg('Microphone access denied or audio input not found.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
        throw new Error(errData.error || 'Failed to identify song');
      }

      const data = await res.json();
      setMatchResult(data);
    } catch (err) {
      console.error('Identification error:', err);
      setErrorMsg(err.message || 'Could not identify audio clip.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format offset in minutes and seconds only (e.g. 1:24)
  const formatOffset = (ms) => {
    if (ms === null || ms === undefined) return '0:00';
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Timeline Step Definitions tailored per tab
  const timelineSteps =
    activeTab === 'record'
      ? [
          {
            stage: 'STAGE 01',
            badge: '0.0s – 5.0s',
            title: 'Ambient Audio Capture',
            desc: 'Streams live audio from your microphone directly into a temporary audio buffer while reducing room noise.',
            icon: Mic,
            accent: 'text-orange-400 border-orange-500/60 shadow-orange-500/20',
          },
          {
            stage: 'STAGE 02',
            badge: 'FFT TRANSFORM',
            title: 'Fast Fourier Transform',
            desc: 'Deconstructs the incoming sound waves into discrete frequency bands across time to map energy amplitudes.',
            icon: Activity,
            accent: 'text-cyan-400 border-cyan-500/60 shadow-cyan-500/20',
          },
          {
            stage: 'STAGE 03',
            badge: 'CONSTELLATION',
            title: 'Landmark Fingerprinting',
            desc: 'Identifies prominent spectral peaks and couples them into combinatorial hash pairs resistant to distortion.',
            icon: Sparkles,
            accent: 'text-amber-400 border-amber-500/60 shadow-amber-500/20',
          },
          {
            stage: 'STAGE 04',
            badge: 'INSTANT MATCH',
            title: 'Database Match & Time Sync',
            desc: 'Queries the indexed song database for matching hashes to pinpoint the song title, artist, and playback offset.',
            icon: CheckCircle2,
            accent: 'text-emerald-400 border-emerald-500/60 shadow-emerald-500/20',
          },
        ]
      : [
          {
            stage: 'STAGE 01',
            badge: 'AUDIO INGEST',
            title: 'File Decoding & Resampling',
            desc: 'Parses your uploaded audio clip (.mp3, .wav, .flac) and converts it into standard 44.1kHz mono PCM audio.',
            icon: FileAudio,
            accent: 'text-orange-400 border-orange-500/60 shadow-orange-500/20',
          },
          {
            stage: 'STAGE 02',
            badge: 'STFT MATRIX',
            title: 'Time-Frequency Mapping',
            desc: 'Computes a high-resolution Short-Time Fourier Transform spectrogram across the entire duration of the clip.',
            icon: Layers,
            accent: 'text-cyan-400 border-cyan-500/60 shadow-cyan-500/20',
          },
          {
            stage: 'STAGE 03',
            badge: 'PEAK HASHING',
            title: 'Landmark Extraction',
            desc: 'Locates local frequency maxima and pairs target-zone peaks with delta-time stamps for robust matching.',
            icon: Cpu,
            accent: 'text-amber-400 border-amber-500/60 shadow-amber-500/20',
          },
          {
            stage: 'STAGE 04',
            badge: 'CORRELATION',
            title: 'Library Matching & Offset',
            desc: 'Cross-references the clip hash table with your music database to identify the song and report the exact offset.',
            icon: Database,
            accent: 'text-emerald-400 border-emerald-500/60 shadow-emerald-500/20',
          },
        ];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Studio Workstation Central Unit */}
      <div className="chassis-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
        {/* Hardware Top Header Strip */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm" />
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
              AUDIO RECOGNITION
            </h2>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <span>INPUT:</span>
            <span className="text-orange-400 font-bold uppercase">
              {activeTab === 'record' ? 'MICROPHONE' : 'FILE UPLOAD'}
            </span>
          </div>
        </div>

        {!matchResult ? (
          <>
            {/* Input Selection Toggle Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Identify What's Playing
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Sample ambient music or drop recorded clips to match against your music library.
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex p-1 rounded-xl chassis-bay border border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('record');
                    setErrorMsg(null);
                  }}
                  disabled={isAnalyzing || isRecording}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'record'
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Mic size={14} className={activeTab === 'record' ? 'text-orange-400' : ''} />
                  <span>Microphone</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setErrorMsg(null);
                  }}
                  disabled={isAnalyzing || isRecording}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Upload size={14} className={activeTab === 'upload' ? 'text-orange-400' : ''} />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Live Audio Visualizer Deck */}
            <div className="mb-6">
              <AudioVisualizer
                stream={audioStream}
                isRecording={isRecording}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {/* Warming Up Notice Banner */}
            {!isReady && (
              <div className="mb-6 p-3.5 rounded-xl chassis-bay border border-amber-500/30 bg-amber-500/5 flex items-center justify-center gap-2.5 text-amber-400 font-mono text-xs">
                <RefreshCw size={14} className="animate-spin text-amber-400 shrink-0" />
                <span>Waking up server & audio engine...</span>
              </div>
            )}

            {/* Mode 1: Microphone Recording Deck */}
            {activeTab === 'record' && (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl chassis-bay border border-zinc-800/80 text-center relative">
                {/* Physical Knurled REC Button */}
                <div className="relative mb-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={!isReady || isAnalyzing}
                      title={!isReady ? 'Waking up server & audio engine...' : 'Click to start recording'}
                      className="group relative w-28 h-28 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 border-4 border-zinc-700/80 flex flex-col items-center justify-center text-white shadow-2xl hover:border-orange-500/80 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed btn-hardware"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-b from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                        <Mic size={28} className="text-white" />
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 mt-1 font-bold">
                        LISTEN
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="relative w-28 h-28 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 border-4 border-red-500 flex flex-col items-center justify-center text-white shadow-2xl animate-rec-pulse cursor-pointer btn-hardware"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50">
                        <Square size={24} className="text-white fill-white" />
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-red-400 mt-1 font-bold">
                        STOP
                      </span>
                    </button>
                  )}
                </div>

                {/* Status Readout */}
                <div>
                  {isRecording ? (
                    <div className="flex items-center gap-2 justify-center font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 led-glow-red animate-ping" />
                      <span className="text-sm font-bold text-red-400 tracking-wider">
                        LISTENING... [{formatTimer(recordingTime)}]
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      {!isReady
                        ? 'Controls will unlock as soon as the server is ready'
                        : 'Tap the button to start listening to the music around you'}
                    </p>
                  )}
                </div>

                {/* Playback of Recorded Clip if Available */}
                {recordedAudioUrl && !isRecording && !isAnalyzing && (
                  <div className="mt-6 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 w-full max-w-md flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5 text-orange-400">
                        <Volume2 size={13} />
                        RECORDED SAMPLE
                      </span>
                      <span className="text-zinc-500">WEBM AUDIO</span>
                    </div>
                    <audio
                      controls
                      src={recordedAudioUrl}
                      className="w-full h-8 rounded outline-none accent-orange-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Audio File Upload Ingestion Deck */}
            {activeTab === 'upload' && (
              <div className="flex flex-col items-center gap-4 w-full">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full p-8 md:p-10 rounded-2xl chassis-bay border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 relative ${
                    isDragging
                      ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                      isDragging
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <FileAudio size={26} />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-bold text-white mb-1">
                      {selectedFile ? selectedFile.name : 'Drop audio clip here'}
                    </p>
                    <p className="text-xs font-mono text-zinc-500">
                      {selectedFile
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB // READY`
                        : 'MP3, WAV, FLAC, M4A up to 50MB'}
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="audio/*"
                    id="sample-upload-picker"
                    disabled={!isReady || isAnalyzing}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="sample-upload-picker"
                    className={`mt-1 px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                      !isReady || isAnalyzing
                        ? 'opacity-40 cursor-not-allowed pointer-events-none'
                        : 'hover:bg-zinc-800 cursor-pointer hover:border-orange-500/50'
                    }`}
                  >
                    {selectedFile ? 'Select Different File' : 'Browse Local Files'}
                  </label>
                </div>

                {selectedFile && (
                  <button
                    onClick={handleFileUpload}
                    disabled={!isReady || isAnalyzing}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-mono uppercase tracking-widest font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-hardware"
                  >
                    <Search size={16} />
                    <span>Identify Song</span>
                  </button>
                )}
              </div>
            )}


            {/* Analyzing Progress Card */}
            {isAnalyzing && (
              <div className="mt-6 p-5 rounded-xl chassis-bay border border-cyan-500/30 text-center animate-in fade-in">
                <RefreshCw size={26} className="text-cyan-400 animate-spin mx-auto mb-2.5" />
                <h4 className="text-sm font-mono uppercase tracking-wider text-white font-bold">
                  Searching Song Library...
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Analyzing audio frequencies and finding matches in your database...
                </p>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-left">
                <div className="flex items-center gap-2.5 text-red-400 font-mono text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Match Result Screen */
          <div className="animate-in fade-in flex flex-col items-center">
            {matchResult.success && matchResult.match ? (
              <div className="w-full">
                {/* Status Badge */}
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold tracking-wider uppercase">
                    <CheckCircle2 size={14} />
                    <span>SONG MATCH FOUND</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500">
                    ID: #{matchResult.match.id}
                  </span>
                </div>

                {/* Master Record Sleeve Card */}
                <div className="p-6 md:p-8 rounded-2xl chassis-bay border border-zinc-800 mb-6 flex flex-col sm:flex-row items-center gap-6">
                  {/* Rotating Vinyl Record Graphic */}
                  <div className="relative w-28 h-28 rounded-full bg-zinc-950 border-4 border-zinc-800 flex items-center justify-center shrink-0 shadow-2xl animate-spin-slow">
                    <div className="absolute inset-2 rounded-full border border-zinc-800/80" />
                    <div className="absolute inset-4 rounded-full border border-zinc-800/60" />
                    <div className="absolute inset-6 rounded-full border border-zinc-800/40" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                      <Disc3 size={18} className="text-zinc-950" />
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-1">
                      MATCHED SONG
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                      {matchResult.match.title}
                    </h3>
                    <p className="text-base sm:text-lg text-zinc-300 font-medium mt-0.5 truncate">
                      {matchResult.match.artist}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                        MATCH: CONFIRMED
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                        LIBRARY AUDIO
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reverted Metric Gauges (CONFIDENCE LEVEL & OFFSET ALIGNMENT) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {/* Confidence VU Meter */}
                  <div className="p-4 rounded-xl chassis-bay border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                      <span className="uppercase tracking-wider">CONFIDENCE LEVEL</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {Math.round((matchResult.confidence || 0) * 100)}%
                      </span>
                    </div>

                    {/* Segmented LED Gauge Meter */}
                    <div className="grid grid-cols-12 gap-1 h-3 my-2">
                      {[...Array(12)].map((_, i) => {
                        const filled = (i + 1) / 12 <= (matchResult.confidence || 0);
                        return (
                          <div
                            key={i}
                            className={`h-full rounded-xs transition-colors duration-300 ${
                              filled
                                ? i > 9
                                  ? 'bg-red-500 led-glow-red'
                                  : i > 7
                                  ? 'bg-amber-400 led-glow-amber'
                                  : 'bg-emerald-500 led-glow-emerald'
                                : 'bg-zinc-900 border border-white/5'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Landmark peak alignment threshold verified
                    </p>
                  </div>

                  {/* Alignment Timeline Offset (Seconds only) */}
                  <div className="p-4 rounded-xl chassis-bay border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                      <span className="uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={13} className="text-cyan-400" />
                        OFFSET ALIGNMENT
                      </span>
                      <span className="text-cyan-400 font-bold text-sm">
                        Starts at {formatOffset(matchResult.alignOffsetMs)}
                      </span>
                    </div>

                    {/* Timeline Position Strip */}
                    <div className="w-full h-3 rounded bg-zinc-900 border border-zinc-800 my-2 relative overflow-hidden flex items-center">
                      <div
                        className="h-full bg-cyan-500/40 border-r-2 border-cyan-400"
                        style={{
                          width: `${Math.min(
                            95,
                            Math.max(5, ((matchResult.alignOffsetMs || 0) % 180000) / 1800)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Time position in source audio
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* No Match Found Screen */
              <div className="w-full py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-inner">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">No Song Match Found</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
                  We couldn't find a matching song in your library. Try recording a clearer clip, or add this song to your library first.
                </p>
              </div>
            )}

            {/* Tactile Reset Button */}
            <button
              onClick={resetIdentify}
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2 shadow-lg transition-all hover:border-orange-500 cursor-pointer btn-hardware"
            >
              <RotateCcw size={14} className="text-orange-400" />
              <span>Identify Another Song</span>
            </button>
          </div>
        )}
      </div>

      {/* DYNAMIC WEBSITE-STYLE TIMELINE HOW IT WORKS SECTION */}
      <div className="chassis-panel rounded-2xl p-6 md:p-8 relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm" />
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
              HOW IT WORKS
            </h3>
          </div>
          <span className="font-mono text-[11px] text-orange-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
            {activeTab === 'record' ? 'LIVE AUDIO PIPELINE' : 'FILE ANALYSIS PIPELINE'}
          </span>
        </div>

        <div className="mb-8">
          <h4 className="text-xl font-bold text-white tracking-tight">
            {activeTab === 'record'
              ? 'Live Microphone Recognition Timeline'
              : 'Uploaded Clip Ingestion Timeline'}
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            {activeTab === 'record'
              ? 'How Muse captures ambient sound waves and identifies tracks in real time.'
              : 'How Muse parses audio clip files, extracts spectrogram peaks, and matches library tracks.'}
          </p>
        </div>

        {/* Website-Style Timeline Track Container */}
        <div className="relative">
          {/* Timeline Nodes & Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={idx}
                  className="flex md:flex-col items-center gap-4 md:gap-4 relative group"
                >
                  {/* Desktop Horizontal Spine Segment (Starts at Box 1 center, ends at Box 4 center) */}
                  {idx < 3 && (
                    <div
                      className={`hidden md:block absolute top-7 -translate-y-1/2 left-1/2 w-[calc(100%+1.5rem)] h-0.5 z-0 pointer-events-none ${
                        idx === 0
                          ? 'bg-gradient-to-r from-orange-500 to-cyan-500'
                          : idx === 1
                          ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                          : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                      }`}
                    />
                  )}

                  {/* Mobile Vertical Spine Segment (Starts at Box 1 center, ends at Box 4 center) */}
                  {idx < 3 && (
                    <div
                      className={`md:hidden absolute left-6 -translate-x-1/2 top-1/2 h-[calc(100%+1.5rem)] w-0.5 z-0 pointer-events-none ${
                        idx === 0
                          ? 'bg-gradient-to-b from-orange-500 to-cyan-500'
                          : idx === 1
                          ? 'bg-gradient-to-b from-cyan-500 to-amber-500'
                          : 'bg-gradient-to-b from-amber-500 to-emerald-500'
                      }`}
                    />
                  )}

                  {/* Glowing Timeline Node Hub (Centered) */}
                  <div className="relative shrink-0 z-10 md:mb-1">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-950 border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${step.accent}`}
                    >
                      <StepIcon size={22} />
                    </div>
                  </div>

                  {/* Card Content with Timeline Branch */}
                  <div className="flex-1 w-full p-4 rounded-xl chassis-bay border border-zinc-800/80 group-hover:border-zinc-700 transition-colors z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                        {step.stage}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        {step.badge}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white mb-1.5 group-hover:text-orange-400 transition-colors">
                      {step.title}
                    </h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
