import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Sparkles, Music2, AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function IdentifyView() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setMatchResult(null);
    setSelectedFile(null);
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
    <div className="flex flex-col gap-6">
      
      {/* Hero Card */}
      <div className="glass-panel glass-panel-accent p-6 md:p-10 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-violet-500/15 border border-violet-500/30 rounded-full text-violet-300 text-xs font-semibold mb-4">
          <Sparkles size={14} />
          <span>Shazam-Style Audio Fingerprinting</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
          Identify Any Song in <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Seconds</span>
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base mb-6 leading-relaxed">
          Record ambient audio from your microphone or upload a sample clip file to match against your database library.
        </p>

        {/* Recording Action Button */}
        <div className="flex justify-center items-center gap-4 flex-wrap">
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
              className="flex items-center gap-3 px-8 py-4 text-base font-bold rounded-full bg-red-600 text-white animate-pulse-ring cursor-pointer"
            >
              <Square size={22} />
              <span>Stop Recording ({recordingTime}s)</span>
            </button>
          )}
        </div>

        {/* Live Audio Visualizer */}
        {isRecording && (
          <div className="mt-6">
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
      </div>

      {/* File Upload Option */}
      <div className="glass-panel p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Upload size={18} className="text-cyan-400" />
          <span>Or Upload an Audio Clip File</span>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="audio/*"
            id="clip-upload-input"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="clip-upload-input"
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-slate-200 cursor-pointer transition-colors"
          >
            Choose File
          </label>
          
          <span className="text-xs sm:text-sm text-slate-400 truncate max-w-xs">
            {selectedFile ? selectedFile.name : 'No clip file chosen'}
          </span>

          {selectedFile && (
            <button
              onClick={handleFileUpload}
              disabled={isAnalyzing}
              className="ml-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? 'Matching...' : 'Identify Uploaded Clip'}
            </button>
          )}
        </div>
      </div>

      {/* Analyzing Loading Card */}
      {isAnalyzing && (
        <div className="glass-panel p-8 text-center animate-fade-in">
          <RefreshCw size={36} className="text-violet-500 animate-spin mx-auto mb-4" />
          <h4 className="text-lg font-bold text-white">Analyzing Audio Fingerprints</h4>
          <p className="text-sm text-slate-400 mt-1">
            Cross-referencing landmark peak pairs against database songs...
          </p>
        </div>
      )}

      {/* Error Card */}
      {errorMsg && (
        <div className="glass-panel p-5 border-red-500/40 bg-red-500/10 animate-fade-in">
          <div className="flex items-center gap-3 text-red-400 font-semibold text-sm">
            <AlertCircle size={20} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Match Result Display */}
      {matchResult && (
        <div className="animate-fade-in">
          {matchResult.success && matchResult.match ? (
            <div className="glass-panel p-6 md:p-8 border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900/65 to-cyan-950/20">
              
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-4">
                <CheckCircle2 size={18} />
                <span>SONG MATCH FOUND</span>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/30 shrink-0">
                  <Music2 size={36} className="text-white" />
                </div>

                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{matchResult.match.title}</h3>
                  <p className="text-base sm:text-lg text-slate-300 font-medium mt-0.5">{matchResult.match.artist}</p>
                </div>
              </div>

              {/* Match Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                
                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Score</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {Math.round((matchResult.confidence || 0) * 100)}%
                  </p>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((matchResult.confidence || 0) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-cyan-400" />
                    <span>Matched Track Offset</span>
                  </p>
                  <p className="text-xl font-bold text-cyan-400 mt-1">
                    Starts at {formatOffset(matchResult.alignOffsetMs)}
                  </p>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel p-8 text-center border-amber-500/30">
              <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-amber-500">No Match Found</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
                We couldn't find a matching song in your library. Try recording a clearer clip or ingest more songs into your library.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
