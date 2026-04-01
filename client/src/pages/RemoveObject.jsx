import { Scissors } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
// baseURL handled by client/src/lib/api.js via VITE_SERVER_URL or VITE_BASE_URL

const RemoveObject = () => {
  const [input, setInput] = useState(null); // ✅ Changed to null
  const [object, setObject] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const { getToken } = useAuth();

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

      const formData = new FormData();
      formData.append('object', object); // ✅ Text field first
      formData.append('image', input); // ✅ File is now the actual File object

      console.log('📤 Sending file:', input.name, input.type);

      const { data } = await api.post('/api/ai/remove-image-object', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setContent(data.content);
        toast.success('Object removed successfully!');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
      >
        <div className="flex items-center gap-3">
          <Scissors className="w-6 text-[#4A7AFF]" />
          <h1 className="text-xl font-semibold">Object Removal</h1>
        </div>
        <p className="mt-6 text-sm font-medium">Image</p>
        <input
          onChange={(e) => setInput(e.target.files[0])} // ✅ FIXED! Use files[0]
          type="file"
          accept="image/*" // ✅ Added accept
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
          required
        />
        <br />
        <p className="mt-6 text-sm font-medium">Describe object name to remove</p>
        <textarea
          onChange={(e) => setObject(e.target.value)}
          value={object}
          rows={4}
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
          placeholder="e.g.: watch or spoon, Only single object name..."
          required
        />
        <button
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#417DF6] to-[#8E37EB] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
        >
          {loading ? (
            <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span>
          ) : (
            <Scissors className="w-5" />
          )}
          Remove Object
        </button>
      </form>
      <div className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 ">
        <div className="flex items-center gap-3">
          <Scissors className="w-5 h-5 text-[#4A7AFF]" />
          <h1 className="text-xl font-semibold">Processed Image</h1>
        </div>
        {!content ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
              <Scissors className="w-9 h-9" />
              <p>Upload an image and click "Remove Object" to get started</p>
            </div>
          </div>
        ) : (
          <img src={content} alt="image" className="mt-3 w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default RemoveObject;
