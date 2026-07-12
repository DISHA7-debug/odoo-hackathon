/* =========================================================
   AssetFlow — User Management Controller
   File: frontend/user-management/user-management.js

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

const USER_MANAGEMENT_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  ROLES: Object.freeze([
    "Admin",
    "AssetManager",
    "DepartmentHead",
    "Employee"
  ]),

  ENDPOINTS: Object.freeze({
    USERS: [
      "/users",
      "/employees"
    ],

    INVITATIONS: [
      "/user-invitations",
      "/invitations",
      "/employee-invitations"
    ],

    DEPARTMENTS: [
      "/departments"
    ],

    LOCATIONS: [
      "/locations"
    ],

    SECURITY_ACTIVITY: [
      "/security-activity",
      "/security-logs",
      "/audit-logs",
      "/activity-logs"
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
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const userManagementState = {
  users: [],
  invitations: [],
  departments: [],
  locations: [],
  securityActivity: [],
  allocations: [],
  bookings: [],
  maintenance: [],

  activeTab: "users",

  userSearch: "",
  userRoleFilter: "",
  userDepartmentFilter: "",
  userStatusFilter: "",
  userVerificationFilter: "",
  userPage: 1,

  invitationSearch: "",
  invitationStatusFilter: "",
  invitationPage: 1,

  securitySearch: "",
  securityTypeFilter: "",
  securityPage: 1,

  selectedUserIds: new Set(),

  selectedUserId: null,
  selectedInvitationId: null,

  loading: false,
  initialized: false,

  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const userManagementElements = {};

function cacheUserManagementElements() {
  userManagementElements.main =
    document.getElementById(
      "userManagementMain"
    );

  userManagementElements.errorAlert =
    document.getElementById(
      "userManagementPageErrorAlert"
    );

  userManagementElements.errorMessage =
    document.getElementById(
      "userManagementPageErrorMessage"
    );

  userManagementElements.refreshButton =
    document.querySelector(
      "[data-refresh-users]"
    );

  userManagementElements.retryButton =
    document.querySelector(
      "[data-retry-users]"
    );

  userManagementElements.userSearch =
    document.querySelector(
      "[data-user-search]"
    );

  userManagementElements.userRoleFilter =
    document.querySelector(
      "[data-user-role-filter]"
    );

  userManagementElements.userDepartmentFilter =
    document.querySelector(
      "[data-user-department-filter]"
    );

  userManagementElements.userStatusFilter =
    document.querySelector(
      "[data-user-status-filter]"
    );

  userManagementElements.userVerificationFilter =
    document.querySelector(
      "[data-user-verification-filter]"
    );

  userManagementElements.userTableBody =
    document.getElementById(
      "userTableBody"
    );

  userManagementElements.userTableContainer =
    document.getElementById(
      "userTableContainer"
    );

  userManagementElements.userEmptyState =
    document.getElementById(
      "userTableEmptyState"
    );

  userManagementElements.userPagination =
    document.querySelector(
      "[data-user-pagination]"
    );

  userManagementElements.userPaginationSummary =
    document.querySelector(
      "[data-user-pagination-summary]"
    );

  userManagementElements.selectAllUsers =
    document.querySelector(
      "[data-select-all-users]"
    );

  userManagementElements.bulkActionBar =
    document.querySelector(
      "[data-user-bulk-action-bar]"
    );

  userManagementElements.selectedUserCount =
    document.querySelector(
      "[data-selected-user-count]"
    );

  userManagementElements.invitationSearch =
    document.querySelector(
      "[data-invitation-search]"
    );

  userManagementElements.invitationStatusFilter =
    document.querySelector(
      "[data-invitation-status-filter]"
    );

  userManagementElements.invitationTableBody =
    document.getElementById(
      "invitationTableBody"
    );

  userManagementElements.invitationTableContainer =
    userManagementElements.invitationTableBody
      ?.closest(".table-container");

  userManagementElements.invitationEmptyState =
    document.getElementById(
      "invitationEmptyState"
    );

  userManagementElements.invitationPagination =
    document.querySelector(
      "[data-invitation-pagination]"
    );

  userManagementElements.invitationPaginationSummary =
    document.querySelector(
      "[data-invitation-pagination-summary]"
    );

  userManagementElements.securitySearch =
    document.querySelector(
      "[data-security-activity-search]"
    );

  userManagementElements.securityTypeFilter =
    document.querySelector(
      "[data-security-activity-type-filter]"
    );

  userManagementElements.securityTableBody =
    document.getElementById(
      "securityActivityTableBody"
    );

  userManagementElements.securityTableContainer =
    userManagementElements.securityTableBody
      ?.closest(".table-container");

  userManagementElements.securityEmptyState =
    document.getElementById(
      "securityActivityEmptyState"
    );

  userManagementElements.securityPagination =
    document.querySelector(
      "[data-security-pagination]"
    );

  userManagementElements.securityPaginationSummary =
    document.querySelector(
      "[data-security-pagination-summary]"
    );

  userManagementElements.userFormModal =
    document.getElementById(
      "userFormModal"
    );

  userManagementElements.userForm =
    document.getElementById(
      "userForm"
    );

  userManagementElements.userFormError =
    document.querySelector(
      "[data-user-form-error]"
    );

  userManagementElements.userFormSubmitButton =
    document.getElementById(
      "userFormSubmitButton"
    );

  userManagementElements.inviteModal =
    document.getElementById(
      "inviteUserModal"
    );

  userManagementElements.inviteForm =
    document.getElementById(
      "inviteUserForm"
    );

  userManagementElements.inviteFormError =
    document.querySelector(
      "[data-invite-user-error]"
    );

  userManagementElements.inviteSubmitButton =
    document.getElementById(
      "inviteUserSubmitButton"
    );

  userManagementElements.detailsModal =
    document.getElementById(
      "userDetailsModal"
    );

  userManagementElements.changeRoleModal =
    document.getElementById(
      "changeUserRoleModal"
    );

  userManagementElements.changeRoleForm =
    document.getElementById(
      "changeUserRoleForm"
    );

  userManagementElements.changeRoleError =
    document.querySelector(
      "[data-change-user-role-error]"
    );

  userManagementElements.changeRoleSubmitButton =
    document.getElementById(
      "changeUserRoleSubmitButton"
    );

  userManagementElements.passwordResetModal =
    document.getElementById(
      "resetUserPasswordModal"
    );

  userManagementElements.passwordResetForm =
    document.getElementById(
      "resetUserPasswordForm"
    );

  userManagementElements.passwordResetError =
    document.querySelector(
      "[data-reset-user-password-error]"
    );

  userManagementElements.passwordResetSubmitButton =
    document.getElementById(
      "resetUserPasswordSubmitButton"
    );

  userManagementElements.statusModal =
    document.getElementById(
      "userStatusModal"
    );

  userManagementElements.statusForm =
    document.getElementById(
      "userStatusForm"
    );

  userManagementElements.statusError =
    document.querySelector(
      "[data-user-status-error]"
    );

  userManagementElements.statusSubmitButton =
    document.getElementById(
      "userStatusSubmitButton"
    );

  userManagementElements.bulkRoleModal =
    document.getElementById(
      "bulkUserRoleModal"
    );

  userManagementElements.bulkRoleForm =
    document.getElementById(
      "bulkUserRoleForm"
    );

  userManagementElements.bulkRoleError =
    document.querySelector(
      "[data-bulk-user-role-error]"
    );

  userManagementElements.bulkRoleSubmitButton =
    document.getElementById(
      "bulkUserRoleSubmitButton"
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
    "suspended"
  ].includes(
    normalizeText(value)
  );
}

function getRecordId(record) {
  return (
    record?.id ??
    record?.user_id ??
    record?.employee_id ??
    record?.invitation_id ??
    record?.security_log_id ??
    record?.activity_id ??
    record?.department_id ??
    record?.location_id ??
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

function formatNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
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
    return "Never";
  }

  if (
    window.AssetFlowUtils?.getRelativeTime
  ) {
    return window.AssetFlowUtils
      .getRelativeTime(value);
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Never";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes =
    Math.floor(
      difference /
      (1000 * 60)
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 30) {
    return `${days} days ago`;
  }

  return formatDate(value);
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
    window.clearTimeout(
      timeoutId
    );

    timeoutId =
      window.setTimeout(
        () => {
          callback(
            ...argumentsList
          );
        },
        wait
      );
  };
}

function todayStart() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function createRandomPassword(
  length = 14
) {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers =
    "23456789";

  const symbols =
    "!@#$%^&*";

  const all =
    uppercase +
    lowercase +
    numbers +
    symbols;

  const password = [
    uppercase[
      Math.floor(
        Math.random() *
        uppercase.length
      )
    ],

    lowercase[
      Math.floor(
        Math.random() *
        lowercase.length
      )
    ],

    numbers[
      Math.floor(
        Math.random() *
        numbers.length
      )
    ],

    symbols[
      Math.floor(
        Math.random() *
        symbols.length
      )
    ]
  ];

  while (
    password.length < length
  ) {
    password.push(
      all[
        Math.floor(
          Math.random() *
          all.length
        )
      ]
    );
  }

  return password
    .sort(
      () =>
        Math.random() - 0.5
    )
    .join("");
}

/* =========================================================
   CURRENT USER AND ACCESS
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

function isCurrentUser(user) {
  const currentUser =
    getCurrentUser();

  if (!currentUser) {
    return false;
  }

  const currentId =
    getRecordId(currentUser);

  const userId =
    getRecordId(user);

  if (
    currentId &&
    userId
  ) {
    return (
      String(currentId) ===
      String(userId)
    );
  }

  return (
    normalizeText(
      currentUser.email
    ) ===
    normalizeText(
      user.email
    )
  );
}

function ensureAdminAccess() {
  if (isAdmin()) {
    return true;
  }

  showToast(
    "Administrator access is required to manage users.",
    "danger"
  );

  window.setTimeout(() => {
    window.location.href =
      "../dashboard/index.html";
  }, 700);

  return false;
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

function fetchUsers(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.USERS,
    [
      "users",
      "employees"
    ],
    signal,
    true
  );
}

function fetchInvitations(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.INVITATIONS,
    [
      "invitations",
      "user_invitations",
      "employee_invitations"
    ],
    signal
  );
}

function fetchDepartments(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.DEPARTMENTS,
    ["departments"],
    signal
  );
}

function fetchLocations(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.LOCATIONS,
    ["locations"],
    signal
  );
}

function fetchSecurityActivity(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS
      .SECURITY_ACTIVITY,
    [
      "security_activity",
      "security_logs",
      "audit_logs",
      "activity_logs",
      "logs"
    ],
    signal
  );
}

function fetchAllocations(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.ALLOCATIONS,
    [
      "asset_allocations",
      "allocations"
    ],
    signal
  );
}

function fetchBookings(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.BOOKINGS,
    [
      "bookings",
      "resource_bookings"
    ],
    signal
  );
}

function fetchMaintenance(signal) {
  return fetchCollection(
    USER_MANAGEMENT_CONFIG
      .ENDPOINTS.MAINTENANCE,
    [
      "maintenance_requests",
      "maintenance",
      "requests"
    ],
    signal
  );
}

async function fetchUserById(
  userId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      userId
    );

  const response =
    await requestWithFallback(
      [
        `/users/${encodedId}`,
        `/employees/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

/* =========================================================
   RECORD RESOLVERS
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

function findUserById(id) {
  return findById(
    userManagementState.users,
    id
  );
}

function findInvitationById(id) {
  return findById(
    userManagementState
      .invitations,
    id
  );
}

function findDepartmentById(id) {
  return findById(
    userManagementState
      .departments,
    id
  );
}

function findLocationById(id) {
  return findById(
    userManagementState
      .locations,
    id
  );
}

function getDepartmentReference(user) {
  return (
    user?.department ||
    user?.department_id ||
    null
  );
}

function getDepartmentId(user) {
  const reference =
    getDepartmentReference(user);

  if (
    typeof reference ===
    "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getDepartmentName(user) {
  const reference =
    getDepartmentReference(user);

  if (!reference) {
    return (
      user?.department_name ||
      "Unassigned"
    );
  }

  if (
    typeof reference ===
    "object"
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
    user?.department_name ||
    "Unassigned"
  );
}

function getLocationReference(user) {
  return (
    user?.location ||
    user?.location_id ||
    user?.primary_location ||
    null
  );
}

function getLocationId(user) {
  const reference =
    getLocationReference(user);

  if (
    typeof reference ===
    "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getLocationName(user) {
  const reference =
    getLocationReference(user);

  if (!reference) {
    return (
      user?.location_name ||
      "Location not set"
    );
  }

  if (
    typeof reference ===
    "object"
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
    user?.location_name ||
    "Location not set"
  );
}

function getManagerReference(user) {
  return (
    user?.manager ||
    user?.reporting_manager ||
    user?.manager_id ||
    user?.reporting_manager_id ||
    null
  );
}

function getManagerId(user) {
  const reference =
    getManagerReference(user);

  if (
    typeof reference ===
    "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getManagerName(user) {
  const reference =
    getManagerReference(user);

  if (!reference) {
    return (
      user?.manager_name ||
      "No reporting manager"
    );
  }

  if (
    typeof reference ===
    "object"
  ) {
    return (
      reference.name ||
      "No reporting manager"
    );
  }

  return (
    findUserById(reference)
      ?.name ||
    user?.manager_name ||
    "No reporting manager"
  );
}

function getUserRole(user) {
  const role =
    firstDefined(
      user,
      [
        "role",
        "system_role",
        "access_role"
      ],
      "Employee"
    );

  return USER_MANAGEMENT_CONFIG
    .ROLES
    .includes(role)
      ? role
      : titleCase(role);
}

function getUserName(user) {
  return (
    user?.name ||
    user?.full_name ||
    user?.display_name ||
    "Unnamed User"
  );
}

function getUserEmail(user) {
  return (
    user?.email ||
    user?.email_address ||
    ""
  );
}

function getUserEmployeeCode(user) {
  return (
    user?.employee_code ||
    user?.employee_id_code ||
    user?.staff_id ||
    "Not assigned"
  );
}

/* =========================================================
   USER STATUS
   ========================================================= */

