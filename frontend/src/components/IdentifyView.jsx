import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Sparkles, Music2, AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

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

  // Start Mic Recording
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
        // Stop stream tracks
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
      console.error('Microphone access error:', err);
      setErrorMsg('Microphone access denied or not supported in this browser.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setMatchResult(null);
    }
  };

  // Submit File Clip
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    await processAudioForIdentification(selectedFile, selectedFile.name);
  };

  // API Call to POST /identify
  const processAudioForIdentification = async (audioBlobOrFile, filename) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setMatchResult(null);

    const formData = new FormData();
    formData.append('audio', audioBlobOrFile, filename);

    try {
      const res = await fetch('/api/identify', {
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

  // Format Offset Time (ms -> mm:ss)
  const formatOffset = (ms) => {
    if (ms === null || ms === undefined) return '0:00';
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Hero Section */}
      <div className="glass-panel glass-panel-accent" style={{ padding: '32px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', fontSize: '0.85rem', marginBottom: '16px' }}>
          <Sparkles size={14} />
          <span>Shazam-Style Audio Fingerprinting</span>
        </div>

        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '12px' }}>
          Identify Any Song in <span className="gradient-text">Seconds</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
          Record audio from your microphone or upload a sample clip to match against your database library.
        </p>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Record Button */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isAnalyzing}
              className="btn btn-primary"
              style={{
                padding: '16px 32px',
                fontSize: '1.05rem',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 0 35px rgba(236, 72, 153, 0.35)',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
              }}
            >
              <Mic size={22} />
              <span>Tap to Listen</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="btn"
              style={{
                padding: '16px 32px',
                fontSize: '1.05rem',
                borderRadius: 'var(--radius-full)',
                background: '#ef4444',
                color: '#ffffff',
                animation: 'pulse-ring 1.5s infinite'
              }}
            >
              <Square size={22} />
              <span>Stop Recording ({recordingTime}s)</span>
            </button>
          )}

        </div>

        {/* Live Audio Visualizer Animation */}
        {isRecording && (
          <div style={{ marginTop: '24px' }}>
            <div className="wave-container">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="wave-bar" />
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#f472b6', marginTop: '8px' }}>
              Listening to ambient audio...
            </p>
          </div>
        )}
      </div>

      {/* File Upload Alternative */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} color="var(--accent-cyan)" />
          <span>Or Upload an Audio Clip File</span>
        </h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="file"
            accept="audio/*"
            id="clip-upload"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="clip-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Choose File
          </label>
          
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {selectedFile ? selectedFile.name : 'No clip file chosen'}
          </span>

          {selectedFile && (
            <button
              onClick={handleFileUpload}
              disabled={isAnalyzing}
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
            >
              {isAnalyzing ? 'Matching...' : 'Identify Uploaded Clip'}
            </button>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isAnalyzing && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center' }}>
          <RefreshCw size={36} color="var(--primary)" className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Analyzing Audio Fingerprints</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cross-referencing landmark peak pairs against database songs...
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="glass-panel animate-fade-in" style={{ padding: '20px', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171' }}>
            <AlertCircle size={22} />
            <span style={{ fontWeight: 600 }}>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Match Results View */}
      {matchResult && (
        <div className="animate-fade-in">
          {matchResult.success && matchResult.match ? (
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>
                <CheckCircle2 size={18} />
                <span>SONG IDENTIFIED MATCH</span>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow)'
                }}>
                  <Music2 size={36} color="#ffffff" />
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{matchResult.match.title}</h3>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{matchResult.match.artist}</p>
                </div>
              </div>

              {/* Match Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
                
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence Score</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                    {Math.round((matchResult.confidence || 0) * 100)}%
                  </p>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((matchResult.confidence || 0) * 100))}%`, height: '100%', background: 'var(--accent-emerald)' }} />
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>Matched Track Position</span>
                  </p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    Starts at {formatOffset(matchResult.alignOffsetMs)}
                  </p>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <AlertCircle size={40} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>No Match Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px', maxWidth: '420px', margin: '6px auto 16px' }}>
                We couldn't find a matching song in your library. Try recording a clearer clip or ingest more songs into your library.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
