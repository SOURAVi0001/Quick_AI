import React, { useState } from 'react';
import Markdown from 'react-markdown';

const CreationItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="p-4 max-w-5xl text-sm bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex justify-between items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate">{item.prompt}</h2>
          <p className="text-gray-500">
            {item.type} - {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
        <button className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] px-4 py-1 rounded-full text-xs shrink-0">
          {item.type}
        </button>
      </div>
      {expanded && (
        <div>
          {item.type === 'image' ? (
            <div className="mt-3">
              {/* Loading skeleton */}
              {!imgLoaded && !imgError && (
                <div className="w-full max-w-md h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              {/* Error state */}
              {imgError && (
                <div className="w-full max-w-md h-40 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-red-400 text-sm">
                  Failed to load image
                </div>
              )}
              {/* Actual image */}
              <img
                src={item.content}
                alt={item.prompt || 'Generated image'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={`w-full max-w-md rounded-lg shadow-sm transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0 h-0'
                }`}
              />
            </div>
          ) : (
            <div className="mt-3 h-full overflow-y-scroll text-sm text-slate-700">
              <div className="reset-tw">
                <Markdown>{item.content}</Markdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default CreationItem;
