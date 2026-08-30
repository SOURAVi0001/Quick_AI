import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Activity,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import PageHeader from '../components/PageHeader';
import HistorySection from '../components/HistorySection';

const CareerScore = () => {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const { getToken } = useAuth();

  const fetchScore = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/ai/career-score', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setScoreData(data.content);
      } else {
        toast.error(data.message || 'Failed to load career score');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-destructive';
  };

  if (loading) {
    return (
      <div className="pb-16 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[600px]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-5 shadow-lg shadow-accent/20"></div>
        <p className="text-sm font-medium animate-pulse text-foreground/80">
          Analyzing your career profile...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-16 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <PageHeader
          icon={BarChart3}
          title="Career Profile Score"
          description="Aggregated insights and growth metrics from your QuickAI interactions."
        />
        <Button
          variant="outline"
          onClick={fetchScore}
          disabled={loading}
          className="shrink-0 sm:mt-0 -mt-4 mb-4 sm:mb-0 bg-card border-border/50 text-foreground hover:bg-muted/50"
        >
          <Activity className="w-4 h-4 mr-2 text-accent" /> Recalculate Score
        </Button>
      </div>

      <div className="mb-12">
        {!scoreData ? (
          <Card className="text-center p-12 bg-transparent border-dashed border-border/50">
            <CardTitle className="text-foreground mb-3 text-xl">No Data Available</CardTitle>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              We couldn't find enough data to generate your career score. Try using the Resume
              Review, LinkedIn Optimizer, or AI Interview Coach first.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* QuickAI Score Card */}
            <Card className="lg:col-span-1 bg-card border-border/50 text-center flex flex-col items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none"></div>

              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-8 relative z-10 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-accent" /> Overall Readiness
              </h2>

              <div className="relative w-48 h-48 rounded-full flex items-center justify-center mb-8 bg-background border-8 border-background shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10">
                <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="82"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="82"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="515"
                    strokeDashoffset={515 - (515 * scoreData.overallScore) / 100}
                    className={`${getScoreColor(scoreData.overallScore)} drop-shadow-md`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="flex flex-col items-center justify-center z-10">
                  <span
                    className={`text-6xl font-black tracking-tighter ${getScoreColor(scoreData.overallScore)}`}
                  >
                    {scoreData.overallScore}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                    / 100
                  </span>
                </div>
              </div>

              <div className="w-full bg-accent/5 p-4 rounded-xl border border-accent/10 relative z-10">
                <p className="text-sm font-medium text-foreground/90">
                  Target Score:{' '}
                  <span className="font-bold text-accent">
                    {Math.min(100, scoreData.overallScore + 6)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete recommended actions to improve.
                </p>
              </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="lg:col-span-2 bg-card border-border/50">
              <CardHeader className="border-b border-border/50 pb-5">
                <CardTitle className="text-lg">Category Breakdown</CardTitle>
                <CardDescription>
                  Performance across different areas based on your data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                {['resume', 'linkedin', 'jobMatch', 'communication'].map((cat) => {
                  const val = scoreData.categories?.[cat];
                  const labels = {
                    resume: 'Resume Quality',
                    linkedin: 'LinkedIn Optimization',
                    jobMatch: 'Job Fit Analysis',
                    communication: 'Interview Communication',
                  };

                  return (
                    <div key={cat} className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground">{labels[cat]}</span>
                        {val ? (
                          <span className={`font-bold ${getScoreColor(val)}`}>
                            {val}
                            <span className="text-[10px] text-muted-foreground ml-0.5">/100</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-[11px] uppercase tracking-wider font-semibold">
                            Not analyzed
                          </span>
                        )}
                      </div>
                      <Progress
                        value={val || 0}
                        className={`h-2.5 rounded-full ${!val ? 'bg-muted/30 opacity-50' : 'bg-muted/50'}`}
                        indicatorClassName={val ? getScoreBg(val) : 'bg-transparent'}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Strengths, Weaknesses, Recommendations */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Strengths */}
              <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
                <CardHeader className="pb-3 border-b border-green-500/10">
                  <CardTitle className="text-[11px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3">
                    {scoreData.strengths?.map((str, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 items-start text-sm text-foreground/90 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{' '}
                        <span>{str}</span>
                      </li>
                    ))}
                    {(!scoreData.strengths || scoreData.strengths.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">
                        No strengths identified yet.
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Weaknesses */}
              <Card className="border-orange-500/20 bg-orange-500/5 shadow-sm">
                <CardHeader className="pb-3 border-b border-orange-500/10">
                  <CardTitle className="text-[11px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3">
                    {scoreData.weaknesses?.map((wk, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 items-start text-sm text-foreground/90 leading-relaxed"
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />{' '}
                        <span>{wk}</span>
                      </li>
                    ))}
                    {(!scoreData.weaknesses || scoreData.weaknesses.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">
                        No areas to improve identified yet.
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border-accent/20 bg-accent/5 shadow-sm">
                <CardHeader className="pb-3 border-b border-accent/10">
                  <CardTitle className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> High Impact Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-4">
                    {scoreData.recommendations?.map((rec, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-foreground/90 bg-background/50 p-3 rounded-lg border border-border/50 shadow-sm items-start"
                      >
                        <span className="font-bold text-accent bg-accent/10 px-2 py-0.5 rounded text-[10px] shrink-0 mt-0.5">
                          +{rec.impact}
                        </span>
                        <span className="leading-relaxed">{rec.action}</span>
                      </li>
                    ))}
                    {(!scoreData.recommendations || scoreData.recommendations.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">
                        No recommendations available.
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <HistorySection
        type="career-score"
        title="Score History"
        renderItem={(item, { format }) => {
          const content =
            typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                    {item.prompt || 'Career Score Evaluation'}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold">
                  {content.overallScore || 0}/100 Score
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <div className="flex gap-4 text-sm text-foreground">
                  <div>
                    <span className="text-muted-foreground">Resume:</span>{' '}
                    {content.categories?.resume || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">LinkedIn:</span>{' '}
                    {content.categories?.linkedin || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Interview:</span>{' '}
                    {content.categories?.communication || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default CareerScore;
