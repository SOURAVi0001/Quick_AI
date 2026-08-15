import { Brain, Send, Play, RefreshCcw, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import PageHeader from '../components/PageHeader';
import HistorySection from '../components/HistorySection';

const interviewTypes = ['Technical', 'Behavioral', 'HR', 'System Design', 'Mixed'];
const experienceLevels = ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead/Staff'];

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
        setChatHistory([
          { type: 'ai', text: data.firstQuestion }
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
    setLoading(true);
    
    try {
      const { data } = await api.post('/api/ai/interview/answer', {
        sessionId,
        answer: answerToSend
      }, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      
      if (data.success) {
        setChatHistory(prev => [
          ...prev, 
          { 
            type: 'feedback', 
            evaluation: data.evaluation
          },
          ...(data.isConcluded ? [] : [{ type: 'ai', text: data.nextQuestion }])
        ]);
        
        if (data.isConcluded) {
          setIsConcluded(true);
          setOverallFeedback(data.overallFeedback);
        }
      } else {
        toast.error(data.message || "Failed to submit answer");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleConclude = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/interview/answer', {
        sessionId,
        answer: null,
        conclude: true
      }, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      
      if (data.success) {
        setIsConcluded(true);
        setOverallFeedback(data.overallFeedback);
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
  };

  const FeedbackCard = ({ evaluation }) => {
    if (!evaluation) return null;
    return (
      <div className="w-full my-6 bg-card border border-border/50 rounded-xl overflow-hidden text-sm shadow-sm">
        <div className="bg-muted/30 p-4 border-b border-border/50 flex justify-between items-center">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Answer Evaluation
          </span>
          <span className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider">
            {evaluation.score}/10 SCORE
          </span>
        </div>
        <div className="p-5 space-y-5 text-foreground/80">
          {evaluation.strengths?.length > 0 && (
            <div>
              <span className="text-green-500 font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
              </span>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => <li key={i} className="flex gap-2 items-start"><span className="text-muted-foreground mt-0.5">•</span> <span>{s}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.weaknesses?.length > 0 && (
            <div>
              <span className="text-orange-500 font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Areas to Improve
              </span>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w, i) => <li key={i} className="flex gap-2 items-start"><span className="text-muted-foreground mt-0.5">•</span> <span>{w}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.missingPoints?.length > 0 && (
            <div>
              <span className="text-destructive font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <XCircle className="w-3.5 h-3.5" /> Missing Points
              </span>
              <ul className="space-y-1">
                {evaluation.missingPoints.map((m, i) => <li key={i} className="flex gap-2 items-start"><span className="text-muted-foreground mt-0.5">•</span> <span>{m}</span></li>)}
              </ul>
            </div>
          )}
          {evaluation.betterApproach && (
            <div className="bg-accent/5 p-4 rounded-lg border border-accent/20 mt-4">
              <span className="text-accent font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Improved Answer
              </span>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{evaluation.betterApproach}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto">
      <PageHeader 
        icon={Brain} 
        title="AI Interview Coach" 
        description="Practice interviews tailored to your target role, experience level, and company with real-time feedback." 
      />

      {!sessionActive ? (
        <div className="space-y-12">
          <Card>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Interview Setup</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleStart} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Target Role <span className="text-destructive">*</span></label>
                    <Input name="targetRole" value={formData.targetRole} onChange={handleInputChange} placeholder="e.g. Backend Engineer" required className="bg-background border-border/50 h-12 focus-visible:ring-accent" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Company (Optional)</label>
                    <Input name="company" value={formData.company} onChange={handleInputChange} placeholder="e.g. Google, Stripe" className="bg-background border-border/50 h-12 focus-visible:ring-accent" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Experience Level <span className="text-destructive">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {experienceLevels.map(level => (
                      <div 
                        key={level} 
                        onClick={() => selectOption('experienceLevel', level)}
                        className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer border transition-all duration-200 ${formData.experienceLevel === level ? 'bg-accent/10 text-accent border-accent/50 shadow-sm' : 'bg-background hover:bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground'}`}
                      >
                        {level}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Interview Type <span className="text-destructive">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {interviewTypes.map(type => (
                      <div 
                        key={type} 
                        onClick={() => selectOption('interviewType', type)}
                        className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer border transition-all duration-200 ${formData.interviewType === type ? 'bg-accent/10 text-accent border-accent/50 shadow-sm' : 'bg-background hover:bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground'}`}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Additional Context (Optional)</label>
                  <Textarea 
                    name="context" 
                    value={formData.context} 
                    onChange={handleInputChange} 
                    placeholder="Paste job description, resume snippets, or specific topics to focus on..." 
                    rows={4}
                    className="bg-background border-border/50 focus-visible:ring-accent resize-none"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20">
                  {loading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
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
              return (
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                        {item.prompt || 'Mock Interview'}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                    </div>
                    <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold">
                      {content.overallScore || 0}/10 Score
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                    <p className="text-sm text-foreground font-medium mb-2">Strengths:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                      {content.strongAreas?.slice(0, 2).map((s, i) => <li key={i} className="line-clamp-1">• {s}</li>)}
                    </ul>
                    <p className="text-sm text-foreground font-medium mb-2">Needs Work:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {content.weakAreas?.slice(0, 2).map((w, i) => <li key={i} className="line-clamp-1">• {w}</li>)}
                    </ul>
                  </div>
                </div>
              );
            }}
          />
        </div>
      ) : (
        <Card className="flex flex-col h-[700px] max-h-[85vh] shadow-xl border-accent/20 animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="border-b border-border/50 py-4 px-6 flex flex-row items-center justify-between bg-card">
            <div>
              <CardTitle className="text-base text-foreground">{formData.targetRole} {formData.company ? `at ${formData.company}` : ''} Interview</CardTitle>
              <p className="text-xs text-accent mt-1 tracking-wide font-medium">{formData.interviewType} • {formData.experienceLevel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetSession} className="h-8 text-xs border-border/50">
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> End Session
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 bg-background relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-background to-background pointer-events-none"></div>
            
            <div className="relative z-10 space-y-8">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'ai' && (
                    <div className="max-w-[85%] bg-card border border-border/50 p-5 rounded-2xl rounded-tl-sm text-foreground text-sm shadow-sm whitespace-pre-wrap leading-relaxed">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-accent flex items-center gap-1.5 mb-3">
                        <Brain className="w-3.5 h-3.5" /> Interviewer
                      </span>
                      {msg.text}
                    </div>
                  )}
                  {msg.type === 'user' && (
                    <div className="max-w-[85%] bg-accent text-accent-foreground p-5 rounded-2xl rounded-tr-sm text-sm shadow-md whitespace-pre-wrap leading-relaxed">
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
                  <div className="max-w-[85%] bg-card border border-border/50 p-5 rounded-2xl rounded-tl-sm text-foreground shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}

              {isConcluded && overallFeedback && (
                <div className="w-full mt-12 bg-card border border-accent/30 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-accent/10 p-6 text-center border-b border-accent/20">
                    <h3 className="font-bold text-xl text-foreground mb-1">Interview Completed</h3>
                    <div className="text-5xl font-black text-accent mt-4 drop-shadow-sm">{overallFeedback.overallScore}<span className="text-2xl text-accent/50">/10</span></div>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Technical</div>
                        <div className="text-2xl font-bold text-foreground">{overallFeedback.technicalScore}<span className="text-sm text-muted-foreground">/10</span></div>
                      </div>
                      <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Communication</div>
                        <div className="text-2xl font-bold text-foreground">{overallFeedback.communicationScore}<span className="text-sm text-muted-foreground">/10</span></div>
                      </div>
                      <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Structure</div>
                        <div className="text-2xl font-bold text-foreground">{overallFeedback.structureScore}<span className="text-sm text-muted-foreground">/10</span></div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8 text-sm">
                      <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-green-500 flex items-center gap-1.5 mb-4">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Strong Areas
                        </h4>
                        <ul className="space-y-2 text-foreground/80">
                          {overallFeedback.strongAreas?.map((item, i) => <li key={i} className="flex gap-2 items-start"><span className="text-muted-foreground mt-0.5">•</span> <span>{item}</span></li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-orange-500 flex items-center gap-1.5 mb-4">
                          <AlertTriangle className="w-3.5 h-3.5" /> Weak Areas
                        </h4>
                        <ul className="space-y-2 text-foreground/80">
                          {overallFeedback.weakAreas?.map((item, i) => <li key={i} className="flex gap-2 items-start"><span className="text-muted-foreground mt-0.5">•</span> <span>{item}</span></li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-accent/5 p-6 rounded-xl border border-accent/20 text-sm">
                      <h4 className="font-bold text-[11px] uppercase tracking-widest text-accent flex items-center gap-1.5 mb-4">
                        <Sparkles className="w-3.5 h-3.5" /> Recommended Practice
                      </h4>
                      <ul className="space-y-2 text-foreground/90">
                        {overallFeedback.recommendedPractice?.map((item, i) => <li key={i} className="flex gap-2 items-start"><span className="text-accent/50 mt-0.5">•</span> <span>{item}</span></li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-border/50 p-4 sm:p-6 bg-card relative z-20">
            {!isConcluded ? (
              <div className="flex w-full flex-col gap-3">
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="resize-none bg-background border-border/50 focus-visible:ring-accent min-h-[100px]"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAnswer();
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">Enter</kbd> to send, <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">Shift+Enter</kbd> for new line</span>
                  <div className="space-x-3 w-full sm:w-auto flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleConclude} disabled={loading || chatHistory.length < 3} className="border-border/50 h-9 px-4">
                      Conclude Interview
                    </Button>
                    <Button onClick={handleSendAnswer} disabled={loading || !currentAnswer.trim()} size="sm" className="gap-2 h-9 px-6 bg-accent text-accent-foreground hover:bg-accent/90">
                      Send <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={resetSession} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-medium">Start New Interview</Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default InterviewCoach;
