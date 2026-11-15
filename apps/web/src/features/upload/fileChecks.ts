import { UPLOAD_LIMITS } from "@tailorcv/shared";
import type { FriendlyError } from "../../api/errorMessages";

/**
 * Instant checks in the browser, so obvious mistakes never wait for a slow upload. The API still
 * enforces everything (type by magic bytes, size, pages, encryption); these use the SAME shared
 * limits so messages match.
 */
export function checkResumeFile(file: File): FriendlyError | null {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) {
    return {
      title: "That isn't a PDF",
      message: "Please choose your resume as a PDF file.",
      action: "choose-file",
    };
  }
  if (file.size === 0) {
    return {
      title: "That file is empty",
      message: "Please choose another copy of your resume.",
      action: "choose-file",
    };
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      title: "That file is too large",
      message: `It's ${mb} MB; the limit is ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB. Try exporting the PDF again, or compressing it.`,
      action: "choose-file",
    };
  }
  return null;
}
