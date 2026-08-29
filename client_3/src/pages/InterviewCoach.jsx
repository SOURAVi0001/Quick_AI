import { Brain, Send, Play, RefreshCcw, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import ScoreRing from '../components/ScoreRing';
import OptionGroup from '../components/OptionGroup';
import ToolShell from '../components/ToolShell';
import Spinner from '../components/Spinner';
import HistorySection from '../components/HistorySection';

const interviewTypes = ['Technical', 'Behavioral', 'HR', 'System Design', 'Mixed'];
const experienceLevels = ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead/Staff'];
const ESTIMATED_QUESTIONS = 8;

const InterviewCoach = () => {
  const [formData, setFormData] = useState({
    targetRole: '',
    company: '',
    experienceLevel: '',
    interviewType: '',
    context: '',
  });

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isConcluded, setIsConcluded] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  const { getToken } = useAuth();
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (sessionActive) {
      scrollToBottom();
    }
  }, [chatHistory, loading, sessionActive]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectOption = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!formData.targetRole || !formData.experienceLevel || !formData.interviewType) {
      return toast.error("Please fill in Target Role, Experience Level, and Interview Type.");
    }

    try {
      setLoading(true);
      const { data } = await api.post('/api/ai/interview/start', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setSessionId(data.sessionId);
        setSessionActive(true);
        const allQ = data.allQuestions || [];
        setQuestions(allQ);
        setChatHistory([
          { type: 'ai', text: allQ[0] || 'Start!' }
        ]);
        toast.success("Interview started!");
      } else {
        toast.error(data.message || "Failed to start interview");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnswer = async () => {
    if (!currentAnswer.trim()) return;

    const answerToSend = currentAnswer;
    setCurrentAnswer('');
    setChatHistory(prev => [...prev, { type: 'user', text: answerToSend }]);

    const updatedAnswers = [...answers, answerToSend];
    setAnswers(updatedAnswers);

    const nextIdx = questionCount;

    if (nextIdx < ESTIMATED_QUESTIONS) {
      setChatHistory(prev => [...prev, { type: 'ai', text: questions[nextIdx] }]);
    } else {
      setLoading(true);
      try {
        const { data } = await api.post('/api/ai/interview/answer', {
          sessionId,
          answers: updatedAnswers
        }, {
          headers: { Authorization: `Bearer ${await getToken()}` },
        });

        if (data.success) {
          const newHistory = [];
          questions.forEach((q, i) => {
            newHistory.push({ type: 'ai', text: q });
            newHistory.push({ type: 'user', text: updatedAnswers[i] });
            if (data.evaluations?.[i]) {
              newHistory.push({
                type: 'feedback',
                evaluation: data.evaluations[i]
              });
            }
          });
          setChatHistory(newHistory);
          setIsConcluded(true);
          setOverallFeedback(data.overallFeedback);
        } else {
          toast.error(data.message || "Failed to submit answers");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConclude = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/interview/answer', {
        sessionId,
        answers: answers
      }, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        const newHistory = [];
        answers.forEach((ans, i) => {
          newHistory.push({ type: 'ai', text: questions[i] });
          newHistory.push({ type: 'user', text: ans });
          if (data.evaluations?.[i]) {
            newHistory.push({
              type: 'feedback',
              evaluation: data.evaluations[i]
            });
          }
        });
        setChatHistory(newHistory);
        setIsConcluded(true);
        setOverallFeedback(data.overallFeedback);
      } else {
        toast.error(data.message || "Failed to conclude interview");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionActive(false);
    setSessionId(null);
    setChatHistory([]);
    setIsConcluded(false);
    setOverallFeedback(null);
    setQuestions([]);
    setAnswers([]);
  };

  const questionCount = chatHistory.filter((m) => m.type === 'ai').length;
  const progressPct = Math.min(100, Math.round((questionCount / ESTIMATED_QUESTIONS) * 100));

  const FeedbackCard = ({ evaluation }) => {
    if (!evaluation) return null;
    return (
      <Card variant="result" className="my-6 w-full overflow-hidden text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 p-4">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" /> Answer Evaluation
          </span>
          <Badge variant="accent">{evaluation.score}/10 Score</Badge>
        </div>
        <div className="space-y-5 p-5 text-foreground/80">
          {evaluation.strengths?.length > 0 && (
            <div>
              <span className="text-eyebrow mb-2 flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-3.5" /> Strengths
              </span>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{s}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.weaknesses?.length > 0 && (
            <div>
              <span className="text-eyebrow mb-2 flex items-center gap-1.5 text-warning">
                <AlertTriangle className="size-3.5" /> Areas to Improve
              </span>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{w}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.missingPoints?.length > 0 && (
            <div>
              <span className="text-eyebrow mb-2 flex items-center gap-1.5 text-destructive">
                <XCircle className="size-3.5" /> Missing Points
              </span>
              <ul className="space-y-1">
                {evaluation.missingPoints.map((m, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{m}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.betterApproach && (
            <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
              <span className="text-eyebrow mb-2 flex items-center gap-1.5 text-primary">
                <Sparkles className="size-3.5" /> Improved Answer
              </span>
              <p className="min-w-0 break-words leading-relaxed whitespace-pre-wrap text-foreground">{evaluation.betterApproach}</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <ToolShell
      icon={Brain}
      title="AI Interview Coach"
      description="Practice interviews tailored to your target role, experience level, and company with real-time feedback."
    >
      {!sessionActive ? (
        <div className="space-y-12">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Interview Setup</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleStart} className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Target Role <span className="text-destructive">*</span></label>
                    <Input name="targetRole" value={formData.targetRole} onChange={handleInputChange} placeholder="e.g. Backend Engineer" required className="h-12" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Company (Optional)</label>
                    <Input name="company" value={formData.company} onChange={handleInputChange} placeholder="e.g. Google, Stripe" className="h-12" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Experience Level <span className="text-destructive">*</span></label>
                  <OptionGroup
                    label="Experience Level"
                    options={experienceLevels}
                    value={formData.experienceLevel || null}
                    onChange={(v) => selectOption('experienceLevel', v)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Interview Type <span className="text-destructive">*</span></label>
                  <OptionGroup
                    label="Interview Type"
                    options={interviewTypes}
                    value={formData.interviewType || null}
                    onChange={(v) => selectOption('interviewType', v)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Additional Context (Optional)</label>
                  <Textarea
                    name="context"
                    value={formData.context}
                    onChange={handleInputChange}
                    placeholder="Paste job description, resume snippets, or specific topics to focus on..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button type="submit" loading={loading} className="h-12 w-full px-8 sm:w-auto">
                  {!loading && <Play className="size-5" />}
                  {loading ? 'Starting...' : 'Start Interview'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <HistorySection
            type="interview-session"
            title="Interview History"
            renderItem={(item, { handleCopy, format }) => {
              const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
              const score = content.overallScore !== undefined ? content.overallScore : (content.overallFeedback?.overallScore || 0);
              const strengths = content.strongAreas || content.overallFeedback?.strongAreas || [];
              const weaknesses = content.weakAreas || content.overallFeedback?.weakAreas || [];
              const displayTitle = content.targetRole
                ? `${content.targetRole} (${content.experienceLevel || 'All Levels'}) ${content.interviewType || ''} Interview`
                : (item.prompt || 'Mock Interview');

              return (
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
                        {displayTitle}
                      </p>
                      <p className="text-xs text-subtle-foreground">{format(item.created_at)}</p>
                    </div>
                    <Badge variant="accent" className="shrink-0">{score}/10 Score</Badge>
                  </div>
                  <div className="min-w-0 rounded-md border border-border bg-surface-1 p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">Strengths:</p>
                    <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
                      {strengths && strengths.length > 0 ? (
                        strengths.slice(0, 2).map((s, i) => <li key={i} className="line-clamp-1">• {s}</li>)
                      ) : (
                        <li className="line-clamp-1 text-subtle-foreground">• None generated</li>
                      )}
                    </ul>
                    <p className="mb-2 text-sm font-medium text-foreground">Needs Work:</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {weaknesses && weaknesses.length > 0 ? (
                        weaknesses.slice(0, 2).map((w, i) => <li key={i} className="line-clamp-1">• {w}</li>)
                      ) : (
                        <li className="line-clamp-1 text-subtle-foreground">• None generated</li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            }}
          />
        </div>
      ) : (
        <Card className="flex h-[700px] max-h-[85vh] flex-col border-primary/20 shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
            <div className="min-w-0">
              <CardTitle className="truncate text-base text-foreground">{formData.targetRole} {formData.company ? `at ${formData.company}` : ''} Interview</CardTitle>
              <p className="mt-1 text-xs font-medium tracking-wide text-primary">{formData.interviewType} • {formData.experienceLevel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetSession} className="h-8 shrink-0 text-xs">
              <RefreshCcw className="size-3.5" /> End Session
            </Button>
          </CardHeader>

          {!isConcluded && (
            <div className="border-b border-border bg-surface-1 px-6 py-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-eyebrow text-subtle-foreground">
                  Question {Math.max(1, questionCount)} of {ESTIMATED_QUESTIONS}
                </span>
                <span className="text-subtle-foreground">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <CardContent className="relative flex-1 overflow-y-auto bg-background p-6">
            <div className="space-y-8">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'ai' && (
                    <div className="max-w-[85%] min-w-0 rounded-2xl rounded-tl-sm border border-primary/25 bg-card p-5 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground shadow-card">
                      <span className="text-eyebrow mb-3 flex items-center gap-1.5 text-primary">
                        <Brain className="size-3.5" /> Interviewer
                      </span>
                      {msg.text}
                    </div>
                  )}
                  {msg.type === 'user' && (
                    <div className="max-w-[85%] min-w-0 rounded-2xl rounded-tr-sm bg-primary p-5 text-sm leading-relaxed break-words whitespace-pre-wrap text-primary-foreground shadow-subtle">
                      {msg.text}
                    </div>
                  )}
                  {msg.type === 'feedback' && (
                    <FeedbackCard evaluation={msg.evaluation} />
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card p-5 text-foreground shadow-card">
                    <Spinner className="size-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}

              {isConcluded && overallFeedback && (
                <div className="mt-12 w-full animate-rise overflow-hidden rounded-xl border border-primary/30 bg-card shadow-elevated">
                  <div className="border-b border-primary/20 bg-primary/10 p-6 text-center">
                    <h3 className="text-h2 mb-1 text-foreground">Interview Completed</h3>
                    <div className="mt-4 flex justify-center">
                      <ScoreRing value={overallFeedback.overallScore} max={10} size="md" label="Overall" />
                    </div>
                  </div>
                  <div className="space-y-8 p-8">
                    <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-1 p-4">
                        <div className="text-eyebrow text-subtle-foreground">Technical</div>
                        <ScoreRing value={overallFeedback.technicalScore} max={10} size="sm" />
                      </div>
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-1 p-4">
                        <div className="text-eyebrow text-subtle-foreground">Communication</div>
                        <ScoreRing value={overallFeedback.communicationScore} max={10} size="sm" />
                      </div>
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-1 p-4">
                        <div className="text-eyebrow text-subtle-foreground">Structure</div>
                        <ScoreRing value={overallFeedback.structureScore} max={10} size="sm" />
                      </div>
                    </div>

                    <div className="grid gap-8 text-sm md:grid-cols-2">
                      <div>
                        <h4 className="text-eyebrow mb-4 flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="size-3.5" /> Strong Areas
                        </h4>
                        <ul className="space-y-2 text-foreground/80">
                          {overallFeedback.strongAreas?.map((item, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{item}</span></li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-eyebrow mb-4 flex items-center gap-1.5 text-warning">
                          <AlertTriangle className="size-3.5" /> Weak Areas
                        </h4>
                        <ul className="space-y-2 text-foreground/80">
                          {overallFeedback.weakAreas?.map((item, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{item}</span></li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-sm">
                      <h4 className="text-eyebrow mb-4 flex items-center gap-1.5 text-primary">
                        <Sparkles className="size-3.5" /> Recommended Practice
                      </h4>
                      <ul className="space-y-2 text-foreground/90">
                        {overallFeedback.recommendedPractice?.map((item, i) => <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-primary/50">•</span> <span className="min-w-0 break-words">{item}</span></li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>
          </CardContent>

          <CardFooter className="relative z-20 border-t border-border bg-card p-4 sm:p-6">
            {!isConcluded ? (
              <div className="flex w-full flex-col gap-3">
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[100px] resize-none"
                  disabled={loading}
                  aria-label="Your answer"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAnswer();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="hidden text-xs text-subtle-foreground sm:inline">Press <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-foreground">Enter</kbd> to send, <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-foreground">Shift+Enter</kbd> for new line</span>
                  <div className="flex w-full justify-end gap-3 sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleConclude} disabled={loading || chatHistory.length < 3} className="h-9 px-4">
                      Conclude Interview
                    </Button>
                    <Button onClick={handleSendAnswer} disabled={loading || !currentAnswer.trim()} size="sm" className="h-9 gap-2 px-6">
                      Send <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={resetSession} className="h-12 w-full font-medium">Start New Interview</Button>
            )}
          </CardFooter>
        </Card>
      )}
    </ToolShell>
  );
};

export default InterviewCoach;
