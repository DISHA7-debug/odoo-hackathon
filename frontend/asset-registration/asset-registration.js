/* =========================================================
   AssetFlow — Asset Registration Controller
   File: frontend/asset-registration/asset-registration.js

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

const ASSET_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  EDIT_ROLES: Object.freeze([
    "Admin",
    "AssetManager"
  ]),

  ENDPOINTS: Object.freeze({
    ASSETS: [
      "/assets"
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
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const assetState = {
  assets: [],
  categories: [],
  departments: [],
  locations: [],
  users: [],

  filteredAssets: [],

  search: "",
  status: "",
  category: "",
  department: "",
  location: "",

  sortField: "name",
  sortDirection: "asc",

  activeView: "table",
  currentPage: 1,

  selectedAssetId: null,

  loading: false,
  initialized: false,
  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const assetElements = {};

function cacheAssetElements() {
  assetElements.main =
    document.getElementById(
      "assetDirectoryMain"
    );

  assetElements.errorAlert =
    document.getElementById(
      "assetPageErrorAlert"
    );

  assetElements.errorMessage =
    document.getElementById(
      "assetPageErrorMessage"
    );

  assetElements.retryButton =
    document.querySelector(
      "[data-retry-assets]"
    );

  assetElements.exportButton =
    document.querySelector(
      "[data-export-assets]"
    );

  assetElements.searchInput =
    document.querySelector(
      "[data-asset-search]"
    );

  assetElements.statusFilter =
    document.querySelector(
      "[data-asset-status-filter]"
    );

  assetElements.categoryFilter =
    document.querySelector(
      "[data-asset-category-filter]"
    );

  assetElements.departmentFilter =
    document.querySelector(
      "[data-asset-department-filter]"
    );

  assetElements.locationFilter =
    document.querySelector(
      "[data-asset-location-filter]"
    );

  assetElements.activeFilters =
    document.getElementById(
      "assetActiveFilters"
    );

  assetElements.filterChips =
    document.querySelector(
      "[data-asset-filter-chips]"
    );

  assetElements.tableView =
    document.querySelector(
      '[data-asset-view-panel="table"]'
    );

  assetElements.gridView =
    document.querySelector(
      '[data-asset-view-panel="grid"]'
    );

  assetElements.tableBody =
    document.getElementById(
      "assetTableBody"
    );

  assetElements.tableContainer =
    assetElements.tableBody
      ?.closest(".table-container");

  assetElements.grid =
    document.getElementById(
      "assetGrid"
    );

  assetElements.emptyState =
    document.getElementById(
      "assetEmptyState"
    );

  assetElements.pagination =
    document.querySelector(
      "[data-asset-pagination]"
    );

  assetElements.paginationSummary =
    document.querySelector(
      "[data-asset-pagination-summary]"
    );

  assetElements.formModal =
    document.getElementById(
      "assetFormModal"
    );

  assetElements.form =
    document.getElementById(
      "assetForm"
    );

  assetElements.formError =
    document.querySelector(
      "[data-asset-form-error]"
    );

  assetElements.formSubmitButton =
    document.getElementById(
      "assetFormSubmitButton"
    );

  assetElements.detailsModal =
    document.getElementById(
      "assetDetailsModal"
    );

  assetElements.categorySelect =
    document.getElementById(
      "assetCategory"
    );

  assetElements.departmentSelect =
    document.getElementById(
      "assetDepartment"
    );

  assetElements.locationSelect =
    document.getElementById(
      "assetLocation"
    );

  assetElements.custodianSelect =
    document.getElementById(
      "assetCustodian"
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

function statusLabel(value = "") {
  const normalized =
    normalizeStatus(value);

  const labels = {
    available: "Available",
    allocated: "Allocated",
    reserved: "Reserved",
    "under maintenance":
      "Under Maintenance",
    lost: "Lost",
    retired: "Retired",
    disposed: "Disposed"
  };

  return (
    labels[normalized] ||
    String(value || "Unknown")
  );
}

function statusBadgeClass(value = "") {
  const normalized =
    normalizeStatus(value);

  const classes = {
    available: "badge-success",
    allocated: "badge-info",
    reserved: "badge-primary",
    "under maintenance":
      "badge-warning",
    lost: "badge-danger",
    retired: "badge-neutral",
    disposed: "badge-neutral"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function statusAccentColor(value = "") {
  const normalized =
    normalizeStatus(value);

  const colors = {
    available:
      "var(--color-success)",

    allocated:
      "var(--color-info)",

    reserved:
      "var(--color-primary)",

    "under maintenance":
      "var(--color-warning)",

    lost:
      "var(--color-danger)",

    retired:
      "var(--color-neutral-500)",

    disposed:
      "var(--color-neutral-400)"
  };

  return (
    colors[normalized] ||
    "var(--color-primary)"
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

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }
  ).format(amount);
}

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
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
    "inactive"
  ].includes(
    normalizeText(value)
  );
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

function getRecordId(record) {
  return (
    record?.id ??
    record?.asset_id ??
    record?.category_id ??
    record?.department_id ??
    record?.location_id ??
    record?.employee_id ??
    record?.user_id ??
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

function canManageAssets() {
  return ASSET_CONFIG
    .EDIT_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function enforceAssetPermissions() {
  const allowed =
    canManageAssets();

  document
    .querySelectorAll(
      '[data-roles="Admin,AssetManager"]'
    )
    .forEach((element) => {
      element.hidden = !allowed;
    });

  return allowed;
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

async function fetchAssets(signal) {
  const response =
    await requestWithFallback(
      ASSET_CONFIG.ENDPOINTS.ASSETS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    ["assets"]
  );
}

async function fetchCategories(signal) {
  try {
    const response =
      await requestWithFallback(
        ASSET_CONFIG
          .ENDPOINTS.CATEGORIES,
        {
          signal
        }
      );

    return unwrapCollection(
      response,
      [
        "categories",
        "asset_categories"
      ]
    );
  } catch (error) {
    if (
      [404, 405].includes(error.status)
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
        ASSET_CONFIG
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
      [404, 405].includes(error.status)
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchLocations(signal) {
  try {
    const response =
      await requestWithFallback(
        ASSET_CONFIG
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
      return [];
    }

    throw error;
  }
}

async function fetchUsers(signal) {
  try {
    const response =
      await requestWithFallback(
        ASSET_CONFIG.ENDPOINTS.USERS,
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
      [404, 405].includes(error.status)
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchAssetById(
  assetId,
  signal
) {
  const encodedId =
    encodeURIComponent(assetId);

  const response =
    await requestWithFallback(
      [
        `/assets/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

async function fetchAssetActivity(
  assetId,
  signal
) {
  const encodedId =
    encodeURIComponent(assetId);

  try {
    const response =
      await requestWithFallback(
        [
          `/assets/${encodedId}/activity`,
          `/assets/${encodedId}/history`,
          `/activity-logs?entity_type=Asset&entity_id=${encodedId}`
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
      [404, 405].includes(error.status)
    ) {
      return [];
    }

    throw error;
  }
}

/* =========================================================
   ASSET VALUE RESOLVERS
   ========================================================= */

