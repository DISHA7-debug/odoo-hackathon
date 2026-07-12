/* =========================================================
   AssetFlow — Asset Allocation Controller
   File: frontend/asset-allocation/asset-allocation.js

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

const ALLOCATION_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  MANAGER_ROLES: Object.freeze([
    "Admin",
    "AssetManager"
  ]),

  REVIEW_ROLES: Object.freeze([
    "Admin",
    "AssetManager"
  ]),

  ENDPOINTS: Object.freeze({
    ALLOCATIONS: [
      "/allocations",
      "/asset-allocations"
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
    ],

    TRANSFERS: [
      "/transfer-requests",
      "/asset-transfers",
      "/transfers"
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const allocationState = {
  allocations: [],
  assets: [],
  users: [],
  departments: [],
  transfers: [],
  history: [],

  filteredAllocations: [],

  activeTab: "active",

  search: "",
  statusFilter: "",
  departmentFilter: "",
  holderFilter: "",

  transferStatusFilter: "",

  returnHistoryFrom: "",
  returnHistoryTo: "",

  currentPage: 1,

  selectedAllocationId: null,
  selectedTransferId: null,

  loading: false,
  initialized: false,
  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const allocationElements = {};

function cacheAllocationElements() {
  allocationElements.main =
    document.getElementById(
      "assetAllocationMain"
    );

  allocationElements.errorAlert =
    document.getElementById(
      "allocationPageErrorAlert"
    );

  allocationElements.errorMessage =
    document.getElementById(
      "allocationPageErrorMessage"
    );

  allocationElements.refreshButton =
    document.querySelector(
      "[data-refresh-allocations]"
    );

  allocationElements.retryButton =
    document.querySelector(
      "[data-retry-allocations]"
    );

  allocationElements.searchInput =
    document.querySelector(
      "[data-allocation-search]"
    );

  allocationElements.statusFilter =
    document.querySelector(
      "[data-allocation-status-filter]"
    );

  allocationElements.departmentFilter =
    document.querySelector(
      "[data-allocation-department-filter]"
    );

  allocationElements.holderFilter =
    document.querySelector(
      "[data-allocation-holder-filter]"
    );

  allocationElements.transferStatusFilter =
    document.querySelector(
      "[data-transfer-status-filter]"
    );

  allocationElements.historyFrom =
    document.querySelector(
      "[data-return-history-from]"
    );

  allocationElements.historyTo =
    document.querySelector(
      "[data-return-history-to]"
    );

  allocationElements.activeTableBody =
    document.getElementById(
      "activeAllocationsTableBody"
    );

  allocationElements.activeTableContainer =
    allocationElements.activeTableBody
      ?.closest(".table-container");

  allocationElements.activeEmptyState =
    document.getElementById(
      "activeAllocationsEmptyState"
    );

  allocationElements.transferTableBody =
    document.getElementById(
      "transferRequestsTableBody"
    );

  allocationElements.transferTableContainer =
    allocationElements.transferTableBody
      ?.closest(".table-container");

  allocationElements.transferEmptyState =
    document.getElementById(
      "transferRequestsEmptyState"
    );

  allocationElements.historyTableBody =
    document.getElementById(
      "returnHistoryTableBody"
    );

  allocationElements.historyTableContainer =
    allocationElements.historyTableBody
      ?.closest(".table-container");

  allocationElements.historyEmptyState =
    document.getElementById(
      "returnHistoryEmptyState"
    );

  allocationElements.pagination =
    document.querySelector(
      "[data-allocation-pagination]"
    );

  allocationElements.paginationSummary =
    document.querySelector(
      "[data-allocation-pagination-summary]"
    );

  allocationElements.allocateModal =
    document.getElementById(
      "allocateAssetModal"
    );

  allocationElements.allocateForm =
    document.getElementById(
      "allocateAssetForm"
    );

  allocationElements.allocateFormError =
    document.querySelector(
      "[data-allocation-form-error]"
    );

  allocationElements.allocateSubmitButton =
    document.getElementById(
      "allocateAssetSubmitButton"
    );

  allocationElements.allocationAssetSelect =
    document.getElementById(
      "allocationAssetId"
    );

  allocationElements.allocationEmployeeSelect =
    document.getElementById(
      "allocationEmployeeId"
    );

  allocationElements.assetPreview =
    document.getElementById(
      "allocationAssetPreview"
    );

  allocationElements.conflictWarning =
    document.getElementById(
      "allocationConflictWarning"
    );

  allocationElements.returnModal =
    document.getElementById(
      "returnAssetModal"
    );

  allocationElements.returnForm =
    document.getElementById(
      "returnAssetForm"
    );

  allocationElements.returnFormError =
    document.querySelector(
      "[data-return-form-error]"
    );

  allocationElements.returnSubmitButton =
    document.getElementById(
      "returnAssetSubmitButton"
    );

  allocationElements.transferModal =
    document.getElementById(
      "transferAssetModal"
    );

  allocationElements.transferForm =
    document.getElementById(
      "transferAssetForm"
    );

  allocationElements.transferFormError =
    document.querySelector(
      "[data-transfer-form-error]"
    );

  allocationElements.transferSubmitButton =
    document.getElementById(
      "transferAssetSubmitButton"
    );

  allocationElements.transferEmployeeSelect =
    document.getElementById(
      "transferEmployeeId"
    );

  allocationElements.detailsModal =
    document.getElementById(
      "allocationDetailsModal"
    );

  allocationElements.reviewModal =
    document.getElementById(
      "transferReviewModal"
    );

  allocationElements.reviewError =
    document.querySelector(
      "[data-transfer-review-error]"
    );

  allocationElements.approveTransferButton =
    document.querySelector(
      "[data-approve-transfer]"
    );

  allocationElements.rejectTransferButton =
    document.querySelector(
      "[data-reject-transfer]"
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
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
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

function formatRelativeTime(value) {
  if (
    window.AssetFlowUtils
      ?.getRelativeTime
  ) {
    return window.AssetFlowUtils
      .getRelativeTime(value);
  }

  return formatDate(value);
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

  return `${words[0][0]}${words[1][0]}`
    .toUpperCase();
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

  if (typeof value === "boolean") {
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

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getRecordId(record) {
  return (
    record?.id ??
    record?.allocation_id ??
    record?.asset_id ??
    record?.employee_id ??
    record?.user_id ??
    record?.department_id ??
    record?.transfer_id ??
    record?.request_id ??
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

function canManageAllocations() {
  return ALLOCATION_CONFIG
    .MANAGER_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function canReviewTransfers() {
  return ALLOCATION_CONFIG
    .REVIEW_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function enforceAllocationPermissions() {
  const canManage =
    canManageAllocations();

  document
    .querySelectorAll(
      '[data-roles="Admin,AssetManager"]'
    )
    .forEach((element) => {
      element.hidden = !canManage;
    });
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

    error.status = response.status;
    error.field = data?.field;
    error.data = data;

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

async function fetchAllocations(signal) {
  const response =
    await requestWithFallback(
      ALLOCATION_CONFIG
        .ENDPOINTS.ALLOCATIONS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    [
      "allocations",
      "asset_allocations"
    ]
  );
}

async function fetchAssets(signal) {
  const response =
    await requestWithFallback(
      ALLOCATION_CONFIG.ENDPOINTS.ASSETS,
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
  const response =
    await requestWithFallback(
      ALLOCATION_CONFIG.ENDPOINTS.USERS,
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
}

async function fetchDepartments(signal) {
  try {
    const response =
      await requestWithFallback(
        ALLOCATION_CONFIG
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

async function fetchTransfers(signal) {
  try {
    const response =
      await requestWithFallback(
        ALLOCATION_CONFIG
          .ENDPOINTS.TRANSFERS,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "transfer_requests",
        "asset_transfers",
        "transfers"
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

async function fetchAllocationById(
  allocationId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      allocationId
    );

  const response =
    await requestWithFallback(
      [
        `/allocations/${encodedId}`,
        `/asset-allocations/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

async function fetchAllocationActivity(
  allocationId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      allocationId
    );

  try {
    const response =
      await requestWithFallback(
        [
          `/allocations/${encodedId}/activity`,
          `/allocations/${encodedId}/history`,
          `/asset-allocations/${encodedId}/history`,
          `/activity-logs?entity_type=Allocation&entity_id=${encodedId}`
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
        "activity_logs",
        "logs"
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
   RELATIONSHIP RESOLVERS
   ========================================================= */

