'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Star, BookOpen, Play, Tag, Filter, ArrowRight } from 'lucide-react';
import { stripHtmlTags } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'quiz' | 'course' | 'category' | 'user';
  description: string;
  rating?: number;
  price?: number;
  author: string;
  url: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  thumbnail?: string;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'category' | 'tag';
  count?: number;
}

export default function SearchModal({ isOpen, onClose, initialQuery = '' }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'quiz' | 'course' | 'category'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'JavaScript Quiz',
    'React Course',
    'Python Basics',
    'Web Development'
  ]);
  const [trendingSearches] = useState<string[]>([
    'Machine Learning',
    'Data Science',
    'AWS Certification',
    'React Native',
    'DevOps'
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Mock autocomplete suggestions
  const mockSuggestions: SearchSuggestion[] = [
    { id: '1', text: 'JavaScript', type: 'category', count: 45 },
    { id: '2', text: 'React', type: 'category', count: 32 },
    { id: '3', text: 'Python', type: 'category', count: 28 },
    { id: '4', text: 'beginner', type: 'tag', count: 156 },
    { id: '5', text: 'advanced', type: 'tag', count: 89 },
    { id: '6', text: 'web development', type: 'query', count: 67 },
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      if (initialQuery) {
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = showSuggestions ? suggestions.length - 1 : results.length - 1;
          return prev < maxIndex ? prev + 1 : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        if (showSuggestions && suggestions[selectedIndex]) {
          const suggestion = suggestions[selectedIndex];
          setQuery(suggestion.text);
          handleSearch(suggestion.text);
          setShowSuggestions(false);
        } else if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, selectedIndex, showSuggestions, suggestions, results]);

  const getSuggestions = useCallback((searchQuery: string): SearchSuggestion[] => {
    if (!searchQuery.trim()) return [];

    return mockSuggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, []);

  const debounce = useCallback((func: (...args: unknown[]) => unknown, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const debouncedGetSuggestions = useCallback(
    debounce((searchQuery: string) => {
      const newSuggestions = getSuggestions(searchQuery);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0 && searchQuery.length > 0);
    }, 300),
    [getSuggestions, debounce]
  );

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Enhanced mock results with more details
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `${searchQuery} - Beginner Quiz`,
          type: 'quiz',
          description: 'Test your knowledge with this comprehensive quiz covering fundamental concepts',
          rating: 4.5,
          price: 0,
          author: 'John Doe',
          url: `/quiz/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-beginner`,
          tags: ['beginner', 'fundamentals'],
          difficulty: 'beginner',
          duration: '15 min'
        },
        {
          id: '2',
          title: `${searchQuery} Mastery Course`,
          type: 'course',
          description: 'Complete course covering all aspects of the topic with hands-on projects',
          rating: 4.8,
          price: 29.99,
          author: 'Jane Smith',
          url: `/course/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-mastery`,
          tags: ['advanced', 'projects'],
          difficulty: 'advanced',
          duration: '8 hours'
        },
        {
          id: '3',
          title: `${searchQuery} Intermediate Challenge`,
          type: 'quiz',
          description: 'Challenge yourself with intermediate-level questions and scenarios',
          rating: 4.3,
          price: 9.99,
          author: 'Mike Johnson',
          url: `/quiz/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-intermediate`,
          tags: ['intermediate', 'challenge'],
          difficulty: 'intermediate',
          duration: '25 min'
        }
      ];

      // Filter results based on active filter
      const filteredResults = activeFilter === 'all'
        ? mockResults
        : mockResults.filter(result => result.type === activeFilter);

      setResults(filteredResults);

      // Add to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim()) {
      debouncedGetSuggestions(value);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setResults([]);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
    setShowSuggestions(false);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    handleSearch(search);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'category': return <BookOpen className="w-4 h-4" />;
      case 'tag': return <Tag className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search quizzes, courses, topics..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-lg text-gray-900 placeholder-gray-500 border-0 focus:ring-0 focus:outline-none"
            />

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="text-gray-400">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-900">{suggestion.text}</span>
                      {suggestion.count && (
                        <span className="text-gray-400 text-sm ml-2">({suggestion.count})</span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {['all', 'quiz', 'course', 'category'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]" ref={resultsRef}>
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Searching...</p>
            </div>
          ) : query ? (
            // Search results
            <div className="p-4">
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full text-left p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors ${
                        selectedIndex === index ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          result.type === 'quiz' ? 'bg-blue-100' :
                          result.type === 'course' ? 'bg-green-100' : 'bg-purple-100'
                        }`}>
                          {result.type === 'quiz' ? (
                            <BookOpen className="w-5 h-5 text-blue-600" />
                          ) : result.type === 'course' ? (
                            <Play className="w-5 h-5 text-green-600" />
                          ) : (
                            <Tag className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{stripHtmlTags(result.title)}</h3>
                          <p className="text-sm text-gray-500 mt-1">{stripHtmlTags(result.description)}</p>

                          {/* Tags and Difficulty */}
                          {(result.tags || result.difficulty) && (
                            <div className="flex items-center gap-2 mt-2">
                              {result.difficulty && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(result.difficulty)}`}>
                                  {result.difficulty}
                                </span>
                              )}
                              {result.tags?.slice(0, 2).map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <span>by {result.author}</span>
                              {result.duration && <span>{result.duration}</span>}
                              {result.rating && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{result.rating}</span>
                                </div>
                              )}
                            </div>
                            {result.price !== undefined && (
                              <span className={`font-medium ${result.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {result.price === 0 ? 'Free' : `$${result.price}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No results found for &quot;{query}&quot;</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          ) : (
            // Default view with recent and trending searches
            <div className="p-4">
              {/* Recent searches */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900">Recent searches</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchClick(search)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending searches */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900">Trending searches</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchClick(search)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