function getCategoryReference(asset) {
  return (
    asset.category ||
    asset.asset_category ||
    asset.category_id
  );
}

function getCategoryName(asset) {
  const reference =
    getCategoryReference(asset);

  if (!reference) {
    return "Uncategorized";
  }

  if (typeof reference === "object") {
    return (
      reference.name ||
      reference.category_name ||
      "Uncategorized"
    );
  }

  const category =
    assetState.categories.find(
      (item) =>
        String(getRecordId(item)) ===
        String(reference)
    );

  return (
    category?.name ||
    asset.category_name ||
    "Uncategorized"
  );
}

function getCategoryId(asset) {
  const reference =
    getCategoryReference(asset);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return (
    reference ||
    asset.category_id ||
    ""
  );
}

function getDepartmentReference(asset) {
  return (
    asset.department ||
    asset.owner_department ||
    asset.department_id
  );
}

function getDepartmentName(asset) {
  const reference =
    getDepartmentReference(asset);

  if (!reference) {
    return "Unassigned";
  }

  if (typeof reference === "object") {
    return (
      reference.name ||
      "Unassigned"
    );
  }

  const department =
    assetState.departments.find(
      (item) =>
        String(getRecordId(item)) ===
        String(reference)
    );

  return (
    department?.name ||
    asset.department_name ||
    "Unassigned"
  );
}

