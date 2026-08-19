import { Target, Check, AlertTriangle, Sparkles, UploadCloud, File as FileIcon, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const ResumeTailor = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
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

      if (data.success) {
        setResults(data.content);
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
            {results.summaryOptimization && (
              <ComparePanel
                title="Professional Summary"
                current={results.summaryOptimization.current}
                recommended={results.summaryOptimization.recommended}
                className="mb-6"
              />
            )}

            {results.experience?.map((exp, i) => (
              <ComparePanel
                key={`exp-${i}`}
                title={`Experience Block ${i + 1}`}
                current={exp.current}
                recommended={exp.recommended}
                className="mb-6"
              />
            ))}

            {results.projects?.map((proj, i) => (
              <ComparePanel
                key={`proj-${i}`}
                title={`Project Block ${i + 1}`}
                current={proj.current}
                recommended={proj.recommended}
                className="mb-6"
              />
            ))}
          </Zone>
        </div>
      )}

      <HistorySection
        type="resume-tailor"
        title="Tailoring History"
        renderItem={(item, { format }) => {
          const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-foreground">
                    JD Match Analysis
                  </p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <StatusBadge tone="accent" icon={Target}>
                  {content.matchScore}% Match
                </StatusBadge>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="mb-2 text-sm font-medium text-foreground">Key Missing Keywords:</p>
                <div className="flex flex-wrap gap-1.5">
                  {content.missingKeywords?.slice(0, 5).map((kw, i) => (
                    <StatusBadge key={i} tone="neutral">{kw}</StatusBadge>
                  ))}
                  {content.missingKeywords?.length > 5 && <span className="text-[10px] text-muted-foreground">+{content.missingKeywords.length - 5} more</span>}
                </div>
              </div>
            </div>
          );
        }}
      />
    </ToolShell>
  );
};

export default ResumeTailor;
