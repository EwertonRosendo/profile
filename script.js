const introScreen = document.getElementById("introScreen");
const profilePage = document.getElementById("profilePage");
const backgroundVideo = document.getElementById("backgroundVideo");

const trackDock = document.getElementById("trackDock");
const trackPanel = document.getElementById("trackPanel");
const trackLauncher = document.getElementById("trackLauncher");
// The MP4 already contains the soundtrack, so use one media element for both
// picture and sound. This avoids two files drifting out of sync and stuttering.
const trackAudio = backgroundVideo;
const playPause = document.getElementById("playPause");
const trackSeek = document.getElementById("trackSeek");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const volumeToggle = document.getElementById("volumeToggle");
const volumeSeek = document.getElementById("volumeSeek");

const discordCard = document.getElementById("discordCard");
const discordPrimary = document.getElementById("discordPrimary");
const DISCORD_USER_ID = "692029790911201390";

const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 9.4a3 3 0 0 1 0 5.2l-12.8 7C6.6 22.7 4 21.3 4 19V5c0-2.3 2.5-3.7 4.6-2.6z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

function setPlaying(isPlaying) {
  if (!playPause) return;
  playPause.innerHTML = isPlaying ? pauseIcon : playIcon;
  playPause.setAttribute("aria-label", isPlaying ? "Pause video" : "Play video");
  playPause.title = isPlaying ? "Pause" : "Play";
}

function syncSeekFromMedia() {
  if (!trackAudio || !trackSeek) return;
  const duration = trackAudio.duration;
  if (Number.isFinite(duration) && duration > 0) {
    trackSeek.value = String((trackAudio.currentTime / duration) * 100);
    if (currentTime) currentTime.textContent = formatTime(trackAudio.currentTime);
    if (totalTime) totalTime.textContent = formatTime(duration);
  }
}

function applyVolume() {
  if (!trackAudio || !volumeSeek) return;
  const level = Number(volumeSeek.value) / 100;
  trackAudio.volume = level;
  trackAudio.muted = level === 0;
  if (volumeToggle) volumeToggle.setAttribute("aria-label", trackAudio.muted ? "Unmute" : "Mute");
}

if (backgroundVideo) {
  backgroundVideo.pause();
  backgroundVideo.muted = false;
  backgroundVideo.volume = 0.1;
  backgroundVideo.preload = "auto";
  backgroundVideo.playsInline = true;
  backgroundVideo.loop = true;
  backgroundVideo.style.display = "none";
}
if (volumeSeek) volumeSeek.value = "10";

introScreen?.addEventListener("click", async () => {
  document.body.classList.add("entered");
  introScreen.classList.add("dismissed");
  introScreen.setAttribute("aria-hidden", "true");
  profilePage?.setAttribute("aria-hidden", "false");

  if (!backgroundVideo) return;
  backgroundVideo.style.display = "block";
  backgroundVideo.muted = false;
  applyVolume();

  // Call play directly from the click gesture so browsers permit audible playback.
  try {
    const playPromise = backgroundVideo.play();
    if (playPromise) await playPromise;
  } catch (error) {
    console.error("Video playback failed:", error);
    // Keep the intro dismissed, but let the user retry with the player button.
    setPlaying(false);
  }
});

trackLauncher?.addEventListener("click", () => {
  const open = trackPanel?.classList.toggle("hidden") === false;
  trackDock?.classList.toggle("is-open", open);
  trackLauncher?.setAttribute("aria-expanded", String(open));
});

playPause?.addEventListener("click", async () => {
  if (!trackAudio) return;
  if (trackAudio.paused) {
    trackAudio.muted = false;
    applyVolume();
    try { await trackAudio.play(); }
    catch (error) { console.error("Could not play video:", error); setPlaying(false); }
  } else {
    trackAudio.pause();
  }
});

let isSeeking = false;
trackSeek?.addEventListener("pointerdown", () => { isSeeking = true; });
trackSeek?.addEventListener("pointerup", () => { isSeeking = false; });
trackSeek?.addEventListener("change", () => { isSeeking = false; });
trackSeek?.addEventListener("input", () => {
  if (!trackAudio || !Number.isFinite(trackAudio.duration) || trackAudio.duration <= 0) return;
  trackAudio.currentTime = trackAudio.duration * (Number(trackSeek.value) / 100);
  if (currentTime) currentTime.textContent = formatTime(trackAudio.currentTime);
});

volumeSeek?.addEventListener("input", () => {
  if (volumeSeek.value !== "0" && trackAudio) trackAudio.muted = false;
  applyVolume();
});
volumeToggle?.addEventListener("click", () => {
  if (!trackAudio) return;
  if (trackAudio.muted || trackAudio.volume === 0) {
    trackAudio.muted = false;
    if (Number(volumeSeek?.value) === 0 && volumeSeek) volumeSeek.value = "10";
    applyVolume();
  } else {
    trackAudio.muted = true;
    volumeToggle.setAttribute("aria-label", "Unmute");
  }
});

trackAudio?.addEventListener("timeupdate", () => {
  // Never assign currentTime here: repeatedly seeking during playback causes stutter.
  if (!isSeeking) syncSeekFromMedia();
});
trackAudio?.addEventListener("loadedmetadata", syncSeekFromMedia);
trackAudio?.addEventListener("durationchange", syncSeekFromMedia);
trackAudio?.addEventListener("play", () => setPlaying(true));
trackAudio?.addEventListener("pause", () => setPlaying(false));
trackAudio?.addEventListener("ended", () => setPlaying(false));

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
