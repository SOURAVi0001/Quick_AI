import { FileText, Search, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import PageHeader from '../components/PageHeader';
import HistorySection from '../components/HistorySection';

const ReviewResume = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/api/ai/resume-review', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setContent(data.content);
        setIsDemo(!!data.demo);
      } else {
        toast.error(data.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto">
      <PageHeader
        icon={FileText}
        title="Resume Review"
        description="Get blunt, actionable feedback on your resume before you send it out. We analyze strengths, weaknesses, and ATS issues."
      />

      <Card className="mb-12">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={onSubmitHandler} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Upload your resume</label>
              <Input
                onChange={(e) => setFile(e.target.files[0])}
                type="file"
                accept=".pdf"
                required
                className="bg-background border-border/50 h-12 text-base focus-visible:ring-accent pt-2.5 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Supports PDF format</p>
            </div>

            <Button
              type="submit"
              disabled={loading || !file}
              className="w-full sm:w-auto h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
              ) : (
                <Search className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Analyzing resume...' : 'Review Resume'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {content && (
        <div className="mb-16 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Analysis Result</h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-border/50"
              onClick={() => handleCopy(content)}
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-6 sm:p-8">
              <DemoBanner visible={isDemo} />
              <div className="prose prose-invert prose-p:leading-relaxed max-w-none prose-headings:text-foreground">
                <Markdown>{content}</Markdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <HistorySection
        type="resume-review"
        title="Review History"
        renderItem={(item, { handleCopy, format }) => (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                  Resume Analysis
                </p>
                <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent/10 hover:text-accent"
                onClick={() => handleCopy(item.content)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-background/50 rounded-lg p-4 border border-border/30 max-h-32 overflow-hidden relative">
              <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                <Markdown>{item.content}</Markdown>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/50 to-transparent pointer-events-none"></div>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default ReviewResume;
