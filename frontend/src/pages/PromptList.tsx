import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

interface Prompt {
  id: string;
  name: string;
  category?: string;
  content: string;
  description?: string;
  tags?: string[];
  variables?: string[];
  version: number;
  usageCount?: number;
  lastUsedAt?: string;
  createdAt: string;
  sourceFile?: string;
}

export function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/prompts?limit=200';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterCategory) url += `&category=${encodeURIComponent(filterCategory)}`;
      if (filterTag) url += `&tag=${encodeURIComponent(filterTag)}`;

      const [data, catData, tagData, statsData] = await Promise.all([
        apiClient.get<Prompt[]>(url),
        apiClient.get<{ categories: string[] }>('/prompts/meta/categories'),
        apiClient.get<{ tags: string[] }>('/prompts/meta/tags'),
        apiClient.get('/prompts/meta/stats'),
      ]);

      setPrompts(data || []);
      setCategories(catData?.categories || []);
      setTags(tagData?.tags || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterTag]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      research: 'bg-blue-100 text-blue-800',
      architecture: 'bg-purple-100 text-purple-800',
      implementation: 'bg-green-100 text-green-800',
      testing: 'bg-yellow-100 text-yellow-800',
      review: 'bg-pink-100 text-pink-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category || 'general'] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchPrompts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prompt Library</h1>
        <p className="text-gray-600">Browse and manage available prompts</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Total Prompts</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPrompts}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Categories</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.categories?.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Tags</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {Object.keys(stats.promptsByTag || {}).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Most Used</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.mostUsedPrompts?.[0]?.usageCount || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            >
              <option value="">All Tags</option>
              {tags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prompt List */}
      <div className="space-y-4">
        {prompts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No prompts found matching your filters.
          </div>
        ) : (
          prompts.map((prompt) => (
            <div key={prompt.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
                  {prompt.description && (
                    <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                  )}
                </div>
                <div className="ml-3 flex gap-2 items-start">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(prompt.category)}`}>
                    {prompt.category || 'general'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    v{prompt.version}
                  </span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="mb-3 p-3 bg-gray-50 rounded font-mono text-xs text-gray-700 max-h-24 overflow-hidden">
                {prompt.content.substring(0, 200)}
                {prompt.content.length > 200 && '...'}
              </div>

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                    {prompt.tags.length > 4 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        +{prompt.tags.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Variables */}
              {prompt.variables && prompt.variables.length > 0 && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-xs font-semibold text-yellow-900 mb-1">Variables: </div>
                  <div className="text-xs text-yellow-800">{prompt.variables.join(', ')}</div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-200">
                <div className="space-y-1">
                  {prompt.usageCount && prompt.usageCount > 0 && (
                    <div>Used {prompt.usageCount} time{prompt.usageCount !== 1 ? 's' : ''}</div>
                  )}
                  {prompt.sourceFile && (
                    <div>Source: {prompt.sourceFile}</div>
                  )}
                </div>
                <div>
                  Created: {new Date(prompt.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Entry count */}
      <div className="mt-6 text-sm text-gray-600">
        Showing {prompts.length} of {stats?.totalPrompts || 0} prompts
      </div>
    </div>
  );
}
