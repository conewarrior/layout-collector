export default {
  matches: ['<all_urls>'],
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: { type: string },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: {
          title?: string;
          description?: string | null;
          og_image?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_type?: string | null;
          favicon_url?: string | null;
          error?: string;
        }) => void
      ) => {
        if (message.type === 'extract-metadata') {
          try {
            const title = document.title;
            const description =
              document.querySelector<HTMLMetaElement>('meta[name="description"]')
                ?.content || null;
            const ogImage =
              document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
                ?.content || null;
            const ogTitle =
              document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
                ?.content || null;
            const ogDescription =
              document.querySelector<HTMLMetaElement>(
                'meta[property="og:description"]'
              )?.content || null;
            const ogType =
              document.querySelector<HTMLMetaElement>('meta[property="og:type"]')
                ?.content || null;

            const faviconLink =
              document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
              document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
            const faviconUrl = faviconLink?.href || null;

            sendResponse({
              title,
              description,
              og_image: ogImage,
              og_title: ogTitle,
              og_description: ogDescription,
              og_type: ogType,
              favicon_url: faviconUrl,
            });
          } catch (error) {
            sendResponse({
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          return true;
        }
      }
    );
  },
};
