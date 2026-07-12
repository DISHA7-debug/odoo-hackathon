/* =========================================================
   AssetFlow — Organization Setup Controller
   File: frontend/organization-setup/organization.js

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

const ORGANIZATION_CONFIG = Object.freeze({
  PAGE_SIZE: 8,

  ENDPOINTS: Object.freeze({
    DEPARTMENTS: ["/departments"],

    USERS: [
      "/employees",
      "/users"
    ],

    LOCATIONS: [
      "/locations"
    ]
  }),

  ROLES: Object.freeze({
    Admin: "Administrator",
    AssetManager: "Asset Manager",
    DepartmentHead: "Department Head",
    Employee: "Employee"
  })
});

/* =========================================================
   STATE
   ========================================================= */

const organizationState = {
  departments: [],
  users: [],
  locations: [],

  activeTab: "departments",

  departmentPage: 1,
  userPage: 1,

  departmentSearch: "",
  departmentStatus: "",

  userSearch: "",
  userRole: "",
  userDepartment: "",

  locationSearch: "",

  loading: false,
  initialized: false,
  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const organizationElements = {};

function cacheOrganizationElements() {
  organizationElements.main =
    document.getElementById(
      "organizationMain"
    );

  organizationElements.refreshButton =
    document.querySelector(
      "[data-refresh-organization]"
    );

  organizationElements.retryButton =
    document.querySelector(
      "[data-retry-organization]"
    );

  organizationElements.primaryAddButton =
    document.querySelector(
      "[data-primary-add-action]"
    );

  organizationElements.accessAlert =
    document.getElementById(
      "organizationAccessAlert"
    );

  organizationElements.errorAlert =
    document.getElementById(
      "organizationErrorAlert"
    );

  organizationElements.errorMessage =
    document.getElementById(
      "organizationErrorMessage"
    );

  organizationElements.departmentSearch =
    document.querySelector(
      "[data-department-search]"
    );

  organizationElements.departmentStatusFilter =
    document.querySelector(
      "[data-department-status-filter]"
    );

  organizationElements.departmentTableBody =
    document.getElementById(
      "departmentsTableBody"
    );

  organizationElements.departmentTableContainer =
    organizationElements.departmentTableBody
      ?.closest(".table-container");

  organizationElements.departmentEmptyState =
    document.getElementById(
      "departmentsEmptyState"
    );

  organizationElements.departmentPagination =
    document.querySelector(
      "[data-department-pagination]"
    );

  organizationElements.departmentPaginationSummary =
    document.querySelector(
      "[data-department-pagination-summary]"
    );

  organizationElements.userSearch =
    document.querySelector(
      "[data-user-search]"
    );

  organizationElements.userRoleFilter =
    document.querySelector(
      "[data-user-role-filter]"
    );

  organizationElements.userDepartmentFilter =
    document.querySelector(
      "[data-user-department-filter]"
    );

  organizationElements.userTableBody =
    document.getElementById(
      "organizationUsersTableBody"
    );

  organizationElements.userTableContainer =
    organizationElements.userTableBody
      ?.closest(".table-container");

  organizationElements.userEmptyState =
    document.getElementById(
      "organizationUsersEmptyState"
    );

  organizationElements.userPagination =
    document.querySelector(
      "[data-user-pagination]"
    );

  organizationElements.userPaginationSummary =
    document.querySelector(
      "[data-user-pagination-summary]"
    );

  organizationElements.locationSearch =
    document.querySelector(
      "[data-location-search]"
    );

  organizationElements.locationGrid =
    document.getElementById(
      "organizationLocationGrid"
    );

  organizationElements.locationEmptyState =
    document.getElementById(
      "locationsEmptyState"
    );

  organizationElements.departmentModal =
    document.getElementById(
      "departmentModal"
    );

  organizationElements.departmentForm =
    document.getElementById(
      "departmentForm"
    );

  organizationElements.departmentFormError =
    document.querySelector(
      "[data-department-form-error]"
    );

  organizationElements.departmentSubmitButton =
    document.getElementById(
      "departmentSubmitButton"
    );

  organizationElements.userRoleModal =
    document.getElementById(
      "userRoleModal"
    );

  organizationElements.userRoleForm =
    document.getElementById(
      "userRoleForm"
    );

  organizationElements.userRoleFormError =
    document.querySelector(
      "[data-user-role-form-error]"
    );

  organizationElements.userRoleSubmitButton =
    document.getElementById(
      "userRoleSubmitButton"
    );

  organizationElements.locationModal =
    document.getElementById(
      "locationModal"
    );

  organizationElements.locationForm =
    document.getElementById(
      "locationForm"
    );

  organizationElements.locationFormError =
    document.querySelector(
      "[data-location-form-error]"
    );

  organizationElements.locationSubmitButton =
    document.getElementById(
      "locationSubmitButton"
    );

  organizationElements.roleUserSelect =
    document.getElementById(
      "roleUserId"
    );

  organizationElements.roleSelect =
    document.getElementById(
      "assignedRole"
    );

  organizationElements.roleDepartmentSelect =
    document.getElementById(
      "assignedDepartment"
    );

  organizationElements.departmentHeadSelect =
    document.getElementById(
      "departmentHead"
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

function getInitials(name = "") {
  if (
    window.AssetFlowUtils?.getInitials
  ) {
    return window.AssetFlowUtils.getInitials(
      name
    );
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

function formatDate(value) {
  if (
    window.AssetFlowUtils?.formatDate
  ) {
    return window.AssetFlowUtils.formatDate(
      value
    );
  }

  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN");
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

function normalizeText(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function toBoolean(
  value,
  fallback = true
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
    record?.department_id ??
    record?.user_id ??
    record?.employee_id ??
    record?.location_id ??
    ""
  );
}

function getDepartmentName(
  departmentReference
) {
  if (!departmentReference) {
    return "Unassigned";
  }

  if (
    typeof departmentReference ===
    "object"
  ) {
    return (
      departmentReference.name ||
      "Unassigned"
    );
  }

  const department =
    organizationState.departments.find(
      (item) =>
        String(getRecordId(item)) ===
        String(departmentReference)
    );

  return department?.name ||
    "Unassigned";
}

function getUserName(userReference) {
  if (!userReference) {
    return "Not assigned";
  }

  if (
    typeof userReference === "object"
  ) {
    return (
      userReference.name ||
      "Not assigned"
    );
  }

  const user =
    organizationState.users.find(
      (item) =>
        String(getRecordId(item)) ===
        String(userReference)
    );

  return user?.name ||
    "Not assigned";
}

function getRoleLabel(role = "") {
  return (
    ORGANIZATION_CONFIG.ROLES[role] ||
    role ||
    "Employee"
  );
}

function getRoleClass(role = "") {
  return String(role)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

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

/* =========================================================
   ACCESS CONTROL
   ========================================================= */

function verifyAdministratorAccess() {
  const user = getCurrentUser();

  if (user?.role === "Admin") {
    return true;
  }

  if (
    organizationElements.accessAlert
  ) {
    organizationElements.accessAlert.hidden =
      false;
  }

  document
    .querySelectorAll(
      ".page-section, .page-actions"
    )
    .forEach((element) => {
      element.hidden = true;
    });

  showToast(
    "Administrator access is required.",
    "danger"
  );

  return false;
}

/* =========================================================
   API REQUESTS
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

function getToken() {
  if (
    window.AssetFlowAPI?.getToken
  ) {
    return window.AssetFlowAPI.getToken();
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

  let data = null;

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
  const token = getToken();

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
            body: JSON.stringify(body)
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

  throw lastError ||
    new Error(
      "No supported API endpoint was found."
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

/* =========================================================
   DATA FETCHING
   ========================================================= */

async function fetchDepartments(signal) {
  const response =
    await requestWithFallback(
      ORGANIZATION_CONFIG
        .ENDPOINTS.DEPARTMENTS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    ["departments"]
  );
}

async function fetchUsers(signal) {
  const response =
    await requestWithFallback(
      ORGANIZATION_CONFIG
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
}

async function fetchLocations(signal) {
  try {
    const response =
      await requestWithFallback(
        ORGANIZATION_CONFIG
          .ENDPOINTS.LOCATIONS,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      ["locations"]
    );
  } catch (error) {
    if (
      [404, 405].includes(error.status)
    ) {
      console.warn(
        "Locations endpoint is not available."
      );

      return [];
    }

    throw error;
  }
}

/* =========================================================
   LOADING AND ERROR STATES
   ========================================================= */

function setOrganizationLoading(
  loading
) {
  organizationState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "organization-refreshing",
    organizationState.loading
  );

  if (
    organizationElements.refreshButton
  ) {
    organizationElements.refreshButton.disabled =
      organizationState.loading;

    organizationElements.refreshButton.setAttribute(
      "aria-busy",
      String(organizationState.loading)
    );
  }
}

function showOrganizationError(
  message
) {
  if (
    organizationElements.errorAlert
  ) {
    organizationElements.errorAlert.hidden =
      false;
  }

  if (
    organizationElements.errorMessage
  ) {
    organizationElements.errorMessage.textContent =
      message;
  }
}

function hideOrganizationError() {
  if (
    organizationElements.errorAlert
  ) {
    organizationElements.errorAlert.hidden =
      true;
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {
  const activeUsers =
    organizationState.users.filter(
      (user) =>
        toBoolean(
          user.is_active,
          true
        )
    );

  const departmentHeads =
    organizationState.users.filter(
      (user) =>
        user.role ===
        "DepartmentHead"
    );

  const unassignedUsers =
    organizationState.users.filter(
      (user) =>
        !(
          user.department_id ||
          user.department?.id ||
          user.department
        )
    );

  const summary = {
    departments:
      organizationState.departments.length,

    active_users:
      activeUsers.length,

    department_heads:
      departmentHeads.length,

    unassigned_users:
      unassignedUsers.length
  };

  Object.entries(summary).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-summary-count="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            value.toLocaleString(
              "en-IN"
            );

          element.classList.add(
            "organization-data-enter"
          );
        });
    }
  );

  updateTabCounts();
}

function updateTabCounts() {
  const counts = {
    departments:
      organizationState.departments.length,

    users:
      organizationState.users.length,

    locations:
      organizationState.locations.length
  };

  Object.entries(counts).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-tab-count="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            String(value);
        });
    }
  );
}

