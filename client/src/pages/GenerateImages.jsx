import { Image } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import DemoBanner from '../components/DemoBanner';

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
    <div className="flex h-full border-t border-[#222]">
      <div className="w-full lg:w-[420px] xl:w-[480px] border-r border-[#222] flex flex-col bg-[#000] overflow-y-auto">
        <div className="p-6 pb-4">
          <p className="text-[11px] font-semibold text-[#555] tracking-[0.2em] uppercase mb-1">
            Image Studio
          </p>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Generate Images
          </h1>
        </div>
        <form onSubmit={onSubmitHandler} className="flex-1 flex flex-col px-6 pb-6">
          <div className="flex-1 space-y-6">
            <fieldset>
              <legend className="text-[10px] font-semibold text-[#555] tracking-[0.2em] uppercase mb-2.5">
                Prompt
              </legend>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={5}
                required
                className="w-full bg-transparent border border-[#333] px-3 py-2.5 text-sm text-white placeholder:text-[#444] resize-none focus:outline-none focus:border-[#666] transition-colors"
              />
            </fieldset>
            <fieldset>
              <legend className="text-[10px] font-semibold text-[#555] tracking-[0.2em] uppercase mb-2.5">
                Style
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {imageStyles.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedStyle(item)}
                    className={`px-3 py-1.5 text-[11px] font-medium border transition-colors ${
                      selectedStyle === item
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-[#555] border-[#333] hover:text-[#888] hover:border-[#555]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPublish(!publish)}
                className={`w-8 h-4 border transition-colors relative ${
                  publish ? 'bg-white border-white' : 'bg-transparent border-[#444]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 bg-black transition-all ${
                    publish ? 'left-4' : 'left-0.5'
                  }`}
                />
              </button>
              <span className="text-[11px] text-[#555] tracking-wider uppercase">
                Share with community
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-5 py-3 text-[11px] font-semibold bg-white text-black border border-white hover:bg-[#ddd] transition-colors uppercase tracking-wider disabled:opacity-30"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-y-auto">
        <div className="flex-1 flex items-center justify-center p-6">
          {!content ? (
            <div className="text-center max-w-xs">
              <div className="w-10 h-10 border border-[#333] mx-auto mb-5 flex items-center justify-center">
                <Image className="w-5 h-5 text-[#444]" />
              </div>
              <p className="text-sm text-[#555] leading-relaxed">
                Configure your prompt and style in the control panel, then generate your image.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <DemoBanner visible={isDemo} />
              <div className="border border-[#333] bg-[#000]">
                <img
                  src={content}
                  alt="Generated"
                  className="w-full block"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateImages;
