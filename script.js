const introScreen = document.getElementById("introScreen");
const profilePage = document.getElementById("profilePage");
const backgroundVideo = document.getElementById("backgroundVideo");

const trackDock = document.getElementById("trackDock");
const trackPanel = document.getElementById("trackPanel");
const trackLauncher = document.getElementById("trackLauncher");
const trackAudio = document.getElementById("trackAudio");
const playPause = document.getElementById("playPause");
const trackSeek = document.getElementById("trackSeek");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const volumeToggle = document.getElementById("volumeToggle");
const volumeSeek = document.getElementById("volumeSeek");

const discordCard = document.getElementById("discordCard");
const discordPrimary = document.getElementById("discordPrimary");

const DISCORD_USER_ID = "692029790911201390";

const playIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 9.4a3 3 0 0 1 0 5.2l-12.8 7C6.6 22.7 4 21.3 4 19V5c0-2.3 2.5-3.7 4.6-2.6z"/></svg>';
const pauseIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function setPlaying(isPlaying) {
  if (!playPause) {
    return;
  }

  playPause.innerHTML = isPlaying ? pauseIcon : playIcon;
  playPause.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  playPause.title = isPlaying ? "Pause" : "Play";
}

function syncSeekFromAudio() {
  if (!trackAudio || !trackSeek || !trackAudio.duration) {
    return;
  }

  const ratio = (trackAudio.currentTime / trackAudio.duration) * 100;
  trackSeek.value = String(ratio);
  if (currentTime) {
    currentTime.textContent = formatTime(trackAudio.currentTime);
  }
}

function applyVolume() {
  if (!trackAudio || !volumeSeek) {
    return;
  }

  const level = Number(volumeSeek.value) / 100;
  trackAudio.volume = level;
  trackAudio.muted = level === 0;

  if (volumeToggle) {
    volumeToggle.setAttribute("aria-label", trackAudio.muted ? "Unmute" : "Mute");
  }
}

if (backgroundVideo) {
  // Ensure video is muted from start
  backgroundVideo.muted = true;
  
  // Don't autoplay on page load - let user click first
  backgroundVideo.pause();
  
  // Set initial display to none in case it's not properly hidden
  backgroundVideo.style.display = 'none';
}

// Initialize audio element
if (trackAudio) {
  trackAudio.muted = true;
  trackAudio.preload = "auto";
}

introScreen?.addEventListener("click", async () => {
  document.body.classList.add("entered");
  introScreen.classList.add("dismissed");
  introScreen.setAttribute("aria-hidden", "true");
  profilePage?.setAttribute("aria-hidden", "false");

  if (backgroundVideo) {
    try {
      // Show and play video when user clicks the intro screen
      backgroundVideo.style.display = 'block';
      
      // Ensure video is loaded first
      if (backgroundVideo.readyState < 2) {
        await new Promise((resolve, reject) => {
          backgroundVideo.load();
          backgroundVideo.onloadeddata = () => resolve();
          backgroundVideo.onerror = () => reject(new Error("Failed to load video"));
        });
      }
      
      // Play the video
      const playPromise = backgroundVideo.play();
      if (playPromise !== undefined) {
        try {
          await playPromise;
          console.log("Video started successfully");
        } catch (error) {
          console.error("Video playback failed:", error);
          // Try to recover from autoplay restrictions
          backgroundVideo.load();
          setTimeout(() => {
            backgroundVideo.play().catch(() => {});
          }, 100);
        }
      }
      
      // Set video to play in loop
      backgroundVideo.loop = true;
    } catch (error) {
      console.error("Error initializing video:", error);
    }
  }
});

trackLauncher?.addEventListener("click", () => {
  const open = trackPanel?.classList.toggle("hidden") === false;
  trackDock?.classList.toggle("is-open", open);
  trackLauncher?.setAttribute("aria-expanded", String(open));
});

