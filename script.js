// Performance Optimization: Cache preferences and DOM elements
let diceSoundEnabled = localStorage.getItem("diceSoundEnabled") !== "false";
let isDarkTheme = localStorage.getItem("darkTheme") === "true";
let rollHistory = JSON.parse(localStorage.getItem("rollHistory") || "[]");
let currentSkin = localStorage.getItem("currentSkin") || "classic";
let streakCount = parseInt(localStorage.getItem("streakCount") || "1");
let lastRollDate = localStorage.getItem("lastRollDate") || "";
let unlockedSkins = JSON.parse(localStorage.getItem("unlockedSkins") || "[]");
let isDailyRollEligible = false;

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

const playHapticSound = (type = 'default') => {
  if (!diceSoundEnabled || !hapticAudioContext) return;
  
  try {
    if (hapticAudioContext.state === 'suspended') {
      hapticAudioContext.resume();
    }
    
    const oscillator = hapticAudioContext.createOscillator();
    const gainNode = hapticAudioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(hapticAudioContext.destination);
    
    // Skin-specific haptics logic
    if (currentSkin === 'neon') {
      oscillator.frequency.value = 1200; // Higher pitch for neon
      oscillator.type = 'triangle';
    } else if (currentSkin === 'metal') {
      oscillator.frequency.value = 400; // Deep pitch for metal
      oscillator.type = 'sawtooth';
    } else {
      oscillator.frequency.value = 800; // Standard
      oscillator.type = 'sine';
    }
    
    const startTime = hapticAudioContext.currentTime;
    const duration = currentSkin === 'metal' ? 0.15 : 0.1;

    gainNode.gain.setValueAtTime(currentSkin === 'metal' ? 0.2 : 0.1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  } catch (e) {
  }
};

const setRollButton = () => {
  const rollButton = document.getElementById("roll-button");
  const dicesElements = document.querySelectorAll(".dice");

  const updateRollButtonState = () => {
    if (isDailyRollEligible) {
      rollButton.classList.add("daily-roll-btn");
      rollButton.querySelector(".text").textContent = "DAILY LUCK ROLL";
    } else {
      rollButton.classList.remove("daily-roll-btn");
      rollButton.querySelector(".text").textContent = "ROLL DICE";
    }
  };

  const handleRoll = () => {
    if (rollButton.disabled) return;
    
    rollButton.disabled = true;
    setDice(dicesElements);
    
    if (isDailyRollEligible) {
      isDailyRollEligible = false;
      updateRollButtonState();
    }

    setTimeout(() => {
      rollButton.disabled = false;
    }, 1300);
  };

  updateRollButtonState();
  rollButton.addEventListener("click", handleRoll);
  
  dicesElements.forEach((dice) => {
    dice.addEventListener("click", handleRoll);
  });
};

const setDice = (elements) => {
  const randomNumber = Math.floor(Math.random() * 6) + 1;
  const isFirstRollOfDay = isDailyRollEligible;

  elements.forEach((dice) => {
    dice.classList.remove("active");
    if (dice.id === `dice-${randomNumber}`) {
      setDots(dice);
      addToHistory(randomNumber);
      
      // Trigger Luck logic if this was the daily roll
      if (isFirstRollOfDay) {
        processDailyLuckRoll(randomNumber);
        localStorage.setItem("lastRollDate", new Date().toDateString());
      }
      
      handleDice(randomNumber, dice);
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
  const drawer = document.getElementById('history-container');

  // Automatically close the drawer when history is cleared
  if (drawer && drawer.classList.contains('open')) {
    drawer.classList.remove('open');
    playHapticSound(); // Feedback for closure
  }

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

  const skinBtns = document.querySelectorAll(".skin__btn");

  const updateSkinSelection = () => {
    // Refresh unlocking state from local storage first
    unlockedSkins = JSON.parse(localStorage.getItem("unlockedSkins") || "[]");
    
    skinBtns.forEach(btn => {
      const skin = btn.dataset.skin;
      
      // Update locked/unlocked visual state
      if (skin === 'neon' || skin === 'metal' || skin === 'liquid') {
          if (unlockedSkins.includes(skin)) {
              btn.classList.remove('locked');
              // Remove lock icon if present
              const lockIcon = btn.querySelector('.lock__icon');
              if (lockIcon) lockIcon.style.display = 'none';
          }
      }
      
      btn.classList.toggle("active", skin === currentSkin);
    });
    
    // Apply skin class to all dice (main dice + all history items)
    const allDice = document.querySelectorAll(".dice");
    const skinClasses = ["classic-skin", "neon-skin", "metal-skin", "liquid-skin"];
    
    allDice.forEach(dice => {
      dice.classList.remove(...skinClasses);
      if (currentSkin !== 'classic') {
        dice.classList.add(`${currentSkin}-skin`);
      }
    });
  };

  skinBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains('locked')) {
        playImpactHaptic(); // Negative feedback
        return;
      }
      currentSkin = btn.dataset.skin;
      localStorage.setItem("currentSkin", currentSkin);
      updateSkinSelection();
      playHapticSound();
    });
  });

  updateSkinSelection();

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

