/* =========================================================
   AssetFlow — Maintenance Management Controller
   File: frontend/maintenance/maintenance.js

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

const MAINTENANCE_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  MANAGER_ROLES: Object.freeze([
    "Admin",
    "AssetManager"
  ]),

  ENDPOINTS: Object.freeze({
    REQUESTS: [
      "/maintenance-requests",
      "/maintenance",
      "/asset-maintenance"
    ],

    SCHEDULES: [
      "/maintenance-schedules",
      "/preventive-maintenance",
      "/preventive-maintenance-schedules"
    ],

    ASSETS: [
      "/assets"
    ],

    USERS: [
      "/employees",
      "/users"
    ],

    DEPARTMENTS: [
      "/departments"
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const maintenanceState = {
  requests: [],
  schedules: [],
  assets: [],
  users: [],
  departments: [],

  activeTab: "requests",

  search: "",
  statusFilter: "",
  priorityFilter: "",
  technicianFilter: "",
  departmentFilter: "",

  scheduleStatusFilter: "",

  historyFrom: "",
  historyTo: "",

  currentPage: 1,

  selectedRequestId: null,
  selectedScheduleId: null,

  loading: false,
  initialized: false,

  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const maintenanceElements = {};

function cacheMaintenanceElements() {
  maintenanceElements.main =
    document.getElementById(
      "maintenanceMain"
    );

  maintenanceElements.errorAlert =
    document.getElementById(
      "maintenancePageErrorAlert"
    );

  maintenanceElements.errorMessage =
    document.getElementById(
      "maintenancePageErrorMessage"
    );

  maintenanceElements.refreshButton =
    document.querySelector(
      "[data-refresh-maintenance]"
    );

  maintenanceElements.retryButton =
    document.querySelector(
      "[data-retry-maintenance]"
    );

  maintenanceElements.searchInput =
    document.querySelector(
      "[data-maintenance-search]"
    );

  maintenanceElements.statusFilter =
    document.querySelector(
      "[data-maintenance-status-filter]"
    );

  maintenanceElements.priorityFilter =
    document.querySelector(
      "[data-maintenance-priority-filter]"
    );

  maintenanceElements.technicianFilter =
    document.querySelector(
      "[data-maintenance-technician-filter]"
    );

  maintenanceElements.departmentFilter =
    document.querySelector(
      "[data-maintenance-department-filter]"
    );

  maintenanceElements.scheduleStatusFilter =
    document.querySelector(
      "[data-maintenance-schedule-status-filter]"
    );

  maintenanceElements.historyFrom =
    document.querySelector(
      "[data-maintenance-history-from]"
    );

  maintenanceElements.historyTo =
    document.querySelector(
      "[data-maintenance-history-to]"
    );

  maintenanceElements.requestsTableBody =
    document.getElementById(
      "maintenanceRequestsTableBody"
    );

  maintenanceElements.requestsTableContainer =
    maintenanceElements.requestsTableBody
      ?.closest(".table-container");

  maintenanceElements.requestsEmptyState =
    document.getElementById(
      "maintenanceRequestsEmptyState"
    );

  maintenanceElements.pagination =
    document.querySelector(
      "[data-maintenance-pagination]"
    );

  maintenanceElements.paginationSummary =
    document.querySelector(
      "[data-maintenance-pagination-summary]"
    );

  maintenanceElements.scheduleGrid =
    document.getElementById(
      "maintenanceScheduleGrid"
    );

  maintenanceElements.scheduleEmptyState =
    document.getElementById(
      "maintenanceScheduleEmptyState"
    );

  maintenanceElements.historyTableBody =
    document.getElementById(
      "maintenanceHistoryTableBody"
    );

  maintenanceElements.historyTableContainer =
    maintenanceElements.historyTableBody
      ?.closest(".table-container");

  maintenanceElements.historyEmptyState =
    document.getElementById(
      "maintenanceHistoryEmptyState"
    );

  maintenanceElements.requestModal =
    document.getElementById(
      "maintenanceRequestModal"
    );

  maintenanceElements.requestForm =
    document.getElementById(
      "maintenanceRequestForm"
    );

  maintenanceElements.requestFormError =
    document.querySelector(
      "[data-maintenance-form-error]"
    );

  maintenanceElements.requestSubmitButton =
    document.getElementById(
      "maintenanceRequestSubmitButton"
    );

  maintenanceElements.assetSelect =
    document.getElementById(
      "maintenanceAssetId"
    );

  maintenanceElements.assetPreview =
    document.getElementById(
      "maintenanceAssetPreview"
    );

  maintenanceElements.requestTechnicianSelect =
    document.getElementById(
      "maintenanceTechnicianId"
    );

  maintenanceElements.updateModal =
    document.getElementById(
      "maintenanceUpdateModal"
    );

  maintenanceElements.updateForm =
    document.getElementById(
      "maintenanceUpdateForm"
    );

  maintenanceElements.updateFormError =
    document.querySelector(
      "[data-maintenance-update-error]"
    );

  maintenanceElements.updateSubmitButton =
    document.getElementById(
      "maintenanceUpdateSubmitButton"
    );

  maintenanceElements.updateTechnicianSelect =
    document.getElementById(
      "maintenanceUpdateTechnician"
    );

  maintenanceElements.completeModal =
    document.getElementById(
      "completeMaintenanceModal"
    );

  maintenanceElements.completeForm =
    document.getElementById(
      "completeMaintenanceForm"
    );

  maintenanceElements.completeFormError =
    document.querySelector(
      "[data-complete-maintenance-error]"
    );

  maintenanceElements.completeSubmitButton =
    document.getElementById(
      "completeMaintenanceSubmitButton"
    );

  maintenanceElements.preventiveModal =
    document.getElementById(
      "preventiveMaintenanceModal"
    );

  maintenanceElements.preventiveForm =
    document.getElementById(
      "preventiveMaintenanceForm"
    );

  maintenanceElements.preventiveFormError =
    document.querySelector(
      "[data-preventive-maintenance-error]"
    );

  maintenanceElements.preventiveSubmitButton =
    document.getElementById(
      "preventiveMaintenanceSubmitButton"
    );

  maintenanceElements.preventiveAssetSelect =
    document.getElementById(
      "preventiveAssetId"
    );

  maintenanceElements.preventiveTechnicianSelect =
    document.getElementById(
      "preventiveTechnicianId"
    );

  maintenanceElements.detailsModal =
    document.getElementById(
      "maintenanceDetailsModal"
    );
}

/* =========================================================
   GENERAL HELPERS
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

function formatDate(value) {
  if (!value) {
    return "—";
  }

  if (
    window.AssetFlowUtils?.formatDate
  ) {
    return window.AssetFlowUtils
      .formatDate(value);
  }

  const date = new Date(value);

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

  const date = new Date(value);

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

function formatRelativeTime(value) {
  if (
    window.AssetFlowUtils
      ?.getRelativeTime
  ) {
    return window.AssetFlowUtils
      .getRelativeTime(value);
  }

  return formatDateTime(value);
}

function formatCurrency(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }
  ).format(number);
}

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
}

function getInitials(name = "") {
  if (
    window.AssetFlowUtils?.getInitials
  ) {
    return window.AssetFlowUtils
      .getInitials(name);
  }

  const words = String(name)
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
    record?.maintenance_request_id ??
    record?.request_id ??
    record?.schedule_id ??
    record?.maintenance_schedule_id ??
    record?.asset_id ??
    record?.employee_id ??
    record?.user_id ??
    record?.department_id ??
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

function todayISO() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function addDaysISO(
  days,
  source = new Date()
) {
  const date = new Date(source);

  date.setDate(
    date.getDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function calculateDaysUntil(value) {
  if (!value) {
    return null;
  }

  const target = new Date(value);

  if (
    Number.isNaN(target.getTime())
  ) {
    return null;
  }

  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target - today) /
    (1000 * 60 * 60 * 24)
  );
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

function getCurrentUserId() {
  return getRecordId(
    getCurrentUser()
  );
}

function canManageMaintenance() {
  return MAINTENANCE_CONFIG
    .MANAGER_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function isMaintenanceReporter(
  request
) {
  const currentUser =
    getCurrentUser();

  if (!currentUser) {
    return false;
  }

  const reporter =
    getReporter(request);

  if (
    getRecordId(reporter) &&
    getCurrentUserId()
  ) {
    return (
      String(
        getRecordId(reporter)
      ) ===
      String(
        getCurrentUserId()
      )
    );
  }

  if (
    reporter?.email &&
    currentUser.email
  ) {
    return (
      normalizeText(
        reporter.email
      ) ===
      normalizeText(
        currentUser.email
      )
    );
  }

  return (
    normalizeText(
      reporter?.name
    ) ===
    normalizeText(
      currentUser.name
    )
  );
}

function canEditMaintenanceRequest(
  request
) {
  const status =
    normalizeStatus(
      request.status
    );

  return (
    canManageMaintenance() ||
    (
      isMaintenanceReporter(
        request
      ) &&
      ["reported"].includes(status)
    )
  );
}

function enforceMaintenancePermissions() {
  const canManage =
    canManageMaintenance();

  document
    .querySelectorAll(
      '[data-roles="Admin,AssetManager"]'
    )
    .forEach((element) => {
      element.hidden =
        !canManage;
    });

  const assignmentSection =
    document.querySelector(
      "[data-maintenance-assignment-section]"
    );

  if (assignmentSection) {
    assignmentSection.hidden =
      !canManage;
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
    data = await response.json();
  } else {
    const text = await response.text();

    data = text
      ? {
          message: text
        }
      : {};
  }

  if (!response.ok) {
    const error = new Error(
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

  const response = await fetch(
    `${getApiBaseURL()}${endpoint}`,
    {
      method,
      signal,

      headers: {
        Accept: "application/json",

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

  for (const endpoint of endpointList) {
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
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of possibleKeys) {
    if (
      Array.isArray(response?.[key])
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
    Array.isArray(response?.data)
  ) {
    return response.data;
  }

  if (
    Array.isArray(response?.items)
  ) {
    return response.items;
  }

  if (
    Array.isArray(response?.results)
  ) {
    return response.results;
  }

  return [];
}

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

/* =========================================================
   DATA FETCHING
   ========================================================= */

async function fetchMaintenanceRequests(
  signal
) {
  const response =
    await requestWithFallback(
      MAINTENANCE_CONFIG
        .ENDPOINTS.REQUESTS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    [
      "maintenance_requests",
      "requests",
      "maintenance"
    ]
  );
}