playPause?.addEventListener("click", async () => {
  if (!trackAudio) {
    return;
  }

  // Sync video with audio when play/pause is clicked
  if (trackAudio.paused) {
    try {
      await trackAudio.play();
      setPlaying(true);
      
      // Also start the background video if it's not playing
      if (backgroundVideo && backgroundVideo.paused) {
        // Make sure we're not trying to seek on a paused video
        try {
          backgroundVideo.currentTime = trackAudio.currentTime;
        } catch (e) {
          console.warn("Could not set video time:", e);
        }
        
        backgroundVideo.play().catch(() => {});
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlaying(false);
    }
  } else {
    trackAudio.pause();
    setPlaying(false);
    
    // Pause video when audio is paused
    if (backgroundVideo) {
      backgroundVideo.pause();
    }
  }
});

trackSeek?.addEventListener("input", () => {
  if (!trackAudio || !trackAudio.duration) {
    return;
  }

  const ratio = Number(trackSeek.value) / 100;
  trackAudio.currentTime = trackAudio.duration * ratio;
  syncSeekFromAudio();
  
  // Also update video time to match audio
  if (backgroundVideo) {
    backgroundVideo.currentTime = trackAudio.currentTime;
  }
});

volumeSeek?.addEventListener("input", applyVolume);

volumeToggle?.addEventListener("click", () => {
  if (!trackAudio) {
    return;
  }

  trackAudio.muted = !trackAudio.muted;

  if (!trackAudio.muted && Number(volumeSeek?.value) === 0) {
    volumeSeek.value = "10";
  }

  applyVolume();
});

trackAudio?.addEventListener("timeupdate", () => {
  syncSeekFromAudio();
  
  // Keep video in sync with audio
  if (backgroundVideo && !backgroundVideo.paused) {
    try {
      backgroundVideo.currentTime = trackAudio.currentTime;
    } catch (error) {
      console.warn("Could not sync video time:", error);
    }
  }
});

trackAudio?.addEventListener("loadedmetadata", () => {
  if (totalTime) {
    totalTime.textContent = formatTime(trackAudio.duration);
  }
  syncSeekFromAudio();
});

trackAudio?.addEventListener("play", () => {
  setPlaying(true);
  
  // Start video when audio starts playing
  if (backgroundVideo && backgroundVideo.paused) {
    backgroundVideo.play().catch(() => {});
  }
});
trackAudio?.addEventListener("pause", () => {
  setPlaying(false);
  
  // Pause video when audio is paused
  if (backgroundVideo) {
    backgroundVideo.pause();
  }
});

applyVolume();
setPlaying(false);

async function loadDiscordPresence() {
  if (!discordCard || !discordPrimary) {
    return;
  }

  discordCard.classList.add("is-loading");

  try {
    const response = await fetch(
      `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`
    );
    const payload = await response.json();

    if (!payload.success || !payload.data) {
      throw new Error("presence unavailable");
    }

    const user = payload.data.discord_user;
    const avatarWrap = discordCard.querySelector(".discord-avatar-wrap");
    const skeleton = discordCard.querySelector(".discord-avatar-skeleton");

    if (user?.avatar && avatarWrap && skeleton) {
      const ext = user.avatar.startsWith("a_") ? "gif" : "png";
      const img = document.createElement("img");
      img.className = "discord-avatar";
      img.alt = user.global_name || user.username || "Discord user";
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
      skeleton.replaceWith(img);
    }

    discordPrimary.textContent = user?.global_name || user?.username || "Discord";

    const status = payload.data.discord_status || "offline";
    const statusEl = discordCard.querySelector(".discord-status");
    statusEl?.classList.toggle("offline", status === "offline");
    statusEl?.setAttribute("title", `Discord ${status}`);

    discordCard.classList.remove("is-loading");
  } catch {
    discordPrimary.textContent = "Loading";
    discordCard.classList.add("is-loading");
  }
}

loadDiscordPresence();
