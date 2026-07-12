/* =========================================================
   AssetFlow — Resource Booking Controller
   File: frontend/resource-booking/resource-booking.js

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

const BOOKING_CONFIG = Object.freeze({
  PAGE_SIZE: 10,

  APPROVER_ROLES: Object.freeze([
    "Admin",
    "AssetManager",
    "DepartmentHead"
  ]),

  ENDPOINTS: Object.freeze({
    BOOKINGS: [
      "/bookings",
      "/resource-bookings"
    ],

    RESOURCES: [
      "/resources",
      "/assets?is_bookable=true",
      "/assets"
    ],

    CATEGORIES: [
      "/asset-categories",
      "/categories"
    ],

    LOCATIONS: [
      "/locations"
    ],

    DEPARTMENTS: [
      "/departments"
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

const bookingState = {
  bookings: [],
  resources: [],
  categories: [],
  locations: [],
  departments: [],
  users: [],

  activeTab: "availability",

  calendarDate: startOfMonth(
    new Date()
  ),

  selectedDate: startOfDay(
    new Date()
  ),

  calendarResourceFilter: "",
  calendarCategoryFilter: "",
  calendarLocationFilter: "",

  search: "",
  statusFilter: "",
  resourceFilter: "",
  dateFilter: "",

  approvalStatusFilter: "",
  approvalDepartmentFilter: "",

  currentPage: 1,

  selectedBookingId: null,

  loading: false,
  initialized: false,
  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const bookingElements = {};

function cacheBookingElements() {
  bookingElements.main =
    document.getElementById(
      "resourceBookingMain"
    );

  bookingElements.errorAlert =
    document.getElementById(
      "bookingPageErrorAlert"
    );

  bookingElements.errorMessage =
    document.getElementById(
      "bookingPageErrorMessage"
    );

  bookingElements.refreshButton =
    document.querySelector(
      "[data-refresh-bookings]"
    );

  bookingElements.retryButton =
    document.querySelector(
      "[data-retry-bookings]"
    );

  bookingElements.calendarTitle =
    document.getElementById(
      "bookingCalendarTitle"
    );

  bookingElements.calendarGrid =
    document.getElementById(
      "bookingCalendarGrid"
    );

  bookingElements.calendarResourceFilter =
    document.querySelector(
      "[data-calendar-resource-filter]"
    );

  bookingElements.calendarCategoryFilter =
    document.querySelector(
      "[data-calendar-category-filter]"
    );

  bookingElements.calendarLocationFilter =
    document.querySelector(
      "[data-calendar-location-filter]"
    );

  bookingElements.selectedDayLabel =
    document.querySelector(
      "[data-selected-day-label]"
    );

  bookingElements.selectedDayTitle =
    document.querySelector(
      "[data-selected-day-title]"
    );

  bookingElements.selectedDayList =
    document.getElementById(
      "selectedDayBookingList"
    );

  bookingElements.selectedDayEmptyState =
    document.getElementById(
      "selectedDayEmptyState"
    );

  bookingElements.searchInput =
    document.querySelector(
      "[data-booking-search]"
    );

  bookingElements.statusFilter =
    document.querySelector(
      "[data-booking-status-filter]"
    );

  bookingElements.resourceFilter =
    document.querySelector(
      "[data-booking-resource-filter]"
    );

  bookingElements.dateFilter =
    document.querySelector(
      "[data-booking-date-filter]"
    );

  bookingElements.myBookingsTableBody =
    document.getElementById(
      "myBookingsTableBody"
    );

  bookingElements.myBookingsTableContainer =
    bookingElements.myBookingsTableBody
      ?.closest(".table-container");

  bookingElements.myBookingsEmptyState =
    document.getElementById(
      "myBookingsEmptyState"
    );

  bookingElements.pagination =
    document.querySelector(
      "[data-booking-pagination]"
    );

  bookingElements.paginationSummary =
    document.querySelector(
      "[data-booking-pagination-summary]"
    );

  bookingElements.approvalStatusFilter =
    document.querySelector(
      "[data-approval-status-filter]"
    );

  bookingElements.approvalDepartmentFilter =
    document.querySelector(
      "[data-approval-department-filter]"
    );

  bookingElements.approvalsTableBody =
    document.getElementById(
      "bookingApprovalsTableBody"
    );

  bookingElements.approvalsTableContainer =
    bookingElements.approvalsTableBody
      ?.closest(".table-container");

  bookingElements.approvalsEmptyState =
    document.getElementById(
      "bookingApprovalsEmptyState"
    );

  bookingElements.approvalTab =
    document.querySelector(
      "[data-approval-tab]"
    );

  bookingElements.formModal =
    document.getElementById(
      "bookingFormModal"
    );

  bookingElements.form =
    document.getElementById(
      "bookingForm"
    );

  bookingElements.formError =
    document.querySelector(
      "[data-booking-form-error]"
    );

  bookingElements.formSubmitButton =
    document.getElementById(
      "bookingFormSubmitButton"
    );

  bookingElements.resourceSelect =
    document.getElementById(
      "bookingResourceId"
    );

  bookingElements.resourcePreview =
    document.getElementById(
      "bookingResourcePreview"
    );

  bookingElements.startDateTime =
    document.getElementById(
      "bookingStartDateTime"
    );

  bookingElements.endDateTime =
    document.getElementById(
      "bookingEndDateTime"
    );

  bookingElements.durationSummary =
    document.getElementById(
      "bookingDurationSummary"
    );

  bookingElements.recurringCheckbox =
    document.getElementById(
      "bookingRecurring"
    );

  bookingElements.recurrenceFields =
    document.getElementById(
      "bookingRecurrenceFields"
    );

  bookingElements.conflictAlert =
    document.getElementById(
      "bookingConflictAlert"
    );

  bookingElements.detailsModal =
    document.getElementById(
      "bookingDetailsModal"
    );

  bookingElements.approvalModal =
    document.getElementById(
      "bookingApprovalModal"
    );

  bookingElements.approvalError =
    document.querySelector(
      "[data-booking-approval-error]"
    );

  bookingElements.approveButton =
    document.querySelector(
      "[data-approve-booking]"
    );

  bookingElements.rejectButton =
    document.querySelector(
      "[data-reject-booking]"
    );
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function startOfDay(value) {
  const date = new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function endOfDay(value) {
  const date = new Date(value);

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
}

function startOfMonth(value) {
  const date = new Date(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function addMonths(
  value,
  amount
) {
  const date = new Date(value);

  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1
  );
}

function addDays(
  value,
  amount
) {
  const date = new Date(value);

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

function dateToISO(value) {
  const date = new Date(value);

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

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

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

  const hours =
    String(
      date.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, "0");

  return (
    `${year}-${month}-${day}` +
    `T${hours}:${minutes}`
  );
}

function combineDateAndTime(
  date,
  hour,
  minute = 0
) {
  const result =
    new Date(date);

  result.setHours(
    hour,
    minute,
    0,
    0
  );

  return result;
}

function isSameDay(
  first,
  second
) {
  const firstDate =
    new Date(first);

  const secondDate =
    new Date(second);

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function isDateInMonth(
  date,
  month
) {
  return (
    date.getFullYear() ===
      month.getFullYear() &&
    date.getMonth() ===
      month.getMonth()
  );
}

function getMonthGridDates(
  monthDate
) {
  const firstDay =
    startOfMonth(monthDate);

  const gridStart =
    addDays(
      firstDay,
      -firstDay.getDay()
    );

  return Array.from(
    {
      length: 42
    },
    (_, index) =>
      addDays(
        gridStart,
        index
      )
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

function formatTime(value) {
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
    window.AssetFlowUtils
      ?.getRelativeTime
  ) {
    return window.AssetFlowUtils
      .getRelativeTime(value);
  }

  return formatDateTime(value);
}

function formatNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString(
        "en-IN"
      )
    : "0";
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
    record?.booking_id ??
    record?.resource_id ??
    record?.asset_id ??
    record?.category_id ??
    record?.location_id ??
    record?.department_id ??
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

function getCurrentUserId() {
  return getRecordId(
    getCurrentUser()
  );
}

function canApproveBookings() {
  return BOOKING_CONFIG
    .APPROVER_ROLES
    .includes(
      getCurrentUser()?.role
    );
}

function enforceBookingPermissions() {
  const allowed =
    canApproveBookings();

  if (
    bookingElements.approvalTab
  ) {
    bookingElements.approvalTab.hidden =
      !allowed;
  }

  if (
    !allowed &&
    bookingState.activeTab ===
      "approvals"
  ) {
    activateBookingTab(
      "availability"
    );
  }
}

function isBookingOwner(booking) {
  const user =
    getBookingUser(booking);

  const currentUser =
    getCurrentUser();

  if (!currentUser) {
    return true;
  }

  const bookingUserId =
    getRecordId(user);

  const currentUserId =
    getCurrentUserId();

  if (
    bookingUserId &&
    currentUserId
  ) {
    return (
      String(bookingUserId) ===
      String(currentUserId)
    );
  }

  if (
    user?.email &&
    currentUser.email
  ) {
    return (
      normalizeText(user.email) ===
      normalizeText(
        currentUser.email
      )
    );
  }

  return (
    normalizeText(
      user?.name
    ) ===
    normalizeText(
      currentUser.name
    )
  );
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

async function fetchBookings(signal) {
  const response =
    await requestWithFallback(
      BOOKING_CONFIG
        .ENDPOINTS.BOOKINGS,
      {
        signal
      }
    );

  return unwrapCollection(
    response,
    [
      "bookings",
      "resource_bookings"
    ]
  );
}

async function fetchResources(signal) {
  const response =
    await requestWithFallback(
      BOOKING_CONFIG
        .ENDPOINTS.RESOURCES,
      {
        signal
      }
    );

  const resources =
    unwrapCollection(
      response,
      [
        "resources",
        "assets"
      ]
    );

  return resources.filter(
    (resource) =>
      toBoolean(
        resource.is_bookable,
        true
      )
  );
}

async function fetchCategories(signal) {
  try {
    const response =
      await requestWithFallback(
        BOOKING_CONFIG
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
      [404, 405].includes(
        error.status
      )
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
        BOOKING_CONFIG
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
        BOOKING_CONFIG
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

async function fetchUsers(signal) {
  try {
    const response =
      await requestWithFallback(
        BOOKING_CONFIG
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

async function fetchBookingById(
  bookingId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      bookingId
    );

  const response =
    await requestWithFallback(
      [
        `/bookings/${encodedId}`,
        `/resource-bookings/${encodedId}`
      ],
      {
        signal
      }
    );

  return unwrapObject(response);
}

async function fetchBookingActivity(
  bookingId,
  signal
) {
  const encodedId =
    encodeURIComponent(
      bookingId
    );

  try {
    const response =
      await requestWithFallback(
        [
          `/bookings/${encodedId}/activity`,
          `/bookings/${encodedId}/history`,
          `/resource-bookings/${encodedId}/history`,
          `/activity-logs?entity_type=Booking&entity_id=${encodedId}`
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
   RELATIONSHIP RESOLVERS
   ========================================================= */

