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
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const title = document.title;
      const description =
        document.querySelector<HTMLMetaElement>('meta[name="description"]')
          ?.content || null;
      const og_image =
        document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
          ?.content || null;
      const og_title =
        document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
          ?.content || null;
      const og_description =
        document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
          ?.content || null;
      const og_type =
        document.querySelector<HTMLMetaElement>('meta[property="og:type"]')
          ?.content || null;
      const faviconLink =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
        document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
      const favicon_url = faviconLink?.href || null;
      return { title, description, og_image, og_title, og_description, og_type, favicon_url };
    },
  });

  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to extract metadata');
  }
  return result as PageMetadata;
}
