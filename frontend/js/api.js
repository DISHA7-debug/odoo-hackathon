/* =========================================================
   AssetFlow — Backend API Client
   File: frontend/js/api.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const API_CONFIG = Object.freeze({
  BASE_URL:
    window.ASSETFLOW_API_BASE_URL ||
    localStorage.getItem("assetflow_api_url") ||
    "http://localhost:3000/api/v1",

  TOKEN_KEY: "assetflow_token",
  USER_KEY: "assetflow_user",

  TIMEOUT: 20000
});

/* =========================================================
   CUSTOM API ERROR
   ========================================================= */

class ApiError extends Error {
  constructor({
    message = "Something went wrong. Please try again.",
    status = 0,
    field = null,
    data = null,
    endpoint = null
  } = {}) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.field = field;
    this.data = data;
    this.endpoint = endpoint;
  }
}

/* =========================================================
   AUTH STORAGE HELPERS
   ========================================================= */

function getAuthToken() {
  return localStorage.getItem(API_CONFIG.TOKEN_KEY);
}

function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    return;
  }

  localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
}

function getStoredUser() {
  const storedUser = localStorage.getItem(API_CONFIG.USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.warn("Invalid stored AssetFlow user data.");

    localStorage.removeItem(API_CONFIG.USER_KEY);

    return null;
  }
}

function setStoredUser(user) {
  if (!user) {
    localStorage.removeItem(API_CONFIG.USER_KEY);
    return;
  }

  localStorage.setItem(
    API_CONFIG.USER_KEY,
    JSON.stringify(user)
  );
}

function saveSession({ token, user } = {}) {
  if (token) {
    setAuthToken(token);
  }

  if (user) {
    setStoredUser(user);
  }
}

function clearSession() {
  localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  localStorage.removeItem(API_CONFIG.USER_KEY);
}

/* =========================================================
   URL HELPERS
   ========================================================= */

function normalizeEndpoint(endpoint = "") {
  if (!endpoint) {
    return "";
  }

  return endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (
          item !== undefined &&
          item !== null &&
          item !== ""
        ) {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

function buildApiUrl(endpoint, query = null) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  const queryString = query
    ? buildQueryString(query)
    : "";

  return `${API_CONFIG.BASE_URL}${normalizedEndpoint}${queryString}`;
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text || null;
}

function getErrorMessage(status, responseData) {
  if (
    responseData &&
    typeof responseData === "object" &&
    responseData.message
  ) {
    return responseData.message;
  }

  if (typeof responseData === "string" && responseData) {
    return responseData;
  }

  switch (status) {
    case 400:
      return "Please check the submitted information.";

    case 401:
      return "Your session has expired. Please log in again.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "The requested resource could not be found.";

    case 409:
      return "This action conflicts with existing data.";

    case 422:
      return "Some submitted fields are invalid.";

    case 429:
      return "Too many requests. Please try again shortly.";

    case 500:
      return "The server encountered an error.";

    case 502:
    case 503:
    case 504:
      return "The server is temporarily unavailable.";

    default:
      return "Something went wrong. Please try again.";
  }
}

/* =========================================================
   UNAUTHORIZED HANDLING
   ========================================================= */

function handleUnauthorized() {
  clearSession();

  window.dispatchEvent(
    new CustomEvent("assetflow:unauthorized")
  );

  const currentPath = window.location.pathname;
  const isLoginPage =
    currentPath.endsWith("/index.html") ||
    currentPath.endsWith("/") ||
    currentPath === "";

  if (!isLoginPage) {
    const loginPath = getLoginPagePath();

    window.location.href = loginPath;
  }
}

function getLoginPagePath() {
  const path = window.location.pathname;

  if (path.includes("/frontend/")) {
    const afterFrontend = path.split("/frontend/")[1] || "";
    const nestedDepth = afterFrontend
      .split("/")
      .filter(Boolean)
      .length;

    if (nestedDepth >= 2) {
      return "../index.html";
    }
  }

  return "../index.html";
}

/* =========================================================
   CORE REQUEST METHOD
   ========================================================= */

async function apiRequest(
  endpoint,
  {
    method = "GET",
    body = null,
    query = null,
    headers = {},
    auth = true,
    timeout = API_CONFIG.TIMEOUT,
    signal = null
  } = {}
) {
  const url = buildApiUrl(endpoint, query);
  const token = getAuthToken();

  const controller = new AbortController();
  let timeoutId = null;

  if (timeout > 0) {
    timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeout);
  }

  if (signal) {
    signal.addEventListener(
      "abort",
      () => controller.abort(),
      { once: true }
    );
  }

  const requestHeaders = {
    Accept: "application/json",
    ...headers
  };

  const isFormData = body instanceof FormData;
  const isUrlEncoded = body instanceof URLSearchParams;

  if (
    body !== null &&
    !isFormData &&
    !isUrlEncoded &&
    !requestHeaders["Content-Type"]
  ) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody = body;

  if (
    body !== null &&
    !isFormData &&
    !isUrlEncoded &&
    typeof body !== "string"
  ) {
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : requestBody,
      signal: controller.signal
    });

    const responseData = await parseResponseBody(response);

    if (!response.ok) {
      if (response.status === 401 && auth) {
        handleUnauthorized();
      }

      throw new ApiError({
        message: getErrorMessage(
          response.status,
          responseData
        ),
        status: response.status,
        field:
          responseData &&
          typeof responseData === "object"
            ? responseData.field || null
            : null,
        data: responseData,
        endpoint
      });
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiError({
        message:
          "The request took too long. Please try again.",
        status: 408,
        endpoint
      });
    }

    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes("fetch")
    ) {
      throw new ApiError({
        message:
          "Unable to connect to the AssetFlow server.",
        status: 0,
        endpoint
      });
    }

    throw new ApiError({
      message:
        error.message ||
        "An unexpected error occurred.",
      status: 0,
      endpoint
    });
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

