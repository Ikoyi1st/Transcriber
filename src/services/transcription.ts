type AudioAsset = {
  mimeType?: string;
  name: string;
  file: File;
};

type PuterSpeechResult = {
  segments?: Array<{
    speaker?: string;
    text?: string;
  }>;
  text?: string;
};

type TranscribeParams = {
  audio: AudioAsset;
  endpoint: string;
  language?: string;
};

type TranscriptionResponse = {
  text: string;
};

type PuterTranscribeParams = {
  audio: AudioAsset;
  language?: string;
  model?: string;
};

function normalizePuterResult(result: string | PuterSpeechResult): TranscriptionResponse {
  if (typeof result === "string") {
    return { text: result };
  }

  if (result.text) {
    return { text: result.text };
  }

  if (result.segments?.length) {
    const text = result.segments
      .map((segment) => {
        const speaker = segment.speaker ? `${segment.speaker}: ` : "";
        return `${speaker}${segment.text ?? ""}`.trim();
      })
      .join("\n");

    if (text) {
      return { text };
    }
  }

  throw new Error("Puter did not return transcription text.");
}

export async function transcribeAudio({ audio, endpoint, language }: TranscribeParams): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append("file", audio.file, audio.name);
  if (language) {
    formData.append("language", language);
  }

  let result: Response;
  try {
    result = await fetch(endpoint, {
      body: formData,
      method: "POST",
    });
  } catch {
    throw new Error(
      `Could not reach the transcription server at ${endpoint}. Make sure the backend is running and that this URL is correct.`,
    );
  }

  const parsed = (await result.json().catch(() => ({}))) as Partial<TranscriptionResponse> & { error?: string };

  if (!result.ok) {
    throw new Error(parsed.error ?? `Server returned status ${result.status}.`);
  }

  if (!parsed.text) {
    throw new Error(parsed.error ?? "The server did not return transcription text.");
  }

  return { text: parsed.text };
}

export async function transcribeAudioWithPuter({
  audio,
  language,
  model = "gpt-4o-mini-transcribe",
}: PuterTranscribeParams): Promise<TranscriptionResponse> {
  if (typeof window === "undefined" || !window.puter?.ai?.speech2txt) {
    throw new Error("Puter.js is not loaded. Refresh the page and try again.");
  }

  const result = await window.puter.ai.speech2txt(audio.file, {
    language,
    model,
  });

  return normalizePuterResult(result);
}
