import { Target, Check, AlertTriangle, Sparkles, UploadCloud, File as FileIcon, X, ChevronDown, Eye } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import ToolShell, { ResultRegion, Zone } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import ScoreDisplay from '../components/ScoreDisplay';
import { ComparePanel } from '../components/CopyBlock';
import HistorySection from '../components/HistorySection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';
import { cn } from '@/lib/utils';

const ResumeTailor = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [popoverItem, setPopoverItem] = useState(null);
  const inputRef = useRef(null);
  const { getToken } = useAuth();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!resumeFile) return toast.error('Please upload your current resume PDF.');
    if (!jobDescription.trim()) return toast.error('Please paste the job description.');

    try {
      setLoading(true);
      setResults(null);

      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobDescription', jobDescription);

      const { data } = await api.post('/api/ai/resume-tailor', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success && data.content) {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        setResults(parsed);
        toast.success('Resume tailored successfully!');
      } else {
        toast.error(data.message || 'Failed to tailor resume');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setResumeFile(dropped);
  };

  return (
    <ToolShell
      icon={Target}
      eyebrow="Career Tools"
      title="Resume Tailor"
      description="Tailor your resume to a specific job description to beat the ATS and increase your match score."
      width="wide"
    >
      <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground" htmlFor="tailor-resume-file">
                  Current Resume <span className="text-destructive">*</span>
                </label>
                <input
                  ref={inputRef}
                  id="tailor-resume-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  required
                  className="sr-only"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-[border-color,background-color] duration-250',
                    dragActive
                      ? 'border-primary/60 bg-primary/[0.06]'
                      : 'border-border-strong bg-surface-1/25 hover:border-primary/40 hover:bg-primary/[0.03]',
                  )}
                >
                  {resumeFile ? (
                    <>
                      <div className="grid size-11 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <FileIcon className="size-5" />
                      </div>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">{resumeFile.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumeFile(null);
                          if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        <X className="size-3" /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="grid size-11 place-items-center rounded-full border border-border bg-surface-2/80 text-subtle-foreground transition-colors group-hover:text-primary">
                        <UploadCloud className="size-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Drag &amp; drop your resume here</p>
                      <p className="text-xs text-muted-foreground">or click to browse &middot; PDF format only</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground" htmlFor="tailor-jd">
                  Job Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="tailor-jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the complete job description here..."
                  rows={8}
                  required
                  className="resize-none text-base"
                />
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
                <Target className="size-4" />
                {loading ? 'Analyzing & Tailoring...' : 'Tailor My Resume'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ResultRegion label="Resume tailoring result" className="min-w-0">
          {loading ? (
            <LoadingState title="Tailoring your resume…" description="Comparing your experience against the job description." />
          ) : results ? (
            <Card variant="result" className="overflow-hidden">
              <div className="flex flex-col items-center gap-8 p-8 md:flex-row">
                <ScoreDisplay value={results.matchScore} label="JD Match" size="md" className="shrink-0 text-center md:text-left" />

                <div className="min-w-0 flex-1 space-y-4 text-center md:text-left">
                  <h2 className="text-h2 text-foreground">Match Analysis</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Your resume has a {results.matchScore}% alignment with this job description based on keywords, experience depth, and formatting.
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                    <StatusBadge tone="success" icon={Check}>
                      {results.matchingSkills?.length || 0} Skills Matched
                    </StatusBadge>
                    <StatusBadge tone="ember" icon={AlertTriangle}>
                      {results.missingKeywords?.length || 0} Missing Keywords
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={Target}
              title="No analysis yet"
              description="Upload your resume and paste a job description to see your match score and tailored suggestions."
            />
          )}
        </ResultRegion>
      </div>

      {results && (
        <div className="mb-16 space-y-8 animate-rise">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">Matching Skills</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {results.matchingSkills?.map((skill, i) => (
                    <StatusBadge key={i} tone="success">✓ {skill}</StatusBadge>
                  ))}
                  {(!results.matchingSkills || results.matchingSkills.length === 0) && <span className="text-sm text-muted-foreground">No explicit matching skills found.</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">Missing Keywords</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {results.missingKeywords?.map((kw, i) => (
                    <StatusBadge key={i} tone="ember">✗ {kw}</StatusBadge>
                  ))}
                  {results.underEmphasizedKeywords?.map((kw, i) => (
                    <StatusBadge key={`ue-${i}`} tone="warning">⚠ {kw}</StatusBadge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">Experience Gaps &amp; ATS Fixes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 pt-5 md:grid-cols-2">
              <div className="min-w-0">
                <h5 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <AlertTriangle className="size-3.5 text-warning" /> Experience Gaps
                </h5>
                <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/80">
                  {results.experienceGaps?.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <h5 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Check className="size-3.5 text-success" /> ATS Recommendations
                </h5>
                <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/80">
                  {results.atsRecommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">•</span> <span className="min-w-0 break-words">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Zone eyebrow="Optimized Sections" className="!mt-0 pt-6">
            {results.summaryOptimization && (() => {
              const pair = typeof results.summaryOptimization === 'object'
                ? {
                    current:
                      results.summaryOptimization.current ||
                      results.summaryOptimization.original ||
                      results.summaryOptimization.before ||
                      results.summaryOptimization.originalSummary ||
                      '',
                    recommended:
                      results.summaryOptimization.recommended ||
                      results.summaryOptimization.optimized ||
                      results.summaryOptimization.after ||
                      results.summaryOptimization.recommendedSummary ||
                      results.summaryOptimization.text ||
                      '',
                  }
                : { current: '', recommended: String(results.summaryOptimization) };

              return (
                <ComparePanel
                  title="Professional Summary"
                  current={pair.current}
                  recommended={pair.recommended}
                  className="mb-6"
                />
              );
            })()}

            {Array.isArray(results.experience) && results.experience.map((exp, i) => {
              const current =
                exp.current ||
                exp.original ||
                exp.before ||
                exp.currentText ||
                exp.old ||
                exp.description ||
                exp.currentBullets ||
                '';
              const recommended =
                exp.recommended ||
                exp.optimized ||
                exp.after ||
                exp.recommendedText ||
                exp.suggestion ||
                exp.bullets ||
                exp.recommendedBullets ||
                '';
              const title = exp.title || exp.role || exp.company || exp.position || `Experience Block ${i + 1}`;
              const reason = exp.reason || exp.explanation || exp.why || exp.impact || '';

              return (
                <ComparePanel
                  key={`exp-${i}`}
                  title={title}
                  current={current}
                  recommended={recommended}
                  reason={reason}
                  className="mb-6"
                />
              );
            })}

            {Array.isArray(results.projects) && results.projects.map((proj, i) => {
              const current =
                proj.current ||
                proj.original ||
                proj.before ||
                proj.currentText ||
                proj.description ||
                proj.currentBullets ||
                '';
              const recommended =
                proj.recommended ||
                proj.optimized ||
                proj.after ||
                proj.recommendedText ||
                proj.suggestion ||
                proj.bullets ||
                proj.recommendedBullets ||
                '';
              const title = proj.title || proj.project || proj.name || `Project Block ${i + 1}`;
              const reason = proj.reason || proj.explanation || proj.why || proj.impact || '';

              return (
                <ComparePanel
                  key={`proj-${i}`}
                  title={title}
                  current={current}
                  recommended={recommended}
                  reason={reason}
                  className="mb-6"
                />
              );
            })}

            {Array.isArray(results.actionPlan) && results.actionPlan.length > 0 && (
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Action Plan &amp; Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {results.actionPlan.map((actionItem, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface-1/40 p-3.5">
                      <StatusBadge tone={actionItem.priority === 'High' ? 'accent' : 'neutral'} className="shrink-0">
                        {actionItem.priority || 'Action'}
                      </StatusBadge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{actionItem.action || actionItem.step || JSON.stringify(actionItem)}</p>
                        {actionItem.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">{actionItem.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </Zone>
        </div>
      )}

      <HistorySection
        type="resume-tailor"
        title="Tailoring History"
        renderItem={(item, { format }) => (
          <TailoringHistoryCard
            item={item}
            format={format}
            onOpenPopover={(cardItem) => setPopoverItem(cardItem)}
            onLoadToActive={(content) => {
              setResults(content);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              toast.success('Loaded result into workspace view');
            }}
          />
        )}
      />

      {/* Interactive Popover Modal Window */}
      {popoverItem && (() => {
        const popoverContent =
          typeof popoverItem.content === 'string'
            ? JSON.parse(popoverItem.content)
            : popoverItem.content;

        return (
          <Dialog open={!!popoverItem} onOpenChange={(open) => !open && setPopoverItem(null)}>
            <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh]">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-xl sm:text-2xl">
                    Tailored Resume Strategy &amp; Analysis
                  </DialogTitle>
                  <StatusBadge tone="accent" icon={Target}>
                    {popoverContent?.matchScore || 0}% Match
                  </StatusBadge>
                </div>
                <DialogDescription>
                  Full ATS keyword optimization, gap breakdown, and recommended copy-paste sections.
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-6 py-5">
                {/* Match Analysis Hero */}
                <div className="rounded-xl border border-border bg-surface-2/70 p-6 flex flex-col sm:flex-row items-center gap-6">
                  <ScoreDisplay
                    value={popoverContent?.matchScore || 0}
                    label="JD Match"
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-base font-semibold text-foreground">
                      {popoverContent?.matchScore >= 80 ? 'Strong ATS Alignment' : 'Targeted Optimization Required'}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your resume has a {popoverContent?.matchScore || 0}% match with this job description. Review the tailored sections below to improve keyword density and impact.
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                      <StatusBadge tone="success" icon={Check} size="sm">
                        {popoverContent?.matchingSkills?.length || 0} Skills Matched
                      </StatusBadge>
                      <StatusBadge tone="ember" icon={AlertTriangle} size="sm">
                        {popoverContent?.missingKeywords?.length || 0} Missing Keywords
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                {/* Skills & Keywords Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-1/50 p-4">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Matching Skills ({popoverContent?.matchingSkills?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {popoverContent?.matchingSkills?.map((skill, idx) => (
                        <StatusBadge key={idx} tone="success" size="sm">✓ {skill}</StatusBadge>
                      ))}
                      {(!popoverContent?.matchingSkills || popoverContent.matchingSkills.length === 0) && (
                        <span className="text-xs text-muted-foreground">None explicitly found</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface-1/50 p-4">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Missing &amp; Under-Emphasized Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {popoverContent?.missingKeywords?.map((kw, idx) => (
                        <StatusBadge key={`pop-mk-${idx}`} tone="ember" size="sm">✗ {kw}</StatusBadge>
                      ))}
                      {popoverContent?.underEmphasizedKeywords?.map((kw, idx) => (
                        <StatusBadge key={`pop-ue-${idx}`} tone="warning" size="sm">⚠ {kw}</StatusBadge>
                      ))}
                      {(!popoverContent?.missingKeywords?.length && !popoverContent?.underEmphasizedKeywords?.length) && (
                        <span className="text-xs text-muted-foreground">No keyword gaps identified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Experience Gaps & ATS Fixes */}
                {(popoverContent?.experienceGaps?.length > 0 || popoverContent?.atsRecommendations?.length > 0) && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {popoverContent?.experienceGaps?.length > 0 && (
                      <div className="rounded-lg border border-border bg-surface-1/50 p-4">
                        <h5 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-warning">
                          <AlertTriangle className="size-3.5" /> Experience Gaps
                        </h5>
                        <ul className="space-y-2 text-xs text-foreground/80">
                          {popoverContent.experienceGaps.map((gap, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-muted-foreground">•</span> <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {popoverContent?.atsRecommendations?.length > 0 && (
                      <div className="rounded-lg border border-border bg-surface-1/50 p-4">
                        <h5 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-success">
                          <Check className="size-3.5" /> ATS Recommendations
                        </h5>
                        <ul className="space-y-2 text-xs text-foreground/80">
                          {popoverContent.atsRecommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-muted-foreground">•</span> <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimized Sections Comparison */}
                <div className="space-y-4 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Optimized Sections Comparison
                  </p>

                  {popoverContent?.summaryOptimization && (() => {
                    const pair = typeof popoverContent.summaryOptimization === 'object'
                      ? {
                          current:
                            popoverContent.summaryOptimization.current ||
                            popoverContent.summaryOptimization.original ||
                            popoverContent.summaryOptimization.before ||
                            popoverContent.summaryOptimization.originalSummary ||
                            '',
                          recommended:
                            popoverContent.summaryOptimization.recommended ||
                            popoverContent.summaryOptimization.optimized ||
                            popoverContent.summaryOptimization.after ||
                            popoverContent.summaryOptimization.recommendedSummary ||
                            popoverContent.summaryOptimization.text ||
                            '',
                        }
                      : { current: '', recommended: String(popoverContent.summaryOptimization) };

                    return (
                      <ComparePanel
                        title="Professional Summary"
                        current={pair.current}
                        recommended={pair.recommended}
                      />
                    );
                  })()}

                  {Array.isArray(popoverContent?.experience) && popoverContent.experience.map((exp, idx) => {
                    const current =
                      exp.current ||
                      exp.original ||
                      exp.before ||
                      exp.currentText ||
                      exp.old ||
                      exp.description ||
                      exp.currentBullets ||
                      '';
                    const recommended =
                      exp.recommended ||
                      exp.optimized ||
                      exp.after ||
                      exp.recommendedText ||
                      exp.suggestion ||
                      exp.bullets ||
                      exp.recommendedBullets ||
                      '';
                    const title = exp.title || exp.role || exp.company || exp.position || `Experience Block ${idx + 1}`;
                    const reason = exp.reason || exp.explanation || exp.why || exp.impact || '';

                    return (
                      <ComparePanel
                        key={`pop-exp-${idx}`}
                        title={title}
                        current={current}
                        recommended={recommended}
                        reason={reason}
                      />
                    );
                  })}

                  {Array.isArray(popoverContent?.projects) && popoverContent.projects.map((proj, idx) => {
                    const current =
                      proj.current ||
                      proj.original ||
                      proj.before ||
                      proj.currentText ||
                      proj.description ||
                      proj.currentBullets ||
                      '';
                    const recommended =
                      proj.recommended ||
                      proj.optimized ||
                      proj.after ||
                      proj.recommendedText ||
                      proj.suggestion ||
                      proj.bullets ||
                      proj.recommendedBullets ||
                      '';
                    const title = proj.title || proj.project || proj.name || `Project Block ${idx + 1}`;
                    const reason = proj.reason || proj.explanation || proj.why || proj.impact || '';

                    return (
                      <ComparePanel
                        key={`pop-proj-${idx}`}
                        title={title}
                        current={current}
                        recommended={recommended}
                        reason={reason}
                      />
                    );
                  })}
                </div>

                {/* Action Plan */}
                {Array.isArray(popoverContent?.actionPlan) && popoverContent.actionPlan.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface-1/50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Action Plan &amp; Next Steps
                    </p>
                    <div className="space-y-2.5">
                      {popoverContent.actionPlan.map((actionItem, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded border border-border/70 bg-surface-2 p-2.5">
                          <StatusBadge tone={actionItem.priority === 'High' ? 'accent' : 'neutral'} size="sm" className="shrink-0">
                            {actionItem.priority || 'Action'}
                          </StatusBadge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground">{actionItem.action || actionItem.step || JSON.stringify(actionItem)}</p>
                            {actionItem.reason && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{actionItem.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogBody>

              <DialogFooter className="flex justify-end w-full">
                <Button variant="outline" onClick={() => setPopoverItem(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </ToolShell>
  );
};

const TailoringHistoryCard = ({ item, format, onOpenPopover }) => {
  const [expanded, setExpanded] = useState(false);
  const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;

  if (!content) return null;

  return (
    <div className="p-5 sm:p-6">
      {/* Header Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 cursor-pointer" onClick={() => onOpenPopover(item)}>
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              JD Match Analysis
            </p>
            <StatusBadge tone="accent" icon={Target}>
              {content.matchScore || 0}% Match
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{format(item.created_at)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenPopover(item)}
            className="h-8 text-xs font-medium gap-1.5"
          >
            <Eye className="size-3.5 text-primary" /> View in Popover
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? 'Collapse' : 'Inline View'}
            <ChevronDown className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Collapsed Preview */}
      {!expanded && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2/60 p-3">
          <span className="text-xs font-medium text-foreground mr-1">Quick Overview:</span>
          <StatusBadge tone="success" size="sm">
            {content.matchingSkills?.length || 0} Skills Matched
          </StatusBadge>
          <StatusBadge tone="ember" size="sm">
            {content.missingKeywords?.length || 0} Missing Keywords
          </StatusBadge>
          {Array.isArray(content.experienceGaps) && content.experienceGaps.length > 0 && (
            <StatusBadge tone="warning" size="sm">
              {content.experienceGaps.length} Gaps
            </StatusBadge>
          )}
        </div>
      )}

      {/* Expanded Detailed Breakdown */}
      {expanded && (
        <div className="mt-6 space-y-6 border-t border-border pt-6 animate-reveal">
          {/* Matching Skills & Missing Keywords */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-1/40 p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                Matching Skills ({content.matchingSkills?.length || 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {content.matchingSkills?.map((skill, idx) => (
                  <StatusBadge key={idx} tone="success" size="sm">✓ {skill}</StatusBadge>
                ))}
                {(!content.matchingSkills || content.matchingSkills.length === 0) && (
                  <span className="text-xs text-muted-foreground">None identified</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface-1/40 p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                Missing &amp; Under-Emphasized Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {content.missingKeywords?.map((kw, idx) => (
                  <StatusBadge key={`hist-mk-${idx}`} tone="ember" size="sm">✗ {kw}</StatusBadge>
                ))}
                {content.underEmphasizedKeywords?.map((kw, idx) => (
                  <StatusBadge key={`hist-ue-${idx}`} tone="warning" size="sm">⚠ {kw}</StatusBadge>
                ))}
                {(!content.missingKeywords?.length && !content.underEmphasizedKeywords?.length) && (
                  <span className="text-xs text-muted-foreground">None identified</span>
                )}
              </div>
            </div>
          </div>

          {/* Gaps and Recommendations */}
          {(content.experienceGaps?.length > 0 || content.atsRecommendations?.length > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {content.experienceGaps?.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-1/40 p-4">
                  <h5 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-warning">
                    <AlertTriangle className="size-3.5" /> Experience Gaps
                  </h5>
                  <ul className="space-y-2 text-xs text-foreground/80">
                    {content.experienceGaps.map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground">•</span> <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {content.atsRecommendations?.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-1/40 p-4">
                  <h5 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-success">
                    <Check className="size-3.5" /> ATS Recommendations
                  </h5>
                  <ul className="space-y-2 text-xs text-foreground/80">
                    {content.atsRecommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground">•</span> <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Optimized Sections Comparison */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Optimized Sections Comparison
            </p>

            {content.summaryOptimization && (() => {
              const pair = typeof content.summaryOptimization === 'object'
                ? {
                    current:
                      content.summaryOptimization.current ||
                      content.summaryOptimization.original ||
                      content.summaryOptimization.before ||
                      content.summaryOptimization.originalSummary ||
                      '',
                    recommended:
                      content.summaryOptimization.recommended ||
                      content.summaryOptimization.optimized ||
                      content.summaryOptimization.after ||
                      content.summaryOptimization.recommendedSummary ||
                      content.summaryOptimization.text ||
                      '',
                  }
                : { current: '', recommended: String(content.summaryOptimization) };

              return (
                <ComparePanel
                  title="Professional Summary"
                  current={pair.current}
                  recommended={pair.recommended}
                />
              );
            })()}

            {Array.isArray(content.experience) && content.experience.map((exp, idx) => {
              const current =
                exp.current ||
                exp.original ||
                exp.before ||
                exp.currentText ||
                exp.old ||
                exp.description ||
                exp.currentBullets ||
                '';
              const recommended =
                exp.recommended ||
                exp.optimized ||
                exp.after ||
                exp.recommendedText ||
                exp.suggestion ||
                exp.bullets ||
                exp.recommendedBullets ||
                '';
              const title = exp.title || exp.role || exp.company || exp.position || `Experience Block ${idx + 1}`;
              const reason = exp.reason || exp.explanation || exp.why || exp.impact || '';

              return (
                <ComparePanel
                  key={`hist-exp-${idx}`}
                  title={title}
                  current={current}
                  recommended={recommended}
                  reason={reason}
                />
              );
            })}

            {Array.isArray(content.projects) && content.projects.map((proj, idx) => {
              const current =
                proj.current ||
                proj.original ||
                proj.before ||
                proj.currentText ||
                proj.description ||
                proj.currentBullets ||
                '';
              const recommended =
                proj.recommended ||
                proj.optimized ||
                proj.after ||
                proj.recommendedText ||
                proj.suggestion ||
                proj.bullets ||
                proj.recommendedBullets ||
                '';
              const title = proj.title || proj.project || proj.name || `Project Block ${idx + 1}`;
              const reason = proj.reason || proj.explanation || proj.why || proj.impact || '';

              return (
                <ComparePanel
                  key={`hist-proj-${idx}`}
                  title={title}
                  current={current}
                  recommended={recommended}
                  reason={reason}
                />
              );
            })}
          </div>

          {/* Action Plan */}
          {Array.isArray(content.actionPlan) && content.actionPlan.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-1/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                Action Plan &amp; Next Steps
              </p>
              <div className="space-y-2.5">
                {content.actionPlan.map((actionItem, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded border border-border/70 bg-surface-2 p-2.5">
                    <StatusBadge tone={actionItem.priority === 'High' ? 'accent' : 'neutral'} size="sm" className="shrink-0">
                      {actionItem.priority || 'Action'}
                    </StatusBadge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{actionItem.action || actionItem.step || JSON.stringify(actionItem)}</p>
                      {actionItem.reason && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{actionItem.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeTailor;
