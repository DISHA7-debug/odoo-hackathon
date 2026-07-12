/* =========================================================
   AssetFlow — Approvals Controller
   File: frontend/approvals/approvals.js

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

const APPROVALS_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  REQUEST_TYPES: Object.freeze([
    "AssetRegistration",
    "AssetAllocation",
    "AssetTransfer",
    "AssetReturn",
    "ResourceBooking",
    "Maintenance",
    "AssetDisposal",
    "UserRoleChange"
  ]),

  APPROVER_ROLES: Object.freeze([
    "Admin",
    "AssetManager",
    "DepartmentHead"
  ]),

  ENDPOINTS: Object.freeze({
    APPROVALS: [
      "/approvals",
      "/approval-requests",
      "/workflow-approvals"
    ],

    PENDING: [
      "/approvals/pending",
      "/approval-requests/pending",
      "/workflow-approvals/pending"
    ],

    MY_REQUESTS: [
      "/approvals/my-requests",
      "/approval-requests/mine",
      "/workflow-approvals/my-requests"
    ],

    HISTORY: [
      "/approvals/history",
      "/approval-requests/history",
      "/workflow-approvals/history"
    ],

    RULES: [
      "/approval-rules",
      "/approvals/rules",
      "/workflow-rules"
    ],

    USERS: [
      "/users",
      "/employees"
    ],

    DEPARTMENTS: [
      "/departments"
    ],

    CATEGORIES: [
      "/asset-categories",
      "/categories"
    ],

    LOCATIONS: [
      "/locations"
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const approvalsState = {
  approvals: [],
  rules: [],
  users: [],
  departments: [],
  categories: [],
  locations: [],

  activeTab: "pending",

  pendingSearch: "",
  pendingTypeFilter: "",
  pendingDepartmentFilter: "",
  pendingPriorityFilter: "",
  pendingAssigneeFilter: "",
  pendingPage: 1,

  mySearch: "",
  myStatusFilter: "",
  myTypeFilter: "",
  myPage: 1,

  historySearch: "",
  historyDecisionFilter: "",
  historyTypeFilter: "",
  historyStartDate: "",
  historyEndDate: "",
  historyPage: 1,

  ruleSearch: "",
  ruleTypeFilter: "",

  selectedApprovalIds: new Set(),

  selectedApprovalId: null,
  selectedRuleId: null,

  loading: false,
  initialized: false,

  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const approvalsElements = {};

function cacheApprovalsElements() {
  approvalsElements.main =
    document.getElementById(
      "approvalsMain"
    );

  approvalsElements.errorAlert =
    document.getElementById(
      "approvalsPageErrorAlert"
    );

  approvalsElements.errorMessage =
    document.getElementById(
      "approvalsPageErrorMessage"
    );

  approvalsElements.refreshButton =
    document.querySelector(
      "[data-refresh-approvals]"
    );

  approvalsElements.retryButton =
    document.querySelector(
      "[data-retry-approvals]"
    );

  approvalsElements.pendingSearch =
    document.querySelector(
      "[data-pending-approval-search]"
    );

  approvalsElements.pendingTypeFilter =
    document.querySelector(
      "[data-pending-approval-type-filter]"
    );

  approvalsElements.pendingDepartmentFilter =
    document.querySelector(
      "[data-pending-approval-department-filter]"
    );

  approvalsElements.pendingPriorityFilter =
    document.querySelector(
      "[data-pending-approval-priority-filter]"
    );

  approvalsElements.pendingAssigneeFilter =
    document.querySelector(
      "[data-pending-approval-assignee-filter]"
    );

  approvalsElements.pendingTableBody =
    document.getElementById(
      "pendingApprovalTableBody"
    );

  approvalsElements.pendingTableContainer =
    document.getElementById(
      "pendingApprovalTableContainer"
    );

  approvalsElements.pendingEmptyState =
    document.getElementById(
      "pendingApprovalEmptyState"
    );

  approvalsElements.pendingPagination =
    document.querySelector(
      "[data-pending-approval-pagination]"
    );

  approvalsElements.pendingPaginationSummary =
    document.querySelector(
      "[data-pending-approval-pagination-summary]"
    );

  approvalsElements.selectAllPending =
    document.querySelector(
      "[data-select-all-pending-approvals]"
    );

  approvalsElements.bulkActionBar =
    document.querySelector(
      "[data-approval-bulk-action-bar]"
    );

  approvalsElements.selectedApprovalCount =
    document.querySelector(
      "[data-selected-approval-count]"
    );

  approvalsElements.mySearch =
    document.querySelector(
      "[data-my-approval-request-search]"
    );

  approvalsElements.myStatusFilter =
    document.querySelector(
      "[data-my-approval-request-status-filter]"
    );

  approvalsElements.myTypeFilter =
    document.querySelector(
      "[data-my-approval-request-type-filter]"
    );

  approvalsElements.myTableBody =
    document.getElementById(
      "myApprovalRequestTableBody"
    );

  approvalsElements.myTableContainer =
    approvalsElements.myTableBody
      ?.closest(".table-container");

  approvalsElements.myEmptyState =
    document.getElementById(
      "myApprovalRequestEmptyState"
    );

  approvalsElements.myPagination =
    document.querySelector(
      "[data-my-approval-pagination]"
    );

  approvalsElements.myPaginationSummary =
    document.querySelector(
      "[data-my-approval-pagination-summary]"
    );

  approvalsElements.historySearch =
    document.querySelector(
      "[data-approval-history-search]"
    );

  approvalsElements.historyDecisionFilter =
    document.querySelector(
      "[data-approval-history-decision-filter]"
    );

  approvalsElements.historyTypeFilter =
    document.querySelector(
      "[data-approval-history-type-filter]"
    );

  approvalsElements.historyStartDate =
    document.querySelector(
      "[data-approval-history-start-date]"
    );

  approvalsElements.historyEndDate =
    document.querySelector(
      "[data-approval-history-end-date]"
    );

  approvalsElements.historyTableBody =
    document.getElementById(
      "approvalHistoryTableBody"
    );

  approvalsElements.historyTableContainer =
    approvalsElements.historyTableBody
      ?.closest(".table-container");

  approvalsElements.historyEmptyState =
    document.getElementById(
      "approvalHistoryEmptyState"
    );

  approvalsElements.historyPagination =
    document.querySelector(
      "[data-approval-history-pagination]"
    );

  approvalsElements.historyPaginationSummary =
    document.querySelector(
      "[data-approval-history-pagination-summary]"
    );

  approvalsElements.ruleSearch =
    document.querySelector(
      "[data-approval-rule-search]"
    );

  approvalsElements.ruleTypeFilter =
    document.querySelector(
      "[data-approval-rule-type-filter]"
    );

  approvalsElements.ruleGrid =
    document.querySelector(
      "[data-approval-rule-grid]"
    );

  approvalsElements.ruleEmptyState =
    document.getElementById(
      "approvalRuleEmptyState"
    );

  approvalsElements.detailsModal =
    document.getElementById(
      "approvalDetailsModal"
    );

  approvalsElements.approveModal =
    document.getElementById(
      "approveRequestModal"
    );

  approvalsElements.approveForm =
    document.getElementById(
      "approveRequestForm"
    );

  approvalsElements.approveError =
    document.querySelector(
      "[data-approve-request-error]"
    );

  approvalsElements.approveSubmitButton =
    document.getElementById(
      "approveRequestSubmitButton"
    );

  approvalsElements.rejectModal =
    document.getElementById(
      "rejectRequestModal"
    );

  approvalsElements.rejectForm =
    document.getElementById(
      "rejectRequestForm"
    );

  approvalsElements.rejectError =
    document.querySelector(
      "[data-reject-request-error]"
    );

  approvalsElements.rejectSubmitButton =
    document.getElementById(
      "rejectRequestSubmitButton"
    );

  approvalsElements.reassignModal =
    document.getElementById(
      "reassignApprovalModal"
    );

  approvalsElements.reassignForm =
    document.getElementById(
      "reassignApprovalForm"
    );

  approvalsElements.reassignError =
    document.querySelector(
      "[data-reassign-approval-error]"
    );

  approvalsElements.reassignSubmitButton =
    document.getElementById(
      "reassignApprovalSubmitButton"
    );

  approvalsElements.cancelModal =
    document.getElementById(
      "cancelApprovalRequestModal"
    );

  approvalsElements.cancelForm =
    document.getElementById(
      "cancelApprovalRequestForm"
    );

  approvalsElements.cancelError =
    document.querySelector(
      "[data-cancel-approval-request-error]"
    );

  approvalsElements.cancelSubmitButton =
    document.getElementById(
      "cancelApprovalRequestSubmitButton"
    );

  approvalsElements.bulkDecisionModal =
    document.getElementById(
      "bulkApprovalDecisionModal"
    );

  approvalsElements.bulkDecisionForm =
    document.getElementById(
      "bulkApprovalDecisionForm"
    );

  approvalsElements.bulkDecisionError =
    document.querySelector(
      "[data-bulk-approval-error]"
    );

  approvalsElements.bulkDecisionSubmitButton =
    document.getElementById(
      "bulkApprovalDecisionSubmitButton"
    );

  approvalsElements.ruleModal =
    document.getElementById(
      "approvalRuleModal"
    );

  approvalsElements.ruleForm =
    document.getElementById(
      "approvalRuleForm"
    );

  approvalsElements.ruleError =
    document.querySelector(
      "[data-approval-rule-error]"
    );

  approvalsElements.ruleSubmitButton =
    document.getElementById(
      "approvalRuleSubmitButton"
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
    "disabled",
    "off"
  ].includes(
    normalizeText(value)
  );
}

function getRecordId(record) {
  return (
    record?.id ??
    record?.approval_id ??
    record?.request_id ??
    record?.rule_id ??
    record?.user_id ??
    record?.employee_id ??
    record?.department_id ??
    record?.category_id ??
    record?.location_id ??
    ""
  );
}

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

function formatNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
}

function formatCurrency(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
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

function formatRelativeTime(value) {
  if (!value) {
    return "Unknown";
  }

  if (
    window.AssetFlowUtils?.getRelativeTime
  ) {
    return window.AssetFlowUtils
      .getRelativeTime(value);
  }

  const timestamp =
    new Date(value).getTime();

  if (
    Number.isNaN(timestamp)
  ) {
    return "Unknown";
  }

  const seconds =
    Math.floor(
      (Date.now() - timestamp) /
      1000
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 30) {
    return `${days} days ago`;
  }

  return formatDate(value);
}

function formatDuration(
  start,
  end
) {
  const startDate =
    new Date(start);

  const endDate =
    new Date(end);

  if (
    Number.isNaN(
      startDate.getTime()
    ) ||
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    return "—";
  }

  const milliseconds =
    Math.max(
      0,
      endDate - startDate
    );

  const minutes =
    Math.floor(
      milliseconds /
      (1000 * 60)
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr`;
  }

  const days =
    Math.floor(hours / 24);

  const remainingHours =
    hours % 24;

  return remainingHours
    ? `${days}d ${remainingHours}h`
    : `${days} days`;
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

function debounce(
  callback,
  wait = 250
) {
  if (
    window.AssetFlowUtils?.debounce
  ) {
    return window.AssetFlowUtils
      .debounce(
        callback,
        wait
      );
  }

  let timeoutId = null;

  return (...argumentsList) => {
    clearTimeout(timeoutId);

    timeoutId =
      setTimeout(
        () => {
          callback(
            ...argumentsList
          );
        },
        wait
      );
  };
}

function setText(
  selector,
  value
) {
  document
    .querySelectorAll(selector)
    .forEach((element) => {
      element.textContent =
        value ?? "";
    });
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

function isAdmin() {
  return (
    getCurrentUser()?.role ===
    "Admin"
  );
}

function isApproverRole() {
  return APPROVALS_CONFIG
    .APPROVER_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function canManageApprovalRules() {
  return isAdmin();
}

function applyRoleVisibility() {
  document
    .querySelectorAll(
      "[data-admin-only]"
    )
    .forEach((element) => {
      element.hidden =
        !isAdmin();
    });

  if (
    !isAdmin() &&
    approvalsState.activeTab ===
    "rules"
  ) {
    activateApprovalTab(
      "pending"
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
    "/api/v1";

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

function unwrapObject(response) {
  if (
    response?.data &&
    !Array.isArray(
      response.data
    )
  ) {
    return response.data;
  }

  if (
    response?.result &&
    !Array.isArray(
      response.result
    )
  ) {
    return response.result;
  }

  return response || {};
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

async function fetchOptionalCollection(
  endpoints,
  keys,
  signal
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
   DATA FETCHING
   ========================================================= */

async function fetchApprovals(signal) {
  try {
    const response =
      await requestWithFallback(
        APPROVALS_CONFIG
          .ENDPOINTS.APPROVALS,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "approvals",
        "approval_requests",
        "workflow_approvals",
        "requests"
      ]
    );
  } catch (error) {
    if (
      ![404, 405].includes(
        error.status
      )
    ) {
      throw error;
    }
  }

  const [
    pending,
    mine,
    history
  ] =
    await Promise.all([
      fetchOptionalCollection(
        APPROVALS_CONFIG
          .ENDPOINTS.PENDING,
        [
          "approvals",
          "approval_requests",
          "requests"
        ],
        signal
      ),

      fetchOptionalCollection(
        APPROVALS_CONFIG
          .ENDPOINTS.MY_REQUESTS,
        [
          "approvals",
          "approval_requests",
          "requests"
        ],
        signal
      ),

      fetchOptionalCollection(
        APPROVALS_CONFIG
          .ENDPOINTS.HISTORY,
        [
          "approvals",
          "approval_requests",
          "history",
          "requests"
        ],
        signal
      )
    ]);

  const map =
    new Map();

  [
    ...pending,
    ...mine,
    ...history
  ].forEach((approval) => {
    const id =
      getRecordId(approval);

    const key =
      id
        ? String(id)
        : JSON.stringify([
            approval.reference,
            approval.request_type,
            approval.created_at
          ]);

    map.set(
      key,
      {
        ...(map.get(key) || {}),
        ...approval
      }
    );
  });

  return Array.from(
    map.values()
  );
}

function fetchRules(signal) {
  return fetchOptionalCollection(
    APPROVALS_CONFIG
      .ENDPOINTS.RULES,
    [
      "approval_rules",
      "rules",
      "workflow_rules"
    ],
    signal
  );
}

function fetchUsers(signal) {
  return fetchOptionalCollection(
    APPROVALS_CONFIG
      .ENDPOINTS.USERS,
    [
      "users",
      "employees"
    ],
    signal
  );
}