function isUserLocked(user) {
  return (
    toBoolean(
      user?.is_locked,
      false
    ) ||
    normalizeStatus(
      user?.status
    ) === "locked"
  );
}

function isUserPending(user) {
  return [
    "pending",
    "invited",
    "pending activation"
  ].includes(
    normalizeStatus(
      user?.status
    )
  );
}

function isUserActive(user) {
  if (
    isUserLocked(user) ||
    isUserPending(user)
  ) {
    return false;
  }

  return toBoolean(
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
  );
}

function isUserVerified(user) {
  return toBoolean(
    firstDefined(
      user,
      [
        "email_verified",
        "is_verified",
        "verified"
      ],
      false
    ),
    false
  );
}

function getUserStatus(user) {
  if (isUserLocked(user)) {
    return "Locked";
  }

  if (isUserPending(user)) {
    return "Pending";
  }

  return isUserActive(user)
    ? "Active"
    : "Suspended";
}

function userStatusBadgeClass(status) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    active:
      "badge-success",

    suspended:
      "badge-danger",

    pending:
      "badge-warning",

    locked:
      "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function userRoleClass(role) {
  return normalizeStatus(role)
    .replace(/\s+/g, "-");
}

function displayRoleName(role) {
  const names = {
    Admin:
      "Administrator",

    AssetManager:
      "Asset Manager",

    DepartmentHead:
      "Department Head",

    Employee:
      "Employee"
  };

  return (
    names[role] ||
    titleCase(role)
  );
}

/* =========================================================
   INVITATION STATUS
   ========================================================= */

function getInvitationStatus(
  invitation
) {
  const explicit =
    normalizeStatus(
      invitation.status
    );

  if (
    explicit === "accepted"
  ) {
    return "Accepted";
  }

  if (
    explicit === "revoked"
  ) {
    return "Revoked";
  }

  const expiryDate =
    new Date(
      firstDefined(
        invitation,
        [
          "expires_at",
          "expiry_date",
          "expires_on"
        ]
      )
    );

  if (
    !Number.isNaN(
      expiryDate.getTime()
    ) &&
    expiryDate < new Date()
  ) {
    return "Expired";
  }

  return titleCase(
    invitation.status ||
    "Pending"
  );
}

function invitationStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    pending:
      "badge-warning",

    accepted:
      "badge-success",

    expired:
      "badge-neutral",

    revoked:
      "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

/* =========================================================
   LOADING AND PAGE ERROR
   ========================================================= */

function setUserManagementLoading(
  loading
) {
  userManagementState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "user-management-page-loading",
    userManagementState.loading
  );

  document.body.classList.toggle(
    "user-management-refreshing",
    userManagementState.loading
  );

  if (
    userManagementElements
      .refreshButton
  ) {
    userManagementElements
      .refreshButton.disabled =
      userManagementState.loading;

    userManagementElements
      .refreshButton
      .setAttribute(
        "aria-busy",
        String(
          userManagementState
            .loading
        )
      );
  }
}

function showPageError(message) {
  if (
    userManagementElements
      .errorAlert
  ) {
    userManagementElements
      .errorAlert.hidden =
      false;
  }

  if (
    userManagementElements
      .errorMessage
  ) {
    userManagementElements
      .errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    userManagementElements
      .errorAlert
  ) {
    userManagementElements
      .errorAlert.hidden =
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
    labelResolver = null,
    excludedId = ""
  } = {}
) {
  return `
    <option value="">
      ${escapeHTML(placeholder)}
    </option>

    ${items
      .filter(
        (item) =>
          String(
            getRecordId(item)
          ) !==
          String(excludedId)
      )
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

function populateUserReferenceOptions({
  excludedManagerId = ""
} = {}) {
  const departmentSelects = [
    document.getElementById(
      "userDepartment"
    ),

    document.getElementById(
      "inviteUserDepartment"
    ),

    document.getElementById(
      "changeRoleDepartment"
    ),

    userManagementElements
      .userDepartmentFilter
  ].filter(Boolean);

  departmentSelects.forEach(
    (select) => {
      const selected =
        select.value;

      select.innerHTML =
        buildOptions(
          userManagementState
            .departments,
          {
            selectedValue:
              selected,

            placeholder:
              select.id ===
              "userDepartmentFilter"
                ? "All Departments"
                : "Select department"
          }
        );
    }
  );

  const locationSelect =
    document.getElementById(
      "userLocation"
    );

  if (locationSelect) {
    const selected =
      locationSelect.value;

    locationSelect.innerHTML =
      buildOptions(
        userManagementState
          .locations,
        {
          selectedValue:
            selected,

          placeholder:
            "Select location"
        }
      );
  }

  const managerSelect =
    document.getElementById(
      "userManager"
    );

  if (managerSelect) {
    const selected =
      managerSelect.value;

    managerSelect.innerHTML =
      buildOptions(
        userManagementState.users
          .filter(isUserActive),
        {
          selectedValue:
            selected,

          excludedId:
            excludedManagerId,

          placeholder:
            "No reporting manager",

          labelResolver(user) {
            return (
              `${getUserName(user)} — ` +
              `${displayRoleName(
                getUserRole(user)
              )}`
            );
          }
        }
      );
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderUserSummary() {
  const users =
    userManagementState.users;

  const active =
    users.filter(
      isUserActive
    );

  const suspended =
    users.filter(
      (user) =>
        getUserStatus(user) ===
        "Suspended"
    );

  const administrators =
    users.filter(
      (user) =>
        getUserRole(user) ===
        "Admin"
    );

  const pendingInvitations =
    userManagementState
      .invitations
      .filter(
        (invitation) =>
          getInvitationStatus(
            invitation
          ) === "Pending"
      );

  const activeToday =
    active.filter((user) => {
      const lastLogin =
        new Date(
          firstDefined(
            user,
            [
              "last_login_at",
              "last_login",
              "last_active_at"
            ]
          )
        );

      if (
        Number.isNaN(
          lastLogin.getTime()
        )
      ) {
        return false;
      }

      return (
        lastLogin >=
        todayStart()
      );
    });

  const summary = {
    total:
      users.length,

    active:
      active.length,

    suspended:
      suspended.length,

    pending_invitations:
      pendingInvitations.length,

    administrators:
      administrators.length,

    active_today:
      activeToday.length
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-user-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              formatNumber(value);

            element.classList.add(
              "user-management-data-enter"
            );
          });
      }
    );

  document
    .querySelectorAll(
      '[data-user-tab-count="users"]'
    )
    .forEach((element) => {
      element.textContent =
        String(users.length);
    });

  document
    .querySelectorAll(
      '[data-user-tab-count="invitations"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          pendingInvitations.length
        );
    });
}

/* =========================================================
   USER FILTERING
   ========================================================= */

function getFilteredUsers() {
  const search =
    normalizeText(
      userManagementState
        .userSearch
    );

  return userManagementState.users
    .filter((user) => {
      const searchableText = [
        getUserName(user),
        getUserEmail(user),
        getUserEmployeeCode(user),
        getUserRole(user),
        getDepartmentName(user),
        user.job_title,
        user.phone,
        getUserStatus(user)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(
          search
        );

      const matchesRole =
        !userManagementState
          .userRoleFilter ||
        getUserRole(user) ===
        userManagementState
          .userRoleFilter;

      const matchesDepartment =
        !userManagementState
          .userDepartmentFilter ||
        String(
          getDepartmentId(user)
        ) ===
        String(
          userManagementState
            .userDepartmentFilter
        );

      const matchesStatus =
        !userManagementState
          .userStatusFilter ||
        getUserStatus(user) ===
        userManagementState
          .userStatusFilter;

      const matchesVerification =
        !userManagementState
          .userVerificationFilter ||
        (
          userManagementState
            .userVerificationFilter ===
          "Verified"
            ? isUserVerified(user)
            : !isUserVerified(user)
        );

      return (
        matchesSearch &&
        matchesRole &&
        matchesDepartment &&
        matchesStatus &&
        matchesVerification
      );
    })
    .sort((first, second) => {
      const firstActive =
        isUserActive(first)
          ? 0
          : 1;

      const secondActive =
        isUserActive(second)
          ? 0
          : 1;

      if (
        firstActive !==
        secondActive
      ) {
        return (
          firstActive -
          secondActive
        );
      }

      return getUserName(first)
        .localeCompare(
          getUserName(second)
        );
    });
}

/* =========================================================
   USER TABLE
   ========================================================= */

function renderUsers() {
  const tableBody =
    userManagementElements
      .userTableBody;

  const tableContainer =
    userManagementElements
      .userTableContainer;

  const emptyState =
    userManagementElements
      .userEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const users =
    getFilteredUsers();

  const total =
    users.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        USER_MANAGEMENT_CONFIG
          .PAGE_SIZE
      )
    );

  userManagementState.userPage =
    Math.min(
      userManagementState.userPage,
      totalPages
    );

  const startIndex =
    (
      userManagementState.userPage -
      1
    ) *
    USER_MANAGEMENT_CONFIG
      .PAGE_SIZE;

  const visibleUsers =
    users.slice(
      startIndex,
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE
    );

  if (
    visibleUsers.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      userManagementElements
        .userPaginationSummary,
      0,
      0,
      0,
      "users"
    );

    renderPagination(
      userManagementElements
        .userPagination,
      1,
      1,
      "user"
    );

    updateSelectAllState([]);

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visibleUsers
      .map((user) => {
        const id =
          getRecordId(user);

        const role =
          getUserRole(user);

        const status =
          getUserStatus(user);

        const lastLogin =
          firstDefined(
            user,
            [
              "last_login_at",
              "last_login",
              "last_active_at"
            ]
          );

        const selected =
          userManagementState
            .selectedUserIds
            .has(String(id));

        const current =
          isCurrentUser(user);

        return `
          <tr
            class="user-management-data-enter"
            data-user-row="${escapeHTML(id)}"
          >
            <td>
              <label class="table-checkbox">
                <input
                  type="checkbox"
                  data-select-user="${escapeHTML(id)}"
                  aria-label="Select ${escapeHTML(
                    getUserName(user)
                  )}"
                  ${
                    selected
                      ? "checked"
                      : ""
                  }
                  ${
                    current
                      ? "disabled"
                      : ""
                  }
                />

                <span></span>
              </label>
            </td>

            <td>
              <button
                type="button"
                class="user-identity text-left"
                data-view-user="${escapeHTML(id)}"
              >
                <span class="user-avatar">
                  ${
                    user.avatar_url ||
                    user.profile_image
                      ? `
                        <img
                          src="${escapeHTML(
                            user.avatar_url ||
                            user.profile_image
                          )}"
                          alt=""
                        />
                      `
                      : escapeHTML(
                          getInitials(
                            getUserName(user)
                          )
                        )
                  }

                  <span
                    class="user-avatar-status ${
                      status === "Pending"
                        ? "pending"
                        : (
                            status === "Active"
                              ? ""
                              : "inactive"
                          )
                    }"
                  ></span>
                </span>

                <span class="user-identity-content">
                  <span class="user-name">
                    ${escapeHTML(
                      getUserName(user)
                    )}

                    ${
                      current
                        ? `
                          <span class="badge badge-neutral">
                            You
                          </span>
                        `
                        : ""
                    }
                  </span>

                  <span class="user-email">
                    ${escapeHTML(
                      getUserEmail(user) ||
                      "No email address"
                    )}
                  </span>
                </span>
              </button>
            </td>

            <td>
              <div class="user-employee-details">
                <span class="user-employee-code">
                  ${escapeHTML(
                    getUserEmployeeCode(
                      user
                    )
                  )}
                </span>

                <span class="user-job-title">
                  ${escapeHTML(
                    user.job_title ||
                    user.designation ||
                    "Job title not set"
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="user-employee-details">
                <span class="user-employee-code">
                  ${escapeHTML(
                    getDepartmentName(
                      user
                    )
                  )}
                </span>

                <span class="user-job-title">
                  ${escapeHTML(
                    getLocationName(
                      user
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <span
                class="user-role-badge ${userRoleClass(
                  role
                )}"
              >
                ${escapeHTML(
                  displayRoleName(role)
                )}
              </span>
            </td>

            <td>
              <div class="user-last-active">
                <span class="user-last-active-primary">
                  ${escapeHTML(
                    formatRelativeTime(
                      lastLogin
                    )
                  )}
                </span>

                <span class="user-last-active-secondary">
                  ${
                    lastLogin
                      ? escapeHTML(
                          formatDateTime(
                            lastLogin
                          )
                        )
                      : "No sign-in recorded"
                  }
                </span>
              </div>
            </td>

            <td>
              <div class="user-last-active">
                <span
                  class="badge badge-dot ${userStatusBadgeClass(
                    status
                  )}"
                >
                  ${escapeHTML(status)}
                </span>

                <span class="user-last-active-secondary">
                  ${
                    isUserVerified(user)
                      ? "Email verified"
                      : "Email unverified"
                  }
                </span>
              </div>
            </td>

            <td class="text-right">
              <div class="user-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-user="${escapeHTML(id)}"
                  title="View user"
                  aria-label="View ${escapeHTML(
                    getUserName(user)
                  )}"
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
                  data-edit-user="${escapeHTML(id)}"
                >
                  Edit
                </button>

                ${
                  current
                    ? ""
                    : `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-change-user-role="${escapeHTML(id)}"
                      >
                        Role
                      </button>

                      <button
                        type="button"
                        class="btn ${
                          status === "Active"
                            ? "btn-danger"
                            : "btn-primary"
                        } btn-sm"
                        data-toggle-user-status="${escapeHTML(id)}"
                      >
                        ${
                          status === "Active"
                            ? "Suspend"
                            : "Activate"
                        }
                      </button>
                    `
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  updatePaginationSummary(
    userManagementElements
      .userPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE,
      total
    ),
    total,
    "users"
  );

  renderPagination(
    userManagementElements
      .userPagination,
    userManagementState.userPage,
    totalPages,
    "user"
  );

  updateSelectAllState(
    visibleUsers
  );

  updateBulkActionBar();
}

