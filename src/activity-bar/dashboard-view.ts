import {
  DAY_LABELS,
  EFFECTIVE_HEARTBEAT_SECONDS_LIMIT,
  MINIMUM_DISPLAY_SECONDS,
  TRAILING_HEARTBEAT_SECONDS,
} from "../helpers/const.js";
import { DayInsight, Heartbeat, RankedItem, TimedHeartbeat } from "../types/types.js";

interface DashboardRenderOptions {
  dbMaxSizeMb?: number;
}

const DAY_IN_MS = 86_400_000;

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const toSafeLabel = (
  value: string | undefined | null,
  fallback: string,
): string => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : fallback;
};

const toFolderAndFile = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "Sem arquivo";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
};

const truncateMiddle = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const leftSize = Math.floor((maxLength - 3) / 2);
  const rightSize = maxLength - 3 - leftSize;
  return `${value.slice(0, leftSize)}...${value.slice(value.length - rightSize)}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < MINIMUM_DISPLAY_SECONDS) {
    return "0m";
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${restMinutes}m`;
};

const formatDate = (timestampMs: number): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestampMs));
};

const startOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date: Date, amount: number): Date => {
  const updated = new Date(date);
  updated.setDate(updated.getDate() + amount);
  return updated;
};

const startOfWeek = (date: Date): Date => {
  const dayStart = startOfDay(date);
  const weekDay = dayStart.getDay();
  const daysSinceMonday = weekDay === 0 ? 6 : weekDay - 1;
  return addDays(dayStart, -daysSinceMonday);
};

const calculateCoverageDays = (startMs: number, endMs: number): number => {
  const startDayMs = startOfDay(new Date(startMs)).getTime();
  const endDayMs = startOfDay(new Date(endMs)).getTime();

  if (endDayMs < startDayMs) {
    return 1;
  }

  return Math.floor((endDayMs - startDayMs) / DAY_IN_MS) + 1;
};

const buildTimedHeartbeats = (heartbeats: Heartbeat[]): TimedHeartbeat[] => {
  const ordered = [...heartbeats].sort((a, b) => a.timestamp - b.timestamp);

  return ordered
    .map((heartbeat, index) => {
      const next = ordered[index + 1];
      let durationSeconds = TRAILING_HEARTBEAT_SECONDS;

      if (next) {
        const delta = next.timestamp - heartbeat.timestamp;
        if (delta <= 0) {
          durationSeconds = 0;
        } else {
          durationSeconds = Math.min(delta, EFFECTIVE_HEARTBEAT_SECONDS_LIMIT);
        }
      }

      return {
        ...heartbeat,
        durationSeconds,
      };
    })
    .filter((heartbeat) => heartbeat.durationSeconds > 0);
};

const sumDurationInRange = (
  heartbeats: TimedHeartbeat[],
  startMs: number,
  endMs: number,
): number => {
  return heartbeats.reduce((total, heartbeat) => {
    const heartbeatMs = heartbeat.timestamp * 1000;
    if (heartbeatMs >= startMs && heartbeatMs < endMs) {
      return total + heartbeat.durationSeconds;
    }

    return total;
  }, 0);
};

const groupDurationBy = (
  heartbeats: TimedHeartbeat[],
  resolver: (heartbeat: TimedHeartbeat) => string,
): Map<string, number> => {
  return heartbeats.reduce((acc, heartbeat) => {
    const key = resolver(heartbeat);
    acc.set(key, (acc.get(key) ?? 0) + heartbeat.durationSeconds);
    return acc;
  }, new Map<string, number>());
};