function fetchDepartments(signal) {
  return fetchOptionalCollection(
    APPROVALS_CONFIG
      .ENDPOINTS.DEPARTMENTS,
    [
      "departments"
    ],
    signal
  );
}

function fetchCategories(signal) {
  return fetchOptionalCollection(
    APPROVALS_CONFIG
      .ENDPOINTS.CATEGORIES,
    [
      "asset_categories",
      "categories"
    ],
    signal
  );
}

function fetchLocations(signal) {
  return fetchOptionalCollection(
    APPROVALS_CONFIG
      .ENDPOINTS.LOCATIONS,
    [
      "locations"
    ],
    signal
  );
}

async function fetchApprovalById(
  approvalId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      approvalId
    );

  const response =
    await requestWithFallback(
      [
        `/approvals/${encodedId}`,
        `/approval-requests/${encodedId}`,
        `/workflow-approvals/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

/* =========================================================
   APPROVAL FIELD RESOLVERS
   ========================================================= */

function findApprovalById(id) {
  return findById(
    approvalsState.approvals,
    id
  );
}

function findRuleById(id) {
  return findById(
    approvalsState.rules,
    id
  );
}

function findUserById(id) {
  return findById(
    approvalsState.users,
    id
  );
}

function findDepartmentById(id) {
  return findById(
    approvalsState.departments,
    id
  );
}

function findCategoryById(id) {
  return findById(
    approvalsState.categories,
    id
  );
}

function findLocationById(id) {
  return findById(
    approvalsState.locations,
    id
  );
}

function getApprovalStatus(approval) {
  const status =
    firstDefined(
      approval,
      [
        "status",
        "approval_status",
        "decision"
      ],
      "Pending"
    );

  const normalized =
    normalizeStatus(status);

  const statuses = {
    pending:
      "Pending",

    approved:
      "Approved",

    rejected:
      "Rejected",

    cancelled:
      "Cancelled",

    canceled:
      "Cancelled",

    "changes requested":
      "ChangesRequested",

    "change requested":
      "ChangesRequested",

    changesrequested:
      "ChangesRequested"
  };

  return (
    statuses[normalized] ||
    titleCase(status)
  );
}

function getApprovalType(approval) {
  return firstDefined(
    approval,
    [
      "request_type",
      "approval_type",
      "type",
      "entity_type"
    ],
    "GeneralApproval"
  );
}

function displayApprovalType(type) {
  const labels = {
    AssetRegistration:
      "Asset Registration",

    AssetAllocation:
      "Asset Allocation",

    AssetTransfer:
      "Asset Transfer",

    AssetReturn:
      "Asset Return",

    ResourceBooking:
      "Resource Booking",

    Maintenance:
      "Maintenance",

    AssetDisposal:
      "Asset Disposal",

    UserRoleChange:
      "User Role Change",

    GeneralApproval:
      "General Approval"
  };

  return (
    labels[type] ||
    titleCase(type)
  );
}

function getApprovalTitle(approval) {
  return (
    approval.title ||
    approval.request_title ||
    approval.subject ||
    approval.asset_name ||
    approval.resource_name ||
    displayApprovalType(
      getApprovalType(approval)
    )
  );
}

function getApprovalReference(approval) {
  return (
    approval.reference ||
    approval.request_reference ||
    approval.approval_number ||
    approval.code ||
    `APR-${String(
      getRecordId(approval)
    ).padStart(5, "0")}`
  );
}

function getApprovalRequester(approval) {
  const reference =
    approval.requested_by ||
    approval.requester ||
    approval.created_by ||
    approval.employee ||
    approval.user ||
    approval.requested_by_id ||
    approval.requester_id ||
    approval.created_by_id ||
    approval.employee_id ||
    approval.user_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findUserById(reference) ||
    {
      id: reference,

      name:
        approval.requester_name ||
        approval.requested_by_name ||
        approval.employee_name ||
        "Unknown Requester",

      email:
        approval.requester_email ||
        approval.requested_by_email ||
        ""
    }
  );
}

function getApprovalRequesterId(
  approval
) {
  return getRecordId(
    getApprovalRequester(
      approval
    )
  );
}

function getApprovalApprover(approval) {
  const reference =
    approval.approver ||
    approval.assigned_to ||
    approval.current_approver ||
    approval.approver_id ||
    approval.assigned_to_id ||
    approval.current_approver_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findUserById(reference) ||
    {
      id: reference,

      name:
        approval.approver_name ||
        approval.assigned_to_name ||
        approval.current_approver_name ||
        "Unassigned",

      email:
        approval.approver_email ||
        ""
    }
  );
}

function getApprovalApproverId(
  approval
) {
  return getRecordId(
    getApprovalApprover(
      approval
    )
  );
}

function getApprovalDepartment(
  approval
) {
  const reference =
    approval.department ||
    approval.requester_department ||
    approval.department_id ||
    approval.requester_department_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findDepartmentById(reference) ||
    {
      id: reference,

      name:
        approval.department_name ||
        approval.requester_department_name ||
        "Unassigned"
    }
  );
}

function getApprovalDepartmentId(
  approval
) {
  return getRecordId(
    getApprovalDepartment(
      approval
    )
  );
}

function getApprovalPriority(
  approval
) {
  const priority =
    firstDefined(
      approval,
      [
        "priority",
        "request_priority",
        "urgency"
      ],
      "Medium"
    );

  return titleCase(priority);
}

function getApprovalSubmittedAt(
  approval
) {
  return firstDefined(
    approval,
    [
      "submitted_at",
      "requested_at",
      "created_at"
    ]
  );
}

function getApprovalUpdatedAt(
  approval
) {
  return firstDefined(
    approval,
    [
      "updated_at",
      "decision_at",
      "decided_at",
      "submitted_at",
      "created_at"
    ]
  );
}

function getApprovalDecisionAt(
  approval
) {
  return firstDefined(
    approval,
    [
      "decision_at",
      "decided_at",
      "completed_at",
      "updated_at"
    ]
  );
}

function getApprovalDeadline(
  approval
) {
  return firstDefined(
    approval,
    [
      "approval_deadline",
      "deadline",
      "due_at",
      "sla_deadline"
    ]
  );
}

function getApprovalStage(
  approval
) {
  const current =
    Number(
      firstDefined(
        approval,
        [
          "current_stage",
          "current_level",
          "approval_level"
        ],
        1
      )
    );

  const total =
    Number(
      firstDefined(
        approval,
        [
          "total_stages",
          "approval_levels",
          "total_levels"
        ],
        Math.max(current, 1)
      )
    );

  return {
    current:
      Number.isFinite(current)
        ? Math.max(1, current)
        : 1,

    total:
      Number.isFinite(total)
        ? Math.max(1, total)
        : 1
  };
}

function getApprovalDecisionMaker(
  approval
) {
  const reference =
    approval.decided_by ||
    approval.reviewed_by ||
    approval.approved_by ||
    approval.rejected_by ||
    approval.decided_by_id ||
    approval.reviewed_by_id ||
    approval.approved_by_id ||
    approval.rejected_by_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findUserById(reference) ||
    {
      id: reference,

      name:
        approval.decided_by_name ||
        approval.reviewed_by_name ||
        approval.approved_by_name ||
        approval.rejected_by_name ||
        "System"
    }
  );
}

function isPendingApproval(approval) {
  return (
    getApprovalStatus(approval) ===
    "Pending"
  );
}

function isCurrentUserRequester(
  approval
) {
  const currentUser =
    getCurrentUser();

  const currentId =
    getCurrentUserId();

  const requester =
    getApprovalRequester(
      approval
    );

  const requesterId =
    getRecordId(requester);

  if (
    currentId &&
    requesterId
  ) {
    return (
      String(currentId) ===
      String(requesterId)
    );
  }

  return (
    normalizeText(
      currentUser?.email
    ) ===
    normalizeText(
      requester?.email
    )
  );
}

function isAssignedToCurrentUser(
  approval
) {
  const approverId =
    getApprovalApproverId(
      approval
    );

  const currentUserId =
    getCurrentUserId();

  if (
    approverId &&
    currentUserId
  ) {
    return (
      String(approverId) ===
      String(currentUserId)
    );
  }

  const approverRole =
    approval.approver_role ||
    approval.required_role;

  return (
    !approverId &&
    approverRole ===
    getCurrentUser()?.role
  );
}

function canCurrentUserApprove(
  approval
) {
  if (
    !isPendingApproval(approval) ||
    isCurrentUserRequester(
      approval
    )
  ) {
    return false;
  }

  return (
    isAdmin() ||
    isAssignedToCurrentUser(
      approval
    ) ||
    (
      isApproverRole() &&
      !getApprovalApproverId(
        approval
      )
    )
  );
}

function canCurrentUserCancel(
  approval
) {
  return (
    isPendingApproval(approval) &&
    isCurrentUserRequester(
      approval
    )
  );
}

/* =========================================================
   BADGE AND ICON HELPERS
   ========================================================= */

function approvalStatusClass(status) {
  const classes = {
    Pending:
      "badge-warning",

    Approved:
      "badge-success",

    Rejected:
      "badge-danger",

    Cancelled:
      "badge-neutral",

    ChangesRequested:
      "badge-info"
  };

  return (
    classes[status] ||
    "badge-neutral"
  );
}

function approvalPriorityClass(
  priority
) {
  return normalizeStatus(priority)
    .replace(/\s+/g, "-");
}

function approvalTypeClass(type) {
  const classes = {
    AssetRegistration:
      "registration",

    AssetAllocation:
      "allocation",

    AssetTransfer:
      "transfer",

    AssetReturn:
      "transfer",

    ResourceBooking:
      "booking",

    Maintenance:
      "maintenance",

    AssetDisposal:
      "disposal",

    UserRoleChange:
      "registration"
  };

  return (
    classes[type] ||
    "registration"
  );
}

function approvalTypeIcon(type) {
  const icons = {
    AssetRegistration: `
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
      <rect x="3" y="3" width="18" height="18" rx="3"></rect>
    `,

    AssetAllocation: `
      <circle cx="8" cy="8" r="3"></circle>
      <path d="M3 21a5 5 0 0 1 10 0"></path>
      <rect x="15" y="5" width="6" height="6" rx="1"></rect>
      <path d="M18 11v7"></path>
    `,

    AssetTransfer: `
      <path d="m17 3 4 4-4 4"></path>
      <path d="M3 7h18"></path>
      <path d="m7 21-4-4 4-4"></path>
      <path d="M21 17H3"></path>
    `,

    AssetReturn: `
      <path d="M9 14 4 9l5-5"></path>
      <path d="M4 9h11a5 5 0 0 1 0 10h-3"></path>
    `,

    ResourceBooking: `
      <rect x="3" y="5" width="18" height="16" rx="2"></rect>
      <path d="M16 3v4"></path>
      <path d="M8 3v4"></path>
      <path d="M3 11h18"></path>
    `,

    Maintenance: `
      <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18v3h3l6.1-6.1a4 4 0 0 0 5.6-5.6l-2.4 2.4-3-3 2.4-2.4Z"></path>
    `,

    AssetDisposal: `
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="m19 6-1 15H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    `,

    UserRoleChange: `
      <circle cx="9" cy="8" r="3"></circle>
      <path d="M3 21a6 6 0 0 1 12 0"></path>
      <path d="m17 11 2 2 3-4"></path>
    `
  };

  return (
    icons[type] ||
    icons.AssetRegistration
  );
}

/* =========================================================
   SLA HELPERS
   ========================================================= */

function getApprovalSlaData(
  approval
) {
  const submitted =
    new Date(
      getApprovalSubmittedAt(
        approval
      )
    );

  const deadline =
    new Date(
      getApprovalDeadline(
        approval
      )
    );

  if (
    Number.isNaN(
      submitted.getTime()
    ) ||
    Number.isNaN(
      deadline.getTime()
    )
  ) {
    return {
      className: "safe",
      percent: 0,
      label: "No SLA",
      deadlineLabel: "Not set",
      overdue: false
    };
  }

  const total =
    deadline - submitted;

  const elapsed =
    Date.now() -
    submitted.getTime();

  const percent =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (elapsed / total) *
            100
          )
        )
      : 100;

  const remaining =
    deadline.getTime() -
    Date.now();

  const overdue =
    remaining < 0;

  let className =
    "safe";

  if (
    overdue ||
    percent >= 90
  ) {
    className =
      "danger";
  } else if (
    percent >= 70
  ) {
    className =
      "warning";
  }

  let label;

  if (overdue) {
    label =
      `${formatDuration(
        deadline,
        new Date()
      )} overdue`;
  } else {
    label =
      `${formatDuration(
        new Date(),
        deadline
      )} left`;
  }

  return {
    className,
    percent:
      Math.round(percent),
    label,
    deadlineLabel:
      formatDateTime(deadline),
    overdue
  };
}