function getAssetReference(record) {
  return (
    record?.asset ||
    record?.asset_record ||
    record?.asset_id ||
    null
  );
}

function getAssetByReference(
  reference
) {
  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return (
    allocationState.assets.find(
      (asset) =>
        String(getRecordId(asset)) ===
        String(reference)
    ) || null
  );
}

function getAsset(record) {
  return getAssetByReference(
    getAssetReference(record)
  );
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

function getUserReference(record) {
  return (
    record?.employee ||
    record?.user ||
    record?.holder ||
    record?.allocated_to ||
    record?.employee_id ||
    record?.user_id ||
    record?.holder_id ||
    null
  );
}

function getUserByReference(
  reference
) {
  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return (
    allocationState.users.find(
      (user) =>
        String(getRecordId(user)) ===
        String(reference)
    ) || null
  );
}

function getUser(record) {
  return getUserByReference(
    getUserReference(record)
  );
}

function getUserId(record) {
  const reference =
    getUserReference(record);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getUserName(record) {
  const user = getUser(record);

  return (
    user?.name ||
    user?.full_name ||
    record?.employee_name ||
    record?.user_name ||
    record?.holder_name ||
    "Unknown Employee"
  );
}

function getUserEmail(record) {
  const user = getUser(record);

  return (
    user?.email ||
    record?.employee_email ||
    record?.user_email ||
    ""
  );
}

function getDepartmentReference(record) {
  const user = getUser(record);
  const asset = getAsset(record);

  return (
    record?.department ||
    record?.department_id ||
    user?.department ||
    user?.department_id ||
    asset?.department ||
    asset?.department_id ||
    null
  );
}

function getDepartmentByReference(
  reference
) {
  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return (
    allocationState.departments.find(
      (department) =>
        String(
          getRecordId(department)
        ) ===
        String(reference)
    ) || null
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
  const department =
    getDepartmentByReference(
      getDepartmentReference(record)
    );

  return (
    department?.name ||
    record?.department_name ||
    "Unassigned"
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

  return (
    asset?.location_name ||
    record?.location_name ||
    "Location not set"
  );
}

/* =========================================================
   ALLOCATION STATUS
   ========================================================= */

function isCompletedAllocation(
  allocation
) {
  const status =
    normalizeStatus(
      allocation.status
    );

  return (
    [
      "returned",
      "completed",
      "closed",
      "transferred"
    ].includes(status) ||
    Boolean(
      allocation.actual_return_date ||
      allocation.returned_at
    )
  );
}

function isActiveAllocation(
  allocation
) {
  if (isCompletedAllocation(allocation)) {
    return false;
  }

  const status =
    normalizeStatus(
      allocation.status
    );

  return (
    !status ||
    [
      "active",
      "allocated",
      "overdue"
    ].includes(status)
  );
}

function getExpectedReturnDate(
  allocation
) {
  return firstDefined(
    allocation,
    [
      "expected_return_date",
      "return_due_date",
      "due_date"
    ]
  );
}

function getAllocationDate(
  allocation
) {
  return firstDefined(
    allocation,
    [
      "allocation_date",
      "allocated_at",
      "created_at"
    ]
  );
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

function getReturnStatus(
  allocation
) {
  const expectedReturn =
    getExpectedReturnDate(
      allocation
    );

  if (!expectedReturn) {
    return "Active";
  }

  const daysUntil =
    calculateDaysUntil(
      expectedReturn
    );

  if (daysUntil === null) {
    return "Active";
  }

  if (daysUntil < 0) {
    return "Overdue";
  }

  if (daysUntil <= 7) {
    return "DueSoon";
  }

  return "Active";
}

function returnStatusLabel(status) {
  const normalized =
    normalizeStatus(status);

  const labels = {
    active: "On Schedule",
    "due soon": "Due Soon",
    overdue: "Overdue"
  };

  return (
    labels[normalized] ||
    titleCase(status)
  );
}

function returnStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    active: "badge-success",
    "due soon": "badge-warning",
    overdue: "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function allocationStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    active: "badge-info",
    allocated: "badge-info",
    returned: "badge-success",
    completed: "badge-success",
    transferred: "badge-primary",
    overdue: "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function transferStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    pending: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    cancelled: "badge-neutral",
    completed: "badge-info"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

/* =========================================================
   LOADING AND ERROR STATES
   ========================================================= */

function setAllocationLoading(
  loading
) {
  allocationState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "allocation-page-loading",
    allocationState.loading
  );

  document.body.classList.toggle(
    "allocation-refreshing",
    allocationState.loading
  );

  if (
    allocationElements.refreshButton
  ) {
    allocationElements.refreshButton.disabled =
      allocationState.loading;

    allocationElements.refreshButton.setAttribute(
      "aria-busy",
      String(
        allocationState.loading
      )
    );
  }
}

function showPageError(message) {
  if (
    allocationElements.errorAlert
  ) {
    allocationElements.errorAlert.hidden =
      false;
  }

  if (
    allocationElements.errorMessage
  ) {
    allocationElements.errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    allocationElements.errorAlert
  ) {
    allocationElements.errorAlert.hidden =
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

function getAvailableAssets() {
  const allocatedAssetIds =
    new Set(
      allocationState.allocations
        .filter(isActiveAllocation)
        .map(getAssetId)
        .map(String)
    );

  return allocationState.assets.filter(
    (asset) => {
      const id =
        String(getRecordId(asset));

      const status =
        normalizeStatus(asset.status);

      return (
        status === "available" &&
        !allocatedAssetIds.has(id)
      );
    }
  );
}

function getActiveUsers() {
  return allocationState.users.filter(
    (user) =>
      toBoolean(
        user.is_active,
        true
      )
  );
}

function populateSelectOptions() {
  const activeUsers =
    getActiveUsers();

  const availableAssets =
    getAvailableAssets();

  if (
    allocationElements
      .allocationAssetSelect
  ) {
    const selected =
      allocationElements
        .allocationAssetSelect.value;

    allocationElements
      .allocationAssetSelect.innerHTML =
      buildOptions(
        availableAssets,
        {
          selectedValue: selected,
          placeholder:
            "Select an available asset",

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
    allocationElements
      .allocationEmployeeSelect
  ) {
    const selected =
      allocationElements
        .allocationEmployeeSelect.value;

    allocationElements
      .allocationEmployeeSelect.innerHTML =
      buildOptions(
        activeUsers,
        {
          selectedValue: selected,
          placeholder:
            "Select employee",

          labelResolver(user) {
            return user.email
              ? `${user.name} — ${user.email}`
              : user.name;
          }
        }
      );
  }

  if (
    allocationElements
      .transferEmployeeSelect
  ) {
    const selected =
      allocationElements
        .transferEmployeeSelect.value;

    allocationElements
      .transferEmployeeSelect.innerHTML =
      buildOptions(
        activeUsers,
        {
          selectedValue: selected,
          placeholder:
            "Select new holder",

          labelResolver(user) {
            return user.email
              ? `${user.name} — ${user.email}`
              : user.name;
          }
        }
      );
  }

  if (
    allocationElements
      .departmentFilter
  ) {
    const selected =
      allocationElements
        .departmentFilter.value;

    allocationElements
      .departmentFilter.innerHTML =
      buildOptions(
        allocationState.departments,
        {
          selectedValue: selected,
          placeholder:
            "All departments"
        }
      );
  }

  if (
    allocationElements.holderFilter
  ) {
    const selected =
      allocationElements
        .holderFilter.value;

    allocationElements
      .holderFilter.innerHTML =
      buildOptions(
        activeUsers,
        {
          selectedValue: selected,
          placeholder:
            "All holders"
        }
      );
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderAllocationSummary() {
  const activeAllocations =
    allocationState.allocations.filter(
      isActiveAllocation
    );

  const dueSoon =
    activeAllocations.filter(
      (allocation) =>
        getReturnStatus(
          allocation
        ) === "DueSoon"
    );

  const overdue =
    activeAllocations.filter(
      (allocation) =>
        getReturnStatus(
          allocation
        ) === "Overdue"
    );

  const pendingTransfers =
    allocationState.transfers.filter(
      (transfer) =>
        normalizeStatus(
          transfer.status
        ) === "pending"
    );

  const summary = {
    active:
      activeAllocations.length,

    available:
      getAvailableAssets().length,

    due_soon:
      dueSoon.length,

    overdue:
      overdue.length,

    pending_transfers:
      pendingTransfers.length
  };

  Object.entries(summary).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-allocation-summary="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            formatNumber(value);

          element.classList.add(
            "allocation-data-enter"
          );
        });
    }
  );

  document
    .querySelectorAll(
      '[data-allocation-tab-count="active"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          activeAllocations.length
        );
    });

  document
    .querySelectorAll(
      '[data-allocation-tab-count="transfers"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          pendingTransfers.length
        );
    });
}

/* =========================================================
   ACTIVE ALLOCATION FILTERING
   ========================================================= */

function getFilteredAllocations() {
  const search =
    normalizeText(
      allocationState.search
    );

  return allocationState.allocations
    .filter(isActiveAllocation)
    .filter((allocation) => {
      const searchableText = [
        getAssetName(allocation),
        getAssetTag(allocation),
        getUserName(allocation),
        getUserEmail(allocation),
        getDepartmentName(allocation),
        getAssetLocation(allocation)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const returnStatus =
        getReturnStatus(
          allocation
        );

      const matchesStatus =
        !allocationState.statusFilter ||
        normalizeStatus(returnStatus) ===
        normalizeStatus(
          allocationState.statusFilter
        );

      const matchesDepartment =
        !allocationState.departmentFilter ||
        String(
          getDepartmentId(allocation)
        ) ===
        String(
          allocationState
            .departmentFilter
        );

      const matchesHolder =
        !allocationState.holderFilter ||
        String(
          getUserId(allocation)
        ) ===
        String(
          allocationState
            .holderFilter
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment &&
        matchesHolder
      );
    })
    .sort((first, second) => {
      const firstReturn =
        new Date(
          getExpectedReturnDate(first) ||
          "9999-12-31"
        );

      const secondReturn =
        new Date(
          getExpectedReturnDate(second) ||
          "9999-12-31"
        );

      return (
        firstReturn -
        secondReturn
      );
    });
}

/* =========================================================
   ACTIVE ALLOCATION TABLE
   ========================================================= */

function renderActiveAllocations() {
  const tableBody =
    allocationElements
      .activeTableBody;

  const tableContainer =
    allocationElements
      .activeTableContainer;

  const emptyState =
    allocationElements
      .activeEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  allocationState.filteredAllocations =
    getFilteredAllocations();

  const total =
    allocationState
      .filteredAllocations.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        ALLOCATION_CONFIG.PAGE_SIZE
      )
    );

  allocationState.currentPage =
    Math.min(
      allocationState.currentPage,
      totalPages
    );

  const startIndex =
    (
      allocationState.currentPage -
      1
    ) *
    ALLOCATION_CONFIG.PAGE_SIZE;

  const visible =
    allocationState
      .filteredAllocations
      .slice(
        startIndex,
        startIndex +
        ALLOCATION_CONFIG.PAGE_SIZE
      );

  if (visible.length === 0) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updateAllocationPagination(
      0,
      0,
      0
    );

    renderPagination(
      1,
      1
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((allocation) => {
        const id =
          getRecordId(allocation);

        const assetName =
          getAssetName(allocation);

        const holderName =
          getUserName(allocation);

        const holderEmail =
          getUserEmail(allocation);

        const returnStatus =
          getReturnStatus(allocation);

        const expectedReturn =
          getExpectedReturnDate(
            allocation
          );

        const daysUntil =
          calculateDaysUntil(
            expectedReturn
          );

        const returnMeta =
          getReturnStatusMeta(
            returnStatus,
            daysUntil,
            expectedReturn
          );

        return `
          <tr class="allocation-data-enter">
            <td>
              <button
                type="button"
                class="allocation-asset text-left"
                data-view-allocation="${escapeHTML(
                  id
                )}"
              >
                <span
                  class="allocation-asset-icon"
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
                </span>

                <span class="allocation-asset-content">
                  <span class="allocation-asset-name">
                    ${escapeHTML(assetName)}
                  </span>

                  <span class="allocation-asset-tag">
                    ${escapeHTML(
                      getAssetTag(allocation)
                    )}
                  </span>
                </span>
              </button>
            </td>

            <td>
              <div class="allocation-holder">
                <div
                  class="allocation-holder-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(holderName)
                  )}
                </div>

                <div class="allocation-holder-content">
                  <div class="allocation-holder-name">
                    ${escapeHTML(holderName)}
                  </div>

                  <div class="allocation-holder-email">
                    ${escapeHTML(
                      holderEmail ||
                      "No email"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="allocation-department">
                <span class="allocation-department-name">
                  ${escapeHTML(
                    getDepartmentName(
                      allocation
                    )
                  )}
                </span>

                <span class="allocation-location-name">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>
                    <circle
                      cx="12"
                      cy="10"
                      r="2.5"
                    ></circle>
                  </svg>

                  ${escapeHTML(
                    getAssetLocation(
                      allocation
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="allocation-date-cell">
                <span class="allocation-date-primary">
                  ${formatDate(
                    getAllocationDate(
                      allocation
                    )
                  )}
                </span>

                <span class="allocation-date-secondary">
                  ${
                    allocation.created_by_name
                      ? `By ${escapeHTML(
                          allocation.created_by_name
                        )}`
                      : "Allocation start"
                  }
                </span>
              </div>
            </td>

            <td>
              <div class="allocation-date-cell">
                <span class="allocation-date-primary">
                  ${formatDate(
                    expectedReturn
                  )}
                </span>

                <span class="allocation-date-secondary">
                  ${
                    expectedReturn
                      ? "Scheduled return"
                      : "Long-term allocation"
                  }
                </span>
              </div>
            </td>

            <td>
              <div class="allocation-return-status">
                <span
                  class="badge badge-dot ${returnStatusBadgeClass(
                    returnStatus
                  )}"
                >
                  ${escapeHTML(
                    returnStatusLabel(
                      returnStatus
                    )
                  )}
                </span>

                <span
                  class="allocation-return-meta ${returnMeta.className}"
                >
                  ${escapeHTML(
                    returnMeta.text
                  )}
                </span>
              </div>
            </td>

            <td class="text-right">
              <div class="allocation-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-allocation="${escapeHTML(
                    id
                  )}"
                  aria-label="View ${escapeHTML(
                    assetName
                  )} allocation"
                  title="View allocation"
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

                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-transfer-allocation="${escapeHTML(
                    id
                  )}"
                >
                  Transfer
                </button>

                ${
                  canManageAllocations()
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-return-allocation="${escapeHTML(
                          id
                        )}"
                      >
                        Return
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

  updateAllocationPagination(
    startIndex + 1,
    Math.min(
      startIndex +
      ALLOCATION_CONFIG.PAGE_SIZE,
      total
    ),
    total
  );

  renderPagination(
    allocationState.currentPage,
    totalPages
  );
}

function getReturnStatusMeta(
  status,
  daysUntil,
  expectedReturn
) {
  if (!expectedReturn) {
    return {
      text:
        "No return date",
      className: ""
    };
  }

  if (
    status === "Overdue"
  ) {
    const days =
      Math.abs(daysUntil);

    return {
      text:
        `${days} ${
          days === 1
            ? "day"
            : "days"
        } overdue`,

      className: "overdue"
    };
  }

  if (
    status === "DueSoon"
  ) {
    if (daysUntil === 0) {
      return {
        text: "Due today",
        className: "due-soon"
      };
    }

    return {
      text:
        `Due in ${daysUntil} ${
          daysUntil === 1
            ? "day"
            : "days"
        }`,

      className: "due-soon"
    };
  }

  return {
    text:
      `${daysUntil} days remaining`,
    className: ""
  };
}

/* =========================================================
   PAGINATION
   ========================================================= */

function updateAllocationPagination(
  start,
  end,
  total
) {
  if (
    allocationElements
      .paginationSummary
  ) {
    allocationElements
      .paginationSummary
      .textContent =
        total === 0
          ? "Showing 0 allocations"
          : `Showing ${start}–${end} of ${total} allocations`;
  }
}

function renderPagination(
  currentPage,
  totalPages
) {
  const container =
    allocationElements.pagination;

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
  const pageButtons = [];

  pages.forEach((page) => {
    if (
      previousPage &&
      page - previousPage > 1
    ) {
      pageButtons.push(`
        <span class="pagination-ellipsis">
          …
        </span>
      `);
    }

    pageButtons.push(`
      <button
        type="button"
        class="pagination-button ${
          page === currentPage
            ? "active"
            : ""
        }"
        data-allocation-page="${page}"
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
      data-allocation-page="${
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

    ${pageButtons.join("")}

    <button
      type="button"
      class="pagination-button"
      data-allocation-page="${
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
   TRANSFER REQUEST HELPERS
   ========================================================= */

function getTransferCurrentUser(
  transfer
) {
  const reference =
    transfer.current_employee ||
    transfer.current_user ||
    transfer.current_holder ||
    transfer.from_employee ||
    transfer.from_user ||
    transfer.current_employee_id ||
    transfer.from_employee_id;

  return getUserByReference(
    reference
  );
}

function getTransferNewUser(
  transfer
) {
  const reference =
    transfer.new_employee ||
    transfer.requested_employee ||
    transfer.new_user ||
    transfer.to_employee ||
    transfer.to_user ||
    transfer.new_employee_id ||
    transfer.requested_employee_id ||
    transfer.to_employee_id;

  return getUserByReference(
    reference
  );
}

function getTransferCurrentName(
  transfer
) {
  const user =
    getTransferCurrentUser(
      transfer
    );

  return (
    user?.name ||
    transfer.current_holder_name ||
    transfer.from_employee_name ||
    "Unknown Holder"
  );
}

function getTransferNewName(
  transfer
) {
  const user =
    getTransferNewUser(
      transfer
    );

  return (
    user?.name ||
    transfer.new_holder_name ||
    transfer.requested_employee_name ||
    transfer.to_employee_name ||
    "Unknown Employee"
  );
}

function getTransferAsset(
  transfer
) {
  const assetReference =
    transfer.asset ||
    transfer.asset_id;

  return getAssetByReference(
    assetReference
  );
}

function getTransferAllocation(
  transfer
) {
  const allocationReference =
    transfer.allocation ||
    transfer.allocation_id;

  if (
    typeof allocationReference ===
    "object"
  ) {
    return allocationReference;
  }

  return (
    allocationState.allocations.find(
      (allocation) =>
        String(
          getRecordId(allocation)
        ) ===
        String(
          allocationReference
        )
    ) || null
  );
}

/* =========================================================
   TRANSFER TABLE
   ========================================================= */

function getFilteredTransfers() {
  return allocationState.transfers
    .filter((transfer) => {
      if (
        !allocationState
          .transferStatusFilter
      ) {
        return true;
      }

      return (
        normalizeStatus(
          transfer.status
        ) ===
        normalizeStatus(
          allocationState
            .transferStatusFilter
        )
      );
    })
    .sort((first, second) => {
      const firstDate =
        new Date(
          first.requested_at ||
          first.created_at ||
          0
        );

      const secondDate =
        new Date(
          second.requested_at ||
          second.created_at ||
          0
        );

      return secondDate - firstDate;
    });
}

function renderTransferRequests() {
  const tableBody =
    allocationElements
      .transferTableBody;

  const tableContainer =
    allocationElements
      .transferTableContainer;

  const emptyState =
    allocationElements
      .transferEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const transfers =
    getFilteredTransfers();

  if (transfers.length === 0) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    transfers
      .map((transfer) => {
        const id =
          getRecordId(transfer);

        const asset =
          getTransferAsset(transfer) ||
          getAsset(
            getTransferAllocation(
              transfer
            ) || {}
          );

        const assetName =
          asset?.name ||
          transfer.asset_name ||
          "Unnamed Asset";

        const assetTag =
          asset?.asset_tag ||
          asset?.tag ||
          transfer.asset_tag ||
          "No asset tag";

        const currentName =
          getTransferCurrentName(
            transfer
          );

        const newName =
          getTransferNewName(
            transfer
          );

        const status =
          transfer.status ||
          "Pending";

        const isPending =
          normalizeStatus(status) ===
          "pending";

        return `
          <tr class="allocation-data-enter">
            <td>
              <div class="allocation-asset">
                <div
                  class="allocation-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    aria-hidden="true"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div class="allocation-asset-content">
                  <div class="allocation-asset-name">
                    ${escapeHTML(assetName)}
                  </div>

                  <div class="allocation-asset-tag">
                    ${escapeHTML(assetTag)}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="transfer-route-person">
                <div
                  class="transfer-route-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      currentName
                    )
                  )}
                </div>

                <span class="transfer-route-name">
                  ${escapeHTML(
                    currentName
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="transfer-route-person">
                <div
                  class="transfer-route-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(newName)
                  )}
                </div>

                <span class="transfer-route-name">
                  ${escapeHTML(newName)}
                </span>
              </div>
            </td>

            <td>
              <span class="table-secondary">
                ${formatDate(
                  transfer.requested_at ||
                  transfer.created_at
                )}
              </span>
            </td>

            <td>
              <p class="transfer-reason">
                ${escapeHTML(
                  transfer.reason ||
                  "No reason provided."
                )}
              </p>
            </td>

            <td>
              <span
                class="badge badge-dot ${transferStatusBadgeClass(
                  status
                )}"
              >
                ${escapeHTML(
                  titleCase(status)
                )}
              </span>
            </td>

            <td class="text-right">
              <div class="transfer-review-actions">
                ${
                  isPending &&
                  canReviewTransfers()
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-review-transfer="${escapeHTML(
                          id
                        )}"
                      >
                        Review
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-view-transfer="${escapeHTML(
                          id
                        )}"
                      >
                        View
                      </button>
                    `
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   RETURN HISTORY
   ========================================================= */

function getCompletedAllocations() {
  return allocationState.allocations
    .filter(isCompletedAllocation)
    .filter((allocation) => {
      const returnedDate =
        firstDefined(
          allocation,
          [
            "actual_return_date",
            "returned_at",
            "updated_at"
          ]
        );

      if (
        allocationState
          .returnHistoryFrom &&
        returnedDate
      ) {
        const returned =
          new Date(returnedDate);

        const from =
          new Date(
            allocationState
              .returnHistoryFrom
          );

        if (returned < from) {
          return false;
        }
      }

      if (
        allocationState
          .returnHistoryTo &&
        returnedDate
      ) {
        const returned =
          new Date(returnedDate);

        const to =
          new Date(
            allocationState
              .returnHistoryTo
          );

        to.setHours(
          23,
          59,
          59,
          999
        );

        if (returned > to) {
          return false;
        }
      }

      return true;
    })
    .sort((first, second) => {
      const firstDate =
        new Date(
          first.actual_return_date ||
          first.returned_at ||
          first.updated_at ||
          0
        );

      const secondDate =
        new Date(
          second.actual_return_date ||
          second.returned_at ||
          second.updated_at ||
          0
        );

      return secondDate - firstDate;
    });
}

function getReturnConditionClass(
  condition
) {
  return normalizeStatus(
    condition
  ).replace(/\s+/g, "-");
}

function renderReturnHistory() {
  const tableBody =
    allocationElements
      .historyTableBody;

  const tableContainer =
    allocationElements
      .historyTableContainer;

  const emptyState =
    allocationElements
      .historyEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const history =
    getCompletedAllocations();

  allocationState.history =
    history;

  if (history.length === 0) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    history
      .map((allocation) => {
        const id =
          getRecordId(allocation);

        const condition =
          firstDefined(
            allocation,
            [
              "return_condition",
              "condition_at_return",
              "condition"
            ],
            "Not recorded"
          );

        const processedBy =
          firstDefined(
            allocation,
            [
              "returned_by_name",
              "processed_by_name",
              "updated_by_name"
            ],
            allocation.returned_by?.name ||
            allocation.processed_by?.name ||
            "AssetFlow"
          );

        return `
          <tr class="allocation-data-enter">
            <td>
              <div class="allocation-asset">
                <div
                  class="allocation-asset-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    aria-hidden="true"
                  >
                    <path d="M21 16V8"></path>
                    <path d="m3.5 7 8.5 5 8.5-5"></path>
                    <path d="M12 22V12"></path>
                    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
                  </svg>
                </div>

                <div class="allocation-asset-content">
                  <div class="allocation-asset-name">
                    ${escapeHTML(
                      getAssetName(allocation)
                    )}
                  </div>

                  <div class="allocation-asset-tag">
                    ${escapeHTML(
                      getAssetTag(allocation)
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="allocation-holder">
                <div
                  class="allocation-holder-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      getUserName(
                        allocation
                      )
                    )
                  )}
                </div>

                <div class="allocation-holder-content">
                  <div class="allocation-holder-name">
                    ${escapeHTML(
                      getUserName(
                        allocation
                      )
                    )}
                  </div>

                  <div class="allocation-holder-email">
                    ${escapeHTML(
                      getUserEmail(
                        allocation
                      ) ||
                      "Previous holder"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="table-secondary">
                ${formatDate(
                  getAllocationDate(
                    allocation
                  )
                )}
              </span>
            </td>

            <td>
              <span class="table-primary">
                ${formatDate(
                  allocation.actual_return_date ||
                  allocation.returned_at ||
                  allocation.updated_at
                )}
              </span>
            </td>

            <td>
              <span
                class="return-condition ${getReturnConditionClass(
                  condition
                )}"
              >
                ${escapeHTML(
                  titleCase(condition)
                )}
              </span>
            </td>

            <td>
              <span class="table-secondary">
                ${escapeHTML(
                  processedBy
                )}
              </span>
            </td>

            <td class="text-right">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-view-allocation="${escapeHTML(
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
   COMPLETE RENDER
   ========================================================= */

function renderAllocationPage() {
  renderAllocationSummary();
  renderActiveAllocations();
  renderTransferRequests();
  renderReturnHistory();
  populateSelectOptions();
  enforceAllocationPermissions();
}

/* =========================================================
   TAB MANAGEMENT
   ========================================================= */

function activateAllocationTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "active",
    "transfers",
    "history"
  ];

  if (!validTabs.includes(tabName)) {
    tabName = "active";
  }

  allocationState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-allocation-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .allocationTab ===
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
      "[data-allocation-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .allocationPanel ===
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

function resetAllocationFilters() {
  allocationState.search = "";
  allocationState.statusFilter = "";
  allocationState.departmentFilter = "";
  allocationState.holderFilter = "";
  allocationState.currentPage = 1;

  if (
    allocationElements.searchInput
  ) {
    allocationElements.searchInput.value =
      "";
  }

  if (
    allocationElements.statusFilter
  ) {
    allocationElements.statusFilter.value =
      "";
  }

  if (
    allocationElements
      .departmentFilter
  ) {
    allocationElements
      .departmentFilter.value =
      "";
  }

  if (
    allocationElements.holderFilter
  ) {
    allocationElements.holderFilter.value =
      "";
  }

  renderActiveAllocations();
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

  errorContainer.hidden = false;
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
      "Unable to save the requested changes."
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
   ALLOCATION FORM
   ========================================================= */

function resetAllocationForm() {
  const form =
    allocationElements.allocateForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "allocationDate"
  ).value = todayISO();

  document.getElementById(
    "allocationCondition"
  ).value = "Good";

  document.getElementById(
    "allocationAcknowledgement"
  ).checked = false;

  allocationElements.assetPreview.hidden =
    true;

  allocationElements.conflictWarning.hidden =
    true;

  const notesCounter =
    document.querySelector(
      "[data-allocation-notes-count]"
    );

  if (notesCounter) {
    notesCounter.textContent =
      "0";
  }

  populateSelectOptions();

  clearFormState(
    form,
    allocationElements
      .allocateFormError
  );
}

function findAssetById(assetId) {
  return allocationState.assets.find(
    (asset) =>
      String(getRecordId(asset)) ===
      String(assetId)
  );
}

function findUserById(userId) {
  return allocationState.users.find(
    (user) =>
      String(getRecordId(user)) ===
      String(userId)
  );
}

function findAllocationById(
  allocationId
) {
  return allocationState.allocations.find(
    (allocation) =>
      String(
        getRecordId(allocation)
      ) ===
      String(allocationId)
  );
}

function findTransferById(
  transferId
) {
  return allocationState.transfers.find(
    (transfer) =>
      String(
        getRecordId(transfer)
      ) ===
      String(transferId)
  );
}

function updateSelectedAssetPreview() {
  const assetId =
    allocationElements
      .allocationAssetSelect?.value;

  const asset =
    findAssetById(assetId);

  if (!asset) {
    allocationElements.assetPreview.hidden =
      true;

    allocationElements.conflictWarning.hidden =
      true;

    return;
  }

  document
    .querySelector(
      "[data-allocation-preview-name]"
    )
    .textContent =
      asset.name ||
      "Unnamed Asset";

  document
    .querySelector(
      "[data-allocation-preview-tag]"
    )
    .textContent =
      asset.asset_tag ||
      asset.tag ||
      "No asset tag";

  allocationElements.assetPreview.hidden =
    false;

  const conflict =
    allocationState.allocations.find(
      (allocation) =>
        isActiveAllocation(
          allocation
        ) &&
        String(
          getAssetId(allocation)
        ) ===
        String(assetId)
    );

  if (conflict) {
    allocationElements.conflictWarning.hidden =
      false;

    const message =
      document.querySelector(
        "[data-allocation-conflict-message]"
      );

    if (message) {
      message.textContent =
        `${asset.name} is currently assigned to ${getUserName(
          conflict
        )}.`;
    }
  } else {
    allocationElements.conflictWarning.hidden =
      true;
  }
}

function buildAllocationPayload() {
  return {
    asset_id:
      document.getElementById(
        "allocationAssetId"
      ).value,

    employee_id:
      document.getElementById(
        "allocationEmployeeId"
      ).value,

    allocation_date:
      document.getElementById(
        "allocationDate"
      ).value,

    expected_return_date:
      document.getElementById(
        "allocationExpectedReturn"
      ).value || null,

    condition_at_allocation:
      document.getElementById(
        "allocationCondition"
      ).value || null,

    notes:
      document.getElementById(
        "allocationNotes"
      ).value.trim() || null
  };
}

async function submitAllocationForm(
  event
) {
  event.preventDefault();

  if (!canManageAllocations()) {
    showToast(
      "You do not have permission to allocate assets.",
      "danger"
    );

    return;
  }

  const form =
    allocationElements.allocateForm;

  clearFormState(
    form,
    allocationElements
      .allocateFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const payload =
    buildAllocationPayload();

  const existingAllocation =
    allocationState.allocations.find(
      (allocation) =>
        isActiveAllocation(
          allocation
        ) &&
        String(
          getAssetId(allocation)
        ) ===
        String(payload.asset_id)
    );

  if (existingAllocation) {
    showFormError(
      allocationElements
        .allocateFormError,
      "This asset already has an active allocation."
    );

    allocationElements.conflictWarning.hidden =
      false;

    return;
  }

  const asset =
    findAssetById(
      payload.asset_id
    );

  if (
    normalizeStatus(asset?.status) !==
    "available"
  ) {
    showFormError(
      allocationElements
        .allocateFormError,
      "Only available assets can be allocated."
    );

    return;
  }

  if (
    payload.expected_return_date &&
    payload.expected_return_date <
      payload.allocation_date
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "allocationExpectedReturn"
        ),
        "Expected return cannot be before the allocation date."
      );

    return;
  }

  setButtonLoading(
    allocationElements
      .allocateSubmitButton,
    true,
    "Allocating..."
  );

  try {
    await requestWithFallback(
      ALLOCATION_CONFIG
        .ENDPOINTS.ALLOCATIONS,
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      allocationElements
        .allocateModal
    );

    showToast(
      "Asset allocated successfully.",
      "success"
    );

    await loadAllocationData();
  } catch (error) {
    applyFormError(
      form,
      allocationElements
        .allocateFormError,
      error
    );
  } finally {
    setButtonLoading(
      allocationElements
        .allocateSubmitButton,
      false
    );
  }
}

/* =========================================================
   RETURN FORM
   ========================================================= */

function resetReturnForm() {
  const form =
    allocationElements.returnForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "returnAllocationId"
  ).value = "";

  document.getElementById(
    "actualReturnDate"
  ).value = todayISO();

  document.getElementById(
    "makeAssetAvailable"
  ).checked = true;

  document.getElementById(
    "returnConditionWarning"
  ).hidden = true;

  const counter =
    document.querySelector(
      "[data-return-notes-count]"
    );

  if (counter) {
    counter.textContent = "0";
  }

  clearFormState(
    form,
    allocationElements
      .returnFormError
  );
}

function openReturnForm(allocationId) {
  if (!canManageAllocations()) {
    showToast(
      "You do not have permission to process asset returns.",
      "danger"
    );

    return;
  }

  const allocation =
    findAllocationById(
      allocationId
    );

  if (!allocation) {
    showToast(
      "Allocation could not be found.",
      "danger"
    );

    return;
  }

  resetReturnForm();

  document.getElementById(
    "returnAllocationId"
  ).value =
    getRecordId(allocation);

  document
    .querySelector(
      "[data-return-asset-name]"
    )
    .textContent =
      getAssetName(allocation);

  document
    .querySelector(
      "[data-return-holder-name]"
    )
    .textContent =
      getUserName(allocation);

  closeModal(
    allocationElements
      .detailsModal
  );

  openModal(
    allocationElements
      .returnModal
  );
}

function updateReturnConditionWarning() {
  const condition =
    normalizeStatus(
      document.getElementById(
        "returnCondition"
      ).value
    );

  const warning =
    document.getElementById(
      "returnConditionWarning"
    );

  if (warning) {
    warning.hidden =
      ![
        "damaged",
        "lost"
      ].includes(condition);
  }

  const makeAvailable =
    document.getElementById(
      "makeAssetAvailable"
    );

  if (
    ["damaged", "lost"].includes(
      condition
    )
  ) {
    makeAvailable.checked = false;
  }
}

async function submitReturnForm(
  event
) {
  event.preventDefault();

  if (!canManageAllocations()) {
    return;
  }

  const form =
    allocationElements.returnForm;

  clearFormState(
    form,
    allocationElements
      .returnFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const allocationId =
    document.getElementById(
      "returnAllocationId"
    ).value;

  const payload = {
    actual_return_date:
      document.getElementById(
        "actualReturnDate"
      ).value,

    return_condition:
      document.getElementById(
        "returnCondition"
      ).value,

    return_notes:
      document.getElementById(
        "returnNotes"
      ).value.trim() || null,

    make_available:
      document.getElementById(
        "makeAssetAvailable"
      ).checked
  };

  setButtonLoading(
    allocationElements
      .returnSubmitButton,
    true,
    "Processing..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        allocationId
      );

    await requestWithFallback(
      [
        `/allocations/${encodedId}/return`,
        `/asset-allocations/${encodedId}/return`,
        `/allocations/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      allocationElements.returnModal
    );

    showToast(
      "Asset return recorded successfully.",
      "success"
    );

    await loadAllocationData();
  } catch (error) {
    applyFormError(
      form,
      allocationElements
        .returnFormError,
      error
    );
  } finally {
    setButtonLoading(
      allocationElements
        .returnSubmitButton,
      false
    );
  }
}

/* =========================================================
   TRANSFER FORM
   ========================================================= */

function resetTransferForm() {
  const form =
    allocationElements.transferForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "transferAllocationId"
  ).value = "";

  document
    .querySelector(
      "[data-transfer-current-holder]"
    )
    .textContent =
      "Current Holder";

  document
    .querySelector(
      "[data-transfer-current-initials]"
    )
    .textContent =
      "CH";

  document
    .querySelector(
      "[data-transfer-new-holder]"
    )
    .textContent =
      "Select Employee";

  document
    .querySelector(
      "[data-transfer-new-initials]"
    )
    .textContent =
      "?";

  const counter =
    document.querySelector(
      "[data-transfer-reason-count]"
    );

  if (counter) {
    counter.textContent = "0";
  }

  populateSelectOptions();

  clearFormState(
    form,
    allocationElements
      .transferFormError
  );
}

function openTransferForm(
  allocationId
) {
  const allocation =
    findAllocationById(
      allocationId
    );

  if (!allocation) {
    showToast(
      "Allocation could not be found.",
      "danger"
    );

    return;
  }

  resetTransferForm();

  document.getElementById(
    "transferAllocationId"
  ).value =
    getRecordId(allocation);

  const currentHolder =
    getUserName(allocation);

  document
    .querySelector(
      "[data-transfer-current-holder]"
    )
    .textContent =
      currentHolder;

  document
    .querySelector(
      "[data-transfer-current-initials]"
    )
    .textContent =
      getInitials(
        currentHolder
      );

  document.getElementById(
    "transferExpectedReturnDate"
  ).value =
    String(
      getExpectedReturnDate(
        allocation
      ) || ""
    ).slice(0, 10);

  const currentUserId =
    getUserId(allocation);

  Array.from(
    allocationElements
      .transferEmployeeSelect
      ?.options || []
  ).forEach((option) => {
    option.disabled =
      String(option.value) ===
      String(currentUserId);
  });

  closeModal(
    allocationElements.detailsModal
  );

  openModal(
    allocationElements.transferModal
  );
}

function updateTransferUserPreview() {
  const userId =
    allocationElements
      .transferEmployeeSelect?.value;

  const user =
    findUserById(userId);

  const name =
    user?.name ||
    "Select Employee";

  document
    .querySelector(
      "[data-transfer-new-holder]"
    )
    .textContent =
      name;

  document
    .querySelector(
      "[data-transfer-new-initials]"
    )
    .textContent =
      user
        ? getInitials(name)
        : "?";
}

async function submitTransferForm(
  event
) {
  event.preventDefault();

  const form =
    allocationElements.transferForm;

  clearFormState(
    form,
    allocationElements
      .transferFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const allocationId =
    document.getElementById(
      "transferAllocationId"
    ).value;

  const allocation =
    findAllocationById(
      allocationId
    );

  const newEmployeeId =
    document.getElementById(
      "transferEmployeeId"
    ).value;

  if (
    String(newEmployeeId) ===
    String(
      getUserId(allocation)
    )
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "transferEmployeeId"
        ),
        "Select a different employee."
      );

    return;
  }

  const payload = {
    allocation_id:
      allocationId,

    asset_id:
      getAssetId(allocation),

    current_employee_id:
      getUserId(allocation),

    new_employee_id:
      newEmployeeId,

    expected_return_date:
      document.getElementById(
        "transferExpectedReturnDate"
      ).value || null,

    reason:
      document.getElementById(
        "transferReason"
      ).value.trim()
  };

  setButtonLoading(
    allocationElements
      .transferSubmitButton,
    true,
    "Submitting..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        allocationId
      );

    await requestWithFallback(
      [
        `/allocations/${encodedId}/transfer`,
        "/transfer-requests",
        "/asset-transfers",
        "/transfers"
      ],
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      allocationElements.transferModal
    );

    showToast(
      canReviewTransfers()
        ? "Transfer submitted successfully."
        : "Transfer request submitted for approval.",
      "success"
    );

    await loadAllocationData();

    activateAllocationTab(
      "transfers"
    );
  } catch (error) {
    applyFormError(
      form,
      allocationElements
        .transferFormError,
      error
    );
  } finally {
    setButtonLoading(
      allocationElements
        .transferSubmitButton,
      false
    );
  }
}

/* =========================================================
   TRANSFER REVIEW
   ========================================================= */

function clearTransferReview() {
  allocationState.selectedTransferId =
    null;

  document.getElementById(
    "reviewTransferRequestId"
  ).value = "";

  document.getElementById(
    "transferReviewComment"
  ).value = "";

  if (
    allocationElements.reviewError
  ) {
    allocationElements.reviewError.hidden =
      true;

    allocationElements.reviewError.textContent =
      "";
  }
}

function openTransferReview(
  transferId
) {
  const transfer =
    findTransferById(
      transferId
    );

  if (!transfer) {
    showToast(
      "Transfer request could not be found.",
      "danger"
    );

    return;
  }

  clearTransferReview();

  allocationState.selectedTransferId =
    transferId;

  document.getElementById(
    "reviewTransferRequestId"
  ).value = transferId;

  const asset =
    getTransferAsset(transfer) ||
    getAsset(
      getTransferAllocation(
        transfer
      ) || {}
    );

  document
    .querySelector(
      "[data-transfer-review-asset]"
    )
    .textContent =
      asset?.name ||
      transfer.asset_name ||
      "Unnamed Asset";

  document
    .querySelector(
      "[data-transfer-review-tag]"
    )
    .textContent =
      asset?.asset_tag ||
      asset?.tag ||
      transfer.asset_tag ||
      "No asset tag";

  document
    .querySelector(
      "[data-transfer-review-current]"
    )
    .textContent =
      getTransferCurrentName(
        transfer
      );

  document
    .querySelector(
      "[data-transfer-review-new]"
    )
    .textContent =
      getTransferNewName(
        transfer
      );

  document
    .querySelector(
      "[data-transfer-review-reason]"
    )
    .textContent =
      transfer.reason ||
      "No reason provided.";

  const pending =
    normalizeStatus(
      transfer.status
    ) === "pending";

  allocationElements.approveTransferButton.hidden =
    !pending ||
    !canReviewTransfers();

  allocationElements.rejectTransferButton.hidden =
    !pending ||
    !canReviewTransfers();

  openModal(
    allocationElements.reviewModal
  );
}

async function reviewTransfer(
  decision
) {
  if (!canReviewTransfers()) {
    showToast(
      "You do not have permission to review transfers.",
      "danger"
    );

    return;
  }

  const transferId =
    document.getElementById(
      "reviewTransferRequestId"
    ).value;

  const comment =
    document.getElementById(
      "transferReviewComment"
    ).value.trim() || null;

  const button =
    decision === "approve"
      ? allocationElements
          .approveTransferButton
      : allocationElements
          .rejectTransferButton;

  setButtonLoading(
    button,
    true,
    decision === "approve"
      ? "Approving..."
      : "Rejecting..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        transferId
      );

    const payload = {
      status:
        decision === "approve"
          ? "Approved"
          : "Rejected",

      decision,
      comment
    };

    await requestWithFallback(
      [
        `/transfer-requests/${encodedId}/${decision}`,
        `/asset-transfers/${encodedId}/${decision}`,
        `/transfers/${encodedId}/${decision}`,
        `/transfer-requests/${encodedId}`,
        `/asset-transfers/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      allocationElements.reviewModal
    );

    showToast(
      decision === "approve"
        ? "Transfer approved successfully."
        : "Transfer request rejected.",
      "success"
    );

    await loadAllocationData();
  } catch (error) {
    showFormError(
      allocationElements.reviewError,
      error?.message ||
      "Unable to review transfer request."
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   ALLOCATION DETAILS
   ========================================================= */

function setDetailText(
  selector,
  value
) {
  const element =
    document.querySelector(selector);

  if (element) {
    element.textContent =
      value ?? "—";
  }
}

function activityColor(action = "") {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes("return")
  ) {
    return "var(--color-success)";
  }

  if (
    normalized.includes("transfer")
  ) {
    return "var(--color-primary)";
  }

  if (
    normalized.includes("overdue") ||
    normalized.includes("reject")
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes("approve")
  ) {
    return "var(--color-success)";
  }

  return "var(--color-info)";
}

function activityIcon(action = "") {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes("return")
  ) {
    return `
      <path d="M9 14 4 9l5-5"></path>
      <path d="M4 9h10a6 6 0 0 1 6 6v4"></path>
    `;
  }

  if (
    normalized.includes("transfer")
  ) {
    return `
      <path d="M17 3h4v4"></path>
      <path d="m21 3-7 7"></path>
      <path d="M7 21H3v-4"></path>
      <path d="m3 21 7-7"></path>
    `;
  }

  if (
    normalized.includes("approve")
  ) {
    return `
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m8 12 3 3 5-6"></path>
    `;
  }

  return `
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M3 21v-2a6 6 0 0 1 6-6"></path>
    <path d="M16 11h6"></path>
  `;
}

function renderAllocationActivity(
  activity
) {
  const container =
    document.querySelector(
      "[data-allocation-activity-timeline]"
    );

  const count =
    document.querySelector(
      "[data-allocation-history-count]"
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

  if (activity.length === 0) {
    container.innerHTML = `
      <div class="state-container">
        <h3 class="state-title">
          No allocation activity
        </h3>

        <p class="state-description">
          Transfer, return and approval events will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    activity
      .slice(0, 8)
      .map((item) => {
        const action =
          item.action ||
          item.type ||
          "Allocation updated";

        const message =
          item.message ||
          item.description ||
          `${titleCase(
            action
          )} recorded.`;

        const actor =
          item.user_name ||
          item.actor_name ||
          item.user?.name ||
          "AssetFlow";

        const time =
          item.timestamp ||
          item.created_at ||
          item.updated_at;

        return `
          <div class="timeline-item allocation-data-enter">
            <div
              class="allocation-activity-marker"
              style="
                --activity-color:
                  ${activityColor(action)};
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
                ${activityIcon(action)}
              </svg>
            </div>

            <div class="allocation-activity-content">
              <h4 class="allocation-activity-title">
                ${escapeHTML(
                  titleCase(action)
                )}
              </h4>

              <p class="allocation-activity-description">
                ${escapeHTML(message)}
              </p>

              <p class="allocation-activity-meta">
                ${escapeHTML(actor)}
                ·
                ${escapeHTML(
                  formatRelativeTime(time)
                )}
              </p>
            </div>
          </div>
        `;
      })
      .join("");
}

function renderAllocationDetails(
  allocation
) {
  allocationState.selectedAllocationId =
    getRecordId(allocation);

  const returnStatus =
    getReturnStatus(
      allocation
    );

  setDetailText(
    "[data-allocation-detail-asset]",
    getAssetName(allocation)
  );

  setDetailText(
    "[data-allocation-detail-tag]",
    getAssetTag(allocation)
  );

  setDetailText(
    "[data-allocation-detail-holder]",
    getUserName(allocation)
  );

  setDetailText(
    "[data-allocation-detail-department]",
    getDepartmentName(allocation)
  );

  setDetailText(
    "[data-allocation-detail-date]",
    formatDate(
      getAllocationDate(
        allocation
      )
    )
  );

  setDetailText(
    "[data-allocation-detail-expected-return]",
    formatDate(
      getExpectedReturnDate(
        allocation
      )
    )
  );

  setDetailText(
    "[data-allocation-detail-condition]",
    titleCase(
      allocation.condition_at_allocation ||
      allocation.condition ||
      "Not recorded"
    )
  );

  setDetailText(
    "[data-allocation-detail-created-by]",
    firstDefined(
      allocation,
      [
        "created_by_name",
        "allocated_by_name"
      ],
      allocation.created_by?.name ||
      allocation.allocated_by?.name ||
      "AssetFlow"
    )
  );

  setDetailText(
    "[data-allocation-detail-notes]",
    allocation.notes ||
    "No notes were provided."
  );

  const statusElement =
    document.querySelector(
      "[data-allocation-detail-status]"
    );

  if (statusElement) {
    const status =
      allocation.status ||
      (
        isCompletedAllocation(
          allocation
        )
          ? "Returned"
          : "Active"
      );

    statusElement.textContent =
      titleCase(status);

    statusElement.className =
      `badge badge-dot ${allocationStatusBadgeClass(
        status
      )}`;
  }

  const returnStatusElement =
    document.querySelector(
      "[data-allocation-detail-return-status]"
    );

  if (returnStatusElement) {
    returnStatusElement.textContent =
      returnStatusLabel(
        returnStatus
      );

    returnStatusElement.className =
      `badge badge-dot ${returnStatusBadgeClass(
        returnStatus
      )}`;
  }

  const active =
    isActiveAllocation(
      allocation
    );

  const transferButton =
    document.querySelector(
      "[data-transfer-current-allocation]"
    );

  const returnButton =
    document.querySelector(
      "[data-return-current-allocation]"
    );

  if (transferButton) {
    transferButton.hidden =
      !active;
  }

  if (returnButton) {
    returnButton.hidden =
      !active ||
      !canManageAllocations();
  }
}

async function openAllocationDetails(
  allocationId
) {
  let allocation =
    findAllocationById(
      allocationId
    );

  if (!allocation) {
    showToast(
      "Allocation could not be found.",
      "danger"
    );

    return;
  }

  renderAllocationDetails(
    allocation
  );

  renderAllocationActivity([]);

  openModal(
    allocationElements
      .detailsModal
  );

  try {
    const [
      detailResult,
      activityResult
    ] = await Promise.allSettled([
      fetchAllocationById(
        allocationId
      ),

      fetchAllocationActivity(
        allocationId
      )
    ]);

    if (
      detailResult.status ===
      "fulfilled"
    ) {
      allocation = {
        ...allocation,
        ...detailResult.value
      };

      renderAllocationDetails(
        allocation
      );
    }

    if (
      activityResult.status ===
      "fulfilled"
    ) {
      renderAllocationActivity(
        activityResult.value
      );
    }
  } catch (error) {
    console.error(
      "Allocation details loading failed:",
      error
    );
  }
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadAllocationData({
  showSuccessToast = false
} = {}) {
  if (allocationState.loading) {
    return;
  }

  allocationState.abortController
    ?.abort();

  allocationState.abortController =
    new AbortController();

  const signal =
    allocationState
      .abortController.signal;

  setAllocationLoading(true);
  hidePageError();

  try {
    const [
      allocationsResult,
      assetsResult,
      usersResult,
      departmentsResult,
      transfersResult
    ] = await Promise.allSettled([
      fetchAllocations(signal),
      fetchAssets(signal),
      fetchUsers(signal),
      fetchDepartments(signal),
      fetchTransfers(signal)
    ]);

    if (
      allocationsResult.status ===
      "rejected"
    ) {
      throw allocationsResult.reason;
    }

    if (
      assetsResult.status ===
      "rejected"
    ) {
      throw assetsResult.reason;
    }

    if (
      usersResult.status ===
      "rejected"
    ) {
      throw usersResult.reason;
    }

    allocationState.allocations =
      allocationsResult.value;

    allocationState.assets =
      assetsResult.value;

    allocationState.users =
      usersResult.value;

    allocationState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    allocationState.transfers =
      transfersResult.status ===
      "fulfilled"
        ? transfersResult.value
        : [];

    renderAllocationPage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Allocation data refreshed.",
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
      "Allocation data loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load allocation data."
    );

    showToast(
      error?.message ||
      "Unable to load allocation data.",
      "danger"
    );
  } finally {
    setAllocationLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-allocation-last-updated]"
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

  const assetId =
    parameters.get("asset_id");

  const allocationId =
    parameters.get(
      "allocation_id"
    );

  const tab =
    parameters.get("tab");

  if (tab) {
    activateAllocationTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (
    assetId &&
    canManageAllocations()
  ) {
    const asset =
      findAssetById(assetId);

    if (
      asset &&
      normalizeStatus(
        asset.status
      ) === "available"
    ) {
      resetAllocationForm();

      allocationElements
        .allocationAssetSelect
        .value = assetId;

      updateSelectedAssetPreview();

      openModal(
        allocationElements
          .allocateModal
      );
    }
  }

  if (allocationId) {
    openAllocationDetails(
      allocationId
    );
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-allocation-tab]"
    );

  if (tab) {
    activateAllocationTab(
      tab.dataset.allocationTab
    );

    return;
  }

  const pageButton =
    event.target.closest(
      "[data-allocation-page]"
    );

  if (pageButton) {
    const page =
      Number(
        pageButton.dataset
          .allocationPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      allocationState.currentPage =
        page;

      renderActiveAllocations();
    }

    return;
  }

  const resetFilters =
    event.target.closest(
      "[data-reset-allocation-filters]"
    );

  if (resetFilters) {
    resetAllocationFilters();
    return;
  }

  const startAllocation =
    event.target.closest(
      "[data-start-allocation]"
    );

  if (startAllocation) {
    resetAllocationForm();
    return;
  }

  const viewAllocation =
    event.target.closest(
      "[data-view-allocation]"
    );

  if (viewAllocation) {
    openAllocationDetails(
      viewAllocation.dataset
        .viewAllocation
    );

    return;
  }

  const returnAllocation =
    event.target.closest(
      "[data-return-allocation]"
    );

  if (returnAllocation) {
    openReturnForm(
      returnAllocation.dataset
        .returnAllocation
    );

    return;
  }

  const transferAllocation =
    event.target.closest(
      "[data-transfer-allocation]"
    );

  if (transferAllocation) {
    openTransferForm(
      transferAllocation.dataset
        .transferAllocation
    );

    return;
  }

  const reviewTransferButton =
    event.target.closest(
      "[data-review-transfer]"
    );

  if (reviewTransferButton) {
    openTransferReview(
      reviewTransferButton.dataset
        .reviewTransfer
    );

    return;
  }

  const viewTransferButton =
    event.target.closest(
      "[data-view-transfer]"
    );

  if (viewTransferButton) {
    openTransferReview(
      viewTransferButton.dataset
        .viewTransfer
    );

    return;
  }

  const transferCurrent =
    event.target.closest(
      "[data-transfer-current-allocation]"
    );

  if (
    transferCurrent &&
    allocationState
      .selectedAllocationId
  ) {
    openTransferForm(
      allocationState
        .selectedAllocationId
    );

    return;
  }

  const returnCurrent =
    event.target.closest(
      "[data-return-current-allocation]"
    );

  if (
    returnCurrent &&
    allocationState
      .selectedAllocationId
  ) {
    openReturnForm(
      allocationState
        .selectedAllocationId
    );
  }
}

function bindAllocationEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  allocationElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadAllocationData({
          showSuccessToast: true
        });
      }
    );

  allocationElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadAllocationData();
      }
    );

  allocationElements.allocateForm
    ?.addEventListener(
      "submit",
      submitAllocationForm
    );

  allocationElements.returnForm
    ?.addEventListener(
      "submit",
      submitReturnForm
    );

  allocationElements.transferForm
    ?.addEventListener(
      "submit",
      submitTransferForm
    );

  allocationElements.approveTransferButton
    ?.addEventListener(
      "click",
      () => {
        reviewTransfer("approve");
      }
    );

  allocationElements.rejectTransferButton
    ?.addEventListener(
      "click",
      () => {
        reviewTransfer("reject");
      }
    );

  allocationElements.allocationAssetSelect
    ?.addEventListener(
      "change",
      updateSelectedAssetPreview
    );

  allocationElements.transferEmployeeSelect
    ?.addEventListener(
      "change",
      updateTransferUserPreview
    );

  document
    .getElementById(
      "returnCondition"
    )
    ?.addEventListener(
      "change",
      updateReturnConditionWarning
    );

  allocationElements.searchInput
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            allocationState.search =
              event.target.value;

            allocationState.currentPage =
              1;

            renderActiveAllocations();
          },
          250
        ) ||
        ((event) => {
          allocationState.search =
            event.target.value;

          allocationState.currentPage =
            1;

          renderActiveAllocations();
        })
    );

  allocationElements.statusFilter
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.statusFilter =
          event.target.value;

        allocationState.currentPage =
          1;

        renderActiveAllocations();
      }
    );

  allocationElements.departmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.departmentFilter =
          event.target.value;

        allocationState.currentPage =
          1;

        renderActiveAllocations();
      }
    );

  allocationElements.holderFilter
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.holderFilter =
          event.target.value;

        allocationState.currentPage =
          1;

        renderActiveAllocations();
      }
    );

  allocationElements.transferStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.transferStatusFilter =
          event.target.value;

        renderTransferRequests();
      }
    );

  allocationElements.historyFrom
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.returnHistoryFrom =
          event.target.value;

        renderReturnHistory();
      }
    );

  allocationElements.historyTo
    ?.addEventListener(
      "change",
      (event) => {
        allocationState.returnHistoryTo =
          event.target.value;

        renderReturnHistory();
      }
    );

  document
    .getElementById(
      "allocationNotes"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-allocation-notes-count]"
          );

        if (counter) {
          counter.textContent =
            String(
              event.target.value.length
            );
        }
      }
    );

  document
    .getElementById(
      "returnNotes"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-return-notes-count]"
          );

        if (counter) {
          counter.textContent =
            String(
              event.target.value.length
            );
        }
      }
    );

  document
    .getElementById(
      "transferReason"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-transfer-reason-count]"
          );

        if (counter) {
          counter.textContent =
            String(
              event.target.value.length
            );
        }
      }
    );
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeAllocationHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title: "Asset Allocation",
      subtitle:
        "Assign, transfer and return assets"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeAllocationHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeAssetAllocation() {
  if (
    allocationState.initialized
  ) {
    return;
  }

  allocationState.initialized =
    true;

  cacheAllocationElements();
  enforceAllocationPermissions();
  bindAllocationEvents();
  initializeAllocationHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "active";

  activateAllocationTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadAllocationData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:allocations-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    allocationState.abortController
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
    initializeAssetAllocation
  );
} else {
  initializeAssetAllocation();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowAllocations =
  Object.freeze({
    initialize:
      initializeAssetAllocation,

    refresh:
      loadAllocationData,

    activateTab:
      activateAllocationTab,

    render:
      renderAllocationPage,

    openDetails:
      openAllocationDetails,

    openReturn:
      openReturnForm,

    openTransfer:
      openTransferForm,

    openTransferReview,

    resetFilters:
      resetAllocationFilters,

    getState() {
      return {
        ...allocationState,
        abortController: undefined
      };
    }
  });