function findResourceById(
  resourceId
) {
  return (
    bookingState.resources.find(
      (resource) =>
        String(
          getRecordId(resource)
        ) ===
        String(resourceId)
    ) || null
  );
}

function findCategoryById(
  categoryId
) {
  return (
    bookingState.categories.find(
      (category) =>
        String(
          getRecordId(category)
        ) ===
        String(categoryId)
    ) || null
  );
}

function findLocationById(
  locationId
) {
  return (
    bookingState.locations.find(
      (location) =>
        String(
          getRecordId(location)
        ) ===
        String(locationId)
    ) || null
  );
}

function findDepartmentById(
  departmentId
) {
  return (
    bookingState.departments.find(
      (department) =>
        String(
          getRecordId(department)
        ) ===
        String(departmentId)
    ) || null
  );
}

function findUserById(userId) {
  return (
    bookingState.users.find(
      (user) =>
        String(
          getRecordId(user)
        ) ===
        String(userId)
    ) || null
  );
}

function findBookingById(
  bookingId
) {
  return (
    bookingState.bookings.find(
      (booking) =>
        String(
          getRecordId(booking)
        ) ===
        String(bookingId)
    ) || null
  );
}

function getResourceReference(
  booking
) {
  return (
    booking?.resource ||
    booking?.asset ||
    booking?.bookable_resource ||
    booking?.resource_id ||
    booking?.asset_id ||
    null
  );
}

function getBookingResource(
  booking
) {
  const reference =
    getResourceReference(
      booking
    );

  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return findResourceById(
    reference
  );
}

function getResourceId(booking) {
  const reference =
    getResourceReference(
      booking
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(
      reference
    );
  }

  return reference || "";
}

function getResourceName(
  booking
) {
  const resource =
    getBookingResource(
      booking
    );

  return (
    resource?.name ||
    booking?.resource_name ||
    booking?.asset_name ||
    "Unnamed Resource"
  );
}

function getResourceCategoryReference(
  resource
) {
  return (
    resource?.category ||
    resource?.asset_category ||
    resource?.category_id ||
    null
  );
}

function getResourceCategoryId(
  resource
) {
  const reference =
    getResourceCategoryReference(
      resource
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(
      reference
    );
  }

  return reference || "";
}

function getResourceCategoryName(
  resource
) {
  const reference =
    getResourceCategoryReference(
      resource
    );

  if (!reference) {
    return (
      resource?.category_name ||
      "Shared Resource"
    );
  }

  if (
    typeof reference === "object"
  ) {
    return (
      reference.name ||
      "Shared Resource"
    );
  }

  return (
    findCategoryById(
      reference
    )?.name ||
    resource?.category_name ||
    "Shared Resource"
  );
}

function getResourceLocationReference(
  resource
) {
  return (
    resource?.location ||
    resource?.current_location ||
    resource?.location_id ||
    null
  );
}

function getResourceLocationId(
  resource
) {
  const reference =
    getResourceLocationReference(
      resource
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(
      reference
    );
  }

  return reference || "";
}

function getResourceLocationName(
  resource
) {
  const reference =
    getResourceLocationReference(
      resource
    );

  if (!reference) {
    return (
      resource?.location_name ||
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
    resource?.location_name ||
    "Location not set"
  );
}

function getBookingUserReference(
  booking
) {
  return (
    booking?.user ||
    booking?.employee ||
    booking?.booked_by ||
    booking?.requester ||
    booking?.user_id ||
    booking?.employee_id ||
    booking?.booked_by_id ||
    booking?.requester_id ||
    null
  );
}

function getBookingUser(
  booking
) {
  const reference =
    getBookingUserReference(
      booking
    );

  if (!reference) {
    return null;
  }

  if (
    typeof reference === "object"
  ) {
    return reference;
  }

  return findUserById(
    reference
  );
}

function getBookingUserName(
  booking
) {
  const user =
    getBookingUser(
      booking
    );

  return (
    user?.name ||
    user?.full_name ||
    booking?.user_name ||
    booking?.employee_name ||
    booking?.requester_name ||
    "Unknown User"
  );
}

function getBookingUserEmail(
  booking
) {
  const user =
    getBookingUser(
      booking
    );

  return (
    user?.email ||
    booking?.user_email ||
    booking?.employee_email ||
    ""
  );
}

function getBookingDepartmentReference(
  booking
) {
  const user =
    getBookingUser(
      booking
    );

  return (
    booking?.department ||
    booking?.department_id ||
    user?.department ||
    user?.department_id ||
    null
  );
}

function getBookingDepartmentId(
  booking
) {
  const reference =
    getBookingDepartmentReference(
      booking
    );

  if (
    typeof reference === "object"
  ) {
    return getRecordId(
      reference
    );
  }

  return reference || "";
}

function getBookingDepartmentName(
  booking
) {
  const reference =
    getBookingDepartmentReference(
      booking
    );

  if (!reference) {
    return (
      booking?.department_name ||
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
    booking?.department_name ||
    "Unassigned"
  );
}

function getBookingStart(
  booking
) {
  return firstDefined(
    booking,
    [
      "start_time",
      "start_datetime",
      "booking_start",
      "starts_at"
    ]
  );
}

function getBookingEnd(
  booking
) {
  return firstDefined(
    booking,
    [
      "end_time",
      "end_datetime",
      "booking_end",
      "ends_at"
    ]
  );
}

/* =========================================================
   BOOKING STATUS
   ========================================================= */

function getApprovalStatus(
  booking
) {
  const explicit =
    firstDefined(
      booking,
      [
        "approval_status",
        "approval",
        "review_status"
      ]
    );

  if (explicit) {
    return titleCase(explicit);
  }

  const resource =
    getBookingResource(
      booking
    );

  const requiresApproval =
    toBoolean(
      resource
        ?.requires_booking_approval ??
      booking.requires_approval,
      false
    );

  return requiresApproval
    ? "Pending"
    : "Approved";
}

function getBookingStatus(
  booking
) {
  const explicitStatus =
    normalizeStatus(
      booking.status
    );

  if (
    [
      "cancelled",
      "canceled",
      "rejected"
    ].includes(
      explicitStatus
    )
  ) {
    return explicitStatus ===
      "canceled"
      ? "Cancelled"
      : titleCase(
          explicitStatus
        );
  }

  const start =
    new Date(
      getBookingStart(
        booking
      )
    );

  const end =
    new Date(
      getBookingEnd(
        booking
      )
    );

  const now =
    new Date();

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return titleCase(
      booking.status ||
      "Unknown"
    );
  }

  if (now < start) {
    return "Upcoming";
  }

  if (
    now >= start &&
    now <= end
  ) {
    return "Ongoing";
  }

  return "Completed";
}

function bookingStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    upcoming:
      "badge-info",

    ongoing:
      "badge-primary",

    completed:
      "badge-success",

    cancelled:
      "badge-neutral",

    rejected:
      "badge-danger"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function approvalStatusBadgeClass(
  status
) {
  const normalized =
    normalizeStatus(status);

  const classes = {
    pending:
      "badge-warning",

    approved:
      "badge-success",

    rejected:
      "badge-danger",

    cancelled:
      "badge-neutral",

    "not required":
      "badge-info"
  };

  return (
    classes[normalized] ||
    "badge-neutral"
  );
}

function isBookingCancelled(
  booking
) {
  return [
    "cancelled",
    "canceled",
    "rejected"
  ].includes(
    normalizeStatus(
      booking.status
    )
  );
}

function isBlockingBooking(
  booking
) {
  if (
    isBookingCancelled(booking)
  ) {
    return false;
  }

  const approval =
    normalizeStatus(
      getApprovalStatus(
        booking
      )
    );

  return ![
    "rejected",
    "cancelled"
  ].includes(approval);
}

/* =========================================================
   LOADING AND ERROR STATES
   ========================================================= */

function setBookingLoading(
  loading
) {
  bookingState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "booking-page-loading",
    bookingState.loading
  );

  document.body.classList.toggle(
    "booking-refreshing",
    bookingState.loading
  );

  if (
    bookingElements.refreshButton
  ) {
    bookingElements.refreshButton.disabled =
      bookingState.loading;

    bookingElements.refreshButton.setAttribute(
      "aria-busy",
      String(
        bookingState.loading
      )
    );
  }
}

