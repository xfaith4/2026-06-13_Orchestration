import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface OutputInfo {
  runId: string;
  path: string;
  relativePath: string;
  exists: boolean;
  fileCount: number;
  truncated: boolean;
  hasNodeModules: boolean;
  files: string[];
}

export function OutputDirectory({ runId }: { runId: string }) {
  const [info, setInfo] = useState<OutputInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealMsg, setRevealMsg] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<OutputInfo>(`/runs/${runId}/output`);
        if (active) setInfo(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load output directory');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [runId]);

  const copyPath = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const reveal = async () => {
    try {
      setRevealing(true);
      setRevealMsg(null);
      await apiClient.post(`/runs/${runId}/reveal-output`, {});
      setRevealMsg('Opened in file manager');
    } catch (err) {
      setRevealMsg(err instanceof Error ? err.message : 'Failed to open folder');
    } finally {
      setRevealing(false);
      setTimeout(() => setRevealMsg(null), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Output Directory</h2>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {info && !loading && !error && (
        info.exists ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 bg-gray-100 px-3 py-2 rounded text-sm break-all">{info.path}</code>
              <button
                onClick={copyPath}
                className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                {copied ? 'Copied!' : 'Copy path'}
              </button>
              <button
                onClick={reveal}
                disabled={revealing}
                className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {revealing ? 'Opening…' : 'Reveal in Explorer'}
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-2">
              {info.fileCount}
              {info.truncated ? '+' : ''} file{info.fileCount === 1 ? '' : 's'}
              {info.hasNodeModules ? ' · node_modules present (excluded from list)' : ''}
              {info.files.length > 0 && (
                <button
                  onClick={() => setShowFiles(s => !s)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  {showFiles ? 'hide files' : 'show files'}
                </button>
              )}
            </p>

            {revealMsg && <p className="text-xs text-gray-500 mt-1">{revealMsg}</p>}

            {showFiles && (
              <ul className="mt-2 max-h-48 overflow-auto text-xs text-gray-700 font-mono bg-gray-50 rounded p-2">
                {info.files.map(f => (
                  <li key={f}>{f}</li>
                ))}
                {info.truncated && <li className="text-gray-400">… more not shown</li>}
              </ul>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">No files have been produced for this run yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              When the run executes, files are written to{' '}
              <code className="bg-gray-100 px-1 rounded">{info.relativePath}</code>.
            </p>
          </div>
        )
      )}
    </div>
  );
}
