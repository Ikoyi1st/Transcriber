import { jsPDF } from "jspdf";

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function makeReadableDate() {
  return new Date().toLocaleString();
}

function downloadBlob(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportTranscriptAsText(transcript: string) {
  const fileName = `transcript-${makeTimestamp()}.txt`;
  downloadBlob(transcript, fileName, "text/plain;charset=utf-8");
  return fileName;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTranscriptHtml(transcript: string, title: string) {
  const safeTranscript = escapeHtml(transcript).replaceAll("\n", "<br />");
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 24px; }
          body { font-family: Helvetica, Arial, sans-serif; color: #1d2d24; }
          h1 { color: #173b2f; font-size: 24px; margin-bottom: 8px; }
          p { font-size: 13px; line-height: 1.7; }
          .meta { color: #5d695f; font-size: 11px; margin-bottom: 20px; }
          .transcript { white-space: normal; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Generated ${escapeHtml(makeReadableDate())}</p>
        <p class="transcript">${safeTranscript}</p>
      </body>
    </html>
  `;
}

export async function exportTranscriptAsDocument(transcript: string) {
  const fileName = `transcript-${makeTimestamp()}.doc`;
  downloadBlob(buildTranscriptHtml(transcript, "Transcript Export"), fileName, "application/msword");
  return fileName;
}

export async function exportTranscriptAsPdf(transcript: string) {
  const pdf = new jsPDF({
    format: "a4",
    unit: "pt",
  });
  const margin = 42;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Transcript Export", margin, y);
  y += 24;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(93, 105, 95);
  pdf.text(`Generated ${makeReadableDate()}`, margin, y);
  y += 24;

  pdf.setTextColor(29, 45, 36);
  pdf.setFontSize(12);
  const lines = pdf.splitTextToSize(transcript || " ", maxWidth);

  lines.forEach((line: string) => {
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 18;
  });

  const fileName = `transcript-${makeTimestamp()}.pdf`;
  pdf.save(fileName);
  return fileName;
}