/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function buildOptions(
  items,
  {
    placeholder =
      "Select an option",
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
            ${escapeHTML(label)}
          </option>
        `;
      })
      .join("")}
  `;
}

function getEligibleApprovers() {
  return approvalsState.users
    .filter((user) =>
      APPROVALS_CONFIG
        .APPROVER_ROLES
        .includes(user.role)
    )
    .filter((user) =>
      toBoolean(
        firstDefined(
          user,
          [
            "is_active",
            "active",
            "enabled"
          ],
          true
        ),
        true
      )
    );
}

function populateReferenceOptions() {
  const departmentSelects = [
    approvalsElements
      .pendingDepartmentFilter,

    document.getElementById(
      "approvalRuleDepartment"
    )
  ].filter(Boolean);

  departmentSelects.forEach(
    (select) => {
      const selected =
        select.value;

      select.innerHTML =
        buildOptions(
          approvalsState.departments,
          {
            selectedValue:
              selected,

            placeholder:
              select ===
              approvalsElements
                .pendingDepartmentFilter
                ? "All Departments"
                : "All Departments"
          }
        );
    }
  );

  const approverSelects = [
    document.getElementById(
      "newApprovalAssignee"
    ),

    document.getElementById(
      "approvalRuleApproverUser"
    )
  ].filter(Boolean);

  approverSelects.forEach(
    (select) => {
      const selected =
        select.value;

      select.innerHTML =
        buildOptions(
          getEligibleApprovers(),
          {
            selectedValue:
              selected,

            placeholder:
              "Select an approver",

            labelResolver(user) {
              return (
                `${user.name || "Unnamed"} — ` +
                `${titleCase(
                  user.role ||
                  "Employee"
                )}`
              );
            }
          }
        );
    }
  );

  const categorySelect =
    document.getElementById(
      "approvalRuleAssetCategory"
    );

  if (categorySelect) {
    const selected =
      categorySelect.value;

    categorySelect.innerHTML =
      buildOptions(
        approvalsState.categories,
        {
          selectedValue:
            selected,

          placeholder:
            "All Categories"
        }
      );
  }

  const locationSelect =
    document.getElementById(
      "approvalRuleLocation"
    );

  if (locationSelect) {
    const selected =
      locationSelect.value;

    locationSelect.innerHTML =
      buildOptions(
        approvalsState.locations,
        {
          selectedValue:
            selected,

          placeholder:
            "All Locations"
        }
      );
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function isToday(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return false;
  }

  const today =
    new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
}

function renderApprovalSummary() {
  const pending =
    approvalsState.approvals
      .filter(isPendingApproval);

  const urgent =
    pending.filter((approval) =>
      [
        "High",
        "Critical"
      ].includes(
        getApprovalPriority(
          approval
        )
      )
    );

  const overdue =
    pending.filter(
      (approval) =>
        getApprovalSlaData(
          approval
        ).overdue
    );

  const approvedToday =
    approvalsState.approvals
      .filter(
        (approval) =>
          getApprovalStatus(
            approval
          ) === "Approved" &&
          isToday(
            getApprovalDecisionAt(
              approval
            )
          )
      );

  const rejectedToday =
    approvalsState.approvals
      .filter(
        (approval) =>
          getApprovalStatus(
            approval
          ) === "Rejected" &&
          isToday(
            getApprovalDecisionAt(
              approval
            )
          )
      );

  const myOpen =
    approvalsState.approvals
      .filter(
        (approval) =>
          isCurrentUserRequester(
            approval
          ) &&
          isPendingApproval(
            approval
          )
      );

  const summary = {
    pending:
      pending.length,

    urgent:
      urgent.length,

    overdue:
      overdue.length,

    approved_today:
      approvedToday.length,

    rejected_today:
      rejectedToday.length,

    my_open_requests:
      myOpen.length
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-approval-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              formatNumber(value);

            element.classList.add(
              "approvals-data-enter"
            );
          });
      }
    );

  setText(
    '[data-approval-tab-count="pending"]',
    pending.length
  );

  setText(
    '[data-approval-tab-count="my-requests"]',
    approvalsState.approvals
      .filter(
        isCurrentUserRequester
      )
      .length
  );
}

/* =========================================================
   PENDING APPROVAL FILTERING
   ========================================================= */

function getPendingApprovals() {
  const search =
    normalizeText(
      approvalsState.pendingSearch
    );

  return approvalsState.approvals
    .filter(isPendingApproval)
    .filter((approval) => {
      const requester =
        getApprovalRequester(
          approval
        );

      const department =
        getApprovalDepartment(
          approval
        );

      const searchableText = [
        getApprovalTitle(approval),
        getApprovalReference(approval),
        displayApprovalType(
          getApprovalType(approval)
        ),
        requester.name,
        requester.email,
        department.name,
        getApprovalPriority(approval)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesType =
        !approvalsState
          .pendingTypeFilter ||
        getApprovalType(approval) ===
        approvalsState
          .pendingTypeFilter;

      const matchesDepartment =
        !approvalsState
          .pendingDepartmentFilter ||
        String(
          getApprovalDepartmentId(
            approval
          )
        ) ===
        String(
          approvalsState
            .pendingDepartmentFilter
        );

      const matchesPriority =
        !approvalsState
          .pendingPriorityFilter ||
        getApprovalPriority(
          approval
        ) ===
        approvalsState
          .pendingPriorityFilter;

      let matchesAssignee =
        true;

      if (
        approvalsState
          .pendingAssigneeFilter ===
        "mine"
      ) {
        matchesAssignee =
          isAssignedToCurrentUser(
            approval
          );
      }

      if (
        approvalsState
          .pendingAssigneeFilter ===
        "unassigned"
      ) {
        matchesAssignee =
          !getApprovalApproverId(
            approval
          );
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesDepartment &&
        matchesPriority &&
        matchesAssignee
      );
    })
    .sort((first, second) => {
      const priorityOrder = {
        Critical: 0,
        High: 1,
        Medium: 2,
        Low: 3
      };

      const priorityDifference =
        (
          priorityOrder[
            getApprovalPriority(first)
          ] ?? 4
        ) -
        (
          priorityOrder[
            getApprovalPriority(second)
          ] ?? 4
        );

      if (
        priorityDifference !== 0
      ) {
        return priorityDifference;
      }

      const firstDeadline =
        new Date(
          getApprovalDeadline(first) ||
          "2999-12-31"
        );

      const secondDeadline =
        new Date(
          getApprovalDeadline(second) ||
          "2999-12-31"
        );

      return (
        firstDeadline -
        secondDeadline
      );
    });
}

/* =========================================================
   PENDING APPROVAL TABLE
   ========================================================= */

function renderRequesterCell(
  requester
) {
  return `
    <div class="approval-requester">
      <div
        class="approval-requester-avatar"
        aria-hidden="true"
      >
        ${
          requester.avatar_url ||
          requester.profile_image
            ? `
              <img
                src="${escapeHTML(
                  requester.avatar_url ||
                  requester.profile_image
                )}"
                alt=""
              />
            `
            : escapeHTML(
                getInitials(
                  requester.name
                )
              )
        }
      </div>

      <div class="approval-requester-content">
        <div class="approval-requester-name">
          ${escapeHTML(
            requester.name ||
            "Unknown Requester"
          )}
        </div>

        <div class="approval-requester-email">
          ${escapeHTML(
            requester.email ||
            "No email address"
          )}
        </div>
      </div>
    </div>
  `;
}

function renderApprovalIdentity(
  approval
) {
  const type =
    getApprovalType(approval);

  return `
    <button
      type="button"
      class="approval-request-identity text-left"
      data-view-approval="${escapeHTML(
        getRecordId(approval)
      )}"
    >
      <span
        class="approval-request-icon ${approvalTypeClass(
          type
        )}"
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
          ${approvalTypeIcon(type)}
        </svg>
      </span>

      <span class="approval-request-content">
        <span class="approval-request-title">
          ${escapeHTML(
            getApprovalTitle(approval)
          )}
        </span>

        <span class="approval-request-reference">
          ${escapeHTML(
            getApprovalReference(
              approval
            )
          )}
        </span>

        <span class="approval-request-type">
          ${escapeHTML(
            displayApprovalType(type)
          )}
        </span>
      </span>
    </button>
  `;
}

function renderSlaCell(approval) {
  const sla =
    getApprovalSlaData(
      approval
    );

  return `
    <div
      class="approval-sla ${sla.className} ${
        sla.overdue
          ? "overdue"
          : ""
      }"
    >
      <div class="approval-sla-row">
        <strong>
          ${escapeHTML(
            sla.label
          )}
        </strong>

        <span>
          ${sla.percent}%
        </span>
      </div>

      <div class="approval-sla-track">
        <div
          class="approval-sla-progress"
          style="
            --approval-sla-progress:
              ${sla.percent}%;
          "
        ></div>
      </div>

      <span class="approval-date-secondary">
        Due ${escapeHTML(
          sla.deadlineLabel
        )}
      </span>
    </div>
  `;
}

