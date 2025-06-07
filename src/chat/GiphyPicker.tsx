import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Use the provided GIPHY API key
const GIPHY_API_KEY = "106VuSed3O2odVxY5c3sr8bzI1Yp0Y71";

interface GiphyPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const GiphyPicker: React.FC<GiphyPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  // Initial trending GIFs
  useEffect(() => {
    fetchTrending();
  }, []);
  
  // Search GIFs with debounce
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    
    if (search.trim() === '') {
      fetchTrending();
      return;
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchGifs();
    }, 500);
    
    return () => clearTimeout(debounceTimer.current);
  }, [search]);
  
  const fetchTrending = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(data.message || 'Failed to fetch GIFs');
      }
      
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching trending GIFs:', err);
      setError('Could not load GIFs. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGifs = async () => {
    if (search.trim() === '') return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          search
        )}&limit=20&rating=g`
      );
      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(data.message || 'Failed to fetch GIFs');
      }
      
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error searching GIFs:', err);
      setError('Could not load GIFs. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-gray-900 rounded-lg border border-gray-700 shadow-xl max-h-[300px] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex-1 mx-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search GIFs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-full py-1 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-full"
        >
          <XMarkIcon className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      
      {/* GIFs container */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading && (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-400 text-sm py-4">{error}</div>
        )}
        
        {!loading && !error && gifs.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            No GIFs found. Try a different search.
          </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.images.fixed_height.url)}
              className="relative overflow-hidden rounded-lg hover:ring-2 hover:ring-blue-500 focus:outline-none"
              style={{ paddingBottom: '100%' }}
            >
              <img
                src={gif.images.fixed_height_small.url}
                alt={gif.title}
                className="absolute top-0 left-0 w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
      
      {/* Footer with attribution */}
      <div className="p-1 text-center text-xs text-gray-400 border-t border-gray-700">
        Powered by GIPHY
      </div>
    </div>
  );
};

export default GiphyPicker;
