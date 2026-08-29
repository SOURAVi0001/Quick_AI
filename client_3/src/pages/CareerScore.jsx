import { BarChart3, TrendingUp, AlertTriangle, Lightbulb, Activity, CheckCircle2, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ToolShell from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import ScoreDisplay, { MetricLine } from '../components/ScoreDisplay';
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

  const headerAction = (
    <Button variant="outline" onClick={fetchScore} loading={loading}>
      <Activity className="size-4 text-primary" /> Recalculate Score
    </Button>
  );

  if (loading && !scoreData) {
    return (
      <ToolShell
        icon={BarChart3}
        eyebrow="Career Tools"
        title="Career Profile Score"
        description="Aggregated insights and growth metrics from your QuickAI interactions."
        width="wide"
      >
        <LoadingState
          title="Analyzing your career profile…"
          description="Pulling together your resume, LinkedIn, and interview signals."
          lines={5}
        />
      </ToolShell>
    );
  }

  return (
    <ToolShell
      icon={BarChart3}
      eyebrow="Career Tools"
      title="Career Profile Score"
      description="Aggregated insights and growth metrics from your QuickAI interactions."
      action={headerAction}
      width="wide"
    >
      <div className="mb-12">
        {!scoreData ? (
          <EmptyState
            icon={BarChart3}
            title="No Data Available"
            description="We couldn't find enough data to generate your career score. Try using the Resume Review, LinkedIn Optimizer, or AI Interview Coach first."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 animate-rise lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-8 text-center lg:col-span-1">
              <h2 className="mb-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Target className="size-3.5 text-primary" /> Overall Readiness
              </h2>

              <ScoreDisplay value={scoreData.overallScore} size="lg" className="mb-8 items-center text-center" />

              <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground/90">
                  Target Score: <span className="font-bold text-primary">{Math.min(100, scoreData.overallScore + 6)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Complete recommended actions to improve.</p>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-border pb-5">
                <CardTitle className="text-lg">Category Breakdown</CardTitle>
                <CardDescription>Performance across different areas based on your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-8">
                {['resume', 'linkedin', 'jobMatch', 'communication'].map((cat) => {
                  const val = scoreData.categories?.[cat];
                  const labels = {
                    resume: 'Resume Quality',
                    linkedin: 'LinkedIn Optimization',
                    jobMatch: 'Job Fit Analysis',
                    communication: 'Interview Communication',
                  };

                  return val ? (
                    <MetricLine key={cat} label={labels[cat]} value={val} />
                  ) : (
                    <div key={cat} className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-foreground">{labels[cat]}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground italic">Not analyzed</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
              <Card className="border-success/20 bg-success/5">
                <CardHeader className="border-b border-success/10 pb-3">
                  <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-success">
                    <TrendingUp className="size-4" /> Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3">
                    {scoreData.strengths?.map((str, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> <span className="min-w-0 break-words">{str}</span>
                      </li>
                    ))}
                    {(!scoreData.strengths || scoreData.strengths.length === 0) && <li className="text-sm italic text-muted-foreground">No strengths identified yet.</li>}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-warning/20 bg-warning/5">
                <CardHeader className="border-b border-warning/10 pb-3">
                  <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-warning">
                    <AlertTriangle className="size-4" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3">
                    {scoreData.weaknesses?.map((wk, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> <span className="min-w-0 break-words">{wk}</span>
                      </li>
                    ))}
                    {(!scoreData.weaknesses || scoreData.weaknesses.length === 0) && <li className="text-sm italic text-muted-foreground">No areas to improve identified yet.</li>}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="border-b border-primary/10 pb-3">
                  <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
                    <Lightbulb className="size-4" /> High Impact Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-4">
                    {scoreData.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground/90 shadow-subtle">
                        <StatusBadge tone="accent" className="mt-0.5 shrink-0">+{rec.impact}</StatusBadge>
                        <span className="min-w-0 break-words leading-relaxed">{rec.action}</span>
                      </li>
                    ))}
                    {(!scoreData.recommendations || scoreData.recommendations.length === 0) && <li className="text-sm italic text-muted-foreground">No recommendations available.</li>}
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
          const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
                    {item.prompt || 'Career Score Evaluation'}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <StatusBadge tone="accent">{content.overallScore || 0}/100 Score</StatusBadge>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap gap-4 text-sm text-foreground">
                  <div><span className="text-muted-foreground">Resume:</span> {content.categories?.resume || 'N/A'}</div>
                  <div><span className="text-muted-foreground">LinkedIn:</span> {content.categories?.linkedin || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Interview:</span> {content.categories?.communication || 'N/A'}</div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </ToolShell>
  );
};

export default CareerScore;