function renderPendingApprovals() {
  const tableBody =
    approvalsElements
      .pendingTableBody;

  const tableContainer =
    approvalsElements
      .pendingTableContainer;

  const emptyState =
    approvalsElements
      .pendingEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const approvals =
    getPendingApprovals();

  const total =
    approvals.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        APPROVALS_CONFIG.PAGE_SIZE
      )
    );

  approvalsState.pendingPage =
    Math.min(
      approvalsState.pendingPage,
      totalPages
    );

  const startIndex =
    (
      approvalsState.pendingPage -
      1
    ) *
    APPROVALS_CONFIG.PAGE_SIZE;

  const visible =
    approvals.slice(
      startIndex,
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      approvalsElements
        .pendingPaginationSummary,
      0,
      0,
      0,
      "requests"
    );

    renderPagination(
      approvalsElements
        .pendingPagination,
      1,
      1,
      "pending-approval"
    );

    updateSelectAllState([]);

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((approval) => {
        const id =
          getRecordId(approval);

        const requester =
          getApprovalRequester(
            approval
          );

        const department =
          getApprovalDepartment(
            approval
          );

        const priority =
          getApprovalPriority(
            approval
          );

        const selectable =
          canCurrentUserApprove(
            approval
          );

        const selected =
          approvalsState
            .selectedApprovalIds
            .has(String(id));

        return `
          <tr
            class="approvals-data-enter"
            data-approval-row="${escapeHTML(id)}"
          >
            <td>
              <label class="table-checkbox">
                <input
                  type="checkbox"
                  data-select-approval="${escapeHTML(id)}"
                  aria-label="Select ${escapeHTML(
                    getApprovalTitle(
                      approval
                    )
                  )}"
                  ${
                    selected
                      ? "checked"
                      : ""
                  }
                  ${
                    selectable
                      ? ""
                      : "disabled"
                  }
                />

                <span></span>
              </label>
            </td>

            <td>
              ${renderApprovalIdentity(
                approval
              )}
            </td>

            <td>
              ${renderRequesterCell(
                requester
              )}
            </td>

            <td>
              <div class="approval-department-cell">
                <strong>
                  ${escapeHTML(
                    department.name ||
                    "Unassigned"
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    approval.location_name ||
                    approval.location?.name ||
                    "Location not specified"
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="approval-date-cell">
                <span class="approval-date-primary">
                  ${escapeHTML(
                    formatDateTime(
                      getApprovalSubmittedAt(
                        approval
                      )
                    )
                  )}
                </span>

                <span class="approval-date-secondary">
                  ${escapeHTML(
                    formatRelativeTime(
                      getApprovalSubmittedAt(
                        approval
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <span
                class="approval-priority ${approvalPriorityClass(
                  priority
                )}"
              >
                ${escapeHTML(priority)}
              </span>
            </td>

            <td>
              ${renderSlaCell(
                approval
              )}
            </td>

            <td class="text-right">
              <div class="approval-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-approval="${escapeHTML(id)}"
                  title="View request"
                  aria-label="View request"
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
                  canCurrentUserApprove(
                    approval
                  )
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-approve-request="${escapeHTML(id)}"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-reject-request="${escapeHTML(id)}"
                      >
                        Reject
                      </button>
                    `
                    : ""
                }

                ${
                  canCurrentUserCancel(
                    approval
                  )
                    ? `
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-cancel-approval-request="${escapeHTML(id)}"
                      >
                        Cancel
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

  updatePaginationSummary(
    approvalsElements
      .pendingPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE,
      total
    ),
    total,
    "requests"
  );

  renderPagination(
    approvalsElements
      .pendingPagination,
    approvalsState.pendingPage,
    totalPages,
    "pending-approval"
  );

  updateSelectAllState(
    visible
  );

  updateBulkActionBar();
}

/* =========================================================
   APPROVAL SELECTION
   ========================================================= */

function getVisiblePendingPageRecords() {
  const approvals =
    getPendingApprovals();

  const startIndex =
    (
      approvalsState.pendingPage -
      1
    ) *
    APPROVALS_CONFIG.PAGE_SIZE;

  return approvals.slice(
    startIndex,
    startIndex +
    APPROVALS_CONFIG.PAGE_SIZE
  );
}

function toggleApprovalSelection(
  approvalId,
  selected
) {
  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    return;
  }

  const normalizedId =
    String(approvalId);

  if (selected) {
    approvalsState
      .selectedApprovalIds
      .add(normalizedId);
  } else {
    approvalsState
      .selectedApprovalIds
      .delete(normalizedId);
  }

  updateSelectAllState();
  updateBulkActionBar();
}

function toggleAllVisibleApprovals(
  selected
) {
  getVisiblePendingPageRecords()
    .filter(
      canCurrentUserApprove
    )
    .forEach((approval) => {
      const id =
        String(
          getRecordId(approval)
        );

      if (selected) {
        approvalsState
          .selectedApprovalIds
          .add(id);
      } else {
        approvalsState
          .selectedApprovalIds
          .delete(id);
      }
    });

  renderPendingApprovals();
}

function updateSelectAllState(
  visibleApprovals = null
) {
  const checkbox =
    approvalsElements
      .selectAllPending;

  if (!checkbox) {
    return;
  }

  const records =
    visibleApprovals ||
    getVisiblePendingPageRecords();

  const selectableIds =
    records
      .filter(
        canCurrentUserApprove
      )
      .map(
        (approval) =>
          String(
            getRecordId(approval)
          )
      );

  const selectedCount =
    selectableIds.filter(
      (id) =>
        approvalsState
          .selectedApprovalIds
          .has(id)
    ).length;

  checkbox.checked =
    selectableIds.length > 0 &&
    selectedCount ===
      selectableIds.length;

  checkbox.indeterminate =
    selectedCount > 0 &&
    selectedCount <
      selectableIds.length;

  checkbox.disabled =
    selectableIds.length === 0;
}

function clearApprovalSelection() {
  approvalsState
    .selectedApprovalIds
    .clear();

  renderPendingApprovals();
}

function updateBulkActionBar() {
  const count =
    approvalsState
      .selectedApprovalIds.size;

  if (
    approvalsElements
      .bulkActionBar
  ) {
    approvalsElements
      .bulkActionBar.hidden =
      count === 0;
  }

  if (
    approvalsElements
      .selectedApprovalCount
  ) {
    approvalsElements
      .selectedApprovalCount
      .textContent =
      String(count);
  }

  setText(
    "[data-bulk-approval-count]",
    count
  );
}

/* =========================================================
   MY REQUESTS
   ========================================================= */

function getMyApprovalRequests() {
  const search =
    normalizeText(
      approvalsState.mySearch
    );

  return approvalsState.approvals
    .filter(
      isCurrentUserRequester
    )
    .filter((approval) => {
      const searchableText = [
        getApprovalTitle(approval),
        getApprovalReference(approval),
        displayApprovalType(
          getApprovalType(approval)
        ),
        getApprovalStatus(approval),
        getApprovalApprover(
          approval
        ).name
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
        !approvalsState
          .myStatusFilter ||
        getApprovalStatus(approval) ===
        approvalsState
          .myStatusFilter;

      const matchesType =
        !approvalsState
          .myTypeFilter ||
        getApprovalType(approval) ===
        approvalsState.myTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    })
    .sort(
      (first, second) =>
        new Date(
          getApprovalUpdatedAt(
            second
          ) || 0
        ) -
        new Date(
          getApprovalUpdatedAt(
            first
          ) || 0
        )
    );
}

function renderApprovalStage(
  approval
) {
  const stage =
    getApprovalStage(
      approval
    );

  const segments =
    Array.from(
      {
        length: stage.total
      },
      (_, index) => {
        const step =
          index + 1;

        let className = "";

        if (
          step < stage.current
        ) {
          className =
            "complete";
        } else if (
          step === stage.current
        ) {
          className =
            "current";
        }

        return `
          <span class="${className}"></span>
        `;
      }
    ).join("");

  return `
    <div class="approval-stage">
      <div class="approval-stage-label">
        Stage ${stage.current} of ${stage.total}
      </div>

      <div class="approval-stage-progress">
        ${segments}
      </div>
    </div>
  `;
}

function renderMyApprovalRequests() {
  const tableBody =
    approvalsElements
      .myTableBody;

  const tableContainer =
    approvalsElements
      .myTableContainer;

  const emptyState =
    approvalsElements
      .myEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const approvals =
    getMyApprovalRequests();

  const total =
    approvals.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        APPROVALS_CONFIG.PAGE_SIZE
      )
    );

  approvalsState.myPage =
    Math.min(
      approvalsState.myPage,
      totalPages
    );

  const startIndex =
    (
      approvalsState.myPage -
      1
    ) *
    APPROVALS_CONFIG.PAGE_SIZE;

  const visible =
    approvals.slice(
      startIndex,
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      approvalsElements
        .myPaginationSummary,
      0,
      0,
      0,
      "requests"
    );

    renderPagination(
      approvalsElements
        .myPagination,
      1,
      1,
      "my-approval"
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((approval) => {
        const id =
          getRecordId(approval);

        const status =
          getApprovalStatus(
            approval
          );

        const approver =
          getApprovalApprover(
            approval
          );

        return `
          <tr class="approvals-data-enter">
            <td>
              ${renderApprovalIdentity(
                approval
              )}
            </td>

            <td>
              <div class="approval-date-cell">
                <span class="approval-date-primary">
                  ${escapeHTML(
                    formatDateTime(
                      getApprovalSubmittedAt(
                        approval
                      )
                    )
                  )}
                </span>

                <span class="approval-date-secondary">
                  ${escapeHTML(
                    formatRelativeTime(
                      getApprovalSubmittedAt(
                        approval
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="approval-requester">
                <div
                  class="approval-requester-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      approver.name ||
                      "Unassigned"
                    )
                  )}
                </div>

                <div class="approval-requester-content">
                  <div class="approval-requester-name">
                    ${escapeHTML(
                      approver.name ||
                      "Unassigned"
                    )}
                  </div>

                  <div class="approval-requester-email">
                    ${escapeHTML(
                      approver.email ||
                      approval.approver_role ||
                      "Awaiting assignment"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              ${renderApprovalStage(
                approval
              )}
            </td>

            <td>
              <span
                class="badge badge-dot ${approvalStatusClass(
                  status
                )}"
              >
                ${escapeHTML(
                  status ===
                  "ChangesRequested"
                    ? "Changes Requested"
                    : status
                )}
              </span>
            </td>

            <td>
              <div class="approval-date-cell">
                <span class="approval-date-primary">
                  ${escapeHTML(
                    formatDateTime(
                      getApprovalUpdatedAt(
                        approval
                      )
                    )
                  )}
                </span>

                <span class="approval-date-secondary">
                  ${escapeHTML(
                    formatRelativeTime(
                      getApprovalUpdatedAt(
                        approval
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td class="text-right">
              <div class="approval-table-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-view-approval="${escapeHTML(id)}"
                >
                  View
                </button>

                ${
                  canCurrentUserCancel(
                    approval
                  )
                    ? `
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-cancel-approval-request="${escapeHTML(id)}"
                      >
                        Cancel
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

  updatePaginationSummary(
    approvalsElements
      .myPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE,
      total
    ),
    total,
    "requests"
  );

  renderPagination(
    approvalsElements
      .myPagination,
    approvalsState.myPage,
    totalPages,
    "my-approval"
  );
}

/* =========================================================
   APPROVAL HISTORY
   ========================================================= */

function getApprovalHistory() {
  const search =
    normalizeText(
      approvalsState.historySearch
    );

  const startDate =
    approvalsState.historyStartDate
      ? new Date(
          `${approvalsState.historyStartDate}T00:00:00`
        )
      : null;

  const endDate =
    approvalsState.historyEndDate
      ? new Date(
          `${approvalsState.historyEndDate}T23:59:59`
        )
      : null;

  return approvalsState.approvals
    .filter(
      (approval) =>
        !isPendingApproval(
          approval
        )
    )
    .filter((approval) => {
      const requester =
        getApprovalRequester(
          approval
        );

      const decisionMaker =
        getApprovalDecisionMaker(
          approval
        );

      const searchableText = [
        getApprovalTitle(approval),
        getApprovalReference(approval),
        displayApprovalType(
          getApprovalType(approval)
        ),
        requester.name,
        decisionMaker.name,
        approval.remarks,
        approval.decision_remarks,
        approval.rejection_reason,
        getApprovalStatus(approval)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesDecision =
        !approvalsState
          .historyDecisionFilter ||
        getApprovalStatus(approval) ===
        approvalsState
          .historyDecisionFilter;

      const matchesType =
        !approvalsState
          .historyTypeFilter ||
        getApprovalType(approval) ===
        approvalsState
          .historyTypeFilter;

      const decisionDate =
        new Date(
          getApprovalDecisionAt(
            approval
          )
        );

      const matchesStart =
        !startDate ||
        (
          !Number.isNaN(
            decisionDate.getTime()
          ) &&
          decisionDate >= startDate
        );

      const matchesEnd =
        !endDate ||
        (
          !Number.isNaN(
            decisionDate.getTime()
          ) &&
          decisionDate <= endDate
        );

      return (
        matchesSearch &&
        matchesDecision &&
        matchesType &&
        matchesStart &&
        matchesEnd
      );
    })
    .sort(
      (first, second) =>
        new Date(
          getApprovalDecisionAt(
            second
          ) || 0
        ) -
        new Date(
          getApprovalDecisionAt(
            first
          ) || 0
        )
    );
}

function renderApprovalHistory() {
  const tableBody =
    approvalsElements
      .historyTableBody;

  const tableContainer =
    approvalsElements
      .historyTableContainer;

  const emptyState =
    approvalsElements
      .historyEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const approvals =
    getApprovalHistory();

  const total =
    approvals.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        APPROVALS_CONFIG.PAGE_SIZE
      )
    );

  approvalsState.historyPage =
    Math.min(
      approvalsState.historyPage,
      totalPages
    );

  const startIndex =
    (
      approvalsState.historyPage -
      1
    ) *
    APPROVALS_CONFIG.PAGE_SIZE;

  const visible =
    approvals.slice(
      startIndex,
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      approvalsElements
        .historyPaginationSummary,
      0,
      0,
      0,
      "decisions"
    );

    renderPagination(
      approvalsElements
        .historyPagination,
      1,
      1,
      "approval-history"
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((approval) => {
        const id =
          getRecordId(approval);

        const status =
          getApprovalStatus(
            approval
          );

        const requester =
          getApprovalRequester(
            approval
          );

        const decisionMaker =
          getApprovalDecisionMaker(
            approval
          );

        const remarks =
          approval.decision_remarks ||
          approval.remarks ||
          approval.rejection_reason ||
          approval.cancellation_reason ||
          "No remarks provided.";

        return `
          <tr class="approvals-data-enter">
            <td>
              ${renderApprovalIdentity(
                approval
              )}
            </td>

            <td>
              ${renderRequesterCell(
                requester
              )}
            </td>

            <td>
              <span
                class="badge badge-dot ${approvalStatusClass(
                  status
                )}"
              >
                ${escapeHTML(
                  status ===
                  "ChangesRequested"
                    ? "Changes Requested"
                    : status
                )}
              </span>
            </td>

            <td>
              <div class="approval-requester">
                <div
                  class="approval-requester-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      decisionMaker.name ||
                      "System"
                    )
                  )}
                </div>

                <div class="approval-requester-content">
                  <div class="approval-requester-name">
                    ${escapeHTML(
                      decisionMaker.name ||
                      "System"
                    )}
                  </div>

                  <div class="approval-requester-email">
                    ${escapeHTML(
                      decisionMaker.email ||
                      "Decision authority"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="approval-date-cell">
                <span class="approval-date-primary">
                  ${escapeHTML(
                    formatDateTime(
                      getApprovalDecisionAt(
                        approval
                      )
                    )
                  )}
                </span>

                <span class="approval-date-secondary">
                  ${escapeHTML(
                    formatRelativeTime(
                      getApprovalDecisionAt(
                        approval
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <span class="approval-date-primary">
                ${escapeHTML(
                  formatDuration(
                    getApprovalSubmittedAt(
                      approval
                    ),
                    getApprovalDecisionAt(
                      approval
                    )
                  )
                )}
              </span>
            </td>

            <td>
              <p
                class="approval-history-remarks"
                title="${escapeHTML(
                  remarks
                )}"
              >
                ${escapeHTML(remarks)}
              </p>
            </td>

            <td class="text-right">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-view-approval="${escapeHTML(id)}"
              >
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  updatePaginationSummary(
    approvalsElements
      .historyPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      APPROVALS_CONFIG.PAGE_SIZE,
      total
    ),
    total,
    "decisions"
  );

  renderPagination(
    approvalsElements
      .historyPagination,
    approvalsState.historyPage,
    totalPages,
    "approval-history"
  );
}

/* =========================================================
   PAGINATION
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

  const controls = [];
  let previousPage = 0;

  pages.forEach((page) => {
    if (
      previousPage &&
      page - previousPage > 1
    ) {
      controls.push(`
        <span class="pagination-ellipsis">
          …
        </span>
      `);
    }

    controls.push(`
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

    previousPage = page;
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

    ${controls.join("")}

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
   APPROVAL RULES
   ========================================================= */

function getFilteredRules() {
  const search =
    normalizeText(
      approvalsState.ruleSearch
    );

  return approvalsState.rules
    .filter((rule) => {
      const searchableText = [
        rule.name,
        rule.description,
        displayApprovalType(
          rule.request_type
        ),
        rule.approver_role,
        rule.approver_type,
        rule.department_name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesType =
        !approvalsState
          .ruleTypeFilter ||
        rule.request_type ===
        approvalsState
          .ruleTypeFilter;

      return (
        matchesSearch &&
        matchesType
      );
    })
    .sort((first, second) => {
      const activeDifference =
        Number(
          !toBoolean(
            first.is_active,
            true
          )
        ) -
        Number(
          !toBoolean(
            second.is_active,
            true
          )
        );

      if (
        activeDifference !== 0
      ) {
        return activeDifference;
      }

      return String(
        first.name || ""
      ).localeCompare(
        String(
          second.name || ""
        )
      );
    });
}

function renderApprovalRules() {
  const grid =
    approvalsElements.ruleGrid;

  const emptyState =
    approvalsElements
      .ruleEmptyState;

  if (
    !grid ||
    !emptyState
  ) {
    return;
  }

  const rules =
    getFilteredRules();

  if (
    rules.length === 0
  ) {
    grid.innerHTML = "";
    grid.hidden = true;
    emptyState.hidden = false;
    return;
  }

  grid.hidden = false;
  emptyState.hidden = true;

  grid.innerHTML =
    rules
      .map((rule) => {
        const id =
          getRecordId(rule);

        const active =
          toBoolean(
            rule.is_active,
            true
          );

        const department =
          rule.department?.name ||
          findDepartmentById(
            rule.department_id
          )?.name ||
          rule.department_name ||
          "All Departments";

        const approver =
          rule.approver?.name ||
          findUserById(
            rule.approver_id
          )?.name ||
          (
            rule.approver_type ===
            "Role"
              ? titleCase(
                  rule.approver_role
                )
              : titleCase(
                  rule.approver_type ||
                  "Approver"
                )
          );

        const minimumAmount =
          Number(
            rule.minimum_amount
          );

        const conditions = [
          department,

          Number.isFinite(
            minimumAmount
          ) &&
          minimumAmount > 0
            ? `Minimum ${formatCurrency(
                minimumAmount
              )}`
            : "Any request value",

          rule.minimum_priority
            ? `${titleCase(
                rule.minimum_priority
              )} priority or higher`
            : "Any priority"
        ];

        return `
          <article
            class="approval-rule-card ${
              active
                ? ""
                : "inactive"
            } approvals-data-enter"
          >
            <header class="approval-rule-card-header">
              <div
                class="approval-rule-icon"
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
                  ${approvalTypeIcon(
                    rule.request_type
                  )}
                </svg>
              </div>

              <div class="approval-rule-card-title">
                <h4 title="${escapeHTML(
                  rule.name ||
                  "Unnamed Rule"
                )}">
                  ${escapeHTML(
                    rule.name ||
                    "Unnamed Rule"
                  )}
                </h4>

                <p>
                  ${escapeHTML(
                    displayApprovalType(
                      rule.request_type
                    )
                  )}
                </p>
              </div>

              <span
                class="approval-rule-status ${
                  active
                    ? ""
                    : "inactive"
                }"
              >
                ${
                  active
                    ? "Active"
                    : "Inactive"
                }
              </span>
            </header>

            <ul class="approval-rule-condition-list">
              ${conditions
                .map(
                  (condition) => `
                    <li>
                      <span
                        class="approval-rule-condition-icon"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="m5 12 4 4L19 6"></path>
                        </svg>
                      </span>

                      <span>
                        ${escapeHTML(
                          condition
                        )}
                      </span>
                    </li>
                  `
                )
                .join("")}
            </ul>

            <div class="approval-rule-metrics">
              <div class="approval-rule-metric">
                <strong>
                  ${escapeHTML(
                    approver
                  )}
                </strong>

                <span>
                  Approver
                </span>
              </div>

              <div class="approval-rule-metric">
                <strong>
                  ${escapeHTML(
                    rule.approval_levels ||
                    1
                  )}
                </strong>

                <span>
                  Levels
                </span>
              </div>

              <div class="approval-rule-metric">
                <strong>
                  ${escapeHTML(
                    rule.sla_hours ||
                    48
                  )}h
                </strong>

                <span>
                  SLA
                </span>
              </div>
            </div>

            <div class="approval-rule-actions">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-edit-approval-rule="${escapeHTML(id)}"
              >
                Edit
              </button>

              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-toggle-approval-rule="${escapeHTML(id)}"
              >
                ${
                  active
                    ? "Disable"
                    : "Enable"
                }
              </button>

              <button
                type="button"
                class="btn btn-danger btn-sm"
                data-delete-approval-rule="${escapeHTML(id)}"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   COMPLETE PAGE RENDER
   ========================================================= */

function renderApprovalsPage() {
  populateReferenceOptions();
  renderApprovalSummary();
  renderPendingApprovals();
  renderMyApprovalRequests();
  renderApprovalHistory();

  if (isAdmin()) {
    renderApprovalRules();
  }

  applyRoleVisibility();
}

/* =========================================================
   TABS
   ========================================================= */

function activateApprovalTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "pending",
    "my-requests",
    "history",
    "rules"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName =
      "pending";
  }

  if (
    tabName === "rules" &&
    !isAdmin()
  ) {
    tabName =
      "pending";

    showToast(
      "Administrator access is required to manage approval rules.",
      "warning"
    );
  }

  approvalsState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-approval-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .approvalTab ===
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
      "[data-approval-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .approvalPanel ===
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

    history.replaceState(
      {},
      "",
      url
    );
  }
}

/* =========================================================
   FORM HELPERS
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
    errorContainer.textContent =
      "";

    errorContainer.hidden =
      true;
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
      "Unable to complete this action."
    );
  }
}

function validateRequiredFields(form) {
  const requiredFields =
    Array.from(
      form.querySelectorAll(
        "[required]"
      )
    ).filter(
      (field) =>
        !field.disabled &&
        !field.closest("[hidden]")
    );

  let valid = true;

  requiredFields.forEach((field) => {
    const missing =
      field.type === "checkbox"
        ? !field.checked
        : !String(
            field.value
          ).trim();

    if (missing) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          field,
          "This field is required."
        );

      valid = false;
    }
  });

  return valid;
}

/* =========================================================
   APPROVAL DETAILS
   ========================================================= */

function getApprovalAttachments(
  approval
) {
  const attachments =
    approval.attachments ||
    approval.files ||
    approval.documents ||
    [];

  return Array.isArray(
    attachments
  )
    ? attachments
    : [];
}

function getApprovalTimeline(
  approval
) {
  const timeline =
    approval.timeline ||
    approval.activity ||
    approval.history ||
    approval.events ||
    [];

  if (
    Array.isArray(timeline) &&
    timeline.length > 0
  ) {
    return [...timeline].sort(
      (first, second) =>
        new Date(
          first.created_at ||
          first.timestamp ||
          first.date ||
          0
        ) -
        new Date(
          second.created_at ||
          second.timestamp ||
          second.date ||
          0
        )
    );
  }

  const generated = [
    {
      title:
        "Request Submitted",

      description:
        `${getApprovalRequester(
          approval
        ).name} submitted the request.`,

      created_at:
        getApprovalSubmittedAt(
          approval
        ),

      actor:
        getApprovalRequester(
          approval
        ),

      type:
        "submitted"
    }
  ];

  if (
    getApprovalStatus(
      approval
    ) !== "Pending"
  ) {
    generated.push({
      title:
        getApprovalStatus(
          approval
        ) === "Approved"
          ? "Request Approved"
          : getApprovalStatus(
              approval
            ) === "Rejected"
              ? "Request Rejected"
              : "Request Updated",

      description:
        approval.decision_remarks ||
        approval.remarks ||
        approval.rejection_reason ||
        `The request was marked as ${getApprovalStatus(
          approval
        )}.`,

      created_at:
        getApprovalDecisionAt(
          approval
        ),

      actor:
        getApprovalDecisionMaker(
          approval
        ),

      type:
        normalizeStatus(
          getApprovalStatus(
            approval
          )
        )
    });
  }

  return generated;
}

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

function buildApprovalInformation(
  approval
) {
  const data =
    approval.request_data ||
    approval.details ||
    approval.payload ||
    {};

  const fields = [];

  const commonFields = [
    [
      "Asset",
      approval.asset?.name ||
      approval.asset_name
    ],

    [
      "Asset Tag",
      approval.asset?.asset_tag ||
      approval.asset_tag
    ],

    [
      "Resource",
      approval.resource?.name ||
      approval.resource_name
    ],

    [
      "Booking Start",
      approval.start_time ||
      approval.booking_start
        ? formatDateTime(
            approval.start_time ||
            approval.booking_start
          )
        : null
    ],

    [
      "Booking End",
      approval.end_time ||
      approval.booking_end
        ? formatDateTime(
            approval.end_time ||
            approval.booking_end
          )
        : null
    ],

    [
      "Requested Value",
      approval.amount ||
      approval.asset_value
        ? formatCurrency(
            approval.amount ||
            approval.asset_value
          )
        : null
    ],

    [
      "Requested For",
      approval.requested_for_name ||
      approval.assignee_name
    ],

    [
      "Location",
      approval.location?.name ||
      approval.location_name
    ],

    [
      "Reason",
      approval.reason ||
      approval.request_reason
    ]
  ];

  commonFields.forEach(
    ([label, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        fields.push({
          label,
          value
        });
      }
    }
  );

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    Object.entries(data)
      .slice(0, 12)
      .forEach(([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          typeof value ===
          "object"
        ) {
          return;
        }

        const label =
          titleCase(key);

        const duplicate =
          fields.some(
            (field) =>
              normalizeText(
                field.label
              ) ===
              normalizeText(label)
          );

        if (!duplicate) {
          fields.push({
            label,
            value
          });
        }
      });
  }

  if (
    fields.length === 0
  ) {
    return `
      <div class="approval-information-item full-width">
        <span class="approval-information-label">
          Request Details
        </span>

        <span class="approval-information-value">
          No additional structured information was provided.
        </span>
      </div>
    `;
  }

  return fields
    .map(
      (field) => `
        <div class="approval-information-item">
          <span class="approval-information-label">
            ${escapeHTML(
              field.label
            )}
          </span>

          <span class="approval-information-value">
            ${escapeHTML(
              field.value
            )}
          </span>
        </div>
      `
    )
    .join("");
}

function renderApprovalAttachments(
  approval
) {
  const attachments =
    getApprovalAttachments(
      approval
    );

  const section =
    document.querySelector(
      "[data-approval-attachments-section]"
    );

  const list =
    document.querySelector(
      "[data-approval-attachment-list]"
    );

  setDetailText(
    "[data-approval-attachment-count]",
    `${attachments.length} ${
      attachments.length === 1
        ? "file"
        : "files"
    }`
  );

  if (
    !section ||
    !list
  ) {
    return;
  }

  section.hidden =
    attachments.length === 0;

  if (
    attachments.length === 0
  ) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML =
    attachments
      .map((attachment) => {
        const name =
          attachment.name ||
          attachment.filename ||
          "Attachment";

        const url =
          attachment.url ||
          attachment.download_url ||
          attachment.file_url ||
          "#";

        return `
          <article class="approval-attachment-item">
            <div
              class="approval-attachment-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>

            <div class="approval-attachment-content">
              <div class="approval-attachment-name">
                ${escapeHTML(name)}
              </div>

              <div class="approval-attachment-meta">
                ${escapeHTML(
                  attachment.size_label ||
                  attachment.mime_type ||
                  attachment.type ||
                  "Attachment"
                )}
              </div>
            </div>

            <a
              class="btn btn-outline btn-sm"
              href="${escapeHTML(url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open
            </a>
          </article>
        `;
      })
      .join("");
}

function timelineColor(type) {
  const normalized =
    normalizeStatus(type);

  if (
    normalized.includes(
      "approved"
    )
  ) {
    return "var(--color-success)";
  }

  if (
    normalized.includes(
      "rejected"
    ) ||
    normalized.includes(
      "cancelled"
    )
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes(
      "reassigned"
    ) ||
    normalized.includes(
      "changes"
    )
  ) {
    return "var(--color-warning)";
  }

  return "var(--color-primary)";
}

function timelineIcon(type) {
  const normalized =
    normalizeStatus(type);

  if (
    normalized.includes(
      "approved"
    )
  ) {
    return `
      <path d="m5 12 4 4L19 6"></path>
    `;
  }

  if (
    normalized.includes(
      "rejected"
    ) ||
    normalized.includes(
      "cancelled"
    )
  ) {
    return `
      <path d="M7 7l10 10"></path>
      <path d="M17 7 7 17"></path>
    `;
  }

  if (
    normalized.includes(
      "reassigned"
    )
  ) {
    return `
      <path d="m17 3 4 4-4 4"></path>
      <path d="M3 7h18"></path>
    `;
  }

  return `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 7v5l3 2"></path>
  `;
}

function renderApprovalTimeline(
  approval
) {
  const timeline =
    getApprovalTimeline(
      approval
    );

  const container =
    document.querySelector(
      "[data-approval-activity-timeline]"
    );

  setDetailText(
    "[data-approval-timeline-count]",
    `${timeline.length} ${
      timeline.length === 1
        ? "event"
        : "events"
    }`
  );

  if (!container) {
    return;
  }

  container.innerHTML =
    timeline
      .map((event) => {
        const type =
          event.type ||
          event.action ||
          event.status ||
          "updated";

        const actor =
          event.actor ||
          event.user ||
          findUserById(
            event.actor_id ||
            event.user_id
          ) ||
          {
            name:
              event.actor_name ||
              event.user_name ||
              "System"
          };

        return `
          <div class="timeline-item approvals-data-enter">
            <div
              class="approval-timeline-marker"
              style="
                --timeline-color:
                  ${timelineColor(
                    type
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
                ${timelineIcon(type)}
              </svg>
            </div>

            <div class="approval-timeline-content">
              <h4 class="approval-timeline-title">
                ${escapeHTML(
                  event.title ||
                  titleCase(type)
                )}
              </h4>

              <p class="approval-timeline-description">
                ${escapeHTML(
                  event.description ||
                  event.remarks ||
                  event.message ||
                  "The request was updated."
                )}
              </p>

              <p class="approval-timeline-meta">
                ${escapeHTML(
                  actor.name ||
                  "System"
                )}
                ·
                ${escapeHTML(
                  formatDateTime(
                    event.created_at ||
                    event.timestamp ||
                    event.date
                  )
                )}
              </p>
            </div>
          </div>
        `;
      })
      .join("");
}

function renderApprovalDetails(
  approval
) {
  approvalsState.selectedApprovalId =
    getRecordId(approval);

  const status =
    getApprovalStatus(
      approval
    );

  const priority =
    getApprovalPriority(
      approval
    );

  const type =
    getApprovalType(
      approval
    );

  const requester =
    getApprovalRequester(
      approval
    );

  const department =
    getApprovalDepartment(
      approval
    );

  const approver =
    getApprovalApprover(
      approval
    );

  const stage =
    getApprovalStage(
      approval
    );

  const sla =
    getApprovalSlaData(
      approval
    );

  setDetailText(
    "[data-approval-detail-title]",
    getApprovalTitle(approval)
  );

  setDetailText(
    "[data-approval-detail-reference]",
    getApprovalReference(
      approval
    )
  );

  setDetailText(
    "[data-approval-detail-requester]",
    requester.name ||
    "Unknown Requester"
  );

  setDetailText(
    "[data-approval-detail-department]",
    department.name ||
    "Unassigned"
  );

  setDetailText(
    "[data-approval-detail-submitted]",
    formatDateTime(
      getApprovalSubmittedAt(
        approval
      )
    )
  );

  setDetailText(
    "[data-approval-detail-stage]",
    `Stage ${stage.current} of ${stage.total}`
  );

  setDetailText(
    "[data-approval-detail-approver]",
    approver.name ||
    approval.approver_role ||
    "Unassigned"
  );

  setDetailText(
    "[data-approval-detail-deadline]",
    sla.deadlineLabel
  );

  setDetailText(
    "[data-approval-detail-justification]",
    approval.business_justification ||
    approval.justification ||
    approval.reason ||
    "No business justification was provided."
  );

  const statusElement =
    document.querySelector(
      "[data-approval-detail-status]"
    );

  if (statusElement) {
    statusElement.textContent =
      status === "ChangesRequested"
        ? "Changes Requested"
        : status;

    statusElement.className =
      `badge badge-dot ${approvalStatusClass(
        status
      )}`;
  }

  const priorityElement =
    document.querySelector(
      "[data-approval-detail-priority]"
    );

  if (priorityElement) {
    priorityElement.textContent =
      `${priority} Priority`;

    priorityElement.className =
      `approval-priority ${approvalPriorityClass(
        priority
      )}`;
  }

  const typeElement =
    document.querySelector(
      "[data-approval-detail-type]"
    );

  if (typeElement) {
    typeElement.textContent =
      displayApprovalType(type);
  }

  const information =
    document.querySelector(
      "[data-approval-request-information]"
    );

  if (information) {
    information.innerHTML =
      buildApprovalInformation(
        approval
      );
  }

  const riskBanner =
    document.querySelector(
      "[data-approval-risk-banner]"
    );

  if (riskBanner) {
    const showRisk =
      isPendingApproval(
        approval
      ) &&
      (
        sla.overdue ||
        sla.percent >= 70
      );

    riskBanner.hidden =
      !showRisk;

    riskBanner.classList.toggle(
      "danger",
      sla.overdue
    );

    setDetailText(
      "[data-approval-risk-title]",
      sla.overdue
        ? "Approval is overdue"
        : "Approval deadline is approaching"
    );

    setDetailText(
      "[data-approval-risk-message]",
      sla.overdue
        ? `This request is ${sla.label}.`
        : `Only ${sla.label} before the approval deadline.`
    );
  }

  renderApprovalAttachments(
    approval
  );

  renderApprovalTimeline(
    approval
  );

  document
    .querySelectorAll(
      "[data-approver-action]"
    )
    .forEach((button) => {
      button.hidden =
        !canCurrentUserApprove(
          approval
        );
    });

  document
    .querySelectorAll(
      "[data-requester-action]"
    )
    .forEach((button) => {
      button.hidden =
        !canCurrentUserCancel(
          approval
        );
    });
}

async function openApprovalDetails(
  approvalId
) {
  let approval =
    findApprovalById(
      approvalId
    );

  if (!approval) {
    showToast(
      "The selected approval request could not be found.",
      "danger"
    );

    return;
  }

  renderApprovalDetails(
    approval
  );

  openModal(
    approvalsElements
      .detailsModal
  );

  try {
    const detailed =
      await fetchApprovalById(
        approvalId
      );

    approval = {
      ...approval,
      ...detailed
    };

    approvalsState.approvals =
      approvalsState.approvals
        .map((record) =>
          String(
            getRecordId(record)
          ) ===
          String(approvalId)
            ? approval
            : record
        );

    renderApprovalDetails(
      approval
    );
  } catch (error) {
    if (
      ![404, 405].includes(
        error.status
      )
    ) {
      console.error(
        "Unable to load full approval details:",
        error
      );
    }
  }
}

/* =========================================================
   APPROVE REQUEST
   ========================================================= */

function resetApproveForm() {
  const form =
    approvalsElements.approveForm;

  form?.reset();

  document.getElementById(
    "approveRequestId"
  ).value =
    "";

  document.getElementById(
    "notifyRequesterOnApproval"
  ).checked =
    true;

  setText(
    "[data-approval-remarks-count]",
    "0"
  );

  clearFormState(
    form,
    approvalsElements
      .approveError
  );
}

function openApproveModal(
  approvalId
) {
  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showToast(
      "You are not authorized to approve this request.",
      "warning"
    );

    return;
  }

  resetApproveForm();

  document.getElementById(
    "approveRequestId"
  ).value =
    approvalId;

  setText(
    "[data-approve-request-title]",
    getApprovalTitle(approval)
  );

  setText(
    "[data-approve-request-reference]",
    getApprovalReference(
      approval
    )
  );

  closeModal(
    approvalsElements
      .detailsModal
  );

  openModal(
    approvalsElements
      .approveModal
  );
}

async function submitApproveRequest(
  event
) {
  event.preventDefault();

  const form =
    approvalsElements.approveForm;

  clearFormState(
    form,
    approvalsElements
      .approveError
  );

  const approvalId =
    document.getElementById(
      "approveRequestId"
    ).value;

  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showFormError(
      approvalsElements
        .approveError,
      "This request cannot be approved from the current account."
    );

    return;
  }

  const payload = {
    decision:
      "Approved",

    status:
      "Approved",

    remarks:
      document.getElementById(
        "approvalDecisionRemarks"
      ).value.trim() ||
      null,

    notify_requester:
      document.getElementById(
        "notifyRequesterOnApproval"
      ).checked
  };

  setButtonLoading(
    approvalsElements
      .approveSubmitButton,
    true,
    "Approving..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        approvalId
      );

    await requestWithFallback(
      [
        `/approvals/${encodedId}/approve`,
        `/approval-requests/${encodedId}/approve`,
        `/workflow-approvals/${encodedId}/approve`
      ],
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      approvalsElements
        .approveModal
    );

    showToast(
      "Request approved successfully.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    applyFormError(
      form,
      approvalsElements
        .approveError,
      error
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .approveSubmitButton,
      false
    );
  }
}

/* =========================================================
   REJECT / REQUEST CHANGES
   ========================================================= */

function resetRejectForm() {
  const form =
    approvalsElements.rejectForm;

  form?.reset();

  document.getElementById(
    "rejectRequestId"
  ).value =
    "";

  document.getElementById(
    "rejectDecisionType"
  ).value =
    "Rejected";

  document.getElementById(
    "notifyRequesterOnRejection"
  ).checked =
    true;

  setText(
    "[data-rejection-remarks-count]",
    "0"
  );

  clearFormState(
    form,
    approvalsElements
      .rejectError
  );
}

function openRejectModal(
  approvalId,
  decisionType = "Rejected"
) {
  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showToast(
      "You are not authorized to update this request.",
      "warning"
    );

    return;
  }

  resetRejectForm();

  document.getElementById(
    "rejectRequestId"
  ).value =
    approvalId;

  document.getElementById(
    "rejectDecisionType"
  ).value =
    decisionType;

  setText(
    "#rejectRequestModalTitle",
    decisionType ===
    "ChangesRequested"
      ? "Request Changes"
      : "Reject Request"
  );

  setText(
    "[data-reject-request-title]",
    getApprovalTitle(approval)
  );

  setText(
    "[data-reject-request-reference]",
    getApprovalReference(
      approval
    )
  );

  approvalsElements
    .rejectSubmitButton
    .textContent =
    decisionType ===
    "ChangesRequested"
      ? "Request Changes"
      : "Reject Request";

  closeModal(
    approvalsElements
      .detailsModal
  );

  openModal(
    approvalsElements
      .rejectModal
  );
}

async function submitRejectRequest(
  event
) {
  event.preventDefault();

  const form =
    approvalsElements.rejectForm;

  clearFormState(
    form,
    approvalsElements
      .rejectError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const approvalId =
    document.getElementById(
      "rejectRequestId"
    ).value;

  const decisionType =
    document.getElementById(
      "rejectDecisionType"
    ).value;

  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showFormError(
      approvalsElements
        .rejectError,
      "This request cannot be updated from the current account."
    );

    return;
  }

  const payload = {
    decision:
      decisionType,

    status:
      decisionType,

    reason_category:
      document.getElementById(
        "rejectionReasonCategory"
      ).value,

    remarks:
      document.getElementById(
        "rejectionRemarks"
      ).value.trim(),

    allow_resubmission:
      document.getElementById(
        "allowApprovalResubmission"
      ).checked,

    notify_requester:
      document.getElementById(
        "notifyRequesterOnRejection"
      ).checked
  };

  setButtonLoading(
    approvalsElements
      .rejectSubmitButton,
    true,
    decisionType ===
    "ChangesRequested"
      ? "Requesting..."
      : "Rejecting..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        approvalId
      );

    const endpoints =
      decisionType ===
      "ChangesRequested"
        ? [
            `/approvals/${encodedId}/request-changes`,
            `/approval-requests/${encodedId}/request-changes`,
            `/workflow-approvals/${encodedId}/request-changes`
          ]
        : [
            `/approvals/${encodedId}/reject`,
            `/approval-requests/${encodedId}/reject`,
            `/workflow-approvals/${encodedId}/reject`
          ];

    await requestWithFallback(
      endpoints,
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      approvalsElements
        .rejectModal
    );

    showToast(
      decisionType ===
      "ChangesRequested"
        ? "Changes requested successfully."
        : "Request rejected successfully.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    applyFormError(
      form,
      approvalsElements
        .rejectError,
      error
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .rejectSubmitButton,
      false
    );
  }
}

/* =========================================================
   REASSIGN APPROVAL
   ========================================================= */

function resetReassignForm() {
  const form =
    approvalsElements.reassignForm;

  form?.reset();

  document.getElementById(
    "reassignApprovalRequestId"
  ).value =
    "";

  document.getElementById(
    "notifyNewApprovalAssignee"
  ).checked =
    true;

  populateReferenceOptions();

  clearFormState(
    form,
    approvalsElements
      .reassignError
  );
}

function openReassignModal(
  approvalId
) {
  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showToast(
      "You are not authorized to reassign this request.",
      "warning"
    );

    return;
  }

  resetReassignForm();

  document.getElementById(
    "reassignApprovalRequestId"
  ).value =
    approvalId;

  setText(
    "[data-reassign-approval-title]",
    getApprovalTitle(approval)
  );

  setText(
    "[data-reassign-approval-reference]",
    getApprovalReference(
      approval
    )
  );

  closeModal(
    approvalsElements
      .detailsModal
  );

  openModal(
    approvalsElements
      .reassignModal
  );
}

async function submitReassignApproval(
  event
) {
  event.preventDefault();

  const form =
    approvalsElements.reassignForm;

  clearFormState(
    form,
    approvalsElements
      .reassignError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const approvalId =
    document.getElementById(
      "reassignApprovalRequestId"
    ).value;

  const approverId =
    document.getElementById(
      "newApprovalAssignee"
    ).value;

  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserApprove(
      approval
    )
  ) {
    showFormError(
      approvalsElements
        .reassignError,
      "This request cannot be reassigned from the current account."
    );

    return;
  }

  if (
    String(
      getApprovalApproverId(
        approval
      )
    ) ===
    String(approverId)
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "newApprovalAssignee"
        ),
        "Select a different approver."
      );

    return;
  }

  const payload = {
    approver_id:
      approverId,

    reason:
      document.getElementById(
        "approvalReassignmentReason"
      ).value.trim(),

    notify_approver:
      document.getElementById(
        "notifyNewApprovalAssignee"
      ).checked
  };

  setButtonLoading(
    approvalsElements
      .reassignSubmitButton,
    true,
    "Reassigning..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        approvalId
      );

    await requestWithFallback(
      [
        `/approvals/${encodedId}/reassign`,
        `/approval-requests/${encodedId}/reassign`,
        `/workflow-approvals/${encodedId}/reassign`
      ],
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      approvalsElements
        .reassignModal
    );

    showToast(
      "Approval request reassigned successfully.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    applyFormError(
      form,
      approvalsElements
        .reassignError,
      error
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .reassignSubmitButton,
      false
    );
  }
}

/* =========================================================
   CANCEL REQUEST
   ========================================================= */

function resetCancelForm() {
  const form =
    approvalsElements.cancelForm;

  form?.reset();

  document.getElementById(
    "cancelApprovalRequestId"
  ).value =
    "";

  clearFormState(
    form,
    approvalsElements
      .cancelError
  );
}

function openCancelModal(
  approvalId
) {
  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserCancel(
      approval
    )
  ) {
    showToast(
      "You cannot cancel this approval request.",
      "warning"
    );

    return;
  }

  resetCancelForm();

  document.getElementById(
    "cancelApprovalRequestId"
  ).value =
    approvalId;

  closeModal(
    approvalsElements
      .detailsModal
  );

  openModal(
    approvalsElements
      .cancelModal
  );
}

async function submitCancelRequest(
  event
) {
  event.preventDefault();

  const form =
    approvalsElements.cancelForm;

  clearFormState(
    form,
    approvalsElements
      .cancelError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const approvalId =
    document.getElementById(
      "cancelApprovalRequestId"
    ).value;

  const approval =
    findApprovalById(
      approvalId
    );

  if (
    !approval ||
    !canCurrentUserCancel(
      approval
    )
  ) {
    showFormError(
      approvalsElements
        .cancelError,
      "This approval request cannot be cancelled."
    );

    return;
  }

  const payload = {
    status:
      "Cancelled",

    reason:
      document.getElementById(
        "cancelApprovalReason"
      ).value.trim()
  };

  setButtonLoading(
    approvalsElements
      .cancelSubmitButton,
    true,
    "Cancelling..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        approvalId
      );

    await requestWithFallback(
      [
        `/approvals/${encodedId}/cancel`,
        `/approval-requests/${encodedId}/cancel`,
        `/workflow-approvals/${encodedId}/cancel`
      ],
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      approvalsElements
        .cancelModal
    );

    showToast(
      "Approval request cancelled successfully.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    applyFormError(
      form,
      approvalsElements
        .cancelError,
      error
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .cancelSubmitButton,
      false
    );
  }
}

/* =========================================================
   BULK DECISIONS
   ========================================================= */

function getSelectedApprovals() {
  return Array.from(
    approvalsState
      .selectedApprovalIds
  )
    .map(findApprovalById)
    .filter(Boolean)
    .filter(
      canCurrentUserApprove
    );
}

function resetBulkDecisionForm() {
  const form =
    approvalsElements
      .bulkDecisionForm;

  form?.reset();

  document.getElementById(
    "bulkApprovalDecisionType"
  ).value =
    "";

  document.getElementById(
    "notifyBulkApprovalRequesters"
  ).checked =
    true;

  clearFormState(
    form,
    approvalsElements
      .bulkDecisionError
  );

  updateBulkActionBar();
}

function openBulkDecisionModal(
  decision
) {
  const approvals =
    getSelectedApprovals();

  if (
    approvals.length === 0
  ) {
    showToast(
      "Select at least one approval request.",
      "warning"
    );

    return;
  }

  resetBulkDecisionForm();

  document.getElementById(
    "bulkApprovalDecisionType"
  ).value =
    decision;

  const rejecting =
    decision === "Rejected";

  setText(
    "[data-bulk-approval-modal-title]",
    rejecting
      ? "Reject Selected Requests"
      : "Approve Selected Requests"
  );

  const categoryGroup =
    document.querySelector(
      "[data-bulk-rejection-category-group]"
    );

  const categorySelect =
    document.getElementById(
      "bulkRejectionReasonCategory"
    );

  if (categoryGroup) {
    categoryGroup.hidden =
      !rejecting;
  }

  if (categorySelect) {
    categorySelect.required =
      rejecting;
  }

  approvalsElements
    .bulkDecisionSubmitButton
    .textContent =
    rejecting
      ? "Reject Selected"
      : "Approve Selected";

  approvalsElements
    .bulkDecisionSubmitButton
    .className =
    `btn ${
      rejecting
        ? "btn-danger"
        : "btn-primary"
    }`;

  openModal(
    approvalsElements
      .bulkDecisionModal
  );
}

async function submitBulkDecision(
  event
) {
  event.preventDefault();

  const form =
    approvalsElements
      .bulkDecisionForm;

  clearFormState(
    form,
    approvalsElements
      .bulkDecisionError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const approvals =
    getSelectedApprovals();

  if (
    approvals.length === 0
  ) {
    showFormError(
      approvalsElements
        .bulkDecisionError,
      "No valid approval requests are selected."
    );

    return;
  }

  const decision =
    document.getElementById(
      "bulkApprovalDecisionType"
    ).value;

  const remarks =
    document.getElementById(
      "bulkApprovalRemarks"
    ).value.trim();

  const reasonCategory =
    document.getElementById(
      "bulkRejectionReasonCategory"
    ).value;

  const notifyRequesters =
    document.getElementById(
      "notifyBulkApprovalRequesters"
    ).checked;

  setButtonLoading(
    approvalsElements
      .bulkDecisionSubmitButton,
    true,
    decision === "Approved"
      ? "Approving..."
      : "Rejecting..."
  );

  try {
    const results =
      await Promise.allSettled(
        approvals.map((approval) => {
          const encodedId =
            encodeURIComponent(
              getRecordId(approval)
            );

          const action =
            decision === "Approved"
              ? "approve"
              : "reject";

          return requestWithFallback(
            [
              `/approvals/${encodedId}/${action}`,
              `/approval-requests/${encodedId}/${action}`,
              `/workflow-approvals/${encodedId}/${action}`
            ],
            {
              method: "POST",

              body: {
                decision,
                status: decision,
                remarks:
                  remarks || null,

                reason_category:
                  reasonCategory || null,

                notify_requester:
                  notifyRequesters
              }
            }
          );
        })
      );

    const successful =
      results.filter(
        (result) =>
          result.status ===
          "fulfilled"
      ).length;

    const failed =
      results.length -
      successful;

    if (successful > 0) {
      showToast(
        `${successful} ${
          successful === 1
            ? "request"
            : "requests"
        } updated successfully.`,
        "success"
      );
    }

    if (failed > 0) {
      showToast(
        `${failed} ${
          failed === 1
            ? "request"
            : "requests"
        } could not be updated.`,
        "danger"
      );
    }

    closeModal(
      approvalsElements
        .bulkDecisionModal
    );

    approvalsState
      .selectedApprovalIds
      .clear();

    await loadApprovalsData();
  } catch (error) {
    showFormError(
      approvalsElements
        .bulkDecisionError,
      error?.message ||
      "Unable to apply the bulk decision."
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .bulkDecisionSubmitButton,
      false
    );
  }
}

/* =========================================================
   BULK REASSIGN
   ========================================================= */

function openBulkReassignModal() {
  const approvals =
    getSelectedApprovals();

  if (
    approvals.length === 0
  ) {
    showToast(
      "Select at least one approval request.",
      "warning"
    );

    return;
  }

  resetReassignForm();

  setText(
    "[data-reassign-approval-title]",
    `${approvals.length} Selected Requests`
  );

  setText(
    "[data-reassign-approval-reference]",
    "All selected requests will be assigned to the same approver."
  );

  document.getElementById(
    "reassignApprovalRequestId"
  ).value =
    "bulk";

  openModal(
    approvalsElements
      .reassignModal
  );
}

async function submitBulkReassignment(
  payload
) {
  const approvals =
    getSelectedApprovals();

  const results =
    await Promise.allSettled(
      approvals.map((approval) => {
        const encodedId =
          encodeURIComponent(
            getRecordId(approval)
          );

        return requestWithFallback(
          [
            `/approvals/${encodedId}/reassign`,
            `/approval-requests/${encodedId}/reassign`,
            `/workflow-approvals/${encodedId}/reassign`
          ],
          {
            method: "POST",
            body: payload
          }
        );
      })
    );

  const successful =
    results.filter(
      (result) =>
        result.status ===
        "fulfilled"
    ).length;

  const failed =
    results.length -
    successful;

  if (successful > 0) {
    showToast(
      `${successful} ${
        successful === 1
          ? "request"
          : "requests"
      } reassigned successfully.`,
      "success"
    );
  }

  if (failed > 0) {
    showToast(
      `${failed} ${
        failed === 1
          ? "request"
          : "requests"
      } could not be reassigned.`,
      "danger"
    );
  }

  approvalsState
    .selectedApprovalIds
    .clear();
}

/* =========================================================
   APPROVAL RULE FORM
   ========================================================= */

function updateRuleApproverVisibility() {
  const approverType =
    document.getElementById(
      "approvalRuleApproverType"
    )?.value ||
    "Role";

  const roleGroup =
    document.querySelector(
      "[data-approval-rule-role-group]"
    );

  const userGroup =
    document.querySelector(
      "[data-approval-rule-user-group]"
    );

  const roleSelect =
    document.getElementById(
      "approvalRuleApproverRole"
    );

  const userSelect =
    document.getElementById(
      "approvalRuleApproverUser"
    );

  if (roleGroup) {
    roleGroup.hidden =
      approverType !== "Role";
  }

  if (userGroup) {
    userGroup.hidden =
      approverType !==
      "SpecificUser";
  }

  if (roleSelect) {
    roleSelect.required =
      approverType === "Role";
  }

  if (userSelect) {
    userSelect.required =
      approverType ===
      "SpecificUser";
  }
}

function resetApprovalRuleForm() {
  const form =
    approvalsElements.ruleForm;

  form?.reset();

  document.getElementById(
    "approvalRuleId"
  ).value =
    "";

  document.getElementById(
    "approvalRuleApproverType"
  ).value =
    "Role";

  document.getElementById(
    "approvalRuleApproverRole"
  ).value =
    "DepartmentHead";

  document.getElementById(
    "approvalRuleLevels"
  ).value =
    "1";

  document.getElementById(
    "approvalRuleSlaHours"
  ).value =
    "48";

  document.getElementById(
    "approvalRuleAutomaticEscalation"
  ).checked =
    true;

  document.getElementById(
    "approvalRuleActive"
  ).checked =
    true;

  setText(
    "[data-approval-rule-modal-title]",
    "Add Approval Rule"
  );

  approvalsElements
    .ruleSubmitButton
    .textContent =
    "Add Rule";

  approvalsState.selectedRuleId =
    null;

  populateReferenceOptions();
  updateRuleApproverVisibility();

  clearFormState(
    form,
    approvalsElements
      .ruleError
  );
}

function openApprovalRuleEditor(
  ruleId
) {
  const rule =
    findRuleById(
      ruleId
    );

  if (!rule) {
    showToast(
      "The selected approval rule could not be found.",
      "danger"
    );

    return;
  }

  resetApprovalRuleForm();

  approvalsState.selectedRuleId =
    ruleId;

  document.getElementById(
    "approvalRuleId"
  ).value =
    ruleId;

  document.getElementById(
    "approvalRuleName"
  ).value =
    rule.name || "";

  document.getElementById(
    "approvalRuleRequestType"
  ).value =
    rule.request_type || "";

  document.getElementById(
    "approvalRuleDepartment"
  ).value =
    rule.department_id ||
    getRecordId(
      rule.department
    ) ||
    "";

  document.getElementById(
    "approvalRuleDescription"
  ).value =
    rule.description || "";

  document.getElementById(
    "approvalRuleMinimumAmount"
  ).value =
    rule.minimum_amount ?? "";

  document.getElementById(
    "approvalRulePriority"
  ).value =
    rule.minimum_priority || "";

  document.getElementById(
    "approvalRuleAssetCategory"
  ).value =
    rule.asset_category_id ||
    getRecordId(
      rule.asset_category
    ) ||
    "";

  document.getElementById(
    "approvalRuleLocation"
  ).value =
    rule.location_id ||
    getRecordId(
      rule.location
    ) ||
    "";

  document.getElementById(
    "approvalRuleApproverType"
  ).value =
    rule.approver_type ||
    "Role";

  document.getElementById(
    "approvalRuleApproverRole"
  ).value =
    rule.approver_role ||
    "DepartmentHead";

  document.getElementById(
    "approvalRuleApproverUser"
  ).value =
    rule.approver_id ||
    getRecordId(
      rule.approver
    ) ||
    "";

  document.getElementById(
    "approvalRuleLevels"
  ).value =
    rule.approval_levels ||
    1;

  document.getElementById(
    "approvalRuleSlaHours"
  ).value =
    rule.sla_hours ||
    48;

  document.getElementById(
    "approvalRuleAutomaticEscalation"
  ).checked =
    toBoolean(
      rule.automatic_escalation,
      true
    );

  document.getElementById(
    "approvalRuleActive"
  ).checked =
    toBoolean(
      rule.is_active,
      true
    );

  setText(
    "[data-approval-rule-modal-title]",
    "Edit Approval Rule"
  );

  approvalsElements
    .ruleSubmitButton
    .textContent =
    "Save Changes";

  updateRuleApproverVisibility();

  openModal(
    approvalsElements
      .ruleModal
  );
}

function buildApprovalRulePayload() {
  const approverType =
    document.getElementById(
      "approvalRuleApproverType"
    ).value;

  return {
    name:
      document.getElementById(
        "approvalRuleName"
      ).value.trim(),

    request_type:
      document.getElementById(
        "approvalRuleRequestType"
      ).value,

    department_id:
      document.getElementById(
        "approvalRuleDepartment"
      ).value || null,

    description:
      document.getElementById(
        "approvalRuleDescription"
      ).value.trim() || null,

    minimum_amount:
      document.getElementById(
        "approvalRuleMinimumAmount"
      ).value === ""
        ? null
        : Number(
            document.getElementById(
              "approvalRuleMinimumAmount"
            ).value
          ),

    minimum_priority:
      document.getElementById(
        "approvalRulePriority"
      ).value || null,

    asset_category_id:
      document.getElementById(
        "approvalRuleAssetCategory"
      ).value || null,

    location_id:
      document.getElementById(
        "approvalRuleLocation"
      ).value || null,

    approver_type:
      approverType,

    approver_role:
      approverType === "Role"
        ? document.getElementById(
            "approvalRuleApproverRole"
          ).value
        : null,

    approver_id:
      approverType ===
      "SpecificUser"
        ? document.getElementById(
            "approvalRuleApproverUser"
          ).value
        : null,

    approval_levels:
      Number(
        document.getElementById(
          "approvalRuleLevels"
        ).value
      ),

    sla_hours:
      Number(
        document.getElementById(
          "approvalRuleSlaHours"
        ).value
      ),

    automatic_escalation:
      document.getElementById(
        "approvalRuleAutomaticEscalation"
      ).checked,

    is_active:
      document.getElementById(
        "approvalRuleActive"
      ).checked
  };
}

async function submitApprovalRule(
  event
) {
  event.preventDefault();

  if (
    !canManageApprovalRules()
  ) {
    return;
  }

  const form =
    approvalsElements.ruleForm;

  clearFormState(
    form,
    approvalsElements
      .ruleError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const ruleId =
    document.getElementById(
      "approvalRuleId"
    ).value;

  const payload =
    buildApprovalRulePayload();

  setButtonLoading(
    approvalsElements
      .ruleSubmitButton,
    true,
    ruleId
      ? "Saving..."
      : "Adding..."
  );

  try {
    if (ruleId) {
      const encodedId =
        encodeURIComponent(
          ruleId
        );

      await requestWithFallback(
        [
          `/approval-rules/${encodedId}`,
          `/approvals/rules/${encodedId}`,
          `/workflow-rules/${encodedId}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        APPROVALS_CONFIG
          .ENDPOINTS.RULES,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      approvalsElements
        .ruleModal
    );

    showToast(
      ruleId
        ? "Approval rule updated successfully."
        : "Approval rule created successfully.",
      "success"
    );

    await loadApprovalsData();

    activateApprovalTab(
      "rules"
    );
  } catch (error) {
    applyFormError(
      form,
      approvalsElements
        .ruleError,
      error
    );
  } finally {
    setButtonLoading(
      approvalsElements
        .ruleSubmitButton,
      false
    );
  }
}

async function toggleApprovalRule(
  ruleId
) {
  const rule =
    findRuleById(
      ruleId
    );

  if (
    !rule ||
    !canManageApprovalRules()
  ) {
    return;
  }

  const active =
    toBoolean(
      rule.is_active,
      true
    );

  try {
    const encodedId =
      encodeURIComponent(
        ruleId
      );

    await requestWithFallback(
      [
        `/approval-rules/${encodedId}`,
        `/approvals/rules/${encodedId}`,
        `/workflow-rules/${encodedId}`
      ],
      {
        method: "PATCH",

        body: {
          is_active:
            !active
        }
      }
    );

    showToast(
      active
        ? "Approval rule disabled."
        : "Approval rule enabled.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to update the approval rule.",
      "danger"
    );
  }
}

async function deleteApprovalRule(
  ruleId
) {
  const rule =
    findRuleById(
      ruleId
    );

  if (
    !rule ||
    !canManageApprovalRules()
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete the approval rule "${rule.name || "Unnamed Rule"}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        ruleId
      );

    await requestWithFallback(
      [
        `/approval-rules/${encodedId}`,
        `/approvals/rules/${encodedId}`,
        `/workflow-rules/${encodedId}`
      ],
      {
        method: "DELETE"
      }
    );

    showToast(
      "Approval rule deleted successfully.",
      "success"
    );

    await loadApprovalsData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to delete the approval rule.",
      "danger"
    );
  }
}

/* =========================================================
   FILTER RESET
   ========================================================= */

function resetPendingFilters() {
  approvalsState.pendingSearch =
    "";

  approvalsState.pendingTypeFilter =
    "";

  approvalsState.pendingDepartmentFilter =
    "";

  approvalsState.pendingPriorityFilter =
    "";

  approvalsState.pendingAssigneeFilter =
    "";

  approvalsState.pendingPage =
    1;

  if (
    approvalsElements.pendingSearch
  ) {
    approvalsElements
      .pendingSearch.value =
      "";
  }

  if (
    approvalsElements.pendingTypeFilter
  ) {
    approvalsElements
      .pendingTypeFilter.value =
      "";
  }

  if (
    approvalsElements
      .pendingDepartmentFilter
  ) {
    approvalsElements
      .pendingDepartmentFilter.value =
      "";
  }

  if (
    approvalsElements
      .pendingPriorityFilter
  ) {
    approvalsElements
      .pendingPriorityFilter.value =
      "";
  }

  if (
    approvalsElements
      .pendingAssigneeFilter
  ) {
    approvalsElements
      .pendingAssigneeFilter.value =
      "";
  }

  renderPendingApprovals();
}

/* =========================================================
   EXPORT
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

function exportApprovals() {
  let records;

  switch (
    approvalsState.activeTab
  ) {
    case "my-requests":
      records =
        getMyApprovalRequests();
      break;

    case "history":
      records =
        getApprovalHistory();
      break;

    case "pending":
    default:
      records =
        getPendingApprovals();
      break;
  }

  if (
    records.length === 0
  ) {
    showToast(
      "There are no approval records to export.",
      "warning"
    );

    return;
  }

  const headings = [
    "Reference",
    "Title",
    "Request Type",
    "Requester",
    "Requester Email",
    "Department",
    "Priority",
    "Status",
    "Current Approver",
    "Submitted At",
    "Deadline",
    "Decision At",
    "Decision By",
    "Remarks"
  ];

  const rows =
    records.map((approval) => {
      const requester =
        getApprovalRequester(
          approval
        );

      const department =
        getApprovalDepartment(
          approval
        );

      const approver =
        getApprovalApprover(
          approval
        );

      const decisionMaker =
        getApprovalDecisionMaker(
          approval
        );

      return [
        getApprovalReference(
          approval
        ),

        getApprovalTitle(
          approval
        ),

        displayApprovalType(
          getApprovalType(
            approval
          )
        ),

        requester.name,
        requester.email,
        department.name,

        getApprovalPriority(
          approval
        ),

        getApprovalStatus(
          approval
        ),

        approver.name,

        formatDateTime(
          getApprovalSubmittedAt(
            approval
          )
        ),

        formatDateTime(
          getApprovalDeadline(
            approval
          )
        ),

        formatDateTime(
          getApprovalDecisionAt(
            approval
          )
        ),

        decisionMaker.name,

        approval.decision_remarks ||
        approval.remarks ||
        approval.rejection_reason ||
        ""
      ];
    });

  const csv = [
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
      [csv],
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
    `assetflow-approvals-${approvalsState.activeTab}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    "Approval records exported successfully.",
    "success"
  );
}

/* =========================================================
   LOADING AND PAGE ERROR
   ========================================================= */

function setApprovalsLoading(
  loading
) {
  approvalsState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "approvals-page-loading",
    approvalsState.loading
  );

  document.body.classList.toggle(
    "approvals-refreshing",
    approvalsState.loading
  );

  if (
    approvalsElements
      .refreshButton
  ) {
    approvalsElements
      .refreshButton.disabled =
      approvalsState.loading;

    approvalsElements
      .refreshButton
      .setAttribute(
        "aria-busy",
        String(
          approvalsState.loading
        )
      );
  }
}

function showPageError(message) {
  if (
    approvalsElements
      .errorAlert
  ) {
    approvalsElements
      .errorAlert.hidden =
      false;
  }

  if (
    approvalsElements
      .errorMessage
  ) {
    approvalsElements
      .errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    approvalsElements
      .errorAlert
  ) {
    approvalsElements
      .errorAlert.hidden =
      true;
  }
}

function updateLastUpdatedTime() {
  setText(
    "[data-approvals-last-updated]",
    `Updated ${new Date().toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }
    )}`
  );
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadApprovalsData({
  showSuccessToast = false
} = {}) {
  if (
    approvalsState.loading
  ) {
    return;
  }

  approvalsState
    .abortController
    ?.abort();

  approvalsState.abortController =
    new AbortController();

  const signal =
    approvalsState
      .abortController.signal;

  setApprovalsLoading(true);
  hidePageError();

  try {
    const requests = [
      fetchApprovals(signal),
      fetchUsers(signal),
      fetchDepartments(signal),
      fetchCategories(signal),
      fetchLocations(signal)
    ];

    if (isAdmin()) {
      requests.push(
        fetchRules(signal)
      );
    }

    const results =
      await Promise.allSettled(
        requests
      );

    if (
      results[0].status ===
      "rejected"
    ) {
      throw results[0].reason;
    }

    approvalsState.approvals =
      results[0].value;

    approvalsState.users =
      results[1].status ===
      "fulfilled"
        ? results[1].value
        : [];

    approvalsState.departments =
      results[2].status ===
      "fulfilled"
        ? results[2].value
        : [];

    approvalsState.categories =
      results[3].status ===
      "fulfilled"
        ? results[3].value
        : [];

    approvalsState.locations =
      results[4].status ===
      "fulfilled"
        ? results[4].value
        : [];

    approvalsState.rules =
      isAdmin() &&
      results[5]?.status ===
      "fulfilled"
        ? results[5].value
        : [];

    const validPendingIds =
      new Set(
        approvalsState.approvals
          .filter(isPendingApproval)
          .map(getRecordId)
          .filter(Boolean)
          .map(String)
      );

    approvalsState
      .selectedApprovalIds =
      new Set(
        Array.from(
          approvalsState
            .selectedApprovalIds
        ).filter(
          (id) =>
            validPendingIds.has(id)
        )
      );

    renderApprovalsPage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Approval data refreshed successfully.",
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
      "Approval data loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load approval data."
    );

    showToast(
      error?.message ||
      "Unable to load approval data.",
      "danger"
    );
  } finally {
    setApprovalsLoading(false);
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

  const approvalId =
    parameters.get(
      "approval_id"
    );

  if (tab) {
    activateApprovalTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (approvalId) {
    openApprovalDetails(
      approvalId
    );
  }
}

/* =========================================================
   DOCUMENT CLICK HANDLER
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-approval-tab]"
    );

  if (tab) {
    activateApprovalTab(
      tab.dataset.approvalTab
    );

    return;
  }

  if (
    event.target.closest(
      "[data-reset-pending-approval-filters]"
    )
  ) {
    resetPendingFilters();
    return;
  }

  const viewApproval =
    event.target.closest(
      "[data-view-approval]"
    );

  if (viewApproval) {
    openApprovalDetails(
      viewApproval.dataset
        .viewApproval
    );

    return;
  }

  const approveRequest =
    event.target.closest(
      "[data-approve-request]"
    );

  if (approveRequest) {
    openApproveModal(
      approveRequest.dataset
        .approveRequest
    );

    return;
  }

  const rejectRequest =
    event.target.closest(
      "[data-reject-request]"
    );

  if (rejectRequest) {
    openRejectModal(
      rejectRequest.dataset
        .rejectRequest
    );

    return;
  }

  const cancelRequest =
    event.target.closest(
      "[data-cancel-approval-request]"
    );

  if (cancelRequest) {
    openCancelModal(
      cancelRequest.dataset
        .cancelApprovalRequest
    );

    return;
  }

  if (
    event.target.closest(
      "[data-approve-current-approval]"
    ) &&
    approvalsState.selectedApprovalId
  ) {
    openApproveModal(
      approvalsState
        .selectedApprovalId
    );

    return;
  }

  if (
    event.target.closest(
      "[data-reject-current-approval]"
    ) &&
    approvalsState.selectedApprovalId
  ) {
    openRejectModal(
      approvalsState
        .selectedApprovalId
    );

    return;
  }

  if (
    event.target.closest(
      "[data-request-changes-current-approval]"
    ) &&
    approvalsState.selectedApprovalId
  ) {
    openRejectModal(
      approvalsState
        .selectedApprovalId,
      "ChangesRequested"
    );

    return;
  }

  if (
    event.target.closest(
      "[data-reassign-current-approval]"
    ) &&
    approvalsState.selectedApprovalId
  ) {
    openReassignModal(
      approvalsState
        .selectedApprovalId
    );

    return;
  }

  if (
    event.target.closest(
      "[data-cancel-current-approval]"
    ) &&
    approvalsState.selectedApprovalId
  ) {
    openCancelModal(
      approvalsState
        .selectedApprovalId
    );

    return;
  }

  if (
    event.target.closest(
      "[data-bulk-approve]"
    )
  ) {
    openBulkDecisionModal(
      "Approved"
    );

    return;
  }

  if (
    event.target.closest(
      "[data-bulk-reject]"
    )
  ) {
    openBulkDecisionModal(
      "Rejected"
    );

    return;
  }

  if (
    event.target.closest(
      "[data-bulk-reassign]"
    )
  ) {
    openBulkReassignModal();
    return;
  }

  if (
    event.target.closest(
      "[data-clear-approval-selection]"
    )
  ) {
    clearApprovalSelection();
    return;
  }

  if (
    event.target.closest(
      "[data-export-approvals]"
    )
  ) {
    exportApprovals();
    return;
  }

  const createRule =
    event.target.closest(
      "[data-create-approval-rule]"
    );

  if (createRule) {
    resetApprovalRuleForm();
    return;
  }

  const editRule =
    event.target.closest(
      "[data-edit-approval-rule]"
    );

  if (editRule) {
    openApprovalRuleEditor(
      editRule.dataset
        .editApprovalRule
    );

    return;
  }

  const toggleRule =
    event.target.closest(
      "[data-toggle-approval-rule]"
    );

  if (toggleRule) {
    toggleApprovalRule(
      toggleRule.dataset
        .toggleApprovalRule
    );

    return;
  }

  const deleteRule =
    event.target.closest(
      "[data-delete-approval-rule]"
    );

  if (deleteRule) {
    deleteApprovalRule(
      deleteRule.dataset
        .deleteApprovalRule
    );

    return;
  }

  const pendingPage =
    event.target.closest(
      "[data-pending-approval-page]"
    );

  if (pendingPage) {
    const page =
      Number(
        pendingPage.dataset
          .pendingApprovalPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      approvalsState.pendingPage =
        page;

      renderPendingApprovals();
    }

    return;
  }

  const myPage =
    event.target.closest(
      "[data-my-approval-page]"
    );

  if (myPage) {
    const page =
      Number(
        myPage.dataset
          .myApprovalPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      approvalsState.myPage =
        page;

      renderMyApprovalRequests();
    }

    return;
  }

  const historyPage =
    event.target.closest(
      "[data-approval-history-page]"
    );

  if (historyPage) {
    const page =
      Number(
        historyPage.dataset
          .approvalHistoryPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      approvalsState.historyPage =
        page;

      renderApprovalHistory();
    }
  }
}

/* =========================================================
   CHANGE HANDLER
   ========================================================= */

function handleDocumentChange(event) {
  const approvalSelection =
    event.target.closest(
      "[data-select-approval]"
    );

  if (approvalSelection) {
    toggleApprovalSelection(
      approvalSelection.dataset
        .selectApproval,
      approvalSelection.checked
    );

    return;
  }

  if (
    event.target.matches(
      "[data-select-all-pending-approvals]"
    )
  ) {
    toggleAllVisibleApprovals(
      event.target.checked
    );
  }
}

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindApprovalsEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  document.addEventListener(
    "change",
    handleDocumentChange,
    true
  );

  approvalsElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadApprovalsData({
          showSuccessToast: true
        });
      }
    );

  approvalsElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadApprovalsData();
      }
    );

  approvalsElements.approveForm
    ?.addEventListener(
      "submit",
      submitApproveRequest
    );

  approvalsElements.rejectForm
    ?.addEventListener(
      "submit",
      submitRejectRequest
    );

  approvalsElements.reassignForm
    ?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const requestId =
          document.getElementById(
            "reassignApprovalRequestId"
          ).value;

        if (
          requestId !== "bulk"
        ) {
          await submitReassignApproval(
            event
          );

          return;
        }

        const form =
          approvalsElements.reassignForm;

        clearFormState(
          form,
          approvalsElements
            .reassignError
        );

        if (
          !validateRequiredFields(
            form
          )
        ) {
          return;
        }

        const payload = {
          approver_id:
            document.getElementById(
              "newApprovalAssignee"
            ).value,

          reason:
            document.getElementById(
              "approvalReassignmentReason"
            ).value.trim(),

          notify_approver:
            document.getElementById(
              "notifyNewApprovalAssignee"
            ).checked
        };

        setButtonLoading(
          approvalsElements
            .reassignSubmitButton,
          true,
          "Reassigning..."
        );

        try {
          await submitBulkReassignment(
            payload
          );

          closeModal(
            approvalsElements
              .reassignModal
          );

          await loadApprovalsData();
        } catch (error) {
          showFormError(
            approvalsElements
              .reassignError,
            error?.message ||
            "Unable to reassign the selected requests."
          );
        } finally {
          setButtonLoading(
            approvalsElements
              .reassignSubmitButton,
            false
          );
        }
      }
    );

  approvalsElements.cancelForm
    ?.addEventListener(
      "submit",
      submitCancelRequest
    );

  approvalsElements.bulkDecisionForm
    ?.addEventListener(
      "submit",
      submitBulkDecision
    );

  approvalsElements.ruleForm
    ?.addEventListener(
      "submit",
      submitApprovalRule
    );

  approvalsElements.pendingSearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          approvalsState.pendingSearch =
            event.target.value;

          approvalsState.pendingPage =
            1;

          renderPendingApprovals();
        }
      )
    );

  approvalsElements.pendingTypeFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.pendingTypeFilter =
          event.target.value;

        approvalsState.pendingPage =
          1;

        renderPendingApprovals();
      }
    );

  approvalsElements
    .pendingDepartmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.pendingDepartmentFilter =
          event.target.value;

        approvalsState.pendingPage =
          1;

        renderPendingApprovals();
      }
    );

  approvalsElements
    .pendingPriorityFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.pendingPriorityFilter =
          event.target.value;

        approvalsState.pendingPage =
          1;

        renderPendingApprovals();
      }
    );

  approvalsElements
    .pendingAssigneeFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.pendingAssigneeFilter =
          event.target.value;

        approvalsState.pendingPage =
          1;

        renderPendingApprovals();
      }
    );

  approvalsElements.mySearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          approvalsState.mySearch =
            event.target.value;

          approvalsState.myPage =
            1;

          renderMyApprovalRequests();
        }
      )
    );

  approvalsElements.myStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.myStatusFilter =
          event.target.value;

        approvalsState.myPage =
          1;

        renderMyApprovalRequests();
      }
    );

  approvalsElements.myTypeFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.myTypeFilter =
          event.target.value;

        approvalsState.myPage =
          1;

        renderMyApprovalRequests();
      }
    );

  approvalsElements.historySearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          approvalsState.historySearch =
            event.target.value;

          approvalsState.historyPage =
            1;

          renderApprovalHistory();
        }
      )
    );

  approvalsElements
    .historyDecisionFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.historyDecisionFilter =
          event.target.value;

        approvalsState.historyPage =
          1;

        renderApprovalHistory();
      }
    );

  approvalsElements.historyTypeFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.historyTypeFilter =
          event.target.value;

        approvalsState.historyPage =
          1;

        renderApprovalHistory();
      }
    );

  approvalsElements.historyStartDate
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.historyStartDate =
          event.target.value;

        approvalsState.historyPage =
          1;

        renderApprovalHistory();
      }
    );

  approvalsElements.historyEndDate
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.historyEndDate =
          event.target.value;

        approvalsState.historyPage =
          1;

        renderApprovalHistory();
      }
    );

  approvalsElements.ruleSearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          approvalsState.ruleSearch =
            event.target.value;

          renderApprovalRules();
        }
      )
    );

  approvalsElements.ruleTypeFilter
    ?.addEventListener(
      "change",
      (event) => {
        approvalsState.ruleTypeFilter =
          event.target.value;

        renderApprovalRules();
      }
    );

  document
    .getElementById(
      "approvalRuleApproverType"
    )
    ?.addEventListener(
      "change",
      updateRuleApproverVisibility
    );

  document
    .getElementById(
      "approvalDecisionRemarks"
    )
    ?.addEventListener(
      "input",
      (event) => {
        setText(
          "[data-approval-remarks-count]",
          event.target.value.length
        );
      }
    );

  document
    .getElementById(
      "rejectionRemarks"
    )
    ?.addEventListener(
      "input",
      (event) => {
        setText(
          "[data-rejection-remarks-count]",
          event.target.value.length
        );
      }
    );
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeApprovalsHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "Approval Center",

      subtitle:
        "Review workflow requests and decisions"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeApprovalsHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeApprovals() {
  if (
    approvalsState.initialized
  ) {
    return;
  }

  approvalsState.initialized =
    true;

  cacheApprovalsElements();
  bindApprovalsEvents();
  initializeApprovalsHeader();
  applyRoleVisibility();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "pending";

  activateApprovalTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadApprovalsData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:approvals-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    approvalsState
      .abortController
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
    initializeApprovals
  );
} else {
  initializeApprovals();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowApprovals =
  Object.freeze({
    initialize:
      initializeApprovals,

    refresh:
      loadApprovalsData,

    render:
      renderApprovalsPage,

    activateTab:
      activateApprovalTab,

    openDetails:
      openApprovalDetails,

    openApprove:
      openApproveModal,

    openReject:
      openRejectModal,

    openReassign:
      openReassignModal,

    openCancel:
      openCancelModal,

    openRuleEditor:
      openApprovalRuleEditor,

    resetRuleForm:
      resetApprovalRuleForm,

    resetFilters:
      resetPendingFilters,

    clearSelection:
      clearApprovalSelection,

    export:
      exportApprovals,

    getState() {
      return {
        ...approvalsState,

        selectedApprovalIds:
          Array.from(
            approvalsState
              .selectedApprovalIds
          ),

        abortController:
          undefined
      };
    }
  });