/* =========================================================
   HTTP SHORTCUT METHODS
   ========================================================= */

function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "GET"
  });
}

function apiPost(endpoint, body = null, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "POST",
    body
  });
}

function apiPut(endpoint, body = null, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "PUT",
    body
  });
}

function apiPatch(endpoint, body = null, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "PATCH",
    body
  });
}

function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "DELETE"
  });
}

/* =========================================================
   AUTH ENDPOINTS
   ========================================================= */

const AuthAPI = {
  async signup({ name, email, password }) {
    return apiPost(
      "/auth/signup",
      {
        name,
        email,
        password
      },
      {
        auth: false
      }
    );
  },

  async login({ email, password }) {
    const response = await apiPost(
      "/auth/login",
      {
        email,
        password
      },
      {
        auth: false
      }
    );

    saveSession(response);

    return response;
  },

  async getCurrentUser() {
    const user = await apiGet("/auth/me");

    setStoredUser(user);

    return user;
  },

  logout() {
    clearSession();
  }
};

/* =========================================================
   DASHBOARD ENDPOINTS
   ========================================================= */

const DashboardAPI = {
  getKPIs() {
    return apiGet("/dashboard/kpis");
  }
};

/* =========================================================
   ORGANIZATION ENDPOINTS
   ========================================================= */

const OrganizationAPI = {
  getDepartments(query = {}) {
    return apiGet("/departments", { query });
  },

  createDepartment(data) {
    return apiPost("/departments", data);
  },

  updateDepartment(departmentId, data) {
    return apiPut(
      `/departments/${encodeURIComponent(departmentId)}`,
      data
    );
  },

  getCategories(query = {}) {
    return apiGet("/asset-categories", { query });
  },

  createCategory(data) {
    return apiPost("/asset-categories", data);
  },

  updateCategory(categoryId, data) {
    return apiPut(
      `/asset-categories/${encodeURIComponent(categoryId)}`,
      data
    );
  },

  getEmployees(query = {}) {
    return apiGet("/employees", { query });
  },

  updateEmployeeRole(employeeId, role) {
    return apiPut(
      `/employees/${encodeURIComponent(employeeId)}/role`,
      { role }
    );
  }
};

/* =========================================================
   ASSET ENDPOINTS
   ========================================================= */

const AssetsAPI = {
  getAssets(filters = {}) {
    return apiGet("/assets", {
      query: filters
    });
  },

  getAsset(assetId) {
    return apiGet(
      `/assets/${encodeURIComponent(assetId)}`
    );
  },

  createAsset(data) {
    return apiPost("/assets", data);
  },

  allocateAsset(assetId, data) {
    return apiPost(
      `/assets/${encodeURIComponent(assetId)}/allocate`,
      data
    );
  },

  returnAsset(assetId, data = {}) {
    return apiPost(
      `/assets/${encodeURIComponent(assetId)}/return`,
      data
    );
  },

  requestTransfer(assetId, toUserId) {
    return apiPost(
      `/assets/${encodeURIComponent(assetId)}/transfer-request`,
      {
        to_user_id: toUserId
      }
    );
  },

  approveTransferRequest(
    transferRequestId,
    decision
  ) {
    return apiPost(
      `/transfer-requests/${encodeURIComponent(
        transferRequestId
      )}/approve`,
      {
        decision
      }
    );
  }
};

/* =========================================================
   BOOKING ENDPOINTS
   ========================================================= */