function getDepartmentId(asset) {
  const reference =
    getDepartmentReference(asset);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getLocationReference(asset) {
  return (
    asset.location ||
    asset.current_location ||
    asset.location_id
  );
}

function getLocationName(asset) {
  const reference =
    getLocationReference(asset);

  if (!reference) {
    return "Location not set";
  }

  if (typeof reference === "object") {
    return (
      reference.name ||
      "Location not set"
    );
  }

  const location =
    assetState.locations.find(
      (item) =>
        String(getRecordId(item)) ===
        String(reference)
    );

  return (
    location?.name ||
    asset.location_name ||
    "Location not set"
  );
}

function getLocationId(asset) {
  const reference =
    getLocationReference(asset);

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

function getHolderReference(asset) {
  return (
    asset.current_holder ||
    asset.holder ||
    asset.allocated_to ||
    asset.allocated_user ||
    asset.employee ||
    null
  );
}

function getHolderName(asset) {
  const reference =
    getHolderReference(asset);

  if (!reference) {
    return "Not allocated";
  }

  if (typeof reference === "object") {
    return (
      reference.name ||
      reference.full_name ||
      "Not allocated"
    );
  }

  const user =
    assetState.users.find(
      (item) =>
        String(getRecordId(item)) ===
        String(reference)
    );

  return (
    user?.name ||
    asset.holder_name ||
    asset.employee_name ||
    "Not allocated"
  );
}

function getCustodianId(asset) {
  const reference =
    asset.custodian ||
    asset.custodian_id;

  if (
    typeof reference === "object"
  ) {
    return getRecordId(reference);
  }

  return reference || "";
}

/* =========================================================
   LOADING AND ERROR STATES
   ========================================================= */

function setAssetLoading(loading) {
  assetState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "asset-page-loading",
    assetState.loading
  );

  if (assetElements.exportButton) {
    assetElements.exportButton.disabled =
      assetState.loading;
  }
}

function showPageError(message) {
  if (assetElements.errorAlert) {
    assetElements.errorAlert.hidden =
      false;
  }

  if (assetElements.errorMessage) {
    assetElements.errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (assetElements.errorAlert) {
    assetElements.errorAlert.hidden =
      true;
  }
}

/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function buildOptions(
  items,
  {
    selectedValue = "",
    placeholder = "Select an option"
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

        const selected =
          String(id) ===
          String(selectedValue);

        return `
          <option
            value="${escapeHTML(id)}"
            ${selected ? "selected" : ""}
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

function populateReferenceOptions() {
  const activeCategories =
    assetState.categories.filter(
      (category) =>
        toBoolean(
          category.is_active,
          true
        )
    );

  const activeDepartments =
    assetState.departments.filter(
      (department) =>
        toBoolean(
          department.is_active,
          true
        )
    );

  const activeLocations =
    assetState.locations.filter(
      (location) =>
        toBoolean(
          location.is_active,
          true
        )
    );

  const activeUsers =
    assetState.users.filter(
      (user) =>
        toBoolean(
          user.is_active,
          true
        )
    );

  if (assetElements.categoryFilter) {
    const value =
      assetElements
        .categoryFilter.value;

    assetElements
      .categoryFilter.innerHTML =
      buildOptions(
        activeCategories,
        {
          selectedValue: value,
          placeholder:
            "All categories"
        }
      );
  }

  if (assetElements.departmentFilter) {
    const value =
      assetElements
        .departmentFilter.value;

    assetElements
      .departmentFilter.innerHTML =
      buildOptions(
        activeDepartments,
        {
          selectedValue: value,
          placeholder:
            "All departments"
        }
      );
  }

  if (assetElements.locationFilter) {
    const value =
      assetElements
        .locationFilter.value;

    assetElements
      .locationFilter.innerHTML =
      buildOptions(
        activeLocations,
        {
          selectedValue: value,
          placeholder:
            "All locations"
        }
      );
  }

  if (assetElements.categorySelect) {
    assetElements
      .categorySelect.innerHTML =
      buildOptions(
        activeCategories,
        {
          placeholder:
            "Select category"
        }
      );
  }

  if (assetElements.departmentSelect) {
    assetElements
      .departmentSelect.innerHTML =
      buildOptions(
        activeDepartments,
        {
          placeholder:
            "Select department"
        }
      );
  }

  if (assetElements.locationSelect) {
    assetElements
      .locationSelect.innerHTML =
      buildOptions(
        activeLocations,
        {
          placeholder:
            "Select location"
        }
      );
  }

  if (assetElements.custodianSelect) {
    assetElements
      .custodianSelect.innerHTML =
      buildOptions(
        activeUsers,
        {
          placeholder:
            "Select custodian"
        }
      );
  }
}

/* =========================================================
   SUMMARY RENDERING
   ========================================================= */

function renderAssetSummary() {
  const summary = {
    total:
      assetState.assets.length,

    available: 0,
    allocated: 0,
    maintenance: 0,
    reserved: 0,
    inactive: 0
  };

  assetState.assets.forEach((asset) => {
    const status =
      normalizeStatus(asset.status);

    if (status === "available") {
      summary.available += 1;
    }

    if (status === "allocated") {
      summary.allocated += 1;
    }

    if (
      status ===
      "under maintenance"
    ) {
      summary.maintenance += 1;
    }

    if (status === "reserved") {
      summary.reserved += 1;
    }

    if (
      [
        "lost",
        "retired",
        "disposed"
      ].includes(status)
    ) {
      summary.inactive += 1;
    }
  });

  Object.entries(summary).forEach(
    ([key, value]) => {
      document
        .querySelectorAll(
          `[data-asset-summary="${key}"]`
        )
        .forEach((element) => {
          element.textContent =
            formatNumber(value);

          element.classList.add(
            "asset-data-enter"
          );
        });
    }
  );
}

/* =========================================================
   FILTERING AND SORTING
   ========================================================= */

function getSearchableAssetText(asset) {
  return [
    asset.name,
    asset.asset_tag,
    asset.tag,
    asset.serial_number,
    asset.model,
    asset.manufacturer,
    getCategoryName(asset),
    getDepartmentName(asset),
    getLocationName(asset),
    getHolderName(asset),
    statusLabel(asset.status)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareValues(
  first,
  second,
  direction
) {
  const multiplier =
    direction === "desc"
      ? -1
      : 1;

  const firstNumber =
    Number(first);

  const secondNumber =
    Number(second);

  if (
    Number.isFinite(firstNumber) &&
    Number.isFinite(secondNumber)
  ) {
    return (
      (firstNumber - secondNumber) *
      multiplier
    );
  }

  return String(first ?? "")
    .localeCompare(
      String(second ?? ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    ) * multiplier;
}

function getSortValue(asset, field) {
  const values = {
    name:
      asset.name || "",

    status:
      statusLabel(asset.status),

    category:
      getCategoryName(asset),

    department:
      getDepartmentName(asset),

    acquisition_date:
      asset.acquisition_date || ""
  };

  return values[field] ?? "";
}

function applyAssetFilters() {
  const search =
    normalizeText(assetState.search);

  assetState.filteredAssets =
    assetState.assets
      .filter((asset) => {
        const matchesSearch =
          !search ||
          getSearchableAssetText(
            asset
          ).includes(search);

        const matchesStatus =
          !assetState.status ||
          normalizeStatus(asset.status) ===
          normalizeStatus(
            assetState.status
          );

        const matchesCategory =
          !assetState.category ||
          String(
            getCategoryId(asset)
          ) ===
          String(assetState.category);

        const matchesDepartment =
          !assetState.department ||
          String(
            getDepartmentId(asset)
          ) ===
          String(assetState.department);

        const matchesLocation =
          !assetState.location ||
          String(
            getLocationId(asset)
          ) ===
          String(assetState.location);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory &&
          matchesDepartment &&
          matchesLocation
        );
      })
      .sort((first, second) =>
        compareValues(
          getSortValue(
            first,
            assetState.sortField
          ),
          getSortValue(
            second,
            assetState.sortField
          ),
          assetState.sortDirection
        )
      );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        assetState.filteredAssets.length /
        ASSET_CONFIG.PAGE_SIZE
      )
    );

  assetState.currentPage =
    Math.min(
      assetState.currentPage,
      totalPages
    );
}

/* =========================================================
   ACTIVE FILTER CHIPS
   ========================================================= */

function getOptionText(
  select,
  value
) {
  const option =
    Array.from(
      select?.options || []
    ).find(
      (item) =>
        String(item.value) ===
        String(value)
    );

  return option?.textContent?.trim() ||
    value;
}

function renderActiveFilters() {
  if (
    !assetElements.activeFilters ||
    !assetElements.filterChips
  ) {
    return;
  }

  const filters = [];

  if (assetState.search) {
    filters.push({
      key: "search",
      label:
        `Search: ${assetState.search}`
    });
  }

  if (assetState.status) {
    filters.push({
      key: "status",
      label:
        statusLabel(
          assetState.status
        )
    });
  }

  if (assetState.category) {
    filters.push({
      key: "category",
      label:
        getOptionText(
          assetElements.categoryFilter,
          assetState.category
        )
    });
  }

  if (assetState.department) {
    filters.push({
      key: "department",
      label:
        getOptionText(
          assetElements.departmentFilter,
          assetState.department
        )
    });
  }

  if (assetState.location) {
    filters.push({
      key: "location",
      label:
        getOptionText(
          assetElements.locationFilter,
          assetState.location
        )
    });
  }

  assetElements.activeFilters.hidden =
    filters.length === 0;

  assetElements.filterChips.innerHTML =
    filters
      .map((filter) => `
        <span class="asset-filter-chip">
          ${escapeHTML(filter.label)}

          <button
            type="button"
            data-remove-asset-filter="${escapeHTML(
              filter.key
            )}"
            aria-label="Remove ${escapeHTML(
              filter.label
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
        </span>
      `)
      .join("");
}

/* =========================================================
   ASSET ICON
   ========================================================= */

function getAssetIcon(categoryName = "") {
  const category =
    normalizeText(categoryName);

  if (
    category.includes("laptop") ||
    category.includes("computer")
  ) {
    return `
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
      ></rect>
      <path d="M2 20h20"></path>
    `;
  }

  if (
    category.includes("phone") ||
    category.includes("mobile")
  ) {
    return `
      <rect
        x="7"
        y="2"
        width="10"
        height="20"
        rx="2"
      ></rect>
      <path d="M11 18h2"></path>
    `;
  }

  if (
    category.includes("vehicle")
  ) {
    return `
      <path d="M5 17h14"></path>
      <path d="M7 17v2"></path>
      <path d="M17 17v2"></path>
      <path d="m4 12 2-5h12l2 5"></path>
      <rect
        x="3"
        y="12"
        width="18"
        height="5"
        rx="2"
      ></rect>
    `;
  }

  if (
    category.includes("room") ||
    category.includes("meeting")
  ) {
    return `
      <path d="M3 21h18"></path>
      <path d="M6 21V5h12v16"></path>
      <path d="M9 9h6"></path>
      <path d="M9 13h6"></path>
    `;
  }

  return `
    <path d="M21 16V8"></path>
    <path d="m3.5 7 8.5 5 8.5-5"></path>
    <path d="M12 22V12"></path>
    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
  `;
}

/* =========================================================
   TABLE RENDERING
   ========================================================= */

function renderAssetTable(assets) {
  if (!assetElements.tableBody) {
    return;
  }

  const canManage =
    canManageAssets();

  assetElements.tableBody.innerHTML =
    assets
      .map((asset) => {
        const id =
          getRecordId(asset);

        const name =
          asset.name ||
          "Unnamed Asset";

        const tag =
          asset.asset_tag ||
          asset.tag ||
          "No asset tag";

        const category =
          getCategoryName(asset);

        const department =
          getDepartmentName(asset);

        const location =
          getLocationName(asset);

        const holder =
          getHolderName(asset);

        const hasHolder =
          holder !== "Not allocated";

        const acquisitionCost =
          asset.acquisition_cost ??
          asset.purchase_cost;

        return `
          <tr class="asset-data-enter">
            <td>
              <button
                type="button"
                class="asset-table-identity text-left"
                data-view-asset="${escapeHTML(
                  id
                )}"
              >
                <span
                  class="asset-table-icon"
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
                    ${getAssetIcon(category)}
                  </svg>
                </span>

                <span class="asset-table-content">
                  <span class="asset-table-name">
                    ${escapeHTML(name)}
                  </span>

                  <span class="asset-table-tag">
                    ${escapeHTML(tag)}
                  </span>
                </span>
              </button>
            </td>

            <td>
              <div class="asset-category-cell">
                <span class="asset-category-name">
                  ${escapeHTML(category)}
                </span>

                <span class="asset-category-type">
                  ${
                    toBoolean(
                      asset.is_bookable,
                      false
                    )
                      ? "Bookable resource"
                      : "Physical asset"
                  }
                </span>
              </div>
            </td>

            <td>
              <div class="asset-location-cell">
                <span class="asset-location-department">
                  ${escapeHTML(department)}
                </span>

                <span class="asset-location-name">
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

                  ${escapeHTML(location)}
                </span>
              </div>
            </td>

            <td>
              ${
                hasHolder
                  ? `
                    <div class="asset-holder">
                      <div
                        class="asset-holder-avatar"
                        aria-hidden="true"
                      >
                        ${escapeHTML(
                          getInitials(holder)
                        )}
                      </div>

                      <span class="asset-holder-name">
                        ${escapeHTML(holder)}
                      </span>
                    </div>
                  `
                  : `
                    <span class="asset-holder-empty">
                      Not allocated
                    </span>
                  `
              }
            </td>

            <td>
              <span
                class="badge badge-dot ${statusBadgeClass(
                  asset.status
                )}"
              >
                ${escapeHTML(
                  statusLabel(asset.status)
                )}
              </span>
            </td>

            <td>
              <div class="asset-acquisition-cell">
                <span class="asset-acquisition-date">
                  ${formatDate(
                    asset.acquisition_date
                  )}
                </span>

                <span class="asset-acquisition-cost">
                  ${formatCurrency(
                    acquisitionCost
                  )}
                </span>
              </div>
            </td>

            <td class="text-right">
              <div class="asset-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-asset="${escapeHTML(
                    id
                  )}"
                  aria-label="View ${escapeHTML(
                    name
                  )}"
                  title="View details"
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
                  canManage
                    ? `
                      <button
                        type="button"
                        class="btn btn-icon btn-outline"
                        data-edit-asset="${escapeHTML(
                          id
                        )}"
                        aria-label="Edit ${escapeHTML(
                          name
                        )}"
                        title="Edit asset"
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
                        data-delete-asset="${escapeHTML(
                          id
                        )}"
                        aria-label="Delete ${escapeHTML(
                          name
                        )}"
                        title="Delete asset"
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
                        </svg>
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
}

/* =========================================================
   GRID RENDERING
   ========================================================= */

function renderAssetGrid(assets) {
  if (!assetElements.grid) {
    return;
  }

  const canManage =
    canManageAssets();

  assetElements.grid.innerHTML =
    assets
      .map((asset) => {
        const id =
          getRecordId(asset);

        const name =
          asset.name ||
          "Unnamed Asset";

        const category =
          getCategoryName(asset);

        const holder =
          getHolderName(asset);

        const hasHolder =
          holder !== "Not allocated";

        return `
          <article
            class="asset-card asset-data-enter"
            style="
              --asset-card-accent:
                ${statusAccentColor(
                  asset.status
                )};
            "
          >
            <div class="asset-card-header">
              <div
                class="asset-card-icon"
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
                  ${getAssetIcon(category)}
                </svg>
              </div>

              <span
                class="badge badge-dot ${statusBadgeClass(
                  asset.status
                )}"
              >
                ${escapeHTML(
                  statusLabel(asset.status)
                )}
              </span>
            </div>

            <div class="asset-card-content">
              <h3 class="asset-card-name">
                ${escapeHTML(name)}
              </h3>

              <p class="asset-card-tag">
                ${escapeHTML(
                  asset.asset_tag ||
                  asset.tag ||
                  "No asset tag"
                )}
              </p>

              <div class="asset-card-status">
                <span class="badge badge-info">
                  ${escapeHTML(category)}
                </span>
              </div>

              <div class="asset-card-meta">
                <div class="asset-card-meta-item">
                  <span class="asset-card-meta-label">
                    Department
                  </span>

                  <span class="asset-card-meta-value">
                    ${escapeHTML(
                      getDepartmentName(asset)
                    )}
                  </span>
                </div>

                <div class="asset-card-meta-item">
                  <span class="asset-card-meta-label">
                    Location
                  </span>

                  <span class="asset-card-meta-value">
                    ${escapeHTML(
                      getLocationName(asset)
                    )}
                  </span>
                </div>

                <div class="asset-card-meta-item">
                  <span class="asset-card-meta-label">
                    Manufacturer
                  </span>

                  <span class="asset-card-meta-value">
                    ${escapeHTML(
                      asset.manufacturer ||
                      "Not specified"
                    )}
                  </span>
                </div>

                <div class="asset-card-meta-item">
                  <span class="asset-card-meta-label">
                    Model
                  </span>

                  <span class="asset-card-meta-value">
                    ${escapeHTML(
                      asset.model ||
                      "Not specified"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <footer class="asset-card-footer">
              <div class="asset-card-holder">
                ${
                  hasHolder
                    ? `
                      <div
                        class="asset-card-holder-avatar"
                        aria-hidden="true"
                      >
                        ${escapeHTML(
                          getInitials(holder)
                        )}
                      </div>

                      <span class="asset-card-holder-name">
                        ${escapeHTML(holder)}
                      </span>
                    `
                    : `
                      <span class="asset-holder-empty">
                        Not allocated
                      </span>
                    `
                }
              </div>

              <div class="asset-card-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-view-asset="${escapeHTML(
                    id
                  )}"
                >
                  View
                </button>

                ${
                  canManage
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-edit-asset="${escapeHTML(
                          id
                        )}"
                      >
                        Edit
                      </button>
                    `
                    : ""
                }
              </div>
            </footer>
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   PAGINATION
   ========================================================= */

function renderPagination(
  currentPage,
  totalPages
) {
  const container =
    assetElements.pagination;

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
  let previousPage = 0;

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
        data-asset-page="${page}"
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
      data-asset-page="${
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
      data-asset-page="${
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
   COMPLETE DIRECTORY RENDER
   ========================================================= */

function renderAssetDirectory() {
  applyAssetFilters();
  renderActiveFilters();

  const total =
    assetState.filteredAssets.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        ASSET_CONFIG.PAGE_SIZE
      )
    );

  const startIndex =
    (
      assetState.currentPage - 1
    ) *
    ASSET_CONFIG.PAGE_SIZE;

  const visibleAssets =
    assetState.filteredAssets.slice(
      startIndex,
      startIndex +
      ASSET_CONFIG.PAGE_SIZE
    );

  const hasAssets =
    visibleAssets.length > 0;

  if (assetElements.emptyState) {
    assetElements.emptyState.hidden =
      hasAssets;
  }

  if (assetElements.tableView) {
    assetElements.tableView.hidden =
      !hasAssets ||
      assetState.activeView !==
        "table";
  }

  if (assetElements.gridView) {
    assetElements.gridView.hidden =
      !hasAssets ||
      assetState.activeView !==
        "grid";
  }

  renderAssetTable(visibleAssets);
  renderAssetGrid(visibleAssets);

  const start =
    total === 0
      ? 0
      : startIndex + 1;

  const end =
    Math.min(
      startIndex +
      ASSET_CONFIG.PAGE_SIZE,
      total
    );

  if (
    assetElements.paginationSummary
  ) {
    assetElements
      .paginationSummary.textContent =
      total === 0
        ? "Showing 0 assets"
        : `Showing ${start}–${end} of ${total} assets`;
  }

  renderPagination(
    assetState.currentPage,
    totalPages
  );

  updateSortButtons();
}

/* =========================================================
   VIEW MANAGEMENT
   ========================================================= */

function setAssetView(view) {
  if (
    !["table", "grid"].includes(view)
  ) {
    return;
  }

  assetState.activeView = view;

  document
    .querySelectorAll(
      "[data-asset-view]"
    )
    .forEach((button) => {
      const active =
        button.dataset.assetView ===
        view;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

  localStorage.setItem(
    "assetflow_asset_view",
    view
  );

  renderAssetDirectory();
}

function updateSortButtons() {
  document
    .querySelectorAll(
      "[data-asset-sort]"
    )
    .forEach((button) => {
      const active =
        button.dataset.assetSort ===
        assetState.sortField;

      button.classList.toggle(
        "active",
        active
      );

      button.classList.toggle(
        "descending",
        active &&
        assetState.sortDirection ===
          "desc"
      );
    });
}

/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetAssetFilters() {
  assetState.search = "";
  assetState.status = "";
  assetState.category = "";
  assetState.department = "";
  assetState.location = "";
  assetState.currentPage = 1;

  if (assetElements.searchInput) {
    assetElements.searchInput.value =
      "";
  }

  if (assetElements.statusFilter) {
    assetElements.statusFilter.value =
      "";
  }

  if (assetElements.categoryFilter) {
    assetElements.categoryFilter.value =
      "";
  }

  if (assetElements.departmentFilter) {
    assetElements.departmentFilter.value =
      "";
  }

  if (assetElements.locationFilter) {
    assetElements.locationFilter.value =
      "";
  }

  renderAssetDirectory();
}

function removeAssetFilter(filterKey) {
  const stateKeyMap = {
    search: "search",
    status: "status",
    category: "category",
    department: "department",
    location: "location"
  };

  const elementMap = {
    search:
      assetElements.searchInput,

    status:
      assetElements.statusFilter,

    category:
      assetElements.categoryFilter,

    department:
      assetElements.departmentFilter,

    location:
      assetElements.locationFilter
  };

  const stateKey =
    stateKeyMap[filterKey];

  if (!stateKey) {
    return;
  }

  assetState[stateKey] = "";
  assetState.currentPage = 1;

  if (elementMap[filterKey]) {
    elementMap[filterKey].value =
      "";
  }

  renderAssetDirectory();
}

/* =========================================================
   FORM VALIDATION HELPERS
   ========================================================= */

function clearFormState() {
  window.AssetFlowUtils
    ?.clearFormValidation?.(
      assetElements.form
    );

  if (assetElements.formError) {
    assetElements.formError.hidden =
      true;

    assetElements.formError.textContent =
      "";
  }
}

function showFormError(message) {
  if (!assetElements.formError) {
    return;
  }

  assetElements.formError.textContent =
    message;

  assetElements.formError.hidden =
    false;
}

function applyFormError(error) {
  const applied =
    window.AssetFlowUtils
      ?.applyApiFieldError?.(
        assetElements.form,
        error
      );

  if (!applied) {
    showFormError(
      error?.message ||
      "Unable to save asset."
    );
  }
}

function validateAssetForm() {
  const fields =
    Array.from(
      assetElements.form.querySelectorAll(
        "[required]"
      )
    );

  let valid = true;

  fields.forEach((field) => {
    if (!String(field.value).trim()) {
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
   ASSET FORM
   ========================================================= */

function resetAssetForm() {
  if (!assetElements.form) {
    return;
  }

  assetElements.form.reset();

  document.getElementById(
    "assetId"
  ).value = "";

  document.getElementById(
    "assetStatus"
  ).value = "Available";

  document.getElementById(
    "assetBookable"
  ).checked = false;

  document.getElementById(
    "assetRequiresApproval"
  ).checked = false;

  document
    .querySelector(
      "[data-asset-form-title]"
    )
    .textContent =
      "Register Asset";

  assetElements
    .formSubmitButton.textContent =
      "Register Asset";

  const counter =
    document.querySelector(
      "[data-asset-notes-count]"
    );

  if (counter) {
    counter.textContent = "0";
  }

  clearFormState();
}

function findAssetById(assetId) {
  return assetState.assets.find(
    (asset) =>
      String(getRecordId(asset)) ===
      String(assetId)
  );
}

function openAssetEditor(assetId) {
  if (!canManageAssets()) {
    showToast(
      "You do not have permission to edit assets.",
      "danger"
    );

    return;
  }

  const asset =
    findAssetById(assetId);

  if (!asset) {
    showToast(
      "Asset could not be found.",
      "danger"
    );

    return;
  }

  resetAssetForm();

  document.getElementById(
    "assetId"
  ).value =
    getRecordId(asset);

  document.getElementById(
    "assetName"
  ).value =
    asset.name || "";

  document.getElementById(
    "assetTag"
  ).value =
    asset.asset_tag ||
    asset.tag ||
    "";

  document.getElementById(
    "assetCategory"
  ).value =
    getCategoryId(asset);

  document.getElementById(
    "assetStatus"
  ).value =
    asset.status || "Available";

  document.getElementById(
    "assetSerialNumber"
  ).value =
    asset.serial_number || "";

  document.getElementById(
    "assetModel"
  ).value =
    asset.model || "";

  document.getElementById(
    "assetManufacturer"
  ).value =
    asset.manufacturer || "";

  document.getElementById(
    "assetDepartment"
  ).value =
    getDepartmentId(asset);

  document.getElementById(
    "assetLocation"
  ).value =
    getLocationId(asset);

  document.getElementById(
    "assetCustodian"
  ).value =
    getCustodianId(asset);

  document.getElementById(
    "assetAcquisitionDate"
  ).value =
    String(
      asset.acquisition_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "assetAcquisitionCost"
  ).value =
    asset.acquisition_cost ??
    asset.purchase_cost ??
    "";

  document.getElementById(
    "assetWarrantyEndDate"
  ).value =
    String(
      asset.warranty_end_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "assetVendor"
  ).value =
    asset.vendor || "";

  document.getElementById(
    "assetInvoiceNumber"
  ).value =
    asset.invoice_number || "";

  document.getElementById(
    "assetBookable"
  ).checked =
    toBoolean(
      asset.is_bookable,
      false
    );

  document.getElementById(
    "assetRequiresApproval"
  ).checked =
    toBoolean(
      asset.requires_booking_approval,
      false
    );

  document.getElementById(
    "assetNotes"
  ).value =
    asset.notes || "";

  document
    .querySelector(
      "[data-asset-form-title]"
    )
    .textContent =
      "Edit Asset";

  assetElements
    .formSubmitButton.textContent =
      "Update Asset";

  const counter =
    document.querySelector(
      "[data-asset-notes-count]"
    );

  if (counter) {
    counter.textContent =
      String(
        (asset.notes || "").length
      );
  }

  closeModal(
    assetElements.detailsModal
  );

  openModal(
    assetElements.formModal
  );
}

function buildAssetPayload() {
  return {
    name:
      document.getElementById(
        "assetName"
      ).value.trim(),

    asset_tag:
      document.getElementById(
        "assetTag"
      ).value
        .trim()
        .toUpperCase(),

    category_id:
      document.getElementById(
        "assetCategory"
      ).value,

    status:
      document.getElementById(
        "assetStatus"
      ).value,

    serial_number:
      document.getElementById(
        "assetSerialNumber"
      ).value.trim() || null,

    model:
      document.getElementById(
        "assetModel"
      ).value.trim() || null,

    manufacturer:
      document.getElementById(
        "assetManufacturer"
      ).value.trim() || null,

    department_id:
      document.getElementById(
        "assetDepartment"
      ).value || null,

    location_id:
      document.getElementById(
        "assetLocation"
      ).value || null,

    custodian_id:
      document.getElementById(
        "assetCustodian"
      ).value || null,

    acquisition_date:
      document.getElementById(
        "assetAcquisitionDate"
      ).value || null,

    acquisition_cost:
      document.getElementById(
        "assetAcquisitionCost"
      ).value
        ? Number(
            document.getElementById(
              "assetAcquisitionCost"
            ).value
          )
        : null,

    warranty_end_date:
      document.getElementById(
        "assetWarrantyEndDate"
      ).value || null,

    vendor:
      document.getElementById(
        "assetVendor"
      ).value.trim() || null,

    invoice_number:
      document.getElementById(
        "assetInvoiceNumber"
      ).value.trim() || null,

    is_bookable:
      document.getElementById(
        "assetBookable"
      ).checked,

    requires_booking_approval:
      document.getElementById(
        "assetRequiresApproval"
      ).checked,

    notes:
      document.getElementById(
        "assetNotes"
      ).value.trim() || null
  };
}

async function submitAssetForm(event) {
  event.preventDefault();

  if (!canManageAssets()) {
    showToast(
      "You do not have permission to manage assets.",
      "danger"
    );

    return;
  }

  clearFormState();

  if (!validateAssetForm()) {
    return;
  }

  const assetId =
    document.getElementById(
      "assetId"
    ).value;

  const payload =
    buildAssetPayload();

  setButtonLoading(
    assetElements.formSubmitButton,
    true,
    assetId
      ? "Updating..."
      : "Registering..."
  );

  try {
    if (assetId) {
      await requestWithFallback(
        [
          `/assets/${encodeURIComponent(
            assetId
          )}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        ASSET_CONFIG.ENDPOINTS.ASSETS,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      assetElements.formModal
    );

    showToast(
      assetId
        ? "Asset updated successfully."
        : "Asset registered successfully.",
      "success"
    );

    await loadAssetData();
  } catch (error) {
    applyFormError(error);
  } finally {
    setButtonLoading(
      assetElements.formSubmitButton,
      false
    );
  }
}