/* =========================================================
   USER SELECTION
   ========================================================= */

function updateSelectAllState(
  visibleUsers = null
) {
  const selectAll =
    userManagementElements
      .selectAllUsers;

  if (!selectAll) {
    return;
  }

  const users =
    visibleUsers ||
    getVisibleUserPageRecords();

  const selectableIds =
    users
      .filter(
        (user) =>
          !isCurrentUser(user)
      )
      .map(
        (user) =>
          String(
            getRecordId(user)
          )
      );

  const selectedCount =
    selectableIds.filter(
      (id) =>
        userManagementState
          .selectedUserIds
          .has(id)
    ).length;

  selectAll.checked =
    selectableIds.length > 0 &&
    selectedCount ===
      selectableIds.length;

  selectAll.indeterminate =
    selectedCount > 0 &&
    selectedCount <
      selectableIds.length;

  selectAll.disabled =
    selectableIds.length === 0;
}

function getVisibleUserPageRecords() {
  const users =
    getFilteredUsers();

  const startIndex =
    (
      userManagementState.userPage -
      1
    ) *
    USER_MANAGEMENT_CONFIG
      .PAGE_SIZE;

  return users.slice(
    startIndex,
    startIndex +
    USER_MANAGEMENT_CONFIG
      .PAGE_SIZE
  );
}

function toggleUserSelection(
  userId,
  selected
) {
  const user =
    findUserById(userId);

  if (
    !user ||
    isCurrentUser(user)
  ) {
    return;
  }

  const normalizedId =
    String(userId);

  if (selected) {
    userManagementState
      .selectedUserIds
      .add(normalizedId);
  } else {
    userManagementState
      .selectedUserIds
      .delete(normalizedId);
  }

  updateSelectAllState();
  updateBulkActionBar();
}

function toggleAllVisibleUsers(
  selected
) {
  getVisibleUserPageRecords()
    .filter(
      (user) =>
        !isCurrentUser(user)
    )
    .forEach((user) => {
      const id =
        String(
          getRecordId(user)
        );

      if (selected) {
        userManagementState
          .selectedUserIds
          .add(id);
      } else {
        userManagementState
          .selectedUserIds
          .delete(id);
      }
    });

  renderUsers();
}

function clearUserSelection() {
  userManagementState
    .selectedUserIds
    .clear();

  renderUsers();
}

function updateBulkActionBar() {
  const count =
    userManagementState
      .selectedUserIds.size;

  if (
    userManagementElements
      .bulkActionBar
  ) {
    userManagementElements
      .bulkActionBar.hidden =
      count === 0;
  }

  if (
    userManagementElements
      .selectedUserCount
  ) {
    userManagementElements
      .selectedUserCount
      .textContent =
      String(count);
  }

  document
    .querySelectorAll(
      "[data-bulk-role-user-count]"
    )
    .forEach((element) => {
      element.textContent =
        String(count);
    });
}

/* =========================================================
   INVITATION FILTERING
   ========================================================= */

function getFilteredInvitations() {
  const search =
    normalizeText(
      userManagementState
        .invitationSearch
    );

  return userManagementState
    .invitations
    .filter((invitation) => {
      const searchableText = [
        invitation.name,
        invitation.email,
        invitation.role,
        invitation.department_name,
        invitation.invited_by_name,
        getInvitationStatus(
          invitation
        )
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
        !userManagementState
          .invitationStatusFilter ||
        getInvitationStatus(
          invitation
        ) ===
        userManagementState
          .invitationStatusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    })
    .sort((first, second) => {
      const firstDate =
        new Date(
          first.sent_at ||
          first.created_at ||
          0
        );

      const secondDate =
        new Date(
          second.sent_at ||
          second.created_at ||
          0
        );

      return secondDate - firstDate;
    });
}

/* =========================================================
   INVITATION TABLE
   ========================================================= */

function renderInvitations() {
  const tableBody =
    userManagementElements
      .invitationTableBody;

  const tableContainer =
    userManagementElements
      .invitationTableContainer;

  const emptyState =
    userManagementElements
      .invitationEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const invitations =
    getFilteredInvitations();

  const total =
    invitations.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        USER_MANAGEMENT_CONFIG
          .PAGE_SIZE
      )
    );

  userManagementState
    .invitationPage =
    Math.min(
      userManagementState
        .invitationPage,
      totalPages
    );

  const startIndex =
    (
      userManagementState
        .invitationPage -
      1
    ) *
    USER_MANAGEMENT_CONFIG
      .PAGE_SIZE;

  const visible =
    invitations.slice(
      startIndex,
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      userManagementElements
        .invitationPaginationSummary,
      0,
      0,
      0,
      "invitations"
    );

    renderPagination(
      userManagementElements
        .invitationPagination,
      1,
      1,
      "invitation"
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((invitation) => {
        const id =
          getRecordId(invitation);

        const status =
          getInvitationStatus(
            invitation
          );

        const sentDate =
          firstDefined(
            invitation,
            [
              "sent_at",
              "created_at"
            ]
          );

        const expiryDate =
          firstDefined(
            invitation,
            [
              "expires_at",
              "expiry_date",
              "expires_on"
            ]
          );

        const department =
          typeof invitation.department ===
          "object"
            ? invitation.department.name
            : (
                findDepartmentById(
                  invitation.department_id
                )?.name ||
                invitation.department_name ||
                "Unassigned"
              );

        return `
          <tr class="user-management-data-enter">
            <td>
              <div class="invitation-identity">
                <div
                  class="invitation-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      invitation.name ||
                      invitation.email
                    )
                  )}
                </div>

                <div class="invitation-content">
                  <div class="invitation-name">
                    ${escapeHTML(
                      invitation.name ||
                      "Invited User"
                    )}
                  </div>

                  <div class="invitation-email">
                    ${escapeHTML(
                      invitation.email ||
                      "No email address"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="user-role-badge ${userRoleClass(
                  invitation.role ||
                  "Employee"
                )}"
              >
                ${escapeHTML(
                  displayRoleName(
                    invitation.role ||
                    "Employee"
                  )
                )}
              </span>
            </td>

            <td>
              <span class="user-job-title">
                ${escapeHTML(department)}
              </span>
            </td>

            <td>
              <span class="user-job-title">
                ${escapeHTML(
                  invitation.invited_by_name ||
                  invitation.invited_by?.name ||
                  "Administrator"
                )}
              </span>
            </td>

            <td>
              <div class="invitation-date">
                <strong>
                  ${escapeHTML(
                    formatDate(sentDate)
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    formatRelativeTime(
                      sentDate
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div
                class="invitation-date ${
                  status === "Expired"
                    ? "expired"
                    : ""
                }"
              >
                <strong>
                  ${escapeHTML(
                    formatDate(
                      expiryDate
                    )
                  )}
                </strong>

                <span>
                  ${
                    status === "Expired"
                      ? "Expired"
                      : escapeHTML(
                          formatRelativeTime(
                            expiryDate
                          )
                        )
                  }
                </span>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${invitationStatusBadgeClass(
                  status
                )}"
              >
                ${escapeHTML(status)}
              </span>
            </td>

            <td class="text-right">
              <div class="invitation-actions">
                ${
                  [
                    "Pending",
                    "Expired"
                  ].includes(status)
                    ? `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-resend-invitation="${escapeHTML(id)}"
                      >
                        Resend
                      </button>
                    `
                    : ""
                }

                ${
                  status === "Pending"
                    ? `
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-revoke-invitation="${escapeHTML(id)}"
                      >
                        Revoke
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
    userManagementElements
      .invitationPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE,
      total
    ),
    total,
    "invitations"
  );

  renderPagination(
    userManagementElements
      .invitationPagination,
    userManagementState
      .invitationPage,
    totalPages,
    "invitation"
  );
}

/* =========================================================
   ROLE CARDS
   ========================================================= */

