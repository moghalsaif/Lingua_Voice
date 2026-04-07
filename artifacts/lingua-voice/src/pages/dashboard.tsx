import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useGetMe, useGenerateCurriculum, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mic, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  language: z.string().min(1, "Language is required"),
  level: z.string().min(1, "Level is required"),
  goal: z.string().min(10, "Please provide more detail about your goal"),
});

export default function Dashboard() {
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const generateCurriculum = useGenerateCurriculum();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "",
      level: "",
      goal: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    generateCurriculum.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({
          title: "Curriculum Generated",
          description: "Your 7-day personalized plan is ready.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to generate curriculum",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoadingUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasVoice = user?.hasVoice;
  const curriculum = user?.curriculum;

  return (
    <div className="container max-w-5xl py-8 px-4 md:py-12 mx-auto">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Studio</h1>
          <p className="text-muted-foreground mt-2">Manage your vocal identity and language learning journey.</p>
        </div>

        {!hasVoice && (
          <Alert className="border-primary/50 bg-primary/5">
            <Mic className="h-4 w-4 text-primary" />
            <AlertTitle>Voice not cloned</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-2">
              <span>You need to clone your voice before you can practice with your AI tutor.</span>
              <Button asChild size="sm" data-testid="button-setup-voice">
                <Link href="/onboarding">Setup Voice</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!curriculum ? (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Create Your Curriculum</CardTitle>
              <CardDescription>Tell us what you want to learn to generate your 7-day plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Language</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Spanish, Japanese, French" data-testid="input-language" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Goal</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. I want to be able to order food in a restaurant and have basic conversations for my upcoming trip to Tokyo."
                            className="resize-none h-24"
                            data-testid="input-goal"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={generateCurriculum.isPending}
                    data-testid="button-generate-curriculum"
                  >
                    {generateCurriculum.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Curriculum
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                7-Day Plan: {curriculum.language}
              </h2>
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Level: {curriculum.level}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {curriculum.days.map((day) => (
                <Card key={day.day} className="flex flex-col border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Day {day.day}: {day.title}</CardTitle>
                    <CardDescription className="line-clamp-2" title={day.scenario}>{day.scenario}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    <p className="text-sm font-medium mb-2">Task:</p>
                    <p className="text-sm text-muted-foreground">{day.task}</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={day.day === 1 ? "default" : "secondary"}
                      disabled={!hasVoice}
                      onClick={() => setLocation(`/practice/${day.day}`)}
                      data-testid={`button-start-day-${day.day}`}
                    >
                      Start Lesson
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
