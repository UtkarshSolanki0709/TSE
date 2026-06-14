// This script runs on the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    // Basic extraction logic
    const title = document.title;
    const url = window.location.href;
    
    // Remove noise
    const scripts = document.querySelectorAll('script, style, nav, footer, header');
    scripts.forEach(s => s.remove());
    
    const content = document.body.innerText.replace(/\s+/g, ' ').trim();
    
    sendResponse({ url, title, content });
  }
  return true;
});
