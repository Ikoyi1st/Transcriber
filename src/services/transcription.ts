type AudioAsset = {
  mimeType?: string;
  name: string;
  file: File;
};

type TranscribeParams = {
  audio: AudioAsset;
  endpoint: string;
  language?: string;
};

type TranscriptionResponse = {
  text: string;
};

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
