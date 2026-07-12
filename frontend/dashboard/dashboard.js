/* =========================================================
   AssetFlow — Dashboard Controller
   File: frontend/dashboard/dashboard.js

   Requires:
   - ../js/api.js
   - ../js/utils.js
   - ../js/auth.js
   - ../js/loader.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const DASHBOARD_CONFIG = Object.freeze({
  AUTO_REFRESH_INTERVAL: 120000,
  MAX_BOOKINGS: 5,
  MAX_ACTIVITIES: 6,

  ENDPOINTS: Object.freeze({
    KPIS: "/dashboard/kpis",
    UTILIZATION: "/reports/utilization",
    BOOKINGS: "/bookings",
    NOTIFICATIONS: "/notifications",
    ACTIVITY_LOGS: "/activity-logs"
  })
});

/* =========================================================
   STATE
   ========================================================= */

const dashboardState = {
  kpis: {},
  utilization: [],
  bookings: [],
  activities: [],
  notifications: [],

  loading: false,
  initialized: false,
  lastUpdated: null,
  abortController: null,
  autoRefreshTimer: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const dashboardElements = {};

function cacheDashboardElements() {
  dashboardElements.main =
    document.getElementById(
      "dashboardMain"
    );

  dashboardElements.refreshButton =
    document.querySelector(
      "[data-refresh-dashboard]"
    );

  dashboardElements.retryButton =
    document.querySelector(
      "[data-retry-dashboard]"
    );

  dashboardElements.quickActionButton =
    document.getElementById(
      "dashboardQuickActionButton"
    );

  dashboardElements.quickActionModal =
    document.getElementById(
      "dashboardQuickActionModal"
    );

  dashboardElements.periodSelect =
    document.getElementById(
      "utilizationPeriodSelect"
    );

  dashboardElements.errorAlert =
    document.getElementById(
      "dashboardErrorAlert"
    );

  dashboardElements.errorMessage =
    document.getElementById(
      "dashboardErrorMessage"
    );

  dashboardElements.utilizationChart =
    document.getElementById(
      "assetUtilizationChart"
    );

  dashboardElements.utilizationLegend =
    document.getElementById(
      "assetUtilizationLegend"
    );

  dashboardElements.healthList =
    document.getElementById(
      "assetHealthList"
    );

  dashboardElements.overdueTableBody =
    document.getElementById(
      "overdueReturnsTableBody"
    );

  dashboardElements.overdueEmptyState =
    document.getElementById(
      "overdueReturnsEmptyState"
    );

  dashboardElements.bookingsList =
    document.getElementById(
      "upcomingBookingsList"
    );

  dashboardElements.bookingsEmptyState =
    document.getElementById(
      "upcomingBookingsEmptyState"
    );

  dashboardElements.activityTimeline =
    document.getElementById(
      "recentActivityTimeline"
    );

  dashboardElements.activityEmptyState =
    document.getElementById(
      "recentActivityEmptyState"
    );
}

/* =========================================================
   SHARED HELPERS
   ========================================================= */

function escapeHTML(value = "") {
  if (
    window.AssetFlowUtils?.escapeHTML
  ) {
    return window.AssetFlowUtils.escapeHTML(
      value
    );
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  if (
    window.AssetFlowUtils?.formatNumber
  ) {
    return window.AssetFlowUtils.formatNumber(
      value
    );
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
}

function formatDate(value) {
  if (
    window.AssetFlowUtils?.formatDate
  ) {
    return window.AssetFlowUtils.formatDate(
      value
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function formatTime(value) {
  if (
    window.AssetFlowUtils?.formatTime
  ) {
    return window.AssetFlowUtils.formatTime(
      value
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }
  );
}

function formatRelativeTime(value) {
  if (
    window.AssetFlowUtils?.getRelativeTime
  ) {
    return window.AssetFlowUtils.getRelativeTime(
      value
    );
  }

  return formatDate(value);
}

function normalizeStatus(status = "") {
  if (
    window.AssetFlowUtils?.normalizeStatus
  ) {
    return window.AssetFlowUtils.normalizeStatus(
      status
    );
  }

  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
}

function statusLabel(status = "") {
  if (
    window.AssetFlowUtils?.getStatusLabel
  ) {
    return window.AssetFlowUtils.getStatusLabel(
      status
    );
  }

  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function statusClass(status = "") {
  if (
    window.AssetFlowUtils?.getStatusClass
  ) {
    return window.AssetFlowUtils.getStatusClass(
      status
    );
  }

  return "badge-neutral";
}

function getCSSVariable(
  variableName,
  fallback
) {
  const value = getComputedStyle(
    document.documentElement
  )
    .getPropertyValue(variableName)
    .trim();

  return value || fallback;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function firstDefined(
  object,
  keys,
  fallback = null
) {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null
    ) {
      return object[key];
    }
  }

  return fallback;
}

/* =========================================================
   CURRENT USER
   ========================================================= */

function getCurrentUser() {
  if (
    window.AssetFlowAuth
      ?.getCurrentUser
  ) {
    return window.AssetFlowAuth
      .getCurrentUser();
  }

  if (
    window.AssetFlowAPI
      ?.getCurrentUser
  ) {
    return window.AssetFlowAPI
      .getCurrentUser();
  }

  try {
    return JSON.parse(
      localStorage.getItem(
        "assetflow_user"
      )
    );
  } catch (error) {
    return null;
  }
}

function getFirstName(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)[0] || "User";
}

function updateDashboardGreeting() {
  const user = getCurrentUser();
  const firstName = getFirstName(
    user?.name
  );

  document
    .querySelectorAll(
      "[data-dashboard-user-name]"
    )
    .forEach((element) => {
      element.textContent =
        firstName;
    });

  const hour =
    new Date().getHours();

  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 17) {
    greeting = "Good afternoon";
  }

  const pageTitle =
    document.querySelector(
      ".page-title"
    );

  if (pageTitle) {
    pageTitle.innerHTML = `
      ${escapeHTML(greeting)},
      <span data-dashboard-user-name>
        ${escapeHTML(firstName)}
      </span>
    `;
  }
}

/* =========================================================
   API HELPERS
   ========================================================= */

function buildQueryString(parameters = {}) {
  const searchParameters =
    new URLSearchParams();

  Object.entries(parameters).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        searchParameters.set(
          key,
          String(value)
        );
      }
    }
  );

  const query =
    searchParameters.toString();

  return query ? `?${query}` : "";
}

function getStoredToken() {
  if (
    window.AssetFlowAPI?.getToken
  ) {
    return window.AssetFlowAPI.getToken();
  }

  return localStorage.getItem(
    "assetflow_token"
  );
}

async function parseFetchResponse(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const error = new Error(
      data?.message ||
      `Request failed with status ${response.status}.`
    );

    error.status = response.status;
    error.field = data?.field;
    error.data = data;

    throw error;
  }

  return data;
}

