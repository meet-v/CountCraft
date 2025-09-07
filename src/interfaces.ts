// src/interfaces.ts

export interface CounterConfig {
    id: string;
    name: string;
    type: CounterType;
    property: string;
    enabled: boolean;
    parameter?: string | number; // For heading level, etc.
}

export interface PluginSettings {
    calculations: CounterConfig[];
    ribbonEnabled: boolean;
    autoCalculate: boolean;
    debugMode: boolean;
}

export interface CountResult {
    [key: string]: number;
}

export interface HeadingInfo {
    level: number;
    heading: string;
    line: number;
}

export interface FileStats {
    wordCount: number;
    charCountWithSpaces: number;
    charCountWithoutSpaces: number;
    lineCount: number;
    headingCount: number;
    headingsByLevel: { [level: number]: number };
}

export enum CounterType {
    WORD_COUNT = 'wordCount',
    CHAR_COUNT_WITH_SPACES = 'charCountWithSpaces', 
    CHAR_COUNT_WITHOUT_SPACES = 'charCountWithoutSpaces',
    LINE_COUNT = 'lineCount',
    HEADING_COUNT = 'headingCount',
    HEADING_LEVEL_COUNT = 'headingLevelCount'
}

export interface CounterDefinition {
    type: CounterType;
    name: string;
    description: string;
    hasParameter: boolean;
    parameterName?: string;
    parameterType?: 'number' | 'string';
    parameterMin?: number;
    parameterMax?: number;
}