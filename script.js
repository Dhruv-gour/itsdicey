// Performance Optimization: Cache preferences and DOM elements
let diceSoundEnabled = localStorage.getItem("diceSoundEnabled") !== "false";
let isDarkTheme = localStorage.getItem("darkTheme") === "true";
let rollHistory = JSON.parse(localStorage.getItem("rollHistory") || "[]");

// Preload audio objects
let diceAudio = null;
let hapticAudioContext = null;

// Initialize audio when page loads
const initializeAudio = () => {
  diceAudio = new Audio("dice-sound.mp3");
  diceAudio.preload = "auto";
  diceAudio.load();
  
  try {
    hapticAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.error("Web Audio API not supported");
  }
};

const isSoundEnabled = () => diceSoundEnabled;

const playHapticSound = () => {
  if (!diceSoundEnabled || !hapticAudioContext) return;
  
  try {
    if (hapticAudioContext.state === 'suspended') {
      hapticAudioContext.resume();
    }
    
    const oscillator = hapticAudioContext.createOscillator();
    const gainNode = hapticAudioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(hapticAudioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    const startTime = hapticAudioContext.currentTime;
    gainNode.gain.setValueAtTime(0.1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  } catch (e) {
  }
};

const setRollButton = () => {
  const rollButton = document.getElementById("roll-button");
  const dicesElements = document.querySelectorAll(".dice");

  const handleRoll = () => {
    if (rollButton.disabled) return;
    
    rollButton.disabled = true;
    setDice(dicesElements);
    
    setTimeout(() => {
      rollButton.disabled = false;
    }, 1300);
  };

  rollButton.addEventListener("click", handleRoll);
  
  dicesElements.forEach((dice) => {
    dice.addEventListener("click", handleRoll);
  });
};

const setDice = (elements) => {
  const randomNumber = Math.floor(Math.random() * 6) + 1;

  elements.forEach((dice) => {
    dice.classList.remove("active");
    if (dice.id === `dice-${randomNumber}`) {
      setDots(dice);
      addToHistory(randomNumber);
    }
  });
};

const setDots = (dice) => {
  const dots = dice.querySelectorAll(".dice__dot");

  if (diceSoundEnabled && diceAudio) {
    diceAudio.currentTime = 0;
    diceAudio.play().catch(e => {}); 
  }
  
  displayDots(dots, dice);
};

const displayDots = (dots, dice) => {
  dots.forEach((dot) => {
    dot.classList.add("hide");
  });

  setTimeout(() => {
    dots.forEach((dot) => {
      dot.classList.remove("hide");
    });
  }, 1000);
  
  dice.classList.add("active");
};

const getRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 5) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const renderHistoryItem = (number, timestamp, isNew = false) => {
  const listItem = document.createElement("li");
  listItem.classList.add("history__item");
  
  // Get the dots for this number
  const diceElement = document.getElementById(`dice-${number}`).cloneNode(true);
  diceElement.style.display = "block";
  diceElement.classList.remove("active");
  diceElement.querySelectorAll(".dice__dot").forEach(d => d.classList.remove("hide"));

  listItem.innerHTML = `
    <div class="history__item-content">
      <div class="history__item-left">
        <span class="history__item-text">You rolled</span>
        <div class="history__timestamp">${getRelativeTime(timestamp)}</div>
      </div>
      ${diceElement.outerHTML}
    </div>
  `;

  const historyList = document.getElementById("history-list");
  const header = document.querySelector(".history__header");
  const clearBtn = document.getElementById("clear-button");

  if (isNew) {
    historyList.insertBefore(listItem, historyList.firstChild);
  } else {
    historyList.appendChild(listItem);
  }

  header.classList.add("switch-display");
  clearBtn.classList.remove("hide");
  setClearButton();
};

const addToHistory = (number) => {
  const timestamp = Date.now();
  rollHistory.unshift({ number, timestamp });
  
  // Keep history manageable (e.g., last 50 rolls)
  if (rollHistory.length > 50) rollHistory.pop();
  
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory));

  setTimeout(() => {
    renderHistoryItem(number, timestamp, true);
  }, 1300);
};