async function resolveApiResult(result) {
  const resolvedResult =
    await result;

  if (
    typeof Response !== "undefined" &&
    resolvedResult instanceof Response
  ) {
    return parseFetchResponse(
      resolvedResult
    );
  }

  return resolvedResult;
}

async function apiGet(
  endpoint,
  parameters = {},
  signal = undefined
) {
  const query =
    buildQueryString(parameters);

  const requestedEndpoint =
    `${endpoint}${query}`;

  if (
    window.AssetFlowAPI?.get
  ) {
    return resolveApiResult(
      window.AssetFlowAPI.get(
        requestedEndpoint,
        {
          signal
        }
      )
    );
  }

  if (
    window.AssetFlowAPI?.request
  ) {
    return resolveApiResult(
      window.AssetFlowAPI.request(
        requestedEndpoint,
        {
          method: "GET",
          signal
        }
      )
    );
  }

  const configuredBase =
    window.AssetFlowAPI?.config
      ?.BASE_URL ||
    window.AssetFlowAPI?.config
      ?.baseURL ||
    "http://localhost:5000/api/v1";

  const requestURL =
    `${String(configuredBase).replace(
      /\/$/,
      ""
    )}/${requestedEndpoint.replace(
      /^\//,
      ""
    )}`;

  const token = getStoredToken();

  const response = await fetch(
    requestURL,
    {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`
            }
          : {})
      }
    }
  );

  return parseFetchResponse(response);
}

/* =========================================================
   API RESPONSE NORMALIZATION
   ========================================================= */

function unwrapObject(response) {
  if (
    response?.data &&
    !Array.isArray(response.data)
  ) {
    return response.data;
  }

  if (
    response?.result &&
    !Array.isArray(response.result)
  ) {
    return response.result;
  }

  return response || {};
}

function unwrapCollection(
  response,
  possibleKeys = []
) {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }

    if (
      Array.isArray(
        response?.data?.[key]
      )
    ) {
      return response.data[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  return [];
}

/* =========================================================
   ENDPOINT LOADERS
   ========================================================= */

async function fetchDashboardKPIs(signal) {
  const api = window.AssetFlowAPI;

  if (
    api?.dashboard?.getKPIs
  ) {
    return resolveApiResult(
      api.dashboard.getKPIs({
        signal
      })
    );
  }

  if (
    api?.DashboardAPI?.getKPIs
  ) {
    return resolveApiResult(
      api.DashboardAPI.getKPIs({
        signal
      })
    );
  }

  return apiGet(
    DASHBOARD_CONFIG.ENDPOINTS.KPIS,
    {},
    signal
  );
}

async function fetchUtilization(
  period,
  signal
) {
  const api = window.AssetFlowAPI;

  if (
    api?.reports?.getUtilization
  ) {
    return resolveApiResult(
      api.reports.getUtilization(
        {
          days: period
        },
        {
          signal
        }
      )
    );
  }

  return apiGet(
    DASHBOARD_CONFIG.ENDPOINTS.UTILIZATION,
    {
      days: period
    },
    signal
  );
}

async function fetchBookings(signal) {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return apiGet(
    DASHBOARD_CONFIG.ENDPOINTS.BOOKINGS,
    {
      from_date: today,
      limit: DASHBOARD_CONFIG.MAX_BOOKINGS
    },
    signal
  );
}

async function fetchNotifications(signal) {
  return apiGet(
    DASHBOARD_CONFIG.ENDPOINTS.NOTIFICATIONS,
    {
      page: 1,
      limit: DASHBOARD_CONFIG.MAX_ACTIVITIES
    },
    signal
  );
}

async function fetchActivityLogs(signal) {
  return apiGet(
    DASHBOARD_CONFIG.ENDPOINTS.ACTIVITY_LOGS,
    {
      page: 1,
      limit: DASHBOARD_CONFIG.MAX_ACTIVITIES
    },
    signal
  );
}

/* =========================================================
   LOADING AND ERROR STATES
   ========================================================= */

function setDashboardLoading(loading) {
  dashboardState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "dashboard-refreshing",
    dashboardState.loading
  );

  if (
    dashboardElements.refreshButton
  ) {
    dashboardElements.refreshButton.disabled =
      dashboardState.loading;

    dashboardElements.refreshButton.setAttribute(
      "aria-busy",
      String(dashboardState.loading)
    );
  }
}

function showDashboardError(
  message
) {
  if (
    !dashboardElements.errorAlert
  ) {
    return;
  }

  dashboardElements.errorAlert.hidden =
    false;

  if (
    dashboardElements.errorMessage
  ) {
    dashboardElements.errorMessage.textContent =
      message;
  }
}

function hideDashboardError() {
  if (
    dashboardElements.errorAlert
  ) {
    dashboardElements.errorAlert.hidden =
      true;
  }
}

function showToast(
  message,
  type = "info",
  options = {}
) {
  window.AssetFlowUtils?.showToast?.(
    message,
    type,
    options
  );
}

/* =========================================================
   KPI RENDERING
   ========================================================= */

const KPI_KEYS = Object.freeze([
  "assets_available",
  "assets_allocated",
  "maintenance_today",
  "active_bookings",
  "pending_transfers",
  "upcoming_returns"
]);

function renderKPIs(kpis) {
  KPI_KEYS.forEach((key) => {
    document
      .querySelectorAll(
        `[data-kpi="${key}"]`
      )
      .forEach((element) => {
        element.textContent =
          formatNumber(
            toNumber(kpis[key])
          );

        element.classList.add(
          "dashboard-data-enter"
        );
      });
  });

  updateSidebarCounters(kpis);
}

function updateSidebarCounters(kpis) {
  updateCounterElements(
    "[data-transfer-count]",
    toNumber(
      kpis.pending_transfers
    )
  );

  updateCounterElements(
    "[data-maintenance-count]",
    toNumber(
      kpis.maintenance_today
    )
  );
}

function updateCounterElements(
  selector,
  value
) {
  document
    .querySelectorAll(selector)
    .forEach((element) => {
      element.textContent =
        value > 99
          ? "99+"
          : String(value);

      element.hidden = value <= 0;
    });
}

/* =========================================================
   UTILIZATION NORMALIZATION
   ========================================================= */

function normalizeUtilizationData(
  response,
  kpis = {}
) {
  const source =
    unwrapObject(response);

  const possibleCollections = [
    source.statuses,
    source.utilization,
    source.asset_statuses,
    source.breakdown,
    source.items,
    source.data
  ];

  const collection =
    possibleCollections.find(
      Array.isArray
    );

  if (collection) {
    return collection
      .map((item) => ({
        status:
          firstDefined(
            item,
            [
              "status",
              "label",
              "name",
              "category"
            ],
            "Other"
          ),

        value:
          toNumber(
            firstDefined(
              item,
              [
                "value",
                "count",
                "total",
                "assets"
              ],
              0
            )
          )
      }))
      .filter(
        (item) => item.value >= 0
      );
  }

  const directStatusValues = [
    {
      status: "Available",
      value:
        firstDefined(
          source,
          [
            "available",
            "assets_available"
          ],
          kpis.assets_available
        )
    },
    {
      status: "Allocated",
      value:
        firstDefined(
          source,
          [
            "allocated",
            "assets_allocated"
          ],
          kpis.assets_allocated
        )
    },
    {
      status: "Under Maintenance",
      value:
        firstDefined(
          source,
          [
            "under_maintenance",
            "maintenance",
            "assets_under_maintenance"
          ],
          kpis.maintenance_today
        )
    },
    {
      status: "Reserved",
      value:
        firstDefined(
          source,
          [
            "reserved",
            "assets_reserved"
          ],
          0
        )
    },
    {
      status: "Lost",
      value:
        firstDefined(
          source,
          [
            "lost",
            "assets_lost"
          ],
          0
        )
    },
    {
      status: "Retired",
      value:
        firstDefined(
          source,
          [
            "retired",
            "assets_retired"
          ],
          0
        )
    }
  ];

  return directStatusValues
    .map((item) => ({
      ...item,
      value: toNumber(item.value)
    }))
    .filter(
      (item) => item.value > 0
    );
}

/* =========================================================
   UTILIZATION COLORS
   ========================================================= */

function getUtilizationColor(status) {
  const normalized =
    normalizeStatus(status);

  const colors = {
    available: getCSSVariable(
      "--color-success",
      "#27ae60"
    ),

    allocated: getCSSVariable(
      "--color-info",
      "#3b82f6"
    ),

    reserved: getCSSVariable(
      "--color-primary",
      "#ff4f78"
    ),

    "under maintenance":
      getCSSVariable(
        "--color-warning",
        "#f2a93b"
      ),

    lost: getCSSVariable(
      "--color-danger",
      "#df3f4a"
    ),

    retired: getCSSVariable(
      "--color-neutral-500",
      "#7a7d85"
    ),

    disposed: getCSSVariable(
      "--color-neutral-400",
      "#999ca3"
    )
  };

  return (
    colors[normalized] ||
    getCSSVariable(
      "--color-primary",
      "#ff4f78"
    )
  );
}

/* =========================================================
   UTILIZATION CHART
   ========================================================= */

function renderUtilizationChart(data) {
  const chart =
    dashboardElements.utilizationChart;

  const legend =
    dashboardElements.utilizationLegend;

  if (!chart || !legend) {
    return;
  }

  const usableData = data.filter(
    (item) => item.value > 0
  );

  const total = usableData.reduce(
    (sum, item) =>
      sum + item.value,
    0
  );

  if (total <= 0) {
    chart.innerHTML = `
      <div class="state-container dashboard-compact-state">
        <div class="state-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M4 19V9"></path>
            <path d="M10 19V5"></path>
            <path d="M16 19v-7"></path>
            <path d="M22 19H2"></path>
          </svg>
        </div>

        <h3 class="state-title">
          No utilization data
        </h3>

        <p class="state-description">
          Asset status information will appear here.
        </p>
      </div>
    `;

    legend.innerHTML = "";

    return;
  }

  let currentDegree = 0;

  const gradientSegments =
    usableData.map((item) => {
      const startDegree =
        currentDegree;

      const segmentDegree =
        item.value / total * 360;

      const endDegree =
        startDegree + segmentDegree;

      currentDegree = endDegree;

      const color =
        getUtilizationColor(
          item.status
        );

      return (
        `${color} ` +
        `${startDegree.toFixed(2)}deg ` +
        `${endDegree.toFixed(2)}deg`
      );
    });

  const allocated =
    usableData
      .filter(
        (item) =>
          normalizeStatus(
            item.status
          ) === "allocated"
      )
      .reduce(
        (sum, item) =>
          sum + item.value,
        0
      );

  const utilizationPercentage =
    total > 0
      ? Math.round(
          allocated / total * 100
        )
      : 0;

  chart.innerHTML = `
    <div
      class="utilization-donut"
      style="
        background:
          conic-gradient(
            ${gradientSegments.join(",")}
          );
      "
    >
      <div class="utilization-donut-center">
        <span class="utilization-donut-value">
          ${formatNumber(total)}
        </span>

        <span class="utilization-donut-label">
          Total Assets
        </span>
      </div>
    </div>
  `;

  chart.setAttribute(
    "aria-label",
    `${utilizationPercentage}% of tracked assets are allocated.`
  );

  legend.innerHTML =
    usableData
      .map((item) => {
        const percentage =
          Math.round(
            item.value / total * 100
          );

        return `
          <div
            class="utilization-legend-item"
            style="
              --legend-color:
                ${getUtilizationColor(
                  item.status
                )};
            "
          >
            <span
              class="utilization-legend-dot"
              aria-hidden="true"
            ></span>

            <div class="utilization-legend-content">
              <span class="utilization-legend-label">
                ${escapeHTML(
                  statusLabel(item.status)
                )}
              </span>

              <span class="utilization-legend-value">
                ${formatNumber(item.value)}
                ·
                ${percentage}%
              </span>
            </div>
          </div>
        `;
      })
      .join("");
}

/* =========================================================
   ASSET HEALTH LIST
   ========================================================= */

function getHealthIcon(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "available") {
    return `
      <path d="m5 12 4 4L19 6"></path>
      <circle cx="12" cy="12" r="9"></circle>
    `;
  }

  if (normalized === "allocated") {
    return `
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M3 21v-2a6 6 0 0 1 6-6"></path>
      <path d="M16 11h6"></path>
    `;
  }

  if (
    normalized ===
    "under maintenance"
  ) {
    return `
      <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.3 7.3"></path>
      <path d="m5 19 4-4"></path>
    `;
  }

  if (
    normalized === "lost" ||
    normalized === "disposed"
  ) {
    return `
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 8v4"></path>
      <path d="M12 16h.01"></path>
    `;
  }

  return `
    <path d="M21 16V8"></path>
    <path d="m3.5 7 8.5 5 8.5-5"></path>
    <path d="M12 22V12"></path>
    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
  `;
}

function renderAssetHealth(data) {
  const container =
    dashboardElements.healthList;

  if (!container) {
    return;
  }

  const usableData = data.filter(
    (item) => item.value > 0
  );

  const total = usableData.reduce(
    (sum, item) =>
      sum + item.value,
    0
  );

  if (total <= 0) {
    container.innerHTML = `
      <div class="state-container dashboard-compact-state">
        <h3 class="state-title">
          No asset health data
        </h3>

        <p class="state-description">
          Asset lifecycle data will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    usableData
      .slice(0, 5)
      .map((item) => {
        const percentage =
          Math.round(
            item.value / total * 100
          );

        const color =
          getUtilizationColor(
            item.status
          );

        return `
          <div
            class="asset-health-item dashboard-data-enter"
            style="
              --health-color: ${color};
              --health-progress: ${percentage}%;
            "
          >
            <div
              class="asset-health-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                ${getHealthIcon(item.status)}
              </svg>
            </div>

            <div class="asset-health-content">
              <div class="asset-health-header">
                <span class="asset-health-label">
                  ${escapeHTML(
                    statusLabel(item.status)
                  )}
                </span>

                <span class="asset-health-value">
                  ${formatNumber(item.value)}
                </span>
              </div>

              <div
                class="asset-health-progress"
                role="progressbar"
                aria-valuenow="${percentage}"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="asset-health-progress-bar"
                ></div>
              </div>

              <div class="asset-health-meta">
                <span>
                  ${percentage}% of assets
                </span>

                <span>
                  ${formatNumber(item.value)}
                  records
                </span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
}

/* =========================================================
   OVERDUE RETURNS
   ========================================================= */

function calculateOverdueDays(
  expectedDate
) {
  const expected =
    new Date(expectedDate);

  if (
    Number.isNaN(
      expected.getTime()
    )
  ) {
    return 0;
  }

  expected.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor(
      (today - expected) /
      (1000 * 60 * 60 * 24)
    )
  );
}

function renderOverdueReturns(
  overdueReturns
) {
  const tableBody =
    dashboardElements.overdueTableBody;

  const emptyState =
    dashboardElements.overdueEmptyState;

  if (!tableBody || !emptyState) {
    return;
  }

  const records =
    Array.isArray(overdueReturns)
      ? overdueReturns
      : [];

  document
    .querySelectorAll(
      "[data-overdue-count]"
    )
    .forEach((badge) => {
      badge.textContent =
        `${records.length} overdue`;
    });

  if (records.length === 0) {
    tableBody.innerHTML = "";
    tableBody.closest(
      ".table-container"
    ).hidden = true;

    emptyState.hidden = false;

    return;
  }

  tableBody.closest(
    ".table-container"
  ).hidden = false;

  emptyState.hidden = true;

  tableBody.innerHTML =
    records
      .map((record) => {
        const assetId =
          firstDefined(
            record,
            [
              "asset_id",
              "id"
            ],
            ""
          );

        const assetTag =
          firstDefined(
            record,
            [
              "asset_tag",
              "tag"
            ],
            "Unidentified asset"
          );

        const assetName =
          firstDefined(
            record,
            [
              "asset_name",
              "name",
              "asset.name"
            ],
            assetTag
          );

        const employee =
          firstDefined(
            record,
            [
              "employee",
              "employee_name",
              "holder_name",
              "user_name"
            ],
            "Unassigned"
          );

        const department =
          firstDefined(
            record,
            [
              "department",
              "department_name"
            ],
            "—"
          );

        const expectedReturn =
          firstDefined(
            record,
            [
              "expected_return_date",
              "return_date"
            ]
          );

        const overdueDays =
          toNumber(
            firstDefined(
              record,
              [
                "overdue_days",
                "days_overdue"
              ],
              calculateOverdueDays(
                expectedReturn
              )
            )
          );

        return `
          <tr class="dashboard-data-enter">
            <td>
              <div class="overdue-asset">
                <div
                  class="overdue-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div>
                  <div class="table-primary">
                    ${escapeHTML(assetName)}
                  </div>

                  <div class="table-secondary">
                    ${escapeHTML(assetTag)}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="table-primary">
                ${escapeHTML(
                  typeof employee === "object"
                    ? employee.name
                    : employee
                )}
              </div>
            </td>

            <td>
              <span class="table-secondary">
                ${escapeHTML(
                  typeof department === "object"
                    ? department.name
                    : department
                )}
              </span>
            </td>

            <td>
              <span class="table-primary">
                ${formatDate(expectedReturn)}
              </span>
            </td>

            <td>
              <span class="overdue-days">
                ${overdueDays}
                ${overdueDays === 1
                  ? "day"
                  : "days"}
              </span>
            </td>

            <td class="text-right">
              <a
                class="btn btn-outline btn-sm"
                href="../asset-registration/index.html?asset_id=${encodeURIComponent(
                  assetId
                )}"
              >
                View Asset
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   UPCOMING BOOKINGS
   ========================================================= */

function normalizeBookings(response) {
  const bookings =
    unwrapCollection(
      response,
      [
        "bookings",
        "reservations"
      ]
    );

  const now = new Date();

  return bookings
    .filter((booking) => {
      const status =
        normalizeStatus(
          booking.status
        );

      const start =
        new Date(
          firstDefined(
            booking,
            [
              "start_time",
              "start"
            ]
          )
        );

      return (
        status !== "cancelled" &&
        status !== "completed" &&
        (
          Number.isNaN(
            start.getTime()
          ) ||
          start >= now
        )
      );
    })
    .sort((first, second) => {
      const firstStart =
        new Date(
          firstDefined(
            first,
            [
              "start_time",
              "start"
            ],
            0
          )
        );

      const secondStart =
        new Date(
          firstDefined(
            second,
            [
              "start_time",
              "start"
            ],
            0
          )
        );

      return firstStart - secondStart;
    })
    .slice(
      0,
      DASHBOARD_CONFIG.MAX_BOOKINGS
    );
}

function getBookingResourceName(
  booking
) {
  return firstDefined(
    booking,
    [
      "resource_name",
      "resource_asset_name",
      "asset_name"
    ],
    booking.resource_asset?.name ||
    booking.asset?.name ||
    "Shared Resource"
  );
}

function renderUpcomingBookings(
  bookings
) {
  const list =
    dashboardElements.bookingsList;

  const emptyState =
    dashboardElements.bookingsEmptyState;

  if (!list || !emptyState) {
    return;
  }

  if (bookings.length === 0) {
    list.innerHTML = "";
    list.hidden = true;
    emptyState.hidden = false;

    return;
  }

  list.hidden = false;
  emptyState.hidden = true;

  list.innerHTML =
    bookings
      .map((booking) => {
        const startValue =
          firstDefined(
            booking,
            [
              "start_time",
              "start"
            ]
          );

        const endValue =
          firstDefined(
            booking,
            [
              "end_time",
              "end"
            ]
          );

        const startDate =
          new Date(startValue);

        const day =
          Number.isNaN(
            startDate.getTime()
          )
            ? "—"
            : startDate
                .getDate()
                .toString()
                .padStart(2, "0");

        const month =
          Number.isNaN(
            startDate.getTime()
          )
            ? ""
            : startDate
                .toLocaleDateString(
                  "en-IN",
                  {
                    month: "short"
                  }
                )
                .toUpperCase();

        const status =
          booking.status ||
          "Upcoming";

        const bookedBy =
          firstDefined(
            booking,
            [
              "booked_by_name",
              "user_name",
              "employee_name"
            ],
            booking.booked_by?.name ||
            "AssetFlow User"
          );

        return `
          <div class="dashboard-booking-item dashboard-data-enter">
            <div
              class="dashboard-booking-date"
              aria-hidden="true"
            >
              <span class="dashboard-booking-day">
                ${escapeHTML(day)}
              </span>

              <span class="dashboard-booking-month">
                ${escapeHTML(month)}
              </span>
            </div>

            <div class="dashboard-booking-content">
              <div class="dashboard-booking-title">
                ${escapeHTML(
                  getBookingResourceName(
                    booking
                  )
                )}
              </div>

              <div class="dashboard-booking-meta">
                <span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    ></circle>

                    <path d="M12 7v5l3 2"></path>
                  </svg>

                  ${formatTime(startValue)}
                  –
                  ${formatTime(endValue)}
                </span>

                <span>
                  ${escapeHTML(bookedBy)}
                </span>
              </div>
            </div>

            <div class="dashboard-booking-status">
              <span
                class="badge badge-dot ${statusClass(
                  status
                )}"
              >
                ${escapeHTML(
                  statusLabel(status)
                )}
              </span>
            </div>
          </div>
        `;
      })
      .join("");
}

/* =========================================================
   ACTIVITY AND NOTIFICATION NORMALIZATION
   ========================================================= */

function humanizeAction(action = "") {
  return String(action)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function buildActivityMessage(item) {
  if (item.message) {
    return item.message;
  }

  const action =
    humanizeAction(
      item.action ||
      item.type ||
      "Activity"
    );

  const userName =
    firstDefined(
      item,
      [
        "user_name",
        "actor_name",
        "employee_name"
      ],
      item.user?.name ||
      "A user"
    );

  const entity =
    firstDefined(
      item,
      [
        "entity_name",
        "asset_name",
        "resource_name"
      ],
      ""
    );

  return entity
    ? `${userName} performed ${action.toLowerCase()} on ${entity}.`
    : `${userName} performed ${action.toLowerCase()}.`;
}

function getActivityTime(item) {
  return firstDefined(
    item,
    [
      "timestamp",
      "created_at",
      "updated_at"
    ],
    new Date().toISOString()
  );
}

function getActivityColor(item) {
  const value =
    normalizeStatus(
      item.action ||
      item.type ||
      ""
    );

  if (
    value.includes("maintenance")
  ) {
    return getCSSVariable(
      "--color-warning",
      "#f2a93b"
    );
  }

  if (
    value.includes("booking")
  ) {
    return getCSSVariable(
      "--color-info",
      "#3b82f6"
    );
  }

  if (
    value.includes("audit")
  ) {
    return getCSSVariable(
      "--color-purple",
      "#8b4de8"
    );
  }

  if (
    value.includes("return") ||
    value.includes("resolved")
  ) {
    return getCSSVariable(
      "--color-success",
      "#27ae60"
    );
  }

  if (
    value.includes("reject") ||
    value.includes("overdue") ||
    value.includes("lost")
  ) {
    return getCSSVariable(
      "--color-danger",
      "#df3f4a"
    );
  }

  return getCSSVariable(
    "--color-primary",
    "#ff4f78"
  );
}

function getActivityIcon(item) {
  const value =
    normalizeStatus(
      item.action ||
      item.type ||
      ""
    );

  if (
    value.includes("booking")
  ) {
    return `
      <rect x="3" y="5" width="18" height="16" rx="2"></rect>
      <path d="M16 3v4"></path>
      <path d="M8 3v4"></path>
      <path d="M3 10h18"></path>
    `;
  }

  if (
    value.includes("maintenance")
  ) {
    return `
      <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.3 7.3"></path>
      <path d="m5 19 4-4"></path>
    `;
  }

  if (
    value.includes("transfer") ||
    value.includes("allocate")
  ) {
    return `
      <path d="M17 3h4v4"></path>
      <path d="m21 3-7 7"></path>
      <path d="M7 21H3v-4"></path>
      <path d="m3 21 7-7"></path>
    `;
  }

  if (
    value.includes("audit")
  ) {
    return `
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>
      <path d="m9 14 2 2 5-5"></path>
    `;
  }

  return `
    <path d="M21 16V8"></path>
    <path d="m3.5 7 8.5 5 8.5-5"></path>
    <path d="M12 22V12"></path>
    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
  `;
}

function renderRecentActivity(
  activities
) {
  const timeline =
    dashboardElements.activityTimeline;

  const emptyState =
    dashboardElements.activityEmptyState;

  if (!timeline || !emptyState) {
    return;
  }

  const visibleActivities =
    activities.slice(
      0,
      DASHBOARD_CONFIG.MAX_ACTIVITIES
    );

  if (
    visibleActivities.length === 0
  ) {
    timeline.innerHTML = "";
    timeline.hidden = true;
    emptyState.hidden = false;

    return;
  }

  timeline.hidden = false;
  emptyState.hidden = true;

  timeline.innerHTML =
    visibleActivities
      .map((activity) => {
        const color =
          getActivityColor(activity);

        return `
          <div class="timeline-item dashboard-data-enter">
            <div
              class="timeline-marker"
              style="
                --activity-color: ${color};
              "
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                ${getActivityIcon(activity)}
              </svg>
            </div>

            <div class="timeline-content">
              <p class="timeline-message">
                ${escapeHTML(
                  buildActivityMessage(
                    activity
                  )
                )}
              </p>

              <div class="timeline-meta">
                <span>
                  ${escapeHTML(
                    formatRelativeTime(
                      getActivityTime(
                        activity
                      )
                    )
                  )}
                </span>

                ${
                  activity.entity_type
                    ? `
                      <span
                        class="timeline-meta-separator"
                        aria-hidden="true"
                      ></span>

                      <span>
                        ${escapeHTML(
                          statusLabel(
                            activity.entity_type
                          )
                        )}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      })
      .join("");
}

/* =========================================================
   NOTIFICATION COUNT
   ========================================================= */

function updateNotificationCount(
  response
) {
  const notifications =
    unwrapCollection(
      response,
      [
        "notifications"
      ]
    );

  dashboardState.notifications =
    notifications;

  const responseObject =
    unwrapObject(response);

  const unreadCount =
    toNumber(
      firstDefined(
        responseObject,
        [
          "unread_count",
          "unreadCount"
        ],
        notifications.filter(
          (notification) =>
            notification.is_read === false
        ).length
      )
    );

  window.AssetFlowLoader
    ?.setNotificationCount?.(
      unreadCount
    );
}

/* =========================================================
   LAST UPDATED
   ========================================================= */

function updateLastUpdatedTime() {
  dashboardState.lastUpdated =
    new Date();

  document
    .querySelectorAll(
      "[data-last-updated]"
    )
    .forEach((element) => {
      element.textContent =
        `Updated ${dashboardState.lastUpdated.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }
        )}`;
    });
}

/* =========================================================
   MAIN DATA LOAD
   ========================================================= */

async function loadDashboard({
  showSuccessToast = false
} = {}) {
  if (dashboardState.loading) {
    return;
  }

  dashboardState.abortController
    ?.abort();

  dashboardState.abortController =
    new AbortController();

  const signal =
    dashboardState.abortController
      .signal;

  setDashboardLoading(true);
  hideDashboardError();

  try {
    const period =
      dashboardElements.periodSelect
        ?.value || 30;

    const user =
      getCurrentUser();

    const [
      kpiResult,
      utilizationResult,
      bookingsResult,
      notificationsResult,
      activityResult
    ] = await Promise.allSettled([
      fetchDashboardKPIs(signal),

      fetchUtilization(
        period,
        signal
      ),

      fetchBookings(signal),

      fetchNotifications(signal),

      user?.role === "Admin"
        ? fetchActivityLogs(signal)
        : Promise.resolve(null)
    ]);

    if (
      kpiResult.status === "rejected"
    ) {
      throw kpiResult.reason;
    }

    const kpis =
      unwrapObject(
        kpiResult.value
      );

    dashboardState.kpis =
      kpis;

    renderKPIs(kpis);

    const utilization =
      utilizationResult.status ===
      "fulfilled"
        ? normalizeUtilizationData(
            utilizationResult.value,
            kpis
          )
        : normalizeUtilizationData(
            {},
            kpis
          );

    dashboardState.utilization =
      utilization;

    renderUtilizationChart(
      utilization
    );

    renderAssetHealth(
      utilization
    );

    const overdueReturns =
      firstDefined(
        kpis,
        [
          "overdue_returns",
          "overdueReturns"
        ],
        []
      );

    renderOverdueReturns(
      Array.isArray(overdueReturns)
        ? overdueReturns
        : []
    );

    const bookings =
      bookingsResult.status ===
      "fulfilled"
        ? normalizeBookings(
            bookingsResult.value
          )
        : [];

    dashboardState.bookings =
      bookings;

    renderUpcomingBookings(
      bookings
    );

    if (
      notificationsResult.status ===
      "fulfilled"
    ) {
      updateNotificationCount(
        notificationsResult.value
      );
    }

    let activities = [];

    if (
      activityResult.status ===
      "fulfilled" &&
      activityResult.value
    ) {
      activities =
        unwrapCollection(
          activityResult.value,
          [
            "activity_logs",
            "activities",
            "logs"
          ]
        );
    }

    if (activities.length === 0) {
      activities =
        dashboardState.notifications;
    }

    dashboardState.activities =
      activities;

    renderRecentActivity(
      activities
    );

    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Dashboard data has been refreshed.",
        "success"
      );
    }
  } catch (error) {
    if (
      error?.name === "AbortError"
    ) {
      return;
    }

    console.error(
      "Dashboard loading failed:",
      error
    );

    const message =
      error?.message ||
      "Unable to load dashboard data. Please try again.";

    showDashboardError(message);

    showToast(
      message,
      "danger"
    );
  } finally {
    setDashboardLoading(false);
  }
}

/* =========================================================
   PERIOD CHANGE
   ========================================================= */

async function refreshUtilization() {
  const period =
    dashboardElements.periodSelect
      ?.value || 30;

  try {
    if (
      dashboardElements.utilizationChart
    ) {
      dashboardElements.utilizationChart.innerHTML = `
        <div class="chart-loading-state">
          <div class="loader-spinner"></div>

          <span>
            Updating chart...
          </span>
        </div>
      `;
    }

    const response =
      await fetchUtilization(
        period
      );

    const data =
      normalizeUtilizationData(
        response,
        dashboardState.kpis
      );

    dashboardState.utilization =
      data;

    renderUtilizationChart(data);
    renderAssetHealth(data);
  } catch (error) {
    console.error(
      "Utilization refresh failed:",
      error
    );

    const fallback =
      normalizeUtilizationData(
        {},
        dashboardState.kpis
      );

    renderUtilizationChart(
      fallback
    );

    renderAssetHealth(
      fallback
    );

    showToast(
      "Utilization report could not be updated.",
      "warning"
    );
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function openQuickActionModal() {
  if (
    window.AssetFlowUtils
      ?.openModal
  ) {
    window.AssetFlowUtils.openModal(
      dashboardElements
        .quickActionModal
    );

    return;
  }

  dashboardElements.quickActionModal
    ?.classList.add("open");
}

function bindDashboardEvents() {
  dashboardElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadDashboard({
          showSuccessToast: true
        });
      }
    );

  dashboardElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadDashboard();
      }
    );

  dashboardElements.quickActionButton
    ?.addEventListener(
      "click",
      openQuickActionModal
    );

  dashboardElements.periodSelect
    ?.addEventListener(
      "change",
      refreshUtilization
    );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        !document.hidden &&
        dashboardState.lastUpdated
      ) {
        const elapsed =
          Date.now() -
          dashboardState.lastUpdated
            .getTime();

        if (
          elapsed >
          DASHBOARD_CONFIG
            .AUTO_REFRESH_INTERVAL
        ) {
          loadDashboard();
        }
      }
    }
  );
}

