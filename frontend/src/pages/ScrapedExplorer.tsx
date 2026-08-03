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
    fetchTree();
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
    } catch (e: any) {
      setFileContent(`Error loading file: ${e.message}`);
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
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 ${
            selectedFile === node.relativePath ? 'bg-white/10 text-white font-medium' : 'text-white/60'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {isDir ? (
            <>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-white/35" /> : <ChevronRight className="w-4 h-4 text-white/35" />}
              <Folder className="w-4 h-4 text-blue-400 fill-blue-400/20" />
            </>
          ) : (
            <>
              <span className="w-4" /> {/* Indent matches Chevron width */}
              {node.name.endsWith('.json') ? (
                <FileCode className="w-4 h-4 text-amber-400" />
              ) : (
                <FileText className="w-4 h-4 text-emerald-400" />
              )}
            </>
          )}
          <span className="text-sm truncate">{node.name}</span>
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
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/20 italic min-h-[400px]">
          <Database className="w-12 h-12 mb-4 text-white/10" />
          <p>Select a file from the explorer tree to view its contents.</p>
        </div>
      );
    }

    if (fileLoading) {
      return (
        <div className="h-full flex items-center justify-center text-white/30 min-h-[400px]">
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
      } catch (e) {
        // Fallback to raw string
      }
    }

    return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              {isJson ? <FileCode className="w-4 h-4 text-amber-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
              <span>{selectedFile.split('/').pop()}</span>
            </h3>
            <p className="text-[10px] text-white/40 font-mono truncate max-w-lg">{selectedFile}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-black/30 border border-white/5 rounded-2xl p-6 font-mono text-xs text-white/80 leading-relaxed max-h-[60vh]">
          {isHtml ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] uppercase font-bold self-start w-fit">
                <Globe className="w-3 h-3" />
                <span>HTML Code Preview</span>
              </div>
              <pre className="whitespace-pre-wrap">{displayContent}</pre>
            </div>
          ) : (
            <pre className="whitespace-pre">{displayContent}</pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Sidebar Explorer */}
      <div className="lg:col-span-1 glass border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Folder Tree</span>
          </h2>
          <button
            onClick={() => fetchTree(true)}
            disabled={loading}
            className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-50"
            title="Refresh tree"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto space-y-1 pr-2 scrollbar-thin">
          {loading && !tree ? (
            <div className="flex items-center justify-center py-12 text-white/30">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : tree && tree.children && tree.children.length > 0 ? (
            tree.children.map(child => renderTree(child))
          ) : (
            <div className="text-center py-12 text-white/20 italic text-sm">
              No scraped files found.
            </div>
          )}
        </div>
      </div>

      {/* Content Viewer Pane */}
      <div className="lg:col-span-2 glass border border-white/10 rounded-3xl p-8 min-h-[500px] flex flex-col justify-between">
        {renderContentPane()}
      </div>
    </div>
  );
}