function showPageError(message) {
  if (
    bookingElements.errorAlert
  ) {
    bookingElements.errorAlert.hidden =
      false;
  }

  if (
    bookingElements.errorMessage
  ) {
    bookingElements.errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    bookingElements.errorAlert
  ) {
    bookingElements.errorAlert.hidden =
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

function getActiveBookableResources() {
  return bookingState.resources.filter(
    (resource) => {
      const active =
        toBoolean(
          resource.is_active,
          true
        );

      const bookable =
        toBoolean(
          resource.is_bookable,
          true
        );

      const status =
        normalizeStatus(
          resource.status
        );

      return (
        active &&
        bookable &&
        ![
          "lost",
          "retired",
          "disposed",
          "under maintenance"
        ].includes(status)
      );
    }
  );
}

function populateReferenceOptions() {
  const resources =
    getActiveBookableResources();

  if (
    bookingElements
      .calendarResourceFilter
  ) {
    const selected =
      bookingElements
        .calendarResourceFilter.value;

    bookingElements
      .calendarResourceFilter
      .innerHTML =
      buildOptions(
        resources,
        {
          selectedValue: selected,
          placeholder:
            "All resources"
        }
      );
  }

  if (
    bookingElements.resourceFilter
  ) {
    const selected =
      bookingElements
        .resourceFilter.value;

    bookingElements
      .resourceFilter.innerHTML =
      buildOptions(
        resources,
        {
          selectedValue: selected,
          placeholder:
            "All resources"
        }
      );
  }

  if (
    bookingElements.resourceSelect
  ) {
    const selected =
      bookingElements
        .resourceSelect.value;

    bookingElements
      .resourceSelect.innerHTML =
      buildOptions(
        resources,
        {
          selectedValue: selected,
          placeholder:
            "Select a resource",

          labelResolver(resource) {
            return (
              `${resource.name || "Unnamed Resource"}` +
              ` — ${getResourceLocationName(
                resource
              )}`
            );
          }
        }
      );
  }

  if (
    bookingElements
      .calendarCategoryFilter
  ) {
    const selected =
      bookingElements
        .calendarCategoryFilter.value;

    bookingElements
      .calendarCategoryFilter
      .innerHTML =
      buildOptions(
        bookingState.categories,
        {
          selectedValue: selected,
          placeholder:
            "All categories"
        }
      );
  }

  if (
    bookingElements
      .calendarLocationFilter
  ) {
    const selected =
      bookingElements
        .calendarLocationFilter.value;

    bookingElements
      .calendarLocationFilter
      .innerHTML =
      buildOptions(
        bookingState.locations,
        {
          selectedValue: selected,
          placeholder:
            "All locations"
        }
      );
  }

  if (
    bookingElements
      .approvalDepartmentFilter
  ) {
    const selected =
      bookingElements
        .approvalDepartmentFilter.value;

    bookingElements
      .approvalDepartmentFilter
      .innerHTML =
      buildOptions(
        bookingState.departments,
        {
          selectedValue: selected,
          placeholder:
            "All departments"
        }
      );
  }
}

/* =========================================================
   BOOKING AVAILABILITY
   ========================================================= */

function intervalsOverlap(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) {
  return (
    firstStart < secondEnd &&
    secondStart < firstEnd
  );
}

function getConflictingBookings({
  resourceId,
  startTime,
  endTime,
  excludeBookingId = null
}) {
  const requestedStart =
    new Date(startTime);

  const requestedEnd =
    new Date(endTime);

  if (
    Number.isNaN(
      requestedStart.getTime()
    ) ||
    Number.isNaN(
      requestedEnd.getTime()
    )
  ) {
    return [];
  }

  return bookingState.bookings.filter(
    (booking) => {
      if (
        excludeBookingId &&
        String(
          getRecordId(booking)
        ) ===
        String(excludeBookingId)
      ) {
        return false;
      }

      if (
        String(
          getResourceId(booking)
        ) !==
        String(resourceId)
      ) {
        return false;
      }

      if (
        !isBlockingBooking(
          booking
        )
      ) {
        return false;
      }

      const existingStart =
        new Date(
          getBookingStart(
            booking
          )
        );

      const existingEnd =
        new Date(
          getBookingEnd(
            booking
          )
        );

      if (
        Number.isNaN(
          existingStart.getTime()
        ) ||
        Number.isNaN(
          existingEnd.getTime()
        )
      ) {
        return false;
      }

      return intervalsOverlap(
        requestedStart,
        requestedEnd,
        existingStart,
        existingEnd
      );
    }
  );
}

function isResourceAvailableNow(
  resource
) {
  const now =
    new Date();

  return (
    getConflictingBookings({
      resourceId:
        getRecordId(resource),

      startTime:
        new Date(
          now.getTime() -
          60 * 1000
        ),

      endTime:
        new Date(
          now.getTime() +
          60 * 1000
        )
    }).length === 0
  );
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderBookingSummary() {
  const now =
    new Date();

  const currentMonth =
    now.getMonth();

  const currentYear =
    now.getFullYear();

  const myBookings =
    bookingState.bookings.filter(
      isBookingOwner
    );

  const upcoming =
    myBookings.filter(
      (booking) =>
        getBookingStatus(
          booking
        ) === "Upcoming" &&
        normalizeStatus(
          getApprovalStatus(
            booking
          )
        ) !== "rejected"
    );

  const ongoing =
    bookingState.bookings.filter(
      (booking) =>
        getBookingStatus(
          booking
        ) === "Ongoing"
    );

  const approvalSource =
    canApproveBookings()
      ? bookingState.bookings
      : myBookings;

  const pending =
    approvalSource.filter(
      (booking) =>
        normalizeStatus(
          getApprovalStatus(
            booking
          )
        ) === "pending"
    );

  const completedThisMonth =
    myBookings.filter(
      (booking) => {
        if (
          getBookingStatus(
            booking
          ) !== "Completed"
        ) {
          return false;
        }

        const end =
          new Date(
            getBookingEnd(
              booking
            )
          );

        return (
          end.getMonth() ===
            currentMonth &&
          end.getFullYear() ===
            currentYear
        );
      }
    );

  const availableResources =
    getActiveBookableResources()
      .filter(
        isResourceAvailableNow
      );

  const summary = {
    available_resources:
      availableResources.length,

    upcoming:
      upcoming.length,

    ongoing:
      ongoing.length,

    pending_approval:
      pending.length,

    completed_month:
      completedThisMonth.length
  };

  Object.entries(summary)
    .forEach(
      ([key, value]) => {
        document
          .querySelectorAll(
            `[data-booking-summary="${key}"]`
          )
          .forEach((element) => {
            element.textContent =
              formatNumber(value);

            element.classList.add(
              "booking-data-enter"
            );
          });
      }
    );

  document
    .querySelectorAll(
      '[data-booking-tab-count="bookings"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          myBookings.length
        );
    });

  document
    .querySelectorAll(
      '[data-booking-tab-count="approvals"]'
    )
    .forEach((element) => {
      element.textContent =
        String(
          pending.length
        );
    });
}

/* =========================================================
   CALENDAR FILTERING
   ========================================================= */

function getCalendarBookings() {
  return bookingState.bookings
    .filter(isBlockingBooking)
    .filter((booking) => {
      const resource =
        getBookingResource(
          booking
        );

      if (!resource) {
        return false;
      }

      const matchesResource =
        !bookingState
          .calendarResourceFilter ||
        String(
          getRecordId(resource)
        ) ===
        String(
          bookingState
            .calendarResourceFilter
        );

      const matchesCategory =
        !bookingState
          .calendarCategoryFilter ||
        String(
          getResourceCategoryId(
            resource
          )
        ) ===
        String(
          bookingState
            .calendarCategoryFilter
        );

      const matchesLocation =
        !bookingState
          .calendarLocationFilter ||
        String(
          getResourceLocationId(
            resource
          )
        ) ===
        String(
          bookingState
            .calendarLocationFilter
        );

      return (
        matchesResource &&
        matchesCategory &&
        matchesLocation
      );
    });
}

function getBookingsForDay(
  date,
  source =
    getCalendarBookings()
) {
  const dayStart =
    startOfDay(date);

  const dayEnd =
    endOfDay(date);

  return source
    .filter((booking) => {
      const start =
        new Date(
          getBookingStart(
            booking
          )
        );

      const end =
        new Date(
          getBookingEnd(
            booking
          )
        );

      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {
        return false;
      }

      return intervalsOverlap(
        start,
        end,
        dayStart,
        dayEnd
      );
    })
    .sort(
      (first, second) =>
        new Date(
          getBookingStart(
            first
          )
        ) -
        new Date(
          getBookingStart(
            second
          )
        )
    );
}

/* =========================================================
   CALENDAR RENDERING
   ========================================================= */

function getBookingEventColor(
  booking
) {
  const status =
    getBookingStatus(
      booking
    );

  const approval =
    getApprovalStatus(
      booking
    );

  if (
    normalizeStatus(approval) ===
    "pending"
  ) {
    return "var(--color-warning)";
  }

  const colors = {
    Upcoming:
      "var(--color-info)",

    Ongoing:
      "var(--color-primary)",

    Completed:
      "var(--color-success)",

    Cancelled:
      "var(--color-neutral-500)"
  };

  return (
    colors[status] ||
    "var(--color-primary)"
  );
}

function renderBookingCalendar() {
  if (
    !bookingElements.calendarGrid
  ) {
    return;
  }

  const month =
    bookingState.calendarDate;

  if (
    bookingElements.calendarTitle
  ) {
    bookingElements
      .calendarTitle.textContent =
      month.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric"
        }
      );
  }

  const dates =
    getMonthGridDates(month);

  const bookings =
    getCalendarBookings();

  bookingElements
    .calendarGrid.innerHTML =
    dates
      .map((date) => {
        const dayBookings =
          getBookingsForDay(
            date,
            bookings
          );

        const visibleBookings =
          dayBookings.slice(0, 3);

        const extraCount =
          Math.max(
            0,
            dayBookings.length - 3
          );

        const outsideMonth =
          !isDateInMonth(
            date,
            month
          );

        const selected =
          isSameDay(
            date,
            bookingState.selectedDate
          );

        const today =
          isSameDay(
            date,
            new Date()
          );

        const past =
          endOfDay(date) <
          new Date();

        return `
          <button
            type="button"
            class="
              booking-calendar-day
              ${
                outsideMonth
                  ? "is-outside-month"
                  : ""
              }
              ${
                selected
                  ? "is-selected"
                  : ""
              }
              ${
                today
                  ? "is-today"
                  : ""
              }
              ${
                past
                  ? "is-past"
                  : ""
              }
            "
            data-calendar-date="${dateToISO(
              date
            )}"
            role="gridcell"
            aria-selected="${
              selected
                ? "true"
                : "false"
            }"
            aria-label="${
              date.toLocaleDateString(
                "en-IN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                }
              )
            }, ${
              dayBookings.length
            } bookings"
          >
            <span class="booking-calendar-date-row">
              <span class="booking-calendar-date">
                ${date.getDate()}
              </span>

              ${
                dayBookings.length
                  ? `
                    <span class="booking-calendar-count">
                      ${dayBookings.length}
                    </span>
                  `
                  : ""
              }
            </span>

            <span class="booking-calendar-events">
              ${visibleBookings
                .map((booking) => `
                  <span
                    class="booking-calendar-event"
                    style="
                      --event-color:
                        ${getBookingEventColor(
                          booking
                        )};
                    "
                  >
                    <span class="booking-calendar-event-time">
                      ${escapeHTML(
                        formatTime(
                          getBookingStart(
                            booking
                          )
                        )
                      )}
                    </span>

                    <span class="booking-calendar-event-name">
                      ${escapeHTML(
                        getResourceName(
                          booking
                        )
                      )}
                    </span>
                  </span>
                `)
                .join("")}

              ${
                extraCount
                  ? `
                    <span class="booking-calendar-more">
                      +${extraCount} more
                    </span>
                  `
                  : ""
              }
            </span>
          </button>
        `;
      })
      .join("");

  renderSelectedDaySchedule();
}

