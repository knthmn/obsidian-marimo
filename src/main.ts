import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface MarimoSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MarimoSettings = {
  mySetting: "default",
};

export default class MarimoPlugin extends Plugin {
  settings!: MarimoSettings;

  override async onload() {
    await this.loadSettings();
    this.addSettingTab(new MarimoSettingTab(this.app, this));
  }

  override onunload() {}

  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...((await this.loadData()) as MarimoSettings),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MarimoSettingTab extends PluginSettingTab {
  plugin: MarimoPlugin;

  constructor(app: App, plugin: MarimoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
