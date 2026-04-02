import React, { useEffect, useMemo, useRef, useState } from "react";

function formatMs(ms) {
  return (ms / 1000).toFixed(1);
}

function computeRms(samples) {
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] * samples[index];
  }
  return Math.sqrt(sum / Math.max(1, samples.length));
}

function computePeak(samples) {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index]);
    if (value > peak) {
      peak = value;
    }
  }
  return peak;
}

async function decodeToPcm(blob) {
  const buffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();

  try {
    const audioBuffer = await context.decodeAudioData(buffer.slice(0));
    const pcm = audioBuffer.getChannelData(0);
    return {
      sampleRate: audioBuffer.sampleRate,
      durationSec: audioBuffer.duration,
      pcm: pcm.slice(0),
    };
  } finally {
    await context.close();
  }
}

function NoiseCheckInModal({ onClose, onNoiseDetected }) {
  const maxMs = 10000;

  const [status, setStatus] = useState("idle");
  const [timeLeftMs, setTimeLeftMs] = useState(maxMs);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [incidentType, setIncidentType] = useState("Construction");
  const [notes, setNotes] = useState("");

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const tickRef = useRef(null);
  const startTsRef = useRef(null);

  const statusLabel = useMemo(() => {
    if (status === "recording") {
      return `Recording... ${formatMs(timeLeftMs)}s left`;
    }
    if (status === "processing") {
      return "Processing sample...";
    }
    if (status === "done") {
      return "Sample ready";
    }
    if (status === "error") {
      return "Action needed";
    }
    return "Ready to record";
  }, [status, timeLeftMs]);

  const cleanupTimers = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
    }

    timerRef.current = null;
    tickRef.current = null;
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanupTimers();
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore cleanup failures when the recorder is already stopped
      }
      stopTracks();
    };
  }, []);

  const stopRecording = () => {
    cleanupTimers();

    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        // ignore manual stop errors when the stream is already closing
      }
    }
  };

  const startRecording = async () => {
    setError(null);
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Microphone access is not supported in this browser.");
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
          autoGainControl: false,
        },
        video: false,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        cleanupTimers();
        setStatus("processing");

        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const { pcm, durationSec, sampleRate } = await decodeToPcm(blob);

          const rms = computeRms(pcm);
          const peak = computePeak(pcm);
          const noiseThreshold = 0.0003;
          const detected = rms >= noiseThreshold;
          const audioUrl = URL.createObjectURL(blob);

          setResult({
            detected,
            rms,
            peak,
            durationSec,
            sampleRate,
            audioBlob: blob,
            audioUrl,
            audioFilename: `noise-checkin-${Date.now()}.webm`,
          });
          setStatus("done");
        } catch (processingError) {
          console.error(processingError);
          setStatus("error");
          setError("Failed to process the recorded audio sample.");
        } finally {
          stopTracks();
        }
      };

      recorder.start(250);
      setStatus("recording");
      startTsRef.current = Date.now();
      setTimeLeftMs(maxMs);

      tickRef.current = window.setInterval(() => {
        const elapsed = Date.now() - (startTsRef.current || Date.now());
        setTimeLeftMs(Math.max(0, maxMs - elapsed));
      }, 100);

      timerRef.current = window.setTimeout(() => stopRecording(), maxMs);
    } catch (recordingError) {
      console.error(recordingError);
      setStatus("error");
      setError("Microphone permission was denied or recording could not start.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(11, 24, 30, 0.54)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          padding: 22,
          borderRadius: 28,
          border: "1px solid rgba(123, 157, 165, 0.14)",
          background:
            "linear-gradient(155deg, rgba(255, 250, 243, 0.98), rgba(244, 239, 229, 0.96))",
          boxShadow: "0 30px 70px rgba(8, 20, 25, 0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#5d7a80",
              }}
            >
              Live Capture
            </span>
            <h3 style={{ margin: "10px 0 6px", fontSize: "1.7rem", color: "#13272f" }}>Noise Check-In</h3>
            <p style={{ margin: 0, color: "#5c6c74" }}>
              Record a 10 second sample, estimate the stress score, and optionally save it to the map.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              padding: 0,
              borderRadius: 14,
              border: "none",
              background: "rgba(19, 49, 60, 0.08)",
              color: "#17313a",
              fontSize: 20,
            }}
            type="button"
          >
            x
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 18,
            background: "rgba(136, 221, 199, 0.12)",
            color: "#17313a",
          }}
        >
          <strong>Status:</strong> {statusLabel}
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              background: "rgba(212, 84, 62, 0.12)",
              color: "#9f3c29",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={startRecording}
            disabled={status === "recording" || status === "processing"}
            style={{
              minHeight: 48,
              padding: "0 18px",
              border: "none",
              borderRadius: 999,
              background: "linear-gradient(135deg, #13313c, #235767)",
              color: "#f8f2e7",
              fontWeight: 800,
              opacity: status === "recording" || status === "processing" ? 0.5 : 1,
            }}
            type="button"
          >
            Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={status !== "recording"}
            style={{
              minHeight: 48,
              padding: "0 18px",
              borderRadius: 999,
              border: "1px solid rgba(123, 157, 165, 0.24)",
              background: "rgba(255, 255, 255, 0.72)",
              color: "#17313a",
              fontWeight: 800,
              opacity: status !== "recording" ? 0.5 : 1,
            }}
            type="button"
          >
            Stop
          </button>
        </div>

        {result && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(123, 157, 165, 0.16)",
              background: "rgba(255, 255, 255, 0.7)",
              color: "#17313a",
            }}
          >
            <div>
              <strong>Detected:</strong> {String(result.detected)}
            </div>
            <div>
              <strong>RMS:</strong> {result.rms.toFixed(4)}
            </div>
            <div>
              <strong>Peak:</strong> {result.peak.toFixed(4)}
            </div>
            <div>
              <strong>Duration:</strong> {result.durationSec.toFixed(2)}s
            </div>
            <div style={{ marginTop: 12 }}>
              <audio controls preload="metadata" src={result.audioUrl} style={{ width: "100%" }} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 6, color: "#17313a", fontWeight: 700 }}>
            <span>Incident type</span>
            <select
              value={incidentType}
              onChange={(event) => setIncidentType(event.target.value)}
              style={{
                minHeight: 46,
                borderRadius: 14,
                border: "1px solid rgba(123, 157, 165, 0.24)",
                padding: "0 12px",
                background: "rgba(255,255,255,0.86)",
              }}
            >
              <option>Construction</option>
              <option>Loud party</option>
              <option>Traffic congestion</option>
              <option>Industrial noise</option>
              <option>Public event / loudspeaker</option>
              <option>Other disturbance</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, color: "#17313a", fontWeight: 700 }}>
            <span>Notes for report</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Ongoing night construction near residential block."
              style={{
                borderRadius: 14,
                border: "1px solid rgba(123, 157, 165, 0.24)",
                padding: 12,
                resize: "vertical",
                background: "rgba(255,255,255,0.86)",
              }}
            />
          </label>
        </div>

        {!result && (
          <p style={{ margin: "14px 0 0", color: "#5c6c74", fontSize: 14 }}>
            If detection feels too sensitive or too weak, tune the internal RMS threshold in the modal logic.
          </p>
        )}

        {result?.detected && (
          <button
            onClick={() => onNoiseDetected({ ...result, incidentType, notes })}
            style={{
              width: "100%",
              minHeight: 50,
              marginTop: 16,
              border: "none",
              borderRadius: 18,
              background: "linear-gradient(135deg, #f4ca6d, #ff9258)",
              color: "#10222a",
              fontWeight: 800,
            }}
            type="button"
          >
            Save to Map
          </button>
        )}
      </div>
    </div>
  );
}

export default NoiseCheckInModal;
