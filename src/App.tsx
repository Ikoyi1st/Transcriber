import { useEffect, useMemo, useRef, useState } from "react";
import { exportTranscriptAsDocument, exportTranscriptAsPdf, exportTranscriptAsText } from "./utils/exporters";
import { transcribeAudio } from "./services/transcription";
import "./styles.css";

type AudioAsset = {
  file: File;
  mimeType?: string;
  name: string;
  size: number;
};

const DEFAULT_API_URL = import.meta.env.VITE_TRANSCRIPTION_API_URL ?? "/api/transcribe";
const RECORDING_EXTENSION = "webm";

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((candidate) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate));
}

export default function App() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [transcriptionUrl, setTranscriptionUrl] = useState(DEFAULT_API_URL);
  const [selectedAudio, setSelectedAudio] = useState<AudioAsset | null>(null);
  const [transcript, setTranscript] = useState("");
  const [languageHint, setLanguageHint] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready to record or upload audio.");
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const durationLabel = useMemo(() => formatDuration(durationMs), [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support live microphone recording.");
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("This browser cannot create a supported audio recording format.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `recording-${Date.now()}.${RECORDING_EXTENSION}`, {
          type: mimeType,
        });
        setSelectedAudio({
          file,
          mimeType: file.type,
          name: file.name,
          size: file.size,
        });
        setStatusMessage("Recording saved. You can transcribe it now.");
        stream.getTracks().forEach((track) => track.stop());
      });

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.start();

      setDurationMs(0);
      setIsRecording(true);
      setStatusMessage("Recording live audio...");

      timerRef.current = window.setInterval(() => {
        setDurationMs((current) => current + 1000);
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start recording.";
      setStatusMessage("Recording could not start.");
      window.alert(message);
    }
  };

  const handleStopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to stop recording.";
      setStatusMessage("Recording could not be finalized.");
      window.alert(message);
    }
  };

  const handlePickAudio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedAudio({
      file,
      mimeType: file.type,
      name: file.name,
      size: file.size,
    });
    setStatusMessage(`Selected ${file.name}. Ready for transcription.`);
    event.target.value = "";
  };

  const handleTranscribe = async () => {
    if (!selectedAudio) {
      window.alert("Record a clip or upload an audio file first.");
      return;
    }

    if (!transcriptionUrl.trim()) {
      window.alert("Enter the transcription server URL before transcribing.");
      return;
    }

    try {
      setIsBusy(true);
      setStatusMessage("Uploading audio for transcription...");
      const response = await transcribeAudio({
        audio: selectedAudio,
        endpoint: transcriptionUrl.trim(),
        language: languageHint.trim() || undefined,
      });

      setTranscript(response.text);
      setStatusMessage("Transcription complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed.";
      setStatusMessage("Transcription failed.");
      window.alert(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExport = async (exporter: (value: string) => Promise<string>, label: string) => {
    if (!transcript.trim()) {
      window.alert("Create a transcript before exporting.");
      return;
    }

    try {
      setIsBusy(true);
      const fileName = await exporter(transcript);
      setStatusMessage(`${label} exported as ${fileName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label} export failed.`;
      window.alert(message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">React + Web Hosting</p>
        <h1>Live Audio Transcriber</h1>
        <p className="hero-copy">
          Record live audio in the browser, upload local audio, transcribe with your backend, and export the result as
          TXT, DOC, or PDF.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Transcription Server</h2>
          <p className="helper-copy">Point this to the backend endpoint that forwards your audio files to OpenAI.</p>
          <label className="field">
            <span>API endpoint</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setTranscriptionUrl(event.target.value)}
              placeholder="https://your-server.com/api/transcribe"
              type="url"
              value={transcriptionUrl}
            />
          </label>
          <label className="field">
            <span>Language hint</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setLanguageHint(event.target.value)}
              placeholder="Optional, for example en or fr"
              type="text"
              value={languageHint}
            />
          </label>
        </article>

        <article className="panel">
          <h2>Live Audio</h2>
          <div className="status-pill">{isRecording ? `Recording ${durationLabel}` : `Idle ${durationLabel}`}</div>
          <div className="button-row">
            <button className="button button-primary" disabled={isBusy || isRecording} onClick={handleStartRecording} type="button">
              Start Recording
            </button>
            <button className="button button-secondary" disabled={isBusy || !isRecording} onClick={handleStopRecording} type="button">
              Stop Recording
            </button>
          </div>
          <p className="helper-copy">Use a modern browser such as Chrome or Edge for the best microphone support.</p>
        </article>

        <article className="panel">
          <h2>Local Upload</h2>
          <label className="upload-button">
            <input accept="audio/*,video/*" onChange={handlePickAudio} type="file" />
            Choose Audio File
          </label>
          <p className="selection-copy">
            {selectedAudio
              ? `Selected: ${selectedAudio.name} (${Math.round(selectedAudio.size / 1024)} KB)`
              : "No audio file selected yet."}
          </p>
        </article>

        <article className="panel panel-wide">
          <h2>Transcription</h2>
          <div className="button-row">
            <button className="button button-primary" disabled={isBusy || !selectedAudio} onClick={handleTranscribe} type="button">
              {isBusy ? "Processing..." : "Transcribe Audio"}
            </button>
          </div>
          <p className="helper-copy">{statusMessage}</p>
          <textarea
            className="transcript-box"
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Your transcript will appear here."
            value={transcript}
          />
        </article>

        <article className="panel panel-wide">
          <h2>Export</h2>
          <div className="button-row">
            <button className="button button-secondary" disabled={isBusy || !transcript} onClick={() => void handleExport(exportTranscriptAsText, "TXT")} type="button">
              Export TXT
            </button>
            <button className="button button-secondary" disabled={isBusy || !transcript} onClick={() => void handleExport(exportTranscriptAsDocument, "DOC")} type="button">
              Export DOC
            </button>
            <button className="button button-primary" disabled={isBusy || !transcript} onClick={() => void handleExport(exportTranscriptAsPdf, "PDF")} type="button">
              Export PDF
            </button>
          </div>
          <p className="helper-copy">Exports download directly in the browser, which is better suited for website hosting than native share sheets.</p>
        </article>
      </section>
    </main>
  );
}
