import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCloneVoice, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileAudio, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const [file, setFile] = useState<File | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cloneVoice = useCloneVoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an audio file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    cloneVoice.mutate({ data: { audio: file } }, {
      onSuccess: () => {
        setIsSuccess(true);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({
          title: "Voice Cloned Successfully",
          description: "Your vocal identity is ready for practice.",
        });
      },
      onError: (error) => {
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to clone voice. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (isSuccess) {
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
            Upload a clear, 30-60 second recording of your voice speaking naturally in a quiet room. We support MP3, WAV, and WebM formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input 
              type="file" 
              accept="audio/mp3,audio/wav,audio/webm" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="input-file-audio"
            />
            {file ? (
              <div className="flex flex-col items-center">
                <FileAudio className="h-10 w-10 text-primary mb-3" />
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Click to upload audio</p>
                <p className="text-sm text-muted-foreground mt-1">MP3, WAV, or WebM up to 10MB</p>
              </div>
            )}
          </div>

          {cloneVoice.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading & Processing...</span>
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
            disabled={!file || cloneVoice.isPending}
            data-testid="button-upload-voice"
          >
            {cloneVoice.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Identity...
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
