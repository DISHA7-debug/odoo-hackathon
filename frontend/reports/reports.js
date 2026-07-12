/* =========================================================
   AssetFlow — Reports & Analytics Controller
   File: frontend/reports/reports.js

   Requires:
   - ../js/api.js
   - ../js/utils.js
   - ../js/auth.js
   - ../js/loader.js
   - ../js/sidebar.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const REPORTS_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  MANAGER_ROLES: Object.freeze([
    "Admin",
    "AssetManager"
  ]),

  ENDPOINTS: Object.freeze({
    ASSETS: [
      "/assets"
    ],

    ALLOCATIONS: [
      "/asset-allocations",
      "/allocations"
    ],

    BOOKINGS: [
      "/bookings",
      "/resource-bookings"
    ],

    MAINTENANCE: [
      "/maintenance-requests",
      "/maintenance",
      "/asset-maintenance"
    ],

    CATEGORIES: [
      "/asset-categories",
      "/categories"
    ],

    DEPARTMENTS: [
      "/departments"
    ],

    LOCATIONS: [
      "/locations"
    ],

    USERS: [
      "/employees",
      "/users"
    ],

    AUDIT: [
      "/audit-logs",
      "/activity-logs",
      "/audit"
    ],

    REPORT_SCHEDULES: [
      "/report-schedules",
      "/scheduled-reports"
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const reportsState = {
  assets: [],
  allocations: [],
  bookings: [],
  maintenance: [],
  categories: [],
  departments: [],
  locations: [],
  users: [],
  auditLogs: [],

  activeTab: "overview",

  periodPreset: "current_year",
  startDate: "",
  endDate: "",

  departmentFilter: "",
  locationFilter: "",
  categoryFilter: "",

  inventorySearch: "",
  inventoryStatus: "",
  inventoryPage: 1,

  utilizationMetric: "overall",

  financialGrouping: "month",

  auditSearch: "",
  auditActionFilter: "",
  auditEntityFilter: "",
  auditPage: 1,

  loading: false,
  initialized: false,

  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const reportsElements = {};

function cacheReportsElements() {
  reportsElements.errorAlert =
    document.getElementById(
      "reportsPageErrorAlert"
    );

  reportsElements.errorMessage =
    document.getElementById(
      "reportsPageErrorMessage"
    );

  reportsElements.refreshButton =
    document.querySelector(
      "[data-refresh-reports]"
    );

  reportsElements.retryButton =
    document.querySelector(
      "[data-retry-reports]"
    );

  reportsElements.periodPreset =
    document.querySelector(
      "[data-report-period-preset]"
    );

  reportsElements.startDate =
    document.querySelector(
      "[data-report-start-date]"
    );

  reportsElements.endDate =
    document.querySelector(
      "[data-report-end-date]"
    );

  reportsElements.departmentFilter =
    document.querySelector(
      "[data-report-department-filter]"
    );

  reportsElements.locationFilter =
    document.querySelector(
      "[data-report-location-filter]"
    );

  reportsElements.categoryFilter =
    document.querySelector(
      "[data-report-category-filter]"
    );

  reportsElements.activeFilters =
    document.querySelector(
      "[data-report-active-filters]"
    );

  reportsElements.filterChips =
    document.querySelector(
      "[data-report-filter-chips]"
    );

  reportsElements.inventorySearch =
    document.querySelector(
      "[data-inventory-report-search]"
    );

  reportsElements.inventoryStatus =
    document.querySelector(
      "[data-inventory-status-filter]"
    );

  reportsElements.inventoryTableBody =
    document.getElementById(
      "inventoryReportTableBody"
    );

  reportsElements.inventoryTableContainer =
    document.getElementById(
      "inventoryReportTableContainer"
    );

  reportsElements.inventoryEmptyState =
    document.getElementById(
      "inventoryReportEmptyState"
    );

  reportsElements.inventoryPagination =
    document.querySelector(
      "[data-inventory-pagination]"
    );

  reportsElements.inventoryPaginationSummary =
    document.querySelector(
      "[data-inventory-pagination-summary]"
    );

  reportsElements.utilizationMetric =
    document.querySelector(
      "[data-utilization-metric]"
    );

  reportsElements.utilizationTableBody =
    document.getElementById(
      "utilizationReportTableBody"
    );

  reportsElements.utilizationTableContainer =
    reportsElements.utilizationTableBody
      ?.closest(".table-container");

  reportsElements.utilizationEmptyState =
    document.getElementById(
      "utilizationReportEmptyState"
    );

  reportsElements.underutilizedList =
    document.querySelector(
      "[data-underutilized-assets-list]"
    );

  reportsElements.financialGrouping =
    document.querySelector(
      "[data-financial-chart-grouping]"
    );

  reportsElements.financialTableBody =
    document.getElementById(
      "financialReportTableBody"
    );

  reportsElements.financialTableContainer =
    reportsElements.financialTableBody
      ?.closest(".table-container");

  reportsElements.financialEmptyState =
    document.getElementById(
      "financialReportEmptyState"
    );

  reportsElements.auditSearch =
    document.querySelector(
      "[data-audit-report-search]"
    );

  reportsElements.auditActionFilter =
    document.querySelector(
      "[data-audit-action-filter]"
    );

  reportsElements.auditEntityFilter =
    document.querySelector(
      "[data-audit-entity-filter]"
    );

  reportsElements.auditTableBody =
    document.getElementById(
      "auditReportTableBody"
    );

  reportsElements.auditTableContainer =
    reportsElements.auditTableBody
      ?.closest(".table-container");

  reportsElements.auditEmptyState =
    document.getElementById(
      "auditReportEmptyState"
    );

  reportsElements.auditPagination =
    document.querySelector(
      "[data-audit-pagination]"
    );

  reportsElements.auditPaginationSummary =
    document.querySelector(
      "[data-audit-pagination-summary]"
    );

  reportsElements.exportModal =
    document.getElementById(
      "exportReportModal"
    );

  reportsElements.exportForm =
    document.getElementById(
      "exportReportForm"
    );

  reportsElements.exportError =
    document.querySelector(
      "[data-export-report-error]"
    );

  reportsElements.exportSubmitButton =
    document.getElementById(
      "exportReportSubmitButton"
    );

  reportsElements.scheduleModal =
    document.getElementById(
      "scheduleReportModal"
    );

  reportsElements.scheduleForm =
    document.getElementById(
      "scheduleReportForm"
    );

  reportsElements.scheduleError =
    document.querySelector(
      "[data-schedule-report-error]"
    );

  reportsElements.scheduleSubmitButton =
    document.getElementById(
      "scheduleReportSubmitButton"
    );
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function escapeHTML(value = "") {
  if (
    window.AssetFlowUtils?.escapeHTML
  ) {
    return window.AssetFlowUtils
      .escapeHTML(value);
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function normalizeStatus(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .trim()
    .toLowerCase();
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .trim()
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function toBoolean(
  value,
  fallback = false
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  return ![
    "false",
    "0",
    "no",
    "inactive",
    "disabled"
  ].includes(
    normalizeText(value)
  );
}

function getRecordId(record) {
  return (
    record?.id ??
    record?.asset_id ??
    record?.allocation_id ??
    record?.booking_id ??
    record?.maintenance_request_id ??
    record?.category_id ??
    record?.department_id ??
    record?.location_id ??
    record?.employee_id ??
    record?.user_id ??
    record?.audit_log_id ??
    ""
  );
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

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function sum(values) {
  return values.reduce(
    (total, value) =>
      total +
      (
        Number(value) || 0
      ),
    0
  );
}

function average(values) {
  const validValues =
    values
      .map(Number)
      .filter(Number.isFinite);

  if (
    validValues.length === 0
  ) {
    return 0;
  }

  return (
    sum(validValues) /
    validValues.length
  );
}

function formatNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
}

function formatPercentage(
  value,
  decimals = 1
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(decimals)}%`
    : "0%";
}

function formatCurrency(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits:
        number >= 100000
          ? 0
          : 2
    }
  ).format(number);
}

function formatCompactCurrency(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1
    }
  ).format(number);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
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

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }
  );
}

function formatDurationDays(value) {
  const days =
    Number(value);

  if (!Number.isFinite(days)) {
    return "0 days";
  }

  if (days < 1) {
    return "Less than 1 day";
  }

  return `${Math.round(days)} ${
    Math.round(days) === 1
      ? "day"
      : "days"
  }`;
}

function getInitials(name = "") {
  if (
    window.AssetFlowUtils?.getInitials
  ) {
    return window.AssetFlowUtils
      .getInitials(name);
  }

  const words =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length === 0) {
    return "AF";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    `${words[0][0]}` +
    `${words[1][0]}`
  ).toUpperCase();
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

function openModal(modal) {
  window.AssetFlowUtils?.openModal?.(
    modal
  );
}

function closeModal(modal) {
  window.AssetFlowUtils?.closeModal?.(
    modal
  );
}

function setButtonLoading(
  button,
  loading,
  text = "Please wait..."
) {
  window.AssetFlowUtils
    ?.setButtonLoading?.(
      button,
      loading,
      text
    );
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function startOfDay(value) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function endOfDay(value) {
  const date =
    new Date(value);

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
}

function dateToISO(value) {
  const date =
    new Date(value);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  value,
  amount
) {
  const date =
    new Date(value);

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

function addMonths(
  value,
  amount
) {
  const date =
    new Date(value);

  date.setMonth(
    date.getMonth() + amount
  );

  return date;
}

function differenceInDays(
  startValue,
  endValue
) {
  const start =
    startOfDay(startValue);

  const end =
    startOfDay(endValue);

  return Math.max(
    0,
    Math.ceil(
      (end - start) /
      (1000 * 60 * 60 * 24)
    )
  );
}

function getCurrentQuarter(date) {
  return Math.floor(
    date.getMonth() / 3
  );
}

function getPeriodRange(preset) {
  const now =
    new Date();

  let start =
    new Date(
      now.getFullYear(),
      0,
      1
    );

  let end =
    new Date(
      now.getFullYear(),
      11,
      31
    );

  switch (preset) {
    case "current_month":
      start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      end =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        );
      break;

    case "previous_month":
      start =
        new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );

      end =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        );
      break;

    case "current_quarter": {
      const quarter =
        getCurrentQuarter(now);

      start =
        new Date(
          now.getFullYear(),
          quarter * 3,
          1
        );

      end =
        new Date(
          now.getFullYear(),
          quarter * 3 + 3,
          0
        );
      break;
    }

    case "previous_quarter": {
      const currentQuarter =
        getCurrentQuarter(now);

      const previousQuarterDate =
        new Date(
          now.getFullYear(),
          currentQuarter * 3 - 3,
          1
        );

      const quarter =
        getCurrentQuarter(
          previousQuarterDate
        );

      start =
        new Date(
          previousQuarterDate
            .getFullYear(),
          quarter * 3,
          1
        );

      end =
        new Date(
          previousQuarterDate
            .getFullYear(),
          quarter * 3 + 3,
          0
        );
      break;
    }

    case "previous_year":
      start =
        new Date(
          now.getFullYear() - 1,
          0,
          1
        );

      end =
        new Date(
          now.getFullYear() - 1,
          11,
          31
        );
      break;

    case "current_year":
    default:
      start =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      end =
        new Date(
          now.getFullYear(),
          11,
          31
        );
      break;
  }

  return {
    start:
      dateToISO(start),

    end:
      dateToISO(end)
  };
}

function dateFallsWithinPeriod(value) {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return false;
  }

  const start =
    startOfDay(
      reportsState.startDate
    );

  const end =
    endOfDay(
      reportsState.endDate
    );

  return (
    date >= start &&
    date <= end
  );
}

function intervalOverlapsPeriod(
  startValue,
  endValue
) {
  const recordStart =
    new Date(startValue);

  const recordEnd =
    endValue
      ? new Date(endValue)
      : new Date();

  if (
    Number.isNaN(
      recordStart.getTime()
    ) ||
    Number.isNaN(
      recordEnd.getTime()
    )
  ) {
    return false;
  }

  const periodStart =
    startOfDay(
      reportsState.startDate
    );

  const periodEnd =
    endOfDay(
      reportsState.endDate
    );

  return (
    recordStart <= periodEnd &&
    recordEnd >= periodStart
  );
}

function clipIntervalToPeriod(
  startValue,
  endValue
) {
  const recordStart =
    new Date(startValue);

  const recordEnd =
    endValue
      ? new Date(endValue)
      : new Date();

  const periodStart =
    startOfDay(
      reportsState.startDate
    );

  const periodEnd =
    endOfDay(
      reportsState.endDate
    );

  return {
    start:
      new Date(
        Math.max(
          recordStart.getTime(),
          periodStart.getTime()
        )
      ),

    end:
      new Date(
        Math.min(
          recordEnd.getTime(),
          periodEnd.getTime()
        )
      )
  };
}

/* =========================================================
   CURRENT USER AND PERMISSIONS
   ========================================================= */

