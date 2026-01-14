// VocaLearn Content Script - Injects the elegant UI when users double-click on words

// Configuration variables
const DEFAULT_LANGUAGE = "bn"
const DEFAULT_TRIGGER_KEY = "dblclick"
const DEFAULT_MODIFIER_KEY = "none"
let TRIGGER_KEY = DEFAULT_TRIGGER_KEY
let modifierKey = DEFAULT_MODIFIER_KEY

// Main function to show the elegant popup
function showMeaning(event, info = getSelectionInfo(event)) {
  // Get information about the selected text
  //const info = getSelectionInfo(event);
  removeExistingPopups();

  if (!info) return;

  const isTranslation = event.target.isTranslation === true;




  console.log("showMeaning block <>", { ...info, isTranslation });
  console.log("showMeaning is bangla <>", containsBengali(info.word));
  const sourceLang = containsBengali(info.word) ? "bn" : "en";
  const targetLang = sourceLang === "bn" ? "en" : "bn";
  ensureFontLoaded().catch(error => {
    console.error("Font loading error:", error);
  });

  if (isTranslation) {
    console.log("showMeaning translation block <>", { ...info, isTranslation });
    // Handle translation for multiple words
    chrome.runtime.sendMessage({
      message: "translate_phrase",
      text: info.word,
      lang: DEFAULT_LANGUAGE,
      sourceLang: sourceLang,
      targetLang: targetLang,
      isOnline: updatedNetworkStatus()
    })
      .then(response => {
        console.log("showMeaning translation response block <>", response);
        if (response && response.translation) {
          console.log("showMeaning translation block <>", response.translation);
          injectTranslationOverlay(response.translation, targetLang)

        } else {
          noMeaningFound(popupElement, true, event, info);
        }
      })
      .catch(error => {
        console.error("Translation error:", error);
        noMeaningFound(popupElement, true, event, info);
      });
  } else {

    // Create the elegant popup with shimmer loading effect
    const popupElement = createElegantPopup(info);
    document.body.appendChild(popupElement.hostDiv);

    // For Bengali words, show no meaning found
    if (containsBengali(info.word)) {
      noMeaningFound(popupElement, false, event, info);
      return;
    }

    // Handle single word lookup
    chrome.storage.local.set({ selectedWord: info.word });

    retrieveMeaning(info)
      .then((response) => {
        if (!response.content || !response.content.definitions || response.content.definitions.length === 0) {
          console.log("noMeaningFound block <>", response);
          return noMeaningFound(popupElement, response.isOnline, event, info);
        }
        console.log('[STORAGE] updatePopupWithData called:', response.content);
        updatePopupWithData(popupElement, info, response.content, response.isOnline);
      })
      .catch((error) => {
        console.error("Error retrieving meaning:", error);
        noMeaningFound(popupElement, true, event, info);
      });
  }
}

async function ensureFontLoaded() {
  // Check if the font is already loaded
  if (document.querySelector('link[href*="Tiro+Bangla"]')) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap';
    link.rel = 'stylesheet';
    link.onload = resolve;
    document.head.appendChild(link);
  });
}

