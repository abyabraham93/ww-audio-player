<template>
<div class="audio-player">
<audio
ref="audioElement"
:src="audioSrc"
preload="metadata"
@timeupdate="onTimeUpdate"
@loadedmetadata="onLoadedMetadata"
@ended="onEnded"
@error="onError"
></audio>
<div class="player-controls">
<button class="control-button" :class="{ active: isPlaying }" @click="togglePlay" :disabled="!audioSrc">
<svg v-if="!isPlaying" viewBox="-3 0 28 28" xmlns="http://www.w3.org/2000/svg" class="icon">
<path d="M440.415,583.554 L421.418,571.311 C420.291,570.704 419,570.767 419,572.946 L419,597.054 C419,599.046 420.385,599.36 421.418,598.689 L440.415,586.446 C441.197,585.647 441.197,584.353 440.415,583.554" transform="translate(-419.000000, -571.000000)" fill="currentColor"></path>
</svg>
<svg v-else viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon">
<path d="M7 1H2V15H7V1Z" fill="currentColor"></path>
<path d="M14 1H9V15H14V1Z" fill="currentColor"></path>
</svg>
</button>
<button class="control-button" @click="stopAudio" :disabled="!audioSrc || !hasStartedPlaying">
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon">
<rect x="1" y="1" width="14" height="14" fill="currentColor"></rect>
</svg>
</button>
<button class="control-button" :class="{ active: showWaveform }" @click="toggleWaveform" :disabled="!audioSrc">
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" class="icon">
<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3.5,25.018h9.8767l2.2775-10.9731,2.2775,20.1622L20.2092,9.0623l2.2775,29.8754L24.7642,9.1925,27.0417,36.428l2.2775-25.4062L31.5967,29.778l2.2775-16.2172,2.2775,11.3627H44.5"/>
</svg>
</button>
<div class="time-display">{{ formatTime(currentTime) }}</div>
<div class="seek-container">
<input
type="range"
class="seek-slider"
min="0"
:max="duration"
step="0.01"
:value="currentTime"
@input="onSeek"
:disabled="!audioSrc || duration === 0"
/>
<div class="seek-progress" :style="{ width: `${(currentTime / duration) * 100 || 0}%`, backgroundColor: primaryColor }"></div>
</div>
<div class="time-display">{{ formatTime(duration) }}</div>
<div class="speed-control">
<button class="speed-button" @click="cyclePlaybackSpeed">
<span class="speed-value">{{ playbackSpeed }}x</span>
</button>
</div>
</div>
<transition name="waveform-slide">
<div v-if="showWaveform" class="waveform-panel">
<div class="waveform-body">
<div class="channel-labels">
<div class="channel-label">Caller</div>
<div class="channel-label">Agent</div>
</div>
<div :id="waveformId" ref="waveformContainer" class="waveform-container"></div>
<div v-if="waveformLoading" class="waveform-status">Loading waveform…</div>
<div v-if="waveformError" class="waveform-status waveform-status--error">{{ waveformError }}</div>
</div>
<div class="zoom-control">
<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="zoom-icon"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
<input type="range" class="zoom-slider" min="10" max="500" step="10" :value="zoomLevel" @input="onZoom" />
</div>
</div>
</transition>
</div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import WaveSurfer from 'wavesurfer.js';