function getCurrentUser() {
  if (
    window.AssetFlowAuth
      ?.getCurrentUser
  ) {
    return window.AssetFlowAuth
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

function canViewManagementReports() {
  return REPORTS_CONFIG
    .MANAGER_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function enforceReportPermissions() {
  const allowed =
    canViewManagementReports();

  document
    .querySelectorAll(
      '[data-roles="Admin,AssetManager"]'
    )
    .forEach((element) => {
      element.hidden =
        !allowed;
    });

  if (
    !allowed &&
    [
      "financial",
      "audit"
    ].includes(
      reportsState.activeTab
    )
  ) {
    activateReportTab(
      "overview"
    );
  }
}

/* =========================================================
   API HELPERS
   ========================================================= */

function getApiBaseURL() {
  const configuredBase =
    window.AssetFlowAPI?.config
      ?.BASE_URL ||
    window.AssetFlowAPI?.config
      ?.baseURL ||
    "http://localhost:5000/api/v1";

  return String(configuredBase)
    .replace(/\/$/, "");
}

function getAuthToken() {
  if (
    window.AssetFlowAPI?.getToken
  ) {
    return window.AssetFlowAPI
      .getToken();
  }

  return localStorage.getItem(
    "assetflow_token"
  );
}

async function parseResponse(response) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data = {};

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data =
      await response.json();
  } else {
    const text =
      await response.text();

    data = text
      ? {
          message: text
        }
      : {};
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
        `Request failed with status ${response.status}.`
      );

    error.status =
      response.status;

    error.field =
      data?.field;

    error.data =
      data;

    throw error;
  }

  return data;
}

