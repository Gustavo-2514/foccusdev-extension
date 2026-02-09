import * as vscode from "vscode";
import { LocalDatabase } from "../database/db.js";
import { getDashboardHtml } from "./dashboard-view.js";

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

interface DashboardCache {
  html: string;
  expiresAt: number;
}

interface WebviewMessage {
  type?: string;
}

export class FoccusWebview implements vscode.WebviewViewProvider {
  private dashboardCache: DashboardCache | null = null;

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = { enableScripts: true };
    view.webview.html = this.getShellHtml();

    view.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (!message || message.type !== "loadDashboard") {
        return;
      }

      try {
        const html = this.getDashboardWithCache();
        await view.webview.postMessage({
          type: "dashboardLoaded",
          html,
        });
      } catch (error) {
        await view.webview.postMessage({
          type: "dashboardError",
          message: "Não foi possível carregar os dados do dashboard.",
        });
      }
    });
  }

  private getDashboardWithCache(): string {
    const now = Date.now();
    if (this.dashboardCache && this.dashboardCache.expiresAt > now) {
      return this.dashboardCache.html;
    }

    const db = LocalDatabase.get();
    const heartbeats = db.getAllHeartbeats();
    const dashboardHtml = getDashboardHtml(heartbeats);

    this.dashboardCache = {
      html: dashboardHtml,
      expiresAt: now + DASHBOARD_CACHE_TTL_MS,
    };

    return dashboardHtml;
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
          }

          .item-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
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

          .muted {
            margin: 0;
            color: #c9cfda;
            line-height: 1.4;
          }

          .external-link {
            color: #ffffff;
            font-weight: 700;
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
              <article class="card">
                <h2 class="card-title">Configurações</h2>
                <p class="muted">Use este espaço para exibir preferências e filtros do dashboard.</p>
              </article>
            </section>
            <section id="docs-page" class="page">
              <article class="card">
                <h2 class="card-title">Documentação</h2>
                <p class="muted">
                  Centralize aqui links e guias da extensão.
                  <a class="external-link" href="https://github.com/" target="_blank" rel="noreferrer">Abrir documentação</a>
                </p>
              </article>
            </section>
          </section>
        </main>
        <script>
          const vscode = acquireVsCodeApi();
          const navButtons = Array.from(document.querySelectorAll(".nav-button"));
          const pages = Array.from(document.querySelectorAll(".page"));
          const dashboardRoot = document.getElementById("dashboard-root");
          const dashboardLoading = document.getElementById("dashboard-loading");
          const dashboardError = document.getElementById("dashboard-error");
          let dashboardLoadingInProgress = false;

          const setActivePage = (pageId) => {
            pages.forEach((page) => {
              page.classList.toggle("is-active", page.id === pageId);
            });

            navButtons.forEach((button) => {
              button.classList.toggle("is-active", button.dataset.page === pageId);
            });
          };

          const showLoading = () => {
            dashboardLoading.classList.add("is-visible");
            dashboardError.classList.remove("is-visible");
          };

          const hideLoading = () => {
            dashboardLoading.classList.remove("is-visible");
          };

          const showError = (message) => {
            dashboardError.innerHTML = '<p class="loading-text">' + message + "</p>";
            dashboardError.classList.add("is-visible");
          };

          const loadDashboard = () => {
            if (dashboardLoadingInProgress) {
              return;
            }

            dashboardLoadingInProgress = true;
            showLoading();
            vscode.postMessage({ type: "loadDashboard" });
          };

          navButtons.forEach((button) => {
            button.addEventListener("click", () => {
              const pageId = button.dataset.page;
              if (!pageId) {
                return;
              }

              setActivePage(pageId);
              if (pageId === "dashboard-page") {
                loadDashboard();
              }
            });
          });

          window.addEventListener("message", (event) => {
            const message = event.data;

            if (message.type === "dashboardLoaded") {
              dashboardRoot.innerHTML = message.html;
              hideLoading();
              dashboardError.classList.remove("is-visible");
              dashboardLoadingInProgress = false;
            }

            if (message.type === "dashboardError") {
              hideLoading();
              showError(message.message || "Não foi possível carregar os dados do dashboard.");
              dashboardLoadingInProgress = false;
            }
          });

          loadDashboard();
        </script>
      </body>
    </html>`;
  }
}