/* =========================================================
   DEPARTMENT FILTERING
   ========================================================= */

function getFilteredDepartments() {
  const search =
    normalizeText(
      organizationState
        .departmentSearch
    );

  const status =
    organizationState
      .departmentStatus;

  return organizationState.departments.filter(
    (department) => {
      const searchableText = [
        department.name,
        department.code,
        department.description,
        getUserName(
          department.department_head ||
          department.department_head_id ||
          department.head
        )
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(search);

      const active =
        toBoolean(
          department.is_active,
          true
        );

      const matchesStatus =
        !status ||
        (
          status === "active" &&
          active
        ) ||
        (
          status === "inactive" &&
          !active
        );

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );
}

/* =========================================================
   DEPARTMENT RENDERING
   ========================================================= */

function renderDepartments() {
  const tableBody =
    organizationElements
      .departmentTableBody;

  const tableContainer =
    organizationElements
      .departmentTableContainer;

  const emptyState =
    organizationElements
      .departmentEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const filtered =
    getFilteredDepartments();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
        ORGANIZATION_CONFIG.PAGE_SIZE
      )
    );

  organizationState.departmentPage =
    Math.min(
      organizationState.departmentPage,
      totalPages
    );

  const startIndex =
    (
      organizationState.departmentPage -
      1
    ) *
    ORGANIZATION_CONFIG.PAGE_SIZE;

  const visibleDepartments =
    filtered.slice(
      startIndex,
      startIndex +
      ORGANIZATION_CONFIG.PAGE_SIZE
    );

  if (
    visibleDepartments.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updateDepartmentPagination(
      0,
      0,
      0
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visibleDepartments
      .map((department) => {
        const id =
          getRecordId(department);

        const active =
          toBoolean(
            department.is_active,
            true
          );

        const headReference =
          department.department_head ||
          department.head ||
          department.department_head_id;

        const headName =
          getUserName(headReference);

        const employeeCount =
          toNumber(
            department.employee_count ??
            department.employees_count ??
            department.user_count
          );

        const assetCount =
          toNumber(
            department.asset_count ??
            department.assets_count
          );

        return `
          <tr class="organization-data-enter">
            <td>
              <div class="organization-department">
                <div
                  class="organization-department-icon"
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
                    <path d="M3 21h18"></path>
                    <path d="M6 21V7l6-4 6 4v14"></path>
                    <path d="M9 10h1"></path>
                    <path d="M14 10h1"></path>
                    <path d="M9 14h1"></path>
                    <path d="M14 14h1"></path>
                  </svg>
                </div>

                <div class="organization-department-content">
                  <div class="organization-department-name">
                    ${escapeHTML(
                      department.name ||
                      "Unnamed Department"
                    )}
                  </div>

                  <div class="organization-department-code">
                    ${escapeHTML(
                      department.code ||
                      "No code"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              ${
                headName ===
                "Not assigned"
                  ? `
                    <span class="table-secondary">
                      Not assigned
                    </span>
                  `
                  : `
                    <div class="organization-head">
                      <div
                        class="organization-head-avatar"
                        aria-hidden="true"
                      >
                        ${escapeHTML(
                          getInitials(
                            headName
                          )
                        )}
                      </div>

                      <span class="table-primary">
                        ${escapeHTML(
                          headName
                        )}
                      </span>
                    </div>
                  `
              }
            </td>

            <td>
              <span class="organization-count-cell">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M3 21v-2a6 6 0 0 1 6-6"></path>
                </svg>

                ${employeeCount}
              </span>
            </td>

            <td>
              <span class="organization-count-cell">
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

                ${assetCount}
              </span>
            </td>

            <td>
              <span
                class="badge badge-dot ${
                  active
                    ? "badge-success"
                    : "badge-neutral"
                }"
              >
                ${
                  active
                    ? "Active"
                    : "Inactive"
                }
              </span>
            </td>

            <td class="text-right">
              <div class="organization-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-edit-department="${escapeHTML(
                    id
                  )}"
                  aria-label="Edit ${escapeHTML(
                    department.name ||
                    "department"
                  )}"
                  title="Edit department"
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

                <button
                  type="button"
                  class="btn btn-icon btn-danger-outline"
                  data-delete-department="${escapeHTML(
                    id
                  )}"
                  aria-label="Delete ${escapeHTML(
                    department.name ||
                    "department"
                  )}"
                  title="Delete department"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4h8v2"></path>
                    <path d="M19 6 18 21H6L5 6"></path>
                    <path d="M10 11v5"></path>
                    <path d="M14 11v5"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  updateDepartmentPagination(
    startIndex + 1,
    Math.min(
      startIndex +
      ORGANIZATION_CONFIG.PAGE_SIZE,
      filtered.length
    ),
    filtered.length
  );

  renderPagination(
    organizationElements
      .departmentPagination,
    organizationState.departmentPage,
    totalPages,
    "department"
  );
}

function updateDepartmentPagination(
  start,
  end,
  total
) {
  if (
    organizationElements
      .departmentPaginationSummary
  ) {
    organizationElements
      .departmentPaginationSummary
      .textContent =
        total === 0
          ? "Showing 0 departments"
          : `Showing ${start}–${end} of ${total} departments`;
  }
}

/* =========================================================
   USER FILTERING
   ========================================================= */

function getFilteredUsers() {
  const search =
    normalizeText(
      organizationState.userSearch
    );

  return organizationState.users.filter(
    (user) => {
      const departmentId =
        user.department_id ||
        user.department?.id ||
        "";

      const searchableText = [
        user.name,
        user.email,
        user.role,
        getDepartmentName(
          user.department ||
          departmentId
        )
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchableText.includes(search);

      const matchesRole =
        !organizationState.userRole ||
        user.role ===
          organizationState.userRole;

      const matchesDepartment =
        !organizationState
          .userDepartment ||
        String(departmentId) ===
          String(
            organizationState
              .userDepartment
          );

      return (
        matchesSearch &&
        matchesRole &&
        matchesDepartment
      );
    }
  );
}

/* =========================================================
   USER RENDERING
   ========================================================= */

function renderUsers() {
  const tableBody =
    organizationElements.userTableBody;

  const tableContainer =
    organizationElements
      .userTableContainer;

  const emptyState =
    organizationElements.userEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const filtered =
    getFilteredUsers();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
        ORGANIZATION_CONFIG.PAGE_SIZE
      )
    );

  organizationState.userPage =
    Math.min(
      organizationState.userPage,
      totalPages
    );

  const startIndex =
    (
      organizationState.userPage -
      1
    ) *
    ORGANIZATION_CONFIG.PAGE_SIZE;

  const visibleUsers =
    filtered.slice(
      startIndex,
      startIndex +
      ORGANIZATION_CONFIG.PAGE_SIZE
    );

  if (visibleUsers.length === 0) {
    tableBody.innerHTML = "";
    tableContainer.hidden = true;
    emptyState.hidden = false;

    updateUserPagination(
      0,
      0,
      0
    );

    return;
  }

  tableContainer.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML =
    visibleUsers
      .map((user) => {
        const id =
          getRecordId(user);

        const active =
          toBoolean(
            user.is_active,
            true
          );

        const department =
          getDepartmentName(
            user.department ||
            user.department_id
          );

        const role =
          user.role ||
          "Employee";

        return `
          <tr class="organization-data-enter">
            <td>
              <div class="organization-user">
                <div
                  class="organization-user-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(user.name)
                  )}
                </div>

                <div class="organization-user-content">
                  <div class="organization-user-name">
                    ${escapeHTML(
                      user.name ||
                      "Unnamed User"
                    )}
                  </div>

                  <div class="organization-user-email">
                    ${escapeHTML(
                      user.email ||
                      "No email"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="organization-role-badge ${getRoleClass(
                  role
                )}"
              >
                ${escapeHTML(
                  getRoleLabel(role)
                )}
              </span>
            </td>

            <td>
              <span
                class="${
                  department ===
                  "Unassigned"
                    ? "table-secondary"
                    : "table-primary"
                }"
              >
                ${escapeHTML(department)}
              </span>
            </td>

            <td>
              <span
                class="badge badge-dot ${
                  active
                    ? "badge-success"
                    : "badge-neutral"
                }"
              >
                ${
                  active
                    ? "Active"
                    : "Inactive"
                }
              </span>
            </td>

            <td>
              <span class="table-secondary">
                ${formatDate(
                  user.created_at ||
                  user.joined_at
                )}
              </span>
            </td>

            <td class="text-right">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-edit-user-role="${escapeHTML(
                  id
                )}"
              >
                Manage Access
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  updateUserPagination(
    startIndex + 1,
    Math.min(
      startIndex +
      ORGANIZATION_CONFIG.PAGE_SIZE,
      filtered.length
    ),
    filtered.length
  );

  renderPagination(
    organizationElements
      .userPagination,
    organizationState.userPage,
    totalPages,
    "user"
  );
}

