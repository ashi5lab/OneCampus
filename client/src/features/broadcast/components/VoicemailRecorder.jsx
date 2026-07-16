import { useRef, useState, useEffect } from 'react';
import { useSubmitVoicemail } from '../hooks/useBroadcast';

const MAX_SECONDS = 30;

// Browser-side voicemail recorder (MediaRecorder, audio/webm). Hard-stops
// at 30 seconds — the backend also validates the submitted duration, but
// the recorder itself is the primary enforcement since we don't decode
// audio server-side.
export function VoicemailRecorder() {
  const submitVoicemail = useSubmitVoicemail();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const blobUrlRef = useRef(null);
  blobUrlRef.current = blobUrl;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);
    setSubmitted(false);
    setBlob(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was denied — allow it in your browser to record.');
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const recorded = new Blob(chunksRef.current, { type: 'audio/webm' });
      setBlob(recorded);
      setBlobUrl(URL.createObjectURL(recorded));
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
    setSeconds(0);
    secondsRef.current = 0;
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_SECONDS) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }

  function handleSubmit() {
    if (!blob) return;
    submitVoicemail.mutate(
      { blob, durationSeconds: Math.max(1, Math.min(secondsRef.current, MAX_SECONDS)) },
      {
        onSuccess: () => {
          setSubmitted(true);
          setBlob(null);
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
          }
        },
        onError: (err) => setError(err.message)
      }
    );
  }

  return (
    <div className="mb-5 rounded border border-border bg-surface p-4">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Record a Voicemail</div>
      <div className="mb-3 text-[12px] text-ink-500">
        Up to {MAX_SECONDS} seconds. Recordings go for approval before they can be shared.
      </div>

      <div className="flex items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
          >
            {blob ? 'Re-record' : 'Start Recording'}
          </button>
        ) : (
          <button type="button" onClick={stopRecording} className="rounded bg-danger px-4 py-2 text-xs font-semibold text-white">
            Stop ({MAX_SECONDS - seconds}s left)
          </button>
        )}

        {recording && (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Recording… {seconds}s
          </span>
        )}
      </div>

      {blobUrl && !recording && (
        <div className="mt-3 flex items-center gap-3">
          <audio controls src={blobUrl} className="h-9" />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitVoicemail.isPending}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {submitVoicemail.isPending ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {submitted && <div className="mt-2 text-xs font-semibold text-success">Submitted — awaiting approval.</div>}
      {error && <div className="mt-2 text-xs font-semibold text-danger">{error}</div>}
    </div>
  );
}