async function apiRequest(
  endpoint,
  {
    method = "GET",
    body = undefined,
    signal = undefined
  } = {}
) {
  const token =
    getAuthToken();

  const response =
    await fetch(
      `${getApiBaseURL()}${endpoint}`,
      {
        method,
        signal,

        headers: {
          Accept:
            "application/json",

          ...(body !== undefined
            ? {
                "Content-Type":
                  "application/json"
              }
            : {}),

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`
              }
            : {})
        },

        ...(body !== undefined
          ? {
              body:
                JSON.stringify(body)
            }
          : {})
      }
    );

  return parseResponse(response);
}

async function requestWithFallback(
  endpoints,
  options = {}
) {
  const endpointList =
    Array.isArray(endpoints)
      ? endpoints
      : [endpoints];

  let lastError = null;

  for (
    const endpoint
    of endpointList
  ) {
    try {
      return await apiRequest(
        endpoint,
        options
      );
    } catch (error) {
      lastError = error;

      if (
        ![404, 405].includes(
          error.status
        )
      ) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "No compatible API endpoint was found."
    )
  );
}

function unwrapCollection(
  response,
  possibleKeys = []
) {
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  for (
    const key
    of possibleKeys
  ) {
    if (
      Array.isArray(
        response?.[key]
      )
    ) {
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

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.items
    )
  ) {
    return response.items;
  }

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return response.results;
  }

  return [];
}

/* =========================================================
   DATA FETCHING
   ========================================================= */

async function fetchCollection(
  endpoints,
  keys,
  signal,
  required = false
) {
  try {
    const response =
      await requestWithFallback(
        endpoints,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      keys
    );
  } catch (error) {
    if (
      !required &&
      [404, 405].includes(
        error.status
      )
    ) {
      return [];
    }

    throw error;
  }
}

function fetchAssets(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.ASSETS,
    ["assets"],
    signal,
    true
  );
}

function fetchAllocations(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.ALLOCATIONS,
    [
      "allocations",
      "asset_allocations"
    ],
    signal
  );
}

function fetchBookings(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.BOOKINGS,
    [
      "bookings",
      "resource_bookings"
    ],
    signal
  );
}

function fetchMaintenance(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.MAINTENANCE,
    [
      "maintenance_requests",
      "maintenance",
      "requests"
    ],
    signal
  );
}

function fetchCategories(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.CATEGORIES,
    [
      "categories",
      "asset_categories"
    ],
    signal
  );
}

function fetchDepartments(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.DEPARTMENTS,
    ["departments"],
    signal
  );
}

function fetchLocations(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.LOCATIONS,
    ["locations"],
    signal
  );
}

function fetchUsers(signal) {
  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.USERS,
    [
      "employees",
      "users"
    ],
    signal
  );
}

function fetchAuditLogs(signal) {
  if (
    !canViewManagementReports()
  ) {
    return Promise.resolve([]);
  }

  return fetchCollection(
    REPORTS_CONFIG.ENDPOINTS.AUDIT,
    [
      "audit_logs",
      "activity_logs",
      "logs",
      "audit"
    ],
    signal
  );
}

/* =========================================================
   RELATIONSHIP RESOLVERS
   ========================================================= */

function findById(
  collection,
  id
) {
  return (
    collection.find(
      (record) =>
        String(
          getRecordId(record)
        ) ===
        String(id)
    ) || null
  );
}

function findAssetById(id) {
  return findById(
    reportsState.assets,
    id
  );
}

function findCategoryById(id) {
  return findById(
    reportsState.categories,
    id
  );
}

function findDepartmentById(id) {
  return findById(
    reportsState.departments,
    id
  );
}

function findLocationById(id) {
  return findById(
    reportsState.locations,
    id
  );
}

function findUserById(id) {
  return findById(
    reportsState.users,
    id
  );
}

function getAssetReference(record) {
  return (
    record?.asset ||
    record?.resource ||
    record?.asset_id ||
    record?.resource_id ||
    null
  );
}

function getRelatedAsset(record) {
  const reference =
    getAssetReference(record);

  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return findAssetById(reference);
}

function getRelatedAssetId(record) {
  const reference =
    getAssetReference(record);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getAssetCategoryReference(asset) {
  return (
    asset?.category ||
    asset?.asset_category ||
    asset?.category_id ||
    null
  );
}

function getAssetCategoryId(asset) {
  const reference =
    getAssetCategoryReference(
      asset
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getAssetCategoryName(asset) {
  const reference =
    getAssetCategoryReference(
      asset
    );

  if (!reference) {
    return (
      asset?.category_name ||
      "Uncategorized"
    );
  }

  if (
    typeof reference === "object"
  ) {
    return (
      reference.name ||
      "Uncategorized"
    );
  }

  return (
    findCategoryById(
      reference
    )?.name ||
    asset?.category_name ||
    "Uncategorized"
  );
}

function getAssetDepartmentReference(asset) {
  return (
    asset?.department ||
    asset?.department_id ||
    asset?.assigned_department ||
    null
  );
}

function getAssetDepartmentId(asset) {
  const reference =
    getAssetDepartmentReference(
      asset
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getAssetDepartmentName(asset) {
  const reference =
    getAssetDepartmentReference(
      asset
    );

  if (!reference) {
    return (
      asset?.department_name ||
      "Unassigned"
    );
  }

  if (
    typeof reference === "object"
  ) {
    return (
      reference.name ||
      "Unassigned"
    );
  }

  return (
    findDepartmentById(
      reference
    )?.name ||
    asset?.department_name ||
    "Unassigned"
  );
}

function getAssetLocationReference(asset) {
  return (
    asset?.location ||
    asset?.current_location ||
    asset?.location_id ||
    null
  );
}

function getAssetLocationId(asset) {
  const reference =
    getAssetLocationReference(
      asset
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getAssetLocationName(asset) {
  const reference =
    getAssetLocationReference(
      asset
    );

  if (!reference) {
    return (
      asset?.location_name ||
      "Location not set"
    );
  }

  if (
    typeof reference === "object"
  ) {
    return (
      reference.name ||
      "Location not set"
    );
  }

  return (
    findLocationById(
      reference
    )?.name ||
    asset?.location_name ||
    "Location not set"
  );
}

function getAssetName(asset) {
  return (
    asset?.name ||
    asset?.asset_name ||
    "Unnamed Asset"
  );
}

function getAssetTag(asset) {
  return (
    asset?.asset_tag ||
    asset?.tag ||
    asset?.code ||
    "No asset tag"
  );
}

function getUserReference(record) {
  return (
    record?.user ||
    record?.employee ||
    record?.actor ||
    record?.user_id ||
    record?.employee_id ||
    record?.actor_id ||
    null
  );
}

function getRelatedUser(record) {
  const reference =
    getUserReference(record);

  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return findUserById(reference);
}

/* =========================================================
   FILTERED DATA
   ========================================================= */

function matchesGlobalAssetFilters(asset) {
  const departmentMatch =
    !reportsState.departmentFilter ||
    String(
      getAssetDepartmentId(asset)
    ) ===
    String(
      reportsState.departmentFilter
    );

  const locationMatch =
    !reportsState.locationFilter ||
    String(
      getAssetLocationId(asset)
    ) ===
    String(
      reportsState.locationFilter
    );

  const categoryMatch =
    !reportsState.categoryFilter ||
    String(
      getAssetCategoryId(asset)
    ) ===
    String(
      reportsState.categoryFilter
    );

  return (
    departmentMatch &&
    locationMatch &&
    categoryMatch
  );
}

function getFilteredAssets() {
  return reportsState.assets.filter(
    matchesGlobalAssetFilters
  );
}

function getFilteredAssetIdSet() {
  return new Set(
    getFilteredAssets()
      .map(getRecordId)
      .filter(Boolean)
      .map(String)
  );
}

function getFilteredAllocations() {
  const assetIds =
    getFilteredAssetIdSet();

  return reportsState.allocations
    .filter(
      (allocation) =>
        assetIds.has(
          String(
            getRelatedAssetId(
              allocation
            )
          )
        )
    )
    .filter((allocation) =>
      intervalOverlapsPeriod(
        firstDefined(
          allocation,
          [
            "allocated_at",
            "allocation_date",
            "start_date",
            "created_at"
          ]
        ),

        firstDefined(
          allocation,
          [
            "returned_at",
            "return_date",
            "end_date"
          ]
        )
      )
    );
}

function getFilteredBookings() {
  const assetIds =
    getFilteredAssetIdSet();

  return reportsState.bookings
    .filter(
      (booking) =>
        assetIds.has(
          String(
            getRelatedAssetId(
              booking
            )
          )
        )
    )
    .filter((booking) =>
      intervalOverlapsPeriod(
        firstDefined(
          booking,
          [
            "start_time",
            "start_datetime",
            "booking_start",
            "starts_at"
          ]
        ),

        firstDefined(
          booking,
          [
            "end_time",
            "end_datetime",
            "booking_end",
            "ends_at"
          ]
        )
      )
    );
}

function getFilteredMaintenance() {
  const assetIds =
    getFilteredAssetIdSet();

  return reportsState.maintenance
    .filter(
      (request) =>
        assetIds.has(
          String(
            getRelatedAssetId(
              request
            )
          )
        )
    )
    .filter((request) => {
      const date =
        firstDefined(
          request,
          [
            "reported_at",
            "reported_date",
            "created_at",
            "completed_at",
            "completed_date"
          ]
        );

      return dateFallsWithinPeriod(
        date
      );
    });
}

function getFilteredAuditLogs() {
  return reportsState.auditLogs.filter(
    (log) => {
      const timestamp =
        firstDefined(
          log,
          [
            "timestamp",
            "created_at",
            "occurred_at"
          ]
        );

      return dateFallsWithinPeriod(
        timestamp
      );
    }
  );
}

/* =========================================================
   REPORT PERIOD AND OPTIONS
   ========================================================= */

function initializeReportPeriod() {
  const range =
    getPeriodRange(
      reportsState.periodPreset
    );

  reportsState.startDate =
    range.start;

  reportsState.endDate =
    range.end;

  reportsElements.startDate.value =
    range.start;

  reportsElements.endDate.value =
    range.end;

  updateCustomDateAvailability();
}

function updateCustomDateAvailability() {
  const custom =
    reportsElements
      .periodPreset.value ===
    "custom";

  reportsElements.startDate.disabled =
    !custom;

  reportsElements.endDate.disabled =
    !custom;
}

function buildOptions(
  items,
  {
    placeholder,
    selectedValue = ""
  }
) {
  return `
    <option value="">
      ${escapeHTML(placeholder)}
    </option>

    ${items
      .map((item) => {
        const id =
          getRecordId(item);

        return `
          <option
            value="${escapeHTML(id)}"
            ${
              String(id) ===
              String(selectedValue)
                ? "selected"
                : ""
            }
          >
            ${escapeHTML(
              item.name ||
              item.label ||
              "Unnamed"
            )}
          </option>
        `;
      })
      .join("")}
  `;
}

function populateReportOptions() {
  reportsElements
    .departmentFilter.innerHTML =
    buildOptions(
      reportsState.departments,
      {
        placeholder:
          "All Departments",

        selectedValue:
          reportsState
            .departmentFilter
      }
    );

  reportsElements
    .locationFilter.innerHTML =
    buildOptions(
      reportsState.locations,
      {
        placeholder:
          "All Locations",

        selectedValue:
          reportsState
            .locationFilter
      }
    );

  reportsElements
    .categoryFilter.innerHTML =
    buildOptions(
      reportsState.categories,
      {
        placeholder:
          "All Categories",

        selectedValue:
          reportsState
            .categoryFilter
      }
    );
}

/* =========================================================
   ACTIVE FILTER CHIPS
   ========================================================= */

function renderActiveFilterChips() {
  const chips = [];

  const periodLabel =
    reportsElements
      .periodPreset
      .selectedOptions[0]
      ?.textContent
      ?.trim();

  if (periodLabel) {
    chips.push({
      key: "period",
      label: periodLabel
    });
  }

  if (
    reportsState.departmentFilter
  ) {
    chips.push({
      key: "department",

      label:
        findDepartmentById(
          reportsState
            .departmentFilter
        )?.name ||
        "Department"
    });
  }

  if (
    reportsState.locationFilter
  ) {
    chips.push({
      key: "location",

      label:
        findLocationById(
          reportsState
            .locationFilter
        )?.name ||
        "Location"
    });
  }

  if (
    reportsState.categoryFilter
  ) {
    chips.push({
      key: "category",

      label:
        findCategoryById(
          reportsState
            .categoryFilter
        )?.name ||
        "Category"
    });
  }

  reportsElements
    .activeFilters.hidden =
    chips.length === 0;

  reportsElements
    .filterChips.innerHTML =
    chips
      .map((chip) => `
        <span class="report-filter-chip">
          ${escapeHTML(chip.label)}

          ${
            chip.key === "period"
              ? ""
              : `
                <button
                  type="button"
                  data-remove-report-filter="${chip.key}"
                  aria-label="Remove ${escapeHTML(
                    chip.label
                  )} filter"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              `
          }
        </span>
      `)
      .join("");
}

/* =========================================================
   SUMMARY CALCULATIONS
   ========================================================= */

function isActiveAsset(asset) {
  return ![
    "disposed",
    "lost",
    "retired"
  ].includes(
    normalizeStatus(
      asset.status
    )
  );
}

function isMaintenanceCompleted(request) {
  return [
    "completed",
    "resolved",
    "closed"
  ].includes(
    normalizeStatus(
      request.status
    )
  );
}

function getMaintenanceCost(request) {
  return Number(
    firstDefined(
      request,
      [
        "final_cost",
        "actual_cost",
        "cost",
        "estimated_cost"
      ],
      0
    )
  ) || 0;
}

function getAssetPurchaseCost(asset) {
  return Number(
    firstDefined(
      asset,
      [
        "purchase_cost",
        "acquisition_cost",
        "purchase_price",
        "cost"
      ],
      0
    )
  ) || 0;
}

function getAssetCurrentValue(asset) {
  const explicit =
    Number(
      firstDefined(
        asset,
        [
          "current_value",
          "book_value",
          "estimated_value"
        ]
      )
    );

  if (
    Number.isFinite(explicit)
  ) {
    return Math.max(
      0,
      explicit
    );
  }

  const purchaseCost =
    getAssetPurchaseCost(
      asset
    );

  const purchaseDate =
    new Date(
      firstDefined(
        asset,
        [
          "purchase_date",
          "acquisition_date",
          "created_at"
        ],
        new Date()
      )
    );

  const usefulLifeYears =
    Number(
      firstDefined(
        asset,
        [
          "useful_life_years",
          "depreciation_years"
        ],
        5
      )
    ) || 5;

  const ageYears =
    Math.max(
      0,
      (
        new Date() -
        purchaseDate
      ) /
      (
        1000 *
        60 *
        60 *
        24 *
        365.25
      )
    );

  const depreciationRate =
    clamp(
      ageYears /
      usefulLifeYears,
      0,
      1
    );

  return (
    purchaseCost *
    (
      1 -
      depreciationRate
    )
  );
}

function calculateAssetUtilization(
  asset
) {
  const assetId =
    String(
      getRecordId(asset)
    );

  const periodDays =
    Math.max(
      1,
      differenceInDays(
        reportsState.startDate,
        reportsState.endDate
      ) + 1
    );

  const allocations =
    getFilteredAllocations()
      .filter(
        (allocation) =>
          String(
            getRelatedAssetId(
              allocation
            )
          ) === assetId
      );

  let allocationDays = 0;

  allocations.forEach(
    (allocation) => {
      const interval =
        clipIntervalToPeriod(
          firstDefined(
            allocation,
            [
              "allocated_at",
              "allocation_date",
              "start_date",
              "created_at"
            ]
          ),

          firstDefined(
            allocation,
            [
              "returned_at",
              "return_date",
              "end_date"
            ]
          )
        );

      allocationDays +=
        Math.max(
          1,
          differenceInDays(
            interval.start,
            interval.end
          ) + 1
        );
    }
  );

  allocationDays =
    Math.min(
      periodDays,
      allocationDays
    );

  const bookings =
    getFilteredBookings()
      .filter(
        (booking) =>
          String(
            getRelatedAssetId(
              booking
            )
          ) === assetId
      );

  let bookingHours = 0;

  bookings.forEach((booking) => {
    const interval =
      clipIntervalToPeriod(
        firstDefined(
          booking,
          [
            "start_time",
            "start_datetime",
            "booking_start",
            "starts_at"
          ]
        ),

        firstDefined(
          booking,
          [
            "end_time",
            "end_datetime",
            "booking_end",
            "ends_at"
          ]
        )
      );

    bookingHours +=
      Math.max(
        0,
        (
          interval.end -
          interval.start
        ) /
        (
          1000 *
          60 *
          60
        )
      );
  });

  const bookingEquivalentDays =
    bookingHours / 8;

  let utilizationRate =
    (
      (
        allocationDays +
        bookingEquivalentDays
      ) /
      periodDays
    ) * 100;

  utilizationRate =
    clamp(
      utilizationRate,
      0,
      100
    );

  const idleDays =
    Math.max(
      0,
      periodDays -
      allocationDays -
      bookingEquivalentDays
    );

  return {
    asset,
    allocationDays,
    bookingHours,
    idleDays,
    utilizationRate
  };
}

function getUtilizationRecords() {
  return getFilteredAssets()
    .filter(isActiveAsset)
    .map(
      calculateAssetUtilization
    )
    .sort(
      (first, second) =>
        second.utilizationRate -
        first.utilizationRate
    );
}

function calculateComplianceRate(
  assets
) {
  if (
    assets.length === 0
  ) {
    return 0;
  }

  const compliant =
    assets.filter((asset) => {
      const status =
        normalizeStatus(
          asset.status
        );

      const hasTag =
        Boolean(
          asset.asset_tag ||
          asset.tag
        );

      const hasCategory =
        Boolean(
          getAssetCategoryId(asset) ||
          asset.category_name
        );

      const acceptableStatus =
        ![
          "lost",
          "disposed"
        ].includes(status);

      return (
        hasTag &&
        hasCategory &&
        acceptableStatus
      );
    });

  return (
    compliant.length /
    assets.length
  ) * 100;
}

function renderReportSummary() {
  const assets =
    getFilteredAssets();

  const activeAssets =
    assets.filter(
      isActiveAsset
    );

  const utilizationRecords =
    getUtilizationRecords();

  const maintenance =
    getFilteredMaintenance();

  const maintenanceCost =
    sum(
      maintenance
        .filter(
          isMaintenanceCompleted
        )
        .map(
          getMaintenanceCost
        )
    );

  const acquisitionValue =
    sum(
      assets.map(
        getAssetPurchaseCost
      )
    );

  const offlineAssets =
    assets.filter(
      (asset) =>
        normalizeStatus(
          asset.status
        ) ===
        "under maintenance"
    );

  const summary = {
    total_assets:
      assets.length,

    total_value:
      formatCompactCurrency(
        acquisitionValue
      ),

    utilization_rate:
      formatPercentage(
        average(
          utilizationRecords.map(
            (record) =>
              record.utilizationRate
          )
        )
      ),

    maintenance_cost:
      formatCompactCurrency(
        maintenanceCost
      ),

    offline_assets:
      offlineAssets.length,

    compliance_rate:
      formatPercentage(
        calculateComplianceRate(
          activeAssets
        )
      )
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-report-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              value;

            element.classList.add(
              "reports-data-enter"
            );
          });
      }
    );
}

/* =========================================================
   CHART HELPERS
   ========================================================= */

function getCSSVariable(
  name,
  fallback
) {
  const value =
    getComputedStyle(
      document.documentElement
    )
      .getPropertyValue(name)
      .trim();

  return value || fallback;
}

function getChartPalette() {
  return [
    getCSSVariable(
      "--color-primary",
      "#ff4f78"
    ),

    getCSSVariable(
      "--color-secondary",
      "#8b4de8"
    ),

    getCSSVariable(
      "--color-info",
      "#3b82f6"
    ),

    getCSSVariable(
      "--color-success",
      "#16a34a"
    ),

    getCSSVariable(
      "--color-warning",
      "#f59e0b"
    ),

    getCSSVariable(
      "--color-danger",
      "#dc2626"
    ),

    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#64748b"
  ];
}

function groupBy(
  collection,
  keyResolver
) {
  const map =
    new Map();

  collection.forEach((item) => {
    const key =
      keyResolver(item) ||
      "Unknown";

    map.set(
      key,
      (
        map.get(key) || []
      ).concat(item)
    );
  });

  return map;
}

function renderChartEmpty(
  container,
  title = "No chart data",
  description =
    "There is not enough information for this chart."
) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="report-chart-empty">
      <div
        class="report-chart-empty-icon"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
        >
          <path d="M4 19V9"></path>
          <path d="M10 19V5"></path>
          <path d="M16 19v-7"></path>
          <path d="M22 19V3"></path>
        </svg>
      </div>

      <h4>
        ${escapeHTML(title)}
      </h4>

      <p>
        ${escapeHTML(description)}
      </p>
    </div>
  `;
}

function renderDonutChart(
  container,
  legend,
  data,
  {
    centerLabel = "Total",
    valueFormatter =
      formatNumber
  } = {}
) {
  if (!container) {
    return;
  }

  const validData =
    data.filter(
      (item) =>
        Number(item.value) > 0
    );

  const total =
    sum(
      validData.map(
        (item) =>
          item.value
      )
    );

  if (
    validData.length === 0 ||
    total <= 0
  ) {
    renderChartEmpty(
      container
    );

    if (legend) {
      legend.innerHTML = "";
    }

    return;
  }

  const palette =
    getChartPalette();

  let cumulativeDegrees = 0;

  const segments =
    validData.map(
      (item, index) => {
        const color =
          item.color ||
          palette[
            index %
            palette.length
          ];

        const start =
          cumulativeDegrees;

        const degrees =
          (
            Number(item.value) /
            total
          ) * 360;

        cumulativeDegrees +=
          degrees;

        return {
          ...item,
          color,
          start,
          end:
            cumulativeDegrees
        };
      }
    );

  const gradient =
    segments
      .map(
        (segment) =>
          `${segment.color} ` +
          `${segment.start}deg ` +
          `${segment.end}deg`
      )
      .join(", ");

  container.innerHTML = `
    <div
      class="report-donut-visual reports-data-enter"
      style="
        background:
          conic-gradient(
            ${gradient}
          );
      "
    >
      <div class="report-donut-center">
        <strong>
          ${escapeHTML(
            valueFormatter(total)
          )}
        </strong>

        <span>
          ${escapeHTML(centerLabel)}
        </span>
      </div>
    </div>
  `;

  if (legend) {
    legend.innerHTML =
      segments
        .map((segment) => `
          <div class="report-chart-legend-item">
            <span
              class="report-chart-legend-marker"
              style="
                --legend-color:
                  ${segment.color};
              "
            ></span>

            <span class="report-chart-legend-content">
              <span class="report-chart-legend-label">
                ${escapeHTML(
                  segment.label
                )}
              </span>

              <strong class="report-chart-legend-value">
                ${escapeHTML(
                  valueFormatter(
                    segment.value
                  )
                )}
              </strong>
            </span>
          </div>
        `)
        .join("");
  }
}

function renderVerticalBarChart(
  container,
  data,
  {
    valueFormatter =
      formatNumber
  } = {}
) {
  if (!container) {
    return;
  }

  const validData =
    data
      .filter(
        (item) =>
          Number(item.value) >= 0
      )
      .slice(0, 10);

  if (
    validData.length === 0
  ) {
    renderChartEmpty(
      container
    );

    return;
  }

  const maximum =
    Math.max(
      1,
      ...validData.map(
        (item) =>
          Number(item.value)
      )
    );

  const palette =
    getChartPalette();

  container.innerHTML =
    validData
      .map((item, index) => {
        const height =
          clamp(
            (
              Number(item.value) /
              maximum
            ) * 100,
            2,
            100
          );

        return `
          <div class="report-bar-column reports-data-enter">
            <span class="report-bar-value">
              ${escapeHTML(
                valueFormatter(
                  item.value
                )
              )}
            </span>

            <div class="report-bar-track">
              <div
                class="report-bar-fill"
                style="
                  --bar-height:
                    ${height}%;

                  --bar-color:
                    ${
                      item.color ||
                      palette[
                        index %
                        palette.length
                      ]
                    };
                "
                title="${escapeHTML(
                  item.label
                )}: ${escapeHTML(
                  valueFormatter(
                    item.value
                  )
                )}"
              ></div>
            </div>

            <span
              class="report-bar-label"
              title="${escapeHTML(
                item.label
              )}"
            >
              ${escapeHTML(
                item.label
              )}
            </span>
          </div>
        `;
      })
      .join("");
}

function renderHorizontalChart(
  container,
  data,
  {
    valueFormatter =
      formatNumber
  } = {}
) {
  if (!container) {
    return;
  }

  const validData =
    data
      .filter(
        (item) =>
          Number(item.value) >= 0
      )
      .slice(0, 8);

  if (
    validData.length === 0
  ) {
    renderChartEmpty(
      container
    );

    return;
  }

  const maximum =
    Math.max(
      1,
      ...validData.map(
        (item) =>
          Number(item.value)
      )
    );

  const palette =
    getChartPalette();

  container.innerHTML =
    validData
      .map((item, index) => {
        const width =
          clamp(
            (
              Number(item.value) /
              maximum
            ) * 100,
            2,
            100
          );

        return `
          <div class="report-horizontal-item reports-data-enter">
            <span
              class="report-horizontal-label"
              title="${escapeHTML(
                item.label
              )}"
            >
              ${escapeHTML(
                item.label
              )}
            </span>

            <div class="report-horizontal-track">
              <div
                class="report-horizontal-fill"
                style="
                  --bar-width:
                    ${width}%;

                  --bar-color:
                    ${
                      item.color ||
                      palette[
                        index %
                        palette.length
                      ]
                    };
                "
              ></div>
            </div>

            <strong class="report-horizontal-value">
              ${escapeHTML(
                valueFormatter(
                  item.value
                )
              )}
            </strong>
          </div>
        `;
      })
      .join("");
}

function renderLineChart(
  container,
  series,
  {
    valueFormatter =
      formatNumber
  } = {}
) {
  if (!container) {
    return;
  }

  const activeSeries =
    series.filter(
      (item) =>
        Array.isArray(item.values) &&
        item.values.length > 0
    );

  if (
    activeSeries.length === 0
  ) {
    renderChartEmpty(
      container
    );

    return;
  }

  const length =
    Math.max(
      ...activeSeries.map(
        (item) =>
          item.values.length
      )
    );

  const labels =
    activeSeries[0].labels ||
    Array.from(
      {
        length
      },
      (_, index) =>
        String(index + 1)
    );

  const allValues =
    activeSeries
      .flatMap(
        (item) =>
          item.values
      )
      .map(Number)
      .filter(Number.isFinite);

  const maximum =
    Math.max(
      1,
      ...allValues
    );

  const width = 720;
  const height = 300;
  const padding = {
    top: 22,
    right: 22,
    bottom: 40,
    left: 48
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const xForIndex =
    (index) =>
      padding.left +
      (
        length <= 1
          ? chartWidth / 2
          : (
              index /
              (length - 1)
            ) *
            chartWidth
      );

  const yForValue =
    (value) =>
      padding.top +
      chartHeight -
      (
        Number(value) /
        maximum
      ) *
      chartHeight;

  const palette =
    getChartPalette();

  const gridLines =
    Array.from(
      {
        length: 5
      },
      (_, index) => {
        const ratio =
          index / 4;

        const y =
          padding.top +
          ratio *
          chartHeight;

        const value =
          maximum *
          (
            1 -
            ratio
          );

        return `
          <line
            x1="${padding.left}"
            y1="${y}"
            x2="${width - padding.right}"
            y2="${y}"
          ></line>

          <text
            class="report-line-axis-label"
            x="${padding.left - 8}"
            y="${y + 4}"
            text-anchor="end"
          >
            ${escapeHTML(
              valueFormatter(value)
            )}
          </text>
        `;
      }
    ).join("");

  const xLabels =
    labels
      .map((label, index) => {
        const show =
          labels.length <= 8 ||
          index %
          Math.ceil(
            labels.length / 8
          ) === 0 ||
          index ===
          labels.length - 1;

        if (!show) {
          return "";
        }

        return `
          <text
            class="report-line-axis-label"
            x="${xForIndex(index)}"
            y="${height - 12}"
            text-anchor="middle"
          >
            ${escapeHTML(label)}
          </text>
        `;
      })
      .join("");

  const paths =
    activeSeries
      .map((item, seriesIndex) => {
        const color =
          item.color ||
          palette[
            seriesIndex %
            palette.length
          ];

        const points =
          item.values
            .map(
              (value, index) =>
                `${xForIndex(index)},${yForValue(value)}`
            );

        const linePath =
          points
            .map(
              (point, index) =>
                `${
                  index === 0
                    ? "M"
                    : "L"
                } ${point}`
            )
            .join(" ");

        const areaPath =
          `${linePath} ` +
          `L ${xForIndex(
            item.values.length - 1
          )},${padding.top + chartHeight} ` +
          `L ${xForIndex(0)},${padding.top + chartHeight} Z`;

        const pointElements =
          item.values
            .map(
              (value, index) => `
                <circle
                  class="report-line-point"
                  cx="${xForIndex(index)}"
                  cy="${yForValue(value)}"
                  r="4"
                  style="
                    --line-color:
                      ${color};
                  "
                >
                  <title>
                    ${escapeHTML(
                      labels[index] ||
                      String(index + 1)
                    )}: ${escapeHTML(
                      valueFormatter(value)
                    )}
                  </title>
                </circle>
              `
            )
            .join("");

        return `
          ${
            seriesIndex === 0
              ? `
                <path
                  class="report-line-area"
                  d="${areaPath}"
                  style="
                    --line-area-color:
                      color-mix(
                        in srgb,
                        ${color} 14%,
                        transparent
                      );
                  "
                ></path>
              `
              : ""
          }

          <path
            class="report-line-path"
            d="${linePath}"
            style="
              --line-color:
                ${color};
            "
          ></path>

          ${pointElements}
        `;
      })
      .join("");

  const legend =
    activeSeries
      .map((item, index) => `
        <span
          class="report-line-legend-item"
          style="
            --legend-color:
              ${
                item.color ||
                palette[
                  index %
                  palette.length
                ]
              };
          "
        >
          ${escapeHTML(
            item.label ||
            `Series ${index + 1}`
          )}
        </span>
      `)
      .join("");

  container.innerHTML = `
    <div style="width: 100%;">
      <svg
        class="report-line-svg reports-data-enter"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        <g class="report-line-grid">
          ${gridLines}
        </g>

        ${paths}
        ${xLabels}
      </svg>

      <div class="report-line-legend">
        ${legend}
      </div>
    </div>
  `;
}

/* =========================================================
   TIME SERIES HELPERS
   ========================================================= */

function getMonthBuckets() {
  const start =
    new Date(
      reportsState.startDate
    );

  const end =
    new Date(
      reportsState.endDate
    );

  const buckets = [];

  const cursor =
    new Date(
      start.getFullYear(),
      start.getMonth(),
      1
    );

  while (
    cursor <= end &&
    buckets.length < 36
  ) {
    const bucketStart =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        1
      );

    const bucketEnd =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

    buckets.push({
      key:
        `${cursor.getFullYear()}-` +
        `${String(
          cursor.getMonth() + 1
        ).padStart(2, "0")}`,

      label:
        cursor.toLocaleDateString(
          "en-IN",
          {
            month: "short",
            year:
              buckets.length === 0 ||
              cursor.getMonth() === 0
                ? "2-digit"
                : undefined
          }
        ),

      start:
        bucketStart,

      end:
        bucketEnd
    });

    cursor.setMonth(
      cursor.getMonth() + 1
    );
  }

  return buckets;
}

/* =========================================================
   OVERVIEW CHARTS
   ========================================================= */

function renderOverviewCharts() {
  const assets =
    getFilteredAssets();

  const statusGroups =
    groupBy(
      assets,
      (asset) =>
        titleCase(
          asset.status ||
          "Unknown"
        )
    );

  renderDonutChart(
    document.getElementById(
      "assetStatusChart"
    ),

    document.getElementById(
      "assetStatusLegend"
    ),

    Array.from(
      statusGroups.entries()
    ).map(
      ([label, records]) => ({
        label,
        value:
          records.length
      })
    ),

    {
      centerLabel:
        "Assets"
    }
  );

  const categoryGroups =
    groupBy(
      assets,
      getAssetCategoryName
    );

  renderVerticalBarChart(
    document.getElementById(
      "assetCategoryChart"
    ),

    Array.from(
      categoryGroups.entries()
    )
      .map(
        ([label, records]) => ({
          label,
          value:
            records.length
        })
      )
      .sort(
        (first, second) =>
          second.value -
          first.value
      )
  );

  const departmentGroups =
    groupBy(
      assets,
      getAssetDepartmentName
    );

  renderHorizontalChart(
    document.getElementById(
      "departmentAssetsChart"
    ),

    Array.from(
      departmentGroups.entries()
    )
      .map(
        ([label, records]) => ({
          label,
          value:
            records.length
        })
      )
      .sort(
        (first, second) =>
          second.value -
          first.value
      )
  );

  renderMaintenanceTrend();
}

function renderMaintenanceTrend() {
  const buckets =
    getMonthBuckets();

  const maintenance =
    getFilteredMaintenance();

  const reportedValues =
    buckets.map((bucket) =>
      maintenance.filter((request) => {
        const reported =
          new Date(
            firstDefined(
              request,
              [
                "reported_at",
                "reported_date",
                "created_at"
              ]
            )
          );

        return (
          reported >=
            bucket.start &&
          reported <=
            bucket.end
        );
      }).length
    );

  const completedValues =
    buckets.map((bucket) =>
      maintenance.filter((request) => {
        if (
          !isMaintenanceCompleted(
            request
          )
        ) {
          return false;
        }

        const completed =
          new Date(
            firstDefined(
              request,
              [
                "completed_at",
                "completed_date",
                "resolved_at",
                "updated_at"
              ]
            )
          );

        return (
          completed >=
            bucket.start &&
          completed <=
            bucket.end
        );
      }).length
    );

  renderLineChart(
    document.getElementById(
      "maintenanceTrendChart"
    ),

    [
      {
        label:
          "Reported",

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values:
          reportedValues
      },

      {
        label:
          "Completed",

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values:
          completedValues
      }
    ]
  );
}

/* =========================================================
   OVERVIEW INSIGHTS
   ========================================================= */

function renderReportInsights() {
  const utilization =
    getUtilizationRecords();

  const categoryUtilization =
    groupBy(
      utilization,
      (record) =>
        getAssetCategoryName(
          record.asset
        )
    );

  const mostUtilizedCategory =
    Array.from(
      categoryUtilization.entries()
    )
      .map(
        ([name, records]) => ({
          name,

          rate:
            average(
              records.map(
                (record) =>
                  record.utilizationRate
              )
            )
        })
      )
      .sort(
        (first, second) =>
          second.rate -
          first.rate
      )[0];

  const maintenanceByAsset =
    groupBy(
      getFilteredMaintenance(),
      (request) =>
        String(
          getRelatedAssetId(
            request
          )
        )
    );

  const highestMaintenanceAsset =
    Array.from(
      maintenanceByAsset.entries()
    )
      .map(
        ([assetId, requests]) => ({
          asset:
            findAssetById(
              assetId
            ),

          cost:
            sum(
              requests.map(
                getMaintenanceCost
              )
            )
        })
      )
      .sort(
        (first, second) =>
          second.cost -
          first.cost
      )[0];

  const completedMaintenance =
    getFilteredMaintenance()
      .filter(
        isMaintenanceCompleted
      );

  const repairDurations =
    completedMaintenance
      .map((request) => {
        const reported =
          firstDefined(
            request,
            [
              "reported_at",
              "reported_date",
              "created_at"
            ]
          );

        const completed =
          firstDefined(
            request,
            [
              "completed_at",
              "completed_date",
              "resolved_at"
            ]
          );

        if (
          !reported ||
          !completed
        ) {
          return null;
        }

        return differenceInDays(
          reported,
          completed
        );
      })
      .filter(
        (value) =>
          value !== null
      );

  const offlineMaintenance =
    reportsState.maintenance
      .filter(
        (request) =>
          !isMaintenanceCompleted(
            request
          )
      )
      .map((request) => {
        const reported =
          firstDefined(
            request,
            [
              "reported_at",
              "reported_date",
              "created_at"
            ]
          );

        return {
          asset:
            getRelatedAsset(
              request
            ),

          days:
            reported
              ? differenceInDays(
                  reported,
                  new Date()
                )
              : 0
        };
      })
      .sort(
        (first, second) =>
          second.days -
          first.days
      )[0];

  const insightValues = {
    most_utilized_category:
      mostUtilizedCategory
        ? (
            `${mostUtilizedCategory.name} ` +
            `(${formatPercentage(
              mostUtilizedCategory.rate
            )})`
          )
        : "No utilization data",

    highest_maintenance_asset:
      highestMaintenanceAsset?.asset
        ? (
            `${getAssetName(
              highestMaintenanceAsset.asset
            )} · ` +
            `${formatCompactCurrency(
              highestMaintenanceAsset.cost
            )}`
          )
        : "No maintenance spend",

    average_repair_time:
      repairDurations.length
        ? formatDurationDays(
            average(
              repairDurations
            )
          )
        : "No completed repairs",

    longest_offline_asset:
      offlineMaintenance?.asset
        ? (
            `${getAssetName(
              offlineMaintenance.asset
            )} · ` +
            `${offlineMaintenance.days} days`
          )
        : "No offline assets"
  };

  Object.entries(
    insightValues
  ).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-report-insight="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            value;
        });
    }
  );
}

