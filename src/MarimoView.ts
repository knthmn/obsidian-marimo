import { type ChildProcess, spawn } from "child_process";
import type { MarimoSettings } from "main";
import { quote } from "shell-quote";
import {
  FileSystemAdapter,
  FileView,
  Notice,
  type TFile,
  type WorkspaceLeaf,
} from "obsidian";
import path from "path";
import { Buffer } from "buffer";

export const MARIMO_VIEW = "marimo";

export default class MarimoView extends FileView {
  private process: ChildProcess | null = null;

  private timeout: NodeJS.Timeout | null = null;
  private initialized: boolean = false;
  private exited: boolean = false;

  constructor(
    leaf: WorkspaceLeaf,
    private settings: MarimoSettings,
  ) {
    super(leaf);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  override async onLoadFile(file: TFile) {
    const filePath = file.path;
    this.registerEvent(
      this.app.workspace.on("quit", () => {
        void this.onClose();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-close", () => {
        void this.onClose();
      }),
    );

    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice("Failed to get FileSystemAdapter");
      return;
    }
    const vaulRootDir = adapter.getBasePath();
    const fileExecutablePath = path.join(vaulRootDir, filePath);
    const executablePath = path.resolve(vaulRootDir, this.settings.launchPath);
    this.process = spawn(
      executablePath,
      ["edit", quote([fileExecutablePath]), "--headless", "--no-token"],
      {
        shell: true,
        detached: true,
        cwd: path.resolve(fileExecutablePath, ".."),
        env: {
          ...process.env,
          ...(this.settings.disablePycache
            ? { PYTHONDONTWRITEBYTECODE: "1" }
            : {}),
        },
      },
    );
    this.timeout = setTimeout(() => {
      if (this.initialized) return;
      new Notice(
        "Marimo is taking longer than expected to launch. Please check the console for details.",
      );
    }, 5000);
    this.process.stdout?.on("data", (data: Buffer) => {
      console.debug(`stdout from Marimo process: ${data.toString()}`);
      const regex = /➜ {2}URL: (https?:\/\/[^\s]+:\d+)/;
      const match = data.toString().match(regex);
      const url = match?.[1];
      if (!url) return;
      const containerEl = this.containerEl;
      containerEl.empty();
      containerEl.createEl("iframe", {
        attr: {
          src: url,
          style: "height: 100%; width: 100%;",
        },
      });
      this.initialized = true;
    });
    this.process.stderr?.on("data", (data: Buffer) => {
      new Notice(
        `An error occurred when launching Marimo, see the console for details.`,
      );
      console.error(`stderr from Marimo process: ${data.toString()}`);
    });
    this.process.on("close", (code) => {
      this.exited = true;
      if (code === 0) return;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const message = `Marimo process exited with code ${code}`;
      new Notice(message);
      console.error(message);
    });
  }

  protected override async onOpen() {}

  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async onClose() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (this.process) {
      const process = this.process;
      process.kill("SIGINT");
      process.stdin?.write("y\n");
      this.timeout = setTimeout(() => {
        if (this.exited) return;
        new Notice(
          "Marimo process did not stop. Killing it. There might be leftover processes.",
        );
        process.kill("SIGKILL");
      }, 1000);
    }
  }

  override getViewType(): string {
    return MARIMO_VIEW;
  }
}
