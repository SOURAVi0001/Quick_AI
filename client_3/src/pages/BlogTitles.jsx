import { Sparkles, Hash } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import OptionGroup from '../components/OptionGroup';
import CopyBlock from '../components/CopyBlock';

const categories = [
  'General', 'Technology', 'Business', 'Health',
  'Lifestyle', 'Education', 'Travel', 'Food',
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
      setContent('');
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
    <ToolShell
      icon={Hash}
      title="Blog Titles & Headlines"
      description="Drop in a keyword, pick a category, and get a batch of click-stopping headlines ready to use."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Title Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmitHandler} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Keyword</label>
                  <Input
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    placeholder="Enter your topic keyword..."
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <OptionGroup
                    label="Category"
                    options={categories}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                  />
                </div>
                <Button type="submit" loading={loading} disabled={!selectedCategory} className="h-12 w-full">
                  {!loading && <Sparkles className="size-5" />}
                  {loading ? 'Generating...' : 'Generate Titles'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <ResultRegion label="Generated blog titles">
            {loading && (
              <LoadingState title="Drafting headlines..." description="Sifting your keyword for angles that get clicks." />
            )}
            {!loading && content && (
              <div className="animate-rise">
                <DemoBanner visible={isDemo} />
                <CopyBlock eyebrow="AI Recommendation" label="Headlines" content={content} />
              </div>
            )}
            {!loading && !content && (
              <EmptyState
                icon={Hash}
                title="Awaiting a Keyword"
                description="Drop in a keyword, pick a category, and get a batch of click-stopping headlines."
                className="min-h-[400px]"
              />
            )}
          </ResultRegion>
        </div>
      </div>
    </ToolShell>
  );
};

export default BlogTitles;