function renderRoleCounts() {
  USER_MANAGEMENT_CONFIG
    .ROLES
    .forEach((role) => {
      const count =
        userManagementState.users
          .filter(
            (user) =>
              getUserRole(user) ===
              role
          )
          .length;

      document
        .querySelectorAll(
          `[data-role-count="${role}"]`
        )
        .forEach((element) => {
          element.textContent =
            `${count} ${
              count === 1
                ? "user"
                : "users"
            }`;
        });
    });
}

/* =========================================================
   SECURITY ACTIVITY
   ========================================================= */

function getSecurityActivityType(
  activity
) {
  return titleCase(
    firstDefined(
      activity,
      [
        "activity_type",
        "action",
        "event",
        "type"
      ],
      "Account Activity"
    )
  );
}

function getSecurityActivityUser(
  activity
) {
  const reference =
    activity.user ||
    activity.employee ||
    activity.user_id ||
    activity.employee_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findUserById(reference) ||
    {
      name:
        activity.user_name ||
        activity.employee_name ||
        "Unknown User",

      email:
        activity.user_email ||
        ""
    }
  );
}

function getSecurityPerformer(
  activity
) {
  const reference =
    activity.performed_by ||
    activity.actor ||
    activity.performed_by_id ||
    activity.actor_id;

  if (
    typeof reference ===
    "object"
  ) {
    return reference;
  }

  return (
    findUserById(reference) ||
    {
      name:
        activity.performed_by_name ||
        activity.actor_name ||
        "System"
    }
  );
}

function getSecurityResult(
  activity
) {
  if (
    activity.success === false
  ) {
    return "Failed";
  }

  const status =
    titleCase(
      activity.result ||
      activity.status ||
      "Successful"
    );

  return status;
}

function securityActivityBadgeClass(
  activityType
) {
  const normalized =
    normalizeStatus(activityType);

  if (
    normalized.includes(
      "failed"
    ) ||
    normalized.includes(
      "locked"
    )
  ) {
    return "badge-danger";
  }

  if (
    normalized.includes(
      "suspended"
    ) ||
    normalized.includes(
      "password"
    )
  ) {
    return "badge-warning";
  }

  if (
    normalized.includes(
      "activated"
    ) ||
    normalized.includes(
      "login"
    )
  ) {
    return "badge-success";
  }

  if (
    normalized.includes(
      "role"
    )
  ) {
    return "badge-primary";
  }

  return "badge-info";
}

function getFilteredSecurityActivity() {
  const search =
    normalizeText(
      userManagementState
        .securitySearch
    );

  return userManagementState
    .securityActivity
    .filter((activity) => {
      const user =
        getSecurityActivityUser(
          activity
        );

      const performer =
        getSecurityPerformer(
          activity
        );

      const type =
        getSecurityActivityType(
          activity
        );

      const searchableText = [
        getUserName(user),
        getUserEmail(user),
        getUserName(performer),
        type,
        activity.details,
        activity.description,
        activity.message,
        activity.ip_address,
        activity.source,
        getSecurityResult(activity)
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
        !userManagementState
          .securityTypeFilter ||
        normalizeStatus(type) ===
        normalizeStatus(
          userManagementState
            .securityTypeFilter
        );

      return (
        matchesSearch &&
        matchesType
      );
    })
    .sort((first, second) => {
      const firstDate =
        new Date(
          first.timestamp ||
          first.created_at ||
          0
        );

      const secondDate =
        new Date(
          second.timestamp ||
          second.created_at ||
          0
        );

      return secondDate - firstDate;
    });
}

function renderSecurityActivity() {
  const tableBody =
    userManagementElements
      .securityTableBody;

  const tableContainer =
    userManagementElements
      .securityTableContainer;

  const emptyState =
    userManagementElements
      .securityEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const activities =
    getFilteredSecurityActivity();

  const total =
    activities.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        USER_MANAGEMENT_CONFIG
          .PAGE_SIZE
      )
    );

  userManagementState
    .securityPage =
    Math.min(
      userManagementState
        .securityPage,
      totalPages
    );

  const startIndex =
    (
      userManagementState
        .securityPage -
      1
    ) *
    USER_MANAGEMENT_CONFIG
      .PAGE_SIZE;

  const visible =
    activities.slice(
      startIndex,
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updatePaginationSummary(
      userManagementElements
        .securityPaginationSummary,
      0,
      0,
      0,
      "activities"
    );

    renderPagination(
      userManagementElements
        .securityPagination,
      1,
      1,
      "security"
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visible
      .map((activity) => {
        const user =
          getSecurityActivityUser(
            activity
          );

        const performer =
          getSecurityPerformer(
            activity
          );

        const type =
          getSecurityActivityType(
            activity
          );

        const result =
          getSecurityResult(
            activity
          );

        const successful =
          ![
            "failed",
            "blocked",
            "denied"
          ].includes(
            normalizeStatus(result)
          );

        return `
          <tr class="user-management-data-enter">
            <td>
              <div class="user-last-active">
                <span class="user-last-active-primary">
                  ${escapeHTML(
                    formatDateTime(
                      activity.timestamp ||
                      activity.created_at ||
                      activity.occurred_at
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <div class="security-user-cell">
                <div
                  class="security-user-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      getUserName(user)
                    )
                  )}
                </div>

                <div class="security-user-content">
                  <div class="security-user-name">
                    ${escapeHTML(
                      getUserName(user)
                    )}
                  </div>

                  <div class="security-user-email">
                    ${escapeHTML(
                      getUserEmail(user) ||
                      "No email address"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${securityActivityBadgeClass(
                  type
                )}"
              >
                ${escapeHTML(type)}
              </span>
            </td>

            <td>
              <span class="user-job-title">
                ${escapeHTML(
                  getUserName(
                    performer
                  )
                )}
              </span>
            </td>

            <td>
              <p class="security-activity-details">
                ${escapeHTML(
                  activity.details ||
                  activity.description ||
                  activity.message ||
                  "No additional details."
                )}
              </p>
            </td>

            <td>
              <div class="security-source">
                <strong>
                  ${escapeHTML(
                    activity.source ||
                    "Web Application"
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    activity.ip_address ||
                    activity.device ||
                    "Source unavailable"
                  )}
                </span>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${
                  successful
                    ? "badge-success"
                    : "badge-danger"
                }"
              >
                ${escapeHTML(result)}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

  updatePaginationSummary(
    userManagementElements
      .securityPaginationSummary,
    startIndex + 1,
    Math.min(
      startIndex +
      USER_MANAGEMENT_CONFIG
        .PAGE_SIZE,
      total
    ),
    total,
    "activities"
  );

  renderPagination(
    userManagementElements
      .securityPagination,
    userManagementState
      .securityPage,
    totalPages,
    "security"
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

  let previous = 0;
  const buttons = [];

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
   COMPLETE PAGE RENDER
   ========================================================= */

function renderUserManagementPage() {
  populateUserReferenceOptions();
  renderUserSummary();
  renderUsers();
  renderInvitations();
  renderRoleCounts();
  renderSecurityActivity();
}

/* =========================================================
   TABS
   ========================================================= */

function activateUserManagementTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "users",
    "invitations",
    "roles",
    "security"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName = "users";
  }

  userManagementState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-user-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset.userTab ===
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
      "[data-user-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset.userPanel ===
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
    )
      .filter(
        (field) =>
          !field.disabled &&
          !field.closest("[hidden]")
      );

  let valid = true;

  requiredFields.forEach((field) => {
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

function validateEmailField(field) {
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(field.value.trim());

  if (!valid) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        field,
        "Enter a valid email address."
      );
  }

  return valid;
}

/* =========================================================
   PASSWORD STRENGTH
   ========================================================= */

function calculatePasswordStrength(
  password
) {
  let score = 0;

  if (
    password.length >= 8
  ) {
    score += 1;
  }

  if (
    password.length >= 12
  ) {
    score += 1;
  }

  if (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password)
  ) {
    score += 1;
  }

  if (
    /\d/.test(password)
  ) {
    score += 1;
  }

  if (
    /[^A-Za-z0-9]/.test(
      password
    )
  ) {
    score += 1;
  }

  const levels = [
    {
      label: "Very weak",
      width: 15,
      color:
        "var(--color-danger)"
    },

    {
      label: "Weak",
      width: 30,
      color:
        "var(--color-danger)"
    },

    {
      label: "Fair",
      width: 50,
      color:
        "var(--color-warning)"
    },

    {
      label: "Good",
      width: 70,
      color:
        "var(--color-info)"
    },

    {
      label: "Strong",
      width: 88,
      color:
        "var(--color-success)"
    },

    {
      label: "Very strong",
      width: 100,
      color:
        "var(--color-success)"
    }
  ];

  return levels[
    Math.min(
      score,
      levels.length - 1
    )
  ];
}

function updatePasswordStrength() {
  const passwordInput =
    document.getElementById(
      "userTemporaryPassword"
    );

  const container =
    document.querySelector(
      "[data-user-password-strength]"
    );

  const bar =
    document.querySelector(
      "[data-password-strength-bar]"
    );

  const label =
    document.querySelector(
      "[data-password-strength-label]"
    );

  if (
    !passwordInput ||
    !container ||
    !bar ||
    !label
  ) {
    return;
  }

  const password =
    passwordInput.value;

  container.hidden =
    password.length === 0;

  if (!password) {
    return;
  }

  const strength =
    calculatePasswordStrength(
      password
    );

  bar.style.setProperty(
    "--password-strength",
    `${strength.width}%`
  );

  bar.style.setProperty(
    "--password-strength-color",
    strength.color
  );

  label.textContent =
    strength.label;
}

/* =========================================================
   CREATE / EDIT USER FORM
   ========================================================= */

function resetUserForm() {
  const form =
    userManagementElements.userForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "userId"
  ).value = "";

  document.getElementById(
    "userRole"
  ).value = "Employee";

  document.getElementById(
    "userActive"
  ).checked = true;

  document.getElementById(
    "userForcePasswordChange"
  ).checked = true;

  document.getElementById(
    "userEmailVerified"
  ).checked = false;

  const temporaryPassword =
    createRandomPassword();

  document.getElementById(
    "userTemporaryPassword"
  ).value =
    temporaryPassword;

  document.getElementById(
    "userConfirmPassword"
  ).value =
    temporaryPassword;

  document
    .querySelector(
      "[data-user-form-title]"
    )
    .textContent =
      "Add User";

  userManagementElements
    .userFormSubmitButton
    .textContent =
    "Create User";

  const passwordFields =
    document.querySelector(
      "[data-create-user-password-fields]"
    );

  passwordFields.hidden = false;

  document.getElementById(
    "userTemporaryPassword"
  ).required = true;

  document.getElementById(
    "userConfirmPassword"
  ).required = true;

  populateUserReferenceOptions();

  clearFormState(
    form,
    userManagementElements
      .userFormError
  );

  updatePasswordStrength();
}

function openUserEditor(userId) {
  const user =
    findUserById(userId);

  if (!user) {
    showToast(
      "The selected user could not be found.",
      "danger"
    );

    return;
  }

  resetUserForm();

  document.getElementById(
    "userId"
  ).value =
    getRecordId(user);

  document.getElementById(
    "userFullName"
  ).value =
    getUserName(user);

  document.getElementById(
    "userEmail"
  ).value =
    getUserEmail(user);

  document.getElementById(
    "userPhone"
  ).value =
    user.phone || "";

  document.getElementById(
    "userEmployeeId"
  ).value =
    user.employee_code ||
    user.staff_id ||
    "";

  document.getElementById(
    "userRole"
  ).value =
    getUserRole(user);

  document.getElementById(
    "userDepartment"
  ).value =
    getDepartmentId(user);

  document.getElementById(
    "userJobTitle"
  ).value =
    user.job_title ||
    user.designation ||
    "";

  populateUserReferenceOptions({
    excludedManagerId:
      getRecordId(user)
  });

  document.getElementById(
    "userManager"
  ).value =
    getManagerId(user);

  document.getElementById(
    "userLocation"
  ).value =
    getLocationId(user);

  document.getElementById(
    "userActive"
  ).checked =
    isUserActive(user);

  document.getElementById(
    "userForcePasswordChange"
  ).checked =
    toBoolean(
      user.force_password_change,
      false
    );

  document.getElementById(
    "userEmailVerified"
  ).checked =
    isUserVerified(user);

  const passwordFields =
    document.querySelector(
      "[data-create-user-password-fields]"
    );

  passwordFields.hidden = true;

  document.getElementById(
    "userTemporaryPassword"
  ).required = false;

  document.getElementById(
    "userConfirmPassword"
  ).required = false;

  document.getElementById(
    "userTemporaryPassword"
  ).value = "";

  document.getElementById(
    "userConfirmPassword"
  ).value = "";

  document
    .querySelector(
      "[data-user-form-title]"
    )
    .textContent =
      "Edit User";

  userManagementElements
    .userFormSubmitButton
    .textContent =
    "Save Changes";

  closeModal(
    userManagementElements
      .detailsModal
  );

  openModal(
    userManagementElements
      .userFormModal
  );
}

function buildUserPayload() {
  return {
    name:
      document.getElementById(
        "userFullName"
      ).value.trim(),

    email:
      document.getElementById(
        "userEmail"
      ).value.trim(),

    phone:
      document.getElementById(
        "userPhone"
      ).value.trim() || null,

    employee_code:
      document.getElementById(
        "userEmployeeId"
      ).value.trim() || null,

    role:
      document.getElementById(
        "userRole"
      ).value,

    department_id:
      document.getElementById(
        "userDepartment"
      ).value || null,

    job_title:
      document.getElementById(
        "userJobTitle"
      ).value.trim() || null,

    manager_id:
      document.getElementById(
        "userManager"
      ).value || null,

    location_id:
      document.getElementById(
        "userLocation"
      ).value || null,

    is_active:
      document.getElementById(
        "userActive"
      ).checked,

    force_password_change:
      document.getElementById(
        "userForcePasswordChange"
      ).checked,

    email_verified:
      document.getElementById(
        "userEmailVerified"
      ).checked
  };
}

async function submitUserForm(event) {
  event.preventDefault();

  const form =
    userManagementElements.userForm;

  clearFormState(
    form,
    userManagementElements
      .userFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  if (
    !validateEmailField(
      document.getElementById(
        "userEmail"
      )
    )
  ) {
    return;
  }

  const userId =
    document.getElementById(
      "userId"
    ).value;

  const payload =
    buildUserPayload();

  if (!userId) {
    const password =
      document.getElementById(
        "userTemporaryPassword"
      ).value;

    const confirmation =
      document.getElementById(
        "userConfirmPassword"
      ).value;

    if (
      password.length < 8
    ) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          document.getElementById(
            "userTemporaryPassword"
          ),
          "Password must contain at least 8 characters."
        );

      return;
    }

    if (
      password !== confirmation
    ) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          document.getElementById(
            "userConfirmPassword"
          ),
          "Passwords do not match."
        );

      return;
    }

    payload.password =
      password;
  }

  if (
    userId &&
    String(userId) ===
    String(
      getCurrentUserId()
    ) &&
    payload.is_active === false
  ) {
    showFormError(
      userManagementElements
        .userFormError,
      "You cannot suspend your own administrator account."
    );

    return;
  }

  setButtonLoading(
    userManagementElements
      .userFormSubmitButton,
    true,
    userId
      ? "Saving..."
      : "Creating..."
  );

  try {
    if (userId) {
      const encodedId =
        encodeURIComponent(
          userId
        );

      await requestWithFallback(
        [
          `/users/${encodedId}`,
          `/employees/${encodedId}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        USER_MANAGEMENT_CONFIG
          .ENDPOINTS.USERS,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      userManagementElements
        .userFormModal
    );

    showToast(
      userId
        ? "User account updated successfully."
        : "User account created successfully.",
      "success"
    );

    await loadUserManagementData();

    activateUserManagementTab(
      "users"
    );
  } catch (error) {
    applyFormError(
      form,
      userManagementElements
        .userFormError,
      error
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .userFormSubmitButton,
      false
    );
  }
}

/* =========================================================
   INVITATION FORM
   ========================================================= */

function resetInvitationForm() {
  const form =
    userManagementElements.inviteForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "inviteUserRole"
  ).value =
    "Employee";

  document.getElementById(
    "inviteExpiryDays"
  ).value =
    "3";

  document.getElementById(
    "inviteSendReminder"
  ).checked =
    true;

  document
    .querySelector(
      "[data-invitation-message-count]"
    )
    .textContent =
    "0";

  populateUserReferenceOptions();

  clearFormState(
    form,
    userManagementElements
      .inviteFormError
  );
}

