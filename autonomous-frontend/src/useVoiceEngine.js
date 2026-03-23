import { useEffect, useRef, useCallback, useState } from "react";

// Voice profiles for each agent persona
const VOICE_PROFILES = {
  "Stealthy & Precise": {
    pitch: 0.8,
    rate: 0.9,
    voiceIndex: 0, // System-dependent
    description: "Calm, low-pitched, slightly robotic"
  },
  "Aggressive & Adaptive": {
    pitch: 1.2,
    rate: 1.3,
    voiceIndex: 1,
    description: "Fast-paced, energetic, authoritative"
  },
  "Analytical & Thorough": {
    pitch: 1.0,
    rate: 1.0,
    voiceIndex: 2,
    description: "Neutral, clear, articulate"
  },
  "Creative & Unpredictable": {
    pitch: 1.1,
    rate: 1.1,
    voiceIndex: 3,
    description: "Dynamic, varying pitch and speed"
  }
};

export function useVoiceEngine() {
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(transcript);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech Recognition error:", event.error);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, []);

  // Load available voices for TTS
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthesisRef.current.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    synthesisRef.current.onvoiceschanged = loadVoices;
  }, []);

  // Start listening for voice commands
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      recognitionRef.current.start();
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Speak text with agent-specific voice
  const speak = useCallback(
    (text, agentPersona = "Analytical & Thorough") => {
      if (!synthesisRef.current) return;

      // Cancel any ongoing speech
      synthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voiceProfile = VOICE_PROFILES[agentPersona] || VOICE_PROFILES["Analytical & Thorough"];

      // Set voice properties
      utterance.pitch = voiceProfile.pitch;
      utterance.rate = voiceProfile.rate;

      // Select voice from available voices
      if (availableVoices.length > 0) {
        const voiceIndex = Math.min(voiceProfile.voiceIndex, availableVoices.length - 1);
        utterance.voice = availableVoices[voiceIndex];
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error("Speech Synthesis error:", event.error);
        setIsSpeaking(false);
      };

      synthesisRef.current.speak(utterance);
    },
    [availableVoices]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    availableVoices
  };
}

// Parse voice commands
export function parseVoiceCommand(transcript) {
  const lower = transcript.toLowerCase().trim();

  // Command patterns
  if (lower.includes("status of")) {
    const match = lower.match(/status of (.+)/i);
    if (match) {
      return { type: "agent_status", agent: match[1].trim() };
    }
  }

  if (lower.includes("assign mission")) {
    const match = lower.match(/assign mission (.+) to (.+)/i);
    if (match) {
      return { type: "assign_mission", mission: match[1].trim(), agent: match[2].trim() };
    }
  }

  if (lower.includes("show") || lower.includes("go to")) {
    const pages = ["missions", "agents", "banter", "analytics", "autonomous"];
    for (const page of pages) {
      if (lower.includes(page)) {
        return { type: "navigate", page };
      }
    }
  }

  if (lower.includes("enable autonomous") || lower.includes("turn on brain")) {
    return { type: "toggle_autonomous", enabled: true };
  }

  if (lower.includes("disable autonomous") || lower.includes("turn off brain")) {
    return { type: "toggle_autonomous", enabled: false };
  }

  if (lower.includes("clear notifications")) {
    return { type: "clear_notifications" };
  }

  if (lower.includes("help")) {
    return { type: "help" };
  }

  return { type: "unknown", transcript };
}
