import MarimoView, { MARIMO_VIEW } from "MarimoView";
import {
  App,
  FileSystemAdapter,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import path from "path";
import { spawn } from "child_process";

export interface MarimoSettings {
  launchPath: string;
  disablePycache: boolean;
}

const DEFAULT_SETTINGS: MarimoSettings = {
  launchPath: "default",
  disablePycache: true,
};

export default class MarimoPlugin extends Plugin {
  settings!: MarimoSettings;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  override async onload() {
    await this.loadSettings();
    this.addSettingTab(new MarimoSettingTab(this.app, this));

    this.registerView(
      MARIMO_VIEW,
      (leaf) => new MarimoView(leaf, this.settings),
    );
    this.registerExtensions(["py"], MARIMO_VIEW);
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
      .setName("Path to launch Marimo")
      .setDesc(
        "Path to the Marimo executable, absolute or relative to the vault root.",
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("./.venv/bin/marimo")
          .setValue(this.plugin.settings.launchPath)
          .onChange(async (value) => {
            this.plugin.settings.launchPath = value;
            await this.plugin.saveSettings();
          }),
      )
      .addButton((button) =>
        button.setButtonText("Test").onClick(() => {
          void testVersion(this.app, this.plugin.settings.launchPath);
        }),
      );
    new Setting(containerEl)
      .setName("Disable pycache")
      .setDesc(
        "Set PYTHONDONTWRITEBYTECODE environment variable to 1 to disable the generation of __pycache__ directory.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.disablePycache)
          .onChange(async (value) => {
            this.plugin.settings.disablePycache = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}

async function testVersion(app: App, launchPath: string) {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) {
    new Notice("Failed to get file system adapter");
    return;
  }
  const executablePath = path.resolve(adapter.getBasePath(), launchPath);
  try {
    const runningProcess = spawn(executablePath, ["--version"], {
      env: {
        ...process.env,
      },
    });
    const output = await new Promise<string>((resolve, reject) => {
      let message = "";

      runningProcess.stdout.on("data", (data: Buffer) => {
        message += data.toString();
      });
      runningProcess.stderr.on("data", (data: Buffer) => {
        message += data.toString();
      });
      runningProcess.on("error", (error) => {
        reject(error);
      });
      runningProcess.on("close", (code) => {
        if (code === 0) {
          resolve(message);
        } else {
          reject(Error(message));
        }
      });
    });
    new Notice(`Successfully detected Marimo with version: ${output}`);
  } catch (error) {
    new Notice(`Failed to detect Marimo. Message: ${(error as Error).message}`);
  }
}
