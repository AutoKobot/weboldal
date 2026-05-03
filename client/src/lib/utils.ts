import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTextFromMarkdown(markdown: string): string {
  if (!markdown) return "";

  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "");

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Remove headers (#)
  text = text.replace(/^#+\s+(.*)$/gm, "$1");

  // Remove bold/italic (* or _)
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");

  // Remove blockquotes
  text = text.replace(/^>\s+(.*)$/gm, "$1");

  // Remove list markers
  text = text.replace(/^[\*\-\+]\s+(.*)$/gm, "$1");
  text = text.replace(/^\d+\.\s+(.*)$/gm, "$1");

  // Remove horizontal rules
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // Collapse whitespace
  text = text.replace(/\n\s*\n/g, "\n\n");

  return text.trim();
}

/**
 * Bekezdés sorszámok (pl. 3.1.1, 3.4.12) összehasonlítása "natural sort" módon.
 */
export function compareSectionCodes(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // Tisztítás: szóközök eltávolítása, kisbetűsítés
  const partsA = a.trim().toLowerCase().split('.');
  const partsB = b.trim().toLowerCase().split('.');

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || "0";
    const partB = partsB[i] || "0";

    // Különválasztjuk a számot és a betű suffixet (pl. "1a" -> number: 1, suffix: "a")
    const matchA = partA.match(/^(\d+)(.*)$/);
    const matchB = partB.match(/^(\d+)(.*)$/);

    if (matchA && matchB) {
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);

      if (numA !== numB) return numA - numB;

      // Ha a számok egyeznek, a betűket hasonlítjuk össze (magyar locale-lel)
      const suffixA = matchA[2];
      const suffixB = matchB[2];
      if (suffixA !== suffixB) {
        return suffixA.localeCompare(suffixB, 'hu');
      }
    } else {
      // Ha nem számokkal kezdődik, sima szöveges összehasonlítás
      if (partA !== partB) return partA.localeCompare(partB, 'hu');
    }
  }
  return 0;
}