/* =========================================================
   SELECTED DAY SCHEDULE
   ========================================================= */

function renderSelectedDaySchedule() {
  const selected =
    bookingState.selectedDate;

  if (
    bookingElements.selectedDayLabel
  ) {
    bookingElements
      .selectedDayLabel.textContent =
      selected.toLocaleDateString(
        "en-IN",
        {
          weekday: "long"
        }
      );
  }

  if (
    bookingElements.selectedDayTitle
  ) {
    bookingElements
      .selectedDayTitle.textContent =
      selected.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );
  }

  const bookings =
    getBookingsForDay(
      selected
    );

  if (
    bookings.length === 0
  ) {
    bookingElements
      .selectedDayList.innerHTML =
      "";

    bookingElements
      .selectedDayList.hidden =
      true;

    bookingElements
      .selectedDayEmptyState.hidden =
      false;

    return;
  }

  bookingElements
    .selectedDayList.hidden =
    false;

  bookingElements
    .selectedDayEmptyState.hidden =
    true;

  bookingElements
    .selectedDayList.innerHTML =
    bookings
      .map((booking) => {
        const resource =
          getBookingResource(
            booking
          );

        return `
          <button
            type="button"
            class="booking-day-item booking-data-enter text-left"
            data-view-booking="${escapeHTML(
              getRecordId(booking)
            )}"
            style="
              --booking-color:
                ${getBookingEventColor(
                  booking
                )};
            "
          >
            <span class="booking-day-time">
              ${escapeHTML(
                formatTime(
                  getBookingStart(
                    booking
                  )
                )
              )}
            </span>

            <span class="booking-day-content">
              <span class="booking-day-resource">
                ${escapeHTML(
                  getResourceName(
                    booking
                  )
                )}
              </span>

              <span class="booking-day-purpose">
                ${escapeHTML(
                  booking.purpose ||
                  "Resource booking"
                )}
              </span>

              <span class="booking-day-meta">
                <span
                  class="badge badge-dot ${bookingStatusBadgeClass(
                    getBookingStatus(
                      booking
                    )
                  )}"
                >
                  ${escapeHTML(
                    getBookingStatus(
                      booking
                    )
                  )}
                </span>

                <span class="badge badge-neutral">
                  ${escapeHTML(
                    getResourceLocationName(
                      resource
                    )
                  )}
                </span>
              </span>
            </span>
          </button>
        `;
      })
      .join("");
}

/* =========================================================
   MY BOOKINGS FILTERING
   ========================================================= */

function getFilteredMyBookings() {
  const search =
    normalizeText(
      bookingState.search
    );

  return bookingState.bookings
    .filter(isBookingOwner)
    .filter((booking) => {
      const resource =
        getBookingResource(
          booking
        );

      const searchableText = [
        getResourceName(
          booking
        ),
        getResourceCategoryName(
          resource
        ),
        getResourceLocationName(
          resource
        ),
        booking.purpose,
        booking.description,
        getBookingStatus(
          booking
        ),
        getApprovalStatus(
          booking
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
        !bookingState.statusFilter ||
        normalizeStatus(
          getBookingStatus(
            booking
          )
        ) ===
        normalizeStatus(
          bookingState.statusFilter
        );

      const matchesResource =
        !bookingState.resourceFilter ||
        String(
          getResourceId(
            booking
          )
        ) ===
        String(
          bookingState.resourceFilter
        );

      const matchesDate =
        !bookingState.dateFilter ||
        isSameDay(
          getBookingStart(
            booking
          ),
          bookingState.dateFilter
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesResource &&
        matchesDate
      );
    })
    .sort(
      (first, second) =>
        new Date(
          getBookingStart(
            second
          )
        ) -
        new Date(
          getBookingStart(
            first
          )
        )
    );
}

/* =========================================================
   MY BOOKINGS TABLE
   ========================================================= */

function renderMyBookings() {
  const tableBody =
    bookingElements
      .myBookingsTableBody;

  const tableContainer =
    bookingElements
      .myBookingsTableContainer;

  const emptyState =
    bookingElements
      .myBookingsEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  const bookings =
    getFilteredMyBookings();

  const total =
    bookings.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        BOOKING_CONFIG.PAGE_SIZE
      )
    );

  bookingState.currentPage =
    Math.min(
      bookingState.currentPage,
      totalPages
    );

  const startIndex =
    (
      bookingState.currentPage -
      1
    ) *
    BOOKING_CONFIG.PAGE_SIZE;

  const visible =
    bookings.slice(
      startIndex,
      startIndex +
      BOOKING_CONFIG.PAGE_SIZE
    );

  if (
    visible.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden =
      true;
    emptyState.hidden =
      false;

    updateBookingPagination(
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

  tableContainer.hidden =
    false;

  emptyState.hidden =
    true;

  tableBody.innerHTML =
    visible
      .map((booking) => {
        const id =
          getRecordId(booking);

        const resource =
          getBookingResource(
            booking
          );

        const status =
          getBookingStatus(
            booking
          );

        const approval =
          getApprovalStatus(
            booking
          );

        const canModify =
          canModifyBooking(
            booking
          );

        return `
          <tr class="booking-data-enter">
            <td>
              <button
                type="button"
                class="booking-resource text-left"
                data-view-booking="${escapeHTML(
                  id
                )}"
              >
                <span
                  class="booking-resource-icon"
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

                <span class="booking-resource-content">
                  <span class="booking-resource-name">
                    ${escapeHTML(
                      getResourceName(
                        booking
                      )
                    )}
                  </span>

                  <span class="booking-resource-category">
                    ${escapeHTML(
                      getResourceCategoryName(
                        resource
                      )
                    )}
                  </span>
                </span>
              </button>
            </td>

            <td>
              <div class="booking-schedule-cell">
                <span class="booking-schedule-date">
                  ${escapeHTML(
                    formatDate(
                      getBookingStart(
                        booking
                      )
                    )
                  )}
                </span>

                <span class="booking-schedule-time">
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

                  ${escapeHTML(
                    formatTime(
                      getBookingStart(
                        booking
                      )
                    )
                  )}

                  –

                  ${escapeHTML(
                    formatTime(
                      getBookingEnd(
                        booking
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <p class="booking-purpose-cell">
                ${escapeHTML(
                  booking.purpose ||
                  "No purpose provided."
                )}
              </p>
            </td>

            <td>
              <div class="booking-location-cell">
                <span class="booking-location-name">
                  ${escapeHTML(
                    getResourceLocationName(
                      resource
                    )
                  )}
                </span>

                <span class="booking-location-type">
                  ${escapeHTML(
                    getResourceCategoryName(
                      resource
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <span
                class="badge badge-dot ${approvalStatusBadgeClass(
                  approval
                )}"
              >
                ${escapeHTML(
                  approval
                )}
              </span>
            </td>

            <td>
              <span
                class="badge badge-dot ${bookingStatusBadgeClass(
                  status
                )}"
              >
                ${escapeHTML(
                  status
                )}
              </span>
            </td>

            <td class="text-right">
              <div class="booking-table-actions">
                <button
                  type="button"
                  class="btn btn-icon btn-outline"
                  data-view-booking="${escapeHTML(
                    id
                  )}"
                  aria-label="View booking"
                  title="View booking"
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
                  canModify
                    ? `
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        data-edit-booking="${escapeHTML(
                          id
                        )}"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        class="btn btn-danger-outline btn-sm"
                        data-cancel-booking="${escapeHTML(
                          id
                        )}"
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

  updateBookingPagination(
    startIndex + 1,
    Math.min(
      startIndex +
      BOOKING_CONFIG.PAGE_SIZE,
      total
    ),
    total
  );

  renderPagination(
    bookingState.currentPage,
    totalPages
  );
}

function canModifyBooking(
  booking
) {
  const status =
    getBookingStatus(
      booking
    );

  const approval =
    getApprovalStatus(
      booking
    );

  return (
    isBookingOwner(
      booking
    ) &&
    status === "Upcoming" &&
    normalizeStatus(approval) !==
      "rejected"
  );
}

/* =========================================================
   PAGINATION
   ========================================================= */

function updateBookingPagination(
  start,
  end,
  total
) {
  if (
    bookingElements
      .paginationSummary
  ) {
    bookingElements
      .paginationSummary
      .textContent =
        total === 0
          ? "Showing 0 bookings"
          : `Showing ${start}–${end} of ${total} bookings`;
  }
}