const BookingsAPI = {
  getBookings(filters = {}) {
    return apiGet("/bookings", {
      query: filters
    });
  },

  createBooking({
    resource_asset_id,
    start_time,
    end_time
  }) {
    return apiPost("/bookings", {
      resource_asset_id,
      start_time,
      end_time
    });
  },

  cancelBooking(bookingId) {
    return apiPost(
      `/bookings/${encodeURIComponent(bookingId)}/cancel`
    );
  }
};

/* =========================================================
   MAINTENANCE ENDPOINTS
   ========================================================= */

const MaintenanceAPI = {
  getRequests(filters = {}) {
    return apiGet("/maintenance-requests", {
      query: filters
    });
  },

  createRequest({
    asset_id,
    issue_description,
    priority,
    photo_url = null
  }) {
    return apiPost("/maintenance-requests", {
      asset_id,
      issue_description,
      priority,
      ...(photo_url && { photo_url })
    });
  },

  updateStatus(requestId, status, additionalData = {}) {
    return apiPut(
      `/maintenance-requests/${encodeURIComponent(
        requestId
      )}/status`,
      {
        status,
        ...additionalData
      }
    );
  }
};

/* =========================================================
   AUDIT ENDPOINTS
   ========================================================= */

const AuditAPI = {
  createCycle(data) {
    return apiPost("/audit-cycles", data);
  },

  assignAuditor(cycleId, auditorId) {
    return apiPost(
      `/audit-cycles/${encodeURIComponent(
        cycleId
      )}/assign-auditor`,
      {
        auditor_id: auditorId
      }
    );
  },

  submitFinding(cycleId, finding) {
    return apiPost(
      `/audit-cycles/${encodeURIComponent(
        cycleId
      )}/findings`,
      finding
    );
  },

  closeCycle(cycleId) {
    return apiPost(
      `/audit-cycles/${encodeURIComponent(cycleId)}/close`
    );
  }
};

/* =========================================================
   REPORT ENDPOINTS
   ========================================================= */

const ReportsAPI = {
  getUtilization(filters = {}) {
    return apiGet("/reports/utilization", {
      query: filters
    });
  },

  getMaintenanceFrequency(filters = {}) {
    return apiGet(
      "/reports/maintenance-frequency",
      {
        query: filters
      }
    );
  },

  getDepartmentAllocation(filters = {}) {
    return apiGet(
      "/reports/department-allocation",
      {
        query: filters
      }
    );
  },

  getBookingHeatmap(filters = {}) {
    return apiGet("/reports/booking-heatmap", {
      query: filters
    });
  }
};

/* =========================================================
   NOTIFICATION ENDPOINTS
   ========================================================= */

const NotificationsAPI = {
  getNotifications(filters = {}) {
    return apiGet("/notifications", {
      query: filters
    });
  },

  markAsRead(notificationId) {
    return apiPut(
      `/notifications/${encodeURIComponent(
        notificationId
      )}/read`
    );
  }
};

/* =========================================================
   ACTIVITY LOG ENDPOINTS
   ========================================================= */

const ActivityLogsAPI = {
  getLogs(filters = {}) {
    return apiGet("/activity-logs", {
      query: filters
    });
  }
};

/* =========================================================
   FILE DOWNLOAD HELPER
   ========================================================= */

async function downloadApiFile(
  endpoint,
  {
    query = null,
    filename = "assetflow-export.csv"
  } = {}
) {
  const token = getAuthToken();
  const url = buildApiUrl(endpoint, query);

  try {
    const response = await fetch(url, {
      headers: {
        ...(token && {
          Authorization: `Bearer ${token}`
        })
      }
    });

    if (!response.ok) {
      const responseData =
        await parseResponseBody(response);

      throw new ApiError({
        message: getErrorMessage(
          response.status,
          responseData
        ),
        status: response.status,
        data: responseData,
        endpoint
      });
    }

    const blob = await response.blob();
    const downloadUrl =
      window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError({
      message: "Unable to download the requested file.",
      status: 0,
      endpoint
    });
  }
}

/* =========================================================
   CONNECTION TEST
   ========================================================= */

async function checkApiConnection() {
  try {
    await apiRequest("/auth/me", {
      timeout: 5000
    });

    return true;
  } catch (error) {
    return error.status === 401;
  }
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowAPI = Object.freeze({
  config: API_CONFIG,

  ApiError,

  request: apiRequest,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,

  buildQueryString,
  buildApiUrl,

  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  saveSession,
  clearSession,

  auth: AuthAPI,
  dashboard: DashboardAPI,
  organization: OrganizationAPI,
  assets: AssetsAPI,
  bookings: BookingsAPI,
  maintenance: MaintenanceAPI,
  audit: AuditAPI,
  reports: ReportsAPI,
  notifications: NotificationsAPI,
  activityLogs: ActivityLogsAPI,

  downloadFile: downloadApiFile,
  checkConnection: checkApiConnection
});
