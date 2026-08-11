import { useEffect, useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, RefreshCw, FileCode, Database, Globe } from 'lucide-react';

interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  relativePath: string;
  children?: TreeNode[];
}

export function ScrapedExplorer() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchTree = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/scraped/tree');
      const data = await res.json();
      setTree(data);
    } catch (e) {
      console.error('Error fetching scraped tree:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const loadInitialTree = async () => {
      try {
        const res = await fetch('/api/scraped/tree');
        const data = await res.json();
        if (!ignore) {
          setTree(data);
        }
      } catch (e) {
        if (!ignore) {
          console.error('Error fetching scraped tree:', e);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    loadInitialTree();
    return () => {
      ignore = true;
    };
  }, []);

  const toggleExpand = (path: string) => {
    setExpandedNodes(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    setFileLoading(true);
    setFileContent(null);
    try {
      const res = await fetch(`/api/scraped/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) {
        setFileContent(`Error: ${data.error}`);
      } else {
        setFileContent(data.content);
      }
    } catch (e) {
      setFileContent(`Error loading file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFileLoading(false);
    }
  };

  const renderTree = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedNodes[node.relativePath] || false;
    const isDir = node.type === 'directory';

    return (
      <div key={node.relativePath} className="select-none">
        <div
          onClick={() => {
            if (isDir) {
              toggleExpand(node.relativePath);
            } else {
              handleFileSelect(node.relativePath);
            }
          }}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-all hover:bg-indigo-50/80 ${
            selectedFile === node.relativePath ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/20' : 'text-slate-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {isDir ? (
            <>
              {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
              <Folder className={`w-4 h-4 ${selectedFile === node.relativePath ? 'text-white' : 'text-indigo-600'}`} />
            </>
          ) : (
            <>
              <span className="w-4" />
              {node.name.endsWith('.json') ? (
                <FileCode className={`w-4 h-4 ${selectedFile === node.relativePath ? 'text-white' : 'text-amber-600'}`} />
              ) : (
                <FileText className={`w-4 h-4 ${selectedFile === node.relativePath ? 'text-white' : 'text-emerald-600'}`} />
              )}
            </>
          )}
          <span className="text-sm truncate font-medium">{node.name}</span>
        </div>

        {isDir && isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContentPane = () => {
    if (!selectedFile) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 min-h-[400px]">
          <Database className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-medium text-sm">Select a file from the folder tree to view its raw contents.</p>
        </div>
      );
    }

    if (fileLoading) {
      return (
        <div className="h-full flex items-center justify-center text-indigo-600 min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (fileContent === null) return null;

    const isJson = selectedFile.endsWith('.json');
    const isHtml = selectedFile.endsWith('.html');

    let displayContent = fileContent;
    if (isJson) {
      try {
        const parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
        displayContent = JSON.stringify(parsed, null, 2);
      } catch {
        // Fallback to raw string
      }
    }

    return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
              {isJson ? <FileCode className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-emerald-600" />}
              <span>{selectedFile.split('/').pop()}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono truncate max-w-lg">{selectedFile}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-100 leading-relaxed max-h-[60vh] shadow-inner">
          {isHtml ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 text-[10px] uppercase font-bold self-start w-fit">
                <Globe className="w-3 h-3" />
                <span>HTML Code Preview</span>
              </div>
              <pre className="whitespace-pre-wrap text-slate-200">{displayContent}</pre>
            </div>
          ) : (
            <pre className="whitespace-pre text-slate-200">{displayContent}</pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Sidebar Explorer */}
      <div className="lg:col-span-1 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 space-y-6 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span>Folder Tree</span>
          </h2>
          <button
            onClick={() => fetchTree(true)}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all disabled:opacity-50"
            title="Refresh tree"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto space-y-1 pr-2 scrollbar-thin">
          {loading && !tree ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : tree && tree.children && tree.children.length > 0 ? (
            tree.children.map(child => renderTree(child))
          ) : (
            <div className="text-center py-12 text-slate-400 italic text-sm">
              No scraped files found.
            </div>
          )}
        </div>
      </div>

      {/* Content Viewer Pane */}
      <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 min-h-[500px] flex flex-col justify-between shadow-xl shadow-slate-200/50">
        {renderContentPane()}
      </div>
    </div>
  );
}
