import { Send, FileText, Briefcase, Sparkles, Mail, Linkedin } from 'lucide-react';
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
    <div className="pb-16 max-w-6xl mx-auto">
      <PageHeader
        icon={Send}
        title="Recruiter Outreach Generator"
        description="Generate personalized, high-converting messages to connect with recruiters on LinkedIn or via cold email."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" /> Outreach Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      className="bg-background border-border/50 focus-visible:ring-accent h-12"
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
                      className="bg-background border-border/50 focus-visible:ring-accent h-12"
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
                    className="bg-background border-border/50 focus-visible:ring-accent resize-none"
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
                    className="bg-background border-border/50 focus-visible:ring-accent resize-none"
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
                    className="bg-background border-border/50 focus-visible:ring-accent resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-4 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                >
                  {loading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Generating...' : 'Generate Outreach'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {loading && (
            <Card className="h-full border-dashed border-border/50 bg-transparent">
              <CardContent className="h-full flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-8">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-5 shadow-lg shadow-accent/20"></div>
                <p className="text-sm font-medium animate-pulse text-foreground/80">
                  Crafting personalized messages...
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && results && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-card border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2 font-semibold">
                      <Linkedin className="w-5 h-5 text-[#0077b5]" />
                      LinkedIn Connection Request
                    </CardTitle>
                    <CopyButton text={results.connectionRequest} className="h-8" />
                  </div>
                </CardHeader>
                <CardContent className="p-5 bg-background">
                  <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                    {results.connectionRequest}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2 font-semibold">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      Recruiter DM
                    </CardTitle>
                    <CopyButton text={results.recruiterDM} className="h-8" />
                  </div>
                </CardHeader>
                <CardContent className="p-5 bg-background">
                  <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                    {results.recruiterDM}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2 font-semibold">
                      <Mail className="w-5 h-5 text-red-400" />
                      Cold Email
                    </CardTitle>
                    <CopyButton
                      text={`Subject: ${results.coldEmail?.subject}\n\n${results.coldEmail?.body}`}
                      className="h-8"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-5 bg-background text-sm space-y-4">
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground block mb-2">
                      Subject
                    </span>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-foreground font-medium">
                      {results.coldEmail?.subject}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground block mb-2">
                      Body
                    </span>
                    <div className="whitespace-pre-wrap bg-muted/10 p-4 rounded-lg border border-border/50 text-foreground/90 leading-relaxed">
                      {results.coldEmail?.body}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && !results && (
            <Card className="h-full border-dashed border-border/50 bg-transparent">
              <CardContent className="h-full flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-5 border border-border/50">
                  <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Ready to Connect</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Fill out the details on the left to generate customized, high-converting outreach
                  messages for recruiters.
                </p>
              </CardContent>
            </Card>
          )}
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                    {item.prompt || 'Recruiter Outreach'}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(content.recruiterDM || content.connectionRequest)}
                  className="h-8 px-2 text-xs hover:bg-accent/10 hover:text-accent"
                >
                  Copy DM
                </Button>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
                  "{content.recruiterDM || content.connectionRequest}"
                </p>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default RecruiterOutreach;
