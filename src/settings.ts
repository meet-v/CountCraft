// src/settings.ts

import { App, Modal, PluginSettingTab, Setting, TextComponent, DropdownComponent, ToggleComponent, Notice } from 'obsidian';
import { CounterConfig, CounterType } from './interfaces';
import { COUNTER_DEFINITIONS, DEFAULT_PROPERTY_NAMES} from './constants';
import { ValidationHelper, DebugLogger, errorMessage} from './utils';
import CountCraftPlugin from './main';

class ConfirmModal extends Modal {
    constructor(app: App, private message: string, private onConfirm: () => void) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        // 1. Consistent Header using .setHeading()
        new Setting(contentEl)
            .setName('Confirm Action')
            .setHeading();

        // 2. Consistent Description (the message)
        new Setting(contentEl)
            .setDesc(this.message);

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Confirm')
                .setCta()
                .onClick(() => {
                    this.onConfirm();
                    this.close();
                }));
    }
}

class EditCalculationModal extends Modal {
  private plugin: CountCraftPlugin;
  private config: CounterConfig;
  private onSave: (updated: CounterConfig) => void;

  // local state
  private type: CounterType;
  private property: string;
  private enabled: boolean;
  private parameter: string | number | undefined;

  constructor(app: App, plugin: CountCraftPlugin, config: CounterConfig, onSave: (updated: CounterConfig) => void) {
    super(app);
    this.plugin = plugin;
    this.config = { ...config }; // clone
    this.onSave = onSave;

    this.type = this.config.type;
    this.property = this.config.property;
    this.enabled = this.config.enabled;
    this.parameter = this.config.parameter;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle('Edit calculation');

    // Type
    new Setting(contentEl)
      .setName('Counter type')
      .addDropdown((dd: DropdownComponent) => {
        COUNTER_DEFINITIONS.forEach((def) => {
            dd.addOption(def.type, def.name);
        });
        dd.setValue(this.type)
          .onChange((v) => {
            this.type = v as CounterType;
            // if type has parameter, ensure a default value
            const def = COUNTER_DEFINITIONS.find((d) => d.type === this.type);
            if (!def?.hasParameter) {
              this.parameter = undefined;
              paramMount.empty();
            } else {
              renderParam();
            }
          });
      });

    // Property
    new Setting(contentEl)
      .setName('Property name')
      .addText((t: TextComponent) =>
        t.setPlaceholder('Type the exact property name you want (e.g., word-count).')
          .setValue(this.property)
          .onChange((v) => {
            this.property = ValidationHelper.sanitizePropertyName(v);
            if (this.property !== v) t.setValue(this.property);
          })
      );

    // Enabled
    new Setting(contentEl)
      .setName('Enabled')
      .addToggle((tg: ToggleComponent) => tg.setValue(this.enabled).onChange((v) => (this.enabled = v)));

    // Parameter mount
    const paramMount = contentEl.createDiv({ cls: 'countcraft-edit-param' });
    const renderParam = () => {
      paramMount.empty();
      const def = COUNTER_DEFINITIONS.find((d) => d.type === this.type);
      if (!def?.hasParameter) return;

      const s = new Setting(paramMount).setName(def.parameterName || 'Parameter');
      if (def.parameterType === 'number') {
        const min = def.parameterMin ?? 1;
        const max = def.parameterMax ?? 6;
        const init = typeof this.parameter === 'number' ? Math.min(max, Math.max(min, this.parameter)) : min;
        this.parameter = init;
        s.addSlider((sl) =>
          sl.setLimits(min, max, 1)
            .setValue(init)
            .setDynamicTooltip()
            .onChange((val) => (this.parameter = val))
        );
      } else {
        s.addText((t) =>
          t.setValue(typeof this.parameter === 'string' ? this.parameter : '')
            .setPlaceholder('Enter value')
            .onChange((val) => (this.parameter = val))
        );
      }
    };
    // initial render for parameter if applicable
    renderParam();

    // Footer buttons
    const footer = contentEl.createDiv({ cls: 'modal-footer' });
    new Setting(footer)
      .addButton((b) =>
        b.setButtonText('Cancel').onClick(() => {
          this.close();
        })
      )
      .addButton((b) =>
        b.setButtonText('Save')
          .setCta()
          .onClick(() => {
            const updated: CounterConfig = {
              ...this.config,
              type: this.type,
              property: this.property.trim(),
              enabled: this.enabled,
              parameter: this.parameter,
            };

            const validation = ValidationHelper.validateCounterConfig(updated, this.plugin.settings.calculations);
            if (validation) {
              new Notice(validation);
              return;
            }

            this.onSave(updated);
            this.close();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class CountCraftSettingsTab extends PluginSettingTab {
    plugin: CountCraftPlugin;

    constructor(app: App, plugin: CountCraftPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Plugin header
        new Setting(containerEl)
            .setName('CountCraft Settings')
            .setDesc('Configure counting calculations and property mappings for your notes.')
            .setHeading();

        // General settings
        this.renderGeneralSettings(containerEl);

        // Calculations section
        this.renderCalculationsSection(containerEl);

        // Add new calculation section
        this.renderAddCalculationSection(containerEl);

        // Debug section
        this.renderDebugSection(containerEl);
    }

    private renderGeneralSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('General settings')
            .setDesc('Configure counting calculations and property mappings for your notes.')
            .setHeading();

        // Ribbon icon setting
        new Setting(containerEl)
            .setName('Show ribbon icon')
            .setDesc('Display a ribbon icon for quick access to calculations')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ribbonEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.ribbonEnabled = value;
                    await this.plugin.saveSettings();
                    
                    // Update ribbon icon visibility
                    if (value) {
                        this.plugin.ensureRibbonIcon();
                    } else {
                        this.plugin.removeRibbonIcon();
                    }
                })
            );

        // Auto calculate setting
        new Setting(containerEl)
            .setName('Auto calculate on file save')
            .setDesc('Automatically run calculations when a file is saved (experimental)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoCalculate)
                .onChange(async (value) => {
                    this.plugin.settings.autoCalculate = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    private renderCalculationsSection(containerEl: HTMLElement): void {
        const calculationsContainer = containerEl.createDiv();
        new Setting(calculationsContainer)
            .setName('Configured calculations')
            .setHeading();

        if (this.plugin.settings.calculations.length === 0) {
            calculationsContainer.createEl('p', { 
                text: 'No calculations configured. Add your first calculation below.',
                cls: 'setting-item-description'
            });
            return;
        }

        // Render existing calculations
        this.plugin.settings.calculations.forEach((config, index) => {
            this.renderCalculationItem(calculationsContainer, config, index);
        });
    }

    private renderCalculationItem(container: HTMLElement, config: CounterConfig, index: number): void {
        const settingItem = new Setting(container);
        
        // Get counter definition for display
        const counterDef = COUNTER_DEFINITIONS.find(def => def.type === config.type);
        const displayName = counterDef ? counterDef.name : config.type;
        
        // Build description
        let description = `Maps to property: ${config.property}`;
        if (config.parameter !== undefined) {
            description += ` (Parameter: ${config.parameter})`;
        }

        settingItem
            .setName(displayName)
            .setDesc(description)
            .addToggle(toggle => toggle
                .setValue(config.enabled)
                .onChange(async (value) => {
                    config.enabled = value;
                    await this.plugin.saveSettings();
                    DebugLogger.log(`${displayName} ${value ? 'enabled' : 'disabled'}`);
                })
            )
            .addButton(button => button
                .setButtonText('Edit')
                .setTooltip('Edit this calculation')
                .onClick(() => {
                    this.editCalculation(config, index);
                })
            )
            .addButton(button => button
                .setButtonText('Delete')
                .setTooltip('Remove this calculation')
                .setWarning()
                .onClick(() => {
                    new ConfirmModal(
                        this.app,
                        `Are you sure you want to delete the "${displayName}" calculation?`,
                        () => {
                            (async () => {
                                this.plugin.settings.calculations.splice(index, 1);
                                await this.plugin.saveSettings();
                                this.display(); // Refresh settings
                                new Notice(`Deleted calculation: ${displayName}`);
                            })();
                        }
                    ).open();
                })
            );
    }

    private renderAddCalculationSection(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Add new calculation')
            .setHeading();

        const formContainer = containerEl.createDiv({ cls: 'countcraft-add-form' });

        let selectedType: CounterType | null = null;
        let propertyName = '';
        let parameter: string | number | undefined = undefined;
        let propertyNameInput: TextComponent | null = null;
        let propertyNameTouched = false; // track if user has edited the field
        //let parameterContainer: HTMLElement | null = null;
        //let propertyNameSetting: TextComponent | null = null;

        // Mount for Parameter (scoped)
        const paramMount = formContainer.createDiv({ cls: 'countcraft-param-mount' });

        // Counter type dropdown
        new Setting(formContainer)
            .setName('Counter type')
            .setDesc('Select the type of calculation to perform')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Select a counter type...');
                
                COUNTER_DEFINITIONS.forEach(def => {
                    dropdown.addOption(def.type, def.name);
                });

                dropdown.onChange((value) => {
                    selectedType = value as CounterType || null;
                    
                    // Update property name suggestion
                    if (!propertyNameTouched && (!propertyName || propertyName.length === 0) && selectedType && DEFAULT_PROPERTY_NAMES[selectedType]) {
                        propertyName = DEFAULT_PROPERTY_NAMES[selectedType];
                        if (propertyNameInput) propertyNameInput.setValue(propertyName);
                    }
                    
                    // Rebuild the parameter UI inside its mount
                    renderAddParam();
                    
                    // Show/hide parameter input
/*                     this.updateParameterInput(selectedType, formContainer, (value) => {
                        parameter = value;
                    }); */
                });
            });

        // Property name input
        //const propertyNameSetting = new Setting(formContainer)
        new Setting(formContainer)
            .setName('Property name')
            .setDesc('Name of the property to store the calculation result')
            .addText(text => {
                    propertyNameInput = text;
                    text.setPlaceholder('Enter property name')
                        .onChange((value) => {
                            propertyNameTouched = true; // mark as user-edited
                            // Only trim, do not rewrite casing or spaces
                            const trimmed = ValidationHelper.sanitizePropertyName(value);
                            propertyName = trimmed;
                            if (trimmed !== value) {
                                text.setValue(trimmed);
                            }
                        });
                });

        // Property Renderer
        const renderAddParam = () => {
            paramMount.empty();
            if (!selectedType) {
                parameter = undefined;
                return;
            }
            const def = COUNTER_DEFINITIONS.find((d) => d.type === selectedType);
            if (!def?.hasParameter) {
                parameter = undefined;
                return;
            };

            const s = new Setting(paramMount).setName(def.parameterName || 'Parameter');
            if (def.parameterType === 'number') {
                const min = def.parameterMin ?? 1;
                const max = def.parameterMax ?? 6;
                const init = typeof parameter === 'number' ? Math.min(max, Math.max(min, parameter)) : min;
                parameter = init;
                s.addSlider((s1) =>
                    s1.setLimits(min,max,1)
                        .setValue(init)
                        .setDynamicTooltip()
                        .onChange((val) => (parameter = val))
                );
            } else {
                s.addText((t) => 
                    t.setPlaceholder('Enter parameter value').onChange((val) => (parameter = val))
                );
            }
        };

        // Add Calculation button
        new Setting(formContainer)
            .addButton(button => button
                .setButtonText('Add Calculation')
                .setCta()
                .onClick(async () => {
                    await this.addNewCalculation(selectedType, propertyName, parameter);
                })
            );

        // Help text
        formContainer.createEl('p', {
            text: 'Property names will be automatically sanitized and created as number type properties.',
            cls: 'setting-item-description'
        });
    }

    private updateParameterInput(
        selectedType: CounterType | null, 
        container: HTMLElement, 
        onParameterChange: (value: string | number | undefined) => void
    ): void {
        // Remove existing parameter input
        const existingParam = container.querySelector('.countcraft-parameter-setting');
        if (existingParam) {
            existingParam.remove();
        }

        if (!selectedType) return;

        const counterDef = COUNTER_DEFINITIONS.find(def => def.type === selectedType);
        if (!counterDef?.hasParameter) return;

        // Add parameter input
        const parameterSetting = new Setting(container);
        parameterSetting.settingEl.addClass('countcraft-parameter-setting');
        
        parameterSetting
            .setName(counterDef.parameterName || 'Parameter')
            .setDesc(`Required parameter for ${counterDef.name}`);

        if (counterDef.parameterType === 'number') {
            parameterSetting.addSlider(slider => slider
                .setLimits(counterDef.parameterMin || 1, counterDef.parameterMax || 6, 1)
                .setValue(counterDef.parameterMin || 1)
                .setDynamicTooltip()
                .onChange((value) => {
                    onParameterChange(value);
                })
            );
        } else {
            parameterSetting.addText(text => text
                .setPlaceholder('Enter parameter value')
                .onChange((value) => {
                    onParameterChange(value);
                })
            );
        }
    }

    private async addNewCalculation(
        selectedType: CounterType | null, 
        propertyName: string, 
        parameter: string | number | undefined
    ): Promise<void> {
        if (!selectedType) {
            new Notice('Please select a counter type');
            return;
        }

        if (!propertyName.trim()) {
            new Notice('Please enter a property name');
            return;
        }

        // Create new configuration
        const newConfig: CounterConfig = {
            id: ValidationHelper.generateCounterId(),
            name: COUNTER_DEFINITIONS.find(def => def.type === selectedType)?.name || selectedType,
            type: selectedType,
            property: propertyName.trim(),
            enabled: true,
            parameter: parameter
        };

        // Validate configuration
        const validation = ValidationHelper.validateCounterConfig(newConfig, this.plugin.settings.calculations);
        if (validation) {
            new Notice(validation);
            return;
        }

        // Add to settings
        this.plugin.settings.calculations.push(newConfig);
        await this.plugin.saveSettings();

        // Refresh display
        this.display();
        
        new Notice(`Added calculation: ${newConfig.name}`);
        DebugLogger.log('New calculation added:', newConfig);
    }

    private editCalculation(config: CounterConfig, index: number): void {
        new EditCalculationModal(this.app, this.plugin, config, (updated) => {
            // Persist updated config
            (async () => {
                this.plugin.settings.calculations[index] = updated;
                await this.plugin.saveSettings();
                this.display(); // refresh settings UI
                new Notice('Calculation updated');
            })();
        }).open();
    }

    private renderDebugSection(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Debug settings')
            .setHeading();

        new Setting(containerEl)
            .setName('Enable debug logging')
            .setDesc('Show detailed logs in the console for troubleshooting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    DebugLogger.enable(value);
                    await this.plugin.saveSettings();
                    
                    if (value) {
                        new Notice('Debug logging enabled - check console for details');
                    }
                })
            );

        // Test calculation button
        new Setting(containerEl)
            .setName('Test calculations')
            .setDesc('Run calculations on the current active file for testing')
            .addButton(button => button
                .setButtonText('Test Now')
                .onClick(async () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (!activeFile) {
                        new Notice('No active file to test with');
                        return;
                    }

                    try {
                        const results = await this.plugin.counter.calculateFileStats(
                            activeFile, 
                            this.plugin.settings.calculations
                        );
                        
                        const message = Object.keys(results).length > 0 
                            ? `Test completed! Updated ${Object.keys(results).length} properties.`
                            : 'Test completed, but no calculations were enabled.';
                        
                        new Notice(message);
                        
                    } catch (error: unknown) {
                        const msg = errorMessage(error)
                        new Notice(`Test failed: ${msg}`);
                        DebugLogger.error('Test calculation failed:', msg);
                    }
                })
            );
    }
}