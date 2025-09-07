// src/constants.ts

import { CounterDefinition, CounterType, PluginSettings } from './interfaces';

export const PLUGIN_ID = 'countcraft';
export const PLUGIN_NAME = 'CountCraft';

export const COUNTER_DEFINITIONS: CounterDefinition[] = [
    {
        type: CounterType.WORD_COUNT,
        name: 'Word Count',
        description: 'Counts the total number of words in the note',
        hasParameter: false
    },
    {
        type: CounterType.CHAR_COUNT_WITH_SPACES,
        name: 'Character Count (with spaces)',
        description: 'Counts all characters including spaces',
        hasParameter: false
    },
    {
        type: CounterType.CHAR_COUNT_WITHOUT_SPACES,
        name: 'Character Count (without spaces)',
        description: 'Counts characters excluding spaces and line breaks',
        hasParameter: false
    },
    {
        type: CounterType.LINE_COUNT,
        name: 'Line Count',
        description: 'Counts the total number of lines in the note',
        hasParameter: false
    },
    {
        type: CounterType.HEADING_COUNT,
        name: 'Heading Count (All Levels)',
        description: 'Counts all headings regardless of level',
        hasParameter: false
    },
    {
        type: CounterType.HEADING_LEVEL_COUNT,
        name: 'Heading Count (Specific Level)',
        description: 'Counts headings of a specific level',
        hasParameter: true,
        parameterName: 'Level',
        parameterType: 'number',
        parameterMin: 1,
        parameterMax: 6
    }
];

export const DEFAULT_SETTINGS: PluginSettings = {
    calculations: [],
    ribbonEnabled: false,
    autoCalculate: false,
    debugMode: false
};

export const PROPERTY_TYPE = 'number';

export const COMMAND_IDS = {
    CALCULATE: 'calculate-stats',
    OPEN_SETTINGS: 'open-settings'
};

export const ICONS = {
    RIBBON: 'calculator',
    SETTINGS: 'settings'
};

export const MESSAGES = {
    CALCULATION_COMPLETE: 'Calculation completed successfully!',
    NO_ACTIVE_FILE: 'No active file to calculate statistics for',
    PROPERTY_CREATED: 'Property created: ',
    DUPLICATE_CONFIG: 'A calculation with this configuration already exists',
    INVALID_PARAMETER: 'Invalid parameter value',
    CACHE_UPDATED: 'Statistics updated from cache'
};

export const REGEX_PATTERNS = {
    WORD: /\b\w+\b/g,
    HEADING: /^#+\s+(.+)$/gm,
    LINE_BREAK: /\r?\n/g,
    WHITESPACE: /\s+/g,
    NON_SPACE: /\S/g
};

export const DEFAULT_PROPERTY_NAMES = {
    [CounterType.WORD_COUNT]: 'word-count',
    [CounterType.CHAR_COUNT_WITH_SPACES]: 'char-count-with-spaces',
    [CounterType.CHAR_COUNT_WITHOUT_SPACES]: 'char-count-without-spaces',
    [CounterType.LINE_COUNT]: 'line-count',
    [CounterType.HEADING_COUNT]: 'heading-count',
    [CounterType.HEADING_LEVEL_COUNT]: 'heading-level-count'
};