/* =========================================================
   INVENTORY TABLE
   ========================================================= */

function getInventoryRecords() {
  const search =
    normalizeText(
      reportsState.inventorySearch
    );

  return getFilteredAssets()
    .filter((asset) => {
      const searchableText = [
        getAssetName(asset),
        getAssetTag(asset),
        getAssetCategoryName(asset),
        getAssetDepartmentName(asset),
        getAssetLocationName(asset),
        asset.status,
        asset.serial_number
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesStatus =
        !reportsState
          .inventoryStatus ||
        normalizeStatus(
          asset.status
        ) ===
        normalizeStatus(
          reportsState
            .inventoryStatus
        );

      return (
        matchesSearch &&
        matchesStatus
      );
    })
    .sort(
      (first, second) =>
        getAssetName(first)
          .localeCompare(
            getAssetName(second)
          )
    );
}

function assetStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    available:
      "badge-success",

    allocated:
      "badge-info",

    "under maintenance":
      "badge-warning",

    retired:
      "badge-neutral",

    disposed:
      "badge-neutral",

    lost:
      "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function renderInventoryTable() {
  const records =
    getInventoryRecords();

  const total =
    records.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        REPORTS_CONFIG.PAGE_SIZE
      )
    );

  reportsState.inventoryPage =
    Math.min(
      reportsState.inventoryPage,
      totalPages
    );

  const startIndex =
    (
      reportsState.inventoryPage -
      1
    ) *
    REPORTS_CONFIG.PAGE_SIZE;

  const visibleRecords =
    records.slice(
      startIndex,
      startIndex +
      REPORTS_CONFIG.PAGE_SIZE
    );

  if (
    visibleRecords.length === 0
  ) {
    reportsElements
      .inventoryTableBody
      .innerHTML = "";

    reportsElements
      .inventoryTableContainer
      .hidden = true;

    reportsElements
      .inventoryEmptyState
      .hidden = false;

    updatePaginationSummary(
      reportsElements
        .inventoryPaginationSummary,
      0,
      0,
      0,
      "assets"
    );

    renderPagination(
      reportsElements
        .inventoryPagination,
      1,
      1,
      "inventory"
    );

    return;
  }

  reportsElements
    .inventoryTableContainer
    .hidden = false;

  reportsElements
    .inventoryEmptyState
    .hidden = true;

  reportsElements
    .inventoryTableBody
    .innerHTML =
    visibleRecords
      .map((asset) => {
        const id =
          getRecordId(asset);

        const status =
          titleCase(
            asset.status ||
            "Unknown"
          );

        const acquisitionDate =
          firstDefined(
            asset,
            [
              "purchase_date",
              "acquisition_date",
              "created_at"
            ]
          );

        return `
          <tr class="reports-data-enter">
            <td>
              <div class="report-asset-cell">
                <div
                  class="report-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div class="report-asset-content">
                  <div class="report-asset-name">
                    ${escapeHTML(
                      getAssetName(asset)
                    )}
                  </div>

                  <div class="report-asset-tag">
                    ${escapeHTML(
                      getAssetTag(asset)
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  getAssetCategoryName(
                    asset
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-table-secondary">
                ${escapeHTML(
                  getAssetDepartmentName(
                    asset
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-table-secondary">
                ${escapeHTML(
                  getAssetLocationName(
                    asset
                  )
                )}
              </span>
            </td>

            <td>
              <span
                class="badge badge-dot ${assetStatusBadgeClass(
                  status
                )}"
              >
                ${escapeHTML(status)}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  formatDate(
                    acquisitionDate
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-money-value">
                ${escapeHTML(
                  formatCurrency(
                    getAssetPurchaseCost(
                      asset
                    )
                  )
                )}
              </span>
            </td>

            <td class="text-right">
              <a
                class="btn btn-outline btn-sm"
                href="../asset-registration/index.html?asset_id=${encodeURIComponent(
                  id
                )}"
              >
                View
              </a>
            </td>
          </tr>
        `;
      })
      .join("");

  updatePaginationSummary(
    reportsElements
      .inventoryPaginationSummary,

    startIndex + 1,

    Math.min(
      startIndex +
      REPORTS_CONFIG.PAGE_SIZE,
      total
    ),

    total,
    "assets"
  );

  renderPagination(
    reportsElements
      .inventoryPagination,

    reportsState.inventoryPage,
    totalPages,
    "inventory"
  );
}

