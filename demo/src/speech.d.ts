interface ImportMetaEnv {
  readonly FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SpeechResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechEvent extends Event {
  readonly results: ArrayLike<SpeechResult>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface Window {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  SpeechRecognition?: new () => SpeechRecognitionLike;
}
