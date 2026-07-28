import React, { useState, useEffect } from 'react';
import { X, Plus, Star } from 'lucide-react';

const Watchlist = ({ onSelectStock, currentTicker }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  // Save to localStorage
  const saveWatchlist = (list) => {
    localStorage.setItem('watchlist', JSON.stringify(list));
    setWatchlist(list);
  };

  const addToWatchlist = (ticker) => {
    const upperTicker = ticker.toUpperCase().trim();
    if (upperTicker && !watchlist.includes(upperTicker)) {
      const newList = [...watchlist, upperTicker];
      saveWatchlist(newList);
      setNewStock('');
      setShowInput(false);
    }
  };

  const removeFromWatchlist = (ticker) => {
    const newList = watchlist.filter(t => t !== ticker);
    saveWatchlist(newList);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (newStock.trim()) addToWatchlist(newStock);
  };

  return (
    <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-gray-900 dark:text-white">Watchlist</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
            {watchlist.length}
          </span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Add stock"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add stock input */}
      {showInput && (
        <form onSubmit={handleAdd} className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="Add ticker (e.g., RELIANCE)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Watchlist items */}
      <div className="flex-1 overflow-y-auto p-2">
        {watchlist.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No stocks in watchlist.<br />Click + to add.
          </div>
        ) : (
          <div className="space-y-1">
            {watchlist.map((ticker) => (
              <div
                key={ticker}
                onClick={() => onSelectStock(ticker)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  currentTicker === ticker
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-medium">{ticker}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(ticker);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  title="Remove from watchlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
        {watchlist.length} / 20 stocks
      </div>
    </div>
  );
};

export default Watchlist;