# WeWeb Custom Component — Complete Reference

> This document contains everything needed to build a WeWeb custom component from scratch.
> It is backend-agnostic — no Firebase, no Telnyx, no project-specific logic.
> Written for AI agents and developers who need to create, extend, or debug WeWeb plugins.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Create a New Component](#2-create-a-new-component)
3. [File Structure](#3-file-structure)
4. [The Golden Rule](#4-the-golden-rule)
5. [ww-config.js — The Component Contract](#5-ww-configjs--the-component-contract)
6. [wwElement.vue — The Runtime Component](#6-wwelementvue--the-runtime-component)
7. [The Data Flow Model](#7-the-data-flow-model)
8. [Adding Features — Step-by-Step Checklists](#8-adding-features--step-by-step-checklists)
9. [WeWeb Editor Wiring](#9-weweb-editor-wiring)
10. [Debugging & Common Pitfalls](#10-debugging--common-pitfalls)
11. [Full Starter Templates](#11-full-starter-templates)
12. [Command Cheat Sheet](#12-command-cheat-sheet)

---

## 1. Environment Setup

### Node Version (CRITICAL)

WeWeb CLI requires **Node 18.16.1**. Other versions may cause silent build failures.

```bash
nvm install 18.16.1
nvm use 18.16.1
node -v   # must output v18.16.1
```

Always run `nvm use 18.16.1` before any WeWeb CLI command (`serve`, `build`).

---

## 2. Create a New Component

```bash
# Scaffold a blank component
npm init @weweb/component

# Install the WeWeb CLI (required for serve/build)
npm install --save-dev @weweb/cli

# Install all dependencies
npm install
```

### Start Local Dev Server

```bash
npm run serve --port=8080
```

This starts a local server that the WeWeb editor connects to for live development.
You configure this port in the WeWeb editor's "Custom Code" panel.

### Kill a Stuck Port

```bash
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Test Build

```bash
npm run build -- name="my-component" type="element"
```

If this fails, do NOT publish. Fix errors first.

### Format Code

**Shift + Option + F** (macOS) to auto-format in VS Code / Windsurf.

---

## 3. File Structure

```
my-component/
  ├── src/
  │   └── wwElement.vue        # Runtime logic + UI (Vue 3)
  ├── ww-config.js             # Component contract with WeWeb editor
  ├── package.json             # Scripts + dependencies
  └── ...                      # Any helper .js files you import
```

### What Each File Does

- **`ww-config.js`** — Declares everything the WeWeb editor needs to know: properties, actions, trigger events, variables, states. This is the **contract**. If it's not here, the editor doesn't see it.
- **`src/wwElement.vue`** — Vue 3 single-file component. Contains template, script (setup), and styles. This is where your runtime logic lives.
- **`package.json`** — Must contain `build` and `serve` scripts pointing to `weweb build` and `weweb serve`.

### package.json Scripts

```json
{
  "name": "ww-my-component",
  "version": "0.0.1",
  "scripts": {
    "build": "weweb build",
    "serve": "weweb serve"
  },
  "devDependencies": {
    "@weweb/cli": "^3.8.13"
  },
  "dependencies": {}
}
```

---

## 4. The Golden Rule

```
┌─────────────────────────────────────────────────────────┐
│  ALWAYS register in ww-config.js FIRST.                 │
│  If it's not in config, the WeWeb editor can't see it.  │
└─────────────────────────────────────────────────────────┘
```

This applies to:
- Properties (editor inputs)
- Actions (callable from workflows)
- Trigger Events (events emitted to workflows)
- Variables (bindable outputs)
- States (component states like "ready", "active", etc.)

---

## 5. ww-config.js — The Component Contract

This file is the **single source of truth** for what the WeWeb editor knows about your component.
It is a default export of a plain JavaScript object.

```js
export default {
  editor: { ... },
  states: [ ... ],
  variables: [ ... ],
  actions: [ ... ],
  triggerEvents: [ ... ],
  properties: { ... },
};
```

### 5.1 `editor` — Component Metadata

Defines how the component appears in the WeWeb editor sidebar.

```js
editor: {
  label: { en: "My Component" },   // Display name (multilingual object)
  icon: "phone"                     // Icon name from WeWeb's icon set
}
```

Common icons: `"phone"`, `"box"`, `"cursor"`, `"settings"`, `"play"`, `"mic"`, `"video"`.

### 5.2 `states` — Component States

An array of state names. States are toggled at runtime and can be used in the WeWeb editor for conditional styling or visibility.

```js
states: ["ready", "ringing", "active", "ended", "held"]
```

At runtime, you toggle states via emits:
```js
emit("add-state", "active");      // Activate a state
emit("remove-state", "active");   // Deactivate a state
```

**Use cases:** Show/hide elements based on component state, apply conditional CSS classes in the editor, trigger workflows on state changes.

### 5.3 `variables` — Bindable Output Values

Variables are **output values** exposed to the WeWeb editor. Users can bind them to text, conditions, or other components.

```js
variables: [
  {
    name: "callState",                    // Must match useComponentVariable name
    label: { en: "Call State" },          // Editor display label
    type: "string",                       // Type: "string", "number", "boolean", "object", "array"
    defaultValue: "offline"               // Initial value
  },
  {
    name: "customerData",
    label: { en: "Customer Data" },
    type: "object",
    defaultValue: { name: null, phone: null, email: null }
  },
  {
    name: "messageLog",
    label: { en: "Message Log" },
    type: "array",
    defaultValue: []
  },
  {
    name: "isOnHold",
    label: { en: "Is On Hold" },
    type: "boolean",
    defaultValue: false
  }
]
```

**Supported types:** `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`.

### 5.4 `actions` — Functions Callable from Workflows

Actions are functions exposed to the WeWeb editor. Users call them from workflows (e.g., "On Page Load → call Connect").

```js
actions: [
  {
    label: "Connect with Token",          // Button label in editor
    action: "connectWithToken",           // Must match function name in setup() return
    args: [                               // Arguments the user provides in the editor
      {
        name: "token",                    // Argument name (passed as function parameter)
        type: "string",                   // Type hint for the editor
        label: { en: "API Token" }        // Editor label
      }
    ]
  },
  { label: "Disconnect", action: "disconnect" },       // No args
  { label: "Answer Call", action: "answerCall" },
  { label: "Hang Up", action: "hangUp" },
  { label: "Toggle Mute", action: "toggleMute" },
]
```

**Rules:**
- `action` value MUST exactly match a function name returned from `setup()`.
- `args` is optional. If provided, each arg becomes an input field in the editor's workflow panel.
- Args are passed to the function in the same order they are defined.

### 5.5 `triggerEvents` — Events Emitted to Workflows

Trigger events let your component fire events that WeWeb workflows can listen to. The `event` object defines the **payload schema** — what fields are available in the workflow.

```js
triggerEvents: [
  {
    name: "onConnected",                  // Must match emit name in code
    label: { en: "On Connected" },        // Editor display label
    event: null                           // No payload
  },
  {
    name: "onIncomingCall",
    label: { en: "On Incoming Call" },
    event: {                              // Payload schema — defines available fields
      callerNumber: "",                   // String fields
      callerName: "",
      callId: ""
    },
    default: true                         // Optional: make this the default trigger
  },
  {
    name: "onCallEnded",
    label: { en: "On Call Ended" },
    event: {
      callerNumber: "",
      callId: "",
      duration: 0,                        // Number fields
      endReason: ""
    }
  },
  {
    name: "onError",
    label: { en: "On Error" },
    event: { message: "", code: "" }
  }
]
```

**The `event` object is a SCHEMA, not data.** It tells WeWeb what fields exist so users can reference them in workflows (e.g., `event.callerNumber`). The actual values are provided at runtime when you emit.

**Nested objects work too:**
```js
{
  name: "onAIResponse",
  label: { en: "On AI Response" },
  event: {
    attributes: { name: null, phone: null, email: null },
    options: { question: "", suggestion: "" },
    transcript: { text: "", from: "" },
    timestamp: 0,
    callId: ""
  }
}
```

### 5.6 `properties` — Editor Input Settings

Properties are **input values** that users configure in the WeWeb editor's right panel. They flow into the component as `props.content.<propertyName>`.

#### Basic Property Types

```js
properties: {
  // Text input
  apiEndpoint: {
    label: { en: "API Endpoint" },
    type: "Text",
    defaultValue: "https://api.example.com",
    bindable: true                        // Allow binding to a WeWeb variable
  },

  // Number input with min/max
  refreshInterval: {
    label: { en: "Refresh Interval (seconds)" },
    type: "Number",
    defaultValue: 30,
    bindable: true,
    options: {
      min: 5,
      max: 300
    }
  },

  // Toggle (boolean)
  autoStart: {
    label: { en: "Auto Start" },
    type: "OnOff",
    defaultValue: false,
    bindable: true
  },

  // Color picker
  accentColor: {
    label: { en: "Accent Color" },
    type: "Color",
    defaultValue: "#3B82F6",
    bindable: true
  }
}
```

#### Sections — Group Properties in Editor

Use `section` to organize properties into collapsible groups:

```js
apiKey: {
  label: { en: "API Key" },
  type: "Text",
  section: "settings",               // Groups under "settings" section
  defaultValue: "",
  bindable: true
}
```

#### Editor Tooltips & Help

Use `/* wwEditor:start */` and `/* wwEditor:end */` blocks for editor-only metadata. These are **stripped from production builds**.

```js
myProperty: {
  label: { en: "My Setting" },
  type: "Text",
  defaultValue: "",
  bindable: true,
  /* wwEditor:start */
  bindingValidation: {
    type: "string",
    tooltip: "Explain what this field does and what format to use"
  },
  propertyHelp: {
    tooltip: "More detailed explanation shown as a help icon"
  }
  /* wwEditor:end */
}
```

#### All Property Types

| Type       | Editor Widget        | Value Type  |
|------------|---------------------|-------------|
| `"Text"`   | Text input          | `string`    |
| `"Number"` | Number input        | `number`    |
| `"OnOff"`  | Toggle switch       | `boolean`   |
| `"Color"`  | Color picker        | `string`    |

---

## 6. wwElement.vue — The Runtime Component

This is a standard **Vue 3 Single File Component** with a specific interface that WeWeb expects.

### 6.1 Component Skeleton

Every WeWeb component MUST follow this structure:

```vue
<template>
  <div class="my-component">
    <!-- Your UI here -->
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  props: {
    content: { type: Object, required: true },   // All properties from ww-config.js
    uid: { type: String, required: true },        // Unique component instance ID
  },
  emits: ['trigger-event', 'add-state', 'remove-state'],
  setup(props, { emit }) {

    // --- Variables ---
    // --- Reactive refs ---
    // --- Actions ---
    // --- Lifecycle ---

    return {
      // Everything the template OR WeWeb actions need access to
    };
  }
};
</script>

<style lang="scss" scoped>
/* Scoped styles */
</style>
```

**Critical requirements:**
- `props.content` — Contains ALL properties from `ww-config.js`. Access via `props.content.myProperty`.
- `props.uid` — Unique ID for this component instance. Required for `useComponentVariable`.
- `emits` — Must declare all three: `'trigger-event'`, `'add-state'`, `'remove-state'`.
- `setup()` return — Must include ALL action functions AND any refs used in the template.

### 6.2 Reading Properties

Every property declared in `ww-config.js → properties` is available at runtime:

```js
// In setup():
const apiUrl = props.content.apiEndpoint;       // String
const interval = props.content.refreshInterval; // Number  
const autoStart = props.content.autoStart;      // Boolean
const color = props.content.accentColor;        // String (hex)
```

**Properties are reactive.** If the user binds a property to a WeWeb variable, it updates automatically. Use `watch` or `computed` to react:

```js
watch(() => props.content.autoStart, (newVal) => {
  if (newVal) startPolling();
  else stopPolling();
});
```

**Always provide fallback defaults** in case the user hasn't set them:

```js
const interval = props.content.refreshInterval || 30;
const label = props.content.buttonText || 'Click me';
```

### 6.3 Exposing Variables with `useComponentVariable`

Variables let your component push data OUT to the WeWeb editor for binding.

```js
// Declare variable (must match ww-config.js → variables[].name)
const { value: myVar, setValue: setMyVar } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,           // Required — links to this component instance
  name: 'callState',        // Must match config name EXACTLY
  type: 'string',           // Must match config type
  defaultValue: 'offline'   // Must match config defaultValue
});

// Update the variable (WeWeb editor sees this immediately)
setMyVar('active');
```

**Common pattern — local ref + variable sync:**

Often you want a local `ref` for internal logic AND an exposed variable for the editor:

```js
// Exposed to WeWeb editor
const { setValue: setCallState } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: 'callState',
  type: 'string',
  defaultValue: 'offline',
});

// Local reactive ref for internal template/logic
const callState = ref('offline');

// Helper to update both at once
function updateCallState(newState) {
  callState.value = newState;
  setCallState(newState);
}
```

**Object and array variables:**

```js
const { setValue: setCustomerData } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: 'customerData',
  type: 'object',
  defaultValue: { name: null, phone: null, email: null },
});

// Update with a new object (always pass a full new object, don't mutate)
setCustomerData({ name: 'John', phone: '+1555...', email: 'j@x.com' });
```

```js
const { setValue: setMessages } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: 'messageLog',
  type: 'array',
  defaultValue: [],
});

// Append to array (create new array, don't push to existing)
const current = [...messages.value];
current.push({ text: 'Hello', from: 'user', timestamp: Date.now() });
setMessages(current);
```

### 6.4 Implementing Actions

Actions are plain functions in `setup()`. They MUST be included in the `return` statement.

```js
setup(props, { emit }) {
  let connection = null;

  // Action: connect — called from WeWeb workflow
  async function connectWithToken(token) {
    if (!token) {
      emit('trigger-event', {
        name: 'onError',
        event: { message: 'Token is required', code: 'NO_TOKEN' }
      });
      return;
    }

    try {
      connection = await createConnection(token);
      emit('add-state', 'ready');
      emit('trigger-event', { name: 'onConnected', event: null });
    } catch (err) {
      emit('trigger-event', {
        name: 'onError',
        event: { message: err.message, code: 'CONNECTION_FAILED' }
      });
    }
  }

  // Action: disconnect — no args
  function disconnect() {
    if (connection) connection.close();
    connection = null;
    emit('remove-state', 'ready');
    emit('trigger-event', {
      name: 'onDisconnected',
      event: { reason: 'user_initiated' }
    });
  }

  // MUST return action functions so WeWeb can call them
  return { connectWithToken, disconnect };
}
```

**Action argument mapping:**
- Config: `args: [{ name: "token", ... }, { name: "mode", ... }]`
- Function signature: `function connectWithToken(token, mode) { ... }`
- Arguments are passed positionally in the order defined in config.

### 6.5 Emitting Trigger Events

Trigger events push data from your component into WeWeb workflows.

```js
emit('trigger-event', {
  name: 'onIncomingCall',     // Must EXACTLY match triggerEvents[].name in config
  event: {                     // Actual data — fields must match the schema
    callerNumber: '+14155551234',
    callerName: 'John Doe',
    callId: 'abc-123'
  }
});
```

**Rules:**
- `name` must exactly match `ww-config.js → triggerEvents[].name`.
- `event` fields should match the schema defined in config. Extra fields are ignored by the editor.
- `event: null` for events with no payload.
- You can emit trigger events from anywhere in `setup()` — actions, watchers, event handlers, timers, etc.

**Emit with no payload:**
```js
emit('trigger-event', { name: 'onConnected', event: null });
```

### 6.6 Managing Component States

States are binary flags (on/off) that the WeWeb editor uses for conditional logic.

```js
// Activate a state
emit('add-state', 'active');

// Deactivate a state
emit('remove-state', 'active');
```

**Common pattern — sync states with your internal callState:**

```js
watch(callState, (newState, oldState) => {
  // Remove old state
  if (oldState && states.includes(oldState)) {
    emit('remove-state', oldState);
  }
  // Add new state
  if (newState && states.includes(newState)) {
    emit('add-state', newState);
  }
});
```

### 6.7 Lifecycle Hooks

```js
onMounted(() => {
  console.log('[MyComponent] Mounted');
  // Start listeners, timers, etc.
});

onBeforeUnmount(() => {
  console.log('[MyComponent] Unmounting — cleaning up');
  // ALWAYS clean up: close connections, clear timers, remove listeners
  if (connection) connection.close();
  if (timer) clearInterval(timer);
});
```

**Critical:** Always clean up in `onBeforeUnmount`. WeWeb can mount/unmount components when users navigate between pages or when editor reloads.

### 6.8 Watchers

Use `watch` to react to property changes or internal state changes:

```js
// Watch a single property
watch(() => props.content.refreshInterval, (newVal) => {
  restartPolling(newVal);
});

// Watch multiple properties
watch(
  [() => props.content.apiEndpoint, () => props.content.apiKey],
  ([newUrl, newKey]) => {
    reconnect(newUrl, newKey);
  }
);

// Watch an internal ref
watch(callState, (newState, oldState) => {
  console.log(`State changed: ${oldState} → ${newState}`);
  emit('trigger-event', {
    name: 'onStatusChange',
    event: { status: newState, previousStatus: oldState }
  });
});
```

### 6.9 Computed Properties

```js
const statusText = computed(() => {
  switch (callState.value) {
    case 'offline': return 'Offline';
    case 'idle': return 'Ready';
    case 'active': return 'On Call';
    default: return callState.value;
  }
});

const displayNumber = computed(() => {
  if (!currentCall.value.number) return 'Unknown';
  if (props.content.maskNumber) {
    return currentCall.value.number.slice(0, 6) + 'XXXXXX';
  }
  return currentCall.value.number;
});
```

### 6.10 Template References

Use `ref` for DOM element access (e.g., audio elements, canvas):

```js
const audioElement = ref(null);

onMounted(() => {
  if (audioElement.value) {
    audioElement.value.volume = 0.8;
  }
});

return { audioElement };
```

```html
<audio ref="audioElement" autoplay></audio>
```

### 6.11 Styles

Use `<style lang="scss" scoped>` for component styles. Scoped styles are isolated to the component.

```vue
<style lang="scss" scoped>
$primary: #3B82F6;
$danger: #EF4444;

.my-component {
  padding: 16px;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__button {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    color: white;
    background: $primary;

    &--danger {
      background: $danger;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
```

**Dynamic styles from properties:**

```html
<div :style="{ '--primary-color': props.content.primaryColor || '#3B82F6' }">
```

```scss
.my-component {
  color: var(--primary-color);
}
```

---

## 7. The Data Flow Model

Understanding how data flows between the WeWeb editor, `ww-config.js`, and `wwElement.vue`:

```
┌──────────────────────────────────────────────────────────────────┐
│                        WeWeb Editor                              │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │ Properties   │    │ Workflows     │    │ Bindings           │  │
│  │ (right panel)│    │ (actions +    │    │ (text, conditions, │  │
│  │              │    │  triggers)    │    │  other components) │  │
│  └──────┬───────┘    └──────┬───────┘    └────────▲───────────┘  │
│         │                   │                     │              │
└─────────┼───────────────────┼─────────────────────┼──────────────┘
          │                   │                     │
          ▼                   ▼                     │
┌──────────────────────────────────────────────────────────────────┐
│                       ww-config.js                               │
│                                                                  │
│  properties { }  ──►  Defines input fields for editor            │
│  actions [ ]     ──►  Defines callable functions for workflows   │
│  triggerEvents [ ] ►  Defines events workflows can listen to     │
│  variables [ ]   ──►  Defines output values for bindings         │
│  states [ ]      ──►  Defines toggleable states for conditionals │
│                                                                  │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      wwElement.vue                               │
│                                                                  │
│  props.content.*           ◄── Read property values              │
│  function myAction()       ◄── Implement actions                 │
│  emit('trigger-event')     ──► Fire events to workflows          │
│  useComponentVariable()    ──► Push data to bindings             │
│  emit('add-state')         ──► Toggle states                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Quick Summary

| Direction | Mechanism | Example |
|-----------|-----------|---------|
| **Editor → Component** | Properties | `props.content.apiKey` |
| **Editor → Component** | Action calls | Workflow calls `connect(token)` |
| **Component → Editor** | Variables | `setCallState('active')` |
| **Component → Editor** | Trigger events | `emit('trigger-event', { name, event })` |
| **Component → Editor** | States | `emit('add-state', 'ready')` |

---

## 8. Adding Features — Step-by-Step Checklists

### Add a New Property

```
1. ww-config.js → properties → add property definition
2. wwElement.vue → read via props.content.<propertyName>
3. Add fallback default: props.content.myProp || 'default'
4. Optional: add watch() if you need to react to changes
5. Optional: add /* wwEditor:start */ tooltip /* wwEditor:end */
```

### Add a New Action

```
1. ww-config.js → actions → add { label, action, args? }
2. wwElement.vue → create function with matching name
3. If args defined, function params match args order
4. Add to setup() return statement
5. Test from WeWeb workflow panel
```

### Add a New Trigger Event

```
1. ww-config.js → triggerEvents → add { name, label, event schema }
2. wwElement.vue → emit('trigger-event', { name: 'exactName', event: { ... } })
3. In WeWeb editor → create workflow triggered by this event
4. Event payload fields are available as event.fieldName in workflow
```

### Add a New Variable

```
1. ww-config.js → variables → add { name, label, type, defaultValue }
2. wwElement.vue → create useComponentVariable({ uid, name, type, defaultValue })
   (name, type, defaultValue must ALL match config)
3. Use setValue() to update
4. Bind in WeWeb editor via component variable picker
```

### Add a New State

```
1. ww-config.js → states → add state name to array
2. wwElement.vue → emit('add-state', 'stateName') to activate
3. wwElement.vue → emit('remove-state', 'stateName') to deactivate
4. In WeWeb editor → use state for conditional visibility/styling
```

---

## 9. WeWeb Editor Wiring

How to use your component in the WeWeb editor after building it.

### Basic Setup Flow

```
1. Drop component onto page
          ↓
2. Set properties in right panel (or bind to WeWeb variables)
          ↓
3. Create workflow: On Page Load → call component action (e.g., connect)
          ↓
4. Create workflows for trigger events (e.g., On Incoming Call → show modal)
          ↓
5. Bind exposed variables to UI elements (e.g., {{ component.callState }})
```

### Example: Full Workflow Setup

```
WORKFLOW: "Initialize Component"
  Trigger: On Page Load
  Steps:
    1. Component Action → connectWithToken(currentUser.token)

WORKFLOW: "Handle Incoming Event"
  Trigger: On Incoming Call (component trigger event)
  Steps:
    1. Change Variable → set currentCallerId = event.callerNumber
    2. Open Modal → "Incoming Call Modal"
    3. Log → event.callId

WORKFLOW: "Handle Call End"
  Trigger: On Call Ended (component trigger event)
  Steps:
    1. API Call → log call data (event.duration, event.callId)
    2. Close Modal
    3. Reset UI state

BINDINGS:
  Text element → {{ component.callState }}
  Show/hide    → component.callState === 'active'
  Color        → component.callState === 'active' ? 'green' : 'grey'
```

### Property Binding Examples

In the editor, you can bind any `bindable: true` property to:
- A WeWeb variable: `{{ myVariable }}`
- A formula: `{{ currentUser.token }}`
- A static value: typed directly in the input field

---

## 10. Debugging & Common Pitfalls

### The 5 Most Common Mistakes

**1. Name mismatch between config and code**
```
WRONG: config says action: "startCall", code has function startcall()
RIGHT: config says action: "startCall", code has function startCall()
```
Names are CASE SENSITIVE. Copy-paste to be safe.

**2. Action not returned from setup()**
```js
// WRONG — action exists but isn't returned
setup(props, { emit }) {
  function myAction() { ... }
  return { /* myAction missing! */ };
}

// RIGHT
setup(props, { emit }) {
  function myAction() { ... }
  return { myAction };
}
```

**3. Variable name mismatch**
```js
// Config says:
variables: [{ name: "callState", ... }]

// WRONG:
useComponentVariable({ uid: props.uid, name: 'CallState', ... })  // Capital C!

// RIGHT:
useComponentVariable({ uid: props.uid, name: 'callState', ... })
```

**4. Emitting trigger event not registered in config**
```js
// This silently does nothing if 'onMyEvent' isn't in triggerEvents:
emit('trigger-event', { name: 'onMyEvent', event: { data: 123 } });
```
Always check that the event name exists in `ww-config.js → triggerEvents`.

**5. Forgetting cleanup in onBeforeUnmount**
```js
// WRONG — timers/connections leak when component unmounts
let interval = setInterval(() => poll(), 5000);

// RIGHT
onBeforeUnmount(() => {
  if (interval) clearInterval(interval);
  if (connection) connection.close();
});
```

### Debug Logging Strategy

Add structured logs at key points:

```js
// Action entry/exit
function connect(token) {
  console.log('[MyComponent] connect() called with token:', token ? '***' : 'MISSING');
  // ... logic ...
  console.log('[MyComponent] connect() completed successfully');
}

// Event emission
console.log('[MyComponent] Emitting onIncomingCall:', JSON.stringify(eventPayload));
emit('trigger-event', { name: 'onIncomingCall', event: eventPayload });

// State changes
console.log(`[MyComponent] State: ${oldState} → ${newState}`);
```

### Build Fails?

```bash
# Check Node version first
node -v   # Must be 18.16.1

# Clean and rebuild
rm -rf node_modules
npm install
npm run build -- name="my-component" type="element"
```

---

## 11. Full Starter Templates

### `ww-config.js` — Complete Starter

```js
export default {
  editor: {
    label: { en: "My Component" },
    icon: "box"
  },
  states: ["ready", "active", "error"],
  variables: [
    {
      name: "status",
      label: { en: "Status" },
      type: "string",
      defaultValue: "idle"
    },
    {
      name: "itemCount",
      label: { en: "Item Count" },
      type: "number",
      defaultValue: 0
    },
    {
      name: "lastResult",
      label: { en: "Last Result" },
      type: "object",
      defaultValue: { success: false, message: "" }
    }
  ],
  actions: [
    {
      label: "Initialize",
      action: "initialize",
      args: [
        { name: "apiKey", type: "string", label: { en: "API Key" } }
      ]
    },
    { label: "Start", action: "start" },
    { label: "Stop", action: "stop" },
    { label: "Reset", action: "reset" }
  ],
  triggerEvents: [
    {
      name: "onReady",
      label: { en: "On Ready" },
      event: null
    },
    {
      name: "onDataReceived",
      label: { en: "On Data Received" },
      event: { id: "", data: {}, timestamp: 0 }
    },
    {
      name: "onError",
      label: { en: "On Error" },
      event: { message: "", code: "" }
    },
    {
      name: "onStatusChange",
      label: { en: "On Status Change" },
      event: { status: "", previousStatus: "" }
    }
  ],
  properties: {
    apiEndpoint: {
      label: { en: "API Endpoint" },
      type: "Text",
      section: "settings",
      defaultValue: "",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Full URL to your API endpoint"
      }
      /* wwEditor:end */
    },
    pollInterval: {
      label: { en: "Poll Interval (seconds)" },
      type: "Number",
      section: "settings",
      defaultValue: 30,
      bindable: true,
      options: { min: 5, max: 300 }
    },
    autoStart: {
      label: { en: "Auto Start on Load" },
      type: "OnOff",
      section: "settings",
      defaultValue: false,
      bindable: true
    },
    accentColor: {
      label: { en: "Accent Color" },
      type: "Color",
      defaultValue: "#3B82F6",
      bindable: true
    }
  }
};
```

### `src/wwElement.vue` — Complete Starter

```vue
<template>
  <div class="my-component">
    <div class="my-component__header">
      <span class="my-component__status" :class="'my-component__status--' + status">
        {{ statusLabel }}
      </span>
    </div>

    <div class="my-component__body">
      <p v-if="status === 'idle'">Ready to start</p>
      <p v-else-if="status === 'active'">Running... {{ itemCount }} items</p>
      <p v-else-if="status === 'error'">Something went wrong</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
  },
  emits: ['trigger-event', 'add-state', 'remove-state'],
  setup(props, { emit }) {

    // ── Exposed Variables ──────────────────────────────────────
    const { setValue: setStatus } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid, name: 'status', type: 'string', defaultValue: 'idle',
    });
    const { setValue: setItemCount } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid, name: 'itemCount', type: 'number', defaultValue: 0,
    });
    const { setValue: setLastResult } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid, name: 'lastResult', type: 'object',
      defaultValue: { success: false, message: '' },
    });

    // ── Local State ────────────────────────────────────────────
    const status = ref('idle');
    const itemCount = ref(0);
    let pollTimer = null;
    let apiKey = null;

    // ── Computed ───────────────────────────────────────────────
    const statusLabel = computed(() => {
      const labels = { idle: 'Idle', active: 'Active', error: 'Error' };
      return labels[status.value] || status.value;
    });

    // ── Helpers ────────────────────────────────────────────────
    function updateStatus(newStatus) {
      const prev = status.value;
      status.value = newStatus;
      setStatus(newStatus);

      // Sync component states
      if (prev) emit('remove-state', prev);
      if (newStatus) emit('add-state', newStatus);

      // Fire status change event
      emit('trigger-event', {
        name: 'onStatusChange',
        event: { status: newStatus, previousStatus: prev }
      });
    }

    // ── Actions ────────────────────────────────────────────────
    function initialize(key) {
      if (!key) {
        emit('trigger-event', {
          name: 'onError',
          event: { message: 'API key is required', code: 'NO_KEY' }
        });
        return;
      }
      apiKey = key;
      updateStatus('ready');
      emit('add-state', 'ready');
      emit('trigger-event', { name: 'onReady', event: null });
      console.log('[MyComponent] Initialized');
    }

    function start() {
      if (!apiKey) {
        emit('trigger-event', {
          name: 'onError',
          event: { message: 'Not initialized', code: 'NOT_INIT' }
        });
        return;
      }
      updateStatus('active');
      const interval = (props.content.pollInterval || 30) * 1000;
      pollTimer = setInterval(poll, interval);
      console.log('[MyComponent] Started polling every', interval, 'ms');
    }

    function stop() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      updateStatus('idle');
      console.log('[MyComponent] Stopped');
    }

    function reset() {
      stop();
      itemCount.value = 0;
      setItemCount(0);
      setLastResult({ success: false, message: '' });
      console.log('[MyComponent] Reset');
    }

    async function poll() {
      try {
        const endpoint = props.content.apiEndpoint;
        if (!endpoint) return;
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await res.json();
        itemCount.value += 1;
        setItemCount(itemCount.value);
        setLastResult({ success: true, message: 'OK' });
        emit('trigger-event', {
          name: 'onDataReceived',
          event: { id: data.id || '', data, timestamp: Date.now() }
        });
      } catch (err) {
        updateStatus('error');
        emit('trigger-event', {
          name: 'onError',
          event: { message: err.message, code: 'POLL_FAILED' }
        });
      }
    }

    // ── Watchers ───────────────────────────────────────────────
    watch(() => props.content.pollInterval, (newVal) => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = setInterval(poll, (newVal || 30) * 1000);
      }
    });

    // ── Lifecycle ──────────────────────────────────────────────
    onMounted(() => {
      console.log('[MyComponent] Mounted');
      if (props.content.autoStart && apiKey) start();
    });

    onBeforeUnmount(() => {
      console.log('[MyComponent] Cleaning up');
      if (pollTimer) clearInterval(pollTimer);
    });

    // ── Return ─────────────────────────────────────────────────
    // MUST include: all action functions + all template refs/computed
    return {
      status, itemCount, statusLabel,
      initialize, start, stop, reset,
    };
  }
};
</script>

<style lang="scss" scoped>
.my-component {
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  &__header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__status {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;

    &--idle { background: #f3f4f6; color: #6b7280; }
    &--ready { background: #dbeafe; color: #2563eb; }
    &--active { background: #dcfce7; color: #16a34a; }
    &--error { background: #fee2e2; color: #dc2626; }
  }

  &__body {
    text-align: center;
    padding: 24px 0;
    color: #374151;
    font-size: 14px;
  }
}
</style>
```

### `package.json` — Starter

```json
{
  "name": "ww-my-component",
  "version": "0.0.1",
  "scripts": {
    "build": "weweb build",
    "serve": "weweb serve"
  },
  "devDependencies": {
    "@weweb/cli": "^3.8.13"
  },
  "dependencies": {}
}
```

---

## 12. Command Cheat Sheet

```bash
# ── ALWAYS run first ──
nvm use 18.16.1

# ── Create new component ──
npm init @weweb/component
npm install --save-dev @weweb/cli
npm install

# ── Local dev (WeWeb editor connects here) ──
npm run serve --port=8080

# ── Kill stuck port ──
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9

# ── Test build before publishing ──
npm run build -- name="ww-my-component" type="element"

# ── Install a new dependency ──
npm install some-package

# ── Format code (VS Code / Windsurf) ──
# Shift + Option + F
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                  WeWeb Component Cheat Sheet                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REGISTER FIRST ──► ww-config.js                            │
│  IMPLEMENT SECOND ► src/wwElement.vue                       │
│                                                             │
│  Read property ───► props.content.myProp                    │
│  Expose variable ─► wwLib.wwVariable.useComponentVariable() │
│  Fire event ──────► emit('trigger-event', { name, event })  │
│  Call action ─────► function in setup() return              │
│  Toggle state ────► emit('add-state' / 'remove-state')     │
│                                                             │
│  Names MUST match between config and code (case sensitive)  │
│  Actions MUST be in setup() return statement                │
│  Always clean up in onBeforeUnmount()                       │
│  Node version: 18.16.1 (non-negotiable)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