function renderPagination(
  currentPage,
  totalPages
) {
  const container =
    bookingElements.pagination;

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
        data-booking-page="${page}"
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
      data-booking-page="${
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
      data-booking-page="${
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
   APPROVAL FILTERING
   ========================================================= */

function getFilteredApprovals() {
  return bookingState.bookings
    .filter((booking) => {
      const approval =
        getApprovalStatus(
          booking
        );

      const matchesStatus =
        !bookingState
          .approvalStatusFilter ||
        normalizeStatus(approval) ===
        normalizeStatus(
          bookingState
            .approvalStatusFilter
        );

      const matchesDepartment =
        !bookingState
          .approvalDepartmentFilter ||
        String(
          getBookingDepartmentId(
            booking
          )
        ) ===
        String(
          bookingState
            .approvalDepartmentFilter
        );

      return (
        matchesStatus &&
        matchesDepartment
      );
    })
    .filter((booking) => {
      const resource =
        getBookingResource(
          booking
        );

      return (
        toBoolean(
          resource
            ?.requires_booking_approval ??
          booking.requires_approval,
          false
        ) ||
        normalizeStatus(
          getApprovalStatus(
            booking
          )
        ) !== "approved"
      );
    })
    .sort((first, second) => {
      const firstPriority =
        normalizeStatus(
          getApprovalStatus(first)
        ) === "pending"
          ? 0
          : 1;

      const secondPriority =
        normalizeStatus(
          getApprovalStatus(second)
        ) === "pending"
          ? 0
          : 1;

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
          getBookingStart(first)
        ) -
        new Date(
          getBookingStart(second)
        )
      );
    });
}

/* =========================================================
   APPROVAL TABLE
   ========================================================= */