async function submitInvitationForm(
  event
) {
  event.preventDefault();

  const form =
    userManagementElements.inviteForm;

  clearFormState(
    form,
    userManagementElements
      .inviteFormError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const emailField =
    document.getElementById(
      "inviteUserEmail"
    );

  if (
    !validateEmailField(
      emailField
    )
  ) {
    return;
  }

  const email =
    emailField.value.trim();

  const existingUser =
    userManagementState.users
      .find(
        (user) =>
          normalizeText(
            getUserEmail(user)
          ) ===
          normalizeText(email)
      );

  if (existingUser) {
    showFormError(
      userManagementElements
        .inviteFormError,
      "A user account already exists with this email address."
    );

    return;
  }

  const existingInvitation =
    userManagementState
      .invitations
      .find(
        (invitation) =>
          normalizeText(
            invitation.email
          ) ===
            normalizeText(email) &&
          getInvitationStatus(
            invitation
          ) === "Pending"
      );

  if (existingInvitation) {
    showFormError(
      userManagementElements
        .inviteFormError,
      "A pending invitation already exists for this email address."
    );

    return;
  }

  const payload = {
    name:
      document.getElementById(
        "inviteUserName"
      ).value.trim(),

    email,

    role:
      document.getElementById(
        "inviteUserRole"
      ).value,

    department_id:
      document.getElementById(
        "inviteUserDepartment"
      ).value || null,

    message:
      document.getElementById(
        "inviteUserMessage"
      ).value.trim() || null,

    expiry_days:
      Number(
        document.getElementById(
          "inviteExpiryDays"
        ).value
      ),

    send_reminder:
      document.getElementById(
        "inviteSendReminder"
      ).checked
  };

  setButtonLoading(
    userManagementElements
      .inviteSubmitButton,
    true,
    "Sending..."
  );

  try {
    await requestWithFallback(
      USER_MANAGEMENT_CONFIG
        .ENDPOINTS.INVITATIONS,
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      userManagementElements
        .inviteModal
    );

    showToast(
      "User invitation sent successfully.",
      "success"
    );

    await loadUserManagementData();

    activateUserManagementTab(
      "invitations"
    );
  } catch (error) {
    applyFormError(
      form,
      userManagementElements
        .inviteFormError,
      error
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .inviteSubmitButton,
      false
    );
  }
}

/* =========================================================
   INVITATION ACTIONS
   ========================================================= */

async function resendInvitation(
  invitationId
) {
  const invitation =
    findInvitationById(
      invitationId
    );

  if (!invitation) {
    showToast(
      "Invitation could not be found.",
      "danger"
    );

    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        invitationId
      );

    await requestWithFallback(
      [
        `/user-invitations/${encodedId}/resend`,
        `/invitations/${encodedId}/resend`,
        `/employee-invitations/${encodedId}/resend`
      ],
      {
        method: "POST",
        body: {}
      }
    );

    showToast(
      `Invitation resent to ${invitation.email}.`,
      "success"
    );

    await loadUserManagementData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to resend the invitation.",
      "danger"
    );
  }
}

async function revokeInvitation(
  invitationId
) {
  const invitation =
    findInvitationById(
      invitationId
    );

  if (!invitation) {
    showToast(
      "Invitation could not be found.",
      "danger"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Revoke the invitation sent to ${invitation.email}?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        invitationId
      );

    await requestWithFallback(
      [
        `/user-invitations/${encodedId}/revoke`,
        `/invitations/${encodedId}/revoke`,
        `/employee-invitations/${encodedId}/revoke`,
        `/user-invitations/${encodedId}`
      ],
      {
        method: "PATCH",
        body: {
          status:
            "Revoked"
        }
      }
    );

    showToast(
      "Invitation revoked successfully.",
      "success"
    );

    await loadUserManagementData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to revoke the invitation.",
      "danger"
    );
  }
}

