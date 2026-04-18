# Live Audio Transcriber

A React website for hosting in the browser that can:

- record live audio with the browser microphone
- upload local audio or video files
- transcribe audio to text through Puter.js or a backend endpoint
- export the transcript as `.txt`, `.doc`, or `.pdf`

## Stack

- React 19 + Vite
- browser `MediaRecorder` for live audio capture
- browser file input for local uploads
- Puter.js for browser-side speech-to-text
- `fetch` + `FormData` for transcription uploads
- `jspdf` for PDF export
- OpenAI Audio Transcriptions API on the backend

## Project Structure

- `src/App.tsx` contains the website UI and recording flow
- `src/services/transcription.ts` handles Puter.js and backend transcription flows
- `src/utils/exporters.ts` creates TXT, DOC, and PDF downloads
- `server/index.js` is the Express proxy that calls OpenAI securely

## Setup

### 1. Install dependencies

From the project root:

```powershell
npm install
```

From the `server` folder:

```powershell
cd server
npm install
copy .env.example .env
```

Then set `OPENAI_API_KEY` in `server/.env`.

### 2. Choose your transcription path

You now have two options:

- `Puter.js`: browser-side transcription with no API key or server required
- `server/`: your own backend proxy to OpenAI

### 3. Optional: run the transcription server

```powershell
cd server
npm run dev
```

This starts the backend on `http://localhost:3001`.

### 4. Configure the frontend

Create a `.env` file in the project root if you want a default backend URL:

```powershell
copy .env.example .env
```

The default variable is:

```text
VITE_TRANSCRIPTION_API_URL=/api/transcribe
```

### 5. Start the website locally

From the project root:

```powershell
npm run dev
```

The site will run on `http://localhost:5173`.

While developing locally, Vite proxies `/api/*` to `http://localhost:3001`, so you usually do not need to type the full backend URL in the app.
If you choose the Puter.js option in the app UI, you can transcribe without running the `server` folder at all.

## Build For Hosting

Create a production build with:

```powershell
npm run build
```

The static website output is generated in `dist/`. You can deploy that folder to Netlify, Vercel, GitHub Pages, or any static hosting provider.

Important:

- the React site can be hosted statically
- the `server` folder still needs to run on a backend host because your OpenAI API key must stay private
- set the hosted frontend to point at your deployed backend URL if frontend and backend are on different domains

## How It Works

1. Record audio in the browser or choose an existing local file.
2. The website either sends that file to Puter.js directly in the browser or to your backend endpoint.
3. The chosen provider returns transcription text.
4. Returned text is shown on the page.
5. The transcript downloads as `.txt`, `.doc`, or `.pdf`.

## Notes

- Browser microphone recording works best in current versions of Chrome or Edge.
- Puter's official tutorial says you can call `puter.ai.speech2txt()` directly from the browser using `https://js.puter.com/v2/`, with no API key or backend required.
- The website now accepts imported audio files up to 200 MB.
- The backend validates supported input formats: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`.
- OpenAI's official speech-to-text docs currently say a single transcription upload is limited to 25 MB, so files above that need chunking if you use the custom backend path.
- For larger files, backend chunking would be the next improvement.
