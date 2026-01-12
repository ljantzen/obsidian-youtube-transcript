import { describe, it, expect } from 'vitest';

// Test helper function that matches the implementation
const formatTimestamp = (
  seconds: number,
  videoUrl: string,
  videoId: string,
  localVideoDirectory?: string,
): string => {
  // Format seconds as MM:SS or HH:MM:SS
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let timeString: string;
  if (hours > 0) {
    timeString = `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    timeString = `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  
  // Create markdown link to video at this timestamp
  let timestampUrl: string;
  if (localVideoDirectory && localVideoDirectory.trim() !== "") {
    // Use local file URL if directory is configured
    // Normalize directory path (remove trailing slashes, ensure forward slashes, remove leading slash)
    let normalizedDir = localVideoDirectory
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+$/, "")
      .replace(/^\/+/, ""); // Remove leading slashes to avoid file:////
    // Format: file:///path/to/directory/video-id.mp4?t=SECONDS
    timestampUrl = `file:///${normalizedDir}/${videoId}.mp4?t=${Math.floor(seconds)}`;
  } else {
    // Use YouTube URL
    // YouTube URL format: https://www.youtube.com/watch?v=VIDEO_ID&t=SECONDSs
    timestampUrl = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}t=${Math.floor(seconds)}s`;
  }
  return `[${timeString}](${timestampUrl})`;
};

describe('formatTimestamp', () => {
  const videoId = 'dQw4w9WgXcQ';
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  describe('YouTube URL format', () => {
    it('should format timestamp with YouTube URL when no local directory', () => {
      const result = formatTimestamp(330, videoUrl, videoId);
      expect(result).toContain('[5:30]');
      expect(result).toContain('youtube.com');
      expect(result).toContain('dQw4w9WgXcQ');
      expect(result).toContain('t=330s');
    });

    it('should format timestamp with YouTube URL when local directory is empty', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '');
      expect(result).toContain('[5:30]');
      expect(result).toContain('youtube.com');
      expect(result).toContain('dQw4w9WgXcQ');
      expect(result).toContain('t=330s');
    });

    it('should format timestamp with YouTube URL when local directory is whitespace', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '   ');
      // Whitespace-only strings are trimmed and treated as empty, so should use YouTube URL
      expect(result).toContain('youtube.com');
      expect(result).toContain('t=330s');
    });

    it('should handle YouTube URL with existing query parameters', () => {
      const urlWithParams = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx';
      const result = formatTimestamp(330, urlWithParams, videoId);
      expect(result).toContain('[5:30]');
      expect(result).toContain('youtube.com');
      expect(result).toContain('dQw4w9WgXcQ');
      expect(result).toContain('list=PLxxx');
      expect(result).toContain('t=330s');
    });
  });

  describe('Local file URL format', () => {
    it('should format timestamp with local file URL when directory is set', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '/path/to/videos');
      expect(result).toBe('[5:30](file:///path/to/videos/dQw4w9WgXcQ.mp4?t=330)');
    });

    it('should normalize Windows-style paths to forward slashes', () => {
      const result = formatTimestamp(330, videoUrl, videoId, 'C:\\Users\\Videos');
      expect(result).toBe('[5:30](file:///C:/Users/Videos/dQw4w9WgXcQ.mp4?t=330)');
    });

    it('should remove trailing slashes from directory path', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '/path/to/videos/');
      expect(result).toBe('[5:30](file:///path/to/videos/dQw4w9WgXcQ.mp4?t=330)');
    });

    it('should handle multiple trailing slashes', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '/path/to/videos///');
      expect(result).toBe('[5:30](file:///path/to/videos/dQw4w9WgXcQ.mp4?t=330)');
    });

    it('should handle directory with spaces', () => {
      const result = formatTimestamp(330, videoUrl, videoId, '/path/to/my videos');
      expect(result).toBe('[5:30](file:///path/to/my videos/dQw4w9WgXcQ.mp4?t=330)');
    });
  });

  describe('Time formatting', () => {
    it('should format time as MM:SS for times under an hour', () => {
      const result = formatTimestamp(330, videoUrl, videoId);
      expect(result).toMatch(/\[5:30\]/);
    });

    it('should format time as HH:MM:SS for times over an hour', () => {
      const result = formatTimestamp(3661, videoUrl, videoId); // 1:01:01
      expect(result).toMatch(/\[1:01:01\]/);
    });

    it('should pad minutes and seconds with zeros', () => {
      const result = formatTimestamp(65, videoUrl, videoId); // 1:05
      expect(result).toMatch(/\[1:05\]/);
    });

    it('should handle zero seconds', () => {
      const result = formatTimestamp(0, videoUrl, videoId);
      expect(result).toMatch(/\[0:00\]/);
    });

    it('should floor decimal seconds', () => {
      const result = formatTimestamp(330.7, videoUrl, videoId);
      expect(result).toContain('t=330');
    });
  });

  describe('Video ID handling', () => {
    it('should use correct video ID in local file URL', () => {
      const result = formatTimestamp(330, videoUrl, 'testVideo123', '/videos');
      expect(result).toBe('[5:30](file:///videos/testVideo123.mp4?t=330)');
    });

    it('should handle video IDs with special characters', () => {
      const result = formatTimestamp(330, videoUrl, 'abc-def_123', '/videos');
      expect(result).toBe('[5:30](file:///videos/abc-def_123.mp4?t=330)');
    });
  });
});
