import { Target, Check, AlertTriangle, Sparkles, FileText, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CopyButton } from '../components/CopyButton';
import PageHeader from '../components/PageHeader';
import HistorySection from '../components/HistorySection';

const ResumeTailor = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
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

  const SectionOptimizer = ({ title, current, recommended }) => (
    <div className="border border-border/50 rounded-xl overflow-hidden mb-6 bg-card">
      <div className="bg-muted/30 px-5 py-4 border-b border-border/50 flex justify-between items-center">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <CopyButton text={recommended} className="h-8" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
        <div className="p-5 bg-background/50">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
            Current
          </span>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {current || 'N/A'}
          </p>
        </div>
        <div className="p-5 bg-accent/5">
          <span className="text-[11px] font-bold text-accent uppercase tracking-widest block mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Recommended
          </span>
          <p className="text-sm text-foreground whitespace-pre-wrap font-medium leading-relaxed">
            {recommended}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-16 max-w-4xl mx-auto">
      <PageHeader
        icon={Target}
        title="Resume Tailor"
        description="Tailor your resume to a specific job description to beat the ATS and increase your match score."
      />

      <Card className="mb-12">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Current Resume <span className="text-destructive">*</span>
                </label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  required
                  className="bg-background border-border/50 h-12 text-base focus-visible:ring-accent pt-2.5 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">PDF format only</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Job Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the complete job description here..."
                  rows={4}
                  required
                  className="bg-background border-border/50 text-base focus-visible:ring-accent resize-none h-[120px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
              ) : (
                <Target className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Analyzing & Tailoring...' : 'Tailor My Resume'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results && (
        <div className="mb-16 animate-in slide-in-from-bottom-4 duration-500 fade-in space-y-8">
          <Card className="border-accent/20 bg-accent/5 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center p-8 gap-8">
              <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center rounded-full bg-background/50 shadow-inner border border-accent/20">
                <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="427.2"
                    strokeDashoffset={427.2 - (427.2 * results.matchScore) / 100}
                    className="text-accent transition-all duration-1000"
                  />
                </svg>
                <div className="z-10 flex flex-col items-center">
                  <span className="text-4xl font-bold text-foreground">{results.matchScore}</span>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
                    JD Match
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Match Analysis
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your resume has a {results.matchScore}% alignment with this job description based
                  on keywords, experience depth, and formatting.
                </p>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                  <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> {results.matchingSkills?.length || 0} Skills
                    Matched
                  </div>
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {results.missingKeywords?.length || 0}{' '}
                    Missing Keywords
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Matching Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {results.matchingSkills?.map((skill, i) => (
                    <span
                      key={i}
                      className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded text-[11px] font-medium tracking-wide"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                  {(!results.matchingSkills || results.matchingSkills.length === 0) && (
                    <span className="text-sm text-muted-foreground">
                      No explicit matching skills found.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Missing Keywords
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {results.missingKeywords?.map((kw, i) => (
                    <span
                      key={i}
                      className="bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded text-[11px] font-medium tracking-wide"
                    >
                      ✗ {kw}
                    </span>
                  ))}
                  {results.underEmphasizedKeywords?.map((kw, i) => (
                    <span
                      key={`ue-${i}`}
                      className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-1 rounded text-[11px] font-medium tracking-wide"
                    >
                      ⚠ {kw}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Experience Gaps & ATS Fixes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid md:grid-cols-2 gap-8">
              <div>
                <h5 className="text-[11px] font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Experience Gaps
                </h5>
                <ul className="space-y-2 text-sm text-foreground/80">
                  {results.experienceGaps?.map((gap, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-muted-foreground mt-0.5">•</span> <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" /> ATS Recommendations
                </h5>
                <ul className="space-y-2 text-sm text-foreground/80">
                  {results.atsRecommendations?.map((rec, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-muted-foreground mt-0.5">•</span> <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="pt-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Optimized Sections
            </h3>

            {results.summaryOptimization && (
              <SectionOptimizer
                title="Professional Summary"
                current={results.summaryOptimization.current}
                recommended={results.summaryOptimization.recommended}
              />
            )}

            {results.experience?.map((exp, i) => (
              <SectionOptimizer
                key={`exp-${i}`}
                title={`Experience Block ${i + 1}`}
                current={exp.current}
                recommended={exp.recommended}
              />
            ))}

            {results.projects?.map((proj, i) => (
              <SectionOptimizer
                key={`proj-${i}`}
                title={`Project Block ${i + 1}`}
                current={proj.current}
                recommended={proj.recommended}
              />
            ))}
          </div>
        </div>
      )}

      <HistorySection
        type="resume-tailor"
        title="Tailoring History"
        renderItem={(item, { handleCopy, format }) => {
          const content =
            typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">JD Match Analysis</p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold flex items-center gap-1">
                  <Target className="w-3 h-3" /> {content.matchScore}% Match
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <p className="text-sm text-foreground font-medium mb-2">Key Missing Keywords:</p>
                <div className="flex flex-wrap gap-1.5">
                  {content.missingKeywords?.slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                  {content.missingKeywords?.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{content.missingKeywords.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default ResumeTailor;
