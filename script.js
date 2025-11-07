// Preload audio objects
let diceAudio = null;
let hapticAudioContext = null;

// Initialize audio when page loads
const initializeAudio = () => {
  // Preload dice sound
  diceAudio = new Audio("https://bit.ly/dice-sound");
  diceAudio.preload = "auto";
  diceAudio.load();
  
  // Initialize Web Audio API for haptic sounds
  try {
    hapticAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log("Web Audio API not supported");
  }
};

// Function to check if sound is enabled
const isSoundEnabled = () => {
  return localStorage.getItem("diceSoundEnabled") !== "false";
};

// Function to play soft haptic sound
const playHapticSound = () => {
  if (!isSoundEnabled() || !hapticAudioContext) return;
  
  try {
    const oscillator = hapticAudioContext.createOscillator();
    const gainNode = hapticAudioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(hapticAudioContext.destination);
    
    // Soft click sound - short, low frequency
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, hapticAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, hapticAudioContext.currentTime + 0.1);
    
    oscillator.start(hapticAudioContext.currentTime);
    oscillator.stop(hapticAudioContext.currentTime + 0.1);
  } catch (e) {
    // Fallback: silent if Web Audio API fails
  }
};

const setRollButton = () => {
  const dicesElements = document.querySelectorAll(".dice");
  const rollButton = document.getElementById("roll-button");

  rollButton.addEventListener("click", () => {
    setDice(dicesElements);
  });
  
  // Make dice clickable - clicking any dice triggers roll
  dicesElements.forEach((dice) => {
    dice.addEventListener("click", () => {
      setDice(dicesElements);
    });
  });
};

const setDice = (elements) => {
  const randomNumber = Math.floor(Math.random() * 6) + 1;

  elements.forEach((dice) => {
    dice.classList.remove("active");
    handleDice(randomNumber, dice);
  });
};

const handleDice = (number, dice) => {
  if (dice.id === `dice-${number}`) {
    setDots(dice);
    addToHistory(dice);
  }
};

const setDots = (dice) => {
  const dots = Array.from(dice.children);

  // Check if sound is enabled and play dice sound
  if (isSoundEnabled() && diceAudio) {
    diceAudio.currentTime = 0; // Reset to beginning
    diceAudio.play().catch(e => console.log("Sound play failed:", e));
  }
  
  displayDots(dots, dice);
};