/* =========================================================
   UTILIZATION REPORT
   ========================================================= */

function utilizationPerformance(
  rate
) {
  if (rate >= 70) {
    return {
      label: "High",
      className: "high"
    };
  }

  if (rate >= 35) {
    return {
      label: "Moderate",
      className: "medium"
    };
  }

  return {
    label: "Low",
    className: "low"
  };
}

function getSelectedUtilizationValue(
  record
) {
  switch (
    reportsState.utilizationMetric
  ) {
    case "allocation":
      return (
        record.allocationDays /
        Math.max(
          1,
          differenceInDays(
            reportsState.startDate,
            reportsState.endDate
          ) + 1
        )
      ) * 100;

    case "booking":
      return clamp(
        (
          record.bookingHours /
          (
            Math.max(
              1,
              differenceInDays(
                reportsState.startDate,
                reportsState.endDate
              ) + 1
            ) *
            8
          )
        ) *
        100,
        0,
        100
      );

    case "overall":
    default:
      return record.utilizationRate;
  }
}

function renderUtilizationReport() {
  const records =
    getUtilizationRecords();

  renderUtilizationTrend(
    records
  );

  const groupedByCategory =
    groupBy(
      records,
      (record) =>
        getAssetCategoryName(
          record.asset
        )
    );

  renderHorizontalChart(
    document.getElementById(
      "categoryUtilizationChart"
    ),

    Array.from(
      groupedByCategory.entries()
    )
      .map(
        ([label, categoryRecords]) => ({
          label,

          value:
            average(
              categoryRecords.map(
                getSelectedUtilizationValue
              )
            )
        })
      )
      .sort(
        (first, second) =>
          second.value -
          first.value
      ),

    {
      valueFormatter:
        (value) =>
          formatPercentage(value)
    }
  );

  renderUnderutilizedAssets(
    records
  );

  renderUtilizationTable(
    records
  );
}

function renderUtilizationTrend(
  records
) {
  const buckets =
    getMonthBuckets();

  const values =
    buckets.map((bucket) => {
      const periodStartBackup =
        reportsState.startDate;

      const periodEndBackup =
        reportsState.endDate;

      reportsState.startDate =
        dateToISO(
          bucket.start
        );

      reportsState.endDate =
        dateToISO(
          bucket.end
        );

      const monthlyValues =
        records.map((record) =>
          getSelectedUtilizationValue(
            calculateAssetUtilization(
              record.asset
            )
          )
        );

      reportsState.startDate =
        periodStartBackup;

      reportsState.endDate =
        periodEndBackup;

      return average(
        monthlyValues
      );
    });

  renderLineChart(
    document.getElementById(
      "utilizationTrendChart"
    ),

    [
      {
        label:
          titleCase(
            reportsState
              .utilizationMetric
          ),

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values
      }
    ],

    {
      valueFormatter:
        (value) =>
          `${Math.round(value)}%`
    }
  );
}

function renderUnderutilizedAssets(
  records
) {
  const lowest =
    [...records]
      .sort(
        (first, second) =>
          getSelectedUtilizationValue(
            first
          ) -
          getSelectedUtilizationValue(
            second
          )
      )
      .slice(0, 5);

  if (
    lowest.length === 0
  ) {
    reportsElements
      .underutilizedList
      .innerHTML = `
        <div class="report-chart-empty">
          <h4>
            No utilization data
          </h4>

          <p>
            Asset activity will appear after allocations or bookings.
          </p>
        </div>
      `;

    return;
  }

  reportsElements
    .underutilizedList
    .innerHTML =
    lowest
      .map((record, index) => `
        <div class="report-ranking-item reports-data-enter">
          <span class="report-ranking-position">
            ${index + 1}
          </span>

          <div class="report-ranking-content">
            <div class="report-ranking-name">
              ${escapeHTML(
                getAssetName(
                  record.asset
                )
              )}
            </div>

            <div class="report-ranking-meta">
              ${escapeHTML(
                getAssetCategoryName(
                  record.asset
                )
              )}
              ·
              ${escapeHTML(
                getAssetTag(
                  record.asset
                )
              )}
            </div>
          </div>

          <strong class="report-ranking-value">
            ${escapeHTML(
              formatPercentage(
                getSelectedUtilizationValue(
                  record
                )
              )
            )}
          </strong>
        </div>
      `)
      .join("");
}

