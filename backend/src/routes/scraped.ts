import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const DATA_DIR = path.resolve(__dirname, '..', '..', '.data');
const SCRAPED_ROOT = path.join(DATA_DIR, 'scraped');

interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  relativePath: string;
  children?: TreeNode[];
}

function buildTree(dirPath: string, relativeRoot = ''): TreeNode[] {
  const nodes: TreeNode[] = [];
  try {
    if (!fs.existsSync(dirPath)) return [];
    
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const itemRelativePath = relativeRoot ? `${relativeRoot}/${item.name}` : item.name;
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        nodes.push({
          name: item.name,
          type: 'directory',
          relativePath: itemRelativePath,
          children: buildTree(fullPath, itemRelativePath),
        });
      } else {
        nodes.push({
          name: item.name,
          type: 'file',
          relativePath: itemRelativePath,
        });
      }
    }
  } catch (e) {
    console.error(`Error building tree for ${dirPath}:`, e);
  }
  return nodes;
}

// GET /api/scraped/tree
router.get('/tree', (req, res) => {
  if (!fs.existsSync(SCRAPED_ROOT)) {
    return res.status(200).json({ name: 'scraped', type: 'directory', children: [] });
  }
  const children = buildTree(SCRAPED_ROOT);
  return res.status(200).json({
    name: 'scraped',
    type: 'directory',
    children,
  });
});

// GET /api/scraped/file?path=<relative_path>
router.get('/file', (req, res) => {
  const relativePath = req.query.path as string;
  if (!relativePath) {
    return res.status(400).json({ error: 'Path query parameter is required' });
  }

  // Resolve target path and perform strict validation against LFI
  const resolvedPath = path.resolve(SCRAPED_ROOT, relativePath);
  
  if (!resolvedPath.startsWith(path.resolve(SCRAPED_ROOT))) {
    return res.status(403).json({ error: 'Access denied: Path out of bounds' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    return res.status(400).json({ error: 'Target path is a directory' });
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return res.status(200).json({ content });
  } catch (e: any) {
    console.error(`Error reading file ${resolvedPath}:`, e);
    return res.status(500).json({ error: 'Failed to read file contents' });
  }
});

export default router;
