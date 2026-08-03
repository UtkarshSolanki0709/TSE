import React from 'react';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  if (!content) return null;

  // Normalize newlines and split into lines
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  
  let currentTable: string[][] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = (key: string) => {
    if (currentParagraph.length > 0) {
      blocks.push(
        <p key={`p-${key}`} className="mb-4 text-white/80 leading-relaxed text-sm md:text-base whitespace-pre-line">
          {renderInline(currentParagraph.join('\n'))}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushTable = (key: string) => {
    if (currentTable.length > 0) {
      // Parse table structure
      // A valid table needs at least header and values
      const hasDelimiter = currentTable.length > 1 && currentTable[1].every(cell => cell.trim().startsWith('-') || cell.trim() === '');
      const headerRow = hasDelimiter ? currentTable[0] : null;
      const bodyRows = hasDelimiter ? currentTable.slice(2) : currentTable;

      blocks.push(
        <div key={`table-${key}`} className="overflow-x-auto my-6 border border-white/10 rounded-2xl bg-white/5">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            {headerRow && (
              <thead>
                <tr className="border-b border-white/15 bg-white/5">
                  {headerRow.map((cell, idx) => (
                    <th key={`th-${idx}`} className="p-3 font-bold text-white uppercase tracking-wider">
                      {renderInline(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={`td-${cellIdx}`} className="p-3 text-white/70">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
    }
  };

  const flushList = (key: string) => {
    if (currentList.length > 0 && listType) {
      if (listType === 'ul') {
        blocks.push(
          <ul key={`ul-${key}`} className="list-disc pl-6 mb-4 space-y-2 text-white/80 text-sm md:text-base">
            {currentList.map((item, idx) => (
              <li key={`li-${idx}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${key}`} className="list-decimal pl-6 mb-4 space-y-2 text-white/80 text-sm md:text-base">
            {currentList.map((item, idx) => (
              <li key={`li-${idx}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const flushAll = (key: string) => {
    flushParagraph(key);
    flushTable(key);
    flushList(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll(`${i}`);
      continue;
    }

    // 1. Table parsing
    if (trimmed.startsWith('|')) {
      flushParagraph(`${i}`);
      flushList(`${i}`);
      
      const cells = line.split('|').slice(1, -1);
      currentTable.push(cells);
      continue;
    } else {
      flushTable(`${i}`);
    }

    // 2. Headers parsing
    if (trimmed.startsWith('#')) {
      flushAll(`${i}`);
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const textNode = renderInline(text);
        
        if (level === 1) {
          blocks.push(<h1 key={`h1-${i}`} className="text-2xl md:text-3xl font-black text-white mt-6 mb-4 tracking-tight">{textNode}</h1>);
        } else if (level === 2) {
          blocks.push(<h2 key={`h2-${i}`} className="text-xl md:text-2xl font-extrabold text-white mt-5 mb-3 tracking-tight">{textNode}</h2>);
        } else {
          blocks.push(<h3 key={`h3-${i}`} className="text-lg md:text-xl font-bold text-white mt-4 mb-2 tracking-tight">{textNode}</h3>);
        }
        continue;
      }
    }

    // 3. List parsing
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (ulMatch) {
      if (listType !== 'ul') {
        flushAll(`${i}`);
        listType = 'ul';
      }
      currentList.push(ulMatch[1]);
      continue;
    } else if (olMatch) {
      if (listType !== 'ol') {
        flushAll(`${i}`);
        listType = 'ol';
      }
      currentList.push(olMatch[2]);
      continue;
    } else {
      flushList(`${i}`);
    }

    // Default to paragraph text accumulator
    currentParagraph.push(line);
  }

  flushAll('final');

  return <div className="markdown-body text-left">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*)/g;
  const segments = text.split(regex);

  segments.forEach((seg, idx) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      parts.push(
        <strong key={idx} className="font-extrabold text-white/95">
          {seg.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(seg);
    }
  });

  return parts;
}