function updateUserPagination(
  start,
  end,
  total
) {
  if (
    organizationElements
      .userPaginationSummary
  ) {
    organizationElements
      .userPaginationSummary
      .textContent =
        total === 0
          ? "Showing 0 users"
          : `Showing ${start}–${end} of ${total} users`;
  }
}

/* =========================================================
   PAGINATION
   ========================================================= */

function renderPagination(
  container,
  currentPage,
  totalPages,
  scope
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
        data-pagination-scope="${scope}"
        data-pagination-page="${page}"
        aria-label="Go to page ${page}"
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
      data-pagination-scope="${scope}"
      data-pagination-page="${
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
      data-pagination-scope="${scope}"
      data-pagination-page="${
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
   LOCATION FILTERING AND RENDERING
   ========================================================= */

function getFilteredLocations() {
  const search =
    normalizeText(
      organizationState.locationSearch
    );

  return organizationState.locations.filter(
    (location) => {
      if (!search) {
        return true;
      }

      return [
        location.name,
        location.code,
        location.type,
        location.address,
        location.city,
        location.postal_code
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    }
  );
}

function renderLocations() {
  const grid =
    organizationElements.locationGrid;

  const emptyState =
    organizationElements
      .locationEmptyState;

  if (!grid || !emptyState) {
    return;
  }

  const locations =
    getFilteredLocations();

  if (locations.length === 0) {
    grid.innerHTML = "";
    grid.hidden = true;
    emptyState.hidden = false;

    return;
  }

  grid.hidden = false;
  emptyState.hidden = true;

  grid.innerHTML =
    locations
      .map((location) => {
        const id =
          getRecordId(location);

        const active =
          toBoolean(
            location.is_active,
            true
          );

        const address = [
          location.address,
          location.city,
          location.postal_code
        ]
          .filter(Boolean)
          .join(", ");

        return `
          <article class="organization-location-card organization-data-enter">
            <div
              class="organization-location-icon"
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
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>
                <circle cx="12" cy="10" r="2.5"></circle>
              </svg>
            </div>

            <div class="organization-location-content">
              <div class="organization-location-header">
                <div>
                  <h3 class="organization-location-name">
                    ${escapeHTML(
                      location.name ||
                      "Unnamed Location"
                    )}
                  </h3>

                  <span class="organization-location-code">
                    ${escapeHTML(
                      location.code ||
                      "NO-CODE"
                    )}
                  </span>
                </div>

                <span
                  class="badge badge-dot ${
                    active
                      ? "badge-success"
                      : "badge-neutral"
                  }"
                >
                  ${
                    active
                      ? "Active"
                      : "Inactive"
                  }
                </span>
              </div>

              <p class="organization-location-address">
                ${escapeHTML(
                  address ||
                  "No address provided"
                )}
              </p>

              <div class="organization-location-meta">
                <span class="badge badge-info">
                  ${escapeHTML(
                    location.type ||
                    "Location"
                  )}
                </span>

                ${
                  location.asset_count !==
                  undefined
                    ? `
                      <span class="badge badge-neutral">
                        ${toNumber(
                          location.asset_count
                        )}
                        assets
                      </span>
                    `
                    : ""
                }
              </div>

              <div class="organization-location-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-edit-location="${escapeHTML(
                    id
                  )}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="btn btn-danger-outline btn-sm"
                  data-delete-location="${escapeHTML(
                    id
                  )}"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function populateDepartmentOptions() {
  const departmentOptions =
    organizationState.departments
      .filter((department) =>
        toBoolean(
          department.is_active,
          true
        )
      )
      .map((department) => `
        <option value="${escapeHTML(
          getRecordId(department)
        )}">
          ${escapeHTML(
            department.name ||
            "Unnamed Department"
          )}
        </option>
      `)
      .join("");

  if (
    organizationElements
      .userDepartmentFilter
  ) {
    const selectedValue =
      organizationElements
        .userDepartmentFilter
        .value;

    organizationElements
      .userDepartmentFilter
      .innerHTML = `
        <option value="">
          All departments
        </option>

        ${departmentOptions}
      `;

    organizationElements
      .userDepartmentFilter
      .value = selectedValue;
  }

  if (
    organizationElements
      .roleDepartmentSelect
  ) {
    const selectedValue =
      organizationElements
        .roleDepartmentSelect
        .value;

    organizationElements
      .roleDepartmentSelect
      .innerHTML = `
        <option value="">
          No department
        </option>

        ${departmentOptions}
      `;

    organizationElements
      .roleDepartmentSelect
      .value = selectedValue;
  }
}

function populateUserOptions() {
  const userOptions =
    organizationState.users
      .map((user) => `
        <option value="${escapeHTML(
          getRecordId(user)
        )}">
          ${escapeHTML(
            user.name ||
            "Unnamed User"
          )}
          ${
            user.email
              ? `— ${escapeHTML(
                  user.email
                )}`
              : ""
          }
        </option>
      `)
      .join("");

  if (
    organizationElements
      .roleUserSelect
  ) {
    const selectedValue =
      organizationElements
        .roleUserSelect
        .value;

    organizationElements
      .roleUserSelect
      .innerHTML = `
        <option value="">
          Select a user
        </option>

        ${userOptions}
      `;

    organizationElements
      .roleUserSelect
      .value = selectedValue;
  }

  if (
    organizationElements
      .departmentHeadSelect
  ) {
    const selectedValue =
      organizationElements
        .departmentHeadSelect
        .value;

    organizationElements
      .departmentHeadSelect
      .innerHTML = `
        <option value="">
          Select department head
        </option>

        ${userOptions}
      `;

    organizationElements
      .departmentHeadSelect
      .value = selectedValue;
  }
}

/* =========================================================
   TAB MANAGEMENT
   ========================================================= */

function activateOrganizationTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "departments",
    "users",
    "locations"
  ];

  if (!validTabs.includes(tabName)) {
    tabName = "departments";
  }

  organizationState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-organization-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .organizationTab ===
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
      "[data-organization-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .organizationPanel ===
        tabName;

      panel.classList.toggle(
        "active",
        active
      );

      panel.hidden = !active;
    });

  updatePrimaryAction();

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

function updatePrimaryAction() {
  const button =
    organizationElements
      .primaryAddButton;

  if (!button) {
    return;
  }

  const configurations = {
    departments: {
      label: "Add Department",
      modal: "#departmentModal"
    },

    users: {
      label: "Assign Role",
      modal: "#userRoleModal"
    },

    locations: {
      label: "Add Location",
      modal: "#locationModal"
    }
  };

  const configuration =
    configurations[
      organizationState.activeTab
    ];

  button.dataset.modalOpen =
    configuration.modal;

  const textNode =
    Array.from(
      button.childNodes
    ).find(
      (node) =>
        node.nodeType ===
        Node.TEXT_NODE &&
        node.textContent.trim()
    );

  if (textNode) {
    textNode.textContent =
      ` ${configuration.label}`;
  }
}

/* =========================================================
   FORM ERROR HELPERS
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
  const fieldApplied =
    window.AssetFlowUtils
      ?.applyApiFieldError?.(
        form,
        error
      );

  if (!fieldApplied) {
    showFormError(
      errorContainer,
      error?.message ||
      "Unable to save changes."
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
    if (
      field.type === "checkbox"
        ? !field.checked
        : !String(field.value).trim()
    ) {
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
   DEPARTMENT FORM
   ========================================================= */

function resetDepartmentForm() {
  const form =
    organizationElements.departmentForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "departmentId"
  ).value = "";

  document.getElementById(
    "departmentActive"
  ).checked = true;

  document
    .querySelector(
      "[data-department-modal-title]"
    )
    .textContent =
      "Add Department";

  organizationElements
    .departmentSubmitButton
    .textContent =
      "Save Department";

  const counter =
    document.querySelector(
      "[data-department-description-count]"
    );

  if (counter) {
    counter.textContent = "0";
  }

  clearFormState(
    form,
    organizationElements
      .departmentFormError
  );
}

function openDepartmentEditor(id) {
  const department =
    organizationState.departments.find(
      (item) =>
        String(getRecordId(item)) ===
        String(id)
    );

  if (!department) {
    showToast(
      "Department could not be found.",
      "danger"
    );

    return;
  }

  resetDepartmentForm();

  document.getElementById(
    "departmentId"
  ).value =
    getRecordId(department);

  document.getElementById(
    "departmentName"
  ).value =
    department.name || "";

  document.getElementById(
    "departmentCode"
  ).value =
    department.code || "";

  document.getElementById(
    "departmentDescription"
  ).value =
    department.description || "";

  document.getElementById(
    "departmentHead"
  ).value =
    department.department_head_id ||
    department.department_head?.id ||
    department.head?.id ||
    "";

  document.getElementById(
    "departmentActive"
  ).checked =
    toBoolean(
      department.is_active,
      true
    );

  document
    .querySelector(
      "[data-department-modal-title]"
    )
    .textContent =
      "Edit Department";

  organizationElements
    .departmentSubmitButton
    .textContent =
      "Update Department";

  const counter =
    document.querySelector(
      "[data-department-description-count]"
    );

  if (counter) {
    counter.textContent =
      String(
        (
          department.description ||
          ""
        ).length
      );
  }

  openModal(
    organizationElements
      .departmentModal
  );
}

async function submitDepartmentForm(
  event
) {
  event.preventDefault();

  const form =
    organizationElements.departmentForm;

  clearFormState(
    form,
    organizationElements
      .departmentFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const id =
    document.getElementById(
      "departmentId"
    ).value;

  const payload = {
    name:
      document.getElementById(
        "departmentName"
      ).value.trim(),

    code:
      document.getElementById(
        "departmentCode"
      ).value
        .trim()
        .toUpperCase(),

    description:
      document.getElementById(
        "departmentDescription"
      ).value.trim() || null,

    department_head_id:
      document.getElementById(
        "departmentHead"
      ).value || null,

    is_active:
      document.getElementById(
        "departmentActive"
      ).checked
  };

  setButtonLoading(
    organizationElements
      .departmentSubmitButton,
    true,
    id
      ? "Updating..."
      : "Creating..."
  );

  try {
    if (id) {
      await apiRequest(
        `/departments/${encodeURIComponent(
          id
        )}`,
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await apiRequest(
        "/departments",
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      organizationElements
        .departmentModal
    );

    showToast(
      id
        ? "Department updated successfully."
        : "Department created successfully.",
      "success"
    );

    await loadOrganizationData();
  } catch (error) {
    applyFormError(
      form,
      organizationElements
        .departmentFormError,
      error
    );
  } finally {
    setButtonLoading(
      organizationElements
        .departmentSubmitButton,
      false
    );
  }
}

async function deleteDepartment(id) {
  const department =
    organizationState.departments.find(
      (item) =>
        String(getRecordId(item)) ===
        String(id)
    );

  if (!department) {
    return;
  }

  const confirmed =
    await window.AssetFlowUtils
      ?.confirmAction?.({
        title: "Delete department",
        message:
          `Delete “${department.name}”? ` +
          "Departments with assigned users or assets may not be removable.",
        confirmText: "Delete",
        type: "danger"
      });

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/departments/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE"
      }
    );

    showToast(
      "Department deleted successfully.",
      "success"
    );

    await loadOrganizationData();
  } catch (error) {
    showToast(
      error.message ||
      "Unable to delete department.",
      "danger"
    );
  }
}

/* =========================================================
   USER ROLE FORM
   ========================================================= */

const ROLE_DESCRIPTIONS =
  Object.freeze({
    Admin: {
      title:
        "Administrator permissions",

      description:
        "Administrators manage departments, users, roles, audits and organization-wide reporting."
    },

    AssetManager: {
      title:
        "Asset Manager permissions",

      description:
        "Asset Managers register and allocate assets, approve transfers, maintenance and returns."
    },

    DepartmentHead: {
      title:
        "Department Head permissions",

      description:
        "Department Heads manage departmental asset requests and shared resource bookings."
    },

    Employee: {
      title:
        "Employee permissions",

      description:
        "Employees view assigned assets, book resources, request transfers and raise maintenance requests."
    }
  });

function updateRolePreview() {
  const role =
    organizationElements
      .roleSelect?.value ||
    "Employee";

  const details =
    ROLE_DESCRIPTIONS[role] ||
    ROLE_DESCRIPTIONS.Employee;

  const title =
    document.querySelector(
      "[data-permission-preview-title]"
    );

  const description =
    document.querySelector(
      "[data-permission-preview-description]"
    );

  if (title) {
    title.textContent =
      details.title;
  }

  if (description) {
    description.textContent =
      details.description;
  }
}

function resetUserRoleForm() {
  const form =
    organizationElements.userRoleForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "assignedUserActive"
  ).checked = true;

  clearFormState(
    form,
    organizationElements
      .userRoleFormError
  );

  updateRolePreview();
}

function openUserRoleEditor(id) {
  const user =
    organizationState.users.find(
      (item) =>
        String(getRecordId(item)) ===
        String(id)
    );

  if (!user) {
    showToast(
      "User could not be found.",
      "danger"
    );

    return;
  }

  resetUserRoleForm();

  organizationElements
    .roleUserSelect
    .value =
      getRecordId(user);

  organizationElements
    .roleSelect
    .value =
      user.role || "Employee";

  organizationElements
    .roleDepartmentSelect
    .value =
      user.department_id ||
      user.department?.id ||
      "";

  document.getElementById(
    "assignedUserActive"
  ).checked =
    toBoolean(
      user.is_active,
      true
    );

  updateRolePreview();

  openModal(
    organizationElements
      .userRoleModal
  );
}

async function updateUserRole(
  userId,
  payload
) {
  const encodedId =
    encodeURIComponent(userId);

  const roleEndpoints = [
    `/employees/${encodedId}/role`,
    `/users/${encodedId}/role`,
    `/employees/${encodedId}`,
    `/users/${encodedId}`
  ];

  return requestWithFallback(
    roleEndpoints,
    {
      method: "PATCH",
      body: payload
    }
  );
}

async function submitUserRoleForm(
  event
) {
  event.preventDefault();

  const form =
    organizationElements.userRoleForm;

  clearFormState(
    form,
    organizationElements
      .userRoleFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const userId =
    organizationElements
      .roleUserSelect.value;

  const payload = {
    role:
      organizationElements
        .roleSelect.value,

    department_id:
      organizationElements
        .roleDepartmentSelect
        .value || null,

    is_active:
      document.getElementById(
        "assignedUserActive"
      ).checked
  };

  setButtonLoading(
    organizationElements
      .userRoleSubmitButton,
    true,
    "Saving..."
  );

  try {
    await updateUserRole(
      userId,
      payload
    );

    closeModal(
      organizationElements
        .userRoleModal
    );

    showToast(
      "User access updated successfully.",
      "success"
    );

    await loadOrganizationData();
  } catch (error) {
    applyFormError(
      form,
      organizationElements
        .userRoleFormError,
      error
    );
  } finally {
    setButtonLoading(
      organizationElements
        .userRoleSubmitButton,
      false
    );
  }
}

/* =========================================================
   LOCATION FORM
   ========================================================= */

function resetLocationForm() {
  const form =
    organizationElements.locationForm;

  if (!form) {
    return;
  }

  form.reset();

  document.getElementById(
    "locationId"
  ).value = "";

  document.getElementById(
    "locationActive"
  ).checked = true;

  document
    .querySelector(
      "[data-location-modal-title]"
    )
    .textContent =
      "Add Location";

  organizationElements
    .locationSubmitButton
    .textContent =
      "Save Location";

  clearFormState(
    form,
    organizationElements
      .locationFormError
  );
}

function openLocationEditor(id) {
  const location =
    organizationState.locations.find(
      (item) =>
        String(getRecordId(item)) ===
        String(id)
    );

  if (!location) {
    showToast(
      "Location could not be found.",
      "danger"
    );

    return;
  }

  resetLocationForm();

  document.getElementById(
    "locationId"
  ).value =
    getRecordId(location);

  document.getElementById(
    "locationName"
  ).value =
    location.name || "";

  document.getElementById(
    "locationCode"
  ).value =
    location.code || "";

  document.getElementById(
    "locationType"
  ).value =
    location.type || "";

  document.getElementById(
    "locationAddress"
  ).value =
    location.address || "";

  document.getElementById(
    "locationCity"
  ).value =
    location.city || "";

  document.getElementById(
    "locationPostalCode"
  ).value =
    location.postal_code || "";

  document.getElementById(
    "locationActive"
  ).checked =
    toBoolean(
      location.is_active,
      true
    );

  document
    .querySelector(
      "[data-location-modal-title]"
    )
    .textContent =
      "Edit Location";

  organizationElements
    .locationSubmitButton
    .textContent =
      "Update Location";

  openModal(
    organizationElements
      .locationModal
  );
}

async function submitLocationForm(
  event
) {
  event.preventDefault();

  const form =
    organizationElements.locationForm;

  clearFormState(
    form,
    organizationElements
      .locationFormError
  );

  if (!validateRequiredFields(form)) {
    return;
  }

  const id =
    document.getElementById(
      "locationId"
    ).value;

  const payload = {
    name:
      document.getElementById(
        "locationName"
      ).value.trim(),

    code:
      document.getElementById(
        "locationCode"
      ).value
        .trim()
        .toUpperCase(),

    type:
      document.getElementById(
        "locationType"
      ).value,

    address:
      document.getElementById(
        "locationAddress"
      ).value.trim(),

    city:
      document.getElementById(
        "locationCity"
      ).value.trim() || null,

    postal_code:
      document.getElementById(
        "locationPostalCode"
      ).value.trim() || null,

    is_active:
      document.getElementById(
        "locationActive"
      ).checked
  };

  setButtonLoading(
    organizationElements
      .locationSubmitButton,
    true,
    id
      ? "Updating..."
      : "Creating..."
  );

  try {
    if (id) {
      await apiRequest(
        `/locations/${encodeURIComponent(
          id
        )}`,
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await apiRequest(
        "/locations",
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      organizationElements
        .locationModal
    );

    showToast(
      id
        ? "Location updated successfully."
        : "Location created successfully.",
      "success"
    );

    await loadOrganizationData();
  } catch (error) {
    applyFormError(
      form,
      organizationElements
        .locationFormError,
      error
    );
  } finally {
    setButtonLoading(
      organizationElements
        .locationSubmitButton,
      false
    );
  }
}

async function deleteLocation(id) {
  const location =
    organizationState.locations.find(
      (item) =>
        String(getRecordId(item)) ===
        String(id)
    );

  if (!location) {
    return;
  }

  const confirmed =
    await window.AssetFlowUtils
      ?.confirmAction?.({
        title: "Delete location",
        message:
          `Delete “${location.name}”? ` +
          "Locations containing assets may not be removable.",
        confirmText: "Delete",
        type: "danger"
      });

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/locations/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE"
      }
    );

    showToast(
      "Location deleted successfully.",
      "success"
    );

    await loadOrganizationData();
  } catch (error) {
    showToast(
      error.message ||
      "Unable to delete location.",
      "danger"
    );
  }
}

/* =========================================================
   COMPLETE RENDER
   ========================================================= */

function renderOrganization() {
  renderSummary();

  populateDepartmentOptions();
  populateUserOptions();

  renderDepartments();
  renderUsers();
  renderLocations();
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadOrganizationData({
  showSuccessToast = false
} = {}) {
  if (organizationState.loading) {
    return;
  }

  organizationState.abortController
    ?.abort();

  organizationState.abortController =
    new AbortController();

  const signal =
    organizationState
      .abortController.signal;

  setOrganizationLoading(true);
  hideOrganizationError();

  try {
    const [
      departmentResult,
      userResult,
      locationResult
    ] = await Promise.allSettled([
      fetchDepartments(signal),
      fetchUsers(signal),
      fetchLocations(signal)
    ]);

    if (
      departmentResult.status ===
      "rejected"
    ) {
      throw departmentResult.reason;
    }

    if (
      userResult.status ===
      "rejected"
    ) {
      throw userResult.reason;
    }

    organizationState.departments =
      departmentResult.value;

    organizationState.users =
      userResult.value;

    organizationState.locations =
      locationResult.status ===
      "fulfilled"
        ? locationResult.value
        : [];

    renderOrganization();

    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Organization data refreshed.",
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
      "Organization data loading failed:",
      error
    );

    showOrganizationError(
      error?.message ||
      "Unable to load organization data."
    );

    showToast(
      error?.message ||
      "Unable to load organization data.",
      "danger"
    );
  } finally {
    setOrganizationLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-organization-last-updated]"
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
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-organization-tab]"
    );

  if (tab) {
    activateOrganizationTab(
      tab.dataset.organizationTab
    );

    return;
  }

  const paginationButton =
    event.target.closest(
      "[data-pagination-page]"
    );

  if (paginationButton) {
    const page =
      Number(
        paginationButton.dataset
          .paginationPage
      );

    const scope =
      paginationButton.dataset
        .paginationScope;

    if (
      !Number.isFinite(page) ||
      page < 1
    ) {
      return;
    }

    if (scope === "department") {
      organizationState.departmentPage =
        page;

      renderDepartments();
    }

    if (scope === "user") {
      organizationState.userPage =
        page;

      renderUsers();
    }

    return;
  }

  const editDepartment =
    event.target.closest(
      "[data-edit-department]"
    );

  if (editDepartment) {
    openDepartmentEditor(
      editDepartment.dataset
        .editDepartment
    );

    return;
  }

  const deleteDepartmentButton =
    event.target.closest(
      "[data-delete-department]"
    );

  if (deleteDepartmentButton) {
    deleteDepartment(
      deleteDepartmentButton.dataset
        .deleteDepartment
    );

    return;
  }

  const editUser =
    event.target.closest(
      "[data-edit-user-role]"
    );

  if (editUser) {
    openUserRoleEditor(
      editUser.dataset
        .editUserRole
    );

    return;
  }

  const editLocation =
    event.target.closest(
      "[data-edit-location]"
    );

  if (editLocation) {
    openLocationEditor(
      editLocation.dataset
        .editLocation
    );

    return;
  }

  const deleteLocationButton =
    event.target.closest(
      "[data-delete-location]"
    );

  if (deleteLocationButton) {
    deleteLocation(
      deleteLocationButton.dataset
        .deleteLocation
    );
  }
}

function handleAddButtonClick(event) {
  const button =
    event.target.closest(
      [
        "[data-add-department]",
        "[data-add-location]",
        "[data-assign-user-role]",
        "[data-primary-add-action]",
        '#departmentsEmptyState [data-modal-open="#departmentModal"]',
        '#locationsEmptyState [data-modal-open="#locationModal"]'
      ].join(",")
    );

  if (!button) {
    return;
  }

  const target =
    button.dataset.modalOpen;

  if (
    target === "#departmentModal"
  ) {
    resetDepartmentForm();
  }

  if (
    target === "#userRoleModal"
  ) {
    resetUserRoleForm();
  }

  if (
    target === "#locationModal"
  ) {
    resetLocationForm();
  }
}

function bindOrganizationEvents() {
  document.addEventListener(
    "click",
    handleAddButtonClick,
    true
  );

  document.addEventListener(
    "click",
    handleDocumentClick
  );

  organizationElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadOrganizationData({
          showSuccessToast: true
        });
      }
    );

  organizationElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadOrganizationData();
      }
    );

  organizationElements.departmentForm
    ?.addEventListener(
      "submit",
      submitDepartmentForm
    );

  organizationElements.userRoleForm
    ?.addEventListener(
      "submit",
      submitUserRoleForm
    );

  organizationElements.locationForm
    ?.addEventListener(
      "submit",
      submitLocationForm
    );

  organizationElements.roleSelect
    ?.addEventListener(
      "change",
      updateRolePreview
    );

  organizationElements.departmentSearch
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            organizationState.departmentSearch =
              event.target.value;

            organizationState.departmentPage =
              1;

            renderDepartments();
          },
          250
        ) ||
        ((event) => {
          organizationState.departmentSearch =
            event.target.value;

          renderDepartments();
        })
    );

  organizationElements.departmentStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        organizationState.departmentStatus =
          event.target.value;

        organizationState.departmentPage =
          1;

        renderDepartments();
      }
    );

  organizationElements.userSearch
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            organizationState.userSearch =
              event.target.value;

            organizationState.userPage =
              1;

            renderUsers();
          },
          250
        ) ||
        ((event) => {
          organizationState.userSearch =
            event.target.value;

          renderUsers();
        })
    );

  organizationElements.userRoleFilter
    ?.addEventListener(
      "change",
      (event) => {
        organizationState.userRole =
          event.target.value;

        organizationState.userPage =
          1;

        renderUsers();
      }
    );

  organizationElements.userDepartmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        organizationState.userDepartment =
          event.target.value;

        organizationState.userPage =
          1;

        renderUsers();
      }
    );

  organizationElements.locationSearch
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            organizationState.locationSearch =
              event.target.value;

            renderLocations();
          },
          250
        ) ||
        ((event) => {
          organizationState.locationSearch =
            event.target.value;

          renderLocations();
        })
    );

  document
    .getElementById(
      "departmentDescription"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-department-description-count]"
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
   PAGE HEADER
   ========================================================= */

function initializeOrganizationHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title: "Organization Setup",
      subtitle:
        "Manage departments, users and locations"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeOrganizationHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeOrganization() {
  if (
    organizationState.initialized
  ) {
    return;
  }

  organizationState.initialized =
    true;

  cacheOrganizationElements();

  if (!verifyAdministratorAccess()) {
    return;
  }

  bindOrganizationEvents();
  initializeOrganizationHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "departments";

  activateOrganizationTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadOrganizationData();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:organization-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    organizationState.abortController
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
    initializeOrganization
  );
} else {
  initializeOrganization();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowOrganization =
  Object.freeze({
    initialize:
      initializeOrganization,

    refresh:
      loadOrganizationData,

    activateTab:
      activateOrganizationTab,

    renderDepartments,
    renderUsers,
    renderLocations,

    openDepartmentEditor,
    openUserRoleEditor,
    openLocationEditor,

    getState() {
      return {
        ...organizationState,
        abortController: undefined
      };
    }
  });