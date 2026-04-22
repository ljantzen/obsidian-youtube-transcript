/**
 * Centralized template variable replacement for consistency across the codebase.
 * Supports: {VideoName}, {ChannelName}, {PdfDirectory}, {PdfLink}, {SrtLink}
 */

import { sanitizeFilename } from "../utils";

export interface TemplateVariables {
  videoTitle?: string;
  channelName?: string | null;
  pdfDirectory?: string | null;
  pdfLink?: string | null;
  srtLink?: string | null;
  videoUrl?: string;
  summary?: string | null;
  videoId?: string;
  lengthSeconds?: string;
  viewCount?: string;
  publishDate?: string;
  description?: string;
  channelId?: string;
  isLive?: string;
  isPrivate?: string;
  isUnlisted?: string;
}

/**
 * Replace template variables in a string.
 * Handles {VideoName}, {ChannelName}, {PdfDirectory}, and optionally additional variables.
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables,
): string {
  let result = template;

  // Replace {VideoName}
  if (variables.videoTitle) {
    const sanitizedVideoName = sanitizeFilename(variables.videoTitle);
    result = result.replace(/{VideoName}/g, sanitizedVideoName);
  } else {
    result = result.replace(/{VideoName}/g, "");
  }

  // Replace {ChannelName}
  if (variables.channelName) {
    const sanitizedChannelName = sanitizeFilename(variables.channelName);
    result = result.replace(/{ChannelName}/g, sanitizedChannelName);
  } else {
    result = result.replace(/{ChannelName}/g, "");
  }

  // Replace {PdfDirectory}
  if (variables.pdfDirectory) {
    result = result.replace(/{PdfDirectory}/g, variables.pdfDirectory);
  } else {
    result = result.replace(/{PdfDirectory}/g, "");
  }

  // Replace {PdfLink}
  if (variables.pdfLink) {
    result = result.replace(/{PdfLink}/g, variables.pdfLink);
  } else {
    result = result.replace(/{PdfLink}/g, "");
  }

  // Replace {SrtLink}
  if (variables.srtLink) {
    result = result.replace(/{SrtLink}/g, variables.srtLink);
  } else {
    result = result.replace(/{SrtLink}/g, "");
  }

  // Replace {VideoUrl}
  if (variables.videoUrl) {
    result = result.replace(/{VideoUrl}/g, variables.videoUrl);
  } else {
    result = result.replace(/{VideoUrl}/g, "");
  }

  // Replace {Summary}
  if (variables.summary) {
    result = result.replace(/{Summary}/g, variables.summary);
  } else {
    result = result.replace(/{Summary}/g, "");
  }

  return result;
}