export default {
props: {
content: { 
type: Object, 
required: true 
},
uid: { 
type: String, 
required: true 
},
/* wwEditor:start */
wwEditorState: { 
type: Object, 
required: true 
},
/* wwEditor:end */
},
emits: ['trigger-event'],
setup(props, { emit }) {
// Editor state
const isEditing = computed(() => {
/* wwEditor:start */
return props.wwEditorState.isEditing;
/* wwEditor:end */
// eslint-disable-next-line no-unreachable
return false;
});

// Audio element reference
const audioElement = ref(null);

// Player state
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const hasStartedPlaying = ref(false);
const loadError = ref(false);
const playbackSpeed = ref(1);

// Primary color
const primaryColor = computed(() => props.content?.primaryColor || '#1890ff');

// Audio source
const audioSrc = computed(() => props.content?.audioUrl || '');

// Waveform toggle
const showWaveform = ref(false);
const waveformContainer = ref(null);
const waveformId = `ap-wave-${props.uid}`;
const zoomLevel = ref(50);
const waveformLoading = ref(false);
const waveformError = ref('');
let wsInstance = null;

const initWaveSurfer = () => {
if (!waveformContainer.value || !audioSrc.value) return;
if (wsInstance) {
wsInstance.destroy();
wsInstance = null;
}
waveformLoading.value = true;
waveformError.value = '';
wsInstance = WaveSurfer.create({
container: `#${waveformId}`,
media: audioElement.value,
height: 72,
splitChannels: [
{
waveColor: 'rgba(74, 154, 245, 0.85)',
progressColor: 'rgba(26, 90, 191, 0.85)',
},
{
waveColor: 'rgba(245, 130, 74, 0.85)',
progressColor: 'rgba(191, 70, 26, 0.85)',
},
],
interact: true,
});
wsInstance.on('ready', () => {
waveformLoading.value = false;
wsInstance.zoom(zoomLevel.value);
});
wsInstance.on('error', (err) => {
console.error('[AudioPlayer] WaveSurfer error:', err);
waveformLoading.value = false;
const msg = err?.message || String(err);
if (msg.includes('fetch') || msg.includes('abort') || msg.includes('Abort') || msg.includes('CORS')) {
waveformError.value = 'Waveform unavailable: the audio URL does not allow cross-origin access. Enable CORS on your audio storage (S3, GCS, etc.) to allow fetch from this domain.';
} else {
waveformError.value = msg;
}
});
const proxyBase = props.content?.corsProxyUrl?.trim();
const waveformSrc = proxyBase ? `${proxyBase}${audioSrc.value}` : audioSrc.value;
console.log('[AudioPlayer] proxyBase:', proxyBase);
console.log('[AudioPlayer] audioSrc:', audioSrc.value);
console.log('[AudioPlayer] waveformSrc:', waveformSrc);
wsInstance.load(waveformSrc);
};

watch(waveformContainer, (el) => {
if (el && showWaveform.value) {
initWaveSurfer();
}
});

const toggleWaveform = () => {
showWaveform.value = !showWaveform.value;
if (!showWaveform.value && wsInstance) {
wsInstance.destroy();
wsInstance = null;
}
};

const onZoom = (e) => {
zoomLevel.value = Number(e.target.value);
if (wsInstance) {
wsInstance.zoom(zoomLevel.value);
}
};

watch(() => props.content?.audioUrl, () => {
if (showWaveform.value && waveformContainer.value) {
initWaveSurfer();
}
});

// Playback speed control
const cyclePlaybackSpeed = () => {
const speeds = [1, 2, 3];
const currentIndex = speeds.indexOf(playbackSpeed.value);
const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
playbackSpeed.value = nextSpeed;
if (audioElement.value) {
audioElement.value.playbackRate = nextSpeed;
}
};

// Internal variable for current audio state
const { value: playerState, setValue: setPlayerState } = wwLib.wwVariable.useComponentVariable({
uid: props.uid,
name: 'playerState',
type: 'string',
defaultValue: 'stopped',
});

// Internal variable for current time
const { value: audioCurrentTime, setValue: setAudioCurrentTime } = wwLib.wwVariable.useComponentVariable({
uid: props.uid,
name: 'currentTime',
type: 'number',
defaultValue: 0,
});

// Internal variable for audio duration
const { value: audioDuration, setValue: setAudioDuration } = wwLib.wwVariable.useComponentVariable({
uid: props.uid,
name: 'duration',
type: 'number',
defaultValue: 0,
});

// Watch for audio URL changes
watch(() => props.content?.audioUrl, (newUrl) => {
if (newUrl) {
resetPlayer();
loadError.value = false;
}
});

// Watch for autoPlay setting
watch(() => props.content?.autoPlay, (shouldAutoPlay) => {
if (shouldAutoPlay && audioElement.value && audioSrc.value && !isPlaying.value) {
playAudio();
}
}, { immediate: true });

// Format time in MM:SS format
const formatTime = (timeInSeconds) => {
if (!timeInSeconds || isNaN(timeInSeconds)) return '00:00';

const minutes = Math.floor(timeInSeconds / 60);
const seconds = Math.floor(timeInSeconds % 60);

return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Player control methods
const playAudio = () => {
if (isEditing.value) return;
if (!audioElement.value || !audioSrc.value) return;

audioElement.value.play()
.then(() => {
isPlaying.value = true;
hasStartedPlaying.value = true;
setPlayerState('playing');
emit('trigger-event', { name: 'play', event: { time: currentTime.value } });
})
.catch(error => {
console.error('Error playing audio:', error);
loadError.value = true;
emit('trigger-event', { name: 'error', event: { error: 'Failed to play audio' } });
});
};

const pauseAudio = () => {
if (isEditing.value) return;
if (!audioElement.value || !isPlaying.value) return;

audioElement.value.pause();
isPlaying.value = false;
setPlayerState('paused');
emit('trigger-event', { name: 'pause', event: { time: currentTime.value } });
};

const stopAudio = () => {
if (isEditing.value) return;
if (!audioElement.value) return;

audioElement.value.pause();
audioElement.value.currentTime = 0;
isPlaying.value = false;
currentTime.value = 0;
setAudioCurrentTime(0);
setPlayerState('stopped');
emit('trigger-event', { name: 'stop', event: {} });
};

const togglePlay = () => {
if (isEditing.value) return;
if (isPlaying.value) {
pauseAudio();
} else {
playAudio();
}
};

const seekTo = (time) => {
if (isEditing.value) return;
if (!audioElement.value || !audioSrc.value) return;

const seekTime = Math.min(Math.max(0, time), duration.value);
audioElement.value.currentTime = seekTime;
currentTime.value = seekTime;
setAudioCurrentTime(seekTime);
emit('trigger-event', { name: 'seek', event: { time: seekTime } });
};

const onSeek = (event) => {
if (isEditing.value) return;
const seekTime = parseFloat(event.target.value);
seekTo(seekTime);
};

// Event handlers
const onTimeUpdate = () => {
if (!audioElement.value) return;
currentTime.value = audioElement.value.currentTime;
setAudioCurrentTime(currentTime.value);
};

const onLoadedMetadata = () => {
if (!audioElement.value) return;
duration.value = audioElement.value.duration;
setAudioDuration(duration.value);
emit('trigger-event', { name: 'loaded', event: { duration: duration.value } });

// Auto play if enabled
if (props.content?.autoPlay && !isPlaying.value) {
playAudio();
}
};

const onEnded = () => {
isPlaying.value = false;
setPlayerState('stopped');
emit('trigger-event', { name: 'ended', event: {} });
};

const onError = () => {
loadError.value = true;
emit('trigger-event', { name: 'error', event: { error: 'Failed to load audio' } });
};

const resetPlayer = () => {
if (audioElement.value) {
audioElement.value.pause();
audioElement.value.currentTime = 0;
}
isPlaying.value = false;
currentTime.value = 0;
duration.value = 0;
hasStartedPlaying.value = false;
setAudioCurrentTime(0);
setAudioDuration(0);
setPlayerState('stopped');
};

// Clean up on component unmount
onBeforeUnmount(() => {
if (audioElement.value && isPlaying.value) {
audioElement.value.pause();
}
if (wsInstance) {
wsInstance.destroy();
wsInstance = null;
}
});

return {
audioElement,
audioSrc,
isPlaying,
currentTime,
duration,
hasStartedPlaying,
loadError,
primaryColor,
formatTime,
playAudio,
pauseAudio,
stopAudio,
togglePlay,
seekTo,
onSeek,
onTimeUpdate,
onLoadedMetadata,
onEnded,
onError,
playbackSpeed,
cyclePlaybackSpeed,
showWaveform,
waveformContainer,
waveformId,
zoomLevel,
waveformLoading,
waveformError,
toggleWaveform,
onZoom,
};
}
};
</script>

<style lang="scss" scoped>
.audio-player {
width: 100%;
padding: 8px;
border-radius: 4px;
background-color: #f5f5f5;
}

.player-controls {
display: flex;
align-items: center;
gap: 8px;
width: 100%;
}

.control-button {
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border-radius: 50%;
background-color: #ffffff;
border: 1px solid #e0e0e0;
cursor: pointer;
transition: all 0.2s ease;
flex-shrink: 0;

&:hover:not(:disabled) {
background-color: #f0f0f0;
}

&:disabled {
opacity: 0.5;
cursor: not-allowed;
}

.icon {
width: 16px;
height: 16px;
color: #333;
}

&.active {
background-color: v-bind('primaryColor + "22"');
border-color: v-bind('primaryColor');

.icon {
color: v-bind('primaryColor');
}
}
}

.time-display {
font-size: 12px;
color: #666;
white-space: nowrap;
flex-shrink: 0;
}

.seek-container {
position: relative;
flex-grow: 1;
height: 16px;
}

.seek-slider {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
margin: 0;
-webkit-appearance: none;
appearance: none;
background: transparent;
z-index: 2;
cursor: pointer;

&::-webkit-slider-thumb {
-webkit-appearance: none;
width: 12px;
height: 12px;
border-radius: 50%;
background: v-bind('primaryColor');
cursor: pointer;
border: none;
margin-top: -4px;
}

&::-moz-range-thumb {
width: 12px;
height: 12px;
border-radius: 50%;
background: v-bind('primaryColor');
cursor: pointer;
border: none;
}

&:disabled {
cursor: not-allowed;

&::-webkit-slider-thumb {
background: #ccc;
}

&::-moz-range-thumb {
background: #ccc;
}
}
}

.seek-slider::-webkit-slider-runnable-track {
width: 100%;
height: 4px;
background: #e0e0e0;
border-radius: 2px;
border: none;
}

.seek-slider::-moz-range-track {
width: 100%;
height: 4px;
background: #e0e0e0;
border-radius: 2px;
border: none;
}

.seek-progress {
position: absolute;
top: 6px;
left: 0;
height: 4px;
background-color: v-bind('primaryColor');
border-radius: 2px;
pointer-events: none;
z-index: 2;
}

.speed-control {
margin-left: 12px;
display: inline-flex;
align-items: center;
}

.speed-button {
padding: 6px 12px;
border: none;
border-radius: 6px;
background: #000;
cursor: pointer;
transition: all 0.2s;
display: inline-flex;
align-items: center;
justify-content: center;
min-width: 42px;

.speed-value {
color: #fff;
font-size: 13px;
font-weight: 500;
line-height: 1;
}

&:hover {
background: #222;
}

&:active {
background: #000;
}
}

.waveform-panel {
margin-top: 8px;
border-radius: 8px;
background: #fafafa;
border: 1px solid #e8e8e8;
overflow: hidden;
padding: 10px 10px 8px;
}

.waveform-body {
display: flex;
align-items: stretch;
gap: 0;
}

.channel-labels {
display: flex;
flex-direction: column;
width: 44px;
flex-shrink: 0;
}

.channel-label {
height: 72px;
display: flex;
align-items: center;
font-size: 10px;
font-weight: 700;
color: #999;
letter-spacing: 0.6px;
text-transform: uppercase;
}

.waveform-container {
flex: 1;
min-width: 0;
}

.zoom-control {
display: flex;
align-items: center;
gap: 6px;
margin-top: 8px;
padding: 0 2px;
}

.zoom-icon {
color: #aaa;
flex-shrink: 0;
display: flex;
align-items: center;
}

.zoom-slider {
flex: 1;
height: 3px;
-webkit-appearance: none;
appearance: none;
background: #e0e0e0;
border-radius: 2px;
cursor: pointer;
outline: none;

&::-webkit-slider-thumb {
-webkit-appearance: none;
width: 12px;
height: 12px;
border-radius: 50%;
background: v-bind('primaryColor');
cursor: pointer;
border: none;
}

&::-moz-range-thumb {
width: 12px;
height: 12px;
border-radius: 50%;
background: v-bind('primaryColor');
cursor: pointer;
border: none;
}
}

.waveform-status {
font-size: 11px;
color: #aaa;
padding: 4px 2px;
font-style: italic;

&--error {
color: #e53935;
font-style: normal;
font-weight: 500;
}
}

.waveform-slide-enter-active,
.waveform-slide-leave-active {
transition: all 0.25s ease;
overflow: hidden;
}

.waveform-slide-enter-from,
.waveform-slide-leave-to {
opacity: 0;
max-height: 0;
margin-top: 0;
}

.waveform-slide-enter-to,
.waveform-slide-leave-from {
opacity: 1;
max-height: 300px;
}
</style>