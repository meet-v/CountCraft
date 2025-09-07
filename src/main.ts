// src/main.ts

import { App, Plugin, TFile, Notice, PluginManifest } from 'obsidian';
import { PluginSettings } from './interfaces';
import { DEFAULT_SETTINGS, COMMAND_IDS, ICONS, MESSAGES, PLUGIN_NAME } from './constants';
import { CountCraftSettingsTab } from './settings';
import { CountCraftCounter } from './counter';
import { DebugLogger, errorMessage } from './utils';

export default class CountCraftPlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS;
    counter: CountCraftCounter;
    private ribbonIconEl: HTMLElement | null = null;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.counter = new CountCraftCounter(app);
    }

    async onload() {
        await this.loadSettings();
        
        // Initialize debug logging
        DebugLogger.enable(this.settings.debugMode);
        DebugLogger.log('CountCraft plugin loading...');

        // Initialize counter
        this.counter = new CountCraftCounter(this.app);

        // Add settings tab
        this.addSettingTab(new CountCraftSettingsTab(this.app, this));

        // Add commands
        this.addCommands();

        // Add ribbon icon if enabled
        if (this.settings.ribbonEnabled) {
            this.ensureRibbonIcon();
        }

        // Register event listeners
        this.registerEventListeners();

        DebugLogger.log('CountCraft plugin loaded successfully');
        
        // Show welcome notice for first-time users
        if (this.settings.calculations.length === 0) {
            new Notice('CountCraft: Open settings to configure your first calculation!', 5000);
        }
    }

    async onunload() {
        DebugLogger.log('CountCraft plugin unloading...');
        this.removeRibbonIcon();
    }

    /**
     * Load plugin settings from disk
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Save plugin settings to disk
     */
    async saveSettings() {
        await this.saveData(this.settings);
        DebugLogger.log('Settings saved:', this.settings);
    }

    /**
     * Add plugin commands
     */
    private addCommands() {
        // Main calculation command
        this.addCommand({
            id: COMMAND_IDS.CALCULATE,
            name: 'Calculate Statistics for Current Note',
            callback: async () => {
                await this.runCalculationCommand();
            }
        });

        // Calculate all files command
        this.addCommand({
            id: 'calculate-all-files',
            name: 'Calculate Statistics for All Files',
            callback: async () => {
                await this.runBatchCalculationCommand();
            }
        });

        // Open settings command
        this.addCommand({
            id: COMMAND_IDS.OPEN_SETTINGS,
            name: 'Open CountCraft Settings',
            callback: () => {
                this.openSettings();
            }
        });

        // Preview stats command (doesn't update properties)
        this.addCommand({
            id: 'preview-stats',
            name: 'Preview Statistics (No Property Updates)',
            callback: async () => {
                await this.previewStatsCommand();
            }
        });
    }

    /**
     * Add ribbon icon
     */
    ensureRibbonIcon() {
        if (this.ribbonIconEl) {
            return; // Already exists
        }

        this.ribbonIconEl = this.addRibbonIcon(
            ICONS.RIBBON,
            'CountCraft: Calculate Statistics',
            async () => {
                await this.runCalculationCommand();
            }
        );

        DebugLogger.log('Ribbon icon added');
    }

    /**
     * Remove ribbon icon
     */
    removeRibbonIcon() {
        if (this.ribbonIconEl) {
            this.ribbonIconEl.remove();
            this.ribbonIconEl = null;
            DebugLogger.log('Ribbon icon removed');
        }
    }

    /**
     * Register event listeners
     */
    private registerEventListeners() {
        // Auto-calculation on file save (if enabled)
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.settings.autoCalculate && file instanceof TFile && file.extension === 'md') {
                    // Use a small delay to ensure file is fully saved
                    setTimeout(async () => {
                        try {
                            await this.counter.calculateFileStatsFromCache(file, this.settings.calculations);
                            DebugLogger.log(`Auto-calculated stats for: ${file.path}`);
                        } catch (error: unknown) {
                            const msg = errorMessage(error)
                            DebugLogger.error('Auto-calculation failed:', msg);
                        }
                    }, 500);
                }
            })
        );

        // Listen for metadata cache changes for optimization
        this.registerEvent(
            this.app.metadataCache.on('resolved', () => {
                DebugLogger.log('Metadata cache resolved');
            })
        );
    }

    /**
     * Run calculation command for active file
     */
    private async runCalculationCommand() {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice(MESSAGES.NO_ACTIVE_FILE);
            return;
        }

        if (!this.counter.isFileProcessable(activeFile)) {
            new Notice('Selected file cannot be processed (must be a markdown file)');
            return;
        }

        const enabledCalculations = this.settings.calculations.filter(calc => calc.enabled);
        if (enabledCalculations.length === 0) {
            new Notice('No calculations are enabled. Please configure calculations in settings.');
            this.openSettings();
            return;
        }

        try {
            const notice = new Notice('Calculating statistics...', 0);
            const results = await this.counter.calculateFileStats(activeFile, this.settings.calculations);
            notice.hide();
            
            if (Object.keys(results).length > 0) {
                const resultText = Object.entries(results)
                    .map(([prop, value]) => `${prop}: ${value}`)
                    .join(', ');
                
                new Notice(`${MESSAGES.CALCULATION_COMPLETE} ${resultText}`, 4000);
            } else {
                new Notice('No calculations were performed (all may be disabled)');
            }
            
        } catch (error: unknown) {
            const msg = errorMessage(error)
            new Notice(`Calculation failed: ${msg}`);
            DebugLogger.error('Calculation command failed:', msg);
        }
    }

    /**
     * Run batch calculation command for all files
     */
    private async runBatchCalculationCommand() {
        const enabledCalculations = this.settings.calculations.filter(calc => calc.enabled);
        if (enabledCalculations.length === 0) {
            new Notice('No calculations are enabled. Please configure calculations in settings.');
            this.openSettings();
            return;
        }

        const files = this.app.vault.getMarkdownFiles();
        if (files.length === 0) {
            new Notice('No markdown files found in vault');
            return;
        }

        const confirmMessage = `This will calculate statistics for ${files.length} files. This may take some time. Continue?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            await this.counter.calculateAllFiles(this.settings.calculations);
        } catch (error: unknown) {
            const msg = errorMessage(error)
            new Notice(`Batch calculation failed: ${msg}`);
            DebugLogger.error('Batch calculation failed:', msg);
        }
    }

    /**
     * Preview statistics without updating properties
     */
    private async previewStatsCommand() {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice(MESSAGES.NO_ACTIVE_FILE);
            return;
        }

        if (!this.counter.isFileProcessable(activeFile)) {
            new Notice('Selected file cannot be processed (must be a markdown file)');
            return;
        }

        try {
            const stats = await this.counter.getPreviewStats(activeFile);
            
            let message = `Statistics for ${activeFile.name}:\n`;
            message += `Words: ${stats.wordCount}\n`;
            message += `Characters (with spaces): ${stats.charCountWithSpaces}\n`;
            message += `Characters (without spaces): ${stats.charCountWithoutSpaces}\n`;
            message += `Lines: ${stats.lineCount}\n`;
            message += `Headings: ${stats.headingCount}`;
            
            if (Object.keys(stats.headingsByLevel).length > 0) {
                message += '\nHeadings by level:';
                Object.entries(stats.headingsByLevel).forEach(([level, count]) => {
                    message += `\n  Level ${level}: ${count}`;
                });
            }
            
            // Create a modal or notice with the stats
            new Notice(message, 8000);
            console.log('File Statistics Preview:', stats);
            
        } catch (error: unknown) {
            const msg = errorMessage(error)
            new Notice(`Preview failed: ${msg}`);
            DebugLogger.error('Preview command failed:', msg);
        }
    }

    /**
     * Open plugin settings
     */
    private openSettings() {
        const settingTab = (this.app as any).setting;
        if (settingTab) {
            settingTab.open();
            settingTab.openTabById(this.manifest.id);
        }
    }

    /**
     * Handle external settings changes
     */
    async onExternalSettingsChange() {
        await this.loadSettings();
        DebugLogger.enable(this.settings.debugMode);
        DebugLogger.log('External settings change detected');
    }

    /**
     * Get current plugin version
     */
    getVersion(): string {
        return this.manifest.version;
    }

    /**
     * Get plugin status information
     */
    getStatus(): {
        calculationsCount: number;
        enabledCount: number;
        ribbonEnabled: boolean;
        autoCalculateEnabled: boolean;
    } {
        return {
            calculationsCount: this.settings.calculations.length,
            enabledCount: this.settings.calculations.filter(calc => calc.enabled).length,
            ribbonEnabled: this.settings.ribbonEnabled,
            autoCalculateEnabled: this.settings.autoCalculate
        };
    }

    /**
     * Export settings for backup
     */
    exportSettings(): string {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from backup
     */
    async importSettings(settingsJson: string): Promise<boolean> {
        try {
            const importedSettings = JSON.parse(settingsJson);
            
            // Validate imported settings
            if (!this.validateImportedSettings(importedSettings)) {
                throw new Error('Invalid settings format');
            }
            
            this.settings = { ...DEFAULT_SETTINGS, ...importedSettings };
            await this.saveSettings();
            
            // Update UI elements
            if (this.settings.ribbonEnabled) {
                this.ensureRibbonIcon();
            } else {
                this.removeRibbonIcon();
            }
            
            DebugLogger.enable(this.settings.debugMode);
            new Notice('Settings imported successfully');
            
            return true;
            
        } catch (error: unknown) {
            const msg = errorMessage(error)
            new Notice(`Failed to import settings: ${msg}`);
            DebugLogger.error('Settings import failed:', msg);
            return false;
        }
    }

    /**
     * Validate imported settings structure
     */
    private validateImportedSettings(settings: any): boolean {
        if (typeof settings !== 'object' || settings === null) {
            return false;
        }

        // Check required fields exist and have correct types
        if (settings.calculations && !Array.isArray(settings.calculations)) {
            return false;
        }

        if (settings.ribbonEnabled !== undefined && typeof settings.ribbonEnabled !== 'boolean') {
            return false;
        }

        if (settings.autoCalculate !== undefined && typeof settings.autoCalculate !== 'boolean') {
            return false;
        }

        if (settings.debugMode !== undefined && typeof settings.debugMode !== 'boolean') {
            return false;
        }

        // Validate calculation configurations
        if (settings.calculations) {
            for (const calc of settings.calculations) {
                if (!calc.id || !calc.type || !calc.property || typeof calc.enabled !== 'boolean') {
                    return false;
                }
            }
        }

        return true;
    }
}