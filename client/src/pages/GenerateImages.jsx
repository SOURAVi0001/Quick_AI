import { Sparkles, Image } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

const imageStyles = [
  'Realistic', 'Ghibli style', 'Anime style', 'Cartoon style',
  'Fantasy style', '3D style', 'Portrait style',
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
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 text-foreground" />
            <CardTitle>AI Image Generator</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Describe your Image</p>
              <Textarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="Describe what you want to see in the image..."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Style</p>
              <div className="flex gap-2 flex-wrap">
                {imageStyles.map((item) => (
                  <Badge
                    key={item}
                    variant={selectedStyle === item ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedStyle(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="publish" checked={publish} onCheckedChange={setPublish} />
              <Label htmlFor="publish">Make this image Public</Label>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
              ) : (
                <Image className="w-4" />
              )}
              Generate image
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg min-h-96">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Image className="w-5 text-foreground" />
            <CardTitle>Generated image</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!content ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-sm flex flex-col items-center gap-4 text-muted-foreground">
                <Image className="w-8" />
                <p>Enter a topic and click "Generate image" to get started</p>
              </div>
            </div>
          ) : (
            <>
              <DemoBanner visible={isDemo} />
              <img
                src={content}
                alt="Generated image"
                className="w-full rounded-lg mt-3 border"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateImages;
