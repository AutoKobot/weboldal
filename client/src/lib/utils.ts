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
