import { type ChildProcess, spawn } from "child_process";
import type { MarimoSettings } from "main";
import {
  FileSystemAdapter,
  FileView,
  type TFile,
  type WorkspaceLeaf,
} from "obsidian";
import path from "path";
import { Buffer } from "buffer";

export const MARIMO_VIEW = "marimo";

export default class MarimoView extends FileView {
  private process: ChildProcess | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private settings: MarimoSettings,
  ) {
    super(leaf);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  override async onLoadFile(file: TFile) {
    const filePath = file.path;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      return;
    }
    const vaulRootDir = adapter.getBasePath();
    const fileExecutablePath = path.join(vaulRootDir, filePath);
    const executablePath = path.resolve(vaulRootDir, this.settings.launchPath);
    this.process = spawn(
      executablePath,
      ["edit", fileExecutablePath, "--headless", "--no-token"],
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
    this.process.stdout?.on("data", (data: Buffer) => {
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
    });
    this.process.stderr?.on("data", (data: Buffer) => {
      console.error(`stderr: ${data.toString()}`);
    });
    this.process.on("close", (code) => {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`child process exited with code ${code ?? "null"}`);
    });
  }

  protected override async onOpen() {}

  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async onClose() {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  override getViewType(): string {
    return MARIMO_VIEW;
  }
}
