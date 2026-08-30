import { Image as ImageIcon, Sparkles, Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import OptionGroup from '../components/OptionGroup';

const imageStyles = [
  'Realistic',
  'Ghibli style',
  'Anime style',
  'Cartoon style',
  'Fantasy style',
  '3D style',
  'Portrait style',
];

const GenerateImages = () => {
  const [selectedStyle, setSelectedStyle] = useState('Realistic');
  const [input, setInput] = useState('');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setContent('');
      const prompt = `Generate an image of ${input} in the style ${selectedStyle}`;
      const { data } = await api.post(
        '/api/ai/generate-image',
        { prompt, publish },
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
      icon={ImageIcon}
      title="Image Studio"
      description="Describe a scene, pick a style, and generate a share-ready image in seconds."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Prompt & Style</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmitHandler} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Prompt</label>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    rows={5}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Style</label>
                  <OptionGroup
                    label="Style"
                    options={imageStyles}
                    value={selectedStyle}
                    onChange={setSelectedStyle}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setPublish(!publish)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface-2/50 px-3.5 py-3 text-left transition-colors hover:border-border-strong"
                >
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <ShieldCheck className="size-4 text-subtle-foreground" />
                    Share with community
                  </span>
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
                      publish ? 'border-primary bg-primary/70' : 'border-border-strong bg-surface-3'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-3.5 rounded-full bg-foreground transition-all ${
                        publish ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>

                <Button type="submit" loading={loading} className="h-12 w-full">
                  {!loading && <Sparkles className="size-5" />}
                  {loading ? 'Generating...' : 'Generate Image'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <ResultRegion label="Generated image">
            {loading && (
              <LoadingState
                title="Painting your scene..."
                description="This can take a few moments."
                lines={0}
                className="min-h-[400px]"
              />
            )}
            {!loading && content && (
              <div className="animate-rise space-y-4">
                <DemoBanner visible={isDemo} />
                <Card variant="result" className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
                    <h3 className="text-h3 text-foreground">Generated Image</h3>
                    <Button asChild variant="outline" size="sm">
                      <a href={content} download target="_blank" rel="noreferrer">
                        <Download className="size-4" /> Download
                      </a>
                    </Button>
                  </div>
                  <div className="grain bg-surface-2/40 p-5 sm:p-6">
                    <img
                      src={content}
                      alt="Generated"
                      className="mx-auto w-full max-w-2xl rounded-md border border-border shadow-lift"
                    />
                  </div>
                </Card>
              </div>
            )}
            {!loading && !content && (
              <EmptyState
                icon={ImageIcon}
                title="Awaiting Your Prompt"
                description="Configure your prompt and style on the left, then generate your image."
                className="min-h-[400px]"
              />
            )}
          </ResultRegion>
        </div>
      </div>
    </ToolShell>
  );
};

export default GenerateImages;
