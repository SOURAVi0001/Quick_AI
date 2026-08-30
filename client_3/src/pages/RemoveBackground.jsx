import { Eraser, UploadCloud, ImageOff } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';

const RemoveBackground = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();
  const fileRef = useRef(null);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setContent('');
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
    <ToolShell
      icon={Eraser}
      title="Remove Background"
      description="Upload a photo and get a clean, professional cutout in one click."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Upload Your Image</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmitHandler} className="space-y-6">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface-1/25 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-surface-2/40"
                >
                  <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-2/80 text-subtle-foreground transition-colors group-hover:text-primary">
                    <UploadCloud className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {input ? input.name : 'Click to upload an image'}
                  </span>
                  <span className="text-xs text-subtle-foreground">
                    Supports JPG, PNG and other common formats
                  </span>
                </button>
                <input
                  ref={fileRef}
                  onChange={(e) => setInput(e.target.files[0])}
                  type="file"
                  accept="image/*"
                  required
                  className="hidden"
                />
                <Button type="submit" loading={loading} className="h-12 w-full">
                  {!loading && <Eraser className="size-5" />}
                  {loading ? 'Removing...' : 'Remove Background'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <ResultRegion label="Processed image">
            {loading && (
              <LoadingState
                title="Lifting your subject..."
                description="Cutting out the background."
                lines={0}
                className="min-h-[400px]"
              />
            )}
            {!loading && content && (
              <div className="animate-rise space-y-4">
                <DemoBanner visible={isDemo} />
                <Card variant="result" className="overflow-hidden">
                  <div className="border-b border-border px-5 py-3.5 sm:px-6">
                    <h3 className="text-h3 text-foreground">Processed Image</h3>
                  </div>
                  <div className="grain bg-surface-2/40 bg-[linear-gradient(45deg,hsl(var(--surface-3))_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--surface-3))_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--surface-3))_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--surface-3))_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-5 sm:p-6">
                    <img
                      src={content}
                      alt="Processed"
                      className="mx-auto w-full max-w-2xl rounded-md border border-border shadow-lift"
                    />
                  </div>
                </Card>
              </div>
            )}
            {!loading && !content && (
              <EmptyState
                icon={ImageOff}
                title="Awaiting an Image"
                description="Upload a photo and get a clean, professional cutout in one click."
                className="min-h-[400px]"
              />
            )}
          </ResultRegion>
        </div>
      </div>
    </ToolShell>
  );
};

export default RemoveBackground;