/* =========================================================
   DELETE ASSET
   ========================================================= */

async function deleteAsset(assetId) {
  if (!canManageAssets()) {
    showToast(
      "You do not have permission to delete assets.",
      "danger"
    );

    return;
  }

  const asset =
    findAssetById(assetId);

  if (!asset) {
    return;
  }

  const confirmed =
    await window.AssetFlowUtils
      ?.confirmAction?.({
        title: "Delete asset",
        message:
          `Delete “${asset.name}”? ` +
          "Assets with allocation, maintenance or audit history may not be removable.",
        confirmText: "Delete Asset",
        type: "danger"
      });

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/assets/${encodeURIComponent(
        assetId
      )}`,
      {
        method: "DELETE"
      }
    );

    showToast(
      "Asset deleted successfully.",
      "success"
    );

    await loadAssetData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to delete asset.",
      "danger"
    );
  }
}

/* =========================================================
   ASSET TAG GENERATION
   ========================================================= */

function createAssetTag() {
  const categorySelect =
    document.getElementById(
      "assetCategory"
    );

  const categoryText =
    categorySelect
      ?.selectedOptions?.[0]
      ?.textContent
      ?.trim() || "AST";

  const prefix =
    categoryText
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "AST";

  const datePart =
    new Date()
      .getFullYear()
      .toString()
      .slice(-2);

  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000
    );

  document.getElementById(
    "assetTag"
  ).value =
    `AF-${prefix}-${datePart}${randomPart}`;
}

/* =========================================================
   DETAILS MODAL
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

function lifecycleIcon(action = "") {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes("maintenance")
  ) {
    return `
      <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.3 7.3"></path>
      <path d="m5 19 4-4"></path>
    `;
  }

  if (
    normalized.includes("allocate") ||
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
    normalized.includes("return")
  ) {
    return `
      <path d="M9 14 4 9l5-5"></path>
      <path d="M4 9h10a6 6 0 0 1 6 6v4"></path>
    `;
  }

  return `
    <path d="M21 16V8"></path>
    <path d="m3.5 7 8.5 5 8.5-5"></path>
    <path d="M12 22V12"></path>
    <path d="M3 7l9-5 9 5v10l-9 5-9-5V7Z"></path>
  `;
}

function lifecycleColor(action = "") {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes("maintenance")
  ) {
    return "var(--color-warning)";
  }

  if (
    normalized.includes("return")
  ) {
    return "var(--color-success)";
  }

  if (
    normalized.includes("lost") ||
    normalized.includes("delete")
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes("allocate") ||
    normalized.includes("transfer")
  ) {
    return "var(--color-info)";
  }

  return "var(--color-primary)";
}

function renderAssetActivity(activity) {
  const container =
    document.querySelector(
      "[data-asset-lifecycle-timeline]"
    );

  const countElement =
    document.querySelector(
      "[data-asset-activity-count]"
    );

  if (!container) {
    return;
  }

  if (countElement) {
    countElement.textContent =
      `${activity.length} ${
        activity.length === 1
          ? "event"
          : "events"
      }`;
  }

  if (activity.length === 0) {
    container.innerHTML = `
      <div class="state-container dashboard-compact-state">
        <h3 class="state-title">
          No lifecycle activity
        </h3>

        <p class="state-description">
          Asset history will appear here after allocation,
          maintenance, transfer or audit actions.
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
          "Asset updated";

        const message =
          item.message ||
          item.description ||
          `${statusLabel(action)} recorded.`;

        const timestamp =
          item.timestamp ||
          item.created_at ||
          item.updated_at;

        const actor =
          item.user_name ||
          item.actor_name ||
          item.user?.name ||
          "AssetFlow";

        return `
          <div class="timeline-item asset-data-enter">
            <div
              class="asset-lifecycle-marker"
              style="
                --lifecycle-color:
                  ${lifecycleColor(action)};
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
                ${lifecycleIcon(action)}
              </svg>
            </div>

            <div class="asset-lifecycle-content">
              <h4 class="asset-lifecycle-title">
                ${escapeHTML(
                  statusLabel(action)
                )}
              </h4>

              <p class="asset-lifecycle-description">
                ${escapeHTML(message)}
              </p>

              <p class="asset-lifecycle-meta">
                ${escapeHTML(actor)}
                ·
                ${escapeHTML(
                  formatRelativeTime(timestamp)
                )}
              </p>
            </div>
          </div>
        `;
      })
      .join("");
}

