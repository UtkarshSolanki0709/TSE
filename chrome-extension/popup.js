document.getElementById('indexBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = "Extracting...";
  statusEl.className = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.startsWith('chrome://')) {
      statusEl.textContent = "Cannot index system pages";
      statusEl.className = "error";
      return;
    }

    // Inject and call extraction
    chrome.tabs.sendMessage(tab.id, { action: "extractText" }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        statusEl.textContent = "Error: Please refresh the page and try again";
        statusEl.className = "error";
        return;
      }

      statusEl.textContent = "Sending to TSE Engine...";
      
      try {
        const res = await fetch('http://localhost:3000/crawl/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        });

        if (res.ok) {
          statusEl.textContent = "Successfully Indexed!";
          statusEl.className = "success";
        } else {
          statusEl.textContent = "Engine error: " + res.statusText;
          statusEl.className = "error";
        }
      } catch (e) {
        statusEl.textContent = "Could not connect to localhost:3000";
        statusEl.className = "error";
      }
    });
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "error";
  }
});
