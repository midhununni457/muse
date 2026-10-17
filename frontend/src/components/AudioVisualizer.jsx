import React, { useRef, useEffect } from 'react';

export default function AudioVisualizer({ stream, isRecording, isAnalyzing }) {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const peaksRef = useRef(new Array(32).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let source = null;

    if (stream && isRecording) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Gives 32 frequency bins
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err) {
        console.warn('AudioContext setup error:', err);
      }
    }

    let tick = 0;

    const render = () => {
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
      tick += 0.05;

      const numBars = 28;
      const barWidth = Math.floor((width - (numBars - 1) * 3) / numBars);
      const gap = 3;

      let freqData = new Uint8Array(32);
      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(freqData);
      }

      // Draw subtle background grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 10; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw bars
      for (let i = 0; i < numBars; i++) {
        let val = 0;
        if (isRecording && analyserRef.current) {
          // Real live frequency
          const bin = Math.min(i, freqData.length - 1);
          val = freqData[bin] / 255;
        } else if (isAnalyzing) {
          // Synthetic scanning waveform
          const wave1 = Math.sin(tick * 3 + i * 0.4);
          const wave2 = Math.cos(tick * 1.5 - i * 0.3);
          val = Math.max(0.15, (wave1 + wave2 + 2) / 4);
        } else {
          // Idle ambient pulse
          val = 0.06 + Math.sin(tick + i * 0.3) * 0.04;
        }

        const barHeight = Math.max(4, val * (height - 18));
        const x = i * (barWidth + gap);
        const y = height - barHeight - 4;

        // Peak hold calculation for recording mode
        if (isRecording) {
          if (val > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = val;
          } else {
            peaksRef.current[i] = Math.max(val, (peaksRef.current[i] || 0) - 0.02);
          }
        }

        // Color gradient
        const grad = ctx.createLinearGradient(0, height, 0, y);
        if (isRecording) {
          grad.addColorStop(0, '#f97316'); // Studio Amber
          grad.addColorStop(0.7, '#fb923c');
          grad.addColorStop(1, '#ef4444'); // Red peak
        } else if (isAnalyzing) {
          grad.addColorStop(0, '#0284c7'); // Blue/cyan scanner
          grad.addColorStop(0.6, '#06b6d4');
          grad.addColorStop(1, '#38bdf8');
        } else {
          grad.addColorStop(0, '#27272a');
          grad.addColorStop(1, '#3f3f46');
        }

        ctx.fillStyle = grad;
        // Rounded bar top
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        // Draw peak indicator pip (synced to the wave bars)
        if (isAnalyzing) {
          // Perfectly locked in sync to the top of each moving wave bar
          const peakY = y - 3;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x, Math.max(1, peakY), barWidth, 2);
        } else if (isRecording) {
          const peakY = height - (peaksRef.current[i] * (height - 18)) - 7;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x, Math.max(1, peakY), barWidth, 2);
        }
      }

      // Draw bottom baseline
      ctx.fillStyle = isRecording ? '#f97316' : '#27272a';
      ctx.fillRect(0, height - 2, width, 2);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stream, isRecording, isAnalyzing]);

  return (
    <div className="w-full chassis-bay p-3 rounded-xl relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest pb-1 border-b border-white/5 mb-2">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRecording
                ? 'bg-red-500 led-glow-red animate-pulse'
                : isAnalyzing
                ? 'bg-cyan-400 led-glow-amber animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          {isRecording
            ? 'LISTENING TO AUDIO'
            : isAnalyzing
            ? 'ANALYZING FREQUENCIES'
            : 'AUDIO VISUALIZER'}
        </span>
        <span className="text-zinc-600">LIVE SPECTRUM</span>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-20 block"
        style={{ width: '100%', height: '80px' }}
      />

      <div className="flex justify-between items-center text-[9px] font-mono text-zinc-600 pt-1.5 border-t border-white/5">
        <span>20Hz</span>
        <span>250Hz</span>
        <span>1kHz</span>
        <span>4kHz</span>
        <span>12kHz</span>
        <span>20kHz</span>
      </div>
    </div>
  );
}
