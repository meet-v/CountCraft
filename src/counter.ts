// src/counter.ts

import { App, TFile, Notice, MarkdownRenderer, Plugin, HeadingCache } from 'obsidian';
import { CounterConfig, CounterType, FileStats, CountResult } from './interfaces';
import { PropertyManager, CacheHelper, TextAnalyzer, DebugLogger, errorMessage } from './utils';

export class CountCraftCounter {
    private propertyManager: PropertyManager;
    private cacheHelper: CacheHelper;
    private plugin: Plugin;

    constructor(private app: App, plugin: Plugin) {
        this.propertyManager = new PropertyManager(app);
        this.cacheHelper = new CacheHelper(app);
        this.plugin = plugin;
    }

    /**
     * Calculates statistics for a file based on enabled counter configurations
     */
    async calculateFileStats(file: TFile, counterConfigs: CounterConfig[]): Promise<CountResult> {
        DebugLogger.log(`Calculating stats for file: ${file.path}`);
        
        const enabledConfigs = counterConfigs.filter(config => config.enabled);
        if (enabledConfigs.length === 0) {
            DebugLogger.log('No enabled counter configurations found');
            return {};
        }

        try {
            // Get file content efficiently using cache
            const content = await this.cacheHelper.getFileBody(file);
            
            // Calculate base statistics
            const fileStats = await this.calculateBaseStats(content, file.path);
            
            // Process each enabled counter configuration
            const results: CountResult = {};
            
            for (const config of enabledConfigs) {
                try {
                    const value = this.getCountForType(config.type, fileStats, config.parameter);
                    
                    // Update file property
                    await this.propertyManager.updateFileProperty(file, config.property, value);
                    
                    results[config.property] = value;
                    
                    DebugLogger.log(`Updated ${config.property}: ${value}`);
                    
                } catch (error: unknown) {
                    const msg = errorMessage(error)
                    DebugLogger.error(`Error processing config ${config.id}:`, msg);
                    new Notice(`Error calculating ${config.name}: ${msg}`);
                }
            }

            DebugLogger.log('Calculation completed', results);
            return results;
            
        } catch (error: unknown) {
            const msg = errorMessage(error)
            DebugLogger.error('Error calculating file stats:', msg);
            new Notice(`Error calculating statistics: ${msg}`);
            throw new Error(msg);
        }
    }

    /**
     * Calculates base statistics for file content
     */
    private async calculateBaseStats(content: string, sourcePath: string): Promise<FileStats> {
        // Render markdown to get clean text for word and character counts
        const tempDiv = document.createElement('div');
        // Passing the plugin component so that it does not gets stored in a real component and gets garbage collected
        await MarkdownRenderer.render(this.app, content, tempDiv, sourcePath, this.plugin);
        const cleanText = tempDiv.innerText;

        // Use clean text for word and character counts
        const wordCount = TextAnalyzer.countWords(cleanText);
        const charCountWithSpaces = TextAnalyzer.countCharactersWithSpaces(cleanText);
        const charCountWithoutSpaces = TextAnalyzer.countCharactersWithoutSpaces(cleanText);

        // Use original content for line and heading counts
        const lineCount = TextAnalyzer.countLines(content);
        const headingsByLevel = TextAnalyzer.countHeadingsByLevel(content);
        const headingCount = Object.values(headingsByLevel).reduce((sum, count) => sum + count, 0);

        return {
            wordCount,
            charCountWithSpaces,
            charCountWithoutSpaces,
            lineCount,
            headingCount,
            headingsByLevel
        };
    }

    /**
     * Gets count value for specific counter type
     */
    private getCountForType(type: CounterType, stats: FileStats, parameter?: string | number): number {
        switch (type) {
            case CounterType.WORD_COUNT:
                return stats.wordCount;
                
            case CounterType.CHAR_COUNT_WITH_SPACES:
                return stats.charCountWithSpaces;
                
            case CounterType.CHAR_COUNT_WITHOUT_SPACES:
                return stats.charCountWithoutSpaces;
                
            case CounterType.LINE_COUNT:
                return stats.lineCount;
                
            case CounterType.HEADING_COUNT:
                return stats.headingCount;
                
            case CounterType.HEADING_LEVEL_COUNT: {
                if (parameter === undefined) {
                    throw new Error('Heading level parameter is required');
                }
                const level = Number(parameter);
                if (isNaN(level) || level < 1 || level > 6) {
                    throw new Error('Heading level must be between 1 and 6');
                }
                return stats.headingsByLevel[level] || 0;
            }
                
            default:
                throw new Error(`Unknown counter type: ${String(type)}`);
        }
    }