const loadHistory = () => {
  if (rollHistory.length > 0) {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    rollHistory.forEach(item => {
      renderHistoryItem(item.number, item.timestamp);
    });
  }
};

const setClearButton = (() => {
  let isInitialized = false;
  
  return () => {
    if (isInitialized) return;
    const clearButton = document.getElementById("clear-button");
    if (!clearButton) return;
    
    clearButton.addEventListener("click", () => {
      playHapticSound();
      clearHistory();
    });
    isInitialized = true;
  };
})();

const clearHistory = () => {
  const historyList = document.getElementById("history-list");
  const header = document.querySelector(".history__header");
  const clearBtn = document.getElementById("clear-button");

  clearBtn.classList.add("hide");
  header.classList.remove("switch-display");
  historyList.innerHTML = "";
  rollHistory = [];
  localStorage.removeItem("rollHistory");
};

const setChangeTheme = () => {
  const themeButton = document.getElementById("theme-button");
  themeButton.addEventListener("click", () => {
    playHapticSound();
    document.documentElement.classList.toggle("dark-theme");
    isDarkTheme = document.documentElement.classList.contains("dark-theme");
    localStorage.setItem("darkTheme", isDarkTheme);
  });
};

const setSettingsButton = () => {
  const items = {
    btn: document.getElementById("settings-button"),
    popup: document.getElementById("settings-popup"),
    overlay: document.getElementById("settings-overlay"),
    close: document.getElementById("settings-close"),
    soundToggle: document.getElementById("sound-toggle"),
    themeToggle: document.getElementById("theme-toggle"),
    helpBtn: document.getElementById("help-btn")
  };

  const openSettings = () => {
    playHapticSound();
    items.popup.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeSettings = () => {
    items.popup.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  items.btn.addEventListener("click", openSettings);
  items.close.addEventListener("click", closeSettings);
  items.overlay.addEventListener("click", closeSettings);

  items.soundToggle.checked = diceSoundEnabled;
  items.soundToggle.addEventListener("change", (e) => {
    diceSoundEnabled = e.target.checked;
    localStorage.setItem("diceSoundEnabled", diceSoundEnabled);
    if (diceSoundEnabled) playHapticSound();
  });

  items.themeToggle.checked = isDarkTheme;
  items.themeToggle.addEventListener("change", (e) => {
    playHapticSound();
    document.documentElement.classList.toggle("dark-theme", e.target.checked);
    isDarkTheme = e.target.checked;
    localStorage.setItem("darkTheme", isDarkTheme);
  });

  items.helpBtn.addEventListener("click", () => {
    closeSettings();
    setTimeout(() => {
      const helpPopup = document.getElementById("help-popup");
      helpPopup.classList.add("active");
      document.body.style.overflow = "hidden";
    }, 300);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && items.popup.classList.contains("active")) {
      closeSettings();
    }
  });
};

const setHelpPopup = () => {
  const items = {
    popup: document.getElementById("help-popup"),
    overlay: document.getElementById("help-overlay"),
    close: document.getElementById("help-close")
  };

  const closeHelp = () => {
    items.popup.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  items.close.addEventListener("click", closeHelp);
  items.overlay.addEventListener("click", closeHelp);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && items.popup.classList.contains("active")) {
      closeHelp();
    }
  });
};

const disableInterruptions = () => {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  
  const preventSelect = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'x', 'v'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  };
  document.addEventListener("keydown", preventSelect);
  
  document.addEventListener("dragstart", (e) => e.preventDefault());
  
  let touchStartTime = 0;
  document.addEventListener("touchstart", () => { touchStartTime = Date.now(); }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (Date.now() - touchStartTime > 500) e.preventDefault();
  });
  
  document.addEventListener("selectstart", (e) => e.preventDefault());
};

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  disableInterruptions();
  initializeAudio();
  setChangeTheme();
  setRollButton();
  setSettingsButton();
  setHelpPopup();
  registerServiceWorker();
  
  if (isDarkTheme) {
    document.documentElement.classList.add("dark-theme");
  }
  
  loadHistory();
});
