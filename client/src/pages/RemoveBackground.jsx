import { Sparkles, Eraser } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const RemoveBackground = () => {
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
      formData.append('image', input);
      const { data } = await api.post('/api/ai/remove-image-background', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setContent(data.content);
        setIsDemo(!!data.demo);
      } else toast.error(data.message);
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
            <CardTitle>Remove background</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Upload your image</p>
              <Input
                onChange={(e) => setInput(e.target.files[0])}
                type="file"
                accept="image/*"
                required
              />
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG and other common formats
              </p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
              ) : (
                <Eraser className="w-4" />
              )}
              Remove background
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg min-h-96">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Eraser className="w-5 text-foreground" />
            <CardTitle>Processed image</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!content ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-sm flex flex-col items-center gap-4 text-muted-foreground">
                <Eraser className="w-8" />
                <p>Upload a photo and get a clean, professional cutout in one click.</p>
              </div>
            </div>
          ) : (
            <>
              <DemoBanner visible={isDemo} />
              <img
                src={content}
                alt="Processed image"
                className="w-full rounded-lg mt-3 border"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RemoveBackground;