    /**
     * Calculates statistics for all files in vault (batch operation)
     */
    async calculateAllFiles(counterConfigs: CounterConfig[]): Promise<void> {
        const files = this.app.vault.getMarkdownFiles();
        const enabledConfigs = counterConfigs.filter(config => config.enabled);
        
        if (enabledConfigs.length === 0) {
            new Notice('No counter configurations are enabled');
            return;
        }

        let processed = 0;
        const total = files.length;

        new Notice(`Starting batch calculation for ${total} files...`);

        for (const file of files) {
            try {
                await this.calculateFileStats(file, counterConfigs);
                processed++;
                
                // Show progress for large batches
                if (total > 10 && processed % Math.ceil(total / 10) === 0) {
                    new Notice(`Progress: ${processed}/${total} files processed`);
                }
                
            } catch (error: unknown) {
                const msg = errorMessage(error)
                DebugLogger.error(`Error processing file ${file.path}:`, msg);
            }
        }

        new Notice(`Batch calculation completed: ${processed}/${total} files processed`);
    }

    /**
     * Calculates statistics using cached metadata where possible for better performance
     */
    async calculateFileStatsFromCache(file: TFile, counterConfigs: CounterConfig[]): Promise<CountResult> {
        const enabledConfigs = counterConfigs.filter(config => config.enabled);
        if (enabledConfigs.length === 0) {
            return {};
        }

        // Try to use cached data first
        const cachedMetadata = this.cacheHelper.getCachedMetadata(file);
        let cachedResults: Partial<FileStats> = {};

        if (cachedMetadata) {
            // Extract what we can from cache
            const cachedHeadings = this.cacheHelper.getCachedHeadings(file);
            
            if (cachedHeadings.length > 0) {
                const headingsByLevel: { [level: number]: number } = {};
                cachedHeadings.forEach((heading: HeadingCache) => {
                    headingsByLevel[heading.level] = (headingsByLevel[heading.level] || 0) + 1;
                });
                
                cachedResults.headingsByLevel = headingsByLevel;
                cachedResults.headingCount = Object.values(headingsByLevel).reduce((sum, count) => sum + count, 0);
            }
        }

        // For data not available in cache, read file content
        const needsContent = enabledConfigs.some(config => 
            config.type === CounterType.WORD_COUNT ||
            config.type === CounterType.CHAR_COUNT_WITH_SPACES ||
            config.type === CounterType.CHAR_COUNT_WITHOUT_SPACES ||
            config.type === CounterType.LINE_COUNT ||
            (config.type === CounterType.HEADING_COUNT && !cachedResults.headingCount) ||
            (config.type === CounterType.HEADING_LEVEL_COUNT && !cachedResults.headingsByLevel)
        );

        let fullStats: FileStats;

        if (needsContent) {
            const content = await this.cacheHelper.getFileBody(file);
            fullStats = await this.calculateBaseStats(content, file.path);
        } else {
            // Use cached data only
            fullStats = {
                wordCount: 0,
                charCountWithSpaces: 0,
                charCountWithoutSpaces: 0,
                lineCount: 0,
                headingCount: cachedResults.headingCount || 0,
                headingsByLevel: cachedResults.headingsByLevel || {}
            };
        }

        // Process configurations and update properties
        const results: CountResult = {};
        
        for (const config of enabledConfigs) {
            try {
                const value = this.getCountForType(config.type, fullStats, config.parameter);
                await this.propertyManager.updateFileProperty(file, config.property, value);
                results[config.property] = value;
            } catch (error: unknown) {
                const msg = errorMessage(error)
                DebugLogger.error(`Error processing cached config ${config.id}:`, msg);
            }
        }

        return results;
    }

    /**
     * Validates if file is suitable for processing
     */
    async isFileProcessable(file: TFile): Promise<boolean> {
        // Check if file is a markdown file
        if (file.extension !== 'md') {
            return false;
        }

        // Check if file exists and is readable
        if (!(await this.app.vault.adapter.exists(file.path))) {
            return false;
        }

        return true;
    }

    /**
     * Gets preview statistics without updating properties
     */
    async getPreviewStats(file: TFile): Promise<FileStats> {
        if (!(await this.isFileProcessable(file))) {
            throw new Error('File is not processable');
        }

        const content = await this.cacheHelper.getFileBody(file);
        return await this.calculateBaseStats(content, file.path);
    }
}