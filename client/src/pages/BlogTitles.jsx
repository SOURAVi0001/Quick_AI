import { Sparkles, Hash } from 'lucide-react';
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

const categories = [
  'General',
  'Technology',
  'Business',
  'Health',
  'Lifestyle',
  'Education',
  'Travel',
  'Food',
];

const BlogTitles = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const prompt = `Generate the blog tittle for the keyword ${input}in the category ${selectedCategory}}`;
      const { data } = await api.post(
        '/api/ai/generate-blog-title',
        { prompt },
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
            <CardTitle>Blog titles &amp; headlines</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Keyword</p>
              <Input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="Enter your topic keyword..."
                required
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Category</p>
              <div className="flex gap-2 flex-wrap">
                {categories.map((item) => (
                  <Badge
                    key={item}
                    variant={selectedCategory === item ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading || !selectedCategory} className="w-full">
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
              ) : (
                <Hash className="w-4" />
              )}
              Generate titles
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg min-h-96">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Hash className="w-5 text-foreground" />
            <CardTitle>Headlines</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!content ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-sm flex flex-col items-center gap-4 text-muted-foreground">
                <Hash className="w-8" />
                <p>
                  Drop in a keyword, pick a category, and get a batch of click-stopping headlines.
                </p>
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

export default BlogTitles;
