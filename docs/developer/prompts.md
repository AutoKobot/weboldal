# AI Prompt Library

This document stores the optimized prompts used for generating educational content and extracting data from PTT documents.

## 1. IKK Extraction Prompt
Used to transform raw PTT (Szakmai Képzési Program) PDF text into structured JSON subjects and modules.

**Location**: `ikkService.buildExtractionPrompt()`

### Key Instructions:
- **Theory/Practical Split**: Force separate modules if a topic has both components.
- **Student-Centric Titles**: Convert teacher-facing titles (e.g., "Objective") to student-facing (e.g., "Goals of welding").
- **Section Codes**: Preserve hierarchical codes (3.4.1.2).

---

## 2. Curriculum Content Prompt
Used to generate the actual reading material and practical tasks for each module.

**Location**: `ikkService.buildContentPrompt()`

### Design Principles:
- **Conciseness**: 4-5 sentences for theory.
- **No Meta-Language**: Avoid "The student will learn...", focus on the facts.
- **Practical Focus**: 3-5 step-by-step tasks for practical modules.
- **Tone**: Professional, encouraging, and clear.

---

## 3. Quiz Generation Prompt
(Planned/Current implementation in `ai-service.ts`)
Generates 5 multiple-choice questions based on module content.

---

## 4. Presentation Prompt
Used to generate structured JSON data for interactive HTML slides (Mermaid diagrams + bullet points).

---

## Usage for AI Assistant
When asked to refine or add new generation features, always refer back to these patterns to ensure consistency in the platform's "voice" and data structure.