// Haptic Feedback for Dice Impact
const playImpactHaptic = () => {
    if (!diceSoundEnabled || !navigator.vibrate) return;
    // Stronger "thud" for impact
    navigator.vibrate(15);
};

// ... existing code ...

const scaleDiceOnImpact = (dice) => {
    dice.style.transform = "scale(0.9)";
    setTimeout(() => {
        dice.style.transform = "scale(1)";
    }, 100);
}

const handleDice = (number, dice) => {
    // ... existing code ...
    
    // Impact effect when animation finishes (approximate timing)
    setTimeout(() => {
        playImpactHaptic();
        // Visual impact feedback
        scaleDiceOnImpact(dice);
    }, 400); // Sync with animation bounce
};

// History Drawer Logic - Refined for scrolling and smoother interaction
const initHistoryDrawer = () => {
    const drawer = document.getElementById('history-container');
    const handle = document.getElementById('history-handle');
    const historyBody = document.querySelector('.history__body');
    let startY = 0;
    let isDragging = false;
    const threshold = 50;

    const openDrawer = () => {
        drawer.classList.add('open');
        playHapticSound();
    };
    
    const closeDrawer = () => {
        drawer.classList.remove('open');
        playHapticSound();
    };

    // Toggle on handle click
    handle.addEventListener('click', (e) => {
        drawer.classList.toggle('open');
        playHapticSound();
    });

    // Swipe up on the drawer itself to open
    drawer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    drawer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        // If drawer is closed and we swipe up, open it
        if (!drawer.classList.contains('open') && diff < -threshold) {
            openDrawer();
            isDragging = false;
        }
        
        // If drawer is open, scrolling at top, and we swipe down, close it
        if (drawer.classList.contains('open') && diff > threshold && historyBody.scrollTop <= 0) {
            closeDrawer();
            isDragging = false;
        }
    }, { passive: true });

    drawer.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (drawer.classList.contains('open') && !drawer.contains(e.target)) {
            closeDrawer();
        }
    });
};

const updateStreakProgress = () => {
    const progressBar = document.getElementById("streak-progress-fill");
    const container = document.getElementById("streak-container");
    const streakLabel = document.querySelector(".streak__label");
    
    if (!progressBar) return;
    
    // Milestones and progress logic
    const milestones = [
        { id: 'neon', day: 5 },
        { id: 'metal', day: 15 },
        { id: 'liquid', day: 20 }
    ];
    
    let nextMilestone = milestones.find(m => !unlockedSkins.includes(m.id));
    let prevDay = 0;
    
    if (!nextMilestone) {
        // All skins unlocked, default to 100% or a repeat cycle
        progressBar.style.width = `100%`;
        container.classList.remove('claimable');
        streakLabel.textContent = "Max Level!";
        return;
    }
    
    // Find the previous milestone day
    const currentIndex = milestones.indexOf(nextMilestone);
    if (currentIndex > 0) {
        prevDay = milestones[currentIndex - 1].day;
    }
    
    // Calculate progress towards the next milestone
    let progressPercent = 0;
    if (streakCount >= nextMilestone.day) {
        progressPercent = 100;
    } else {
        const totalInSegment = nextMilestone.day - prevDay;
        const currentInSegment = Math.max(0, streakCount - prevDay);
        progressPercent = (currentInSegment / totalInSegment) * 100;
    }
    
    progressBar.style.width = `${progressPercent}%`;
    
    // Reward Logic
    let rewardAvailable = false;
    if (streakCount >= nextMilestone.day && !unlockedSkins.includes(nextMilestone.id)) {
        rewardAvailable = true;
    }
    
    if (rewardAvailable) {
        container.classList.add('claimable');
        streakLabel.textContent = "CLAIM REWARD!";
    } else {
        container.classList.remove('claimable');
        streakLabel.textContent = "Day Streak";
    }
};

