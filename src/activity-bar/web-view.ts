import * as vscode from "vscode";
import { LocalDatabase } from "../database/db.js";
import { ActivityState } from "../activity-state.js";
import {
  DB_MAX_SIZE_DEFAULT_MB,
  DB_MAX_SIZE_MAX_MB,
  DB_MAX_SIZE_MIN_MB,
  DB_MAX_SIZE_SETTING_KEY,
} from "../helpers/const.js";
import { getDashboardHtml } from "./dashboard-view.js";

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

interface DashboardCache {
  html: string;
  expiresAt: number;
}

interface WebviewMessage {
  type?: string;
  maxSizeMb?: number | string;
}

export class FoccusWebview implements vscode.WebviewViewProvider {
  private dashboardCache: DashboardCache | null = null;
  private webviewView: vscode.WebviewView | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly state: ActivityState,
  ) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.webviewView = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.getShellHtml();
    view.onDidDispose(() => {
      if (this.webviewView === view) {
        this.webviewView = null;
      }
    });

    view.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (!message || !message.type) {
        return;
      }

      switch (message.type) {
        case "loadDashboard": {
          await this.handleLoadDashboard(view);
          break;
        }
        case "loadSettings": {
          await this.handleLoadSettings(view);
          break;
        }
        case "updateMaxDbSize": {
          await this.handleUpdateMaxDbSize(view, message);
          break;
        }
        case "deleteAllDatabaseData": {
          await this.handleDeleteAllDatabaseData(view);
          break;
        }
        default:
          break;
      }
    });
  }

  public async revealDashboard() {
    await vscode.commands.executeCommand("workbench.view.extension.foccusdev");
    await vscode.commands.executeCommand("foccusdevView.focus");

    if (this.webviewView) {
      await this.webviewView.webview.postMessage({
        type: "openDashboardPage",
      });
    }
  }

  private async handleLoadDashboard(view: vscode.WebviewView) {
    try {
      const html = this.getDashboardWithCache();
      await view.webview.postMessage({
        type: "dashboardLoaded",
        html,
      });
    } catch {
      await view.webview.postMessage({
        type: "dashboardError",
        message: "Não foi possível carregar os dados do dashboard.",
      });
    }
  }

  private async handleLoadSettings(view: vscode.WebviewView) {
    try {
      const payload = this.getSettingsPayload();
      await view.webview.postMessage({
        type: "settingsLoaded",
        ...payload,
      });
    } catch {
      await view.webview.postMessage({
        type: "settingsError",
        message: "Não foi possível carregar as configurações.",
      });
    }
  }

  private async handleUpdateMaxDbSize(
    view: vscode.WebviewView,
    message: WebviewMessage,
  ) {
    try {
      const requestedSize = Number(message.maxSizeMb);
      const maxSizeMb = this.clampMaxDbSizeMb(requestedSize);

      await this.context.globalState.update(DB_MAX_SIZE_SETTING_KEY, maxSizeMb);

      const db = LocalDatabase.get();
      db.setMaxDatabaseSizeMb(maxSizeMb);

      this.invalidateDashboardCache();
      await this.handleLoadSettings(view);

      await view.webview.postMessage({
        type: "settingsSaved",
        message: `Limite máximo atualizado para ${maxSizeMb} MB.`,
      });

      await view.webview.postMessage({
        type: "dashboardShouldReload",
      });
    } catch {
      await view.webview.postMessage({
        type: "settingsError",
        message: "Não foi possível atualizar o limite do banco.",
      });
    }
  }

  private async handleDeleteAllDatabaseData(view: vscode.WebviewView) {
    try {
      this.state.resetHeartbeatState();

      const db = LocalDatabase.get();
      db.clearAllHeartbeats();
      if (db.getHeartbeatCount() > 0) {
        db.clearAllHeartbeats();
      }

      if (db.getHeartbeatCount() > 0) {
        throw new Error("Database clear operation was not completed.");
      }

      this.invalidateDashboardCache();
      await this.handleLoadSettings(view);

      await view.webview.postMessage({
        type: "databaseCleared",
        message: "Todos os dados do banco foram apagados.",
      });

      await view.webview.postMessage({
        type: "dashboardShouldReload",
      });
    } catch {
      await view.webview.postMessage({
        type: "settingsError",
        message: "Não foi possível apagar os dados do banco.",
      });
    }
  }

  private getDashboardWithCache(): string {
    const now = Date.now();
    if (this.dashboardCache && this.dashboardCache.expiresAt > now) {
      return this.dashboardCache.html;
    }

    const db = LocalDatabase.get();
    const heartbeats = db.getAllHeartbeats();
    const maxSizeMb = this.getConfiguredMaxDbSizeMb();
    const dashboardHtml = getDashboardHtml(heartbeats, { dbMaxSizeMb: maxSizeMb });

    this.dashboardCache = {
      html: dashboardHtml,
      expiresAt: now + DASHBOARD_CACHE_TTL_MS,
    };

    return dashboardHtml;
  }

  private getSettingsPayload() {
    const db = LocalDatabase.get();
    const maxSizeMb = this.getConfiguredMaxDbSizeMb();

    db.setMaxDatabaseSizeMb(maxSizeMb);

    const dbSizeBytes = db.getDatabaseSizeBytes();
    const heartbeatCount = db.getHeartbeatCount();
    const hasStoredData = heartbeatCount > 0;

    return {
      dbSizeBytes,
      dbSizeFormatted: hasStoredData ? this.formatBytes(dbSizeBytes) : "0 MB",
      dbSizeMeta: hasStoredData
        ? `${heartbeatCount} heartbeats salvos`
        : `0 heartbeats salvos (arquivo base: ${this.formatBytes(dbSizeBytes)})`,
      heartbeatCount,
      maxSizeMb,
      minSizeMb: DB_MAX_SIZE_MIN_MB,
      maxSizeLimitMb: DB_MAX_SIZE_MAX_MB,
      defaultSizeMb: DB_MAX_SIZE_DEFAULT_MB,
    };
  }

  private getConfiguredMaxDbSizeMb(): number {
    const value = this.context.globalState.get<number>(
      DB_MAX_SIZE_SETTING_KEY,
      DB_MAX_SIZE_DEFAULT_MB,
    );

    return this.clampMaxDbSizeMb(value ?? DB_MAX_SIZE_DEFAULT_MB);
  }

  private clampMaxDbSizeMb(sizeMb: number): number {
    if (!Number.isFinite(sizeMb)) {
      return DB_MAX_SIZE_DEFAULT_MB;
    }

    const normalized = Math.round(sizeMb);
    return Math.min(DB_MAX_SIZE_MAX_MB, Math.max(DB_MAX_SIZE_MIN_MB, normalized));
  }

  private formatBytes(bytes: number): string {
    if (bytes <= 0) {
      return "0 MB";
    }

    const valueInMb = bytes / (1024 * 1024);
    if (valueInMb >= 10) {
      return `${valueInMb.toFixed(1)} MB`;
    }

    return `${valueInMb.toFixed(2)} MB`;
  }

  private invalidateDashboardCache() {
    this.dashboardCache = null;
  }

  private getShellHtml(): string {
    return `
    <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>FoccusDEV</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            font-family: var(--vscode-font-family);
            background: #1e232d;
            color: #ffffff;
          }

          .app {
            display: grid;
            grid-template-columns: 176px 1fr;
            min-height: 100vh;
          }

          .sidebar {
            border-right: 1px solid #3f4654;
            background: #262d38;
            padding: 16px 12px;
          }

          .title {
            margin: 0 0 16px;
            font-size: 1.18rem;
            line-height: 1.25;
            color: #ffffff;
          }

          .nav {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .nav-button {
            display: inline-flex;
            align-items: center;
            width: 100%;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #505a6c;
            font-size: 0.95rem;
            text-align: left;
            color: #ffffff;
            background: #323b4a;
            cursor: pointer;
            transition: background 120ms ease-in-out, border-color 120ms ease-in-out;
          }

          .nav-button:hover {
            background: #3a4557;
          }

          .nav-button.is-active {
            background: #4d5b74;
            border-color: #6b7c9c;
          }

          .content {
            padding: 14px;
            overflow: auto;
          }

          .page {
            display: none;
          }

          .page.is-active {
            display: block;
          }

          .card {
            background: #2b313d;
            border: 1px solid #3a414f;
            border-radius: 10px;
            padding: 14px;
          }

          .card-title {
            margin: 0 0 12px;
            color: #ffffff;
            font-size: 0.95rem;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          .kpi-grid,
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 0px 5px;
          }

          .details-grid-spaced {
            margin-top: 10px;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          }

          .metric {
            background: #353d4a;
            border: 1px solid #475264;
            border-radius: 8px;
            padding: 10px;
          }

          .metric-label {
            margin: 0 0 6px;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #c9cfda;
          }

          .metric-value {
            margin: 0;
            font-size: 0.97rem;
            font-weight: 700;
            color: #ffffff;
          }

          .dashboard-grid {
            display: grid;
            gap: 12px;
          }

          .span-2 {
            grid-column: span 2;
          }

          .list {
            margin: 0;
            padding: 0;
            list-style: none;
            display: grid;
            gap: 8px;
          }

          .list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: #353d4a;
            border: 1px solid #475264;
            border-radius: 8px;
            padding: 8px 10px;
            min-width: 0;
          }

          .item-name {
            flex: 1 1 auto;
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
            color: #ffffff;
          }

          .item-value {
            color: #ffffff;
            font-weight: 700;
            white-space: nowrap;
          }

          .project-focus {
            display: grid;
            gap: 10px;
          }

          .project-name {
            margin: 0;
            color: #ffffff;
            font-weight: 700;
            font-size: 1rem;
          }

          .project-duration {
            margin: 0;
            color: #c9cfda;
            font-size: 0.84rem;
          }

          .project-meta {
            background: #353d4a;
            border: 1px solid #475264;
            border-radius: 8px;
            padding: 8px 10px;
          }

          .meta-label {
            margin: 0 0 4px;
            color: #c9cfda;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .meta-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .meta-value {
            margin: 0;
            color: #ffffff;
            font-size: 0.92rem;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .meta-time {
            margin: 0;
            color: #ffffff;
            font-weight: 700;
            white-space: nowrap;
            font-size: 0.88rem;
          }

          .week-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
          }

          .day-card {
            background: #353d4a;
            border: 1px solid #475264;
            border-radius: 8px;
            padding: 9px;
          }

          .day-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
          }

          .day-name {
            margin: 0;
            color: #ffffff;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .day-value {
            margin: 0;
            color: #ffffff;
            font-weight: 700;
          }

          .day-details {
            display: grid;
            gap: 6px;
          }

          .day-detail-row {
            display: grid;
            grid-template-columns: 72px 1fr auto;
            align-items: center;
            gap: 8px;
          }

          .day-detail-label {
            margin: 0;
            color: #c9cfda;
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .day-detail-value {
            margin: 0;
            color: #ffffff;
            font-size: 0.8rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .day-detail-time {
            margin: 0;
            color: #ffffff;
            font-size: 0.8rem;
            font-weight: 700;
            white-space: nowrap;
          }

          .settings-grid {
            display: grid;
            gap: 12px;
          }

          .settings-size-value {
            margin: 0 0 6px;
            font-size: 1.42rem;
            font-weight: 700;
            color: #ffffff;
          }

          .settings-size-value.is-reset {
            animation: dbResetPulse 420ms ease-in-out;
          }

          .settings-size-meta {
            margin: 0;
            color: #c9cfda;
            font-size: 0.82rem;
          }

          .settings-range-row {
            display: grid;
            grid-template-columns: 1fr 76px 34px;
            gap: 8px;
            align-items: center;
            margin: 10px 0;
          }

          .settings-range {
            width: 100%;
          }

          .settings-number {
            width: 100%;
            background: #353d4a;
            border: 1px solid #4d5b74;
            color: #ffffff;
            border-radius: 6px;
            padding: 6px;
            font-size: 0.87rem;
          }

          .settings-unit {
            color: #c9cfda;
            font-size: 0.8rem;
          }

          .settings-limit-hint {
            margin: 8px 0 0;
            color: #c9cfda;
            font-size: 0.8rem;
          }

          .settings-save-button {
            width: auto;
            margin-top: 6px;
          }

          .danger-card {
            border-color: #684248;
            background: #33272a;
          }

          .warning-text {
            margin: 0 0 12px;
            color: #f3c8cd;
            line-height: 1.4;
          }

          .danger-button {
            border: 1px solid #9c4b58;
            background: #b03b4d;
            color: #ffffff;
            border-radius: 8px;
            padding: 10px 12px;
            cursor: pointer;
            font-weight: 600;
            transition: background 180ms ease, border-color 180ms ease, opacity 180ms ease;
          }

          .danger-button:hover {
            background: #be4a5d;
          }

          .danger-button.is-confirming {
            background: #d4364d;
            border-color: #e25a6e;
            animation: confirmPulse 1s ease-in-out infinite;
          }

          .danger-button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          @keyframes confirmPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }

          .settings-feedback {
            margin: 0;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid #475264;
            background: #2b313d;
            color: #c9cfda;
            display: none;
            font-size: 0.84rem;
          }

          .settings-feedback.is-visible {
            display: block;
          }

          .settings-feedback.is-success {
            border-color: #417654;
            color: #b7e2c6;
          }

          .settings-feedback.is-error {
            border-color: #8a4a54;
            color: #f5bec6;
          }

          .settings-feedback.is-info {
            border-color: #475264;
            color: #c9cfda;
          }

          .muted {
            margin: 0;
            color: #c9cfda;
            line-height: 1.4;
          }

          .external-link {
            color: #ffffff;
            font-weight: 700;
          }

          .docs-page.is-active {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 28px);
          }

          .docs-card {
            width: min(100%, 560px);
            text-align: center;
          }

          .docs-text {
            margin: 0;
            color: #c9cfda;
            line-height: 1.5;
          }

          .docs-action {
            margin-top: 14px;
            display: flex;
            justify-content: center;
          }

          .docs-button {
            width: auto;
            text-decoration: none;
            justify-content: center;
            min-width: 220px;
          }

          .loading-wrapper {
            display: none;
            align-items: center;
            gap: 10px;
            background: #2b313d;
            border: 1px solid #3a414f;
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 10px;
          }

          .loading-wrapper.is-visible {
            display: flex;
          }

          .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #4f5d75;
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
          }

          .loading-text {
            margin: 0;
            color: #c9cfda;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes dbResetPulse {
            0% {
              transform: scale(1);
              opacity: 0.75;
            }
            60% {
              transform: scale(1.03);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @media (max-width: 900px) {
            .app {
              grid-template-columns: 1fr;
            }

            .sidebar {
              border-right: 0;
              border-bottom: 1px solid #3f4654;
            }
          }

          @media (max-width: 720px) {
            .span-2 {
              grid-column: span 1;
            }

            .settings-range-row {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 420px) {
            .kpi-grid,
            .details-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <main class="app">
          <aside class="sidebar">
            <h1 class="title">FoccuDEV</h1>
            <nav class="nav" aria-label="Navegação principal">
              <button class="nav-button is-active" data-page="dashboard-page" type="button">Dashboard</button>
              <button class="nav-button" data-page="settings-page" type="button">Configurações</button>
              <button class="nav-button" data-page="docs-page" type="button">Documentação</button>
            </nav>
          </aside>
          <section class="content">
            <section id="dashboard-page" class="page is-active">
              <div id="dashboard-loading" class="loading-wrapper is-visible">
                <span class="loading-spinner" aria-hidden="true"></span>
                <p class="loading-text">Carregando métricas do dashboard...</p>
              </div>
              <div id="dashboard-error" class="loading-wrapper">
                <p class="loading-text">Não foi possível carregar os dados do dashboard.</p>
              </div>
              <div id="dashboard-root"></div>
            </section>

            <section id="settings-page" class="page">
              <div class="settings-grid">
                <article class="card">
                  <h2 class="card-title">Tamanho atual do banco</h2>
                  <p id="settings-db-size-value" class="settings-size-value">--</p>
                  <p id="settings-db-size-meta" class="settings-size-meta">--</p>
                  <p class="muted">Volume atual do banco local de heartbeats.</p>
                </article>

                <article class="card">
                  <h2 class="card-title">Limite máximo do banco</h2>
                  <p class="muted">Defina um limite entre 15 MB e 100 MB. Ao atingir o limite, os dados mais antigos serão removidos.</p>
                  <div class="settings-range-row">
                    <input id="settings-max-size-range" class="settings-range" type="range" min="15" max="100" value="20" />
                    <input id="settings-max-size-number" class="settings-number" type="number" min="15" max="100" value="20" />
                    <span class="settings-unit">MB</span>
                  </div>
                  <button id="settings-save-max-size" class="nav-button settings-save-button" type="button">Salvar limite</button>
                  <p id="settings-limit-hint" class="settings-limit-hint">Limite atual: 20 MB</p>
                </article>

                <article class="card danger-card">
                  <h2 class="card-title">Zona de risco</h2>
                  <p class="warning-text">Atenção: esta ação apaga todos os dados de codificação salvos localmente. Não é possível desfazer.</p>
                  <button id="settings-delete-db" class="danger-button" type="button">Apagar todos os dados</button>
                </article>

                <p id="settings-feedback" class="settings-feedback"></p>
              </div>
            </section>

            <section id="docs-page" class="page docs-page">
              <article class="card docs-card">
                <h2 class="card-title">Documentação</h2>
                <p class="docs-text">Para entender melhor como a extensão funciona ou contribuir com o projeto, acesse o repositório oficial no GitHub.</p>
                <div class="docs-action">
                  <a
                    class="nav-button docs-button"
                    href="https://github.com/Gustavo-2514/foccusdev-extension"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Acessar no GitHub
                  </a>
                </div>
              </article>
            </section>
          </section>
        </main>

        <script>
          const vscode = acquireVsCodeApi();
          const navButtons = Array.from(document.querySelectorAll(".nav-button[data-page]"));
          const pages = Array.from(document.querySelectorAll(".page"));

          const dashboardRoot = document.getElementById("dashboard-root");
          const dashboardLoading = document.getElementById("dashboard-loading");
          const dashboardError = document.getElementById("dashboard-error");

          const settingsDbSizeValue = document.getElementById("settings-db-size-value");
          const settingsDbSizeMeta = document.getElementById("settings-db-size-meta");
          const settingsMaxSizeRange = document.getElementById("settings-max-size-range");
          const settingsMaxSizeNumber = document.getElementById("settings-max-size-number");
          const settingsSaveMaxSize = document.getElementById("settings-save-max-size");
          const settingsDeleteDb = document.getElementById("settings-delete-db");
          const settingsLimitHint = document.getElementById("settings-limit-hint");
          const settingsFeedback = document.getElementById("settings-feedback");

          let dashboardLoadingInProgress = false;
          let dashboardNeedsReload = false;
          let settingsLoadingInProgress = false;

          const isDashboardActive = () => {
            const dashboardPage = document.getElementById("dashboard-page");
            return dashboardPage && dashboardPage.classList.contains("is-active");
          };

          const setActivePage = (pageId) => {
            pages.forEach((page) => {
              page.classList.toggle("is-active", page.id === pageId);
            });

            navButtons.forEach((button) => {
              button.classList.toggle("is-active", button.dataset.page === pageId);
            });
          };

          const showDashboardLoading = () => {
            dashboardLoading.classList.add("is-visible");
            dashboardError.classList.remove("is-visible");
          };

          const hideDashboardLoading = () => {
            dashboardLoading.classList.remove("is-visible");
          };

          const showDashboardError = (message) => {
            dashboardError.innerHTML = '<p class="loading-text">' + message + "</p>";
            dashboardError.classList.add("is-visible");
          };

          const setSettingsFeedback = (message, tone) => {
            if (!settingsFeedback) {
              return;
            }

            settingsFeedback.textContent = message;
            settingsFeedback.classList.remove("is-success", "is-error", "is-info");

            if (!message) {
              settingsFeedback.classList.remove("is-visible");
              return;
            }

            settingsFeedback.classList.add("is-visible");
            if (tone === "success") {
              settingsFeedback.classList.add("is-success");
            } else if (tone === "error") {
              settingsFeedback.classList.add("is-error");
            } else {
              settingsFeedback.classList.add("is-info");
            }
          };

          const setSettingsDbSummary = (sizeText, metaText) => {
            settingsDbSizeValue.textContent = sizeText;
            if (settingsDbSizeMeta) {
              settingsDbSizeMeta.textContent = metaText;
            }
          };

          const animateResetDbSize = () => {
            settingsDbSizeValue.classList.remove("is-reset");
            void settingsDbSizeValue.offsetWidth;
            settingsDbSizeValue.classList.add("is-reset");
          };

          const clamp = (value, min, max) => {
            if (!Number.isFinite(value)) {
              return min;
            }
            return Math.min(max, Math.max(min, Math.round(value)));
          };

          const syncSettingsMaxInputs = (value) => {
            const min = Number(settingsMaxSizeRange.min || "15");
            const max = Number(settingsMaxSizeRange.max || "100");
            const safeValue = clamp(Number(value), min, max);

            settingsMaxSizeRange.value = String(safeValue);
            settingsMaxSizeNumber.value = String(safeValue);
            settingsLimitHint.textContent = "Limite atual: " + safeValue + " MB";

            return safeValue;
          };

          const loadDashboard = () => {
            if (dashboardLoadingInProgress) {
              return;
            }

            dashboardLoadingInProgress = true;
            showDashboardLoading();
            vscode.postMessage({ type: "loadDashboard" });
          };

          const loadSettings = () => {
            if (settingsLoadingInProgress) {
              return;
            }

            settingsLoadingInProgress = true;
            setSettingsFeedback("Carregando configurações...", "info");
            vscode.postMessage({ type: "loadSettings" });
          };

          settingsMaxSizeRange.addEventListener("input", () => {
            syncSettingsMaxInputs(Number(settingsMaxSizeRange.value));
          });

          settingsMaxSizeNumber.addEventListener("input", () => {
            syncSettingsMaxInputs(Number(settingsMaxSizeNumber.value));
          });

          settingsSaveMaxSize.addEventListener("click", () => {
            const sizeMb = syncSettingsMaxInputs(Number(settingsMaxSizeNumber.value));
            setSettingsFeedback("Salvando limite...", "info");
            vscode.postMessage({ type: "updateMaxDbSize", maxSizeMb: sizeMb });
          });

          let deleteConfirmTimer = null;
          const deleteOriginalText = "Apagar todos os dados";
          const deleteConfirmText = "Tem certeza? Clique para confirmar";

          const resetDeleteButton = () => {
            if (deleteConfirmTimer) {
              clearTimeout(deleteConfirmTimer);
              deleteConfirmTimer = null;
            }
            settingsDeleteDb.classList.remove("is-confirming");
            settingsDeleteDb.textContent = deleteOriginalText;
          };

          settingsDeleteDb.addEventListener("click", () => {
            if (settingsDeleteDb.disabled) {
              return;
            }

            if (!settingsDeleteDb.classList.contains("is-confirming")) {
              settingsDeleteDb.classList.add("is-confirming");
              settingsDeleteDb.textContent = deleteConfirmText;

              deleteConfirmTimer = setTimeout(() => {
                resetDeleteButton();
              }, 5000);
              return;
            }

            resetDeleteButton();
            settingsDeleteDb.disabled = true;
            settingsDeleteDb.textContent = "Apagando...";
            setSettingsFeedback("Apagando dados...", "info");
            vscode.postMessage({ type: "deleteAllDatabaseData" });
          });

          navButtons.forEach((button) => {
            button.addEventListener("click", () => {
              const pageId = button.dataset.page;
              if (!pageId) {
                return;
              }

              setActivePage(pageId);

              if (pageId === "dashboard-page") {
                if (dashboardNeedsReload || dashboardRoot.innerHTML.trim().length === 0) {
                  loadDashboard();
                }
              }

              if (pageId === "settings-page") {
                loadSettings();
              }
            });
          });

          window.addEventListener("message", (event) => {
            const message = event.data;

            if (message.type === "dashboardLoaded") {
              dashboardRoot.innerHTML = message.html;
              hideDashboardLoading();
              dashboardError.classList.remove("is-visible");
              dashboardLoadingInProgress = false;
              dashboardNeedsReload = false;
            }

            if (message.type === "dashboardError") {
              hideDashboardLoading();
              showDashboardError(message.message || "Não foi possível carregar os dados do dashboard.");
              dashboardLoadingInProgress = false;
            }

            if (message.type === "settingsLoaded") {
              settingsLoadingInProgress = false;
              setSettingsDbSummary(
                message.dbSizeFormatted || "0 MB",
                message.dbSizeMeta || "0 heartbeats salvos",
              );

              const minSize = Number(message.minSizeMb || 15);
              const maxSize = Number(message.maxSizeLimitMb || 100);
              const defaultSize = Number(message.defaultSizeMb || minSize);

              settingsMaxSizeRange.min = String(minSize);
              settingsMaxSizeRange.max = String(maxSize);
              settingsMaxSizeNumber.min = String(minSize);
              settingsMaxSizeNumber.max = String(maxSize);

              syncSettingsMaxInputs(Number(message.maxSizeMb || defaultSize));
              setSettingsFeedback("", "info");
            }

            if (message.type === "settingsSaved") {
              setSettingsFeedback(message.message || "Configuração salva com sucesso.", "success");
            }

            if (message.type === "settingsError") {
              settingsLoadingInProgress = false;
              setSettingsFeedback(message.message || "Não foi possível processar a configuração.", "error");
              settingsDeleteDb.disabled = false;
              settingsDeleteDb.textContent = deleteOriginalText;
            }

            if (message.type === "databaseCleared") {
              setSettingsDbSummary("0 MB", "0 heartbeats salvos");
              animateResetDbSize();
              setSettingsFeedback(message.message || "✅ Dados apagados com sucesso.", "success");
              settingsDeleteDb.disabled = false;
              settingsDeleteDb.textContent = deleteOriginalText;
            }

            if (message.type === "dashboardShouldReload") {
              dashboardNeedsReload = true;
              if (isDashboardActive()) {
                loadDashboard();
              }
            }

            if (message.type === "openDashboardPage") {
              setActivePage("dashboard-page");
              if (dashboardNeedsReload || dashboardRoot.innerHTML.trim().length === 0) {
                loadDashboard();
              }
            }
          });

          loadDashboard();
        </script>
      </body>
    </html>`;
  }
}
