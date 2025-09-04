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
        <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
      </button>
      <button class="control-button" @click="stopAudio" :disabled="!audioSrc || !hasStartedPlaying">
        <i class="fas fa-stop"></i>
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
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

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
    
    // Colors
    const primaryColor = computed(() => props.content?.primaryColor || '#1890ff');
    const textColor = computed(() => props.content?.textColor || '#333');

    // Audio source
    const audioSrc = computed(() => props.content?.audioUrl || '');

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
      textColor,
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
      cyclePlaybackSpeed
    };
  }
};
</script>

<style lang="scss" scoped>
.audio-player {
  width: 100%;
  padding: 8px;
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

  > i {
    font-size: 14px;
    color: v-bind('primaryColor') !important;
  }
  
  &:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
  
  &.seek-slider:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background-color: v-bind('primaryColor + "22"');
    border-color: v-bind('primaryColor');
    i {
      color: v-bind('primaryColor');
    }
  }
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
  background: #333;
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
    background: #444;
  }

  &:active {
    background: #222;
  }
}

.time-display {
  font-size: 12px;
  color: v-bind('textColor');
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
  z-index: 1;
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
  z-index: 0;
}
</style>