const handleRewardClaim = () => {
    const container = document.getElementById("streak-container");
    if (!container.classList.contains('claimable')) return;
    
    let claimedSkin = null;
    let skinId = null;
    
    if (streakCount >= 5 && !unlockedSkins.includes('neon')) {
        skinId = 'neon';
        claimedSkin = 'Neon';
    } else if (streakCount >= 15 && !unlockedSkins.includes('metal')) {
        skinId = 'metal';
        claimedSkin = 'Metal';
    } else if (streakCount >= 20 && !unlockedSkins.includes('liquid')) {
        skinId = 'liquid';
        claimedSkin = 'Liquid Glass';
    }
    
    if (skinId) {
        unlockedSkins.push(skinId);
        localStorage.setItem("unlockedSkins", JSON.stringify(unlockedSkins));
        
        // Visual feedback
        playHapticSound();
        createConfetti();
        
        // Automatically switch to the new skin
        currentSkin = skinId;
        localStorage.setItem("currentSkin", currentSkin);
        
        updateStreakProgress(); // This will reset the bar towards the NEXT reward
        
        // Temporarily show claimed text
        const streakLabel = document.querySelector(".streak__label");
        streakLabel.textContent = `${claimedSkin} Unlocked!`;
        
        // Refresh settings UI
        const skinBtns = document.querySelectorAll(".skin__btn");
        skinBtns.forEach(btn => {
             const skin = btn.dataset.skin;
             btn.classList.toggle("active", skin === currentSkin);
             if(skin === skinId) {
                 btn.classList.remove('locked');
                 const lock = btn.querySelector('.lock__icon');
                 if(lock) lock.style.display = 'none';
             }
        });

        // Apply skin class to all dice immediately
        document.querySelectorAll(".dice").forEach(dice => {
            dice.classList.remove("classic-skin", "neon-skin", "metal-skin", "liquid-skin");
            dice.classList.add(`${currentSkin}-skin`);
        });
    }
};

// Luck Streak Logic
const initStreakUI = () => {
    const today = new Date().toDateString();
    const lastRoll = localStorage.getItem("lastRollDate");
    
    // Update Streak Count Display
    document.getElementById("streak-count").textContent = streakCount;
    updateStreakProgress();
    
    // Add Click Listener for Claiming
    const streakContainer = document.getElementById("streak-container");
    // Remove existing listeners to avoid duplicates (though init runs once usually)
    const newContainer = streakContainer.cloneNode(true);
    streakContainer.parentNode.replaceChild(newContainer, streakContainer);
    newContainer.addEventListener("click", handleRewardClaim);
    
    // Check eligibility for daily roll
    if (lastRoll !== today) {
        isDailyRollEligible = true;
    }
};

const createConfetti = () => {
    const container = document.getElementById('luck-confetti');
    container.innerHTML = '';
    const colors = ['#ffd700', '#ff8c00', '#fff', '#00f3ff', '#ff00ff'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '2px';
        confetti.style.opacity = Math.random();
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        container.appendChild(confetti);
        
        const animation = confetti.animate([
            { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
            { transform: `translate3d(${(Math.random() - 0.5) * 200}px, ${300 + Math.random() * 200}px, 0) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: 2000 + Math.random() * 1000,
            easing: 'cubic-bezier(0, .9, .57, 1)',
            delay: Math.random() * 500
        });
        
        animation.onfinish = () => confetti.remove();
    }
};

const processDailyLuckRoll = (number) => {
    const luckPopup = document.getElementById("luck-popup");
    const luckNewStreak = document.getElementById("luck-new-streak");
    
    if (number === 6) {
        streakCount++;
        localStorage.setItem("streakCount", streakCount);
        document.getElementById("streak-count").textContent = streakCount;
        updateStreakProgress();
        
        // Show Success Popup
        setTimeout(() => {
            luckNewStreak.textContent = streakCount;
            luckPopup.classList.add("active");
            createConfetti(); // Trigger confetti
            
            // Add extra heavy haptic for big win
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
        }, 1500);
    }
};

const setLuckPopup = () => {
    const closeBtn = document.getElementById("luck-close");
    const popup = document.getElementById("luck-popup");
    
    closeBtn.addEventListener("click", () => {
        popup.classList.remove("active");
        playHapticSound();
    });
};

const initSplashScreen = () => {
    const splash = document.getElementById("splash-screen");
    const progress = splash.querySelector(".splash-progress");
    const hasVisited = localStorage.getItem("itsDicey_visited");
    
    // Add animation class to progress bar
    progress.classList.add("animate");
    
    const duration = hasVisited ? 1800 : 3500; // Faster for repeat users
    
    setTimeout(() => {
        splash.classList.add("hidden");
        if (!hasVisited) {
            localStorage.setItem("itsDicey_visited", "true");
        }
        
        // Dispatch event that splash is done (optional but good practice)
        window.dispatchEvent(new CustomEvent('splash-finished'));
    }, duration);
};

window.addEventListener("DOMContentLoaded", () => {
    initSplashScreen();
    disableInterruptions();
    initializeAudio();
    initStreakUI(); // Init streak before roll buttons
    setChangeTheme();
    setRollButton();
    setSettingsButton();
    setHelpPopup();
    setLuckPopup();
    registerServiceWorker();
    initHistoryDrawer();
    
    if (isDarkTheme) {
        document.documentElement.classList.add("dark-theme");
    }
  
    loadHistory();
});