const topRanked = (grouped: Map<string, number>, limit: number): RankedItem[] => {
  return [...grouped.entries()]
    .filter(([, seconds]) => seconds >= MINIMUM_DISPLAY_SECONDS)
    .map(([label, seconds]) => ({ label, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
};

const topOne = (grouped: Map<string, number>): RankedItem | null => {
  return topRanked(grouped, 1)[0] ?? null;
};

const filterByRange = (
  heartbeats: TimedHeartbeat[],
  startMs: number,
  endMs: number,
): TimedHeartbeat[] => {
  return heartbeats.filter((heartbeat) => {
    const heartbeatMs = heartbeat.timestamp * 1000;
    return heartbeatMs >= startMs && heartbeatMs < endMs;
  });
};

const renderMetric = (label: string, value: string): string => {
  return `
    <div class="metric">
      <p class="metric-label">${label}</p>
      <p class="metric-value">${value}</p>
    </div>
  `;
};

const renderRankList = (items: RankedItem[], emptyMessage: string): string => {
  if (items.length === 0) {
    return `
      <li class="list-item">
        <span class="item-name">${emptyMessage}</span>
        <span class="item-value">0m</span>
      </li>
    `;
  }

  return items
    .map((item, index) => {
      return `
        <li class="list-item">
          <span class="item-name">${index + 1}. ${escapeHtml(item.label)}</span>
          <span class="item-value">${formatDuration(item.seconds)}</span>
        </li>
      `;
    })
    .join("");
};

const renderProjectMetric = (
  label: string,
  metric: RankedItem | null,
  fallbackText: string,
  options?: { maxLength?: number; uppercase?: boolean },
): string => {
  const sourceLabel = metric?.label ?? fallbackText;
  const normalizedLabel = options?.uppercase ? sourceLabel.toUpperCase() : sourceLabel;
  const displayLabel = truncateMiddle(normalizedLabel, options?.maxLength ?? 40);
  const valueSeconds = metric?.seconds ?? 0;

  return `
    <div class="project-meta">
      <p class="meta-label">${label}</p>
      <div class="meta-line">
        <p class="meta-value" title="${escapeHtml(normalizedLabel)}">${escapeHtml(
          displayLabel,
        )}</p>
        <p class="meta-time">${formatDuration(valueSeconds)}</p>
      </div>
    </div>
  `;
};

const renderDayMetric = (
  label: string,
  metric: RankedItem | null,
  fallbackText: string,
  options?: { maxLength?: number; uppercase?: boolean },
): string => {
  const sourceLabel = metric?.label ?? fallbackText;
  const normalizedLabel = options?.uppercase ? sourceLabel.toUpperCase() : sourceLabel;
  const displayLabel = truncateMiddle(normalizedLabel, options?.maxLength ?? 26);
  const valueSeconds = metric?.seconds ?? 0;

  return `
    <div class="day-detail-row">
      <p class="day-detail-label">${label}</p>
      <p class="day-detail-value" title="${escapeHtml(normalizedLabel)}">${escapeHtml(
        displayLabel,
      )}</p>
      <p class="day-detail-time">${formatDuration(valueSeconds)}</p>
    </div>
  `;
};

const renderWeekDays = (days: DayInsight[]): string => {
  return days
    .map((day) => {
      return `
        <div class="day-card">
          <div class="day-header">
            <p class="day-name">${day.dayLabel}</p>
            <p class="day-value">${formatDuration(day.totalSeconds)}</p>
          </div>
          <div class="day-details">
            ${renderDayMetric("Linguagem", day.topLanguage, "Sem linguagem", {
              uppercase: true,
            })}
            ${renderDayMetric("Arquivo", day.topFile, "Sem arquivo", {
              maxLength: 24,
            })}
            ${renderDayMetric("Projeto", day.topProject, "Sem projeto", {
              maxLength: 24,
            })}
          </div>
        </div>
      `;
    })
    .join("");
};

const renderComparison = (
  currentWeekSeconds: number,
  lastWeekSeconds: number,
): string => {
  if (lastWeekSeconds === 0) {
    return "Sem histórico para comparação";
  }

  const percent = ((currentWeekSeconds - lastWeekSeconds) / lastWeekSeconds) * 100;
  const signal = percent >= 0 ? "+" : "";
  return `${signal}${percent.toFixed(1)}% vs semana atual`;
};

export const getDashboardHtml = (
  heartbeats: Heartbeat[],
  options: DashboardRenderOptions = {},
): string => {
  const timedHeartbeats = buildTimedHeartbeats(heartbeats);
  const orderedHeartbeats = [...heartbeats].sort((a, b) => a.timestamp - b.timestamp);
  const now = new Date();
  const nowMs = now.getTime() + 1000;

  const todayStart = startOfDay(now);
  const yesterdayStart = addDays(todayStart, -1);
  const tomorrowStart = addDays(todayStart, 1);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastWeekStart = addDays(weekStart, -7);

  const todaySeconds = sumDurationInRange(
    timedHeartbeats,
    todayStart.getTime(),
    tomorrowStart.getTime(),
  );
  const yesterdaySeconds = sumDurationInRange(
    timedHeartbeats,
    yesterdayStart.getTime(),
    todayStart.getTime(),
  );
  const weekSeconds = sumDurationInRange(
    timedHeartbeats,
    weekStart.getTime(),
    nowMs,
  );
  const monthSeconds = sumDurationInRange(
    timedHeartbeats,
    monthStart.getTime(),
    nowMs,
  );
  const lastWeekSeconds = sumDurationInRange(
    timedHeartbeats,
    lastWeekStart.getTime(),
    weekStart.getTime(),
  );

  const hasData = orderedHeartbeats.length > 0;
  const oldestTimestampMs = hasData ? orderedHeartbeats[0].timestamp * 1000 : null;
  const newestTimestampMs = hasData
    ? orderedHeartbeats[orderedHeartbeats.length - 1].timestamp * 1000
    : null;
  const allDataCoverageDays =
    hasData && oldestTimestampMs !== null
      ? calculateCoverageDays(oldestTimestampMs, now.getTime())
      : 1;
  const projectLookbackDays = Math.max(1, allDataCoverageDays);
  const projectLookbackStart = addDays(
    startOfDay(now),
    -(projectLookbackDays - 1),
  );

  const lastWeekDays = Array.from({ length: 7 }, (_, index) => {
    const dayStart = addDays(lastWeekStart, index);
    const dayEnd = addDays(dayStart, 1);
    return sumDurationInRange(timedHeartbeats, dayStart.getTime(), dayEnd.getTime());
  });

  const activeDaysLastWeek = lastWeekDays.filter((seconds) => seconds > 0).length;
  const avgLastWeekByActiveDay =
    activeDaysLastWeek > 0 ? Math.floor(lastWeekSeconds / activeDaysLastWeek) : 0;

  const monthHeartbeats = filterByRange(
    timedHeartbeats,
    monthStart.getTime(),
    nowMs,
  );
  const projectLookbackHeartbeats = filterByRange(
    timedHeartbeats,
    projectLookbackStart.getTime(),
    nowMs,
  );

  const topLanguages = topRanked(
    groupDurationBy(monthHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.language, "Sem linguagem").toUpperCase(),
    ),
    3,
  );
  const topProjects = topRanked(
    groupDurationBy(monthHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.project, "Sem projeto"),
    ),
    3,
  );
  const topAllTimeLanguages = topRanked(
    groupDurationBy(timedHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.language, "Sem linguagem").toUpperCase(),
    ),
    5,
  );
  const topProjectsLookback = topRanked(
    groupDurationBy(projectLookbackHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.project, "Sem projeto"),
    ),
    5,
  );
  const totalTrackedSeconds = timedHeartbeats.reduce((acc, heartbeat) => {
    return acc + heartbeat.durationSeconds;
  }, 0);
  const totalTrackedDays = new Set(
    timedHeartbeats.map((heartbeat) => {
      return startOfDay(new Date(heartbeat.timestamp * 1000)).getTime();
    }),
  ).size;
  const databasePeriodLabel =
    hasData && oldestTimestampMs !== null && newestTimestampMs !== null
      ? `${formatDate(oldestTimestampMs)} até ${formatDate(newestTimestampMs)}`
      : "Sem período registrado";
  const configuredDbLimitMb =
    typeof options.dbMaxSizeMb === "number" && Number.isFinite(options.dbMaxSizeMb)
      ? Math.round(options.dbMaxSizeMb)
      : null;
  const configuredDbLimitLabel =
    configuredDbLimitMb !== null
      ? `${configuredDbLimitMb} MB`
      : "limite configurado";

  const featuredProjectMetric = topOne(
    groupDurationBy(monthHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.project, "Sem projeto"),
    ),
  );
  const featuredProject = featuredProjectMetric?.label ?? "Sem projeto no mês";
  const featuredProjectSeconds = featuredProjectMetric?.seconds ?? 0;
  const featuredProjectHeartbeats = monthHeartbeats.filter((heartbeat) => {
    return toSafeLabel(heartbeat.project, "Sem projeto") === featuredProject;
  });

  const topBranch = topOne(
    groupDurationBy(featuredProjectHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.branch, "Sem branch"),
    ),
  );
  const topFile = topOne(
    groupDurationBy(featuredProjectHeartbeats, (heartbeat) =>
      toFolderAndFile(toSafeLabel(heartbeat.filePath, "Sem arquivo")),
    ),
  );
  const topLanguage = topOne(
    groupDurationBy(featuredProjectHeartbeats, (heartbeat) =>
      toSafeLabel(heartbeat.language, "Sem linguagem"),
    ),
  );

  const weekInsights: DayInsight[] = DAY_LABELS.map((dayLabel, index) => {
    const dayStart = addDays(weekStart, index);
    const dayEnd = addDays(dayStart, 1);
    const dayHeartbeats = filterByRange(
      timedHeartbeats,
      dayStart.getTime(),
      dayEnd.getTime(),
    );
    const totalSeconds = dayHeartbeats.reduce((acc, heartbeat) => {
      return acc + heartbeat.durationSeconds;
    }, 0);

    return {
      dayLabel,
      totalSeconds,
      topLanguage: topOne(
        groupDurationBy(dayHeartbeats, (heartbeat) =>
          toSafeLabel(heartbeat.language, "Sem linguagem"),
        ),
      ),
      topFile: topOne(
        groupDurationBy(dayHeartbeats, (heartbeat) =>
          toFolderAndFile(toSafeLabel(heartbeat.filePath, "Sem arquivo")),
        ),
      ),
      topProject: topOne(
        groupDurationBy(dayHeartbeats, (heartbeat) =>
          toSafeLabel(heartbeat.project, "Sem projeto"),
        ),
      ),
    };
  });

  return `
    <div class="dashboard-grid">
      <article class="card span-2">
        <h2 class="card-title">Métricas de codificação</h2>
        <div class="kpi-grid">
          ${renderMetric("Hoje", formatDuration(todaySeconds))}
          ${renderMetric("Ontem", formatDuration(yesterdaySeconds))}
          ${renderMetric("Semana", formatDuration(weekSeconds))}
          ${renderMetric("Mês", formatDuration(monthSeconds))}
        </div>
      </article>

      <article class="card">
        <h2 class="card-title">Métricas da semana passada</h2>
        <div class="details-grid">
          ${renderMetric("Tempo total", formatDuration(lastWeekSeconds))}
          ${renderMetric("Dias ativos", `${activeDaysLastWeek} dias`)}
          ${renderMetric(
            "Média por dia ativo",
            formatDuration(avgLastWeekByActiveDay),
          )}
          ${renderMetric(
            "Comparação",
            renderComparison(weekSeconds, lastWeekSeconds),
          )}
        </div>
      </article>

      <article class="card">
        <h2 class="card-title">Top 3 linguagens (mês)</h2>
        <ul class="list">
          ${renderRankList(topLanguages, "Sem linguagem registrada no mês")}
        </ul>
      </article>

      <article class="card">
        <h2 class="card-title">Projeto em que você mais codificou</h2>
        <div class="project-focus">
          <p class="project-name">${escapeHtml(featuredProject)}</p>
          <p class="project-duration">Tempo no mês: ${formatDuration(
            featuredProjectSeconds,
          )}</p>
          ${renderProjectMetric(
            "Branch (mais utilizada)",
            topBranch,
            "Sem branch",
          )}
          ${renderProjectMetric("Arquivo (mais utilizado)", topFile, "Sem arquivo", {
            maxLength: 36,
          })}
          ${renderProjectMetric(
            "Linguagem (mais utilizada)",
            topLanguage,
            "Sem linguagem",
            { uppercase: true },
          )}
        </div>
      </article>

      <article class="card">
        <h2 class="card-title">Top 3 projetos (mês)</h2>
        <ul class="list">
          ${renderRankList(topProjects, "Sem projeto registrado no mês")}
        </ul>
      </article>

      <article class="card span-2">
        <h2 class="card-title">Tempo por dia da semana</h2>
        <div class="week-grid">
          ${renderWeekDays(weekInsights)}
        </div>
      </article>

      <article class="card span-2">
        <h2 class="card-title">Métricas gerais do banco</h2>
        <p class="muted">Aviso: essas métricas tendem a mudar com base no tamanho limite do banco (${configuredDbLimitLabel}).</p>
        <div class="details-grid">
          ${renderMetric("Tempo total (banco)", formatDuration(totalTrackedSeconds))}
          ${renderMetric("Heartbeats salvos", `${heartbeats.length}`)}
          ${renderMetric("Dias com atividade", `${totalTrackedDays}`)}
          ${renderMetric("Janela de dados", `${allDataCoverageDays} dias`)}
        </div>
        <div class="details-grid details-grid-spaced">
          <div class="metric">
            <p class="metric-label">Top 5 linguagens (banco)</p>
            <ul class="list">
              ${renderRankList(topAllTimeLanguages, "Sem linguagem registrada no banco")}
            </ul>
          </div>
          <div class="metric">
            <p class="metric-label">Top 5 projetos (últimos ${projectLookbackDays} dias)</p>
            <ul class="list">
              ${renderRankList(
                topProjectsLookback,
                `Sem projetos registrados nos últimos ${projectLookbackDays} dias`,
              )}
            </ul>
          </div>
        </div>
        <p class="muted">Período analisado no banco: ${escapeHtml(databasePeriodLabel)}.</p>
      </article>
    </div>
  `;
};