/* =========================================================
   USER DETAILS
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

function getUserSecurityActivity(
  user
) {
  const userId =
    String(
      getRecordId(user)
    );

  const email =
    normalizeText(
      getUserEmail(user)
    );

  return userManagementState
    .securityActivity
    .filter((activity) => {
      const activityUser =
        getSecurityActivityUser(
          activity
        );

      const activityUserId =
        String(
          getRecordId(
            activityUser
          )
        );

      const activityEmail =
        normalizeText(
          getUserEmail(
            activityUser
          )
        );

      return (
        (
          userId &&
          activityUserId ===
          userId
        ) ||
        (
          email &&
          activityEmail ===
          email
        )
      );
    })
    .sort((first, second) => {
      return (
        new Date(
          second.timestamp ||
          second.created_at ||
          0
        ) -
        new Date(
          first.timestamp ||
          first.created_at ||
          0
        )
      );
    });
}

function getUserRelatedMetrics(user) {
  const userId =
    String(
      getRecordId(user)
    );

  const allocatedAssets =
    userManagementState
      .allocations
      .filter((allocation) => {
        const assignee =
          allocation.employee_id ||
          allocation.user_id ||
          allocation.assigned_to_id ||
          allocation.employee?.id ||
          allocation.user?.id;

        const status =
          normalizeStatus(
            allocation.status
          );

        return (
          String(assignee) ===
            userId &&
          ![
            "returned",
            "cancelled",
            "closed"
          ].includes(status)
        );
      });

  const activeBookings =
    userManagementState
      .bookings
      .filter((booking) => {
        const requester =
          booking.user_id ||
          booking.employee_id ||
          booking.requested_by_id ||
          booking.user?.id ||
          booking.employee?.id;

        const status =
          normalizeStatus(
            booking.status
          );

        return (
          String(requester) ===
            userId &&
          ![
            "cancelled",
            "completed",
            "rejected"
          ].includes(status)
        );
      });

  const openRequests =
    userManagementState
      .maintenance
      .filter((request) => {
        const reporter =
          request.reported_by_id ||
          request.reporter_id ||
          request.created_by_id ||
          request.reported_by?.id ||
          request.reporter?.id;

        const status =
          normalizeStatus(
            request.status
          );

        return (
          String(reporter) ===
            userId &&
          ![
            "completed",
            "resolved",
            "closed",
            "cancelled"
          ].includes(status)
        );
      });

  return {
    assets:
      allocatedAssets.length,

    bookings:
      activeBookings.length,

    requests:
      openRequests.length,

    securityEvents:
      getUserSecurityActivity(
        user
      ).length
  };
}

function renderUserDetails(user) {
  userManagementState.selectedUserId =
    getRecordId(user);

  const status =
    getUserStatus(user);

  const role =
    getUserRole(user);

  setDetailText(
    "[data-user-detail-name]",
    getUserName(user)
  );

  setDetailText(
    "[data-user-detail-email]",
    getUserEmail(user) ||
    "No email address"
  );

  setDetailText(
    "[data-user-detail-avatar]",
    getInitials(
      getUserName(user)
    )
  );

  setDetailText(
    "[data-user-detail-employee-id]",
    getUserEmployeeCode(user)
  );

  setDetailText(
    "[data-user-detail-department]",
    getDepartmentName(user)
  );

  setDetailText(
    "[data-user-detail-job-title]",
    user.job_title ||
    user.designation ||
    "Not specified"
  );

  setDetailText(
    "[data-user-detail-manager]",
    getManagerName(user)
  );

  setDetailText(
    "[data-user-detail-location]",
    getLocationName(user)
  );

  setDetailText(
    "[data-user-detail-phone]",
    user.phone ||
    "Not provided"
  );

  setDetailText(
    "[data-user-detail-created]",
    formatDateTime(
      user.created_at ||
      user.joined_at
    )
  );

  setDetailText(
    "[data-user-detail-last-login]",
    formatDateTime(
      user.last_login_at ||
      user.last_login ||
      user.last_active_at
    )
  );

  setDetailText(
    "[data-user-detail-password-changed]",
    formatDateTime(
      user.password_changed_at ||
      user.last_password_change
    )
  );

  const statusElement =
    document.querySelector(
      "[data-user-detail-status]"
    );

  if (statusElement) {
    statusElement.textContent =
      status;

    statusElement.className =
      `badge badge-dot ${userStatusBadgeClass(
        status
      )}`;
  }

  const roleElement =
    document.querySelector(
      "[data-user-detail-role]"
    );

  if (roleElement) {
    roleElement.textContent =
      displayRoleName(role);

    roleElement.className =
      `user-role-badge ${userRoleClass(
        role
      )}`;
  }

  const verificationElement =
    document.querySelector(
      "[data-user-detail-verification]"
    );

  if (verificationElement) {
    verificationElement.textContent =
      isUserVerified(user)
        ? "Email Verified"
        : "Email Unverified";

    verificationElement.className =
      `badge ${
        isUserVerified(user)
          ? "badge-success"
          : "badge-neutral"
      }`;
  }

  const metrics =
    getUserRelatedMetrics(user);

  setDetailText(
    "[data-user-detail-assets]",
    metrics.assets
  );

  setDetailText(
    "[data-user-detail-bookings]",
    metrics.bookings
  );

  setDetailText(
    "[data-user-detail-requests]",
    metrics.requests
  );

  setDetailText(
    "[data-user-detail-security-events]",
    metrics.securityEvents
  );

  renderUserActivity(
    getUserSecurityActivity(
      user
    )
  );

  const current =
    isCurrentUser(user);

  const resetButton =
    document.querySelector(
      "[data-reset-current-user-password]"
    );

  const statusButton =
    document.querySelector(
      "[data-toggle-current-user-status]"
    );

  if (resetButton) {
    resetButton.hidden =
      current;
  }

  if (statusButton) {
    statusButton.hidden =
      current;

    statusButton.textContent =
      status === "Active"
        ? "Suspend User"
        : "Activate User";

    statusButton.className =
      `btn ${
        status === "Active"
          ? "btn-danger"
          : "btn-primary"
      }`;
  }
}

function userActivityColor(type) {
  const normalized =
    normalizeStatus(type);

  if (
    normalized.includes(
      "failed"
    ) ||
    normalized.includes(
      "locked"
    )
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes(
      "role"
    )
  ) {
    return "var(--color-primary)";
  }

  if (
    normalized.includes(
      "password"
    )
  ) {
    return "var(--color-warning)";
  }

  return "var(--color-success)";
}

function userActivityIcon(type) {
  const normalized =
    normalizeStatus(type);

  if (
    normalized.includes(
      "role"
    )
  ) {
    return `
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"></path>
      <path d="M9 12h6"></path>
    `;
  }

  if (
    normalized.includes(
      "password"
    )
  ) {
    return `
      <rect x="4" y="10" width="16" height="11" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    `;
  }

  return `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 7v5l3 2"></path>
  `;
}

function renderUserActivity(
  activities
) {
  const container =
    document.querySelector(
      "[data-user-activity-timeline]"
    );

  const count =
    document.querySelector(
      "[data-user-activity-count]"
    );

  if (!container) {
    return;
  }

  if (count) {
    count.textContent =
      `${activities.length} ${
        activities.length === 1
          ? "event"
          : "events"
      }`;
  }

  if (
    activities.length === 0
  ) {
    container.innerHTML = `
      <div class="state-container">
        <h3 class="state-title">
          No account activity
        </h3>

        <p class="state-description">
          Security and account changes will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    activities
      .slice(0, 10)
      .map((activity) => {
        const type =
          getSecurityActivityType(
            activity
          );

        const performer =
          getSecurityPerformer(
            activity
          );

        return `
          <div class="timeline-item user-management-data-enter">
            <div
              class="user-activity-marker"
              style="
                --activity-color:
                  ${userActivityColor(
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
                ${userActivityIcon(
                  type
                )}
              </svg>
            </div>

            <div class="user-activity-content">
              <h4 class="user-activity-title">
                ${escapeHTML(type)}
              </h4>

              <p class="user-activity-description">
                ${escapeHTML(
                  activity.details ||
                  activity.description ||
                  activity.message ||
                  `${type} was recorded for this account.`
                )}
              </p>

              <p class="user-activity-meta">
                ${escapeHTML(
                  getUserName(
                    performer
                  )
                )}
                ·
                ${escapeHTML(
                  formatRelativeTime(
                    activity.timestamp ||
                    activity.created_at ||
                    activity.occurred_at
                  )
                )}
              </p>
            </div>
          </div>
        `;
      })
      .join("");
}

async function openUserDetails(
  userId
) {
  let user =
    findUserById(userId);

  if (!user) {
    showToast(
      "The selected user could not be found.",
      "danger"
    );

    return;
  }

  renderUserDetails(user);

  openModal(
    userManagementElements
      .detailsModal
  );

  try {
    const detailedUser =
      await fetchUserById(
        userId
      );

    user = {
      ...user,
      ...detailedUser
    };

    renderUserDetails(user);
  } catch (error) {
    if (
      ![404, 405].includes(
        error.status
      )
    ) {
      console.error(
        "Unable to load full user details:",
        error
      );
    }
  }
}

/* =========================================================
   ROLE CHANGE
   ========================================================= */

function resetChangeRoleForm() {
  const form =
    userManagementElements
      .changeRoleForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "changeRoleUserId"
  ).value = "";

  document.getElementById(
    "changeUserRole"
  ).value = "Employee";

  document.getElementById(
    "notifyUserRoleChange"
  ).checked = true;

  document
    .querySelector(
      "[data-role-change-reason-count]"
    )
    .textContent = "0";

  populateUserReferenceOptions();

  clearFormState(
    form,
    userManagementElements
      .changeRoleError
  );
}

function openChangeRoleModal(
  userId
) {
  const user =
    findUserById(userId);

  if (!user) {
    showToast(
      "The selected user could not be found.",
      "danger"
    );

    return;
  }

  if (isCurrentUser(user)) {
    showToast(
      "Use another administrator account to change your own role.",
      "warning"
    );

    return;
  }

  resetChangeRoleForm();

  document.getElementById(
    "changeRoleUserId"
  ).value =
    getRecordId(user);

  document.getElementById(
    "changeUserRole"
  ).value =
    getUserRole(user);

  document.getElementById(
    "changeRoleDepartment"
  ).value =
    getDepartmentId(user);

  setDetailText(
    "[data-role-change-avatar]",
    getInitials(
      getUserName(user)
    )
  );

  setDetailText(
    "[data-role-change-user-name]",
    getUserName(user)
  );

  setDetailText(
    "[data-role-change-user-email]",
    getUserEmail(user)
  );

  closeModal(
    userManagementElements
      .detailsModal
  );

  openModal(
    userManagementElements
      .changeRoleModal
  );
}

