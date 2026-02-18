import React, { useEffect, useMemo, useRef, useState } from "react";

function formatMs(ms) {
  return (ms / 1000).toFixed(1);
}

function computeRms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

function computePeak(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

async function decodeToPcm(blob) {
  const buf = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
    const pcm = audioBuffer.getChannelData(0);
    return {
      sampleRate: audioBuffer.sampleRate,
      durationSec: audioBuffer.duration,
      pcm: pcm.slice(0),
    };
  } finally {
    await ctx.close();
  }
}

export default function NoiseCheckInModal({ onClose, onNoiseDetected }) {
  const MAX_MS = 10_000;

  const [status, setStatus] = useState("idle"); // idle|recording|processing|error|done
  const [timeLeftMs, setTimeLeftMs] = useState(MAX_MS);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const tickRef = useRef(null);
  const startTsRef = useRef(null);

  const statusLabel = useMemo(() => {
    if (status === "recording") return `Recording… ${formatMs(timeLeftMs)}s left`;
    if (status === "processing") return "Processing…";
    if (status === "done") return "Done";
    if (status === "error") return "Error";
    return "Ready";
  }, [status, timeLeftMs]);

  const cleanupTimers = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    timerRef.current = null;
    tickRef.current = null;
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanupTimers();
      try {
        recorderRef.current?.stop();
      } catch {}
      stopTracks();
    };
  }, []);

  const stopRecording = () => {
    cleanupTimers();

    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
        try {
        rec.stop();
        } catch {}
    }
    };

  const startRecording = async () => {
    setError(null);
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Microphone is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // better consistency for “noise mapping”
        },
        video: false,
      });
      streamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanupTimers();
        setStatus("processing");

        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const { pcm, durationSec, sampleRate } = await decodeToPcm(blob);

          const rms = computeRms(pcm);
          const peak = computePeak(pcm);

          // Tune this after testing on your laptop
          const NOISE_RMS_THRESHOLD = 0.03;
          const detected = rms >= NOISE_RMS_THRESHOLD;

          const payload = { detected, rms, peak, durationSec, sampleRate };

          setResult(payload);
          setStatus("done");

          if (detected) onNoiseDetected(payload);
        } catch (e) {
          console.error(e);
          setStatus("error");
          setError("Failed to process recorded audio.");
        } finally {
          stopTracks(); // release microphone
        }
      };

      recorder.start(250);
      setStatus("recording");

      startTsRef.current = Date.now();
      setTimeLeftMs(MAX_MS);

      tickRef.current = window.setInterval(() => {
        const elapsed = Date.now() - (startTsRef.current || Date.now());
        setTimeLeftMs(Math.max(0, MAX_MS - elapsed));
      }, 100);

      timerRef.current = window.setTimeout(() => stopRecording(), MAX_MS);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setError("Microphone permission denied / failed.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div style={{ width: "min(520px, 100%)", background: "white", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Noise Check-In</h3>
            <p style={{ margin: "6px 0", color: "#555" }}>Records 10 seconds and detects noise.</p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent",color:"black", fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 10, padding: 10, background: "#f5f5f5", borderRadius: 12 }}>
          <b>Status:</b> {statusLabel}
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: 10, background: "#ffecec", borderRadius: 12, color: "#8a1f1f" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={startRecording}
            disabled={status === "recording" || status === "processing"}
            style={{
              background: "black",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              opacity: status === "recording" || status === "processing" ? 0.5 : 1,
            }}
          >
            Start
          </button>

          <button
            onClick={stopRecording}
            disabled={status !== "recording"}
            style={{
              background: "white",
              color: "black",
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              cursor: "pointer",
              opacity: status !== "recording" ? 0.5 : 1,
            }}
          >
            Stop
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee", borderRadius: 12 }}>
            <div><b>Detected:</b> {String(result.detected)}</div>
            <div><b>RMS:</b> {result.rms.toFixed(4)}</div>
            <div><b>Peak:</b> {result.peak.toFixed(4)}</div>
          </div>
        )}

        {!result && (
          <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
            If detection is too sensitive / not sensitive, change <code>NOISE_RMS_THRESHOLD</code>.
          </div>
        )}
      </div>
    </div>
  );
}