// Add this function to your content script
function injectTranslationOverlay(translation, targetLang) {
  // Get the current selection
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Get the element at the selection start
  let element = selection.anchorNode;
  if (element.nodeType !== Node.ELEMENT_NODE) {
    element = element.parentNode;
  }

  const computedStyle = window.getComputedStyle(element);
  const overlayHeight = rect.height;
  const overlayWidth = rect.width;
  // Create the translation overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY - 5}px`;
  overlay.style.height = `${overlayHeight + 25}px`;
  overlay.style.width = `${overlayWidth + 10}px`;
  // Position above the selection
  overlay.style.backgroundColor = '#e6fffaE6';  // 80 is 50% transparency in hex
  overlay.style.color = '#047857';
  overlay.style.padding = '2px 6px';
  overlay.style.borderRadius = '4px';
  overlay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  overlay.style.zIndex = '2147483647';
  overlay.style.lineHeight = '1.4';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.fontFamily = targetLang === 'bn' ? 'Tiro Bangla, sans-serif' : computedStyle.fontFamily;
  overlay.style.alignItems = 'center';      // Vertical centering
  overlay.style.justifyContent = 'center';  // Horizontal centering
  overlay.style.textAlign = 'center';
  overlay.style.wordWrap = 'break-word';
  overlay.style.whiteSpace = 'normal';
  overlay.style.fontSize = targetLang === 'bn' ? computedStyle.fontSize : '16px';
  overlay.style.fontWeight = computedStyle.fontWeight;
  overlay.textContent = translation;

  // Add close button
  // In the injectTranslationOverlay function, replace the close button creation with:
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn close-btn';
  closeBtn.title = 'Close';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '2px';
  closeBtn.style.right = '6px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.padding = '2px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.width = '20px';
  closeBtn.style.height = '20px';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.transition = 'background-color 0.2s';

  // Add hover effect
  closeBtn.onmouseover = () => {
    closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.backgroundColor = 'transparent';
  };
  isTranslationUiVisible = true;
  // Add SVG icon
  closeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" 
         fill="none" 
         viewBox="0 0 24 24" 
         stroke="#666" 
         width="16" 
         height="16">
        <path stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M6 18L18 6M6 6l12 12" />
    </svg>
`;

  closeBtn.onclick = (e) => {
    console.log("closeBtn onclick selectionText <>", selectionText)
    selectionText = "";
    isTranslationUiVisible = false;
    e.stopPropagation();
    overlay.remove();
  };


  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  // Remove overlay when clicking outside
  const onClickOutside = (e) => {
    console.log("onClickOutside selectionText <>", selectionText)
    if (!overlay.contains(e.target)) {
      overlay.remove();
      document.removeEventListener('click', onClickOutside);
      isTranslationUiVisible = false;
    }
  };
  document.addEventListener('click', onClickOutside);

  return overlay;
}

const CAPTION_SELECTOR = ".ytp-caption-segment"; // YouTube caption text nodes

const VALID_WORD_REGEX = /^[“"'\(\[\{]*([A-Za-z]+(?:['-][A-Za-z]+)*)[.,!?;:“"'\)\]\}]*$/;

function isValidWord(text) {
  const match = text.match(VALID_WORD_REGEX);
  if (!match) return false;     // not a valid word
  return true;
}

function getCleanWord(text) {
  const match = text.match(VALID_WORD_REGEX);
  return match ? match[1] : null; // returns the word without punctuation
}

function makeWordClickable(el) {

  if (el.dataset.processed) return;
  el.dataset.processed = "true";

  const text = el.textContent;
  console.log("text", text);
  if (!text.trim()) return;

  // Split text into words, keep spaces intact
  const words = text.split(/(\s+)/);
  console.log("words", words);
  el.innerHTML = words
    .map(word => {
      if (isValidWord(word)) {
        return `<span class="clickable-word" style="cursor:pointer;">${word}</span>`;
      }
      return word;
    })
    .join("");

  el.querySelectorAll(".clickable-word").forEach(span => {
    // store original colors once
    if (!span.dataset.origBg) {
      const cs = window.getComputedStyle(span);
      span.dataset.origBg = cs.backgroundColor;
      span.dataset.origColor = cs.color;
    }

    // Hover effect
    span.addEventListener("mouseenter", () => {
      span.style.backgroundColor = "rgba(230, 255, 250, 0.2)"; // hover bg
      span.style.color = "#fff";                              // hover text
      span.style.borderRadius = "4px";
    });

    span.addEventListener("mouseleave", () => {
      span.style.backgroundColor = span.dataset.origBg; // restore original
      span.style.color = span.dataset.origColor;
      span.style.borderRadius = "";                     // optional
    });

    span.addEventListener("click", e => {
      e.stopPropagation();

      const word = getCleanWord(span.textContent.trim());
      console.log("click event", e);
      console.log("Clicked word:", word);

      // 💡 Example: open your dictionary popup or overlay here
      // Create a mock event that's compatible with showMeaning
      const mockEvent = {
        target: span,  // The clicked element
        isTranslation: false,  // Set to true if you want translation
        clientX: e.clientX,    // Mouse X position
        clientY: e.clientY,    // Mouse Y position
        pageX: e.pageX,        // Page-relative X
        pageY: e.pageY,        // Page-relative Y
        // Add any other properties that getSelectionInfo might need
        getBoundingClientRect: () => ({
          left: e.pageX,
          top: e.pageY,
          width: span.offsetWidth,
          height: span.offsetHeight,
          right: e.pageX + span.offsetWidth,
          bottom: e.pageY + span.offsetHeight
        })
      };

      // Add the isTranslation flag to the target if needed
      mockEvent.target.isTranslation = false; // or true for translation

      // Call showMeaning with the mock event

      const selectionInfo = getSelectionInfo(mockEvent, word, mockEvent.getBoundingClientRect())
      showMeaning(mockEvent, selectionInfo);
    });
  });
}

const observer = new MutationObserver(() => {
  const captions = document.querySelectorAll(CAPTION_SELECTOR);
  console.log("captions", captions);
  captions.forEach(makeWordClickable);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// window.addEventListener('yt-page-data-updated', observeYouTubeCaptions);
// window.addEventListener('load', observeYouTubeCaptions);

window.addEventListener('resize', () => {
  const captionContainer = document.querySelector('.ytp-caption-window-container');
  const overlay = document.getElementById('my-caption-overlay');
  if (captionContainer && overlay) {
    const rect = captionContainer.getBoundingClientRect();
    overlay.style.bottom = `${window.innerHeight - rect.bottom}px`;
  }
});



function retrieveMeaningWithMode(info, isOnline, popupElement, event) {
  // This function should call your backend with the forced isOnline value
  retrieveMeaning({ ...info, forceOnline: isOnline })
    .then((response) => {
      if (!response.content) {
        return noMeaningFound(popupElement, isOnline, event, info);
      }
      updatePopupWithData(popupElement, info, response.content, isOnline);
    })
    .catch((error) => {
      console.error("Error retrieving meaning:", error);
      noMeaningFound(popupElement, isOnline, event, info);
    });
}

function updatedNetworkStatus() {
  const isOnline = navigator.onLine;
  console.log("Network status:", isOnline);
  return isOnline
}

// Get information about the selected text and its position
function getSelectionInfo(event, word = window.getSelection().toString().trim(), boundingRect = getSelectionCoords(window.getSelection())) {

  console.log("getSelectionInfo block <>", event)
  console.log("getSelectionInfo block <>", word)
  console.log("getSelectionInfo block <>", boundingRect)

  if (word == null || boundingRect == null) {
    return null
  }

  const top = boundingRect.top + window.scrollY
  const bottom = boundingRect.bottom + window.scrollY
  const left = boundingRect.left + window.scrollX

  return {
    top: top,
    bottom: bottom,
    left: left,
    word: word,
    clientY: event.clientY,
    height: boundingRect.height,
    forceOnline: event.forceOnline
  }
}

// Get the coordinates of the selected text
function getSelectionCoords(selection) {
  const oRange = selection.getRangeAt(0)
  return oRange.getBoundingClientRect()
}

// Create the elegant popup UI with shimmer loading effect
function createElegantPopup(info) {
  // Create the main container with shadow DOM for style isolation
  const hostDiv = document.createElement("div")
  hostDiv.className = "voca-popup-container"
  hostDiv.style.position = "absolute"
  hostDiv.style.zIndex = "2147483647" // Maximum z-index
  hostDiv.style.left = `${info.left - 10}px`

  // Position above or below based on selection position
  const isTopHalf = info.clientY < window.innerHeight / 2
  if (isTopHalf) {
    hostDiv.style.top = `${info.bottom + 10}px`
    hostDiv.dataset.position = "bottom"
    if (info.height == 0) {
      hostDiv.style.top = `${Number.parseInt(hostDiv.style.top) + 8}px`
    }
  } else {
    hostDiv.style.top = `${info.top - 10}px` // Will adjust after content is added
    hostDiv.dataset.position = "top"
    if (info.height == 0) {
      hostDiv.style.top = `${Number.parseInt(hostDiv.style.top) - 8}px`
    }
  }

  // Create shadow DOM for style isolation
  const shadow = hostDiv.attachShadow({ mode: "open" })

  // Add styles
  const style = document.createElement("style")
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&display=swap');
  
     :host {
      /* Light theme (exact original values) */
      --bg: white; /* used for popup background in light mode */
      --popup-border: #e2e8f0; /* border and divider */
      --popup-shadow: rgba(0, 0, 0, 0.15);
      --header-border: #f0f0f0; /* header bottom */
      --title-color: #1a202c; /* word-title */
      --pos-color: #718096; /* word-pos and muted labels */
      --btn-color: #718096; /* default button icon color */
      --btn-hover-bg: #f7fafc;
      --btn-hover-color: #10b981;
      --btn-active-color: #10b981;
      --btn-active-bg: #e6fffa;
      --close-hover-bg: #fef2f2;
      --close-hover-color: #dc2626;
      --offline-not-active-color: #64748b;
      --meaning-color: #334155;
      --translation-bg:  #ecfdf5;
      --translation-text: #047857;
      --examples-title: #718096;
      --example-text: #718096;
      --example-border: #e2e8f0;
      --shimmer-base: #f6f7f8;
      --shimmer-highlight: #edeef1;
      --toast-bg: #ef4444;
      --toast-text: #ffffff;
      --white: #ffffff;
    }

    /* Dark overrides - neutral dark based on rgb(42,43,46) */
    :host(.dark) {
      --bg: rgb(42, 43, 46);         /* requested main background */
      --popup-border: #3f3f46;
      --popup-shadow: rgba(0,0,0,0.6);
      --header-border: rgba(255,255,255,0.04);
      --title-color: #f1f5f9;
      --pos-color: #cbd5e1;
      --btn-color: #cbd5e1;
      --btn-hover-bg: #3a3b3f;
      --btn-hover-color: #10b981;
      --btn-active-color: #10b981;
      --btn-active-bg: rgba(16,185,129,0.12);
      --close-hover-bg: rgba(255,0,0,0.06);
      --close-hover-color: #ef4444;
      --offline-not-active-color: #9ca3af;
      --meaning-color: #e2e8f0;
      --translation-bg:rgba(16, 185, 129, 0.12);
      --translation-text: #10b981;
      --examples-title: #cbd5e1;
      --example-text: #cbd5e1;
      --example-border: #3f3f46;
      --shimmer-base: #2f3033;
      --shimmer-highlight: #39393b;
      --toast-bg: #ef4444; /* keep error red same for visibility */
      --toast-text: #ffffff;
      --white: #ffffff;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .popup {
      width: 320px;
      background: var(--bg);
      border-radius: 12px;
      box-shadow: 0 4px 20px var(--popup-shadow);
      border: 1px solid var(--popup-border);
      overflow: hidden;
      opacity: 0;
      transform: translateY(10px);
      animation: fadeIn 0.2s ease-out forwards;
    }
    
    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    [data-position="top"] .popup {
      transform: translateY(-10px);
    }
    
    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--header-border);
    }
    
    .word-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--title-color);
      display: flex;
      align-items: center;
    }
    
    .word-pos {
      color: var(--pos-color);
      font-weight: normal;
      font-size: 14px;
      margin-left: 4px;
    }
    
    .controls {
      display: flex;
      gap: 4px;
    }
    
    .btn {
      background: none;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--btn-color);
      transition: all 0.2s;
    }
    
    .btn:hover {
      background-color: var(--btn-hover-bg);
      color: var(--btn-hover-color);
    }
    
    .btn.active {
      color: var(--btn-active-color);
      background-color: var(--btn-active-bg);
    }
    
    .btn svg {
      width: 16px;
      height: 16px;
    }
    .btn.close-btn:hover {
      background-color: var(--close-hover-bg);
      color: var(--close-hover-color);
    }
    .offline-button.active {
      color: var(--btn-active-color);
      background-color: var(--btn-active-bg);
    }
    .offline-button:not(.active) {
      color: var(--offline-not-active-color);
      background: none;
    }
    .offline-button:not(.active):hover {
      background-color: var(--btn-hover-bg);
      color: var(--btn-hover-color);
    }
    .popup-content {
      padding: 16px;
    }
    
    .meaning {
      color: var(--meaning-color);
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .definition-title {
        font-size: 12px;
        color: var(--meaning-color);
        margin-bottom: 8px;
        font-weight: 500;
      }
    .definition-single {
      color: var(--meaning-color);
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    .definition-list {
      padding-left: 24px;
    }
    .definition-list li {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 8px;
      color: var(--meaning-color);
    }
    .translation {
      background-color: var(--translation-bg);
      color: var(--translation-text);
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 14px;
      font-family: 'Tiro Bangla', sans-serif;
    }
    
    .examples {
      margin-top: 12px;
    }
    
    .examples-title {
      font-size: 12px;
      color: var(--examples-title);
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .example {
      font-style: italic;
      color: var(--example-text);
      border-left: 2px solid var(--example-border);
      padding-left: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .popup-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0 16px 16px;
    }
    
    .more-link {
      color: var(--btn-color);
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }
    
    .more-link:hover {
      text-decoration: underline;
    }

  .rate-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--btn-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: 0.2s;
}

.rate-btn:hover {
  background-color: var(--btn-hover-bg);
  color: var(--btn-hover-color);
}
.star-icon {
  width: 14px;
  height: 14px;
  fill: #f4c430; /* Golden yellow */
  margin-right: 4px;
  vertical-align: middle;
}
    
    /* Shimmer loading effect styles */
    .shimmer {
      background: var(--shimmer-base);
      background-image: linear-gradient(
        to right,
        var(--shimmer-base) 0%,
        var(--shimmer-highlight) 20%,
        var(--shimmer-base) 40%,
        var(--shimmer-base) 100%
      );
      background-repeat: no-repeat;
      background-size: 800px 100%;
      display: inline-block;
      position: relative;
      animation: shimmer 1.5s infinite linear;
      border-radius: 4px;
    }
    
    @keyframes shimmer {
      0% {
        background-position: -468px 0;
      }
      100% {
        background-position: 468px 0;
      }
    }
    
    .shimmer-title {
      height: 24px;
      width: 180px;
    }
    
    .shimmer-line {
      height: 14px;
      margin-bottom: 8px;
    }
    
    .shimmer-line.full {
      width: 100%;
    }
    
    .shimmer-line.medium {
      width: 75%;
    }
    
    .shimmer-translation {
      height: 36px;
      width: 100%;
      border-radius: 6px;
      margin: 12px 0;
    }
    
    .shimmer-examples {
      margin-top: 16px;
    }
  `

  shadow.appendChild(style)

  // Create popup container
  const popup = document.createElement("div")
  popup.className = "popup"
  shadow.appendChild(popup)

  // Show shimmer loading state initially
  popup.innerHTML = `
  <div class="popup-header">
    <div class="shimmer shimmer-title"></div>
    <div class="controls">
      <button class="btn close-btn" title="Close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
  
  <div class="popup-content">
    <div style="margin-bottom: 12px;">
      <div class="shimmer" style="height: 65px; width: 60px; margin-bottom: 8px;"></div>
      <div class="shimmer shimmer-line full"></div>
      <div class="shimmer shimmer-line medium"></div>
    </div>
    
    <div class="shimmer shimmer-translation"></div>
    
    <div class="shimmer-examples">
      <div class="shimmer shimmer-line full"></div>
      <div class="shimmer shimmer-line medium"></div>
    </div>
  </div>
`

  // Add close button functionality
  const closeBtn = shadow.querySelector(".close-btn")
  closeBtn.addEventListener("click", () => {
    hostDiv.remove()
  })

  // Apply theme based on stored setting and system preference
  function applyThemeToHost(theme) {
    // theme values expected: "light", "dark", "system" (or "device")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === "dark") {
      hostDiv.classList.add("dark");
      // ensure shadow host also has dark class for :host(.dark)
      hostDiv.classList.add("dark");
    } else if (theme === "light") {
      hostDiv.classList.remove("dark");
    } else {
      // system
      if (prefersDark) hostDiv.classList.add("dark");
      else hostDiv.classList.remove("dark");
    }
  }

  // Listen for stored theme value
  chrome.storage.local.get(["theme"], (result) => {
    const theme = result.theme || "system";
    applyThemeToHost(theme);
  });

  // Listen to system changes (only effective if theme === "system")
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const mqListener = (e) => {
    chrome.storage.local.get(["theme"], (result) => {
      const theme = result.theme || "system";
      if (theme === "system") {
        applyThemeToHost("system");
      }
    });
  };
  try {
    mq.addEventListener ? mq.addEventListener("change", mqListener) : mq.addListener(mqListener);
  } catch (err) {
    // ignore if browser doesn't support addEventListener on MediaQueryList
  }

  return { hostDiv, shadow, popup }
}