async function fetchMaintenanceSchedules(
  signal
) {
  try {
    const response =
      await requestWithFallback(
        MAINTENANCE_CONFIG
          .ENDPOINTS.SCHEDULES,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "maintenance_schedules",
        "schedules",
        "preventive_maintenance"
      ]
    );
  } catch (error) {
    if (
      [404, 405].includes(
        error.status
      )
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchAssets(signal) {
  const response =
    await requestWithFallback(
      MAINTENANCE_CONFIG
        .ENDPOINTS.ASSETS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    ["assets"]
  );
}

async function fetchUsers(signal) {
  try {
    const response =
      await requestWithFallback(
        MAINTENANCE_CONFIG
          .ENDPOINTS.USERS,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "employees",
        "users"
      ]
    );
  } catch (error) {
    if (
      [404, 405].includes(
        error.status
      )
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchDepartments(signal) {
  try {
    const response =
      await requestWithFallback(
        MAINTENANCE_CONFIG
          .ENDPOINTS.DEPARTMENTS,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      ["departments"]
    );
  } catch (error) {
    if (
      [404, 405].includes(
        error.status
      )
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchMaintenanceById(
  requestId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      requestId
    );

  const response =
    await requestWithFallback(
      [
        `/maintenance-requests/${encodedId}`,
        `/maintenance/${encodedId}`,
        `/asset-maintenance/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

async function fetchMaintenanceActivity(
  requestId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      requestId
    );

  try {
    const response =
      await requestWithFallback(
        [
          `/maintenance-requests/${encodedId}/activity`,
          `/maintenance-requests/${encodedId}/history`,
          `/maintenance/${encodedId}/history`,
          `/activity-logs?entity_type=Maintenance&entity_id=${encodedId}`
        ],
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "activity",
        "history",
        "logs",
        "activity_logs"
      ]
    );
  } catch (error) {
    if (
      [404, 405].includes(
        error.status
      )
    ) {
      return [];
    }

    throw error;
  }
}

/* =========================================================
   RECORD RESOLVERS
   ========================================================= */

function findAssetById(assetId) {
  return (
    maintenanceState.assets.find(
      (asset) =>
        String(
          getRecordId(asset)
        ) ===
        String(assetId)
    ) || null
  );
}

function findUserById(userId) {
  return (
    maintenanceState.users.find(
      (user) =>
        String(
          getRecordId(user)
        ) ===
        String(userId)
    ) || null
  );
}

function findDepartmentById(
  departmentId
) {
  return (
    maintenanceState.departments.find(
      (department) =>
        String(
          getRecordId(department)
        ) ===
        String(departmentId)
    ) || null
  );
}

function findRequestById(requestId) {
  return (
    maintenanceState.requests.find(
      (request) =>
        String(
          getRecordId(request)
        ) ===
        String(requestId)
    ) || null
  );
}

function findScheduleById(scheduleId) {
  return (
    maintenanceState.schedules.find(
      (schedule) =>
        String(
          getRecordId(schedule)
        ) ===
        String(scheduleId)
    ) || null
  );
}

function getAssetReference(record) {
  return (
    record?.asset ||
    record?.asset_record ||
    record?.asset_id ||
    null
  );
}

function getAsset(record) {
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

function getAssetId(record) {
  const reference =
    getAssetReference(record);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getAssetName(record) {
  const asset = getAsset(record);

  return (
    asset?.name ||
    record?.asset_name ||
    "Unnamed Asset"
  );
}

function getAssetTag(record) {
  const asset = getAsset(record);

  return (
    asset?.asset_tag ||
    asset?.tag ||
    record?.asset_tag ||
    record?.tag ||
    "No asset tag"
  );
}

function getAssetLocation(record) {
  const asset = getAsset(record);

  if (
    typeof asset?.location ===
    "object"
  ) {
    return (
      asset.location.name ||
      "Location not set"
    );
  }

  const locationId =
    asset?.location_id;

  return (
    asset?.location_name ||
    findDepartmentById(
      locationId
    )?.name ||
    record?.location_name ||
    "Location not set"
  );
}

function getReporterReference(request) {
  return (
    request?.reported_by ||
    request?.reporter ||
    request?.created_by ||
    request?.reported_by_id ||
    request?.reporter_id ||
    request?.created_by_id ||
    null
  );
}

function getReporter(request) {
  const reference =
    getReporterReference(request);

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

function getReporterName(request) {
  const reporter =
    getReporter(request);

  return (
    reporter?.name ||
    reporter?.full_name ||
    request?.reported_by_name ||
    request?.reporter_name ||
    request?.created_by_name ||
    "Unknown Reporter"
  );
}

function getTechnicianReference(record) {
  return (
    record?.technician ||
    record?.assigned_technician ||
    record?.assigned_to ||
    record?.technician_id ||
    record?.assigned_technician_id ||
    record?.assigned_to_id ||
    null
  );
}

function getTechnician(record) {
  const reference =
    getTechnicianReference(record);

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

function getTechnicianId(record) {
  const reference =
    getTechnicianReference(record);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getTechnicianName(record) {
  const technician =
    getTechnician(record);

  return (
    technician?.name ||
    technician?.full_name ||
    record?.technician_name ||
    record?.assigned_to_name ||
    "Unassigned"
  );
}

function getTechnicianRole(record) {
  const technician =
    getTechnician(record);

  return (
    technician?.job_title ||
    technician?.role ||
    record?.technician_role ||
    (
      getTechnicianId(record)
        ? "Maintenance Technician"
        : "Awaiting assignment"
    )
  );
}

function getDepartmentReference(record) {
  const reporter =
    getReporter(record);

  const asset =
    getAsset(record);

  return (
    record?.department ||
    record?.department_id ||
    reporter?.department ||
    reporter?.department_id ||
    asset?.department ||
    asset?.department_id ||
    null
  );
}

function getDepartmentId(record) {
  const reference =
    getDepartmentReference(record);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getDepartmentName(record) {
  const reference =
    getDepartmentReference(record);

  if (!reference) {
    return (
      record?.department_name ||
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
    record?.department_name ||
    "Unassigned"
  );
}

/* =========================================================
   STATUS HELPERS
   ========================================================= */

function getRequestStatus(request) {
  return titleCase(
    request.status ||
    "Reported"
  );
}

function getRequestPriority(request) {
  return titleCase(
    request.priority ||
    "Medium"
  );
}

function isCompletedRequest(request) {
  const status =
    normalizeStatus(
      request.status
    );

  return (
    [
      "completed",
      "resolved",
      "closed"
    ].includes(status) ||
    Boolean(
      request.completed_date ||
      request.completed_at ||
      request.resolved_at
    )
  );
}

function isCancelledRequest(request) {
  return [
    "cancelled",
    "canceled"
  ].includes(
    normalizeStatus(
      request.status
    )
  );
}

function isActiveRequest(request) {
  return (
    !isCompletedRequest(request) &&
    !isCancelledRequest(request)
  );
}

function requestStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    reported: "badge-warning",
    assigned: "badge-info",
    "in progress": "badge-primary",
    "awaiting parts": "badge-warning",
    "on hold": "badge-neutral",
    completed: "badge-success",
    resolved: "badge-success",
    cancelled: "badge-neutral"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function priorityClass(priority) {
  const normalized =
    normalizeStatus(priority);

  return [
    "low",
    "medium",
    "high",
    "critical"
  ].includes(normalized)
    ? normalized
    : "medium";
}

function getScheduleStatus(schedule) {
  const explicit =
    normalizeStatus(
      schedule.status
    );

  if (
    ["paused", "inactive"].includes(
      explicit
    )
  ) {
    return "Paused";
  }

  const nextDueDate =
    firstDefined(
      schedule,
      [
        "next_due_date",
        "due_date"
      ]
    );

  const days =
    calculateDaysUntil(
      nextDueDate
    );

  if (days === null) {
    return titleCase(
      schedule.status ||
      "Active"
    );
  }

  if (days < 0) {
    return "Overdue";
  }

  if (days <= 14) {
    return "DueSoon";
  }

  return "Active";
}

function scheduleStatusLabel(status) {
  const normalized =
    normalizeStatus(status);

  const labels = {
    active: "Active",
    "due soon": "Due Soon",
    overdue: "Overdue",
    paused: "Paused"
  };

  return (
    labels[normalized] ||
    titleCase(status)
  );
}

function scheduleStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    active: "badge-success",
    "due soon": "badge-warning",
    overdue: "badge-danger",
    paused: "badge-neutral"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

/* =========================================================
   LOADING AND PAGE ERRORS
   ========================================================= */

function setMaintenanceLoading(
  loading
) {
  maintenanceState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "maintenance-page-loading",
    maintenanceState.loading
  );

  document.body.classList.toggle(
    "maintenance-refreshing",
    maintenanceState.loading
  );

  if (
    maintenanceElements.refreshButton
  ) {
    maintenanceElements.refreshButton.disabled =
      maintenanceState.loading;

    maintenanceElements.refreshButton.setAttribute(
      "aria-busy",
      String(
        maintenanceState.loading
      )
    );
  }
}

function showPageError(message) {
  if (
    maintenanceElements.errorAlert
  ) {
    maintenanceElements.errorAlert.hidden =
      false;
  }

  if (
    maintenanceElements.errorMessage
  ) {
    maintenanceElements.errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    maintenanceElements.errorAlert
  ) {
    maintenanceElements.errorAlert.hidden =
      true;
  }
}

/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function buildOptions(
  items,
  {
    placeholder = "Select an option",
    selectedValue = "",
    labelResolver = null
  } = {}
) {
  return `
    <option value="">
      ${escapeHTML(placeholder)}
    </option>

    ${items
      .map((item) => {
        const id =
          getRecordId(item);

        const label =
          labelResolver
            ? labelResolver(item)
            : (
                item.name ||
                item.label ||
                "Unnamed"
              );

        const selected =
          String(id) ===
          String(selectedValue);

        return `
          <option
            value="${escapeHTML(id)}"
            ${selected ? "selected" : ""}
          >
            ${escapeHTML(label)}
          </option>
        `;
      })
      .join("")}
  `;
}

function getActiveAssets() {
  return maintenanceState.assets.filter(
    (asset) => {
      const status =
        normalizeStatus(
          asset.status
        );

      return (
        toBoolean(
          asset.is_active,
          true
        ) &&
        ![
          "disposed",
          "lost"
        ].includes(status)
      );
    }
  );
}

function getTechnicians() {
  return maintenanceState.users.filter(
    (user) => {
      if (
        !toBoolean(
          user.is_active,
          true
        )
      ) {
        return false;
      }

      const role =
        normalizeStatus(
          user.role ||
          user.job_title ||
          user.designation
        );

      return (
        role.includes(
          "technician"
        ) ||
        role.includes(
          "maintenance"
        ) ||
        [
          "admin",
          "asset manager"
        ].includes(role)
      );
    }
  );
}

function populateReferenceOptions() {
  const assets =
    getActiveAssets();

  const technicians =
    getTechnicians();

  if (
    maintenanceElements.assetSelect
  ) {
    const selected =
      maintenanceElements
        .assetSelect.value;

    maintenanceElements
      .assetSelect.innerHTML =
      buildOptions(
        assets,
        {
          selectedValue: selected,
          placeholder:
            "Select asset",

          labelResolver(asset) {
            return (
              `${asset.name || "Unnamed Asset"} ` +
              `(${asset.asset_tag || asset.tag || "No tag"})`
            );
          }
        }
      );
  }

  if (
    maintenanceElements
      .preventiveAssetSelect
  ) {
    const selected =
      maintenanceElements
        .preventiveAssetSelect.value;

    maintenanceElements
      .preventiveAssetSelect.innerHTML =
      buildOptions(
        assets,
        {
          selectedValue: selected,
          placeholder:
            "Select asset",

          labelResolver(asset) {
            return (
              `${asset.name || "Unnamed Asset"} ` +
              `(${asset.asset_tag || asset.tag || "No tag"})`
            );
          }
        }
      );
  }

  [
    maintenanceElements
      .requestTechnicianSelect,

    maintenanceElements
      .updateTechnicianSelect,

    maintenanceElements
      .preventiveTechnicianSelect
  ]
    .filter(Boolean)
    .forEach((select) => {
      const selected =
        select.value;

      select.innerHTML =
        buildOptions(
          technicians,
          {
            selectedValue: selected,
            placeholder:
              select.id ===
              "maintenanceTechnicianId"
                ? "Assign later"
                : (
                    select.id ===
                    "preventiveTechnicianId"
                      ? "Assign when due"
                      : "Unassigned"
                  ),

            labelResolver(user) {
              return (
                user.email
                  ? `${user.name} — ${user.email}`
                  : user.name
              );
            }
          }
        );
    });

  if (
    maintenanceElements
      .technicianFilter
  ) {
    const selected =
      maintenanceElements
        .technicianFilter.value;

    maintenanceElements
      .technicianFilter.innerHTML =
      buildOptions(
        technicians,
        {
          selectedValue: selected,
          placeholder:
            "All technicians"
        }
      );
  }

  if (
    maintenanceElements
      .departmentFilter
  ) {
    const selected =
      maintenanceElements
        .departmentFilter.value;

    maintenanceElements
      .departmentFilter.innerHTML =
      buildOptions(
        maintenanceState.departments,
        {
          selectedValue: selected,
          placeholder:
            "All departments"
        }
      );
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderMaintenanceSummary() {
  const activeRequests =
    maintenanceState.requests.filter(
      isActiveRequest
    );

  const critical =
    activeRequests.filter(
      (request) =>
        normalizeStatus(
          request.priority
        ) === "critical"
    );

  const inProgress =
    activeRequests.filter(
      (request) =>
        normalizeStatus(
          request.status
        ) === "in progress"
    );

  const awaitingParts =
    activeRequests.filter(
      (request) =>
        normalizeStatus(
          request.status
        ) === "awaiting parts"
    );

  const now =
    new Date();

  const completedThisMonth =
    maintenanceState.requests.filter(
      (request) => {
        if (
          !isCompletedRequest(request)
        ) {
          return false;
        }

        const completed =
          new Date(
            firstDefined(
              request,
              [
                "completed_date",
                "completed_at",
                "resolved_at",
                "updated_at"
              ]
            )
          );

        return (
          !Number.isNaN(
            completed.getTime()
          ) &&
          completed.getMonth() ===
            now.getMonth() &&
          completed.getFullYear() ===
            now.getFullYear()
        );
      }
    );

  const offlineAssetIds =
    new Set(
      activeRequests
        .filter(
          (request) =>
            toBoolean(
              request.asset_offline,
              false
            ) ||
            normalizeStatus(
              getAsset(request)?.status
            ) ===
              "under maintenance"
        )
        .map(getAssetId)
        .filter(Boolean)
        .map(String)
    );

  const summary = {
    open:
      activeRequests.length,

    critical:
      critical.length,

    in_progress:
      inProgress.length,

    awaiting_parts:
      awaitingParts.length,

    completed_month:
      completedThisMonth.length,

    offline:
      offlineAssetIds.size
  };

  Object.entries(summary).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-maintenance-summary="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            formatNumber(value);

          element.classList.add(
            "maintenance-data-enter"
          );
        });
    }
  );

  document
    .querySelectorAll(
      '[data-maintenance-tab-count="requests"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          activeRequests.length
        );
    });

  document
    .querySelectorAll(
      '[data-maintenance-tab-count="scheduled"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          maintenanceState
            .schedules.length
        );
    });
}

/* =========================================================
   REQUEST FILTERING
   ========================================================= */

function getFilteredRequests() {
  const search =
    normalizeText(
      maintenanceState.search
    );

  return maintenanceState.requests
    .filter(isActiveRequest)
    .filter((request) => {
      const searchableText = [
        getAssetName(request),
        getAssetTag(request),
        request.reference,
        request.request_reference,
        request.title,
        request.description,
        request.issue_type,
        getTechnicianName(request),
        getReporterName(request),
        getDepartmentName(request)
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
        !maintenanceState
          .statusFilter ||
        normalizeStatus(
          request.status
        ) ===
        normalizeStatus(
          maintenanceState
            .statusFilter
        );

      const matchesPriority =
        !maintenanceState
          .priorityFilter ||
        normalizeStatus(
          request.priority
        ) ===
        normalizeStatus(
          maintenanceState
            .priorityFilter
        );

      const matchesTechnician =
        !maintenanceState
          .technicianFilter ||
        String(
          getTechnicianId(request)
        ) ===
        String(
          maintenanceState
            .technicianFilter
        );

      const matchesDepartment =
        !maintenanceState
          .departmentFilter ||
        String(
          getDepartmentId(request)
        ) ===
        String(
          maintenanceState
            .departmentFilter
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesTechnician &&
        matchesDepartment
      );
    })
    .sort((first, second) => {
      const priorityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
      };

      const firstPriority =
        priorityOrder[
          normalizeStatus(
            first.priority
          )
        ] ?? 4;

      const secondPriority =
        priorityOrder[
          normalizeStatus(
            second.priority
          )
        ] ?? 4;

      if (
        firstPriority !==
        secondPriority
      ) {
        return (
          firstPriority -
          secondPriority
        );
      }

      return (
        new Date(
          second.reported_at ||
          second.created_at ||
          0
        ) -
        new Date(
          first.reported_at ||
          first.created_at ||
          0
        )
      );
    });
}

/* =========================================================
   REQUEST TABLE
   ========================================================= */

function renderMaintenanceRequests() {
  const tableBody =
    maintenanceElements
      .requestsTableBody;

  const tableContainer =
    maintenanceElements
      .requestsTableContainer;

  const emptyState =
    maintenanceElements
      .requestsEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const requests =
    getFilteredRequests();

  const total =
    requests.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        MAINTENANCE_CONFIG.PAGE_SIZE
      )
    );

  maintenanceState.currentPage =
    Math.min(
      maintenanceState.currentPage,
      totalPages
    );

  const startIndex =
    (
      maintenanceState.currentPage -
      1
    ) *
    MAINTENANCE_CONFIG.PAGE_SIZE;

  const visible =
    requests.slice(
      startIndex,
      startIndex +
      MAINTENANCE_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updateMaintenancePagination(
      0,
      0,
      0
    );

    renderPagination(1, 1);

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((request) => {
        const requestId =
          getRecordId(request);

        const reference =
          request.reference ||
          request.request_reference ||
          `MNT-${requestId}`;

        const technicianName =
          getTechnicianName(request);

        const assigned =
          Boolean(
            getTechnicianId(request)
          );

        const reportedDate =
          firstDefined(
            request,
            [
              "reported_at",
              "reported_date",
              "created_at"
            ]
          );

        const estimatedCompletion =
          firstDefined(
            request,
            [
              "estimated_completion_date",
              "preferred_completion_date"
            ]
          );

        const daysToCompletion =
          calculateDaysUntil(
            estimatedCompletion
          );

        const status =
          getRequestStatus(request);

        const priority =
          getRequestPriority(request);

        const canEdit =
          canEditMaintenanceRequest(
            request
          );

        return `
          <tr class="maintenance-data-enter">
            <td>
              <button
                type="button"
                class="maintenance-request-identity text-left"
                data-view-maintenance="${escapeHTML(
                  requestId
                )}"
              >
                <span
                  class="maintenance-request-icon"
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
                    <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.3 7.3"></path>
                    <path d="m5 19 4-4"></path>
                  </svg>
                </span>

                <span class="maintenance-request-content">
                  <span class="maintenance-request-asset">
                    ${escapeHTML(
                      getAssetName(request)
                    )}
                  </span>

                  <span class="maintenance-request-reference">
                    ${escapeHTML(reference)}
                  </span>
                </span>
              </button>
            </td>

            <td>
              <div class="maintenance-issue-cell">
                <div class="maintenance-issue-title">
                  ${escapeHTML(
                    request.title ||
                    "Maintenance Issue"
                  )}
                </div>

                <p class="maintenance-issue-description">
                  ${escapeHTML(
                    request.description ||
                    "No description provided."
                  )}
                </p>

                <span class="maintenance-issue-type">
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

                    <path d="M12 8v4"></path>
                    <path d="M12 16h.01"></path>
                  </svg>

                  ${escapeHTML(
                    titleCase(
                      request.issue_type ||
                      "Other"
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <span
                class="maintenance-priority ${priorityClass(
                  priority
                )}"
              >
                ${escapeHTML(priority)}
              </span>
            </td>

            <td>
              <div class="maintenance-technician">
                <div
                  class="maintenance-technician-avatar ${
                    assigned
                      ? ""
                      : "unassigned"
                  }"
                  aria-hidden="true"
                >
                  ${
                    assigned
                      ? escapeHTML(
                          getInitials(
                            technicianName
                          )
                        )
                      : "?"
                  }
                </div>

                <div class="maintenance-technician-content">
                  <div class="maintenance-technician-name">
                    ${escapeHTML(
                      technicianName
                    )}
                  </div>

                  <div class="maintenance-technician-role">
                    ${escapeHTML(
                      getTechnicianRole(
                        request
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="maintenance-date-cell">
                <span class="maintenance-date-primary">
                  ${escapeHTML(
                    formatDate(
                      reportedDate
                    )
                  )}
                </span>

                <span
                  class="maintenance-date-secondary ${
                    daysToCompletion !== null &&
                    daysToCompletion < 0
                      ? "overdue"
                      : ""
                  }"
                >
                  ${
                    estimatedCompletion
                      ? (
                          daysToCompletion < 0
                            ? `${Math.abs(
                                daysToCompletion
                              )} days overdue`
                            : `Target ${formatDate(
                                estimatedCompletion
                              )}`
                        )
                      : "No target date"
                  }
                </span>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${requestStatusBadgeClass(
                  status
                )}"
              >
                ${escapeHTML(status)}
              </span>
            </td>

            <td class="text-right">
              <div class="maintenance-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-maintenance="${escapeHTML(
                    requestId
                  )}"
                  aria-label="View maintenance request"
                  title="View request"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path>
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    ></circle>
                  </svg>
                </button>

                ${
                  canEdit
                    ? `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-edit-maintenance="${escapeHTML(
                          requestId
                        )}"
                      >
                        Edit
                      </button>
                    `
                    : ""
                }

                ${
                  canManageMaintenance()
                    ? `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-update-maintenance="${escapeHTML(
                          requestId
                        )}"
                      >
                        Update
                      </button>

                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-complete-maintenance="${escapeHTML(
                          requestId
                        )}"
                      >
                        Complete
                      </button>
                    `
                    : ""
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  updateMaintenancePagination(
    startIndex + 1,
    Math.min(
      startIndex +
      MAINTENANCE_CONFIG.PAGE_SIZE,
      total
    ),
    total
  );

  renderPagination(
    maintenanceState.currentPage,
    totalPages
  );
}

/* =========================================================
   PAGINATION
   ========================================================= */

function updateMaintenancePagination(
  start,
  end,
  total
) {
  if (
    maintenanceElements
      .paginationSummary
  ) {
    maintenanceElements
      .paginationSummary
      .textContent =
        total === 0
          ? "Showing 0 requests"
          : `Showing ${start}–${end} of ${total} requests`;
  }
}

function renderPagination(
  currentPage,
  totalPages
) {
  const container =
    maintenanceElements.pagination;

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

  let previousPage = 0;
  const buttons = [];

  pages.forEach((page) => {
    if (
      previousPage &&
      page - previousPage > 1
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
        data-maintenance-page="${page}"
        ${
          page === currentPage
            ? 'aria-current="page"'
            : ""
        }
      >
        ${page}
      </button>
    `);

    previousPage = page;
  });

  container.innerHTML = `
    <button
      type="button"
      class="pagination-button"
      data-maintenance-page="${
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
      data-maintenance-page="${
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
   PREVENTIVE SCHEDULES
   ========================================================= */

function getFilteredSchedules() {
  return maintenanceState.schedules
    .filter((schedule) => {
      if (
        !maintenanceState
          .scheduleStatusFilter
      ) {
        return true;
      }

      return (
        normalizeStatus(
          getScheduleStatus(
            schedule
          )
        ) ===
        normalizeStatus(
          maintenanceState
            .scheduleStatusFilter
        )
      );
    })
    .sort((first, second) => {
      return (
        new Date(
          first.next_due_date ||
          first.due_date ||
          "9999-12-31"
        ) -
        new Date(
          second.next_due_date ||
          second.due_date ||
          "9999-12-31"
        )
      );
    });
}

function calculateScheduleProgress(
  schedule
) {
  const lastCompleted =
    firstDefined(
      schedule,
      [
        "last_completed_date",
        "last_service_date",
        "last_run_date",
        "created_at"
      ]
    );

  const nextDue =
    firstDefined(
      schedule,
      [
        "next_due_date",
        "due_date"
      ]
    );

  if (
    !lastCompleted ||
    !nextDue
  ) {
    return 0;
  }

  const start =
    new Date(lastCompleted);

  const end =
    new Date(nextDue);

  const now =
    new Date();

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  const progress =
    (
      (now - start) /
      (end - start)
    ) * 100;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(progress)
    )
  );
}

function renderMaintenanceSchedules() {
  const grid =
    maintenanceElements.scheduleGrid;

  const emptyState =
    maintenanceElements
      .scheduleEmptyState;

  if (
    !grid ||
    !emptyState
  ) {
    return;
  }

  const schedules =
    getFilteredSchedules();

  if (
    schedules.length === 0
  ) {
    grid.innerHTML = "";
    grid.hidden = true;
    emptyState.hidden = false;

    return;
  }

  grid.hidden = false;
  emptyState.hidden = true;

  grid.innerHTML =
    schedules
      .map((schedule) => {
        const id =
          getRecordId(schedule);

        const status =
          getScheduleStatus(schedule);

        const statusClass =
          normalizeStatus(status)
            .replace(/\s+/g, "-");

        const progress =
          calculateScheduleProgress(
            schedule
          );

        const nextDueDate =
          firstDefined(
            schedule,
            [
              "next_due_date",
              "due_date"
            ]
          );

        return `
          <article
            class="maintenance-schedule-card ${statusClass} maintenance-data-enter"
          >
            <header class="maintenance-schedule-card-header">
              <div
                class="maintenance-schedule-card-icon"
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
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="2"
                  ></rect>

                  <path d="M16 3v4"></path>
                  <path d="M8 3v4"></path>
                  <path d="M3 10h18"></path>
                </svg>
              </div>

              <div class="maintenance-schedule-card-actions">
                <span
                  class="badge badge-dot ${scheduleStatusBadgeClass(
                    status
                  )}"
                >
                  ${escapeHTML(
                    scheduleStatusLabel(
                      status
                    )
                  )}
                </span>

                ${
                  canManageMaintenance()
                    ? `
                      <button
                        type="button"
                        class="btn btn-icon btn-outline"
                        data-edit-maintenance-schedule="${escapeHTML(
                          id
                        )}"
                        aria-label="Edit preventive schedule"
                        title="Edit schedule"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.9"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
                        </svg>
                      </button>
                    `
                    : ""
                }
              </div>
            </header>

            <div class="maintenance-schedule-card-content">
              <h3 class="maintenance-schedule-name">
                ${escapeHTML(
                  schedule.name ||
                  "Preventive Maintenance"
                )}
              </h3>

              <p class="maintenance-schedule-asset">
                ${escapeHTML(
                  getAssetName(schedule)
                )}
                ·
                ${escapeHTML(
                  getAssetTag(schedule)
                )}
              </p>

              <div class="maintenance-schedule-meta">
                <div class="maintenance-schedule-meta-item">
                  <span class="maintenance-schedule-meta-label">
                    Frequency
                  </span>

                  <span class="maintenance-schedule-meta-value">
                    ${escapeHTML(
                      titleCase(
                        schedule.frequency ||
                        "Not set"
                      )
                    )}
                  </span>
                </div>

                <div class="maintenance-schedule-meta-item">
                  <span class="maintenance-schedule-meta-label">
                    Next Due
                  </span>

                  <span class="maintenance-schedule-meta-value">
                    ${escapeHTML(
                      formatDate(
                        nextDueDate
                      )
                    )}
                  </span>
                </div>

                <div class="maintenance-schedule-meta-item">
                  <span class="maintenance-schedule-meta-label">
                    Technician
                  </span>

                  <span class="maintenance-schedule-meta-value">
                    ${escapeHTML(
                      getTechnicianName(
                        schedule
                      )
                    )}
                  </span>
                </div>

                <div class="maintenance-schedule-meta-item">
                  <span class="maintenance-schedule-meta-label">
                    Duration
                  </span>

                  <span class="maintenance-schedule-meta-value">
                    ${
                      schedule.estimated_duration_hours
                        ? `${escapeHTML(
                            schedule.estimated_duration_hours
                          )} hours`
                        : "Not estimated"
                    }
                  </span>
                </div>
              </div>

              <div class="maintenance-schedule-progress">
                <div class="maintenance-schedule-progress-header">
                  <span>
                    Service interval
                  </span>

                  <strong>
                    ${progress}%
                  </strong>
                </div>

                <div class="maintenance-schedule-progress-track">
                  <div
                    class="maintenance-schedule-progress-bar"
                    style="
                      --schedule-progress:
                        ${progress}%;
                    "
                  ></div>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   MAINTENANCE HISTORY
   ========================================================= */

function getFilteredHistory() {
  return maintenanceState.requests
    .filter(isCompletedRequest)
    .filter((request) => {
      const completedDate =
        firstDefined(
          request,
          [
            "completed_date",
            "completed_at",
            "resolved_at",
            "updated_at"
          ]
        );

      if (
        maintenanceState.historyFrom &&
        completedDate
      ) {
        const completed =
          new Date(completedDate);

        const from =
          new Date(
            maintenanceState
              .historyFrom
          );

        if (completed < from) {
          return false;
        }
      }

      if (
        maintenanceState.historyTo &&
        completedDate
      ) {
        const completed =
          new Date(completedDate);

        const to =
          new Date(
            maintenanceState
              .historyTo
          );

        to.setHours(
          23,
          59,
          59,
          999
        );

        if (completed > to) {
          return false;
        }
      }

      return true;
    })
    .sort((first, second) => {
      return (
        new Date(
          first.completed_date ||
          first.completed_at ||
          first.resolved_at ||
          first.updated_at ||
          0
        ) -
        new Date(
          second.completed_date ||
          second.completed_at ||
          second.resolved_at ||
          second.updated_at ||
          0
        )
      ) * -1;
    });
}

function renderMaintenanceHistory() {
  const tableBody =
    maintenanceElements
      .historyTableBody;

  const tableContainer =
    maintenanceElements
      .historyTableContainer;

  const emptyState =
    maintenanceElements
      .historyEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const history =
    getFilteredHistory();

  if (
    history.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    history
      .map((request) => {
        const id =
          getRecordId(request);

        const finalCost =
          firstDefined(
            request,
            [
              "final_cost",
              "actual_cost",
              "cost"
            ]
          );

        return `
          <tr class="maintenance-data-enter">
            <td>
              <div class="maintenance-request-identity">
                <div
                  class="maintenance-request-icon"
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

                <div class="maintenance-request-content">
                  <div class="maintenance-request-asset">
                    ${escapeHTML(
                      getAssetName(request)
                    )}
                  </div>

                  <div class="maintenance-request-reference">
                    ${escapeHTML(
                      getAssetTag(request)
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="maintenance-issue-cell">
                <div class="maintenance-issue-title">
                  ${escapeHTML(
                    request.title ||
                    "Maintenance Issue"
                  )}
                </div>

                <span class="maintenance-issue-type">
                  ${escapeHTML(
                    titleCase(
                      request.issue_type ||
                      "Other"
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="maintenance-technician">
                <div
                  class="maintenance-technician-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      getTechnicianName(
                        request
                      )
                    )
                  )}
                </div>

                <div class="maintenance-technician-content">
                  <div class="maintenance-technician-name">
                    ${escapeHTML(
                      getTechnicianName(
                        request
                      )
                    )}
                  </div>

                  <div class="maintenance-technician-role">
                    ${escapeHTML(
                      getTechnicianRole(
                        request
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="maintenance-date-primary">
                ${escapeHTML(
                  formatDate(
                    request.completed_date ||
                    request.completed_at ||
                    request.resolved_at ||
                    request.updated_at
                  )
                )}
              </span>
            </td>

            <td>
              <p class="maintenance-history-resolution">
                ${escapeHTML(
                  request.resolution ||
                  request.resolution_summary ||
                  "No resolution summary was recorded."
                )}
              </p>
            </td>

            <td>
              <span
                class="maintenance-cost ${
                  finalCost === null ||
                  finalCost === undefined
                    ? "unavailable"
                    : ""
                }"
              >
                ${escapeHTML(
                  formatCurrency(
                    finalCost
                  )
                )}
              </span>
            </td>

            <td class="text-right">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-view-maintenance="${escapeHTML(
                  id
                )}"
              >
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   COMPLETE PAGE RENDER
   ========================================================= */

function renderMaintenancePage() {
  populateReferenceOptions();
  renderMaintenanceSummary();
  renderMaintenanceRequests();
  renderMaintenanceSchedules();
  renderMaintenanceHistory();
  enforceMaintenancePermissions();
}

/* =========================================================
   TAB MANAGEMENT
   ========================================================= */

function activateMaintenanceTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "requests",
    "schedule",
    "history"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName = "requests";
  }

  maintenanceState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-maintenance-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .maintenanceTab ===
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
      "[data-maintenance-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .maintenancePanel ===
        tabName;

      panel.classList.toggle(
        "active",
        active
      );

      panel.hidden = !active;
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
   FILTER RESET
   ========================================================= */

function resetMaintenanceFilters() {
  maintenanceState.search = "";
  maintenanceState.statusFilter = "";
  maintenanceState.priorityFilter = "";
  maintenanceState.technicianFilter = "";
  maintenanceState.departmentFilter = "";
  maintenanceState.currentPage = 1;

  if (
    maintenanceElements.searchInput
  ) {
    maintenanceElements.searchInput.value =
      "";
  }

  if (
    maintenanceElements.statusFilter
  ) {
    maintenanceElements.statusFilter.value =
      "";
  }

  if (
    maintenanceElements.priorityFilter
  ) {
    maintenanceElements.priorityFilter.value =
      "";
  }

  if (
    maintenanceElements.technicianFilter
  ) {
    maintenanceElements.technicianFilter.value =
      "";
  }

  if (
    maintenanceElements.departmentFilter
  ) {
    maintenanceElements.departmentFilter.value =
      "";
  }

  renderMaintenanceRequests();
}

/* =========================================================
   FORM VALIDATION
   ========================================================= */

function clearFormState(
  form,
  errorContainer
) {
  window.AssetFlowUtils
    ?.clearFormValidation?.(
      form
    );

  if (errorContainer) {
    errorContainer.hidden = true;
    errorContainer.textContent = "";
  }
}

function showFormError(
  errorContainer,
  message
) {
  if (!errorContainer) {
    return;
  }

  errorContainer.textContent =
    message;

  errorContainer.hidden =
    false;
}

function applyFormError(
  form,
  errorContainer,
  error
) {
  const applied =
    window.AssetFlowUtils
      ?.applyApiFieldError?.(
        form,
        error
      );

  if (!applied) {
    showFormError(
      errorContainer,
      error?.message ||
      "Unable to save the maintenance record."
    );
  }
}

function validateRequiredFields(form) {
  const fields =
    Array.from(
      form.querySelectorAll(
        "[required]"
      )
    );

  let valid = true;

  fields.forEach((field) => {
    const empty =
      field.type === "checkbox"
        ? !field.checked
        : !String(
            field.value
          ).trim();

    if (empty) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          field,
          field.type === "checkbox"
            ? "Confirmation is required."
            : "This field is required."
        );

      valid = false;
    }
  });

  return valid;
}

/* =========================================================
   REQUEST FORM
   ========================================================= */

function resetMaintenanceRequestForm() {
  const form =
    maintenanceElements.requestForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "maintenanceRequestId"
  ).value = "";

  document.getElementById(
    "maintenancePriority"
  ).value = "Medium";

  document.getElementById(
    "maintenanceDetectedDate"
  ).value = todayISO();

  document.getElementById(
    "maintenanceAssetOffline"
  ).checked = false;

  document.getElementById(
    "maintenanceSafetyRisk"
  ).checked = false;

  maintenanceElements
    .assetPreview.hidden = true;

  document
    .querySelector(
      "[data-maintenance-form-title]"
    )
    .textContent =
      "Report Maintenance Issue";

  maintenanceElements
    .requestSubmitButton.textContent =
      "Submit Request";

  document
    .querySelector(
      "[data-maintenance-description-count]"
    )
    .textContent = "0";

  document
    .querySelector(
      "[data-maintenance-notes-count]"
    )
    .textContent = "0";

  populateReferenceOptions();

  clearFormState(
    form,
    maintenanceElements
      .requestFormError
  );
}

function updateMaintenanceAssetPreview() {
  const asset =
    findAssetById(
      maintenanceElements
        .assetSelect?.value
    );

  if (!asset) {
    maintenanceElements
      .assetPreview.hidden =
      true;

    return;
  }

  document
    .querySelector(
      "[data-maintenance-preview-name]"
    )
    .textContent =
      asset.name ||
      "Unnamed Asset";

  document
    .querySelector(
      "[data-maintenance-preview-tag]"
    )
    .textContent =
      asset.asset_tag ||
      asset.tag ||
      "No asset tag";

  document
    .querySelector(
      "[data-maintenance-preview-location]"
    )
    .textContent =
      getAssetLocation({
        asset
      });

  const statusElement =
    document.querySelector(
      "[data-maintenance-preview-status]"
    );

  if (statusElement) {
    const status =
      titleCase(
        asset.status ||
        "Unknown"
      );

    statusElement.textContent =
      status;

    statusElement.className =
      `badge badge-dot ${
        normalizeStatus(status) ===
          "under maintenance"
          ? "badge-warning"
          : "badge-neutral"
      }`;
  }

  maintenanceElements
    .assetPreview.hidden =
    false;
}

function openMaintenanceEditor(
  requestId
) {
  const request =
    findRequestById(
      requestId
    );

  if (!request) {
    showToast(
      "Maintenance request could not be found.",
      "danger"
    );

    return;
  }

  if (
    !canEditMaintenanceRequest(
      request
    )
  ) {
    showToast(
      "You do not have permission to edit this request.",
      "danger"
    );

    return;
  }

  resetMaintenanceRequestForm();

  document.getElementById(
    "maintenanceRequestId"
  ).value =
    getRecordId(request);

  document.getElementById(
    "maintenanceAssetId"
  ).value =
    getAssetId(request);

  document.getElementById(
    "maintenanceIssueType"
  ).value =
    request.issue_type || "";

  document.getElementById(
    "maintenancePriority"
  ).value =
    request.priority || "Medium";

  document.getElementById(
    "maintenanceIssueTitle"
  ).value =
    request.title || "";

  document.getElementById(
    "maintenanceIssueDescription"
  ).value =
    request.description || "";

  document.getElementById(
    "maintenanceDetectedDate"
  ).value =
    String(
      request.detected_date ||
      request.reported_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "maintenancePreferredCompletion"
  ).value =
    String(
      request.preferred_completion_date ||
      request.estimated_completion_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "maintenanceAssetOffline"
  ).checked =
    toBoolean(
      request.asset_offline,
      false
    );

  document.getElementById(
    "maintenanceSafetyRisk"
  ).checked =
    toBoolean(
      request.safety_risk,
      false
    );

  document.getElementById(
    "maintenanceTechnicianId"
  ).value =
    getTechnicianId(request);

  document.getElementById(
    "maintenanceVendor"
  ).value =
    request.vendor || "";

  document.getElementById(
    "maintenanceInitialNotes"
  ).value =
    request.internal_notes || "";

  document
    .querySelector(
      "[data-maintenance-form-title]"
    )
    .textContent =
      "Edit Maintenance Request";

  maintenanceElements
    .requestSubmitButton.textContent =
      "Update Request";

  document
    .querySelector(
      "[data-maintenance-description-count]"
    )
    .textContent =
      String(
        (
          request.description ||
          ""
        ).length
      );

  document
    .querySelector(
      "[data-maintenance-notes-count]"
    )
    .textContent =
      String(
        (
          request.internal_notes ||
          ""
        ).length
      );

  updateMaintenanceAssetPreview();

  closeModal(
    maintenanceElements.detailsModal
  );

  openModal(
    maintenanceElements.requestModal
  );
}

function buildMaintenanceRequestPayload() {
  const payload = {
    asset_id:
      document.getElementById(
        "maintenanceAssetId"
      ).value,

    issue_type:
      document.getElementById(
        "maintenanceIssueType"
      ).value,

    priority:
      document.getElementById(
        "maintenancePriority"
      ).value,

    title:
      document.getElementById(
        "maintenanceIssueTitle"
      ).value.trim(),

    description:
      document.getElementById(
        "maintenanceIssueDescription"
      ).value.trim(),

    detected_date:
      document.getElementById(
        "maintenanceDetectedDate"
      ).value || null,

    preferred_completion_date:
      document.getElementById(
        "maintenancePreferredCompletion"
      ).value || null,

    asset_offline:
      document.getElementById(
        "maintenanceAssetOffline"
      ).checked,

    safety_risk:
      document.getElementById(
        "maintenanceSafetyRisk"
      ).checked
  };

  if (canManageMaintenance()) {
    payload.technician_id =
      document.getElementById(
        "maintenanceTechnicianId"
      ).value || null;

    payload.vendor =
      document.getElementById(
        "maintenanceVendor"
      ).value.trim() || null;

    payload.internal_notes =
      document.getElementById(
        "maintenanceInitialNotes"
      ).value.trim() || null;
  }

  return payload;
}

async function submitMaintenanceRequest(
  event
) {
  event.preventDefault();

  const form =
    maintenanceElements.requestForm;

  clearFormState(
    form,
    maintenanceElements
      .requestFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const requestId =
    document.getElementById(
      "maintenanceRequestId"
    ).value;

  const payload =
    buildMaintenanceRequestPayload();

  if (
    payload.preferred_completion_date &&
    payload.detected_date &&
    payload.preferred_completion_date <
      payload.detected_date
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "maintenancePreferredCompletion"
        ),
        "Preferred completion cannot be before the detected date."
      );

    return;
  }

  setButtonLoading(
    maintenanceElements
      .requestSubmitButton,
    true,
    requestId
      ? "Updating..."
      : "Submitting..."
  );

  try {
    if (requestId) {
      const encodedId =
        encodeURIComponent(
          requestId
        );

      await requestWithFallback(
        [
          `/maintenance-requests/${encodedId}`,
          `/maintenance/${encodedId}`,
          `/asset-maintenance/${encodedId}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        MAINTENANCE_CONFIG
          .ENDPOINTS.REQUESTS,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      maintenanceElements
        .requestModal
    );

    showToast(
      requestId
        ? "Maintenance request updated successfully."
        : "Maintenance request submitted successfully.",
      "success"
    );

    await loadMaintenanceData();

    activateMaintenanceTab(
      "requests"
    );
  } catch (error) {
    applyFormError(
      form,
      maintenanceElements
        .requestFormError,
      error
    );
  } finally {
    setButtonLoading(
      maintenanceElements
        .requestSubmitButton,
      false
    );
  }
}

/* =========================================================
   UPDATE FORM
   ========================================================= */

function resetMaintenanceUpdateForm() {
  const form =
    maintenanceElements.updateForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "maintenanceUpdateRequestId"
  ).value = "";

  document
    .querySelector(
      "[data-maintenance-progress-count]"
    )
    .textContent = "0";

  populateReferenceOptions();

  clearFormState(
    form,
    maintenanceElements
      .updateFormError
  );
}

function openMaintenanceUpdate(
  requestId
) {
  if (!canManageMaintenance()) {
    showToast(
      "You do not have permission to update maintenance progress.",
      "danger"
    );

    return;
  }

  const request =
    findRequestById(
      requestId
    );

  if (!request) {
    showToast(
      "Maintenance request could not be found.",
      "danger"
    );

    return;
  }

  resetMaintenanceUpdateForm();

  document.getElementById(
    "maintenanceUpdateRequestId"
  ).value =
    getRecordId(request);

  document.getElementById(
    "maintenanceUpdateStatus"
  ).value =
    request.status ||
    "Reported";

  document.getElementById(
    "maintenanceUpdateTechnician"
  ).value =
    getTechnicianId(request);

  document.getElementById(
    "maintenanceEstimatedCompletion"
  ).value =
    String(
      request.estimated_completion_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "maintenanceEstimatedCost"
  ).value =
    request.estimated_cost ?? "";

  document.getElementById(
    "maintenancePartsRequired"
  ).value =
    request.parts_required || "";

  document
    .querySelector(
      "[data-maintenance-update-asset]"
    )
    .textContent =
      getAssetName(request);

  document
    .querySelector(
      "[data-maintenance-update-title]"
    )
    .textContent =
      request.title ||
      "Maintenance Issue";

  closeModal(
    maintenanceElements.detailsModal
  );

  openModal(
    maintenanceElements.updateModal
  );
}

async function submitMaintenanceUpdate(
  event
) {
  event.preventDefault();

  if (!canManageMaintenance()) {
    return;
  }

  const form =
    maintenanceElements.updateForm;

  clearFormState(
    form,
    maintenanceElements
      .updateFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const requestId =
    document.getElementById(
      "maintenanceUpdateRequestId"
    ).value;

  const status =
    document.getElementById(
      "maintenanceUpdateStatus"
    ).value;

  if (
    normalizeStatus(status) ===
    "completed"
  ) {
    showFormError(
      maintenanceElements
        .updateFormError,
      "Use the Complete Maintenance action to close this request."
    );

    return;
  }

  const payload = {
    status,

    technician_id:
      document.getElementById(
        "maintenanceUpdateTechnician"
      ).value || null,

    estimated_completion_date:
      document.getElementById(
        "maintenanceEstimatedCompletion"
      ).value || null,

    estimated_cost:
      document.getElementById(
        "maintenanceEstimatedCost"
      ).value
        ? Number(
            document.getElementById(
              "maintenanceEstimatedCost"
            ).value
          )
        : null,

    parts_required:
      document.getElementById(
        "maintenancePartsRequired"
      ).value.trim() || null,

    progress_note:
      document.getElementById(
        "maintenanceProgressNote"
      ).value.trim()
  };

  setButtonLoading(
    maintenanceElements
      .updateSubmitButton,
    true,
    "Saving..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        requestId
      );

    await requestWithFallback(
      [
        `/maintenance-requests/${encodedId}/update`,
        `/maintenance-requests/${encodedId}/progress`,
        `/maintenance/${encodedId}`,
        `/asset-maintenance/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      maintenanceElements.updateModal
    );

    showToast(
      "Maintenance progress updated successfully.",
      "success"
    );

    await loadMaintenanceData();
  } catch (error) {
    applyFormError(
      form,
      maintenanceElements
        .updateFormError,
      error
    );
  } finally {
    setButtonLoading(
      maintenanceElements
        .updateSubmitButton,
      false
    );
  }
}

/* =========================================================
   COMPLETE MAINTENANCE FORM
   ========================================================= */

function resetCompleteMaintenanceForm() {
  const form =
    maintenanceElements.completeForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "completeMaintenanceRequestId"
  ).value = "";

  document.getElementById(
    "maintenanceCompletedDate"
  ).value = todayISO();

  document.getElementById(
    "maintenanceAssetNextStatus"
  ).value = "Available";

  document
    .querySelector(
      "[data-maintenance-resolution-count]"
    )
    .textContent = "0";

  clearFormState(
    form,
    maintenanceElements
      .completeFormError
  );
}

function openCompleteMaintenance(
  requestId
) {
  if (!canManageMaintenance()) {
    showToast(
      "You do not have permission to complete maintenance requests.",
      "danger"
    );

    return;
  }

  const request =
    findRequestById(
      requestId
    );

  if (!request) {
    showToast(
      "Maintenance request could not be found.",
      "danger"
    );

    return;
  }

  resetCompleteMaintenanceForm();

  document.getElementById(
    "completeMaintenanceRequestId"
  ).value =
    getRecordId(request);

  document.getElementById(
    "maintenanceFinalCost"
  ).value =
    request.estimated_cost ?? "";

  document
    .querySelector(
      "[data-completion-asset-name]"
    )
    .textContent =
      getAssetName(request);

  document
    .querySelector(
      "[data-completion-issue-title]"
    )
    .textContent =
      request.title ||
      "Maintenance Issue";

  closeModal(
    maintenanceElements.detailsModal
  );

  openModal(
    maintenanceElements.completeModal
  );
}

async function submitCompleteMaintenance(
  event
) {
  event.preventDefault();

  if (!canManageMaintenance()) {
    return;
  }

  const form =
    maintenanceElements.completeForm;

  clearFormState(
    form,
    maintenanceElements
      .completeFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const requestId =
    document.getElementById(
      "completeMaintenanceRequestId"
    ).value;

  const payload = {
    status:
      "Completed",

    completed_date:
      document.getElementById(
        "maintenanceCompletedDate"
      ).value,

    final_cost:
      Number(
        document.getElementById(
          "maintenanceFinalCost"
        ).value || 0
      ),

    resolution:
      document.getElementById(
        "maintenanceResolution"
      ).value.trim(),

    post_maintenance_condition:
      document.getElementById(
        "maintenancePostCondition"
      ).value,

    asset_status:
      document.getElementById(
        "maintenanceAssetNextStatus"
      ).value,

    warranty_information:
      document.getElementById(
        "maintenanceWarrantyInformation"
      ).value.trim() || null
  };

  setButtonLoading(
    maintenanceElements
      .completeSubmitButton,
    true,
    "Completing..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        requestId
      );

    await requestWithFallback(
      [
        `/maintenance-requests/${encodedId}/complete`,
        `/maintenance/${encodedId}/complete`,
        `/asset-maintenance/${encodedId}/complete`,
        `/maintenance-requests/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      maintenanceElements.completeModal
    );

    showToast(
      "Maintenance completed successfully.",
      "success"
    );

    await loadMaintenanceData();

    activateMaintenanceTab(
      "history"
    );
  } catch (error) {
    applyFormError(
      form,
      maintenanceElements
        .completeFormError,
      error
    );
  } finally {
    setButtonLoading(
      maintenanceElements
        .completeSubmitButton,
      false
    );
  }
}

/* =========================================================
   PREVENTIVE MAINTENANCE FORM
   ========================================================= */

function resetPreventiveMaintenanceForm() {
  const form =
    maintenanceElements.preventiveForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "preventiveScheduleId"
  ).value = "";

  document.getElementById(
    "preventiveFrequency"
  ).value = "Quarterly";

  document.getElementById(
    "preventiveNextDueDate"
  ).value =
    addDaysISO(90);

  document.getElementById(
    "preventiveAutoCreate"
  ).checked = true;

  document.getElementById(
    "preventiveNotifications"
  ).checked = true;

  document.getElementById(
    "preventiveCustomIntervalGroup"
  ).hidden = true;

  document
    .querySelector(
      "[data-preventive-form-title]"
    )
    .textContent =
      "Create Preventive Schedule";

  maintenanceElements
    .preventiveSubmitButton.textContent =
      "Create Schedule";

  document
    .querySelector(
      "[data-preventive-task-count]"
    )
    .textContent = "0";

  populateReferenceOptions();

  clearFormState(
    form,
    maintenanceElements
      .preventiveFormError
  );
}

function updateCustomIntervalVisibility() {
  const custom =
    normalizeStatus(
      document.getElementById(
        "preventiveFrequency"
      ).value
    ) === "custom";

  const group =
    document.getElementById(
      "preventiveCustomIntervalGroup"
    );

  group.hidden = !custom;

  document.getElementById(
    "preventiveCustomIntervalDays"
  ).required = custom;
}

function openPreventiveScheduleEditor(
  scheduleId
) {
  if (!canManageMaintenance()) {
    showToast(
      "You do not have permission to manage preventive schedules.",
      "danger"
    );

    return;
  }

  const schedule =
    findScheduleById(
      scheduleId
    );

  if (!schedule) {
    showToast(
      "Preventive schedule could not be found.",
      "danger"
    );

    return;
  }

  resetPreventiveMaintenanceForm();

  document.getElementById(
    "preventiveScheduleId"
  ).value =
    getRecordId(schedule);

  document.getElementById(
    "preventiveAssetId"
  ).value =
    getAssetId(schedule);

  document.getElementById(
    "preventiveScheduleName"
  ).value =
    schedule.name || "";

  document.getElementById(
    "preventiveFrequency"
  ).value =
    schedule.frequency ||
    "Quarterly";

  document.getElementById(
    "preventiveNextDueDate"
  ).value =
    String(
      schedule.next_due_date ||
      schedule.due_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "preventiveCustomIntervalDays"
  ).value =
    schedule.custom_interval_days ??
    "";

  document.getElementById(
    "preventiveTechnicianId"
  ).value =
    getTechnicianId(schedule);

  document.getElementById(
    "preventiveEstimatedDuration"
  ).value =
    schedule.estimated_duration_hours ??
    "";

  document.getElementById(
    "preventiveTaskDescription"
  ).value =
    schedule.task_description ||
    schedule.description ||
    "";

  document.getElementById(
    "preventiveAutoCreate"
  ).checked =
    toBoolean(
      schedule.auto_create_request,
      true
    );

  document.getElementById(
    "preventiveNotifications"
  ).checked =
    toBoolean(
      schedule.notifications_enabled,
      true
    );

  document
    .querySelector(
      "[data-preventive-form-title]"
    )
    .textContent =
      "Edit Preventive Schedule";

  maintenanceElements
    .preventiveSubmitButton.textContent =
      "Update Schedule";

  document
    .querySelector(
      "[data-preventive-task-count]"
    )
    .textContent =
      String(
        (
          schedule.task_description ||
          schedule.description ||
          ""
        ).length
      );

  updateCustomIntervalVisibility();

  openModal(
    maintenanceElements.preventiveModal
  );
}

async function submitPreventiveMaintenance(
  event
) {
  event.preventDefault();

  if (!canManageMaintenance()) {
    return;
  }

  const form =
    maintenanceElements.preventiveForm;

  clearFormState(
    form,
    maintenanceElements
      .preventiveFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const scheduleId =
    document.getElementById(
      "preventiveScheduleId"
    ).value;

  const frequency =
    document.getElementById(
      "preventiveFrequency"
    ).value;

  const payload = {
    asset_id:
      document.getElementById(
        "preventiveAssetId"
      ).value,

    name:
      document.getElementById(
        "preventiveScheduleName"
      ).value.trim(),

    frequency,

    next_due_date:
      document.getElementById(
        "preventiveNextDueDate"
      ).value,

    custom_interval_days:
      normalizeStatus(frequency) ===
        "custom"
        ? Number(
            document.getElementById(
              "preventiveCustomIntervalDays"
            ).value
          )
        : null,

    technician_id:
      document.getElementById(
        "preventiveTechnicianId"
      ).value || null,

    estimated_duration_hours:
      document.getElementById(
        "preventiveEstimatedDuration"
      ).value
        ? Number(
            document.getElementById(
              "preventiveEstimatedDuration"
            ).value
          )
        : null,

    task_description:
      document.getElementById(
        "preventiveTaskDescription"
      ).value.trim(),

    auto_create_request:
      document.getElementById(
        "preventiveAutoCreate"
      ).checked,

    notifications_enabled:
      document.getElementById(
        "preventiveNotifications"
      ).checked
  };

  setButtonLoading(
    maintenanceElements
      .preventiveSubmitButton,
    true,
    scheduleId
      ? "Updating..."
      : "Creating..."
  );

  try {
    if (scheduleId) {
      const encodedId =
        encodeURIComponent(
          scheduleId
        );

      await requestWithFallback(
        [
          `/maintenance-schedules/${encodedId}`,
          `/preventive-maintenance/${encodedId}`,
          `/preventive-maintenance-schedules/${encodedId}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        MAINTENANCE_CONFIG
          .ENDPOINTS.SCHEDULES,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      maintenanceElements
        .preventiveModal
    );

    showToast(
      scheduleId
        ? "Preventive schedule updated successfully."
        : "Preventive schedule created successfully.",
      "success"
    );

    await loadMaintenanceData();

    activateMaintenanceTab(
      "schedule"
    );
  } catch (error) {
    applyFormError(
      form,
      maintenanceElements
        .preventiveFormError,
      error
    );
  } finally {
    setButtonLoading(
      maintenanceElements
        .preventiveSubmitButton,
      false
    );
  }
}

/* =========================================================
   DETAILS MODAL
   ========================================================= */

function setDetailText(
  selector,
  value
) {
  const element =
    document.querySelector(
      selector
    );

  if (element) {
    element.textContent =
      value ?? "—";
  }
}

function renderMaintenanceDetails(
  request
) {
  maintenanceState.selectedRequestId =
    getRecordId(request);

  const status =
    getRequestStatus(request);

  const priority =
    getRequestPriority(request);

  setDetailText(
    "[data-maintenance-detail-asset]",
    getAssetName(request)
  );

  setDetailText(
    "[data-maintenance-detail-reference]",
    request.reference ||
    request.request_reference ||
    `Maintenance #${getRecordId(
      request
    )}`
  );

  setDetailText(
    "[data-maintenance-detail-reporter]",
    getReporterName(request)
  );

  setDetailText(
    "[data-maintenance-detail-technician]",
    getTechnicianName(request)
  );

  setDetailText(
    "[data-maintenance-detail-reported-date]",
    formatDateTime(
      request.reported_at ||
      request.reported_date ||
      request.created_at
    )
  );

  setDetailText(
    "[data-maintenance-detail-estimated-completion]",
    formatDate(
      request.estimated_completion_date ||
      request.preferred_completion_date
    )
  );

  setDetailText(
    "[data-maintenance-detail-location]",
    getAssetLocation(request)
  );

  setDetailText(
    "[data-maintenance-detail-estimated-cost]",
    formatCurrency(
      request.estimated_cost
    )
  );

  setDetailText(
    "[data-maintenance-detail-title]",
    request.title ||
    "Maintenance Issue"
  );

  setDetailText(
    "[data-maintenance-detail-description]",
    request.description ||
    "No issue description was provided."
  );

  const statusElement =
    document.querySelector(
      "[data-maintenance-detail-status]"
    );

  if (statusElement) {
    statusElement.textContent =
      status;

    statusElement.className =
      `badge badge-dot ${requestStatusBadgeClass(
        status
      )}`;
  }

  const priorityElement =
    document.querySelector(
      "[data-maintenance-detail-priority]"
    );

  if (priorityElement) {
    priorityElement.textContent =
      `${priority} Priority`;

    priorityElement.className =
      `badge ${
        normalizeStatus(priority) ===
          "critical"
          ? "badge-danger"
          : (
              normalizeStatus(priority) ===
                "high"
                ? "badge-warning"
                : "badge-info"
            )
      }`;
  }

  const issueTypeElement =
    document.querySelector(
      "[data-maintenance-detail-issue-type]"
    );

  if (issueTypeElement) {
    issueTypeElement.textContent =
      titleCase(
        request.issue_type ||
        "Other"
      );
  }

  const riskBanner =
    document.querySelector(
      "[data-maintenance-risk-banner]"
    );

  if (riskBanner) {
    riskBanner.hidden =
      !toBoolean(
        request.safety_risk,
        false
      );
  }

  const active =
    isActiveRequest(request);

  const editButton =
    document.querySelector(
      "[data-edit-current-maintenance]"
    );

  const updateButton =
    document.querySelector(
      "[data-update-current-maintenance]"
    );

  const completeButton =
    document.querySelector(
      "[data-complete-current-maintenance]"
    );

  if (editButton) {
    editButton.hidden =
      !active ||
      !canEditMaintenanceRequest(
        request
      );
  }

  if (updateButton) {
    updateButton.hidden =
      !active ||
      !canManageMaintenance();
  }

  if (completeButton) {
    completeButton.hidden =
      !active ||
      !canManageMaintenance();
  }
}

function maintenanceActivityColor(
  action = ""
) {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes(
      "complete"
    ) ||
    normalized.includes(
      "resolve"
    )
  ) {
    return "var(--color-success)";
  }

  if (
    normalized.includes(
      "cancel"
    )
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes(
      "assign"
    )
  ) {
    return "var(--color-info)";
  }

  if (
    normalized.includes(
      "part"
    ) ||
    normalized.includes(
      "hold"
    )
  ) {
    return "var(--color-warning)";
  }

  return "var(--color-primary)";
}

function maintenanceActivityIcon(
  action = ""
) {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes(
      "complete"
    ) ||
    normalized.includes(
      "resolve"
    )
  ) {
    return `
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m8 12 3 3 5-6"></path>
    `;
  }

  if (
    normalized.includes(
      "assign"
    )
  ) {
    return `
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M3 21v-2a6 6 0 0 1 6-6"></path>
      <path d="M16 11h6"></path>
    `;
  }

  return `
    <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.3 7.3"></path>
    <path d="m5 19 4-4"></path>
  `;
}

function renderMaintenanceActivity(
  activity
) {
  const container =
    document.querySelector(
      "[data-maintenance-activity-timeline]"
    );

  const count =
    document.querySelector(
      "[data-maintenance-activity-count]"
    );

  if (!container) {
    return;
  }

  if (count) {
    count.textContent =
      `${activity.length} ${
        activity.length === 1
          ? "event"
          : "events"
      }`;
  }

  if (
    activity.length === 0
  ) {
    container.innerHTML = `
      <div class="state-container">
        <h3 class="state-title">
          No maintenance activity
        </h3>

        <p class="state-description">
          Assignment, progress and completion updates will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    activity
      .slice(0, 10)
      .map((item) => {
        const action =
          item.action ||
          item.type ||
          "Maintenance updated";

        const message =
          item.message ||
          item.description ||
          item.progress_note ||
          `${titleCase(
            action
          )} recorded.`;

        const actor =
          item.user_name ||
          item.actor_name ||
          item.user?.name ||
          "AssetFlow";

        const timestamp =
          item.timestamp ||
          item.created_at ||
          item.updated_at;

        return `
          <div class="timeline-item maintenance-data-enter">
            <div
              class="maintenance-activity-marker"
              style="
                --activity-color:
                  ${maintenanceActivityColor(
                    action
                  )};
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
                ${maintenanceActivityIcon(
                  action
                )}
              </svg>
            </div>

            <div class="maintenance-activity-content">
              <h4 class="maintenance-activity-title">
                ${escapeHTML(
                  titleCase(action)
                )}
              </h4>

              <p class="maintenance-activity-description">
                ${escapeHTML(message)}
              </p>

              <p class="maintenance-activity-meta">
                ${escapeHTML(actor)}
                ·
                ${escapeHTML(
                  formatRelativeTime(
                    timestamp
                  )
                )}
              </p>
            </div>
          </div>
        `;
      })
      .join("");
}

async function openMaintenanceDetails(
  requestId
) {
  let request =
    findRequestById(
      requestId
    );

  if (!request) {
    showToast(
      "Maintenance request could not be found.",
      "danger"
    );

    return;
  }

  renderMaintenanceDetails(
    request
  );

  renderMaintenanceActivity([]);

  openModal(
    maintenanceElements.detailsModal
  );

  try {
    const [
      detailResult,
      activityResult
    ] = await Promise.allSettled([
      fetchMaintenanceById(
        requestId
      ),

      fetchMaintenanceActivity(
        requestId
      )
    ]);

    if (
      detailResult.status ===
      "fulfilled"
    ) {
      request = {
        ...request,
        ...detailResult.value
      };

      renderMaintenanceDetails(
        request
      );
    }

    if (
      activityResult.status ===
      "fulfilled"
    ) {
      renderMaintenanceActivity(
        activityResult.value
      );
    }
  } catch (error) {
    console.error(
      "Maintenance details loading failed:",
      error
    );
  }
}

/* =========================================================
   CSV EXPORT
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

function exportMaintenanceHistory() {
  const records =
    getFilteredHistory();

  if (
    records.length === 0
  ) {
    showToast(
      "There are no maintenance records to export.",
      "warning"
    );

    return;
  }

  const headings = [
    "Request Reference",
    "Asset",
    "Asset Tag",
    "Issue",
    "Issue Type",
    "Priority",
    "Technician",
    "Reported Date",
    "Completed Date",
    "Resolution",
    "Final Cost",
    "Post-maintenance Condition"
  ];

  const rows =
    records.map((request) => [
      request.reference ||
      request.request_reference ||
      `MNT-${getRecordId(request)}`,

      getAssetName(request),
      getAssetTag(request),
      request.title || "",
      titleCase(
        request.issue_type || ""
      ),
      getRequestPriority(request),
      getTechnicianName(request),

      formatDate(
        request.reported_at ||
        request.reported_date ||
        request.created_at
      ),

      formatDate(
        request.completed_date ||
        request.completed_at ||
        request.resolved_at ||
        request.updated_at
      ),

      request.resolution ||
      request.resolution_summary ||
      "",

      firstDefined(
        request,
        [
          "final_cost",
          "actual_cost",
          "cost"
        ],
        ""
      ),

      request.post_maintenance_condition ||
      ""
    ]);

  const csvContent = [
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

  const blob =
    new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `assetflow-maintenance-history-${todayISO()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    "Maintenance history exported successfully.",
    "success"
  );
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadMaintenanceData({
  showSuccessToast = false
} = {}) {
  if (
    maintenanceState.loading
  ) {
    return;
  }

  maintenanceState.abortController
    ?.abort();

  maintenanceState.abortController =
    new AbortController();

  const signal =
    maintenanceState
      .abortController.signal;

  setMaintenanceLoading(true);
  hidePageError();

  try {
    const [
      requestsResult,
      schedulesResult,
      assetsResult,
      usersResult,
      departmentsResult
    ] = await Promise.allSettled([
      fetchMaintenanceRequests(
        signal
      ),

      fetchMaintenanceSchedules(
        signal
      ),

      fetchAssets(signal),
      fetchUsers(signal),
      fetchDepartments(signal)
    ]);

    if (
      requestsResult.status ===
      "rejected"
    ) {
      throw requestsResult.reason;
    }

    if (
      assetsResult.status ===
      "rejected"
    ) {
      throw assetsResult.reason;
    }

    maintenanceState.requests =
      requestsResult.value;

    maintenanceState.schedules =
      schedulesResult.status ===
      "fulfilled"
        ? schedulesResult.value
        : [];

    maintenanceState.assets =
      assetsResult.value;

    maintenanceState.users =
      usersResult.status ===
      "fulfilled"
        ? usersResult.value
        : [];

    maintenanceState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    renderMaintenancePage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Maintenance data refreshed.",
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
      "Maintenance data loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load maintenance data."
    );

    showToast(
      error?.message ||
      "Unable to load maintenance data.",
      "danger"
    );
  } finally {
    setMaintenanceLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-maintenance-last-updated]"
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
   URL ACTIONS
   ========================================================= */

function processURLActions() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const tab =
    parameters.get("tab");

  const assetId =
    parameters.get("asset_id");

  const requestId =
    parameters.get(
      "request_id"
    ) ||
    parameters.get(
      "maintenance_id"
    );

  if (tab) {
    activateMaintenanceTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (assetId) {
    resetMaintenanceRequestForm();

    maintenanceElements
      .assetSelect.value =
      assetId;

    updateMaintenanceAssetPreview();

    openModal(
      maintenanceElements.requestModal
    );
  }

  if (requestId) {
    openMaintenanceDetails(
      requestId
    );
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-maintenance-tab]"
    );

  if (tab) {
    activateMaintenanceTab(
      tab.dataset
        .maintenanceTab
    );

    return;
  }

  const pageButton =
    event.target.closest(
      "[data-maintenance-page]"
    );

  if (pageButton) {
    const page =
      Number(
        pageButton.dataset
          .maintenancePage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      maintenanceState.currentPage =
        page;

      renderMaintenanceRequests();
    }

    return;
  }

  const resetFilters =
    event.target.closest(
      "[data-reset-maintenance-filters]"
    );

  if (resetFilters) {
    resetMaintenanceFilters();
    return;
  }

  const createRequest =
    event.target.closest(
      "[data-create-maintenance-request]"
    );

  if (createRequest) {
    resetMaintenanceRequestForm();
    return;
  }

  const createSchedule =
    event.target.closest(
      "[data-create-maintenance-schedule]"
    );

  if (createSchedule) {
    resetPreventiveMaintenanceForm();
    return;
  }

  const viewRequest =
    event.target.closest(
      "[data-view-maintenance]"
    );

  if (viewRequest) {
    openMaintenanceDetails(
      viewRequest.dataset
        .viewMaintenance
    );

    return;
  }

  const editRequest =
    event.target.closest(
      "[data-edit-maintenance]"
    );

  if (editRequest) {
    openMaintenanceEditor(
      editRequest.dataset
        .editMaintenance
    );

    return;
  }

  const updateRequest =
    event.target.closest(
      "[data-update-maintenance]"
    );

  if (updateRequest) {
    openMaintenanceUpdate(
      updateRequest.dataset
        .updateMaintenance
    );

    return;
  }

  const completeRequest =
    event.target.closest(
      "[data-complete-maintenance]"
    );

  if (completeRequest) {
    openCompleteMaintenance(
      completeRequest.dataset
        .completeMaintenance
    );

    return;
  }

  const editSchedule =
    event.target.closest(
      "[data-edit-maintenance-schedule]"
    );

  if (editSchedule) {
    openPreventiveScheduleEditor(
      editSchedule.dataset
        .editMaintenanceSchedule
    );

    return;
  }

  const editCurrent =
    event.target.closest(
      "[data-edit-current-maintenance]"
    );

  if (
    editCurrent &&
    maintenanceState
      .selectedRequestId
  ) {
    openMaintenanceEditor(
      maintenanceState
        .selectedRequestId
    );

    return;
  }

  const updateCurrent =
    event.target.closest(
      "[data-update-current-maintenance]"
    );

  if (
    updateCurrent &&
    maintenanceState
      .selectedRequestId
  ) {
    openMaintenanceUpdate(
      maintenanceState
        .selectedRequestId
    );

    return;
  }

  const completeCurrent =
    event.target.closest(
      "[data-complete-current-maintenance]"
    );

  if (
    completeCurrent &&
    maintenanceState
      .selectedRequestId
  ) {
    openCompleteMaintenance(
      maintenanceState
        .selectedRequestId
    );

    return;
  }

  const exportHistory =
    event.target.closest(
      "[data-export-maintenance-history]"
    );

  if (exportHistory) {
    exportMaintenanceHistory();
  }
}

function bindMaintenanceEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  maintenanceElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadMaintenanceData({
          showSuccessToast: true
        });
      }
    );

  maintenanceElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadMaintenanceData();
      }
    );

  maintenanceElements.requestForm
    ?.addEventListener(
      "submit",
      submitMaintenanceRequest
    );

  maintenanceElements.updateForm
    ?.addEventListener(
      "submit",
      submitMaintenanceUpdate
    );

  maintenanceElements.completeForm
    ?.addEventListener(
      "submit",
      submitCompleteMaintenance
    );

  maintenanceElements.preventiveForm
    ?.addEventListener(
      "submit",
      submitPreventiveMaintenance
    );

  maintenanceElements.assetSelect
    ?.addEventListener(
      "change",
      updateMaintenanceAssetPreview
    );

  maintenanceElements.searchInput
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            maintenanceState.search =
              event.target.value;

            maintenanceState.currentPage =
              1;

            renderMaintenanceRequests();
          },
          250
        ) ||
        ((event) => {
          maintenanceState.search =
            event.target.value;

          maintenanceState.currentPage =
            1;

          renderMaintenanceRequests();
        })
    );

  maintenanceElements.statusFilter
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.statusFilter =
          event.target.value;

        maintenanceState.currentPage =
          1;

        renderMaintenanceRequests();
      }
    );

  maintenanceElements.priorityFilter
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.priorityFilter =
          event.target.value;

        maintenanceState.currentPage =
          1;

        renderMaintenanceRequests();
      }
    );

  maintenanceElements.technicianFilter
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.technicianFilter =
          event.target.value;

        maintenanceState.currentPage =
          1;

        renderMaintenanceRequests();
      }
    );

  maintenanceElements.departmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.departmentFilter =
          event.target.value;

        maintenanceState.currentPage =
          1;

        renderMaintenanceRequests();
      }
    );

  maintenanceElements.scheduleStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.scheduleStatusFilter =
          event.target.value;

        renderMaintenanceSchedules();
      }
    );

  maintenanceElements.historyFrom
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.historyFrom =
          event.target.value;

        renderMaintenanceHistory();
      }
    );

  maintenanceElements.historyTo
    ?.addEventListener(
      "change",
      (event) => {
        maintenanceState.historyTo =
          event.target.value;

        renderMaintenanceHistory();
      }
    );

  document
    .getElementById(
      "preventiveFrequency"
    )
    ?.addEventListener(
      "change",
      updateCustomIntervalVisibility
    );

  document
    .getElementById(
      "maintenanceIssueDescription"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-maintenance-description-count]"
          )
          .textContent =
            String(
              event.target.value.length
            );
      }
    );

  document
    .getElementById(
      "maintenanceInitialNotes"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-maintenance-notes-count]"
          )
          .textContent =
            String(
              event.target.value.length
            );
      }
    );

  document
    .getElementById(
      "maintenanceProgressNote"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-maintenance-progress-count]"
          )
          .textContent =
            String(
              event.target.value.length
            );
      }
    );

  document
    .getElementById(
      "maintenanceResolution"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-maintenance-resolution-count]"
          )
          .textContent =
            String(
              event.target.value.length
            );
      }
    );

  document
    .getElementById(
      "preventiveTaskDescription"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-preventive-task-count]"
          )
          .textContent =
            String(
              event.target.value.length
            );
      }
    );
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeMaintenanceHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "Maintenance Management",

      subtitle:
        "Track repairs and preventive service"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeMaintenanceHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeMaintenance() {
  if (
    maintenanceState.initialized
  ) {
    return;
  }

  maintenanceState.initialized =
    true;

  cacheMaintenanceElements();
  enforceMaintenancePermissions();
  bindMaintenanceEvents();
  initializeMaintenanceHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "requests";

  activateMaintenanceTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadMaintenanceData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:maintenance-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    maintenanceState.abortController
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
    initializeMaintenance
  );
} else {
  initializeMaintenance();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowMaintenance =
  Object.freeze({
    initialize:
      initializeMaintenance,

    refresh:
      loadMaintenanceData,

    render:
      renderMaintenancePage,

    activateTab:
      activateMaintenanceTab,

    openDetails:
      openMaintenanceDetails,

    openEditor:
      openMaintenanceEditor,

    openUpdate:
      openMaintenanceUpdate,

    openCompletion:
      openCompleteMaintenance,

    openScheduleEditor:
      openPreventiveScheduleEditor,

    resetFilters:
      resetMaintenanceFilters,

    exportHistory:
      exportMaintenanceHistory,

    getState() {
      return {
        ...maintenanceState,
        abortController: undefined
      };
    }
  });