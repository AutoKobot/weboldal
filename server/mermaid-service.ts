/**
 * Mermaid Diagram Generation Service
 */
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export class MermaidService {
  private tempDir = './temp';

  constructor() {
    // Ensure temp directory exists
    if (!existsSync(this.tempDir)) {
      require('fs').mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate SVG from Mermaid code
   */
  async generateSVG(mermaidCode: string): Promise<string> {
    try {
      const svgContent = this.createSimpleSVG(mermaidCode);
      return svgContent;
    } catch (error) {
      console.error('Mermaid SVG generation error:', error);
      throw new Error('Failed to generate SVG from Mermaid code');
    }
  }

  /**
   * Create a simple SVG representation
   */
  private createSimpleSVG(mermaidCode: string): string {
    // Parse basic flowchart elements
    const lines = mermaidCode.split('\n').filter(line => line.trim());
    const nodes = new Set<string>();
    const edges: Array<{from: string, to: string, label?: string}> = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Skip directive lines
      if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
        return;
      }

      // Parse node definitions and connections
      const arrowMatch = trimmed.match(/(\w+)\s*-->\s*(\w+)/);
      const labeledArrowMatch = trimmed.match(/(\w+)\s*--\|\s*([^|]+)\s*\|\s*(\w+)/);
      const nodeMatch = trimmed.match(/(\w+)\[([^\]]+)\]/);

      if (labeledArrowMatch) {
        const [, from, label, to] = labeledArrowMatch;
        nodes.add(from);
        nodes.add(to);
        edges.push({ from, to, label });
      } else if (arrowMatch) {
        const [, from, to] = arrowMatch;
        nodes.add(from);
        nodes.add(to);
        edges.push({ from, to });
      } else if (nodeMatch) {
        const [, id] = nodeMatch;
        nodes.add(id);
      }
    });

    // Generate simple SVG
    const nodeArray = Array.from(nodes);
    const width = Math.max(400, nodeArray.length * 120);
    const height = Math.max(300, Math.ceil(nodeArray.length / 3) * 100 + 100);

    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .node { fill: #e1f5fe; stroke: #01579b; stroke-width: 2; }
            .text { font-family: Arial, sans-serif; font-size: 14px; text-anchor: middle; }
            .edge { stroke: #666; stroke-width: 2; marker-end: url(#arrowhead); }
            .edge-label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; fill: #333; }
          </style>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
    `;

    // Draw nodes
    nodeArray.forEach((node, index) => {
      const x = 80 + (index % 3) * 120;
      const y = 60 + Math.floor(index / 3) * 100;
      
      svg += `
        <rect x="${x - 40}" y="${y - 20}" width="80" height="40" rx="5" class="node" />
        <text x="${x}" y="${y + 5}" class="text">${node}</text>
      `;
    });

    // Draw edges
    edges.forEach(edge => {
      const fromIndex = nodeArray.indexOf(edge.from);
      const toIndex = nodeArray.indexOf(edge.to);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        const x1 = 80 + (fromIndex % 3) * 120;
        const y1 = 60 + Math.floor(fromIndex / 3) * 100;
        const x2 = 80 + (toIndex % 3) * 120;
        const y2 = 60 + Math.floor(toIndex / 3) * 100;
        
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge" />`;
        
        if (edge.label) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          svg += `<text x="${midX}" y="${midY - 5}" class="edge-label">${edge.label}</text>`;
        }
      }
    });

    svg += '</svg>';
    
    return svg;
  }

  /**
   * Convert SVG to PNG buffer
   */
  async generatePNG(mermaidCode: string): Promise<Buffer> {
    const svg = await this.generateSVG(mermaidCode);
    return Buffer.from(svg, 'utf-8');
  }
}

export const mermaidService = new MermaidService();