async function submitChangeRole(
  event
) {
  event.preventDefault();

  const form =
    userManagementElements
      .changeRoleForm;

  clearFormState(
    form,
    userManagementElements
      .changeRoleError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const userId =
    document.getElementById(
      "changeRoleUserId"
    ).value;

  const user =
    findUserById(userId);

  if (
    !user ||
    isCurrentUser(user)
  ) {
    showFormError(
      userManagementElements
        .changeRoleError,
      "This account role cannot be changed from the current session."
    );

    return;
  }

  const payload = {
    role:
      document.getElementById(
        "changeUserRole"
      ).value,

    department_id:
      document.getElementById(
        "changeRoleDepartment"
      ).value || null,

    reason:
      document.getElementById(
        "changeRoleReason"
      ).value.trim(),

    notify_user:
      document.getElementById(
        "notifyUserRoleChange"
      ).checked
  };

  setButtonLoading(
    userManagementElements
      .changeRoleSubmitButton,
    true,
    "Updating..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        userId
      );

    await requestWithFallback(
      [
        `/users/${encodedId}/role`,
        `/employees/${encodedId}/role`,
        `/users/${encodedId}`,
        `/employees/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      userManagementElements
        .changeRoleModal
    );

    showToast(
      "User role updated successfully.",
      "success"
    );

    await loadUserManagementData();
  } catch (error) {
    applyFormError(
      form,
      userManagementElements
        .changeRoleError,
      error
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .changeRoleSubmitButton,
      false
    );
  }
}

/* =========================================================
   PASSWORD RESET
   ========================================================= */

function updatePasswordResetMethod() {
  const method =
    userManagementElements
      .passwordResetForm
      ?.querySelector(
        '[name="reset_method"]:checked'
      )?.value ||
    "email";

  const group =
    document.getElementById(
      "temporaryPasswordGroup"
    );

  const input =
    document.getElementById(
      "resetTemporaryPassword"
    );

  const temporary =
    method ===
    "temporary_password";

  group.hidden =
    !temporary;

  input.required =
    temporary;

  if (
    temporary &&
    !input.value
  ) {
    input.value =
      createRandomPassword();
  }
}

function resetPasswordResetForm() {
  const form =
    userManagementElements
      .passwordResetForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "passwordResetUserId"
  ).value = "";

  document.getElementById(
    "resetPasswordEndSessions"
  ).checked = true;

  document.getElementById(
    "resetPasswordRequireChange"
  ).checked = true;

  clearFormState(
    form,
    userManagementElements
      .passwordResetError
  );

  updatePasswordResetMethod();
}

function openPasswordResetModal(
  userId
) {
  const user =
    findUserById(userId);

  if (!user) {
    showToast(
      "The selected user could not be found.",
      "danger"
    );

    return;
  }

  if (isCurrentUser(user)) {
    showToast(
      "Use your account settings to change your own password.",
      "warning"
    );

    return;
  }

  resetPasswordResetForm();

  document.getElementById(
    "passwordResetUserId"
  ).value =
    getRecordId(user);

  setDetailText(
    "[data-password-reset-avatar]",
    getInitials(
      getUserName(user)
    )
  );

  setDetailText(
    "[data-password-reset-user-name]",
    getUserName(user)
  );

  setDetailText(
    "[data-password-reset-user-email]",
    getUserEmail(user)
  );

  closeModal(
    userManagementElements
      .detailsModal
  );

  openModal(
    userManagementElements
      .passwordResetModal
  );
}

async function submitPasswordReset(
  event
) {
  event.preventDefault();

  const form =
    userManagementElements
      .passwordResetForm;

  clearFormState(
    form,
    userManagementElements
      .passwordResetError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const userId =
    document.getElementById(
      "passwordResetUserId"
    ).value;

  const method =
    form.querySelector(
      '[name="reset_method"]:checked'
    )?.value ||
    "email";

  const payload = {
    reset_method:
      method,

    end_sessions:
      document.getElementById(
        "resetPasswordEndSessions"
      ).checked,

    require_password_change:
      document.getElementById(
        "resetPasswordRequireChange"
      ).checked
  };

  if (
    method ===
    "temporary_password"
  ) {
    const temporaryPassword =
      document.getElementById(
        "resetTemporaryPassword"
      ).value;

    if (
      temporaryPassword.length < 8
    ) {
      window.AssetFlowUtils
        ?.showFieldError?.(
          document.getElementById(
            "resetTemporaryPassword"
          ),
          "Temporary password must contain at least 8 characters."
        );

      return;
    }

    payload.temporary_password =
      temporaryPassword;
  }

  setButtonLoading(
    userManagementElements
      .passwordResetSubmitButton,
    true,
    "Resetting..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        userId
      );

    await requestWithFallback(
      [
        `/users/${encodedId}/reset-password`,
        `/employees/${encodedId}/reset-password`,
        `/users/${encodedId}/password-reset`
      ],
      {
        method: "POST",
        body: payload
      }
    );

    closeModal(
      userManagementElements
        .passwordResetModal
    );

    showToast(
      method === "email"
        ? "Password reset email sent successfully."
        : "Temporary password assigned successfully.",
      "success"
    );

    await loadUserManagementData();
  } catch (error) {
    applyFormError(
      form,
      userManagementElements
        .passwordResetError,
      error
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .passwordResetSubmitButton,
      false
    );
  }
}

/* =========================================================
   USER STATUS
   ========================================================= */

function resetStatusForm() {
  const form =
    userManagementElements
      .statusForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "statusUserId"
  ).value = "";

  document.getElementById(
    "userTargetStatus"
  ).value = "";

  document.getElementById(
    "notifyUserStatusChange"
  ).checked = true;

  clearFormState(
    form,
    userManagementElements
      .statusError
  );
}

function openUserStatusModal(
  userId,
  forcedTargetStatus = ""
) {
  const user =
    findUserById(userId);

  if (!user) {
    showToast(
      "The selected user could not be found.",
      "danger"
    );

    return;
  }

  if (isCurrentUser(user)) {
    showToast(
      "You cannot change the status of your own active session.",
      "warning"
    );

    return;
  }

  resetStatusForm();

  const currentlyActive =
    isUserActive(user);

  const targetStatus =
    forcedTargetStatus ||
    (
      currentlyActive
        ? "Suspended"
        : "Active"
    );

  const activating =
    targetStatus ===
    "Active";

  document.getElementById(
    "statusUserId"
  ).value =
    getRecordId(user);

  document.getElementById(
    "userTargetStatus"
  ).value =
    targetStatus;

  setDetailText(
    "[data-user-status-modal-title]",
    activating
      ? "Activate User"
      : "Suspend User"
  );

  setDetailText(
    "[data-user-status-confirmation-title]",
    activating
      ? `Activate ${getUserName(
          user
        )}?`
      : `Suspend ${getUserName(
          user
        )}?`
  );

  setDetailText(
    "[data-user-status-confirmation-description]",
    activating
      ? "The user will regain access to AssetFlow immediately."
      : "The user will be signed out and unable to access AssetFlow."
  );

  const icon =
    document.querySelector(
      "[data-user-status-confirmation-icon]"
    );

  if (icon) {
    icon.classList.toggle(
      "danger",
      !activating
    );

    icon.classList.toggle(
      "success",
      activating
    );
  }

  userManagementElements
    .statusSubmitButton
    .textContent =
    activating
      ? "Activate User"
      : "Suspend User";

  userManagementElements
    .statusSubmitButton
    .className =
    `btn ${
      activating
        ? "btn-primary"
        : "btn-danger"
    }`;

  closeModal(
    userManagementElements
      .detailsModal
  );

  openModal(
    userManagementElements
      .statusModal
  );
}

async function submitUserStatus(
  event
) {
  event.preventDefault();

  const form =
    userManagementElements
      .statusForm;

  clearFormState(
    form,
    userManagementElements
      .statusError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const userId =
    document.getElementById(
      "statusUserId"
    ).value;

  const targetStatus =
    document.getElementById(
      "userTargetStatus"
    ).value;

  const user =
    findUserById(userId);

  if (
    !user ||
    isCurrentUser(user)
  ) {
    showFormError(
      userManagementElements
        .statusError,
      "This account status cannot be changed from the current session."
    );

    return;
  }

  const payload = {
    status:
      targetStatus,

    is_active:
      targetStatus ===
      "Active",

    reason:
      document.getElementById(
        "userStatusReason"
      ).value.trim(),

    notify_user:
      document.getElementById(
        "notifyUserStatusChange"
      ).checked
  };

  setButtonLoading(
    userManagementElements
      .statusSubmitButton,
    true,
    targetStatus === "Active"
      ? "Activating..."
      : "Suspending..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        userId
      );

    await requestWithFallback(
      [
        `/users/${encodedId}/status`,
        `/employees/${encodedId}/status`,
        `/users/${encodedId}`,
        `/employees/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      userManagementElements
        .statusModal
    );

    showToast(
      targetStatus === "Active"
        ? "User account activated successfully."
        : "User account suspended successfully.",
      "success"
    );

    await loadUserManagementData();
  } catch (error) {
    applyFormError(
      form,
      userManagementElements
        .statusError,
      error
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .statusSubmitButton,
      false
    );
  }
}

/* =========================================================
   BULK ACTIONS
   ========================================================= */

function getSelectedUsers() {
  return Array.from(
    userManagementState
      .selectedUserIds
  )
    .map(findUserById)
    .filter(Boolean)
    .filter(
      (user) =>
        !isCurrentUser(user)
    );
}

async function updateUsersInBulk(
  users,
  payloadResolver,
  actionLabel
) {
  if (
    users.length === 0
  ) {
    showToast(
      "Select at least one user.",
      "warning"
    );

    return {
      fulfilled: 0,
      rejected: 0
    };
  }

  const results =
    await Promise.allSettled(
      users.map((user) => {
        const userId =
          encodeURIComponent(
            getRecordId(user)
          );

        return requestWithFallback(
          [
            `/users/${userId}`,
            `/employees/${userId}`
          ],
          {
            method: "PATCH",
            body:
              payloadResolver(user)
          }
        );
      })
    );

  const fulfilled =
    results.filter(
      (result) =>
        result.status ===
        "fulfilled"
    ).length;

  const rejected =
    results.length -
    fulfilled;

  if (fulfilled > 0) {
    showToast(
      `${actionLabel} completed for ${fulfilled} ${
        fulfilled === 1
          ? "user"
          : "users"
      }.`,
      "success"
    );
  }

  if (rejected > 0) {
    showToast(
      `${rejected} ${
        rejected === 1
          ? "account"
          : "accounts"
      } could not be updated.`,
      "danger"
    );
  }

  return {
    fulfilled,
    rejected
  };
}

async function bulkActivateUsers() {
  const users =
    getSelectedUsers();

  if (
    users.length === 0
  ) {
    showToast(
      "Select at least one user.",
      "warning"
    );

    return;
  }

  await updateUsersInBulk(
    users,
    () => ({
      status: "Active",
      is_active: true,
      reason:
        "Bulk activation by administrator"
    }),
    "Activation"
  );

  clearUserSelection();
  await loadUserManagementData();
}

async function bulkSuspendUsers() {
  const users =
    getSelectedUsers();

  if (
    users.length === 0
  ) {
    showToast(
      "Select at least one user.",
      "warning"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Suspend ${users.length} selected user accounts?`
    );

  if (!confirmed) {
    return;
  }

  await updateUsersInBulk(
    users,
    () => ({
      status:
        "Suspended",

      is_active:
        false,

      reason:
        "Bulk suspension by administrator"
    }),
    "Suspension"
  );

  clearUserSelection();
  await loadUserManagementData();
}

function resetBulkRoleForm() {
  const form =
    userManagementElements
      .bulkRoleForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "bulkUserRole"
  ).value = "Employee";

  document.getElementById(
    "bulkRoleNotifyUsers"
  ).checked = true;

  clearFormState(
    form,
    userManagementElements
      .bulkRoleError
  );

  updateBulkActionBar();
}

function openBulkRoleModal() {
  if (
    getSelectedUsers()
      .length === 0
  ) {
    showToast(
      "Select at least one user.",
      "warning"
    );

    return;
  }

  resetBulkRoleForm();

  openModal(
    userManagementElements
      .bulkRoleModal
  );
}

async function submitBulkRole(
  event
) {
  event.preventDefault();

  const form =
    userManagementElements
      .bulkRoleForm;

  clearFormState(
    form,
    userManagementElements
      .bulkRoleError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const users =
    getSelectedUsers();

  if (
    users.length === 0
  ) {
    showFormError(
      userManagementElements
        .bulkRoleError,
      "No users are selected."
    );

    return;
  }

  const role =
    document.getElementById(
      "bulkUserRole"
    ).value;

  const reason =
    document.getElementById(
      "bulkRoleReason"
    ).value.trim();

  const notifyUsers =
    document.getElementById(
      "bulkRoleNotifyUsers"
    ).checked;

  setButtonLoading(
    userManagementElements
      .bulkRoleSubmitButton,
    true,
    "Updating..."
  );

  try {
    await updateUsersInBulk(
      users,
      () => ({
        role,
        reason,
        notify_user:
          notifyUsers
      }),
      "Role update"
    );

    closeModal(
      userManagementElements
        .bulkRoleModal
    );

    clearUserSelection();

    await loadUserManagementData();
  } catch (error) {
    showFormError(
      userManagementElements
        .bulkRoleError,
      error?.message ||
      "Unable to update the selected user roles."
    );
  } finally {
    setButtonLoading(
      userManagementElements
        .bulkRoleSubmitButton,
      false
    );
  }
}

/* =========================================================
   FILTER RESET
   ========================================================= */

function resetUserFilters() {
  userManagementState.userSearch = "";
  userManagementState.userRoleFilter = "";
  userManagementState.userDepartmentFilter = "";
  userManagementState.userStatusFilter = "";
  userManagementState.userVerificationFilter = "";
  userManagementState.userPage = 1;

  userManagementElements
    .userSearch.value = "";

  userManagementElements
    .userRoleFilter.value = "";

  userManagementElements
    .userDepartmentFilter.value = "";

  userManagementElements
    .userStatusFilter.value = "";

  userManagementElements
    .userVerificationFilter.value = "";

  renderUsers();
}

/* =========================================================
   SECURITY EXPORT
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

function exportSecurityActivity() {
  const activities =
    getFilteredSecurityActivity();

  if (
    activities.length === 0
  ) {
    showToast(
      "There is no security activity to export.",
      "warning"
    );

    return;
  }

  const headings = [
    "Timestamp",
    "User",
    "User Email",
    "Activity",
    "Performed By",
    "Details",
    "Source",
    "IP Address",
    "Result"
  ];

  const rows =
    activities.map((activity) => {
      const user =
        getSecurityActivityUser(
          activity
        );

      const performer =
        getSecurityPerformer(
          activity
        );

      return [
        formatDateTime(
          activity.timestamp ||
          activity.created_at ||
          activity.occurred_at
        ),

        getUserName(user),
        getUserEmail(user),

        getSecurityActivityType(
          activity
        ),

        getUserName(performer),

        activity.details ||
        activity.description ||
        activity.message ||
        "",

        activity.source ||
        "Web Application",

        activity.ip_address ||
        "",

        getSecurityResult(
          activity
        )
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
    `assetflow-security-activity-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    "Security activity exported successfully.",
    "success"
  );
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadUserManagementData({
  showSuccessToast = false
} = {}) {
  if (
    userManagementState.loading
  ) {
    return;
  }

  userManagementState
    .abortController
    ?.abort();

  userManagementState
    .abortController =
    new AbortController();

  const signal =
    userManagementState
      .abortController.signal;

  setUserManagementLoading(true);
  hidePageError();

  try {
    const results =
      await Promise.allSettled([
        fetchUsers(signal),
        fetchInvitations(signal),
        fetchDepartments(signal),
        fetchLocations(signal),
        fetchSecurityActivity(signal),
        fetchAllocations(signal),
        fetchBookings(signal),
        fetchMaintenance(signal)
      ]);

    const [
      usersResult,
      invitationsResult,
      departmentsResult,
      locationsResult,
      securityResult,
      allocationsResult,
      bookingsResult,
      maintenanceResult
    ] = results;

    if (
      usersResult.status ===
      "rejected"
    ) {
      throw usersResult.reason;
    }

    userManagementState.users =
      usersResult.value;

    userManagementState.invitations =
      invitationsResult.status ===
      "fulfilled"
        ? invitationsResult.value
        : [];

    userManagementState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    userManagementState.locations =
      locationsResult.status ===
      "fulfilled"
        ? locationsResult.value
        : [];

    userManagementState.securityActivity =
      securityResult.status ===
      "fulfilled"
        ? securityResult.value
        : [];

    userManagementState.allocations =
      allocationsResult.status ===
      "fulfilled"
        ? allocationsResult.value
        : [];

    userManagementState.bookings =
      bookingsResult.status ===
      "fulfilled"
        ? bookingsResult.value
        : [];

    userManagementState.maintenance =
      maintenanceResult.status ===
      "fulfilled"
        ? maintenanceResult.value
        : [];

    const validUserIds =
      new Set(
        userManagementState.users
          .map(getRecordId)
          .filter(Boolean)
          .map(String)
      );

    userManagementState
      .selectedUserIds =
      new Set(
        Array.from(
          userManagementState
            .selectedUserIds
        )
          .filter(
            (id) =>
              validUserIds.has(id)
          )
      );

    renderUserManagementPage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "User management data refreshed.",
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
      "User management loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load user management data."
    );

    showToast(
      error?.message ||
      "Unable to load user management data.",
      "danger"
    );
  } finally {
    setUserManagementLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-users-last-updated]"
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

  const userId =
    parameters.get("user_id");

  const role =
    parameters.get("role");

  if (tab) {
    activateUserManagementTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (role) {
    userManagementState
      .userRoleFilter =
      role;

    userManagementElements
      .userRoleFilter.value =
      role;

    userManagementState
      .userPage = 1;

    activateUserManagementTab(
      "users",
      {
        updateURL: false
      }
    );

    renderUsers();
  }

  if (userId) {
    openUserDetails(userId);
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-user-tab]"
    );

  if (tab) {
    activateUserManagementTab(
      tab.dataset.userTab
    );

    return;
  }

  const resetFilters =
    event.target.closest(
      "[data-reset-user-filters]"
    );

  if (resetFilters) {
    resetUserFilters();
    return;
  }

  const createUser =
    event.target.closest(
      "[data-create-user]"
    );

  if (createUser) {
    resetUserForm();
    return;
  }

  const inviteUser =
    event.target.closest(
      "[data-open-user-invite]"
    );

  if (inviteUser) {
    resetInvitationForm();
    return;
  }

  const viewUser =
    event.target.closest(
      "[data-view-user]"
    );

  if (viewUser) {
    openUserDetails(
      viewUser.dataset.viewUser
    );

    return;
  }

  const editUser =
    event.target.closest(
      "[data-edit-user]"
    );

  if (editUser) {
    openUserEditor(
      editUser.dataset.editUser
    );

    return;
  }

  const changeRole =
    event.target.closest(
      "[data-change-user-role]"
    );

  if (changeRole) {
    openChangeRoleModal(
      changeRole.dataset
        .changeUserRole
    );

    return;
  }

  const toggleStatus =
    event.target.closest(
      "[data-toggle-user-status]"
    );

  if (toggleStatus) {
    openUserStatusModal(
      toggleStatus.dataset
        .toggleUserStatus
    );

    return;
  }

  const editCurrent =
    event.target.closest(
      "[data-edit-current-user]"
    );

  if (
    editCurrent &&
    userManagementState
      .selectedUserId
  ) {
    openUserEditor(
      userManagementState
        .selectedUserId
    );

    return;
  }

  const resetCurrentPassword =
    event.target.closest(
      "[data-reset-current-user-password]"
    );

  if (
    resetCurrentPassword &&
    userManagementState
      .selectedUserId
  ) {
    openPasswordResetModal(
      userManagementState
        .selectedUserId
    );

    return;
  }

  const toggleCurrentStatus =
    event.target.closest(
      "[data-toggle-current-user-status]"
    );

  if (
    toggleCurrentStatus &&
    userManagementState
      .selectedUserId
  ) {
    openUserStatusModal(
      userManagementState
        .selectedUserId
    );

    return;
  }

  const resendInvitationButton =
    event.target.closest(
      "[data-resend-invitation]"
    );

  if (resendInvitationButton) {
    resendInvitation(
      resendInvitationButton
        .dataset.resendInvitation
    );

    return;
  }

  const revokeInvitationButton =
    event.target.closest(
      "[data-revoke-invitation]"
    );

  if (revokeInvitationButton) {
    revokeInvitation(
      revokeInvitationButton
        .dataset.revokeInvitation
    );

    return;
  }

  const filterByRole =
    event.target.closest(
      "[data-filter-by-role]"
    );

  if (filterByRole) {
    userManagementState
      .userRoleFilter =
      filterByRole.dataset
        .filterByRole;

    userManagementElements
      .userRoleFilter.value =
      userManagementState
        .userRoleFilter;

    userManagementState
      .userPage = 1;

    activateUserManagementTab(
      "users"
    );

    renderUsers();

    return;
  }

  const clearSelection =
    event.target.closest(
      "[data-clear-user-selection]"
    );

  if (clearSelection) {
    clearUserSelection();
    return;
  }

  const bulkActivate =
    event.target.closest(
      "[data-bulk-activate-users]"
    );

  if (bulkActivate) {
    bulkActivateUsers();
    return;
  }

  const bulkSuspend =
    event.target.closest(
      "[data-bulk-suspend-users]"
    );

  if (bulkSuspend) {
    bulkSuspendUsers();
    return;
  }

  const bulkChangeRole =
    event.target.closest(
      "[data-bulk-change-role]"
    );

  if (bulkChangeRole) {
    openBulkRoleModal();
    return;
  }

  const exportSecurity =
    event.target.closest(
      "[data-export-security-activity]"
    );

  if (exportSecurity) {
    exportSecurityActivity();
    return;
  }

  const userPage =
    event.target.closest(
      "[data-user-page]"
    );

  if (userPage) {
    const page =
      Number(
        userPage.dataset.userPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      userManagementState
        .userPage = page;

      renderUsers();
    }

    return;
  }

  const invitationPage =
    event.target.closest(
      "[data-invitation-page]"
    );

  if (invitationPage) {
    const page =
      Number(
        invitationPage.dataset
          .invitationPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      userManagementState
        .invitationPage = page;

      renderInvitations();
    }

    return;
  }

  const securityPage =
    event.target.closest(
      "[data-security-page]"
    );

  if (securityPage) {
    const page =
      Number(
        securityPage.dataset
          .securityPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      userManagementState
        .securityPage = page;

      renderSecurityActivity();
    }
  }
}

function handleDocumentChange(event) {
  const userSelection =
    event.target.closest(
      "[data-select-user]"
    );

  if (userSelection) {
    toggleUserSelection(
      userSelection.dataset
        .selectUser,
      userSelection.checked
    );

    return;
  }

  if (
    event.target.matches(
      "[data-select-all-users]"
    )
  ) {
    toggleAllVisibleUsers(
      event.target.checked
    );
  }
}

function togglePasswordVisibility(
  button
) {
  const selector =
    button.dataset.passwordToggle;

  const input =
    document.querySelector(
      selector
    );

  if (!input) {
    return;
  }

  const visible =
    input.type === "text";

  input.type =
    visible
      ? "password"
      : "text";

  button.setAttribute(
    "aria-label",
    visible
      ? "Show password"
      : "Hide password"
  );
}

function bindUserManagementEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const passwordToggle =
        event.target.closest(
          "[data-password-toggle]"
        );

      if (passwordToggle) {
        togglePasswordVisibility(
          passwordToggle
        );

        return;
      }

      handleDocumentClick(event);
    },
    true
  );

  document.addEventListener(
    "change",
    handleDocumentChange,
    true
  );

  userManagementElements
    .refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadUserManagementData({
          showSuccessToast: true
        });
      }
    );

  userManagementElements
    .retryButton
    ?.addEventListener(
      "click",
      () => {
        loadUserManagementData();
      }
    );

  userManagementElements
    .userForm
    ?.addEventListener(
      "submit",
      submitUserForm
    );

  userManagementElements
    .inviteForm
    ?.addEventListener(
      "submit",
      submitInvitationForm
    );

  userManagementElements
    .changeRoleForm
    ?.addEventListener(
      "submit",
      submitChangeRole
    );

  userManagementElements
    .passwordResetForm
    ?.addEventListener(
      "submit",
      submitPasswordReset
    );

  userManagementElements
    .statusForm
    ?.addEventListener(
      "submit",
      submitUserStatus
    );

  userManagementElements
    .bulkRoleForm
    ?.addEventListener(
      "submit",
      submitBulkRole
    );

  userManagementElements
    .userSearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          userManagementState
            .userSearch =
            event.target.value;

          userManagementState
            .userPage = 1;

          renderUsers();
        }
      )
    );

  userManagementElements
    .userRoleFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .userRoleFilter =
          event.target.value;

        userManagementState
          .userPage = 1;

        renderUsers();
      }
    );

  userManagementElements
    .userDepartmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .userDepartmentFilter =
          event.target.value;

        userManagementState
          .userPage = 1;

        renderUsers();
      }
    );

  userManagementElements
    .userStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .userStatusFilter =
          event.target.value;

        userManagementState
          .userPage = 1;

        renderUsers();
      }
    );

  userManagementElements
    .userVerificationFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .userVerificationFilter =
          event.target.value;

        userManagementState
          .userPage = 1;

        renderUsers();
      }
    );

  userManagementElements
    .invitationSearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          userManagementState
            .invitationSearch =
            event.target.value;

          userManagementState
            .invitationPage = 1;

          renderInvitations();
        }
      )
    );

  userManagementElements
    .invitationStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .invitationStatusFilter =
          event.target.value;

        userManagementState
          .invitationPage = 1;

        renderInvitations();
      }
    );

  userManagementElements
    .securitySearch
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          userManagementState
            .securitySearch =
            event.target.value;

          userManagementState
            .securityPage = 1;

          renderSecurityActivity();
        }
      )
    );

  userManagementElements
    .securityTypeFilter
    ?.addEventListener(
      "change",
      (event) => {
        userManagementState
          .securityTypeFilter =
          event.target.value;

        userManagementState
          .securityPage = 1;

        renderSecurityActivity();
      }
    );

  document
    .getElementById(
      "userTemporaryPassword"
    )
    ?.addEventListener(
      "input",
      updatePasswordStrength
    );

  document
    .getElementById(
      "inviteUserMessage"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-invitation-message-count]"
          )
          .textContent =
          String(
            event.target.value.length
          );
      }
    );

  document
    .getElementById(
      "changeRoleReason"
    )
    ?.addEventListener(
      "input",
      (event) => {
        document
          .querySelector(
            "[data-role-change-reason-count]"
          )
          .textContent =
          String(
            event.target.value.length
          );
      }
    );

  userManagementElements
    .passwordResetForm
    ?.querySelectorAll(
      '[name="reset_method"]'
    )
    .forEach((input) => {
      input.addEventListener(
        "change",
        updatePasswordResetMethod
      );
    });
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeUserManagementHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "User Management",

      subtitle:
        "Accounts, roles and access security"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeUserManagementHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeUserManagement() {
  if (
    userManagementState.initialized
  ) {
    return;
  }

  userManagementState.initialized =
    true;

  cacheUserManagementElements();

  if (!ensureAdminAccess()) {
    return;
  }

  bindUserManagementEvents();
  initializeUserManagementHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "users";

  activateUserManagementTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadUserManagementData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:user-management-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    userManagementState
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
    initializeUserManagement
  );
} else {
  initializeUserManagement();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowUserManagement =
  Object.freeze({
    initialize:
      initializeUserManagement,

    refresh:
      loadUserManagementData,

    render:
      renderUserManagementPage,

    activateTab:
      activateUserManagementTab,

    openDetails:
      openUserDetails,

    openEditor:
      openUserEditor,

    openRoleChange:
      openChangeRoleModal,

    openPasswordReset:
      openPasswordResetModal,

    openStatusChange:
      openUserStatusModal,

    resetFilters:
      resetUserFilters,

    clearSelection:
      clearUserSelection,

    exportSecurityActivity,

    getState() {
      return {
        ...userManagementState,

        selectedUserIds:
          Array.from(
            userManagementState
              .selectedUserIds
          ),

        abortController:
          undefined
      };
    }
  });