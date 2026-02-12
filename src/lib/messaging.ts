export interface PageMetadata {
  title: string;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_type: string | null;
  favicon_url: string | null;
}

export function isRestrictedUrl(url: string): boolean {
  const restricted = ['chrome://', 'about:', 'chrome-extension://', 'data:'];
  return restricted.some((prefix) => url.startsWith(prefix));
}

export async function captureCurrentTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'capture-tab' },
      (response: { dataUrl?: string; error?: string }) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else if (response.dataUrl) {
          resolve(response.dataUrl);
        } else {
          reject(new Error('No screenshot data received'));
        }
      }
    );
  });
}

export async function extractMetadata(tabId: number): Promise<PageMetadata> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'extract-metadata' },
      (response: PageMetadata & { error?: string }) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve({
            title: response.title,
            description: response.description,
            og_image: response.og_image,
            og_title: response.og_title,
            og_description: response.og_description,
            og_type: response.og_type,
            favicon_url: response.favicon_url,
          });
        }
      }
    );
  });
}
