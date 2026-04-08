import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCloneVoice, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, CheckCircle2, ArrowLeft, Loader2, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RecordingState = "idle" | "recording" | "recorded" | "uploading" | "success";

export default function Onboarding() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cloneVoice = useCloneVoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setRecordingSeconds(0);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingState("recorded");
      };

      recorder.start(100);
      setRecordingState("recording");

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 120) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access and try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setRecordingState("idle");
  };

  const playBack = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  const handleUpload = () => {
    if (!audioBlob) return;
    setRecordingState("uploading");

    const file = new File([audioBlob], "voice-sample.webm", { type: audioBlob.type });

    cloneVoice.mutate({ data: { audio: file } }, {
      onSuccess: () => {
        setRecordingState("success");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({
          title: "Voice Cloned Successfully",
          description: "Your vocal identity is ready for practice.",
        });
      },
      onError: (error) => {
        setRecordingState("recorded");
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to clone voice. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (recordingState === "success") {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/30 shadow-lg text-center p-6">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Studio Ready</CardTitle>
            <CardDescription className="text-base mt-2">
              Your vocal identity has been successfully cloned. The AI tutor will now speak back to you in your own voice.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center mt-6">
            <Button size="lg" onClick={() => setLocation("/dashboard")} data-testid="button-go-dashboard">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12 px-4 mx-auto flex-1 flex flex-col justify-center">
      <Button variant="ghost" asChild className="self-start mb-8 -ml-4" data-testid="button-back">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Voice Setup</CardTitle>
          <CardDescription>
            Record 30–60 seconds of yourself speaking naturally. Read a book aloud, describe your day, or just talk — any clear speech works. Find a quiet room for best results.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="flex flex-col items-center gap-6 py-4">
            {recordingState === "idle" && (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <Mic className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Click the button below to start recording your voice sample.
                </p>
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="h-12 px-8"
                  data-testid="button-start-recording"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Recording
                </Button>
              </>
            )}

            {recordingState === "recording" && (
              <>
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/50 flex items-center justify-center">
                    <Mic className="h-10 w-10 text-red-400" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold text-foreground tabular-nums">
                  {formatTime(recordingSeconds)}
                </div>
                <p className="text-sm text-muted-foreground">Recording — speak naturally…</p>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  disabled={recordingSeconds < 10}
                  className="h-12 px-8"
                  data-testid="button-stop-recording"
                >
                  <Square className="mr-2 h-4 w-4" />
                  {recordingSeconds < 10 ? `Stop (${10 - recordingSeconds}s min)` : "Stop Recording"}
                </Button>
              </>
            )}

            {(recordingState === "recorded" || recordingState === "uploading") && audioUrl && (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Recording complete</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatTime(recordingSeconds)} recorded</p>
                </div>
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={playBack} data-testid="button-play-back">
                    <Play className="mr-2 h-4 w-4" />
                    Play back
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetRecording} disabled={recordingState === "uploading"} data-testid="button-re-record">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Re-record
                  </Button>
                </div>
              </>
            )}
          </div>

          {recordingState === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cloning your voice…</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            onClick={handleUpload}
            disabled={recordingState !== "recorded"}
            data-testid="button-upload-voice"
          >
            {recordingState === "uploading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Identity…
              </>
            ) : (
              "Clone My Voice"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