function renderBookingApprovals() {
  const tableBody =
    bookingElements
      .approvalsTableBody;

  const tableContainer =
    bookingElements
      .approvalsTableContainer;

  const emptyState =
    bookingElements
      .approvalsEmptyState;

  if (
    !tableBody ||
    !tableContainer ||
    !emptyState
  ) {
    return;
  }

  if (
    !canApproveBookings()
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden =
      true;
    emptyState.hidden =
      false;

    return;
  }

  const bookings =
    getFilteredApprovals();

  if (
    bookings.length === 0
  ) {
    tableBody.innerHTML = "";
    tableContainer.hidden =
      true;
    emptyState.hidden =
      false;

    return;
  }

  tableContainer.hidden =
    false;

  emptyState.hidden =
    true;

  tableBody.innerHTML =
    bookings
      .map((booking) => {
        const id =
          getRecordId(booking);

        const resource =
          getBookingResource(
            booking
          );

        const approval =
          getApprovalStatus(
            booking
          );

        const pending =
          normalizeStatus(
            approval
          ) === "pending";

        const requester =
          getBookingUserName(
            booking
          );

        return `
          <tr class="booking-data-enter">
            <td>
              <div class="booking-resource">
                <div
                  class="booking-resource-icon"
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

                <div class="booking-resource-content">
                  <div class="booking-resource-name">
                    ${escapeHTML(
                      getResourceName(
                        booking
                      )
                    )}
                  </div>

                  <div class="booking-resource-category">
                    ${escapeHTML(
                      getResourceCategoryName(
                        resource
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <div class="booking-requester">
                <div
                  class="booking-requester-avatar"
                  aria-hidden="true"
                >
                  ${escapeHTML(
                    getInitials(
                      requester
                    )
                  )}
                </div>

                <div class="booking-requester-content">
                  <div class="booking-requester-name">
                    ${escapeHTML(
                      requester
                    )}
                  </div>

                  <div class="booking-requester-email">
                    ${escapeHTML(
                      getBookingUserEmail(
                        booking
                      ) ||
                      "No email"
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span class="table-secondary">
                ${escapeHTML(
                  getBookingDepartmentName(
                    booking
                  )
                )}
              </span>
            </td>

            <td>
              <div class="booking-schedule-cell">
                <span class="booking-schedule-date">
                  ${escapeHTML(
                    formatDate(
                      getBookingStart(
                        booking
                      )
                    )
                  )}
                </span>

                <span class="booking-schedule-time">
                  ${escapeHTML(
                    formatTime(
                      getBookingStart(
                        booking
                      )
                    )
                  )}

                  –

                  ${escapeHTML(
                    formatTime(
                      getBookingEnd(
                        booking
                      )
                    )
                  )}
                </span>
              </div>
            </td>

            <td>
              <p class="booking-purpose-cell">
                ${escapeHTML(
                  booking.purpose ||
                  "No purpose provided."
                )}
              </p>
            </td>

            <td>
              <span
                class="badge badge-dot ${approvalStatusBadgeClass(
                  approval
                )}"
              >
                ${escapeHTML(
                  approval
                )}
              </span>
            </td>

            <td class="text-right">
              <div class="booking-approval-actions">
                ${
                  pending
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-review-booking="${escapeHTML(
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
                        data-view-booking="${escapeHTML(
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
   COMPLETE RENDER
   ========================================================= */

function renderBookingPage() {
  populateReferenceOptions();
  renderBookingSummary();
  renderBookingCalendar();
  renderMyBookings();
  renderBookingApprovals();
  enforceBookingPermissions();
}

/* =========================================================
   TAB MANAGEMENT
   ========================================================= */

function activateBookingTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "availability",
    "bookings",
    "approvals"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName =
      "availability";
  }

  if (
    tabName === "approvals" &&
    !canApproveBookings()
  ) {
    tabName =
      "availability";
  }

  bookingState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-booking-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .bookingTab ===
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
      "[data-booking-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .bookingPanel ===
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
   FILTER RESET
   ========================================================= */

function resetBookingFilters() {
  bookingState.search = "";
  bookingState.statusFilter = "";
  bookingState.resourceFilter = "";
  bookingState.dateFilter = "";
  bookingState.currentPage = 1;

  if (
    bookingElements.searchInput
  ) {
    bookingElements.searchInput.value =
      "";
  }

  if (
    bookingElements.statusFilter
  ) {
    bookingElements.statusFilter.value =
      "";
  }

  if (
    bookingElements.resourceFilter
  ) {
    bookingElements.resourceFilter.value =
      "";
  }

  if (
    bookingElements.dateFilter
  ) {
    bookingElements.dateFilter.value =
      "";
  }

  renderMyBookings();
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
    errorContainer.hidden =
      true;

    errorContainer.textContent =
      "";
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
      "Unable to save the booking."
    );
  }
}

function validateRequiredFields(
  form
) {
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
   BOOKING FORM
   ========================================================= */

function resetBookingForm({
  selectedDate = null
} = {}) {
  if (
    !bookingElements.form
  ) {
    return;
  }

  bookingElements.form.reset();

  document.getElementById(
    "bookingId"
  ).value = "";

  document.getElementById(
    "bookingAttendeeCount"
  ).value = "1";

  document.getElementById(
    "bookingRecurring"
  ).checked = false;

  document.getElementById(
    "bookingPolicyAcknowledgement"
  ).checked = false;

  const baseDate =
    selectedDate
      ? new Date(selectedDate)
      : new Date();

  const now =
    new Date();

  let startHour = 9;

  if (
    isSameDay(
      baseDate,
      now
    )
  ) {
    startHour =
      Math.min(
        22,
        Math.max(
          9,
          now.getHours() + 1
        )
      );
  }

  const start =
    combineDateAndTime(
      baseDate,
      startHour,
      0
    );

  const end =
    new Date(
      start.getTime() +
      60 * 60 * 1000
    );

  bookingElements.startDateTime.value =
    toDateTimeLocal(start);

  bookingElements.endDateTime.value =
    toDateTimeLocal(end);

  bookingElements.resourcePreview.hidden =
    true;

  bookingElements.conflictAlert.hidden =
    true;

  bookingElements.recurrenceFields.hidden =
    true;

  document
    .querySelector(
      "[data-booking-form-title]"
    )
    .textContent =
      "Create Resource Booking";

  bookingElements.formSubmitButton.textContent =
    "Create Booking";

  const counter =
    document.querySelector(
      "[data-booking-description-count]"
    );

  if (counter) {
    counter.textContent = "0";
  }

  populateReferenceOptions();
  updateBookingDuration();

  clearFormState(
    bookingElements.form,
    bookingElements.formError
  );
}

function updateResourcePreview() {
  const resource =
    findResourceById(
      bookingElements
        .resourceSelect?.value
    );

  if (!resource) {
    bookingElements
      .resourcePreview.hidden =
      true;

    return;
  }

  document
    .querySelector(
      "[data-booking-preview-name]"
    )
    .textContent =
      resource.name ||
      "Unnamed Resource";

  document
    .querySelector(
      "[data-booking-preview-category]"
    )
    .textContent =
      getResourceCategoryName(
        resource
      );

  document
    .querySelector(
      "[data-booking-preview-location]"
    )
    .textContent =
      getResourceLocationName(
        resource
      );

  const status =
    document.querySelector(
      "[data-booking-preview-status]"
    );

  if (status) {
    const available =
      isResourceAvailableNow(
        resource
      );

    status.textContent =
      available
        ? "Available"
        : "In Use";

    status.className =
      `badge badge-dot ${
        available
          ? "badge-success"
          : "badge-warning"
      }`;
  }

  bookingElements
    .resourcePreview.hidden =
    false;

  detectBookingConflict();
}

function updateBookingDuration() {
  const start =
    new Date(
      bookingElements
        .startDateTime?.value
    );

  const end =
    new Date(
      bookingElements
        .endDateTime?.value
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end <= start
  ) {
    bookingElements
      .durationSummary.hidden =
      true;

    return;
  }

  const minutes =
    Math.round(
      (end - start) /
      (1000 * 60)
    );

  let durationText = "";

  if (minutes < 60) {
    durationText =
      `${minutes} minutes`;
  } else {
    const hours =
      Math.floor(
        minutes / 60
      );

    const remainingMinutes =
      minutes % 60;

    durationText =
      `${hours} ${
        hours === 1
          ? "hour"
          : "hours"
      }`;

    if (remainingMinutes) {
      durationText +=
        ` ${remainingMinutes} minutes`;
    }
  }

  const duration =
    document.querySelector(
      "[data-booking-duration]"
    );

  if (duration) {
    duration.textContent =
      durationText;
  }

  bookingElements
    .durationSummary.hidden =
    false;
}

function detectBookingConflict() {
  const resourceId =
    bookingElements
      .resourceSelect?.value;

  const start =
    bookingElements
      .startDateTime?.value;

  const end =
    bookingElements
      .endDateTime?.value;

  const bookingId =
    document.getElementById(
      "bookingId"
    ).value;

  if (
    !resourceId ||
    !start ||
    !end
  ) {
    bookingElements
      .conflictAlert.hidden =
      true;

    return [];
  }

  const conflicts =
    getConflictingBookings({
      resourceId,
      startTime: start,
      endTime: end,
      excludeBookingId:
        bookingId || null
    });

  bookingElements
    .conflictAlert.hidden =
    conflicts.length === 0;

  const message =
    document.querySelector(
      "[data-booking-conflict-message]"
    );

  if (
    message &&
    conflicts.length
  ) {
    const conflict =
      conflicts[0];

    message.textContent =
      `${getResourceName(
        conflict
      )} is already reserved from ` +
      `${formatDateTime(
        getBookingStart(
          conflict
        )
      )} to ${formatDateTime(
        getBookingEnd(
          conflict
        )
      )}.`;
  }

  return conflicts;
}

function toggleRecurrenceFields() {
  const recurring =
    bookingElements
      .recurringCheckbox.checked;

  bookingElements
    .recurrenceFields.hidden =
    !recurring;

  const recurrenceEnd =
    document.getElementById(
      "bookingRecurrenceEndDate"
    );

  if (
    recurring &&
    !recurrenceEnd.value
  ) {
    const start =
      new Date(
        bookingElements
          .startDateTime.value
      );

    recurrenceEnd.value =
      dateToISO(
        addDays(
          start,
          28
        )
      );
  }
}

function openBookingEditor(
  bookingId
) {
  const booking =
    findBookingById(
      bookingId
    );

  if (!booking) {
    showToast(
      "Booking could not be found.",
      "danger"
    );

    return;
  }

  if (
    !canModifyBooking(
      booking
    ) &&
    !canApproveBookings()
  ) {
    showToast(
      "This booking cannot be edited.",
      "danger"
    );

    return;
  }

  resetBookingForm();

  document.getElementById(
    "bookingId"
  ).value =
    getRecordId(booking);

  document.getElementById(
    "bookingResourceId"
  ).value =
    getResourceId(booking);

  document.getElementById(
    "bookingAttendeeCount"
  ).value =
    booking.attendee_count ||
    booking.attendees ||
    1;

  document.getElementById(
    "bookingStartDateTime"
  ).value =
    toDateTimeLocal(
      getBookingStart(
        booking
      )
    );

  document.getElementById(
    "bookingEndDateTime"
  ).value =
    toDateTimeLocal(
      getBookingEnd(
        booking
      )
    );

  document.getElementById(
    "bookingPurpose"
  ).value =
    booking.purpose || "";

  document.getElementById(
    "bookingDescription"
  ).value =
    booking.description || "";

  const recurring =
    toBoolean(
      booking.is_recurring,
      false
    );

  document.getElementById(
    "bookingRecurring"
  ).checked =
    recurring;

  document.getElementById(
    "bookingRecurrencePattern"
  ).value =
    booking.recurrence_pattern ||
    "Weekly";

  document.getElementById(
    "bookingRecurrenceEndDate"
  ).value =
    String(
      booking.recurrence_end_date ||
      ""
    ).slice(0, 10);

  document.getElementById(
    "bookingPolicyAcknowledgement"
  ).checked =
    true;

  document
    .querySelector(
      "[data-booking-form-title]"
    )
    .textContent =
      "Edit Resource Booking";

  bookingElements
    .formSubmitButton.textContent =
      "Update Booking";

  const counter =
    document.querySelector(
      "[data-booking-description-count]"
    );

  if (counter) {
    counter.textContent =
      String(
        (
          booking.description ||
          ""
        ).length
      );
  }

  toggleRecurrenceFields();
  updateResourcePreview();
  updateBookingDuration();

  closeModal(
    bookingElements.detailsModal
  );

  openModal(
    bookingElements.formModal
  );
}

function buildBookingPayload() {
  return {
    resource_id:
      document.getElementById(
        "bookingResourceId"
      ).value,

    asset_id:
      document.getElementById(
        "bookingResourceId"
      ).value,

    start_time:
      document.getElementById(
        "bookingStartDateTime"
      ).value,

    end_time:
      document.getElementById(
        "bookingEndDateTime"
      ).value,

    purpose:
      document.getElementById(
        "bookingPurpose"
      ).value.trim(),

    description:
      document.getElementById(
        "bookingDescription"
      ).value.trim() || null,

    attendee_count:
      Number(
        document.getElementById(
          "bookingAttendeeCount"
        ).value || 1
      ),

    is_recurring:
      document.getElementById(
        "bookingRecurring"
      ).checked,

    recurrence_pattern:
      document.getElementById(
        "bookingRecurring"
      ).checked
        ? document.getElementById(
            "bookingRecurrencePattern"
          ).value
        : null,

    recurrence_end_date:
      document.getElementById(
        "bookingRecurring"
      ).checked
        ? (
            document.getElementById(
              "bookingRecurrenceEndDate"
            ).value || null
          )
        : null
  };
}

async function submitBookingForm(
  event
) {
  event.preventDefault();

  const form =
    bookingElements.form;

  clearFormState(
    form,
    bookingElements.formError
  );

  if (
    !validateRequiredFields(
      form
    )
  ) {
    return;
  }

  const bookingId =
    document.getElementById(
      "bookingId"
    ).value;

  const payload =
    buildBookingPayload();

  const start =
    new Date(
      payload.start_time
    );

  const end =
    new Date(
      payload.end_time
    );

  if (end <= start) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        bookingElements
          .endDateTime,
        "End time must be after the start time."
      );

    return;
  }

  if (
    !bookingId &&
    start < new Date()
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        bookingElements
          .startDateTime,
        "New bookings cannot start in the past."
      );

    return;
  }

  if (
    payload.is_recurring &&
    !payload.recurrence_end_date
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "bookingRecurrenceEndDate"
        ),
        "Select an end date for the recurring booking."
      );

    return;
  }

  const conflicts =
    detectBookingConflict();

  if (conflicts.length) {
    showFormError(
      bookingElements.formError,
      "The selected resource has another booking during this time."
    );

    return;
  }

  setButtonLoading(
    bookingElements
      .formSubmitButton,
    true,
    bookingId
      ? "Updating..."
      : "Creating..."
  );

  try {
    if (bookingId) {
      const encodedId =
        encodeURIComponent(
          bookingId
        );

      await requestWithFallback(
        [
          `/bookings/${encodedId}`,
          `/resource-bookings/${encodedId}`
        ],
        {
          method: "PATCH",
          body: payload
        }
      );
    } else {
      await requestWithFallback(
        BOOKING_CONFIG
          .ENDPOINTS.BOOKINGS,
        {
          method: "POST",
          body: payload
        }
      );
    }

    closeModal(
      bookingElements.formModal
    );

    showToast(
      bookingId
        ? "Booking updated successfully."
        : "Booking created successfully.",
      "success"
    );

    await loadBookingData();

    activateBookingTab(
      "bookings"
    );
  } catch (error) {
    applyFormError(
      form,
      bookingElements.formError,
      error
    );
  } finally {
    setButtonLoading(
      bookingElements
        .formSubmitButton,
      false
    );
  }
}

/* =========================================================
   CANCEL BOOKING
   ========================================================= */

async function cancelBooking(
  bookingId
) {
  const booking =
    findBookingById(
      bookingId
    );

  if (!booking) {
    return;
  }

  if (
    !canModifyBooking(
      booking
    ) &&
    !canApproveBookings()
  ) {
    showToast(
      "This booking cannot be cancelled.",
      "danger"
    );

    return;
  }

  const confirmed =
    await window.AssetFlowUtils
      ?.confirmAction?.({
        title:
          "Cancel booking",

        message:
          `Cancel the booking for “${getResourceName(
            booking
          )}” on ${formatDate(
            getBookingStart(
              booking
            )
          )}?`,

        confirmText:
          "Cancel Booking",

        type:
          "danger"
      });

  if (!confirmed) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        bookingId
      );

    await requestWithFallback(
      [
        `/bookings/${encodedId}/cancel`,
        `/resource-bookings/${encodedId}/cancel`,
        `/bookings/${encodedId}`,
        `/resource-bookings/${encodedId}`
      ],
      {
        method: "PATCH",

        body: {
          status:
            "Cancelled",

          cancellation_reason:
            "Cancelled by user"
        }
      }
    );

    closeModal(
      bookingElements.detailsModal
    );

    showToast(
      "Booking cancelled successfully.",
      "success"
    );

    await loadBookingData();
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to cancel booking.",
      "danger"
    );
  }
}

/* =========================================================
   BOOKING DETAILS
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

function renderBookingDetails(
  booking
) {
  bookingState.selectedBookingId =
    getRecordId(booking);

  const resource =
    getBookingResource(
      booking
    );

  const status =
    getBookingStatus(
      booking
    );

  const approval =
    getApprovalStatus(
      booking
    );

  setDetailText(
    "[data-booking-detail-resource]",
    getResourceName(
      booking
    )
  );

  setDetailText(
    "[data-booking-detail-reference]",
    booking.reference ||
    booking.booking_reference ||
    `Booking #${getRecordId(
      booking
    )}`
  );

  setDetailText(
    "[data-booking-detail-user]",
    getBookingUserName(
      booking
    )
  );

  setDetailText(
    "[data-booking-detail-department]",
    getBookingDepartmentName(
      booking
    )
  );

  setDetailText(
    "[data-booking-detail-start]",
    formatDateTime(
      getBookingStart(
        booking
      )
    )
  );

  setDetailText(
    "[data-booking-detail-end]",
    formatDateTime(
      getBookingEnd(
        booking
      )
    )
  );

  setDetailText(
    "[data-booking-detail-location]",
    getResourceLocationName(
      resource
    )
  );

  setDetailText(
    "[data-booking-detail-attendees]",
    String(
      booking.attendee_count ||
      booking.attendees ||
      1
    )
  );

  setDetailText(
    "[data-booking-detail-purpose]",
    booking.purpose || "—"
  );

  setDetailText(
    "[data-booking-detail-description]",
    booking.description ||
    "No additional details were provided."
  );

  const statusElement =
    document.querySelector(
      "[data-booking-detail-status]"
    );

  if (statusElement) {
    statusElement.textContent =
      status;

    statusElement.className =
      `badge badge-dot ${bookingStatusBadgeClass(
        status
      )}`;
  }

  const approvalElement =
    document.querySelector(
      "[data-booking-detail-approval]"
    );

  if (approvalElement) {
    approvalElement.textContent =
      approval;

    approvalElement.className =
      `badge badge-dot ${approvalStatusBadgeClass(
        approval
      )}`;
  }

  const recurringSummary =
    document.querySelector(
      "[data-booking-recurring-summary]"
    );

  if (recurringSummary) {
    const recurring =
      toBoolean(
        booking.is_recurring,
        false
      );

    recurringSummary.hidden =
      !recurring;

    if (recurring) {
      setDetailText(
        "[data-booking-recurrence-text]",
        `${titleCase(
          booking.recurrence_pattern ||
          "Recurring"
        )} until ${formatDate(
          booking.recurrence_end_date
        )}`
      );
    }
  }

  const editButton =
    document.querySelector(
      "[data-edit-current-booking]"
    );

  const cancelButton =
    document.querySelector(
      "[data-cancel-current-booking]"
    );

  const modifiable =
    canModifyBooking(
      booking
    ) ||
    canApproveBookings();

  if (editButton) {
    editButton.hidden =
      !modifiable;
  }

  if (cancelButton) {
    cancelButton.hidden =
      !modifiable ||
      [
        "Completed",
        "Cancelled"
      ].includes(status);
  }
}

function bookingActivityColor(
  action = ""
) {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes(
      "approve"
    )
  ) {
    return "var(--color-success)";
  }

  if (
    normalized.includes(
      "reject"
    ) ||
    normalized.includes(
      "cancel"
    )
  ) {
    return "var(--color-danger)";
  }

  if (
    normalized.includes(
      "update"
    )
  ) {
    return "var(--color-info)";
  }

  return "var(--color-primary)";
}

function bookingActivityIcon(
  action = ""
) {
  const normalized =
    normalizeText(action);

  if (
    normalized.includes(
      "approve"
    )
  ) {
    return `
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m8 12 3 3 5-6"></path>
    `;
  }

  if (
    normalized.includes(
      "cancel"
    ) ||
    normalized.includes(
      "reject"
    )
  ) {
    return `
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m9 9 6 6"></path>
      <path d="m15 9-6 6"></path>
    `;
  }

  return `
    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
    <path d="M16 3v4"></path>
    <path d="M8 3v4"></path>
    <path d="M3 10h18"></path>
  `;
}

function renderBookingActivity(
  activity
) {
  const container =
    document.querySelector(
      "[data-booking-activity-timeline]"
    );

  const count =
    document.querySelector(
      "[data-booking-activity-count]"
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
          No booking activity
        </h3>

        <p class="state-description">
          Approval, editing and cancellation events will appear here.
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
          "Booking updated";

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

        const timestamp =
          item.timestamp ||
          item.created_at ||
          item.updated_at;

        return `
          <div class="timeline-item booking-data-enter">
            <div
              class="booking-activity-marker"
              style="
                --activity-color:
                  ${bookingActivityColor(
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
                ${bookingActivityIcon(
                  action
                )}
              </svg>
            </div>

            <div class="booking-activity-content">
              <h4 class="booking-activity-title">
                ${escapeHTML(
                  titleCase(action)
                )}
              </h4>

              <p class="booking-activity-description">
                ${escapeHTML(message)}
              </p>

              <p class="booking-activity-meta">
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

async function openBookingDetails(
  bookingId
) {
  let booking =
    findBookingById(
      bookingId
    );

  if (!booking) {
    showToast(
      "Booking could not be found.",
      "danger"
    );

    return;
  }

  renderBookingDetails(
    booking
  );

  renderBookingActivity([]);

  openModal(
    bookingElements.detailsModal
  );

  try {
    const [
      detailResult,
      activityResult
    ] = await Promise.allSettled([
      fetchBookingById(
        bookingId
      ),

      fetchBookingActivity(
        bookingId
      )
    ]);

    if (
      detailResult.status ===
      "fulfilled"
    ) {
      booking = {
        ...booking,
        ...detailResult.value
      };

      renderBookingDetails(
        booking
      );
    }

    if (
      activityResult.status ===
      "fulfilled"
    ) {
      renderBookingActivity(
        activityResult.value
      );
    }
  } catch (error) {
    console.error(
      "Booking details loading failed:",
      error
    );
  }
}

/* =========================================================
   BOOKING APPROVAL
   ========================================================= */

function clearApprovalModal() {
  bookingState.selectedBookingId =
    null;

  document.getElementById(
    "approvalBookingId"
  ).value = "";

  document.getElementById(
    "bookingApprovalComment"
  ).value = "";

  const counter =
    document.querySelector(
      "[data-booking-approval-comment-count]"
    );

  if (counter) {
    counter.textContent =
      "0";
  }

  if (
    bookingElements.approvalError
  ) {
    bookingElements
      .approvalError.hidden =
      true;

    bookingElements
      .approvalError.textContent =
      "";
  }
}

function openBookingApproval(
  bookingId
) {
  if (
    !canApproveBookings()
  ) {
    showToast(
      "You do not have permission to review booking requests.",
      "danger"
    );

    return;
  }

  const booking =
    findBookingById(
      bookingId
    );

  if (!booking) {
    showToast(
      "Booking could not be found.",
      "danger"
    );

    return;
  }

  clearApprovalModal();

  bookingState.selectedBookingId =
    bookingId;

  document.getElementById(
    "approvalBookingId"
  ).value =
    bookingId;

  const resource =
    getBookingResource(
      booking
    );

  setDetailText(
    "[data-approval-booking-resource]",
    getResourceName(
      booking
    )
  );

  setDetailText(
    "[data-approval-booking-location]",
    getResourceLocationName(
      resource
    )
  );

  setDetailText(
    "[data-approval-booking-user]",
    getBookingUserName(
      booking
    )
  );

  setDetailText(
    "[data-approval-booking-department]",
    getBookingDepartmentName(
      booking
    )
  );

  setDetailText(
    "[data-approval-booking-start]",
    formatDateTime(
      getBookingStart(
        booking
      )
    )
  );

  setDetailText(
    "[data-approval-booking-end]",
    formatDateTime(
      getBookingEnd(
        booking
      )
    )
  );

  setDetailText(
    "[data-approval-booking-purpose]",
    booking.purpose ||
    "No purpose provided."
  );

  const pending =
    normalizeStatus(
      getApprovalStatus(
        booking
      )
    ) === "pending";

  bookingElements.approveButton.hidden =
    !pending;

  bookingElements.rejectButton.hidden =
    !pending;

  openModal(
    bookingElements.approvalModal
  );
}

async function reviewBooking(
  decision
) {
  if (
    !canApproveBookings()
  ) {
    return;
  }

  const bookingId =
    document.getElementById(
      "approvalBookingId"
    ).value;

  const comment =
    document.getElementById(
      "bookingApprovalComment"
    ).value.trim() || null;

  const button =
    decision === "approve"
      ? bookingElements
          .approveButton
      : bookingElements
          .rejectButton;

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
        bookingId
      );

    const payload = {
      approval_status:
        decision === "approve"
          ? "Approved"
          : "Rejected",

      decision,
      review_comment:
        comment
    };

    await requestWithFallback(
      [
        `/bookings/${encodedId}/${decision}`,
        `/resource-bookings/${encodedId}/${decision}`,
        `/bookings/${encodedId}`,
        `/resource-bookings/${encodedId}`
      ],
      {
        method: "PATCH",
        body: payload
      }
    );

    closeModal(
      bookingElements.approvalModal
    );

    showToast(
      decision === "approve"
        ? "Booking approved successfully."
        : "Booking request rejected.",
      "success"
    );

    await loadBookingData();
  } catch (error) {
    showFormError(
      bookingElements.approvalError,
      error?.message ||
      "Unable to review the booking."
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadBookingData({
  showSuccessToast = false
} = {}) {
  if (
    bookingState.loading
  ) {
    return;
  }

  bookingState.abortController
    ?.abort();

  bookingState.abortController =
    new AbortController();

  const signal =
    bookingState
      .abortController.signal;

  setBookingLoading(true);
  hidePageError();

  try {
    const [
      bookingsResult,
      resourcesResult,
      categoriesResult,
      locationsResult,
      departmentsResult,
      usersResult
    ] = await Promise.allSettled([
      fetchBookings(signal),
      fetchResources(signal),
      fetchCategories(signal),
      fetchLocations(signal),
      fetchDepartments(signal),
      fetchUsers(signal)
    ]);

    if (
      bookingsResult.status ===
      "rejected"
    ) {
      throw bookingsResult.reason;
    }

    if (
      resourcesResult.status ===
      "rejected"
    ) {
      throw resourcesResult.reason;
    }

    bookingState.bookings =
      bookingsResult.value;

    bookingState.resources =
      resourcesResult.value;

    bookingState.categories =
      categoriesResult.status ===
      "fulfilled"
        ? categoriesResult.value
        : [];

    bookingState.locations =
      locationsResult.status ===
      "fulfilled"
        ? locationsResult.value
        : [];

    bookingState.departments =
      departmentsResult.status ===
      "fulfilled"
        ? departmentsResult.value
        : [];

    bookingState.users =
      usersResult.status ===
      "fulfilled"
        ? usersResult.value
        : [];

    renderBookingPage();
    updateLastUpdatedTime();

    if (showSuccessToast) {
      showToast(
        "Booking data refreshed.",
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
      "Booking data loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load booking data."
    );

    showToast(
      error?.message ||
      "Unable to load booking data.",
      "danger"
    );
  } finally {
    setBookingLoading(false);
  }
}

function updateLastUpdatedTime() {
  document
    .querySelectorAll(
      "[data-booking-last-updated]"
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

  const resourceId =
    parameters.get(
      "resource_id"
    );

  const bookingId =
    parameters.get(
      "booking_id"
    );

  const date =
    parameters.get("date");

  if (tab) {
    activateBookingTab(
      tab,
      {
        updateURL: false
      }
    );
  }

  if (date) {
    const selectedDate =
      new Date(
        `${date}T00:00:00`
      );

    if (
      !Number.isNaN(
        selectedDate.getTime()
      )
    ) {
      bookingState.selectedDate =
        selectedDate;

      bookingState.calendarDate =
        startOfMonth(
          selectedDate
        );

      renderBookingCalendar();
    }
  }

  if (resourceId) {
    resetBookingForm({
      selectedDate:
        bookingState.selectedDate
    });

    bookingElements
      .resourceSelect.value =
      resourceId;

    updateResourcePreview();

    openModal(
      bookingElements.formModal
    );
  }

  if (bookingId) {
    openBookingDetails(
      bookingId
    );
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const tab =
    event.target.closest(
      "[data-booking-tab]"
    );

  if (tab) {
    activateBookingTab(
      tab.dataset.bookingTab
    );

    return;
  }

  const previousMonth =
    event.target.closest(
      "[data-calendar-previous]"
    );

  if (previousMonth) {
    bookingState.calendarDate =
      addMonths(
        bookingState.calendarDate,
        -1
      );

    renderBookingCalendar();
    return;
  }

  const nextMonth =
    event.target.closest(
      "[data-calendar-next]"
    );

  if (nextMonth) {
    bookingState.calendarDate =
      addMonths(
        bookingState.calendarDate,
        1
      );

    renderBookingCalendar();
    return;
  }

  const todayButton =
    event.target.closest(
      "[data-calendar-today]"
    );

  if (todayButton) {
    bookingState.calendarDate =
      startOfMonth(
        new Date()
      );

    bookingState.selectedDate =
      startOfDay(
        new Date()
      );

    renderBookingCalendar();
    return;
  }

  const calendarDay =
    event.target.closest(
      "[data-calendar-date]"
    );

  if (calendarDay) {
    const selectedDate =
      new Date(
        `${calendarDay.dataset.calendarDate}T00:00:00`
      );

    bookingState.selectedDate =
      selectedDate;

    if (
      !isDateInMonth(
        selectedDate,
        bookingState.calendarDate
      )
    ) {
      bookingState.calendarDate =
        startOfMonth(
          selectedDate
        );
    }

    renderBookingCalendar();
    return;
  }

  const bookSelectedDay =
    event.target.closest(
      "[data-book-selected-day]"
    );

  if (bookSelectedDay) {
    resetBookingForm({
      selectedDate:
        bookingState.selectedDate
    });

    openModal(
      bookingElements.formModal
    );

    return;
  }

  const createBooking =
    event.target.closest(
      "[data-create-booking]"
    );

  if (createBooking) {
    resetBookingForm();
    return;
  }

  const pageButton =
    event.target.closest(
      "[data-booking-page]"
    );

  if (pageButton) {
    const page =
      Number(
        pageButton.dataset
          .bookingPage
      );

    if (
      Number.isFinite(page) &&
      page >= 1
    ) {
      bookingState.currentPage =
        page;

      renderMyBookings();
    }

    return;
  }

  const resetFilters =
    event.target.closest(
      "[data-reset-booking-filters]"
    );

  if (resetFilters) {
    resetBookingFilters();
    return;
  }

  const viewBooking =
    event.target.closest(
      "[data-view-booking]"
    );

  if (viewBooking) {
    openBookingDetails(
      viewBooking.dataset
        .viewBooking
    );

    return;
  }

  const editBooking =
    event.target.closest(
      "[data-edit-booking]"
    );

  if (editBooking) {
    openBookingEditor(
      editBooking.dataset
        .editBooking
    );

    return;
  }

  const cancelBookingButton =
    event.target.closest(
      "[data-cancel-booking]"
    );

  if (cancelBookingButton) {
    cancelBooking(
      cancelBookingButton.dataset
        .cancelBooking
    );

    return;
  }

  const reviewBookingButton =
    event.target.closest(
      "[data-review-booking]"
    );

  if (reviewBookingButton) {
    openBookingApproval(
      reviewBookingButton.dataset
        .reviewBooking
    );

    return;
  }

  const editCurrentBooking =
    event.target.closest(
      "[data-edit-current-booking]"
    );

  if (
    editCurrentBooking &&
    bookingState.selectedBookingId
  ) {
    openBookingEditor(
      bookingState.selectedBookingId
    );

    return;
  }

  const cancelCurrentBooking =
    event.target.closest(
      "[data-cancel-current-booking]"
    );

  if (
    cancelCurrentBooking &&
    bookingState.selectedBookingId
  ) {
    cancelBooking(
      bookingState.selectedBookingId
    );
  }
}

function bindBookingEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  bookingElements.refreshButton
    ?.addEventListener(
      "click",
      () => {
        loadBookingData({
          showSuccessToast: true
        });
      }
    );

  bookingElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadBookingData();
      }
    );

  bookingElements.form
    ?.addEventListener(
      "submit",
      submitBookingForm
    );

  bookingElements.approveButton
    ?.addEventListener(
      "click",
      () => {
        reviewBooking(
          "approve"
        );
      }
    );

  bookingElements.rejectButton
    ?.addEventListener(
      "click",
      () => {
        reviewBooking(
          "reject"
        );
      }
    );

  bookingElements.resourceSelect
    ?.addEventListener(
      "change",
      updateResourcePreview
    );

  bookingElements.startDateTime
    ?.addEventListener(
      "change",
      () => {
        updateBookingDuration();
        detectBookingConflict();
      }
    );

  bookingElements.endDateTime
    ?.addEventListener(
      "change",
      () => {
        updateBookingDuration();
        detectBookingConflict();
      }
    );

  bookingElements.recurringCheckbox
    ?.addEventListener(
      "change",
      toggleRecurrenceFields
    );

  bookingElements
    .calendarResourceFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.calendarResourceFilter =
          event.target.value;

        renderBookingCalendar();
      }
    );

  bookingElements
    .calendarCategoryFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.calendarCategoryFilter =
          event.target.value;

        renderBookingCalendar();
      }
    );

  bookingElements
    .calendarLocationFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.calendarLocationFilter =
          event.target.value;

        renderBookingCalendar();
      }
    );

  bookingElements.searchInput
    ?.addEventListener(
      "input",
      window.AssetFlowUtils
        ?.debounce?.(
          (event) => {
            bookingState.search =
              event.target.value;

            bookingState.currentPage =
              1;

            renderMyBookings();
          },
          250
        ) ||
        ((event) => {
          bookingState.search =
            event.target.value;

          bookingState.currentPage =
            1;

          renderMyBookings();
        })
    );

  bookingElements.statusFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.statusFilter =
          event.target.value;

        bookingState.currentPage =
          1;

        renderMyBookings();
      }
    );

  bookingElements.resourceFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.resourceFilter =
          event.target.value;

        bookingState.currentPage =
          1;

        renderMyBookings();
      }
    );

  bookingElements.dateFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.dateFilter =
          event.target.value;

        bookingState.currentPage =
          1;

        renderMyBookings();
      }
    );

  bookingElements
    .approvalStatusFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.approvalStatusFilter =
          event.target.value;

        renderBookingApprovals();
      }
    );

  bookingElements
    .approvalDepartmentFilter
    ?.addEventListener(
      "change",
      (event) => {
        bookingState.approvalDepartmentFilter =
          event.target.value;

        renderBookingApprovals();
      }
    );

  document
    .getElementById(
      "bookingDescription"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-booking-description-count]"
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
      "bookingApprovalComment"
    )
    ?.addEventListener(
      "input",
      (event) => {
        const counter =
          document.querySelector(
            "[data-booking-approval-comment-count]"
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

function initializeBookingHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "Resource Booking",

      subtitle:
        "Reserve shared organizational resources"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeBookingHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeResourceBooking() {
  if (
    bookingState.initialized
  ) {
    return;
  }

  bookingState.initialized =
    true;

  cacheBookingElements();
  enforceBookingPermissions();
  bindBookingEvents();
  initializeBookingHeader();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "availability";

  activateBookingTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadBookingData();

  processURLActions();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:bookings-ready"
    )
  );
}

/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    bookingState.abortController
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
    initializeResourceBooking
  );
} else {
  initializeResourceBooking();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowBookings =
  Object.freeze({
    initialize:
      initializeResourceBooking,

    refresh:
      loadBookingData,

    render:
      renderBookingPage,

    activateTab:
      activateBookingTab,

    openDetails:
      openBookingDetails,

    openEditor:
      openBookingEditor,

    openApproval:
      openBookingApproval,

    cancel:
      cancelBooking,

    resetFilters:
      resetBookingFilters,

    selectDate(date) {
      const selected =
        new Date(date);

      if (
        Number.isNaN(
          selected.getTime()
        )
      ) {
        return;
      }

      bookingState.selectedDate =
        startOfDay(selected);

      bookingState.calendarDate =
        startOfMonth(selected);

      renderBookingCalendar();
    },

    getState() {
      return {
        ...bookingState,
        abortController:
          undefined
      };
    }
  });