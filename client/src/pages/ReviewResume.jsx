import { Sparkles, FileText } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const ReviewResume = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('resume', input);
      const { data } = await api.post('/api/ai/resume-review', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setContent(data.content);
        setIsDemo(!!data.demo);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 text-foreground" />
            <CardTitle>Review resume</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Upload your resume</p>
              <Input
                onChange={(e) => setInput(e.target.files[0])}
                type="file"
                accept=".pdf"
                required
              />
              <p className="text-xs text-muted-foreground">Supports PDF format</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
              ) : (
                <FileText className="w-4" />
              )}
              Review resume
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg min-h-96">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-5 text-foreground" />
            <CardTitle>Feedback</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!content ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-sm flex flex-col items-center gap-4 text-muted-foreground">
                <FileText className="w-8" />
                <p>Upload your resume and get blunt, actionable feedback before you send it out.</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-scroll text-sm text-foreground/80">
              <DemoBanner visible={isDemo} />
              <div className="reset-tw">
                <Markdown>{content}</Markdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewResume;