function renderAssetDetails(asset) {
  assetState.selectedAssetId =
    getRecordId(asset);

  setDetailText(
    "[data-asset-detail-name]",
    asset.name ||
    "Unnamed Asset"
  );

  setDetailText(
    "[data-asset-detail-tag]",
    asset.asset_tag ||
    asset.tag ||
    "No asset tag"
  );

  setDetailText(
    "[data-asset-detail-serial]",
    asset.serial_number || "—"
  );

  setDetailText(
    "[data-asset-detail-manufacturer]",
    asset.manufacturer || "—"
  );

  setDetailText(
    "[data-asset-detail-model]",
    asset.model || "—"
  );

  setDetailText(
    "[data-asset-detail-department]",
    getDepartmentName(asset)
  );

  setDetailText(
    "[data-asset-detail-location]",
    getLocationName(asset)
  );

  setDetailText(
    "[data-asset-detail-holder]",
    getHolderName(asset)
  );

  setDetailText(
    "[data-asset-detail-acquisition-date]",
    formatDate(
      asset.acquisition_date
    )
  );

  setDetailText(
    "[data-asset-detail-cost]",
    formatCurrency(
      asset.acquisition_cost ??
      asset.purchase_cost
    )
  );

  const statusElement =
    document.querySelector(
      "[data-asset-detail-status]"
    );

  if (statusElement) {
    statusElement.textContent =
      statusLabel(asset.status);

    statusElement.className =
      `badge badge-dot ${statusBadgeClass(
        asset.status
      )}`;
  }

  const categoryElement =
    document.querySelector(
      "[data-asset-detail-category]"
    );

  if (categoryElement) {
    categoryElement.textContent =
      getCategoryName(asset);
  }

  const allocationLink =
    document.querySelector(
      "[data-allocate-current-asset]"
    );

  if (allocationLink) {
    allocationLink.href =
      `../asset-allocation/index.html?asset_id=${encodeURIComponent(
        getRecordId(asset)
      )}`;

    allocationLink.hidden =
      !canManageAssets() ||
      normalizeStatus(asset.status) !==
        "available";
  }

  const editButton =
    document.querySelector(
      "[data-edit-current-asset]"
    );

  if (editButton) {
    editButton.hidden =
      !canManageAssets();
  }
}

