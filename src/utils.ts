// src/utils.ts

import { App, TFile, CachedMetadata } from 'obsidian';
import { CounterConfig, HeadingInfo } from './interfaces';
//import { PROPERTY_TYPE } from './constants';

export class PropertyManager {
    constructor(private app: App) {}

    /**
     * Updates a file's property with a numeric value
     */
    async updateFileProperty(file: TFile, propertyName: string, value: number): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[propertyName] = value;
        });
    }
}

export class CacheHelper {
    constructor(private app: App) {}

    /**
     * Get file content excluding properties section (YAML)
     */

    async getFileBody(file: TFile): Promise<string> {
        const content = await this.app.vault.cachedRead(file);
        const cache = this.app.metadataCache.getFileCache(file);
        const fmPos = cache?.frontmatterPosition;

        if (!fmPos) return content;

        const lines = content.split(/\r?\n/);
        // Remove lines between start.line and end.line inclusive [1]
        const bodyLines = lines.slice(0,fmPos.start.line).concat(lines.slice(fmPos.end.line + 1));
        return bodyLines.join('\n');
    }

    /**
     * Gets file content efficiently using cache when possible
     */
/*     async getFileContent(file: TFile): Promise<string> {
        // Try to get cached content first for better performance
        const cache = this.app.metadataCache.getFileCache(file);
        
        if (cache?.sections) {
            // Use cached sections to reconstruct content if available
            return await this.app.vault.cachedRead(file);
        }
        
        // Fallback to direct read
        return await this.app.vault.read(file);
    } */

    /**
     * Gets cached metadata for a file
     */
    getCachedMetadata(file: TFile): CachedMetadata | null {
        return this.app.metadataCache.getFileCache(file);
    }

    /**
     * Checks if file has cached headings
     */
    getCachedHeadings(file: TFile) {
        const cache = this.getCachedMetadata(file);
        const fmEnd = cache?.frontmatterPosition?.end?.line ?? -1; // frontmatter end line [1]
        const headings = cache?.headings ?? [];
        return headings.filter(h => (h as any).position?.start?.line > fmEnd);
    }
}

export class ValidationHelper {
    /**
     * Validates counter configuration
     */
    static validateCounterConfig(config: CounterConfig, existingConfigs: CounterConfig[]): string | null {
        const prop = (config.property ?? '').trim();
        if (!config.property?.trim()) {
            return 'Property name is required';
        }

        // Check for duplicates
        const isDuplicate = existingConfigs.some(existing => 
            existing.id !== config.id &&
            existing.property === prop
        );

        if (isDuplicate) {
            return `Property name "${prop}" is already used by another calculation`;
        }

        if (!config.type) {
            return 'Counter type is required';
        }

        // Validate parameter if required
        if (config.parameter !== undefined) {
            if (config.type === 'headingLevelCount') {
                const level = Number(config.parameter);
                if (isNaN(level) || level < 1 || level > 6) {
                    return 'Heading level must be between 1 and 6';
                }
            }
        }

        return null;
    }

    /**
     * Generates unique ID for counter configuration
     */
    static generateCounterId(): string {
        return `counter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitizes and Preserve Property Name
     */
    static sanitizePropertyName(name: string): string {
        return name.trim()
    }
}

export class TextAnalyzer {
    /**
     * Counts words in text using regex
     */
    static countWords(text: string): number {
        const words = text.match(/\b\w+\b/g);
        return words ? words.length : 0;
    }

    /**
     * Counts characters including spaces
     */
    static countCharactersWithSpaces(text: string): number {
        return text.length;
    }

    /**
     * Counts characters excluding spaces and line breaks
     */
    static countCharactersWithoutSpaces(text: string): number {
        return text.replace(/\s/g, '').length;
    }

    /**
     * Counts lines in text
     */
    static countLines(text: string): number {
        if (!text) return 0;
        return text.split(/\r?\n/).length;
    }

    /**
     * Extracts headings from text
     */
    static extractHeadings(text: string) : HeadingInfo[] {
        const headings: HeadingInfo[] = [];
        const lines = text.split(/\r?\n/);
        
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                headings.push({
                    level: match[1].length,
                    heading: match[2].trim(),
                    line: index + 1
                });
            }
        });
        
        return headings;
    }

    /**
     * Counts headings by level
     */
    static countHeadingsByLevel(text: string): { [level: number]: number } {
        const headings = this.extractHeadings(text);
        const counts: { [level: number]: number } = {};
        
        headings.forEach(heading => {
            counts[heading.level] = (counts[heading.level] || 0) + 1;
        });
        
        return counts;
    }
}

export class DebugLogger {
    private static enabled = false;

    static enable(enabled: boolean) {
        this.enabled = enabled;
    }

    static log(message: string, data?: any) {
        if (this.enabled) {
            console.log(`[CountCraft] ${message}`, data || '');
        }
    }

    static warn(message: string, data?: any) {
        if (this.enabled) {
            console.warn(`[CountCraft] ${message}`, data || '');
        }
    }

    static error(message: string, error?: any) {
        if (this.enabled) {
            console.error(`[CountCraft] ${message}`, error || '');
        }
    }
}

/** Safely extracts a string message from unknown errors. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return typeof e === 'string' ? e : JSON.stringify(e);
  } catch {
    return String(e);
  }
}