// Update the popup with word data
async function updatePopupWithData(popupElement, info, content, isOnlineFromResponse) {
  const { hostDiv, shadow, popup } = popupElement

  let isBookmarked = false
  if (window.VocaLearnDB && typeof window.VocaLearnDB.isWordBookmarked === 'function') {
    isBookmarked = await window.VocaLearnDB.isWordBookmarked(content.word)
  }

  //console.log('definitions :', definitions)
  // Add to history using db.js
  if (window.VocaLearnDB && typeof window.VocaLearnDB.addToHistory === 'function') {
    const historyEntry = {
      word: content.word || info.word,
      definitions: content.definitions || [],
      meaningBn: content.meaningBn || '',
      pos: content.pos || '',
      sentences: content.sentences || [],
      audioSrc: content.audioSrc || '',
      isSaved: isBookmarked
    };
    window.VocaLearnDB.addToHistory(historyEntry);
    console.log("[Popup] Added to history:", historyEntry);
  } else {
    console.warn("VocaLearnDB.addToHistory is not available");
  }

  // Create the full UI with the word data
  popup.innerHTML = `
    <div class="popup-header">
      <div class="word-title">
        ${content.word}
        ${content.pos ? `<span class="word-pos">(${content.pos})</span>` : ""}
      </div>
      <div class="controls">
        ${content.audioSrc
      ? `
          <button class="btn audio-btn" title="Listen to pronunciation">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5L6 9H2v6h4l5 4V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.54 8.46a5 5 0 010 7.07" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          </button>
        `
      : ""
    }
        <button class="btn save-btn" title="Save word">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button class="btn offline-button" id="offline-button" title="Enable offline mode">          
          <svg id="icon-online" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><!-- Icon from OpenSearch UI by OpenSearch Contributors - https://github.com/opensearch-project/oui/blob/main/LICENSE.txt --><path fill="currentColor" d="M8 14a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m0-1a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m3.189-3.64a.5.5 0 0 1-.721.692A3.4 3.4 0 0 0 8 9c-.937 0-1.813.378-2.453 1.037a.5.5 0 0 1-.717-.697A4.4 4.4 0 0 1 8 8c1.22 0 2.361.497 3.189 1.36m2.02-2.14a.5.5 0 1 1-.721.693A6.2 6.2 0 0 0 8 6a6.2 6.2 0 0 0-4.46 1.885a.5.5 0 0 1-.718-.697A7.2 7.2 0 0 1 8 5a7.2 7.2 0 0 1 5.21 2.22m2.02-2.138a.5.5 0 0 1-.721.692A9 9 0 0 0 8 3a9 9 0 0 0-6.469 2.734a.5.5 0 1 1-.717-.697A10 10 0 0 1 8 2a10 10 0 0 1 7.23 3.082"/></svg>
          <svg id="icon-offline" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><!-- Icon from OpenSearch UI by OpenSearch Contributors - https://github.com/opensearch-project/oui/blob/main/LICENSE.txt --><path fill="currentColor" d="m6.517 12.271l1.254-1.254Q7.883 11 8 11a1.5 1.5 0 1 1-1.483 1.271m2.945-2.944l.74-.74c.361.208.694.467.987.772a.5.5 0 0 1-.721.693a3.4 3.4 0 0 0-1.006-.725m2.162-2.163l.716-.715q.463.349.87.772a.5.5 0 1 1-.722.692a6.3 6.3 0 0 0-.864-.749M7.061 6.07A6.2 6.2 0 0 0 3.54 7.885a.5.5 0 0 1-.717-.697a7.2 7.2 0 0 1 5.309-2.187zm6.672-1.014l.71-.71q.411.346.786.736a.5.5 0 0 1-.721.692a9 9 0 0 0-.775-.718m-3.807-1.85A9 9 0 0 0 8 3a9 9 0 0 0-6.469 2.734a.5.5 0 1 1-.717-.697A10 10 0 0 1 8 2c.944 0 1.868.131 2.75.382zM8 13a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m-5.424 1a.5.5 0 0 1-.707-.707L14.146 1.146a.5.5 0 0 1 .708.708z"/></svg>
        </button> 
        <button class="btn close-btn" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="popup-content">
     <div class="definition-section">
      <h4 class="definition-title">Definition</h4>
      ${content.definitions.length > 1
      ? `<ol class="definition-list">
              ${content.definitions.map((def) => `<li>${def}</li>`).join("")}
            </ol>`
      : `<div class="definition-single">${content.definitions[0]}</div>`
    }
      </div>
      
      ${content.meaningBn
      ? `
        <div class="translation" style="margin-top: 12px; font-family: 'Tiro Bangla', sans-serif;">
          ${content.meaningBn}
        </div>
      `
      : ""
    }
      
      ${content.sentences && content.sentences.length > 0
      ? `
        <div class="examples">
          <div class="examples-title">Examples:</div>
          ${content.sentences
        .map(
          (sentence) => `
            <div class="example">${sentence}</div>
          `,
        )
        .join("")}
        </div>
      `
      : ""
    }
    </div>
    
  <div class="popup-footer" style="display:flex; justify-content: space-between; align-items:center; padding: 0 16px 16px;">
  
  <!-- Rate button -->
 <button class="rate-btn" title="Rate WordTap">
  <svg class="star-icon" viewBox="0 0 24 24">
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.789 
             1.48 8.305L12 18.896l-7.416 4.504 
             1.48-8.305L0 9.306l8.332-1.151z"/>
  </svg>
  Rate WordTap
</button>


  <!-- More link -->
  <a href="https://www.google.com/search?hl=${DEFAULT_LANGUAGE}&q=define+${content.word}" target="_blank" class="more-link">
    More
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 14px; height: 14px; margin-left: 4px;">
      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
    </svg>
  </a>
</div>

  `

  const saveBtn = shadow.querySelector(".save-btn")
  if (isBookmarked) {
    saveBtn.classList.add("active")
    saveBtn.querySelector("svg").setAttribute("fill", "currentColor")
  }

  saveBtn.addEventListener("click", () => {
    // Mark as saved in IndexedDB
    console.log("[STORAGE] isBookmarked click", isBookmarked)
    if (isBookmarked && window.VocaLearnDB && typeof window.VocaLearnDB.unsaveWord === 'function') {
      saveBtn.classList.remove("active")
      saveBtn.querySelector("svg").setAttribute("fill", "none")
      window.VocaLearnDB.unsaveWord(content.word || info.word);
      isBookmarked = false
    } else if (!isBookmarked && window.VocaLearnDB && typeof window.VocaLearnDB.saveWord === 'function') {
      saveBtn.classList.add("active")
      saveBtn.querySelector("svg").setAttribute("fill", "currentColor")
      window.VocaLearnDB.saveWord(content.word || info.word);
      isBookmarked = true
    }
  })

  // Add event listeners
  const closeBtn = shadow.querySelector(".close-btn")
  closeBtn.addEventListener("click", () => {
    hostDiv.remove()
  })

  const rateBtn = shadow.querySelector(".rate-btn");
  rateBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openRatePage" });
    //chrome.runtime.sendMessage({ action: "openRatePage" });
  });

  const offlineButton = shadow.querySelector(".offline-button")
  if (offlineButton) {
    // Check if offline mode is enabled
    function setOfflineButtonIcon(isOnline) {
      const iconOnline = shadow.getElementById('icon-online');
      const iconOffline = shadow.getElementById('icon-offline');
      if (isOnline) {
        iconOnline.style.display = '';
        iconOffline.style.display = 'none';
        offlineButton.title = "tap to offline mode"
      } else {
        iconOnline.style.display = 'none';
        iconOffline.style.display = '';
        offlineButton.title = "tap to online mode"
      }
    }

    chrome.storage.local.get("offlineMode", (result) => {
      console.log("[BG] Offline mode:", result.offlineMode);
      console.log("[BG] isOnlineFromResponse:", isOnlineFromResponse);
      if (result.offlineMode || (isOnlineFromResponse === false)) {
        offlineButton.classList.remove("active");
        setOfflineButtonIcon(false);
      } else {
        offlineButton.classList.add("active");
        setOfflineButtonIcon(true);
      }
    })

    offlineButton.addEventListener("click", () => {
      const isOnline = offlineButton.classList.contains("active");
      if (isOnline) {
        offlineButton.classList.remove("active");
        setOfflineButtonIcon(false);
        // Switch to offline mode
        chrome.storage.local.set({ offlineMode: true });
      } else {
        offlineButton.classList.add("active");
        setOfflineButtonIcon(true);
        // Switch to online mode
        chrome.storage.local.set({ offlineMode: false });
      }
    });
  }



  // Add audio functionality if available
  if (content.audioSrc) {
    const audioBtn = shadow.querySelector(".audio-btn")
    const audio = document.createElement("audio")
    audio.src = content.audioSrc
    shadow.appendChild(audio)

    audioBtn.addEventListener("click", () => {
      audio.play()
    })
  }

  // Adjust position if popup is in the top half
  if (hostDiv.dataset.position === "top") {
    const popupHeight = popup.offsetHeight
    hostDiv.style.top = `${Number.parseInt(hostDiv.style.top) - popupHeight}px`
  }
}