async function openAssetDetails(assetId) {
  let asset =
    findAssetById(assetId);

  if (!asset) {
    showToast(
      "Asset could not be found.",
      "danger"
    );

    return;
  }

  renderAssetDetails(asset);
  renderAssetActivity([]);

  openModal(
    assetElements.detailsModal
  );

  try {
    const [
      detailResult,
      activityResult
    ] = await Promise.allSettled([
      fetchAssetById(assetId),
      fetchAssetActivity(assetId)
    ]);

    if (
      detailResult.status ===
      "fulfilled"
    ) {
      asset = {
        ...asset,
        ...detailResult.value
      };

      renderAssetDetails(asset);
    }

    if (
      activityResult.status ===
      "fulfilled"
    ) {
      renderAssetActivity(
        activityResult.value
      );
    }
  } catch (error) {
    console.error(
      "Asset details loading failed:",
      error
    );
  }
}

/* =========================================================
   CSV EXPORT
   ========================================================= */

function csvValue(value) {
  const stringValue =
    String(value ?? "");

  return `"${stringValue.replaceAll(
    '"',
    '""'
  )}"`;
}

function exportAssetsToCSV() {
  const assets =
    assetState.filteredAssets.length
      ? assetState.filteredAssets
      : assetState.assets;

  if (assets.length === 0) {
    showToast(
      "There are no assets to export.",
      "warning"
    );

    return;
  }

  const headers = [
    "Asset Name",
    "Asset Tag",
    "Category",
    "Status",
    "Serial Number",
    "Manufacturer",
    "Model",
    "Department",
    "Location",
    "Current Holder",
    "Acquisition Date",
    "Acquisition Cost",
    "Warranty End",
    "Vendor",
    "Invoice Number",
    "Bookable"
  ];

  const rows = assets.map((asset) => [
    asset.name,
    asset.asset_tag || asset.tag,
    getCategoryName(asset),
    statusLabel(asset.status),
    asset.serial_number,
    asset.manufacturer,
    asset.model,
    getDepartmentName(asset),
    getLocationName(asset),
    getHolderName(asset),
    asset.acquisition_date,
    asset.acquisition_cost ??
      asset.purchase_cost,
    asset.warranty_end_date,
    asset.vendor,
    asset.invoice_number,
    toBoolean(
      asset.is_bookable,
      false
    )
      ? "Yes"
      : "No"
  ]);

  const csv = [
    headers.map(csvValue).join(","),
    ...rows.map((row) =>
      row.map(csvValue).join(",")
    )
  ].join("\n");

  const blob =
    new Blob(
      ["\uFEFF", csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    `assetflow-assets-${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    `${assets.length} assets exported.`,
    "success"
  );
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadAssetData({
  showSuccessToast = false
} = {}) {
  if (assetState.loading) {
    return;
  }

  assetState.abortController
    ?.abort();

  assetState.abortController =
    new AbortController();

  const signal =
    assetState.abortController
      .signal;

  setAssetLoading(true);
  hidePageError();

  try {
    const [
      assetsResult,
      categoriesResult,
      departmentsResult,
      locationsResult,
      usersResult
    ] = await Promise.allSettled([
      fetchAssets(signal),
      fetchCategories(signal),
      fetchDepartments(signal),
      fetchLocations(signal),
      fetchUsers(signal)
    ]);

    if (
      assetsResult.status ===
      "rejected"
    ) {
      throw assetsResult.reason;
    }

    assetState.assets =
      assetsResult.value;

    assetState.categories =
      categoriesResult.status ===
      "fulfilled"
        ? categoriesResult.value
        : [];

    assetState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    assetState.locations =
      locationsResult.status ===
      "fulfilled"
        ? locationsResult.value
        : [];

    assetState.users =
      usersResult.status ===
      "fulfilled"
        ? usersResult.value
        : [];

    populateReferenceOptions();
    renderAssetSummary();
    renderAssetDirectory();
    enforceAssetPermissions();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Asset directory refreshed.",
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
      "Asset loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load asset data."
    );

    showToast(
      error?.message ||
      "Unable to load asset data.",
      "danger"
    );
  } finally {
    setAssetLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-asset-last-updated]"
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

  const action =
    parameters.get("action");

  const assetId =
    parameters.get("asset_id");

  if (
    action === "register" &&
    canManageAssets()
  ) {
    resetAssetForm();

    openModal(
      assetElements.formModal
    );
  }

  if (assetId) {
    openAssetDetails(assetId);
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleAssetClick(event) {
  const pageButton =
    event.target.closest(
      "[data-asset-page]"
    );

  if (pageButton) {
    const page =
      Number(
        pageButton.dataset.assetPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      assetState.currentPage = page;
      renderAssetDirectory();

      assetElements
        .main
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }

    return;
  }

  const viewButton =
    event.target.closest(
      "[data-asset-view]"
    );

  if (viewButton) {
    setAssetView(
      viewButton.dataset.assetView
    );

    return;
  }

  const sortButton =
    event.target.closest(
      "[data-asset-sort]"
    );

  if (sortButton) {
    const field =
      sortButton.dataset.assetSort;

    if (
      assetState.sortField === field
    ) {
      assetState.sortDirection =
        assetState.sortDirection ===
        "asc"
          ? "desc"
          : "asc";
    } else {
      assetState.sortField = field;
      assetState.sortDirection = "asc";
    }

    assetState.currentPage = 1;
    renderAssetDirectory();

    return;
  }

  const removeFilter =
    event.target.closest(
      "[data-remove-asset-filter]"
    );

  if (removeFilter) {
    removeAssetFilter(
      removeFilter.dataset
        .removeAssetFilter
    );

    return;
  }

  const resetFilterButton =
    event.target.closest(
      "[data-reset-asset-filters]"
    );

  if (resetFilterButton) {
    resetAssetFilters();
    return;
  }

  const viewAsset =
    event.target.closest(
      "[data-view-asset]"
    );

  if (viewAsset) {
    openAssetDetails(
      viewAsset.dataset.viewAsset
    );

    return;
  }

  const editAsset =
    event.target.closest(
      "[data-edit-asset]"
    );

  if (editAsset) {
    openAssetEditor(
      editAsset.dataset.editAsset
    );

    return;
  }

  const deleteAssetButton =
    event.target.closest(
      "[data-delete-asset]"
    );

  if (deleteAssetButton) {
    deleteAsset(
      deleteAssetButton.dataset
        .deleteAsset
    );

    return;
  }

  const registerAssetButton =
    event.target.closest(
      "[data-register-asset]"
    );

  if (registerAssetButton) {
    resetAssetForm();
    return;
  }

  const generateTagButton =
    event.target.closest(
      "[data-generate-asset-tag]"
    );

  if (generateTagButton) {
    createAssetTag();
    return;
  }

  const editCurrentAsset =
    event.target.closest(
      "[data-edit-current-asset]"
    );

  if (
    editCurrentAsset &&
    assetState.selectedAssetId
  ) {
    openAssetEditor(
      assetState.selectedAssetId
    );
  }
}

function bindAssetEvents() {
  document.addEventListener(
    "click",
    handleAssetClick,
    true
  );

  assetElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadAssetData();
      }
    );

  assetElements.exportButton
    ?.addEventListener(
      "click",
      exportAssetsToCSV
    );

  assetElements.form
    ?.addEventListener(
      "submit",
      submitAssetForm
    );

  assetElements.searchInput
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            assetState.search =
              event.target.value;

            assetState.currentPage = 1;
            renderAssetDirectory();
          },
          250
        ) ||
        ((event) => {
          assetState.search =
            event.target.value;

          assetState.currentPage = 1;
          renderAssetDirectory();
        })
    );

  assetElements.statusFilter
    ?.addEventListener(
      "change",
      (event) => {
        assetState.status =
          event.target.value;

        assetState.currentPage = 1;
        renderAssetDirectory();
      }
    );

  assetElements.categoryFilter
    ?.addEventListener(
      "change",
      (event) => {
        assetState.category =
          event.target.value;

        assetState.currentPage = 1;
        renderAssetDirectory();
      }
    );

  assetElements.departmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        assetState.department =
          event.target.value;

        assetState.currentPage = 1;
        renderAssetDirectory();
      }
    );

  assetElements.locationFilter
    ?.addEventListener(
      "change",
      (event) => {
        assetState.location =
          event.target.value;

        assetState.currentPage = 1;
        renderAssetDirectory();
      }
    );

  document
    .getElementById(
      "assetNotes"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-asset-notes-count]"
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
   SHARED COMPONENT HEADER
   ========================================================= */

function initializeAssetHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title: "Asset Directory",
      subtitle:
        "Register and manage organizational assets"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeAssetHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeAssetRegistration() {
  if (assetState.initialized) {
    return;
  }

  assetState.initialized = true;

  cacheAssetElements();
  enforceAssetPermissions();
  bindAssetEvents();
  initializeAssetHeader();

  const savedView =
    localStorage.getItem(
      "assetflow_asset_view"
    );

  if (
    ["table", "grid"].includes(
      savedView
    )
  ) {
    assetState.activeView =
      savedView;
  }

  await loadAssetData();

  setAssetView(
    assetState.activeView
  );

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:assets-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    assetState.abortController
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
    initializeAssetRegistration
  );
} else {
  initializeAssetRegistration();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowAssets =
  Object.freeze({
    initialize:
      initializeAssetRegistration,

    refresh:
      loadAssetData,

    render:
      renderAssetDirectory,

    resetFilters:
      resetAssetFilters,

    setView:
      setAssetView,

    openDetails:
      openAssetDetails,

    openEditor:
      openAssetEditor,

    exportCSV:
      exportAssetsToCSV,

    getState() {
      return {
        ...assetState,
        abortController: undefined
      };
    }
  });