function renderUtilizationTable(
  records
) {
  if (
    records.length === 0
  ) {
    reportsElements
      .utilizationTableBody
      .innerHTML = "";

    reportsElements
      .utilizationTableContainer
      .hidden = true;

    reportsElements
      .utilizationEmptyState
      .hidden = false;

    return;
  }

  reportsElements
    .utilizationTableContainer
    .hidden = false;

  reportsElements
    .utilizationEmptyState
    .hidden = true;

  reportsElements
    .utilizationTableBody
    .innerHTML =
    records
      .map((record) => {
        const rate =
          getSelectedUtilizationValue(
            record
          );

        const performance =
          utilizationPerformance(
            rate
          );

        return `
          <tr class="reports-data-enter">
            <td>
              <div class="report-asset-cell">
                <div
                  class="report-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div class="report-asset-content">
                  <div class="report-asset-name">
                    ${escapeHTML(
                      getAssetName(
                        record.asset
                      )
                    )}
                  </div>

                  <div class="report-asset-tag">
                    ${escapeHTML(
                      getAssetTag(
                        record.asset
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="report-table-secondary">
                ${escapeHTML(
                  getAssetDepartmentName(
                    record.asset
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  record.allocationDays
                    .toFixed(0)
                )}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  record.bookingHours
                    .toFixed(1)
                )}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  record.idleDays
                    .toFixed(0)
                )}
              </span>
            </td>

            <td>
              <div class="report-utilization-cell">
                <div class="report-utilization-header">
                  <span>
                    Utilization
                  </span>

                  <strong class="report-utilization-value">
                    ${escapeHTML(
                      formatPercentage(
                        rate
                      )
                    )}
                  </strong>
                </div>

                <div class="report-utilization-track">
                  <div
                    class="report-utilization-fill"
                    style="
                      --utilization-width:
                        ${clamp(
                          rate,
                          0,
                          100
                        )}%;
                    "
                  ></div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="report-performance-badge ${performance.className}"
              >
                ${performance.label}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   FINANCIAL REPORT
   ========================================================= */

function getAssetMaintenanceCost(
  asset
) {
  const assetId =
    String(
      getRecordId(asset)
    );

  return sum(
    getFilteredMaintenance()
      .filter(
        (request) =>
          String(
            getRelatedAssetId(
              request
            )
          ) === assetId
      )
      .map(
        getMaintenanceCost
      )
  );
}

function getFinancialRecords() {
  return getFilteredAssets()
    .map((asset) => {
      const acquisitionCost =
        getAssetPurchaseCost(
          asset
        );

      const currentValue =
        getAssetCurrentValue(
          asset
        );

      const maintenanceCost =
        getAssetMaintenanceCost(
          asset
        );

      const depreciation =
        Math.max(
          0,
          acquisitionCost -
          currentValue
        );

      const totalCostOfOwnership =
        acquisitionCost +
        maintenanceCost;

      return {
        asset,
        acquisitionCost,
        currentValue,
        depreciation,
        maintenanceCost,
        totalCostOfOwnership
      };
    })
    .sort(
      (first, second) =>
        second.totalCostOfOwnership -
        first.totalCostOfOwnership
    );
}

function renderFinancialReport() {
  if (
    !canViewManagementReports()
  ) {
    return;
  }

  const records =
    getFinancialRecords();

  const summary = {
    gross_value:
      formatCurrency(
        sum(
          records.map(
            (record) =>
              record.acquisitionCost
          )
        )
      ),

    current_value:
      formatCurrency(
        sum(
          records.map(
            (record) =>
              record.currentValue
          )
        )
      ),

    depreciation:
      formatCurrency(
        sum(
          records.map(
            (record) =>
              record.depreciation
          )
        )
      ),

    maintenance_spend:
      formatCurrency(
        sum(
          records.map(
            (record) =>
              record.maintenanceCost
          )
        )
      )
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-financial-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              value;
          });
      }
    );

  renderAssetValueTrend(
    records
  );

  const groupedByCategory =
    groupBy(
      records,
      (record) =>
        getAssetCategoryName(
          record.asset
        )
    );

  renderDonutChart(
    document.getElementById(
      "categoryValueChart"
    ),

    document.getElementById(
      "categoryValueLegend"
    ),

    Array.from(
      groupedByCategory.entries()
    )
      .map(
        ([label, categoryRecords]) => ({
          label,

          value:
            sum(
              categoryRecords.map(
                (record) =>
                  record.currentValue
              )
            )
        })
      )
      .sort(
        (first, second) =>
          second.value -
          first.value
      ),

    {
      centerLabel:
        "Current Value",

      valueFormatter:
        formatCompactCurrency
    }
  );

  renderFinancialTable(
    records
  );
}

function renderAssetValueTrend(
  records
) {
  const buckets =
    getMonthBuckets();

  const acquisitionValues =
    buckets.map((bucket) =>
      sum(
        records
          .filter((record) => {
            const acquisitionDate =
              new Date(
                firstDefined(
                  record.asset,
                  [
                    "purchase_date",
                    "acquisition_date",
                    "created_at"
                  ]
                )
              );

            return (
              acquisitionDate <=
              bucket.end
            );
          })
          .map(
            (record) =>
              record.acquisitionCost
          )
      )
    );

  const currentValues =
    buckets.map((bucket) =>
      sum(
        records
          .filter((record) => {
            const acquisitionDate =
              new Date(
                firstDefined(
                  record.asset,
                  [
                    "purchase_date",
                    "acquisition_date",
                    "created_at"
                  ]
                )
              );

            return (
              acquisitionDate <=
              bucket.end
            );
          })
          .map(
            (record) =>
              record.currentValue
          )
      )
    );

  const maintenanceValues =
    buckets.map((bucket) =>
      sum(
        getFilteredMaintenance()
          .filter((request) => {
            const date =
              new Date(
                firstDefined(
                  request,
                  [
                    "completed_at",
                    "completed_date",
                    "reported_at",
                    "created_at"
                  ]
                )
              );

            return (
              date >= bucket.start &&
              date <= bucket.end
            );
          })
          .map(
            getMaintenanceCost
          )
      )
    );

  renderLineChart(
    document.getElementById(
      "assetValueTrendChart"
    ),

    [
      {
        label:
          "Acquisition Value",

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values:
          acquisitionValues
      },

      {
        label:
          "Current Value",

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values:
          currentValues
      },

      {
        label:
          "Maintenance Spend",

        labels:
          buckets.map(
            (bucket) =>
              bucket.label
          ),

        values:
          maintenanceValues
      }
    ],

    {
      valueFormatter:
        formatCompactCurrency
    }
  );
}

function renderFinancialTable(
  records
) {
  if (
    records.length === 0
  ) {
    reportsElements
      .financialTableBody
      .innerHTML = "";

    reportsElements
      .financialTableContainer
      .hidden = true;

    reportsElements
      .financialEmptyState
      .hidden = false;

    return;
  }

  reportsElements
    .financialTableContainer
    .hidden = false;

  reportsElements
    .financialEmptyState
    .hidden = true;

  reportsElements
    .financialTableBody
    .innerHTML =
    records
      .map((record) => {
        const valueRatio =
          record.acquisitionCost > 0
            ? (
                record.currentValue /
                record.acquisitionCost
              ) * 100
            : 0;

        let valueStatus =
          "Healthy";

        let badgeClass =
          "badge-success";

        if (valueRatio < 25) {
          valueStatus =
            "Low Residual Value";

          badgeClass =
            "badge-danger";
        } else if (
          valueRatio < 50
        ) {
          valueStatus =
            "Depreciated";

          badgeClass =
            "badge-warning";
        }

        return `
          <tr class="reports-data-enter">
            <td>
              <div class="report-asset-cell">
                <div
                  class="report-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div class="report-asset-content">
                  <div class="report-asset-name">
                    ${escapeHTML(
                      getAssetName(
                        record.asset
                      )
                    )}
                  </div>

                  <div class="report-asset-tag">
                    ${escapeHTML(
                      getAssetTag(
                        record.asset
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="report-money-value">
                ${escapeHTML(
                  formatCurrency(
                    record.acquisitionCost
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(
                  formatDate(
                    firstDefined(
                      record.asset,
                      [
                        "purchase_date",
                        "acquisition_date",
                        "created_at"
                      ]
                    )
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-money-value">
                ${escapeHTML(
                  formatCurrency(
                    record.currentValue
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-money-value">
                ${escapeHTML(
                  formatCurrency(
                    record.maintenanceCost
                  )
                )}
              </span>
            </td>

            <td>
              <span class="report-money-value">
                ${escapeHTML(
                  formatCurrency(
                    record.totalCostOfOwnership
                  )
                )}
              </span>
            </td>

            <td>
              <span class="badge badge-dot ${badgeClass}">
                ${escapeHTML(
                  valueStatus
                )}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   AUDIT REPORT
   ========================================================= */

function getAuditAction(log) {
  return titleCase(
    firstDefined(
      log,
      [
        "action",
        "event",
        "activity_type",
        "type"
      ],
      "Updated"
    )
  );
}

function getAuditEntity(log) {
  return titleCase(
    firstDefined(
      log,
      [
        "entity_type",
        "entity",
        "resource_type",
        "module"
      ],
      "System"
    )
  );
}

function getAuditUser(log) {
  const user =
    getRelatedUser(log);

  return {
    name:
      user?.name ||
      user?.full_name ||
      log.user_name ||
      log.actor_name ||
      "System",

    email:
      user?.email ||
      log.user_email ||
      ""
  };
}

function getFilteredAuditRecords() {
  const search =
    normalizeText(
      reportsState.auditSearch
    );

  return getFilteredAuditLogs()
    .filter((log) => {
      const user =
        getAuditUser(log);

      const searchableText = [
        user.name,
        user.email,
        getAuditAction(log),
        getAuditEntity(log),
        log.record_name,
        log.details,
        log.description,
        log.source,
        log.ip_address
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesAction =
        !reportsState
          .auditActionFilter ||
        normalizeStatus(
          getAuditAction(log)
        ).includes(
          normalizeStatus(
            reportsState
              .auditActionFilter
          )
        );

      const matchesEntity =
        !reportsState
          .auditEntityFilter ||
        normalizeStatus(
          getAuditEntity(log)
        ) ===
        normalizeStatus(
          reportsState
            .auditEntityFilter
        );

      return (
        matchesSearch &&
        matchesAction &&
        matchesEntity
      );
    })
    .sort(
      (first, second) =>
        new Date(
          first.timestamp ||
          first.created_at ||
          0
        ) -
        new Date(
          second.timestamp ||
          second.created_at ||
          0
        )
    )
    .reverse();
}

function auditActionBadgeClass(
  action
) {
  const normalized =
    normalizeStatus(action);

  if (
    normalized.includes(
      "delete"
    )
  ) {
    return "badge-danger";
  }

  if (
    normalized.includes(
      "create"
    ) ||
    normalized.includes(
      "approve"
    ) ||
    normalized.includes(
      "complete"
    )
  ) {
    return "badge-success";
  }

  if (
    normalized.includes(
      "maintenance"
    ) ||
    normalized.includes(
      "return"
    )
  ) {
    return "badge-warning";
  }

  if (
    normalized.includes(
      "allocate"
    ) ||
    normalized.includes(
      "transfer"
    )
  ) {
    return "badge-primary";
  }

  return "badge-info";
}

function renderAuditReport() {
  if (
    !canViewManagementReports()
  ) {
    return;
  }

  const allRecords =
    getFilteredAuditLogs();

  const violations =
    allRecords.filter((log) =>
      normalizeText(
        log.severity ||
        log.status ||
        log.action
      ).includes(
        "violation"
      )
    );

  const attention =
    allRecords.filter((log) => {
      const severity =
        normalizeText(
          log.severity ||
          log.status
        );

      return [
        "warning",
        "attention",
        "pending"
      ].some(
        (value) =>
          severity.includes(value)
      );
    });

  const assets =
    getFilteredAssets();

  const compliantAssets =
    Math.round(
      assets.length *
      (
        calculateComplianceRate(
          assets
        ) /
        100
      )
    );

  const summary = {
    compliant:
      compliantAssets,

    attention:
      attention.length,

    violations:
      violations.length,

    events:
      allRecords.length
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-audit-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              formatNumber(value);
          });
      }
    );

  renderAuditTable();
}

function renderAuditTable() {
  const records =
    getFilteredAuditRecords();

  const total =
    records.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        REPORTS_CONFIG.PAGE_SIZE
      )
    );

  reportsState.auditPage =
    Math.min(
      reportsState.auditPage,
      totalPages
    );

  const startIndex =
    (
      reportsState.auditPage -
      1
    ) *
    REPORTS_CONFIG.PAGE_SIZE;

  const visible =
    records.slice(
      startIndex,
      startIndex +
      REPORTS_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    reportsElements
      .auditTableBody
      .innerHTML = "";

    reportsElements
      .auditTableContainer
      .hidden = true;

    reportsElements
      .auditEmptyState
      .hidden = false;

    updatePaginationSummary(
      reportsElements
        .auditPaginationSummary,
      0,
      0,
      0,
      "events"
    );

    renderPagination(
      reportsElements
        .auditPagination,
      1,
      1,
      "audit"
    );

    return;
  }

  reportsElements
    .auditTableContainer
    .hidden = false;

  reportsElements
    .auditEmptyState
    .hidden = true;

  reportsElements
    .auditTableBody
    .innerHTML =
    visible
      .map((log) => {
        const user =
          getAuditUser(log);

        const action =
          getAuditAction(log);

        const entity =
          getAuditEntity(log);

        return `
          <tr class="reports-data-enter">
            <td>
              <div class="report-table-stack">
                <span class="report-table-primary">
                  ${escapeHTML(
                    formatDateTime(
                      log.timestamp ||
                      log.created_at ||
                      log.occurred_at
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="audit-user-cell">
                <div
                  class="audit-user-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      user.name
                    )
                  )}
                </div>

                <div class="audit-user-content">
                  <div class="audit-user-name">
                    ${escapeHTML(
                      user.name
                    )}
                  </div>

                  <div class="audit-user-email">
                    ${escapeHTML(
                      user.email ||
                      "System account"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${auditActionBadgeClass(
                  action
                )}"
              >
                ${escapeHTML(action)}
              </span>
            </td>

            <td>
              <span class="report-table-primary">
                ${escapeHTML(entity)}
              </span>
            </td>

            <td>
              <div class="report-table-stack">
                <span class="report-table-primary">
                  ${escapeHTML(
                    log.record_name ||
                    log.entity_name ||
                    log.resource_name ||
                    `#${log.entity_id || log.record_id || "—"}`
                  )}
                </span>

                <span class="report-table-secondary">
                  ${escapeHTML(
                    log.entity_id ||
                    log.record_id ||
                    ""
                  )}
                </span>
              </div>
            </td>

            <td>
              <p class="audit-details-cell">
                ${escapeHTML(
                  log.details ||
                  log.description ||
                  log.message ||
                  "No additional details."
                )}
              </p>
            </td>

            <td>
              <span class="audit-source">
                ${escapeHTML(
                  log.source ||
                  log.ip_address ||
                  "Web Application"
                )}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

  updatePaginationSummary(
    reportsElements
      .auditPaginationSummary,

    startIndex + 1,

    Math.min(
      startIndex +
      REPORTS_CONFIG.PAGE_SIZE,
      total
    ),

    total,
    "events"
  );

  renderPagination(
    reportsElements
      .auditPagination,

    reportsState.auditPage,
    totalPages,
    "audit"
  );
}

/* =========================================================
   PAGINATION HELPERS
   ========================================================= */

function updatePaginationSummary(
  element,
  start,
  end,
  total,
  noun
) {
  if (!element) {
    return;
  }

  element.textContent =
    total === 0
      ? `Showing 0 ${noun}`
      : `Showing ${start}–${end} of ${total} ${noun}`;
}

function renderPagination(
  container,
  currentPage,
  totalPages,
  type
) {
  if (!container) {
    return;
  }

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const pages = [];

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    if (
      page === 1 ||
      page === totalPages ||
      Math.abs(
        page - currentPage
      ) <= 1
    ) {
      pages.push(page);
    }
  }

  const buttons = [];
  let previous = 0;

  pages.forEach((page) => {
    if (
      previous &&
      page - previous > 1
    ) {
      buttons.push(`
        <span class="pagination-ellipsis">
          …
        </span>
      `);
    }

    buttons.push(`
      <button
        type="button"
        class="pagination-button ${
          page === currentPage
            ? "active"
            : ""
        }"
        data-${type}-page="${page}"
        ${
          page === currentPage
            ? 'aria-current="page"'
            : ""
        }
      >
        ${page}
      </button>
    `);

    previous = page;
  });

  container.innerHTML = `
    <button
      type="button"
      class="pagination-button"
      data-${type}-page="${
        currentPage - 1
      }"
      aria-label="Previous page"
      ${
        currentPage <= 1
          ? "disabled"
          : ""
      }
    >
      ‹
    </button>

    ${buttons.join("")}

    <button
      type="button"
      class="pagination-button"
      data-${type}-page="${
        currentPage + 1
      }"
      aria-label="Next page"
      ${
        currentPage >= totalPages
          ? "disabled"
          : ""
      }
    >
      ›
    </button>
  `;
}

/* =========================================================
   FULL PAGE RENDER
   ========================================================= */

function renderReportsPage() {
  populateReportOptions();
  renderActiveFilterChips();
  renderReportSummary();
  renderOverviewCharts();
  renderReportInsights();
  renderInventoryTable();
  renderUtilizationReport();
  renderFinancialReport();
  renderAuditReport();
  enforceReportPermissions();
}

/* =========================================================
   TABS
   ========================================================= */

function activateReportTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "overview",
    "inventory",
    "utilization",
    "financial",
    "audit"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName =
      "overview";
  }

  if (
    !canViewManagementReports() &&
    [
      "financial",
      "audit"
    ].includes(tabName)
  ) {
    tabName =
      "overview";
  }

  reportsState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-report-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .reportTab ===
        tabName;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-selected",
        String(active)
      );

      button.tabIndex =
        active ? 0 : -1;
    });

  document
    .querySelectorAll(
      "[data-report-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .reportPanel ===
        tabName;

      panel.classList.toggle(
        "active",
        active
      );

      panel.hidden =
        !active;
    });

  if (updateURL) {
    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "tab",
      tabName
    );

    window.history.replaceState(
      {},
      "",
      url
    );
  }
}

/* =========================================================
   FILTER APPLICATION
   ========================================================= */

function applyReportFilters() {
  const preset =
    reportsElements
      .periodPreset.value;

  reportsState.periodPreset =
    preset;

  if (preset === "custom") {
    reportsState.startDate =
      reportsElements
        .startDate.value;

    reportsState.endDate =
      reportsElements
        .endDate.value;
  } else {
    const range =
      getPeriodRange(preset);

    reportsState.startDate =
      range.start;

    reportsState.endDate =
      range.end;

    reportsElements.startDate.value =
      range.start;

    reportsElements.endDate.value =
      range.end;
  }

  if (
    !reportsState.startDate ||
    !reportsState.endDate
  ) {
    showToast(
      "Select both start and end dates.",
      "warning"
    );

    return;
  }

  if (
    reportsState.endDate <
    reportsState.startDate
  ) {
    showToast(
      "End date cannot be before the start date.",
      "danger"
    );

    return;
  }

  reportsState.departmentFilter =
    reportsElements
      .departmentFilter.value;

  reportsState.locationFilter =
    reportsElements
      .locationFilter.value;

  reportsState.categoryFilter =
    reportsElements
      .categoryFilter.value;

  reportsState.inventoryPage = 1;
  reportsState.auditPage = 1;

  renderReportsPage();

  showToast(
    "Report filters applied.",
    "success"
  );
}

function resetReportFilters() {
  reportsState.periodPreset =
    "current_year";

  reportsState.departmentFilter = "";
  reportsState.locationFilter = "";
  reportsState.categoryFilter = "";

  reportsState.inventorySearch = "";
  reportsState.inventoryStatus = "";
  reportsState.auditSearch = "";
  reportsState.auditActionFilter = "";
  reportsState.auditEntityFilter = "";

  reportsState.inventoryPage = 1;
  reportsState.auditPage = 1;

  reportsElements.periodPreset.value =
    "current_year";

  reportsElements.departmentFilter.value =
    "";

  reportsElements.locationFilter.value =
    "";

  reportsElements.categoryFilter.value =
    "";

  reportsElements.inventorySearch.value =
    "";

  reportsElements.inventoryStatus.value =
    "";

  reportsElements.auditSearch.value =
    "";

  reportsElements.auditActionFilter.value =
    "";

  reportsElements.auditEntityFilter.value =
    "";

  initializeReportPeriod();
  renderReportsPage();
}

function removeReportFilter(key) {
  switch (key) {
    case "department":
      reportsState.departmentFilter =
        "";

      reportsElements
        .departmentFilter.value =
        "";
      break;

    case "location":
      reportsState.locationFilter =
        "";

      reportsElements
        .locationFilter.value =
        "";
      break;

    case "category":
      reportsState.categoryFilter =
        "";

      reportsElements
        .categoryFilter.value =
        "";
      break;

    default:
      return;
  }

  reportsState.inventoryPage = 1;
  reportsState.auditPage = 1;

  renderReportsPage();
}

/* =========================================================
   EXPORT HELPERS
   ========================================================= */

function escapeCSVValue(value) {
  const stringValue =
    String(
      value ?? ""
    );

  if (
    /[",\n]/.test(
      stringValue
    )
  ) {
    return (
      `"${stringValue.replaceAll(
        '"',
        '""'
      )}"`
    );
  }

  return stringValue;
}

function downloadTextFile(
  content,
  filename,
  mimeType
) {
  const blob =
    new Blob(
      [content],
      {
        type: mimeType
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function rowsToCSV(
  headings,
  rows
) {
  return [
    headings,
    ...rows
  ]
    .map(
      (row) =>
        row
          .map(escapeCSVValue)
          .join(",")
    )
    .join("\n");
}

function getExportData(
  reportType
) {
  switch (reportType) {
    case "inventory": {
      const records =
        getInventoryRecords();

      return {
        title:
          "Asset Inventory Report",

        headings: [
          "Asset",
          "Asset Tag",
          "Category",
          "Department",
          "Location",
          "Status",
          "Acquisition Date",
          "Acquisition Cost",
          "Current Value"
        ],

        rows:
          records.map((asset) => [
            getAssetName(asset),
            getAssetTag(asset),
            getAssetCategoryName(asset),
            getAssetDepartmentName(asset),
            getAssetLocationName(asset),
            titleCase(
              asset.status ||
              "Unknown"
            ),

            formatDate(
              firstDefined(
                asset,
                [
                  "purchase_date",
                  "acquisition_date",
                  "created_at"
                ]
              )
            ),

            getAssetPurchaseCost(asset),
            getAssetCurrentValue(asset)
          ])
      };
    }

    case "utilization": {
      const records =
        getUtilizationRecords();

      return {
        title:
          "Asset Utilization Report",

        headings: [
          "Asset",
          "Asset Tag",
          "Category",
          "Department",
          "Allocation Days",
          "Booking Hours",
          "Idle Days",
          "Utilization Rate"
        ],

        rows:
          records.map((record) => [
            getAssetName(
              record.asset
            ),

            getAssetTag(
              record.asset
            ),

            getAssetCategoryName(
              record.asset
            ),

            getAssetDepartmentName(
              record.asset
            ),

            record.allocationDays,
            record.bookingHours,
            record.idleDays,
            getSelectedUtilizationValue(
              record
            )
          ])
      };
    }

    case "financial": {
      const records =
        getFinancialRecords();

      return {
        title:
          "Financial Asset Report",

        headings: [
          "Asset",
          "Asset Tag",
          "Acquisition Cost",
          "Current Value",
          "Depreciation",
          "Maintenance Cost",
          "Total Cost of Ownership"
        ],

        rows:
          records.map((record) => [
            getAssetName(
              record.asset
            ),

            getAssetTag(
              record.asset
            ),

            record.acquisitionCost,
            record.currentValue,
            record.depreciation,
            record.maintenanceCost,
            record.totalCostOfOwnership
          ])
      };
    }

    case "maintenance": {
      const records =
        getFilteredMaintenance();

      return {
        title:
          "Maintenance Report",

        headings: [
          "Asset",
          "Asset Tag",
          "Issue",
          "Priority",
          "Status",
          "Reported Date",
          "Completed Date",
          "Cost"
        ],

        rows:
          records.map((request) => {
            const asset =
              getRelatedAsset(
                request
              );

            return [
              getAssetName(asset),
              getAssetTag(asset),
              request.title ||
              request.issue_type ||
              "Maintenance Issue",

              titleCase(
                request.priority ||
                "Medium"
              ),

              titleCase(
                request.status ||
                "Reported"
              ),

              formatDate(
                request.reported_at ||
                request.reported_date ||
                request.created_at
              ),

              formatDate(
                request.completed_at ||
                request.completed_date ||
                request.resolved_at
              ),

              getMaintenanceCost(
                request
              )
            ];
          })
      };
    }

    case "audit": {
      const records =
        getFilteredAuditRecords();

      return {
        title:
          "Audit and Compliance Report",

        headings: [
          "Timestamp",
          "User",
          "Email",
          "Action",
          "Entity",
          "Record",
          "Details",
          "Source"
        ],

        rows:
          records.map((log) => {
            const user =
              getAuditUser(log);

            return [
              formatDateTime(
                log.timestamp ||
                log.created_at ||
                log.occurred_at
              ),

              user.name,
              user.email,
              getAuditAction(log),
              getAuditEntity(log),

              log.record_name ||
              log.entity_name ||
              log.entity_id ||
              log.record_id ||
              "",

              log.details ||
              log.description ||
              log.message ||
              "",

              log.source ||
              log.ip_address ||
              "Web Application"
            ];
          })
      };
    }

    case "overview":
    default: {
      const assets =
        getFilteredAssets();

      const utilization =
        getUtilizationRecords();

      return {
        title:
          "AssetFlow Executive Overview",

        headings: [
          "Metric",
          "Value"
        ],

        rows: [
          [
            "Total Assets",
            assets.length
          ],

          [
            "Acquisition Value",
            sum(
              assets.map(
                getAssetPurchaseCost
              )
            )
          ],

          [
            "Average Utilization Rate",
            average(
              utilization.map(
                (record) =>
                  record.utilizationRate
              )
            )
          ],

          [
            "Maintenance Cost",
            sum(
              getFilteredMaintenance()
                .map(
                  getMaintenanceCost
                )
            )
          ],

          [
            "Compliance Rate",
            calculateComplianceRate(
              assets
            )
          ]
        ]
      };
    }
  }
}

function buildReportFilename(
  reportType,
  extension
) {
  return (
    `assetflow-${reportType}-report-` +
    `${dateToISO(new Date())}.` +
    `${extension}`
  );
}

function exportReportAsCSV(
  reportType
) {
  const data =
    getExportData(
      reportType
    );

  const csv =
    rowsToCSV(
      data.headings,
      data.rows
    );

  downloadTextFile(
    csv,
    buildReportFilename(
      reportType,
      "csv"
    ),
    "text/csv;charset=utf-8;"
  );
}

function exportReportAsJSON(
  reportType
) {
  const data =
    getExportData(
      reportType
    );

  const payload = {
    report:
      data.title,

    generated_at:
      new Date().toISOString(),

    filters: {
      start_date:
        reportsState.startDate,

      end_date:
        reportsState.endDate,

      department_id:
        reportsState
          .departmentFilter ||
        null,

      location_id:
        reportsState
          .locationFilter ||
        null,

      category_id:
        reportsState
          .categoryFilter ||
        null
    },

    headings:
      data.headings,

    records:
      data.rows
  };

  downloadTextFile(
    JSON.stringify(
      payload,
      null,
      2
    ),

    buildReportFilename(
      reportType,
      "json"
    ),

    "application/json;charset=utf-8;"
  );
}

function exportReportAsPDF(
  reportType
) {
  const data =
    getExportData(
      reportType
    );

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=1000,height=760"
    );

  if (!printWindow) {
    showToast(
      "Allow pop-ups to export the PDF report.",
      "warning"
    );

    return;
  }

  const rows =
    data.rows
      .map((row) => `
        <tr>
          ${row
            .map(
              (value) => `
                <td>
                  ${escapeHTML(value)}
                </td>
              `
            )
            .join("")}
        </tr>
      `)
      .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />

      <title>
        ${escapeHTML(data.title)}
      </title>

      <style>
        body {
          margin: 32px;
          color: #202126;
          font-family: Arial, sans-serif;
        }

        h1 {
          margin: 0;
          font-size: 24px;
        }

        .meta {
          margin: 8px 0 24px;
          color: #667085;
          font-size: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        th,
        td {
          padding: 8px;
          border: 1px solid #e5e7eb;
          text-align: left;
          vertical-align: top;
        }

        th {
          background: #f8fafc;
          font-weight: 700;
        }

        tr:nth-child(even) {
          background: #fafafa;
        }

        @media print {
          body {
            margin: 12mm;
          }
        }
      </style>
    </head>

    <body>
      <h1>
        ${escapeHTML(data.title)}
      </h1>

      <p class="meta">
        Reporting period:
        ${escapeHTML(
          formatDate(
            reportsState.startDate
          )
        )}
        –
        ${escapeHTML(
          formatDate(
            reportsState.endDate
          )
        )}
        ·
        Generated:
        ${escapeHTML(
          formatDateTime(
            new Date()
          )
        )}
      </p>

      <table>
        <thead>
          <tr>
            ${data.headings
              .map(
                (heading) => `
                  <th>
                    ${escapeHTML(
                      heading
                    )}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>

      <script>
        window.addEventListener(
          "load",
          () => {
            window.print();
          }
        );
      <\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

function exportReport(
  reportType,
  format
) {
  if (
    [
      "financial",
      "audit"
    ].includes(
      reportType
    ) &&
    !canViewManagementReports()
  ) {
    showToast(
      "You do not have permission to export this report.",
      "danger"
    );

    return;
  }

  switch (format) {
    case "json":
      exportReportAsJSON(
        reportType
      );
      break;

    case "pdf":
      exportReportAsPDF(
        reportType
      );
      break;

    case "csv":
    default:
      exportReportAsCSV(
        reportType
      );
      break;
  }

  showToast(
    "Report export prepared successfully.",
    "success"
  );
}

/* =========================================================
   EXPORT FORM
   ========================================================= */

function resetExportForm() {
  reportsElements
    .exportForm.reset();

  document.getElementById(
    "exportReportType"
  ).value =
    reportsState.activeTab ===
      "overview"
      ? "overview"
      : reportsState.activeTab;

  document.getElementById(
    "exportReportStartDate"
  ).value =
    reportsState.startDate;

  document.getElementById(
    "exportReportEndDate"
  ).value =
    reportsState.endDate;

  reportsElements
    .exportError.hidden = true;

  reportsElements
    .exportError.textContent = "";
}

async function submitExportReport(
  event
) {
  event.preventDefault();

  const reportType =
    document.getElementById(
      "exportReportType"
    ).value;

  const format =
    reportsElements
      .exportForm
      .querySelector(
        '[name="export_format"]:checked'
      )?.value ||
    "csv";

  setButtonLoading(
    reportsElements
      .exportSubmitButton,
    true,
    "Preparing..."
  );

  try {
    exportReport(
      reportType,
      format
    );

    closeModal(
      reportsElements
        .exportModal
    );
  } catch (error) {
    reportsElements
      .exportError.hidden = false;

    reportsElements
      .exportError.textContent =
      error?.message ||
      "Unable to export the report.";
  } finally {
    setButtonLoading(
      reportsElements
        .exportSubmitButton,
      false
    );
  }
}

/* =========================================================
   CHART AND SECTION EXPORTS
   ========================================================= */

function exportChartData(
  chartType
) {
  const mapping = {
    asset_status:
      "overview",

    asset_category:
      "inventory",

    department_assets:
      "inventory",

    maintenance_trend:
      "maintenance"
  };

  exportReport(
    mapping[chartType] ||
    "overview",
    "csv"
  );
}

/* =========================================================
   SCHEDULED REPORT FORM
   ========================================================= */

function updateScheduleFrequencyFields() {
  const frequency =
    document.getElementById(
      "scheduledReportFrequency"
    ).value;

  const weekdayGroup =
    document.getElementById(
      "scheduledReportWeekdayGroup"
    );

  const monthDayGroup =
    document.getElementById(
      "scheduledReportMonthDayGroup"
    );

  weekdayGroup.hidden =
    frequency !== "weekly";

  monthDayGroup.hidden =
    ![
      "monthly",
      "quarterly"
    ].includes(frequency);
}

function resetScheduleReportForm() {
  reportsElements
    .scheduleForm.reset();

  document.getElementById(
    "scheduledReportType"
  ).value =
    reportsState.activeTab ===
      "overview"
      ? "overview"
      : reportsState.activeTab;

  document.getElementById(
    "scheduledReportFrequency"
  ).value =
    "monthly";

  document.getElementById(
    "scheduledReportTime"
  ).value =
    "09:00";

  document.getElementById(
    "scheduledReportMonthDay"
  ).value =
    "1";

  document.getElementById(
    "scheduledReportActive"
  ).checked =
    true;

  reportsElements
    .scheduleError.hidden =
    true;

  reportsElements
    .scheduleError.textContent =
    "";

  updateScheduleFrequencyFields();
}

function validateEmailRecipients(
  value
) {
  const recipients =
    String(value)
      .split(",")
      .map(
        (email) =>
          email.trim()
      )
      .filter(Boolean);

  const valid =
    recipients.every(
      (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(email)
    );

  return {
    valid:
      recipients.length > 0 &&
      valid,

    recipients
  };
}

async function submitScheduleReport(
  event
) {
  event.preventDefault();

  if (
    !canViewManagementReports()
  ) {
    return;
  }

  const form =
    reportsElements.scheduleForm;

  window.AssetFlowUtils
    ?.clearFormValidation?.(
      form
    );

  const requiredFields =
    Array.from(
      form.querySelectorAll(
        "[required]"
      )
    );

  let valid = true;

  requiredFields.forEach((field) => {
    if (
      !String(
        field.value
      ).trim()
    ) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          field,
          "This field is required."
        );

      valid = false;
    }
  });

  const recipientResult =
    validateEmailRecipients(
      document.getElementById(
        "scheduledReportRecipients"
      ).value
    );

  if (
    !recipientResult.valid
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "scheduledReportRecipients"
        ),
        "Enter valid email addresses separated by commas."
      );

    valid = false;
  }

  if (!valid) {
    return;
  }

  const frequency =
    document.getElementById(
      "scheduledReportFrequency"
    ).value;

  const payload = {
    name:
      document.getElementById(
        "scheduledReportName"
      ).value.trim(),

    report_type:
      document.getElementById(
        "scheduledReportType"
      ).value,

    format:
      document.getElementById(
        "scheduledReportFormat"
      ).value,

    frequency,

    delivery_time:
      document.getElementById(
        "scheduledReportTime"
      ).value,

    weekday:
      frequency === "weekly"
        ? Number(
            document.getElementById(
              "scheduledReportWeekday"
            ).value
          )
        : null,

    month_day:
      [
        "monthly",
        "quarterly"
      ].includes(frequency)
        ? Number(
            document.getElementById(
              "scheduledReportMonthDay"
            ).value
          )
        : null,

    recipients:
      recipientResult.recipients,

    is_active:
      document.getElementById(
        "scheduledReportActive"
      ).checked,

    filters: {
      start_date:
        reportsState.startDate,

      end_date:
        reportsState.endDate,

      department_id:
        reportsState
          .departmentFilter ||
        null,

      location_id:
        reportsState
          .locationFilter ||
        null,

      category_id:
        reportsState
          .categoryFilter ||
        null
    }
  };

  setButtonLoading(
    reportsElements
      .scheduleSubmitButton,
    true,
    "Creating..."
  );

  try {
    await requestWithFallback(
      REPORTS_CONFIG
        .ENDPOINTS
        .REPORT_SCHEDULES,

      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      reportsElements
        .scheduleModal
    );

    showToast(
      "Recurring report schedule created successfully.",
      "success"
    );
  } catch (error) {
    const applied =
      window.AssetFlowUtils
        ?.applyApiFieldError?.(
          form,
          error
        );

    if (!applied) {
      reportsElements
        .scheduleError.hidden =
        false;

      reportsElements
        .scheduleError.textContent =
        error?.message ||
        "Unable to create the report schedule.";
    }
  } finally {
    setButtonLoading(
      reportsElements
        .scheduleSubmitButton,
      false
    );
  }
}

/* =========================================================
   PAGE LOADING
   ========================================================= */

function setReportsLoading(
  loading
) {
  reportsState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "reports-page-loading",
    reportsState.loading
  );

  document.body.classList.toggle(
    "reports-refreshing",
    reportsState.loading
  );

  if (
    reportsElements.refreshButton
  ) {
    reportsElements.refreshButton.disabled =
      reportsState.loading;

    reportsElements.refreshButton.setAttribute(
      "aria-busy",
      String(
        reportsState.loading
      )
    );
  }
}

function showPageError(message) {
  reportsElements
    .errorAlert.hidden =
    false;

  reportsElements
    .errorMessage.textContent =
    message;
}

function hidePageError() {
  reportsElements
    .errorAlert.hidden =
    true;
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-reports-last-updated]"
    )
    .forEach((element) => {
      element.textContent =
        `Updated ${new Date().toLocaleTimeString(
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
   DATA LOADING
   ========================================================= */

async function loadReportsData({
  showSuccessToast = false
} = {}) {
  if (
    reportsState.loading
  ) {
    return;
  }

  reportsState.abortController
    ?.abort();

  reportsState.abortController =
    new AbortController();

  const signal =
    reportsState
      .abortController.signal;

  setReportsLoading(true);
  hidePageError();

  try {
    const results =
      await Promise.allSettled([
        fetchAssets(signal),
        fetchAllocations(signal),
        fetchBookings(signal),
        fetchMaintenance(signal),
        fetchCategories(signal),
        fetchDepartments(signal),
        fetchLocations(signal),
        fetchUsers(signal),
        fetchAuditLogs(signal)
      ]);

    const [
      assetsResult,
      allocationsResult,
      bookingsResult,
      maintenanceResult,
      categoriesResult,
      departmentsResult,
      locationsResult,
      usersResult,
      auditResult
    ] = results;

    if (
      assetsResult.status ===
      "rejected"
    ) {
      throw assetsResult.reason;
    }

    reportsState.assets =
      assetsResult.value;

    reportsState.allocations =
      allocationsResult.status ===
      "fulfilled"
        ? allocationsResult.value
        : [];

    reportsState.bookings =
      bookingsResult.status ===
      "fulfilled"
        ? bookingsResult.value
        : [];

    reportsState.maintenance =
      maintenanceResult.status ===
      "fulfilled"
        ? maintenanceResult.value
        : [];

    reportsState.categories =
      categoriesResult.status ===
      "fulfilled"
        ? categoriesResult.value
        : [];

    reportsState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    reportsState.locations =
      locationsResult.status ===
      "fulfilled"
        ? locationsResult.value
        : [];

    reportsState.users =
      usersResult.status ===
      "fulfilled"
        ? usersResult.value
        : [];

    reportsState.auditLogs =
      auditResult.status ===
      "fulfilled"
        ? auditResult.value
        : [];

    renderReportsPage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Reports refreshed successfully.",
        "success"
      );
    }
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "Reports loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load reports."
    );

    showToast(
      error?.message ||
      "Unable to load reports.",
      "danger"
    );
  } finally {
    setReportsLoading(false);
  }
}

/* =========================================================
   URL ACTIONS
   ========================================================= */

function processURLActions() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const tab =
    parameters.get("tab");

  const departmentId =
    parameters.get(
      "department_id"
    );

  const categoryId =
    parameters.get(
      "category_id"
    );

  const locationId =
    parameters.get(
      "location_id"
    );

  if (tab) {
    activateReportTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (departmentId) {
    reportsState.departmentFilter =
      departmentId;

    reportsElements
      .departmentFilter.value =
      departmentId;
  }

  if (categoryId) {
    reportsState.categoryFilter =
      categoryId;

    reportsElements
      .categoryFilter.value =
      categoryId;
  }

  if (locationId) {
    reportsState.locationFilter =
      locationId;

    reportsElements
      .locationFilter.value =
      locationId;
  }

  if (
    departmentId ||
    categoryId ||
    locationId
  ) {
    renderReportsPage();
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-report-tab]"
    );

  if (tab) {
    activateReportTab(
      tab.dataset.reportTab
    );

    return;
  }

  const applyFilters =
    event.target.closest(
      "[data-apply-report-filters]"
    );

  if (applyFilters) {
    applyReportFilters();
    return;
  }

  const resetFilters =
    event.target.closest(
      "[data-reset-report-filters]"
    );

  if (resetFilters) {
    resetReportFilters();
    return;
  }

  const removeFilter =
    event.target.closest(
      "[data-remove-report-filter]"
    );

  if (removeFilter) {
    removeReportFilter(
      removeFilter.dataset
        .removeReportFilter
    );

    return;
  }

  const inventoryPage =
    event.target.closest(
      "[data-inventory-page]"
    );

  if (inventoryPage) {
    const page =
      Number(
        inventoryPage.dataset
          .inventoryPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      reportsState.inventoryPage =
        page;

      renderInventoryTable();
    }

    return;
  }

  const auditPage =
    event.target.closest(
      "[data-audit-page]"
    );

  if (auditPage) {
    const page =
      Number(
        auditPage.dataset
          .auditPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      reportsState.auditPage =
        page;

      renderAuditTable();
    }

    return;
  }

  const openExport =
    event.target.closest(
      "[data-open-export-report]"
    );

  if (openExport) {
    resetExportForm();
    return;
  }

  const openSchedule =
    event.target.closest(
      "[data-schedule-report]"
    );

  if (openSchedule) {
    resetScheduleReportForm();
    return;
  }

  const exportSection =
    event.target.closest(
      "[data-export-section]"
    );

  if (exportSection) {
    exportReport(
      exportSection.dataset
        .exportSection,
      "csv"
    );

    return;
  }

  const exportChart =
    event.target.closest(
      "[data-export-chart]"
    );

  if (exportChart) {
    exportChartData(
      exportChart.dataset
        .exportChart
    );
  }
}

function bindReportsEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  reportsElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadReportsData({
          showSuccessToast: true
        });
      }
    );

  reportsElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadReportsData();
      }
    );

  reportsElements.periodPreset
    ?.addEventListener(
      "change",
      (event) => {
        const preset =
          event.target.value;

        reportsState.periodPreset =
          preset;

        updateCustomDateAvailability();

        if (
          preset !== "custom"
        ) {
          const range =
            getPeriodRange(preset);

          reportsElements.startDate.value =
            range.start;

          reportsElements.endDate.value =
            range.end;
        }
      }
    );

  reportsElements.inventorySearch
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            reportsState.inventorySearch =
              event.target.value;

            reportsState.inventoryPage =
              1;

            renderInventoryTable();
          },
          250
        ) ||
        ((event) => {
          reportsState.inventorySearch =
            event.target.value;

          reportsState.inventoryPage =
            1;

          renderInventoryTable();
        })
    );

  reportsElements.inventoryStatus
    ?.addEventListener(
      "change",
      (event) => {
        reportsState.inventoryStatus =
          event.target.value;

        reportsState.inventoryPage =
          1;

        renderInventoryTable();
      }
    );

  reportsElements.utilizationMetric
    ?.addEventListener(
      "change",
      (event) => {
        reportsState.utilizationMetric =
          event.target.value;

        renderUtilizationReport();
      }
    );

  reportsElements.financialGrouping
    ?.addEventListener(
      "change",
      (event) => {
        reportsState.financialGrouping =
          event.target.value;

        renderFinancialReport();
      }
    );

  reportsElements.auditSearch
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            reportsState.auditSearch =
              event.target.value;

            reportsState.auditPage =
              1;

            renderAuditTable();
          },
          250
        ) ||
        ((event) => {
          reportsState.auditSearch =
            event.target.value;

          reportsState.auditPage =
            1;

          renderAuditTable();
        })
    );

  reportsElements.auditActionFilter
    ?.addEventListener(
      "change",
      (event) => {
        reportsState.auditActionFilter =
          event.target.value;

        reportsState.auditPage =
          1;

        renderAuditTable();
      }
    );

  reportsElements.auditEntityFilter
    ?.addEventListener(
      "change",
      (event) => {
        reportsState.auditEntityFilter =
          event.target.value;

        reportsState.auditPage =
          1;

        renderAuditTable();
      }
    );

  reportsElements.exportForm
    ?.addEventListener(
      "submit",
      submitExportReport
    );

  reportsElements.scheduleForm
    ?.addEventListener(
      "submit",
      submitScheduleReport
    );

  document
    .getElementById(
      "scheduledReportFrequency"
    )
    ?.addEventListener(
      "change",
      updateScheduleFrequencyFields
    );

  window.addEventListener(
    "resize",
    window.AssetFlowUtils
      ?.debounce?.(
        () => {
          if (
            reportsState.initialized &&
            !reportsState.loading
          ) {
            renderOverviewCharts();
            renderUtilizationReport();
            renderFinancialReport();
          }
        },
        300
      ) ||
      (() => {})
  );
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeReportsHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "Reports & Analytics",

      subtitle:
        "Asset performance and compliance insights"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeReportsHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeReports() {
  if (
    reportsState.initialized
  ) {
    return;
  }

  reportsState.initialized =
    true;

  cacheReportsElements();
  initializeReportPeriod();
  enforceReportPermissions();
  bindReportsEvents();
  initializeReportsHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "overview";

  activateReportTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadReportsData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:reports-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    reportsState.abortController
      ?.abort();
  }
);

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeReports
  );
} else {
  initializeReports();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowReports =
  Object.freeze({
    initialize:
      initializeReports,

    refresh:
      loadReportsData,

    render:
      renderReportsPage,

    activateTab:
      activateReportTab,

    applyFilters:
      applyReportFilters,

    resetFilters:
      resetReportFilters,

    exportReport,

    exportSection(
      section,
      format = "csv"
    ) {
      exportReport(
        section,
        format
      );
    },

    getState() {
      return {
        ...reportsState,
        abortController:
          undefined
      };
    }
  });