const displayDots = (dots, dice) => {
  dots.forEach((dot) => {
    dot.classList.add("hide");

    setTimeout(() => {
      dot.classList.remove("hide");
    }, 1000);
  });
  setTimeout(() => {
    dice.classList.add("active");
  });
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 5) {
    return "just now";
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

const addToHistory = (dice) => {
  const listItem = document.createElement("li");
  const diceCopy = dice.cloneNode(true);

  setDiceHistory(listItem, diceCopy);
};

const setDiceHistory = (item, dice) => {
  dice.style.display = "block";
  dice.querySelectorAll("span").forEach((dot) => {
    dot.classList.remove("hide");
  });

  displayDiceHistory(item, dice);
  setClearButton();
};

const displayDiceHistory = (item, dice) => {
  setTimeout(() => {
    item.classList.add("history__item");
    
    // Create the main content container
    const contentContainer = document.createElement("div");
    contentContainer.classList.add("history__item-content");
    
    // Create left side container for text and timestamp
    const leftContainer = document.createElement("div");
    leftContainer.classList.add("history__item-left");
    
    // Create text element
    const textElement = document.createElement("span");
    textElement.textContent = "You rolled";
    textElement.classList.add("history__item-text");
    
    // Create timestamp
    const timestamp = document.createElement("div");
    timestamp.classList.add("history__timestamp");
    timestamp.textContent = getRelativeTime(new Date());
    
    // Append text and timestamp to left container
    leftContainer.appendChild(textElement);
    leftContainer.appendChild(timestamp);
    
    // Append left container and dice to main content
    contentContainer.appendChild(leftContainer);
    contentContainer.appendChild(dice);
    
    // Append main content to item
    item.appendChild(contentContainer);

    addDiceToTop(item);
  }, 1300);
};

const addDiceToTop = (item) => {
  const historyElements = getHistoryElements();
  const fistChild = historyElements.list.firstChild;

  historyElements.list.insertBefore(item, fistChild);
  historyElements.header.classList.add("switch-display");
  historyElements.button.classList.remove("hide");
};

const getHistoryElements = () => {
  const historyElements = {
    header: document.querySelector(".history__header"),
    list: document.querySelector("#history-list"),
    button: document.querySelector("#clear-button")
  };

  return historyElements;
};

const setClearButton = () => {
  const clearButton = getHistoryElements().button;
  
  // Check if button exists and hasn't already been set up
  if (!clearButton || clearButton.dataset.hapticSetup === "true") {
    return;
  }
  
  // Mark as set up to prevent duplicate listeners
  clearButton.dataset.hapticSetup = "true";
  
  clearButton.addEventListener("click", () => {
    playHapticSound(); // Play haptic sound
    clearHistory();
  });
};

const clearHistory = () => {
  const historyElements = getHistoryElements();

  historyElements.button.classList.add("hide");
  historyElements.header.classList.remove("switch-display");

  while (historyElements.list.firstChild) {
    historyElements.list.removeChild(historyElements.list.firstChild);
  }
  
  // Reset the haptic setup flag when history is cleared
  if (historyElements.button) {
    historyElements.button.dataset.hapticSetup = "false";
  }
};

const setChangeTheme = () => {
  const themeButton = document.getElementById("theme-button");

  themeButton.addEventListener("click", () => {
    playHapticSound(); // Play haptic sound
    document.documentElement.classList.toggle("dark-theme");
  });
};

const setSettingsButton = () => {
  const settingsButton = document.getElementById("settings-button");
  const settingsPopup = document.getElementById("settings-popup");
  const settingsOverlay = document.getElementById("settings-overlay");
  const settingsClose = document.getElementById("settings-close");
  const soundToggle = document.getElementById("sound-toggle");
  const themeToggle = document.getElementById("theme-toggle");
  const helpBtn = document.getElementById("help-btn");

  // Open settings popup with haptic sound
  settingsButton.addEventListener("click", () => {
    playHapticSound(); // Play haptic sound
    settingsPopup.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  });

  // Close settings popup
  const closeSettings = () => {
    settingsPopup.classList.remove("active");
    document.body.style.overflow = "auto"; // Restore scrolling
  };

  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", closeSettings);

  // Sound toggle functionality
  let soundEnabled = true;
  soundToggle.addEventListener("change", (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem("diceSoundEnabled", soundEnabled);
    // Play haptic sound when toggling (only if enabling)
    if (soundEnabled) {
      playHapticSound();
    }
  });

  // Load sound preference from localStorage (default to true/enabled)
  const savedSoundPreference = localStorage.getItem("diceSoundEnabled");
  if (savedSoundPreference !== null) {
    soundEnabled = savedSoundPreference === "true";
    soundToggle.checked = soundEnabled;
  } else {
    // Enable sound by default if no preference is saved
    soundEnabled = true;
    soundToggle.checked = true;
    localStorage.setItem("diceSoundEnabled", "true");
  }

  // Theme toggle functionality with haptic sound
  themeToggle.addEventListener("change", (e) => {
    playHapticSound(); // Play haptic sound
    document.documentElement.classList.toggle("dark-theme");
    localStorage.setItem("darkTheme", e.target.checked);
  });

  // Load theme preference from localStorage
  const savedTheme = localStorage.getItem("darkTheme");
  if (savedTheme === "true") {
    document.documentElement.classList.add("dark-theme");
    themeToggle.checked = true;
  }

  // Help button functionality
  helpBtn.addEventListener("click", () => {
    // Close settings popup first
    closeSettings();
    
    // Open help popup after a short delay
    setTimeout(() => {
      const helpPopup = document.getElementById("help-popup");
      helpPopup.classList.add("active");
      document.body.style.overflow = "hidden";
    }, 300);
  });

  // Close popup with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsPopup.classList.contains("active")) {
      closeSettings();
    }
  });

  return { soundEnabled };
};

const setHelpPopup = () => {
  const helpPopup = document.getElementById("help-popup");
  const helpOverlay = document.getElementById("help-overlay");
  const helpClose = document.getElementById("help-close");

  // Close help popup
  const closeHelp = () => {
    helpPopup.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  helpClose.addEventListener("click", closeHelp);
  helpOverlay.addEventListener("click", closeHelp);

  // Close help popup with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpPopup.classList.contains("active")) {
      closeHelp();
    }
  });
};

// Disable text selection and context menu
const disableTextSelection = () => {
  // Disable context menu (right-click and long-press)
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
  
  // Disable text selection via keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Disable Ctrl+A (Select All)
    if (e.ctrlKey && e.key === "a") {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+C (Copy)
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+X (Cut)
    if (e.ctrlKey && e.key === "x") {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+V (Paste) - optional, but disabling for consistency
    if (e.ctrlKey && e.key === "v") {
      e.preventDefault();
      return false;
    }
  });
  
  // Disable drag and drop
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
    return false;
  });
  
  // Disable long-press on mobile devices
  let touchStartTime = 0;
  document.addEventListener("touchstart", (e) => {
    touchStartTime = Date.now();
  });
  
  document.addEventListener("touchend", (e) => {
    const touchDuration = Date.now() - touchStartTime;
    // If touch duration is more than 500ms, prevent default (long-press)
    if (touchDuration > 500) {
      e.preventDefault();
      return false;
    }
  });
  
  // Disable text selection on double-click
  document.addEventListener("selectstart", (e) => {
    e.preventDefault();
    return false;
  });
};

window.addEventListener("DOMContentLoaded", () => {
  disableTextSelection(); // Disable text selection and context menu
  initializeAudio(); // Initialize audio first
  setChangeTheme();
  setRollButton();
  setSettingsButton();
  setHelpPopup();
});
