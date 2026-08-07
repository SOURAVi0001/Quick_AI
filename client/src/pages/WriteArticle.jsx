import { Sparkles, Edit } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const articleLengths = [
  { length: 800, text: 'Short (500-800 words)' },
  { length: 1200, text: 'Medium (800-1200 words)' },
  { length: 1600, text: 'Long (1200+ words)' },
];

const WriteArticle = () => {
  const [selectedLength, setSelectedLength] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const prompt = `Write an article about ${input} in ${selectedLength.text}`;
      const { data } = await api.post(
        '/api/ai/generate-article',
        { prompt, length: selectedLength.length },
        { headers: { Authorization: `Bearer ${await getToken()}` } },
      );
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
            <CardTitle>Write an article</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">What do you want to write about?</p>
              <Input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="The future of remote work is..."
                required
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Article length</p>
              <div className="flex gap-2 flex-wrap">
                {articleLengths.map((item) => (
                  <Badge
                    key={item.text}
                    variant={selectedLength?.text === item.text ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedLength(item)}
                  >
                    {item.text}
                  </Badge>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading || !selectedLength} className="w-full">
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
              ) : (
                <Edit className="w-4" />
              )}
              Generate article
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg min-h-96 max-h-[600px]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Edit className="w-5 text-foreground" />
            <CardTitle>Your draft</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!content ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-sm flex flex-col items-center gap-4 text-muted-foreground">
                <Edit className="w-8" />
                <p>Pick a topic and length, then hit generate. Your draft will appear here.</p>
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

export default WriteArticle;
