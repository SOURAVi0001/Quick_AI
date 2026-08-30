import { Send, FileText, Briefcase, Sparkles, Mail, Linkedin } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CopyButton } from '../components/CopyButton';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import HistorySection from '../components/HistorySection';

const RecruiterOutreach = () => {
  const [formData, setFormData] = useState({
    targetRole: '',
    company: '',
    myProfile: '',
    recruiterProfile: '',
    jobDescription: '',
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const { getToken } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.targetRole || !formData.company || !formData.myProfile) {
      return toast.error('Please fill in Target Role, Company, and My Profile.');
    }

    try {
      setLoading(true);
      setResults(null);

      const { data } = await api.post('/api/ai/recruiter-outreach', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setResults(data.content);
        toast.success('Outreach messages generated!');
      } else {
        toast.error(data.message || 'Failed to generate outreach');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      icon={Send}
      title="Recruiter Outreach Generator"
      description="Generate personalized, high-converting messages to connect with recruiters on LinkedIn or via cold email."
      width="wide"
    >
      <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="size-5 text-primary" /> Outreach Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">
                      Target Role <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="targetRole"
                      value={formData.targetRole}
                      onChange={handleInputChange}
                      placeholder="e.g. Frontend Developer"
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">
                      Target Company <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="e.g. Netflix"
                      required
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">
                    My Profile / Resume <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    name="myProfile"
                    value={formData.myProfile}
                    onChange={handleInputChange}
                    placeholder="Paste your LinkedIn summary or key resume points here..."
                    rows={4}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">
                    Recruiter's Profile (Optional)
                  </label>
                  <Textarea
                    name="recruiterProfile"
                    value={formData.recruiterProfile}
                    onChange={handleInputChange}
                    placeholder="Paste anything you know about the recruiter to personalize it..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">
                    Job Description (Optional)
                  </label>
                  <Textarea
                    name="jobDescription"
                    value={formData.jobDescription}
                    onChange={handleInputChange}
                    placeholder="Paste the job description if you have a specific role in mind..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button type="submit" loading={loading} className="mt-4 h-12 w-full">
                  {!loading && <Sparkles className="size-5" />}
                  {loading ? 'Generating...' : 'Generate Outreach'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <ResultRegion label="Generated outreach messages">
            {loading && (
              <LoadingState
                title="Crafting personalized messages..."
                description="This usually takes a few seconds."
                className="min-h-[400px]"
              />
            )}

            {!loading && results && (
              <div className="animate-rise space-y-6">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-surface-2 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Linkedin className="size-5 text-primary" />
                        LinkedIn Connection Request
                      </CardTitle>
                      <CopyButton text={results.connectionRequest} className="h-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 p-5 pt-5">
                    <div className="min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
                      {results.connectionRequest}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-surface-2 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="size-5 text-primary" />
                        Recruiter DM
                      </CardTitle>
                      <CopyButton text={results.recruiterDM} className="h-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 p-5 pt-5">
                    <div className="min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
                      {results.recruiterDM}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-surface-2 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Mail className="size-5 text-primary" />
                        Cold Email
                      </CardTitle>
                      <CopyButton
                        text={`Subject: ${results.coldEmail?.subject}\n\n${results.coldEmail?.body}`}
                        className="h-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-5 text-sm">
                    <div>
                      <span className="text-eyebrow mb-2 block text-subtle-foreground">
                        Subject
                      </span>
                      <div className="min-w-0 break-words rounded-md border border-border bg-surface-2 p-3 font-medium text-foreground">
                        {results.coldEmail?.subject}
                      </div>
                    </div>
                    <div>
                      <span className="text-eyebrow mb-2 block text-subtle-foreground">Body</span>
                      <div className="min-w-0 break-words rounded-md border border-border bg-surface-1 p-4 leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {results.coldEmail?.body}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!loading && !results && (
              <EmptyState
                icon={Send}
                title="Ready to Connect"
                description="Fill out the details on the left to generate customized, high-converting outreach messages for recruiters."
                className="min-h-[400px]"
              />
            )}
          </ResultRegion>
        </div>
      </div>

      <HistorySection
        type="recruiter-outreach"
        title="Outreach History"
        renderItem={(item, { handleCopy, format }) => {
          const content =
            typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
                    {item.prompt || 'Recruiter Outreach'}
                  </p>
                  <p className="text-xs text-subtle-foreground">{format(item.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(content.recruiterDM || content.connectionRequest)}
                  className="h-8 shrink-0 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                >
                  Copy DM
                </Button>
              </div>
              <div className="min-w-0 rounded-md border border-border bg-surface-1 p-4">
                <p className="line-clamp-3 min-w-0 break-words text-xs leading-relaxed text-muted-foreground italic">
                  "{content.recruiterDM || content.connectionRequest}"
                </p>
              </div>
            </div>
          );
        }}
      />
    </ToolShell>
  );
};

export default RecruiterOutreach;