// Show a message when no meaning is found
function noMeaningFound(popupElement, isOnline, event, info) {
  const { hostDiv, shadow, popup } = popupElement;
  const isBengli = containsBengali(info.word);
  // Decide button label and next state
  const tryMode = isOnline ? "Offline" : "Online";
  const nextIsOnline = !isOnline;

  popup.innerHTML = `
    <div class="popup-header">
      <div class="word-title">Sorry</div>
      <div class="controls">
        <button class="btn close-btn" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div class="popup-content">
      <p class="meaning">No definition found for this word.</p>
      ${!isBengli
      ? `
        <div style="display: flex; justify-content: center; align-items: center; margin-top: 18px;">
          <button 
            class="btn try-again-btn"
            style="
              padding: 8px 20px;
              border-radius: 6px;
              width: 100%;
              background: linear-gradient(90deg, #10b981 0%, #10b981 100%);
              color: #fff;
              font-size: 15px;
              font-weight: 500;
              border: none;
              box-shadow: 0 2px 8px #10b981;
              cursor: pointer;
              transition: background 0.2s;
              outline: none;
            "
            onmouseover="this.style.background='#10b981'"
            onmouseout="this.style.background='linear-gradient(90deg, #10b981 0%, #10b981 100%)'"
          >Try ${tryMode}</button>
        </div>`
      : ""
    }
    </div>
  `;

  // Close button logic
  const closeBtn = shadow.querySelector(".close-btn");
  closeBtn.addEventListener("click", () => {
    hostDiv.remove();
  });

  // Try again button logic
  const tryAgainBtn = shadow.querySelector(".try-again-btn");
  tryAgainBtn.addEventListener("click", () => {
    // Re-fetch meaning with the opposite online/offline mode
    //retrieveMeaningWithMode(info, tryMode === "Offline" ? false : true, popupElement, event);
    //hostDiv.remove();

    showMeaning({ ...event, forceOnline: tryMode === "Offline" ? false : true });
  });

  // Adjust position if popup is in the top half
  if (hostDiv.dataset.position === "top") {
    const popupHeight = popup.offsetHeight;
    hostDiv.style.top = `${Number.parseInt(hostDiv.style.top) - popupHeight}px`;
  }
}
// Remove any existing popups
function removeExistingPopups() {
  document.querySelectorAll(".voca-popup-container").forEach((popup) => {
    popup.remove()
  })
}

// Fetch the signed-in user
function fetchSignedUser() {
  const hasChrome = typeof chrome !== "undefined" && chrome.runtime
  if (hasChrome) {
    return chrome.runtime.sendMessage({ message: "fetch_user_signed_in" })
  }
  return Promise.resolve({ signedIn: false })
}

function containsBengali(word) {
  if (!word) return false;
  return /[\u0980-\u09FF]/.test(word.trim());
}

// Retrieve the meaning of a word
function retrieveMeaning(info) {
  const hasChrome = typeof chrome !== "undefined" && chrome.runtime

  if (hasChrome) {
    return chrome.runtime.sendMessage({
      message: "fetch_word",
      word: info.word,
      lang: DEFAULT_LANGUAGE,
      time: Date.now(),
      isOnline: updatedNetworkStatus(),
      forceOnline: info.forceOnline
    })
  }

  // Fallback for environments without chrome.runtime
  return Promise.resolve({
    content: {
      word: info.word,
      pos: "noun",
      meaning: `Definition of ${info.word}`,
      meaningBn: `${info.word} এর অর্থ`,
      sentences: [`Here is an example sentence using the word ${info.word}.`],
    },
  })
}

// Save a word to the app
function saveWordToApp(info, content) {
  if (typeof chrome !== "undefined" && chrome.runtime) {
    return chrome.runtime.sendMessage({
      message: "word_send_to_app",
      mainWord: info.word,
      content: content,
    })
  }
  return Promise.resolve({ success: true })
}

document.addEventListener("click", (e) => {
  // Don't close if clicking inside the popup
  if (!e.target.closest(".voca-popup-container")) {
    removeExistingPopups()
  }
})

let lastSelectedEvent = null;
let selectionActive = false;
let translationActive = false;
let lastTranslationEvent = null;

// Listen for double-click to select a word
document.addEventListener("dblclick", (e) => {
  const selection = window.getSelection();
  console.log("selection <>", selection + " TRIGGER_KEY <>", TRIGGER_KEY + " modifierKey <>", modifierKey)
  if (TRIGGER_KEY === "select") {
    chrome.storage.local.set({ selectedWord: selection.toString() });
    return
  }
  if (modifierKey === "none") {
    return showMeaning(e)
  }
  // Check if user selected some text

  console.log("selection <><><", selection)
  if (selection && selection.toString().trim().length > 0) {
    lastSelectedEvent = e;
    selectionActive = true;
    // Optionally, you can highlight or indicate readiness here
  } else {
    selectionActive = false;
  }
});

let isSelecting = false;
let selectionTimer;
let selectionText = "";
let isTranslationUiVisible = false;

// Selection changed
document.addEventListener('selectionchange', () => {
  selectionText = window.getSelection().toString().trim();
  console.log("selectionchange selectionText <>", selectionText)
});

// Selection ended
document.addEventListener('mouseup', (e) => {

  console.log("select  text <>", e)
  console.log("mouseup <>", " isSelecting " + isSelecting + " selectionText <>", selectionText)
  const isSingleWord = selectionText.trim().split(/\s+/).length === 1;
  if ((modifierKey === "none" || TRIGGER_KEY === "select") && !isSingleWord) {
    return handleTranslation(e)
  }

  if (selectionText && !isSingleWord) {
    lastTranslationEvent = e;
    translationActive = true;
    // Optionally, you can highlight or indicate readiness here
  } else {
    translationActive = false;
  }

});

function handleTranslation(e) {
  console.log("mouseup translation: ", " selectionText <>", selectionText)
  if (selectionText.trim().length === 0 || isTranslationUiVisible) return;

  const newEvent = {
    ...e,
    target: {
      ...e.target,
      getBoundingClientRect: () => window.getSelection().getRangeAt(0).getBoundingClientRect(),
      isTranslation: true // Mark as translation
    }
  };
  showMeaning(newEvent);
}

// Helper function to check if the correct modifier key is pressed
function isModifierPressed(e) {
  switch (modifierKey) {
    case "ctrl":
      // Ctrl on Windows/Linux, Command (meta) on Mac
      return navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
    case "alt":
      // Alt on Windows/Linux, Option (alt) on Mac
      return e.altKey;
    case "shift":
      return e.shiftKey;
    case "meta":
    case "command":
      // Command key on Mac, Windows key on Windows (rarely used for browser shortcuts)
      return e.metaKey;
    case "none":
    default:
      // No modifier required
      return true;
  }
}
// Listen for Control key (or Command on Mac) press
document.addEventListener("keydown", (e) => {
  console.log("selectionActive <>", selectionActive)
  console.log("translationActive <>", translationActive)
  console.log("isModifierPressed <>", isModifierPressed(e))
  // On Mac, use 'metaKey' for Command, on Windows/Linux use 'ctrlKey'
  if (selectionActive && isModifierPressed(e)) {
    console.log("selectionActive block <>", lastSelectedEvent)
    showMeaning(lastSelectedEvent || e);
    selectionActive = false;
  }
  if (translationActive && isModifierPressed(e)) {
    console.log("translationActive block <>", lastTranslationEvent)
    handleTranslation(lastTranslationEvent || e);
    translationActive = false;
  }
});

// Optional: reset if user clicks elsewhere or selection changes
document.addEventListener("mousedown", (e) => {
  if (e.detail === 1) { // single click
    selectionActive = false;
  }
});

console.log("VocaLearn content script loaded at top");

// Initialize settings from storage
; (() => {
  console.log("TRIGGER_KEY block <>", TRIGGER_KEY)
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.local
      .get()
      .then((results) => {
        console.log("get block <>", results)
        TRIGGER_KEY = results.trigger || DEFAULT_TRIGGER_KEY
        modifierKey = results.modifierKey || DEFAULT_MODIFIER_KEY
      })
      .catch((err) => {
        console.error("Error loading settings:", err)
      })

    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log("addListener block <>", changes)
      if (areaName === "local" && changes.modifierKey) {
        modifierKey = changes.modifierKey.newValue;
        console.log("modifierKey updated live to:", modifierKey);
      }
      if (areaName === "local" && changes.trigger) {
        TRIGGER_KEY = changes.trigger.newValue;
        console.log("TRIGGER_KEY updated live to:", TRIGGER_KEY);
      }
      // Add more keys as needed
    });
  }
})()
