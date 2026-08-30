import { Scissors, UploadCloud, ImageOff } from 'lucide-react';
import { useState, useRef } from 'react';
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

const RemoveObject = () => {
  const [input, setInput] = useState(null);
  const [object, setObject] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();
  const fileRef = useRef(null);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!input) {
        toast.error('Please select an image');
        setLoading(false);
        return;
      }
      if (object.split(' ').length > 1) {
        toast.error('Please enter only one object to remove');
        setLoading(false);
        return;
      }
      setContent('');
      const formData = new FormData();
      formData.append('object', object);
      formData.append('image', input);
      const { data } = await api.post('/api/ai/remove-image-object', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setContent(data.content);
        setIsDemo(!!data.demo);
        toast.success('Object removed successfully!');
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
      icon={Scissors}
      title="Remove Object"
      description="Upload a photo and tell the AI what to vanish. No Photoshop needed."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Upload & Target</CardTitle>
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

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">
                    What should disappear?
                  </label>
                  <Input
                    onChange={(e) => setObject(e.target.value)}
                    value={object}
                    placeholder="e.g. watch, spoon, car (single object only)"
                    required
                  />
                  <p className="text-xs text-subtle-foreground">
                    One object at a time for best results
                  </p>
                </div>

                <Button type="submit" loading={loading} className="h-12 w-full">
                  {!loading && <Scissors className="size-5" />}
                  {loading ? 'Removing...' : 'Remove Object'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <ResultRegion label="Processed image">
            {loading && (
              <LoadingState
                title="Erasing your object..."
                description="Repainting the surrounding scene."
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
                  <div className="grain bg-surface-2/40 p-5 sm:p-6">
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
                description="Upload a photo and tell the AI what to vanish."
                className="min-h-[400px]"
              />
            )}
          </ResultRegion>
        </div>
      </div>
    </ToolShell>
  );
};

export default RemoveObject;
