import { useState, useRef, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { 
  useGetMe, 
  useSendConversationMessage, 
  useGetFeedback 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mic, Square, Loader2, PlayCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Practice() {
  const [, params] = useRoute("/practice/:day");
  const dayNumber = parseInt(params?.day || "1", 10);
  
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const sendConversation = useSendConversationMessage();
  const getFeedback = useGetFeedback();
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  
  const [transcript, setTranscript] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Find current day curriculum
  const curriculum = user?.curriculum;
  const dayData = curriculum?.days.find(d => d.day === dayNumber);

  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.onended = () => setIsPlaying(false);
      audioPlayerRef.current.onplay = () => setIsPlaying(true);
      audioPlayerRef.current.onpause = () => setIsPlaying(false);
    }
  }, [audioPlayerRef.current]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("");
      setAiResponse("");
    } catch (error) {
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRecordingStop = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    if (!curriculum || !dayData) return;

    sendConversation.mutate({
      data: {
        audio: audioBlob,
        day: dayNumber,
        language: curriculum.language,
        scenario: dayData.scenario,
      }
    }, {
      onSuccess: (data) => {
        setTranscript(data.transcript);
        setAiResponse(data.text);
        
        // Play AI response
        if (audioPlayerRef.current && data.audio) {
          audioPlayerRef.current.src = `data:audio/mpeg;base64,${data.audio}`;
          audioPlayerRef.current.play().catch(e => console.error("Audio play failed", e));
        }

        // Get feedback
        getFeedback.mutate({
          data: {
            userText: data.transcript,
            expectedPhrases: dayData.phrases,
            language: curriculum.language,
          }
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to send audio",
          description: err.message,
          variant: "destructive",
        });
      }
    });
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
        {/* Left Column: Context */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{dayData.title}</CardTitle>
              <CardDescription className="mt-1">{dayData.scenario}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium mb-3">Target Phrases:</div>
              <ul className="space-y-2">
                {dayData.phrases.map((phrase, i) => (
                  <li key={i} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                    {phrase}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Practice Studio */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-md overflow-hidden bg-[#0A0A0E]">
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              {/* Mic Button */}
              <div className="relative mb-8">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" style={{ animationDuration: "2s" }} />
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
                  <span className="text-destructive font-medium animate-pulse">Recording...</span>
                ) : sendConversation.isPending ? (
                  <span className="text-primary flex items-center justify-center text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing with AI Tutor...
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Tap to speak</span>
                )}
              </div>
            </div>

            {/* Conversation Log */}
            {(transcript || aiResponse) && (
              <div className="border-t border-border/20 bg-black/40 p-4 space-y-4">
                {transcript && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground mb-1">You</span>
                    <div className="bg-primary/20 text-primary-foreground border border-primary/30 rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm">
                      {transcript}
                    </div>
                  </div>
                )}
                {aiResponse && (
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground mb-1 flex items-center">
                      AI Tutor
                      {isPlaying && <span className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    </span>
                    <div className="bg-muted/50 border border-border/50 text-foreground rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%] text-sm">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>
            )}
            <audio ref={audioPlayerRef} className="hidden" />
          </Card>

          {/* Feedback Panel */}
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
                      <div key={i} className="text-sm bg-background border border-border/50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="line-through text-destructive/80">{corr.original}</span>
                          <span className="text-green-500 font-medium">{corr.corrected}</span>
                        </div>
                        <p className="text-muted-foreground text-xs">{corr.explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-500 font-medium">Great job! No corrections needed for this sentence.</p>
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
