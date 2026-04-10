export default {
  editor: {
    label: {
      en: 'Audio Player'
    },
    icon: 'music-note'
  },
  properties: {
    audioUrl: {
      label: { 
        en: 'Audio URL' 
      },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing the URL of the audio file to play',
      },
      propertyHelp: {
        tooltip: 'The URL of the audio file to play. Supports MP3, WAV, OGG, and other browser-supported audio formats.',
      },
      /* wwEditor:end */
    },
    autoPlay: {
      label: { 
        en: 'Auto Play' 
      },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: false,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Bind to a boolean value to control whether the audio should play automatically when loaded',
      },
      propertyHelp: {
        tooltip: 'When enabled, the audio will start playing automatically when the page loads (browser policies may restrict this behavior)',
      },
      /* wwEditor:end */
    },
    primaryColor: {
      label: { 
        en: 'Primary Color' 
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#1890ff',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color value (hex, rgb, rgba)',
      },
      propertyHelp: {
        tooltip: 'The primary color used for active elements like the play button and progress bar',
      },
      /* wwEditor:end */
    }
  },
  triggerEvents: [
    {
      name: 'play',
      label: { en: 'On play' },
      event: { time: 0 }
    },
    {
      name: 'pause',
      label: { en: 'On pause' },
      event: { time: 0 }
    },
    {
      name: 'stop',
      label: { en: 'On stop' },
      event: {}
    },
    {
      name: 'seek',
      label: { en: 'On seek' },
      event: { time: 0 }
    },
    {
      name: 'ended',
      label: { en: 'On ended' },
      event: {}
    },
    {
      name: 'loaded',
      label: { en: 'On loaded' },
      event: { duration: 0 }
    },
    {
      name: 'error',
      label: { en: 'On error' },
      event: { error: '' }
    }
  ],
  actions: [
    {
      action: 'playAudio',
      label: { en: 'Play' }
    },
    {
      action: 'pauseAudio',
      label: { en: 'Pause' }
    },
    {
      action: 'stopAudio',
      label: { en: 'Stop' }
    },
    {
      action: 'seekTo',
      label: { en: 'Seek to time' },
      args: [
        {
          name: 'time',
          type: 'number',
          label: { en: 'Time in seconds' }
        }
      ]
    }
  ]
};