/* =========================================================
   AUTOMATIC REFRESH
   ========================================================= */

function startAutoRefresh() {
  window.clearInterval(
    dashboardState.autoRefreshTimer
  );

  dashboardState.autoRefreshTimer =
    window.setInterval(() => {
      if (
        !document.hidden &&
        !dashboardState.loading
      ) {
        loadDashboard();
      }
    }, DASHBOARD_CONFIG.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  window.clearInterval(
    dashboardState.autoRefreshTimer
  );

  dashboardState.autoRefreshTimer =
    null;
}

/* =========================================================
   SHARED COMPONENT INTEGRATION
   ========================================================= */

function initializeDashboardHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title: "Dashboard",
      subtitle:
        "Manage your assets and resources"
    });

  updateDashboardGreeting();
}

window.addEventListener(
  "assetflow:components-ready",
  initializeDashboardHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeDashboard() {
  if (
    dashboardState.initialized
  ) {
    return;
  }

  dashboardState.initialized = true;

  cacheDashboardElements();
  updateDashboardGreeting();
  bindDashboardEvents();

  await loadDashboard();

  startAutoRefresh();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:dashboard-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    stopAutoRefresh();

    dashboardState.abortController
      ?.abort();
  }
);

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
  );
} else {
  initializeDashboard();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowDashboard =
  Object.freeze({
    initialize:
      initializeDashboard,

    refresh:
      loadDashboard,

    refreshUtilization,

    getState() {
      return {
        ...dashboardState,
        abortController: undefined,
        autoRefreshTimer: undefined
      };
    }
  });