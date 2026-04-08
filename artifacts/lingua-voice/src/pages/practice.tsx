import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useRoute } from "wouter";
import {
  useGetMe,
  useSendConversationMessage,
  useGetFeedback,
} from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mic,
  Square,
  Loader2,
  Play,
  Info,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Small helper: play a base64 audio string and return the audio element so
// callers can stop/replay it.
// ---------------------------------------------------------------------------
function playBase64Audio(base64: string, mimeType = "audio/mpeg"): HTMLAudioElement {
  const audio = new Audio(`data:${mimeType};base64,${base64}`);
  audio.play().catch(() => {});
  return audio;
}

// ---------------------------------------------------------------------------
// PhraseRow – shows one target phrase with a "Listen" button that fetches TTS
// ---------------------------------------------------------------------------
function PhraseRow({ phrase }: { phrase: string }) {
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleListen = async () => {
    if (audio) {
      audioRef.current?.pause();
      audioRef.current = playBase64Audio(audio);
      return;
    }
    setLoading(true);
    try {
      const res = await customFetch<{ audio: string }>("/api/voice/speak", {
        method: "POST",
        body: JSON.stringify({ text: phrase, useClonedVoice: false }),
        headers: { "Content-Type": "application/json" },
      });
      setAudio(res.audio);
      audioRef.current = playBase64Audio(res.audio);
    } catch {
      // silent – network issues shouldn't break the UI
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
      <span className="flex-1">{phrase}</span>
      <button
        onClick={handleListen}
        disabled={loading}
        title="Listen to pronunciation"
        className="shrink-0 text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
        data-testid={`button-listen-phrase`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// AudioReplayButton – a small button that replays a stored audio blob/base64
// ---------------------------------------------------------------------------
function AudioReplayButton({
  label,
  blobUrl,
  base64,
  mimeType = "audio/mpeg",
  icon: Icon = Play,
}: {
  label: string;
  blobUrl?: string | null;
  base64?: string | null;
  mimeType?: string;
  icon?: React.ElementType;
}) {
  const handlePlay = () => {
    if (blobUrl) {
      const a = new Audio(blobUrl);
      a.play().catch(() => {});
    } else if (base64) {
      playBase64Audio(base64, mimeType);
    }
  };

  if (!blobUrl && !base64) return null;

  return (
    <Button variant="outline" size="sm" onClick={handlePlay} className="h-8 gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main Practice page
// ---------------------------------------------------------------------------
export default function Practice() {
  const [, params] = useRoute("/practice/:day");
  const dayNumber = parseInt(params?.day || "1", 10);

  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const sendConversation = useSendConversationMessage();
  const getFeedback = useGetFeedback();
  const { toast } = useToast();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Playback state
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [tutorAudioBase64, setTutorAudioBase64] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isTutorPlaying, setIsTutorPlaying] = useState(false);
  const tutorAudioRef = useRef<HTMLAudioElement | null>(null);

  const curriculum = user?.curriculum;
  const dayData = curriculum?.days.find((d) => d.day === dayNumber);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
    };
  }, [userAudioUrl]);

  const playTutorAudio = useCallback((base64: string) => {
    if (tutorAudioRef.current) {
      tutorAudioRef.current.pause();
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    tutorAudioRef.current = audio;
    audio.onplay = () => setIsTutorPlaying(true);
    audio.onended = () => setIsTutorPlaying(false);
    audio.onpause = () => setIsTutorPlaying(false);
    audio.play().catch(() => setIsTutorPlaying(false));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleRecordingStop(mimeType);
      };

      recorder.start(100);
      setIsRecording(true);
      setTranscript("");
      setAiResponse("");
      setTutorAudioBase64(null);
      if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    } catch {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to practice.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordingStop = (mimeType: string) => {
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    const blobUrl = URL.createObjectURL(audioBlob);
    setUserAudioUrl(blobUrl);

    if (!curriculum || !dayData) return;

    sendConversation.mutate(
      {
        data: {
          audio: audioBlob,
          day: dayNumber,
          language: curriculum.language,
          scenario: dayData.scenario,
        },
      },
      {
        onSuccess: (data) => {
          setTranscript(data.transcript);
          setAiResponse(data.text);

          if (data.audio) {
            setTutorAudioBase64(data.audio);
            playTutorAudio(data.audio);
          }

          getFeedback.mutate({
            data: {
              userText: data.transcript,
              expectedPhrases: dayData.phrases,
              language: curriculum.language,
            },
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to send audio",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoadingUser || !dayData || !curriculum) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4 mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild size="sm" className="-ml-3" data-testid="button-back">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Badge variant="outline" className="bg-background">Day {dayNumber}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ---------------------------------------------------------------- */}
        {/* Left column: lesson context + phrase pronunciation                */}
        {/* ---------------------------------------------------------------- */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{dayData.title}</CardTitle>
              <CardDescription className="mt-1">{dayData.scenario}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Target Phrases</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Volume2 className="h-3 w-3" /> tap to listen
                </span>
              </div>
              <ul className="space-y-2">
                {dayData.phrases.map((phrase, i) => (
                  <PhraseRow key={i} phrase={phrase} />
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-muted/20 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Task:</span>{" "}
                {dayData.task}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right column: practice studio                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-md overflow-hidden bg-[#0A0A0E]">
            <div className="p-8 flex flex-col items-center justify-center min-h-[260px]">
              {/* Mic button */}
              <div className="relative mb-6">
                {isRecording && (
                  <div
                    className="absolute inset-0 rounded-full bg-destructive/20 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                )}
                <Button
                  size="icon"
                  className={`h-24 w-24 rounded-full shadow-xl transition-all ${
                    isRecording
                      ? "bg-destructive hover:bg-destructive/90 scale-105"
                      : "bg-primary hover:bg-primary/90 hover:scale-105"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sendConversation.isPending}
                  data-testid="button-mic"
                >
                  {isRecording ? (
                    <Square className="h-8 w-8 text-white fill-white" />
                  ) : (
                    <Mic className="h-10 w-10 text-white" />
                  )}
                </Button>
              </div>

              <div className="text-center h-8">
                {isRecording ? (
                  <span className="text-destructive font-medium animate-pulse">Recording…</span>
                ) : sendConversation.isPending ? (
                  <span className="text-primary flex items-center justify-center text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing with AI Tutor…
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Tap to speak</span>
                )}
              </div>
            </div>

            {/* Conversation log */}
            {(transcript || aiResponse) && (
              <div className="border-t border-border/20 bg-black/40 p-4 space-y-4">
                {/* User bubble */}
                {transcript && (
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">You</span>
                    <div className="bg-primary/20 text-primary-foreground border border-primary/30 rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm">
                      {transcript}
                    </div>
                    {userAudioUrl && (
                      <AudioReplayButton
                        label="Re-listen to your recording"
                        blobUrl={userAudioUrl}
                        mimeType="audio/webm"
                        icon={RotateCcw}
                      />
                    )}
                  </div>
                )}

                {/* Tutor bubble */}
                {aiResponse && (
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      AI Tutor
                      {isTutorPlaying && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </span>
                    <div className="bg-muted/50 border border-border/50 text-foreground rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%] text-sm">
                      {aiResponse}
                    </div>
                    {tutorAudioBase64 && (
                      <AudioReplayButton
                        label="Re-listen to tutor"
                        base64={tutorAudioBase64}
                        mimeType="audio/mpeg"
                        icon={Play}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Feedback panel */}
          {getFeedback.data && (
            <Card className="border-primary/30 shadow-sm bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getFeedback.data.corrections.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Corrections:</div>
                    {getFeedback.data.corrections.map((corr, i) => (
                      <div
                        key={i}
                        className="text-sm bg-background border border-border/50 rounded-md p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="line-through text-destructive/80">{corr.original}</span>
                          <span className="text-green-500 font-medium">{corr.corrected}</span>
                        </div>
                        <p className="text-muted-foreground text-xs">{corr.explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-500 font-medium">
                    Great job! No corrections needed.
                  </p>
                )}

                {getFeedback.data.improvedSentence && (
                  <div className="pt-2">
                    <div className="text-sm font-medium mb-2">Sound more natural:</div>
                    <div className="text-sm bg-background border border-border/50 rounded-md p-3 italic">
                      "{getFeedback.data.improvedSentence}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {getFeedback.isPending && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
