# Live Audio Transcriber

A React website for hosting in the browser that can:

- record live audio with the browser microphone
- upload local audio or video files
- transcribe audio to text through a backend endpoint
- export the transcript as `.txt`, `.doc`, or `.pdf`

## Stack

- React 19 + Vite
- browser `MediaRecorder` for live audio capture
- browser file input for local uploads
- `fetch` + `FormData` for transcription uploads
- `jspdf` for PDF export
- OpenAI Audio Transcriptions API on the backend

## Project Structure

- `src/App.tsx` contains the website UI and recording flow
- `src/services/transcription.ts` uploads audio to your backend
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

### 2. Run the transcription server

```powershell
cd server
npm run dev
```

This starts the backend on `http://localhost:3001`.

### 3. Configure the frontend

Create a `.env` file in the project root if you want a default backend URL:

```powershell
copy .env.example .env
```

The default variable is:

```text
VITE_TRANSCRIPTION_API_URL=/api/transcribe
```

### 4. Start the website locally

From the project root:

```powershell
npm run dev
```

The site will run on `http://localhost:5173`.

While developing locally, Vite proxies `/api/*` to `http://localhost:3001`, so you usually do not need to type the full backend URL in the app.

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
2. The website sends that file to your backend endpoint using `multipart/form-data`.
3. The backend forwards the audio to OpenAI transcription.
4. Returned text is shown on the page.
5. The transcript downloads as `.txt`, `.doc`, or `.pdf`.

## Notes

- Browser microphone recording works best in current versions of Chrome or Edge.
- The backend validates supported input formats: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`.
- OpenAI transcription currently supports uploads up to 25 MB per request.
- For larger files, backend chunking would be the next improvement.
