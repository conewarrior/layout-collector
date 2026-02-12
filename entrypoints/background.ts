export default {
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: { type: string; tabId?: number },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: { dataUrl?: string; error?: string }) => void
      ) => {
        if (message.type === 'capture-tab') {
          chrome.tabs.captureVisibleTab(
            { format: 'jpeg', quality: 80 },
            (dataUrl: string) => {
              if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
              } else {
                sendResponse({ dataUrl });
              }
            }
          );
          return true;
        }
      }
    );
  },
};
