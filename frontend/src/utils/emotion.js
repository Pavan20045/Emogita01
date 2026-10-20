import React from "react";

export const EMOTIONS = {
  angry: {
    key: "angry",
    label: "Angry",
    token: "--emo-angry",
    color: "#E0574A",
    colorLight: "#B93A2D",
    tone: "challenging",
    description: "There's frustration or anger in how you spoke.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
      </svg>
    )
  },
  disgust: {
    key: "disgust",
    label: "Disgust",
    token: "--emo-disgust",
    color: "#98A840",
    colorLight: "#7A8728",
    tone: "challenging",
    description: "Something feels wrong or unacceptable to you right now.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    )
  },
  fear: {
    key: "fear",
    label: "Fear",
    token: "--emo-fear",
    color: "#9A6FD0",
    colorLight: "#7A50B0",
    tone: "vulnerable",
    description: "There's worry or unease in your voice.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
      </svg>
    )
  },
  happiness: {
    key: "happiness",
    label: "Happiness",
    token: "--emo-happiness",
    color: "#F2B632",
    colorLight: "#C78E10",
    tone: "uplifting",
    description: "You sound light and glad.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    )
  },
  neutral: {
    key: "neutral",
    label: "Neutral",
    token: "--emo-neutral",
    color: "#8FA3AA",
    colorLight: "#687D84",
    tone: "balanced",
    description: "You sound calm and even.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    )
  },
  confidence: {
    key: "confidence",
    label: "Confidence",
    token: "--emo-confidence",
    color: "#34C49C",
    colorLight: "#209E7B",
    tone: "uplifting",
    description: "You sound sure and steady.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <path d="M4 18l8-12 8 12" />
        <path d="M9 18l3-4.5 3 4.5" />
      </svg>
    )
  },
  sadness: {
    key: "sadness",
    label: "Sadness",
    token: "--emo-sadness",
    color: "#5B74CC",
    colorLight: "#3F56AA",
    tone: "vulnerable",
    description: "There's heaviness or sadness in how you spoke.",
    renderIcon: (props = {}) => (
      <svg
        width={props.size || 24}
        height={props.size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-hidden"] !== undefined ? props["aria-hidden"] : true}
        {...props}
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    )
  }
};

/**
 * Normalizes input name and returns full emotion metadata object
 * @param {string} name 
 * @returns {typeof EMOTIONS['neutral']}
 */
export function emotionMeta(name) {
  if (!name || typeof name !== "string") {
    return EMOTIONS.neutral;
  }
  const clean = name.toLowerCase().trim();
  return EMOTIONS[clean] || EMOTIONS.neutral;
}

export const ORDERED_EMOTIONS = [
  "happiness",
  "confidence",
  "neutral",
  "sadness",
  "fear",
  "angry",
  "disgust"
];
