/* =========================================================
   AssetFlow — Settings Controller
   File: frontend/settings/settings.js

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

const SETTINGS_CONFIG = Object.freeze({
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,

  ALLOWED_IMAGE_TYPES: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]),

  ADMIN_ONLY_TABS: Object.freeze([
    "organization",
    "system",
    "integrations"
  ]),

  ENDPOINTS: Object.freeze({
    PROFILE: [
      "/users/me",
      "/employees/me",
      "/profile",
      "/me"
    ],

    PROFILE_SETTINGS: [
      "/users/me/preferences",
      "/profile/preferences",
      "/settings/profile",
      "/preferences"
    ],

    NOTIFICATIONS: [
      "/users/me/notification-settings",
      "/notification-settings",
      "/settings/notifications",
      "/notifications/preferences"
    ],

    ORGANIZATION: [
      "/organizations/current",
      "/organization",
      "/settings/organization"
    ],

    SYSTEM: [
      "/system-settings",
      "/settings/system",
      "/organization/settings"
    ],

    SESSIONS: [
      "/auth/sessions",
      "/users/me/sessions",
      "/sessions"
    ],

    MFA_STATUS: [
      "/auth/mfa",
      "/auth/mfa/status",
      "/users/me/mfa"
    ],

    MFA_SETUP: [
      "/auth/mfa/setup",
      "/users/me/mfa/setup",
      "/mfa/setup"
    ],

    MFA_VERIFY: [
      "/auth/mfa/verify",
      "/users/me/mfa/verify",
      "/mfa/verify"
    ],

    MFA_DISABLE: [
      "/auth/mfa/disable",
      "/users/me/mfa/disable",
      "/mfa/disable"
    ],

    API_KEYS: [
      "/api-keys",
      "/settings/api-keys"
    ],

    WEBHOOKS: [
      "/webhooks",
      "/settings/webhooks"
    ],

    INTEGRATIONS: [
      "/integrations",
      "/settings/integrations"
    ]
  })
});

/* =========================================================
   STATE
   ========================================================= */

const settingsState = {
  profile: {},
  profilePreferences: {},
  notificationSettings: {},
  organization: {},
  systemSettings: {},

  sessions: [],
  apiKeys: [],
  webhooks: [],
  integrations: {},

  mfa: {
    enabled: false,
    setupData: null
  },

  activeTab: "profile",

  profilePhotoData: null,
  profilePhotoRemoved: false,

  organizationLogoData: null,
  organizationLogoRemoved: false,

  selectedSessionId: null,
  selectedWebhookId: null,

  formSnapshots: new Map(),
  dirtyForms: new Set(),

  loading: false,
  initialized: false,

  abortController: null
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const settingsElements = {};

function cacheSettingsElements() {
  settingsElements.main =
    document.getElementById(
      "settingsMain"
    );

  settingsElements.errorAlert =
    document.getElementById(
      "settingsPageErrorAlert"
    );

  settingsElements.errorMessage =
    document.getElementById(
      "settingsPageErrorMessage"
    );

  settingsElements.retryButton =
    document.querySelector(
      "[data-retry-settings]"
    );

  settingsElements.unsavedAlert =
    document.querySelector(
      "[data-unsaved-settings-alert]"
    );

  settingsElements.globalSaveButton =
    document.querySelector(
      "[data-save-current-settings]"
    );

  settingsElements.globalResetButton =
    document.querySelector(
      "[data-reset-current-settings]"
    );

  settingsElements.profileForm =
    document.getElementById(
      "profileSettingsForm"
    );

  settingsElements.profileError =
    document.querySelector(
      "[data-profile-settings-error]"
    );

  settingsElements.profileSubmit =
    document.querySelector(
      "[data-profile-settings-submit]"
    );

  settingsElements.passwordForm =
    document.getElementById(
      "passwordSettingsForm"
    );

  settingsElements.passwordError =
    document.querySelector(
      "[data-password-settings-error]"
    );

  settingsElements.passwordSubmit =
    document.querySelector(
      "[data-password-settings-submit]"
    );

  settingsElements.notificationForm =
    document.getElementById(
      "notificationSettingsForm"
    );

  settingsElements.notificationError =
    document.querySelector(
      "[data-notification-settings-error]"
    );

  settingsElements.notificationSubmit =
    document.querySelector(
      "[data-notification-settings-submit]"
    );

  settingsElements.organizationForm =
    document.getElementById(
      "organizationSettingsForm"
    );

  settingsElements.organizationError =
    document.querySelector(
      "[data-organization-settings-error]"
    );

  settingsElements.organizationSubmit =
    document.querySelector(
      "[data-organization-settings-submit]"
    );

  settingsElements.systemForm =
    document.getElementById(
      "systemSettingsForm"
    );

  settingsElements.systemError =
    document.querySelector(
      "[data-system-settings-error]"
    );

  settingsElements.systemSubmit =
    document.querySelector(
      "[data-system-settings-submit]"
    );

  settingsElements.profilePhotoInput =
    document.getElementById(
      "profilePhotoInput"
    );

  settingsElements.profilePhotoPreview =
    document.querySelector(
      "[data-profile-photo-preview]"
    );

  settingsElements.organizationLogoInput =
    document.getElementById(
      "organizationLogoInput"
    );

  settingsElements.organizationLogoPreview =
    document.querySelector(
      "[data-organization-logo-preview]"
    );

  settingsElements.activeSessionList =
    document.querySelector(
      "[data-active-session-list]"
    );

  settingsElements.apiKeyList =
    document.querySelector(
      "[data-api-key-list]"
    );

  settingsElements.webhookList =
    document.querySelector(
      "[data-webhook-list]"
    );

  settingsElements.disableMfaModal =
    document.getElementById(
      "disableMfaModal"
    );

  settingsElements.disableMfaForm =
    document.getElementById(
      "disableMfaForm"
    );

  settingsElements.disableMfaError =
    document.querySelector(
      "[data-disable-mfa-error]"
    );

  settingsElements.disableMfaSubmit =
    document.getElementById(
      "disableMfaSubmitButton"
    );

  settingsElements.revokeSessionModal =
    document.getElementById(
      "revokeSessionModal"
    );

  settingsElements.revokeSessionForm =
    document.getElementById(
      "revokeSessionForm"
    );

  settingsElements.revokeSessionError =
    document.querySelector(
      "[data-revoke-session-error]"
    );

  settingsElements.revokeSessionSubmit =
    document.getElementById(
      "revokeSessionSubmitButton"
    );

  settingsElements.apiKeyModal =
    document.getElementById(
      "createApiKeyModal"
    );

  settingsElements.apiKeyForm =
    document.getElementById(
      "createApiKeyForm"
    );

  settingsElements.apiKeyError =
    document.querySelector(
      "[data-api-key-error]"
    );

  settingsElements.apiKeySubmit =
    document.getElementById(
      "createApiKeySubmitButton"
    );

  settingsElements.apiKeyResult =
    document.querySelector(
      "[data-api-key-result]"
    );

  settingsElements.apiKeyFormFields =
    document.querySelector(
      "[data-api-key-form-fields]"
    );

  settingsElements.generatedApiKey =
    document.querySelector(
      "[data-generated-api-key]"
    );

  settingsElements.webhookModal =
    document.getElementById(
      "webhookModal"
    );

  settingsElements.webhookForm =
    document.getElementById(
      "webhookForm"
    );

  settingsElements.webhookError =
    document.querySelector(
      "[data-webhook-error]"
    );

  settingsElements.webhookSubmit =
    document.getElementById(
      "webhookSubmitButton"
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

function getRecordId(record) {
  return (
    record?.id ??
    record?.user_id ??
    record?.employee_id ??
    record?.session_id ??
    record?.api_key_id ??
    record?.webhook_id ??
    ""
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
    "disabled",
    "inactive",
    "off"
  ].includes(
    normalizeText(value)
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

function setInputValue(
  id,
  value
) {
  const input =
    document.getElementById(id);

  if (!input) {
    return;
  }

  input.value =
    value ?? "";
}

function setCheckboxValue(
  id,
  value,
  fallback = false
) {
  const input =
    document.getElementById(id);

  if (!input) {
    return;
  }

  input.checked =
    toBoolean(
      value,
      fallback
    );
}

function showFormError(
  container,
  message
) {
  if (!container) {
    return;
  }

  container.textContent =
    message;

  container.hidden = false;
}

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

function applyApiFormError(
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
      "Unable to save these settings."
    );
  }
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

function isAdmin() {
  return (
    getCurrentUser()?.role ===
    "Admin"
  );
}

function updateStoredUser(user) {
  const currentUser =
    getCurrentUser() || {};

  const updatedUser = {
    ...currentUser,
    ...user
  };

  localStorage.setItem(
    "assetflow_user",
    JSON.stringify(
      updatedUser
    )
  );

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:user-updated",
      {
        detail:
          updatedUser
      }
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

async function fetchOptionalObject(
  endpoints,
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

    return unwrapObject(response);
  } catch (error) {
    if (
      [404, 405].includes(
        error.status
      )
    ) {
      return {};
    }

    throw error;
  }
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
   FORM SERIALIZATION
   ========================================================= */

function serializeForm(form) {
  const data = {};

  if (!form) {
    return data;
  }

  const elements =
    Array.from(
      form.elements
    );

  const checkboxGroups =
    new Map();

  elements.forEach((element) => {
    if (
      !element.name ||
      element.disabled ||
      [
        "submit",
        "button",
        "reset",
        "file"
      ].includes(
        element.type
      )
    ) {
      return;
    }

    if (
      element.type ===
      "checkbox"
    ) {
      const sameName =
        form.querySelectorAll(
          `[name="${CSS.escape(
            element.name
          )}"]`
        );

      if (
        sameName.length > 1
      ) {
        if (
          !checkboxGroups.has(
            element.name
          )
        ) {
          checkboxGroups.set(
            element.name,
            []
          );
        }

        if (element.checked) {
          checkboxGroups
            .get(element.name)
            .push(element.value);
        }
      } else {
        data[element.name] =
          element.checked;
      }

      return;
    }

    if (
      element.type === "radio"
    ) {
      if (element.checked) {
        data[element.name] =
          element.value;
      }

      return;
    }

    if (
      element.type === "number"
    ) {
      data[element.name] =
        element.value === ""
          ? null
          : Number(
              element.value
            );

      return;
    }

    data[element.name] =
      element.value;
  });

  checkboxGroups.forEach(
    (values, name) => {
      data[name] = values;
    }
  );

  return data;
}

function normalizeSnapshotValue(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return [...value].sort();
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            normalizeSnapshotValue(
              value[key]
            );

          return result;
        },
        {}
      );
  }

  return value;
}

function getFormSnapshot(form) {
  return JSON.stringify(
    normalizeSnapshotValue(
      serializeForm(form)
    )
  );
}

/* =========================================================
   DIRTY STATE
   ========================================================= */

function captureFormSnapshot(form) {
  if (
    !form ||
    !form.dataset.settingsForm
  ) {
    return;
  }

  const key =
    form.dataset.settingsForm;

  settingsState.formSnapshots.set(
    key,
    getFormSnapshot(form)
  );

  settingsState.dirtyForms.delete(
    key
  );

  updateUnsavedState();
}

function captureAllFormSnapshots() {
  document
    .querySelectorAll(
      "[data-settings-form]"
    )
    .forEach(
      captureFormSnapshot
    );
}

function markFormDirty(form) {
  if (
    !form ||
    !form.dataset.settingsForm
  ) {
    return;
  }

  const key =
    form.dataset.settingsForm;

  const original =
    settingsState.formSnapshots
      .get(key);

  const current =
    getFormSnapshot(form);

  if (
    original !== current
  ) {
    settingsState.dirtyForms.add(
      key
    );
  } else {
    settingsState.dirtyForms.delete(
      key
    );
  }

  updateUnsavedState();
}

function markSectionClean(
  section
) {
  settingsState.dirtyForms.delete(
    section
  );

  const form =
    document.querySelector(
      `[data-settings-form="${section}"]`
    );

  if (form) {
    settingsState.formSnapshots.set(
      section,
      getFormSnapshot(form)
    );
  }

  updateUnsavedState();
}

function updateUnsavedState() {
  const dirty =
    settingsState.dirtyForms
      .size > 0;

  if (
    settingsElements.unsavedAlert
  ) {
    settingsElements
      .unsavedAlert.hidden =
      !dirty;
  }

  document.body.classList.toggle(
    "settings-has-unsaved-changes",
    dirty
  );
}

/* =========================================================
   ROLE VISIBILITY
   ========================================================= */

function applyRoleVisibility() {
  const administrator =
    isAdmin();

  document
    .querySelectorAll(
      "[data-admin-only]"
    )
    .forEach((element) => {
      element.hidden =
        !administrator;
    });

  if (
    !administrator &&
    SETTINGS_CONFIG
      .ADMIN_ONLY_TABS
      .includes(
        settingsState.activeTab
      )
  ) {
    activateSettingsTab(
      "profile"
    );
  }
}

/* =========================================================
   SETTINGS TABS
   ========================================================= */

function activateSettingsTab(
  tabName,
  {
    updateURL = true
  } = {}
) {
  const validTabs = [
    "profile",
    "security",
    "notifications",
    "organization",
    "system",
    "integrations"
  ];

  if (
    !validTabs.includes(
      tabName
    )
  ) {
    tabName =
      "profile";
  }

  if (
    !isAdmin() &&
    SETTINGS_CONFIG
      .ADMIN_ONLY_TABS
      .includes(tabName)
  ) {
    tabName =
      "profile";

    showToast(
      "Administrator access is required for this settings section.",
      "warning"
    );
  }

  settingsState.activeTab =
    tabName;

  document
    .querySelectorAll(
      "[data-settings-tab]"
    )
    .forEach((button) => {
      const active =
        button.dataset
          .settingsTab ===
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
      "[data-settings-panel]"
    )
    .forEach((panel) => {
      const active =
        panel.dataset
          .settingsPanel ===
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

  updateGlobalActionState();
}

function getActiveSettingsForm() {
  return document.querySelector(
    `[data-settings-form="${settingsState.activeTab}"]`
  );
}

function updateGlobalActionState() {
  const form =
    getActiveSettingsForm();

  if (
    settingsElements
      .globalSaveButton
  ) {
    settingsElements
      .globalSaveButton.hidden =
      !form;
  }

  if (
    settingsElements
      .globalResetButton
  ) {
    settingsElements
      .globalResetButton.hidden =
      !form;
  }
}

/* =========================================================
   LOADING STATE
   ========================================================= */

function setSettingsLoading(
  loading
) {
  settingsState.loading =
    Boolean(loading);

  document.body.classList.toggle(
    "settings-page-loading",
    settingsState.loading
  );

  if (
    settingsElements
      .globalSaveButton
  ) {
    settingsElements
      .globalSaveButton.disabled =
      settingsState.loading;
  }

  if (
    settingsElements
      .globalResetButton
  ) {
    settingsElements
      .globalResetButton.disabled =
      settingsState.loading;
  }
}

function showPageError(message) {
  if (
    settingsElements
      .errorAlert
  ) {
    settingsElements
      .errorAlert.hidden =
      false;
  }

  if (
    settingsElements
      .errorMessage
  ) {
    settingsElements
      .errorMessage.textContent =
      message;
  }
}

function hidePageError() {
  if (
    settingsElements
      .errorAlert
  ) {
    settingsElements
      .errorAlert.hidden =
      true;
  }
}

/* =========================================================
   IMAGE HELPERS
   ========================================================= */

function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      message:
        "Select an image file."
    };
  }

  if (
    !SETTINGS_CONFIG
      .ALLOWED_IMAGE_TYPES
      .includes(file.type)
  ) {
    return {
      valid: false,
      message:
        "Use a JPG, PNG or WebP image."
    };
  }

  if (
    file.size >
    SETTINGS_CONFIG.MAX_IMAGE_SIZE
  ) {
    return {
      valid: false,
      message:
        "The image must be smaller than 5 MB."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

function readFileAsDataURL(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(
          String(reader.result)
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read the selected image."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

function renderImagePreview(
  container,
  source,
  fallbackText
) {
  if (!container) {
    return;
  }

  if (source) {
    container.innerHTML = `
      <img
        src="${escapeHTML(source)}"
        alt=""
      />
    `;

    return;
  }

  container.textContent =
    fallbackText;
}

/* =========================================================
   PROFILE RENDERING
   ========================================================= */

function getProfileName() {
  return (
    settingsState.profile.name ||
    settingsState.profile.full_name ||
    getCurrentUser()?.name ||
    "AssetFlow User"
  );
}

function getProfileRole() {
  return (
    settingsState.profile.role ||
    getCurrentUser()?.role ||
    "Employee"
  );
}

function getProfileAvatar() {
  return (
    settingsState.profile.avatar_url ||
    settingsState.profile.profile_image ||
    settingsState.profile.avatar ||
    null
  );
}

function renderProfileHeader() {
  const name =
    getProfileName();

  const role =
    getProfileRole();

  setText(
    "[data-settings-profile-name]",
    name
  );

  setText(
    "[data-settings-profile-role]",
    titleCase(role)
  );

  renderImagePreview(
    document.querySelector(
      "[data-settings-profile-avatar]"
    ),
    getProfileAvatar(),
    getInitials(name)
  );

  renderImagePreview(
    settingsElements
      .profilePhotoPreview,
    settingsState
      .profilePhotoRemoved
      ? null
      : (
          settingsState
            .profilePhotoData ||
          getProfileAvatar()
        ),
    getInitials(name)
  );
}

function populateProfileForm() {
  const profile =
    settingsState.profile;

  const preferences =
    settingsState
      .profilePreferences;

  setInputValue(
    "settingsFullName",
    getProfileName()
  );

  setInputValue(
    "settingsEmail",
    profile.email ||
    getCurrentUser()?.email ||
    ""
  );

  setInputValue(
    "settingsPhone",
    profile.phone ||
    ""
  );

  setInputValue(
    "settingsJobTitle",
    profile.job_title ||
    profile.designation ||
    ""
  );

  setInputValue(
    "settingsDepartment",
    profile.department?.name ||
    profile.department_name ||
    "Unassigned"
  );

  setInputValue(
    "settingsEmployeeCode",
    profile.employee_code ||
    profile.staff_id ||
    ""
  );

  setInputValue(
    "settingsBio",
    profile.bio ||
    ""
  );

  setInputValue(
    "settingsLanguage",
    preferences.language ||
    profile.language ||
    "en"
  );

  setInputValue(
    "settingsTimezone",
    preferences.timezone ||
    profile.timezone ||
    "Asia/Kolkata"
  );

  setInputValue(
    "settingsDateFormat",
    preferences.date_format ||
    "DD/MM/YYYY"
  );

  setInputValue(
    "settingsTimeFormat",
    preferences.time_format ||
    "12"
  );

  updateBioCounter();
  renderProfileHeader();
}

/* =========================================================
   NOTIFICATION RENDERING
   ========================================================= */

function populateNotificationForm() {
  const settings =
    settingsState
      .notificationSettings;

  setCheckboxValue(
    "notificationEmailEnabled",
    settings.email_enabled,
    true
  );

  setCheckboxValue(
    "notificationInAppEnabled",
    settings.in_app_enabled,
    true
  );

  setCheckboxValue(
    "notificationSmsEnabled",
    settings.sms_enabled,
    false
  );

  const preferenceNames = [
    "allocation_email",
    "allocation_in_app",
    "allocation_sms",
    "booking_email",
    "booking_in_app",
    "booking_sms",
    "maintenance_email",
    "maintenance_in_app",
    "maintenance_sms",
    "approval_email",
    "approval_in_app",
    "approval_sms",
    "security_email",
    "security_in_app",
    "security_sms",
    "report_email",
    "report_in_app",
    "report_sms"
  ];

  preferenceNames.forEach(
    (name) => {
      const input =
        document.querySelector(
          `[name="${name}"]`
        );

      if (!input) {
        return;
      }

      const fallback =
        input.defaultChecked;

      input.checked =
        toBoolean(
          settings[name],
          fallback
        );
    }
  );

  setInputValue(
    "notificationDigestFrequency",
    settings.digest_frequency ||
    "none"
  );

  setInputValue(
    "notificationDigestTime",
    settings.digest_time ||
    "09:00"
  );

  setCheckboxValue(
    "quietHoursEnabled",
    settings.quiet_hours_enabled,
    false
  );

  setInputValue(
    "quietHoursStart",
    settings.quiet_hours_start ||
    "22:00"
  );

  setInputValue(
    "quietHoursEnd",
    settings.quiet_hours_end ||
    "07:00"
  );

  updateQuietHoursVisibility();
}

/* =========================================================
   ORGANIZATION RENDERING
   ========================================================= */

function getOrganizationName() {
  return (
    settingsState.organization.name ||
    settingsState.organization
      .organization_name ||
    "AssetFlow"
  );
}

function getOrganizationLogo() {
  return (
    settingsState.organization.logo_url ||
    settingsState.organization.logo ||
    null
  );
}

function populateOrganizationForm() {
  const organization =
    settingsState.organization;

  setInputValue(
    "organizationName",
    getOrganizationName()
  );

  setInputValue(
    "organizationCode",
    organization.code ||
    organization.organization_code ||
    ""
  );

  setInputValue(
    "organizationIndustry",
    organization.industry ||
    ""
  );

  setInputValue(
    "organizationRegistrationNumber",
    organization.registration_number ||
    ""
  );

  setInputValue(
    "organizationEmail",
    organization.contact_email ||
    organization.email ||
    ""
  );

  setInputValue(
    "organizationPhone",
    organization.contact_phone ||
    organization.phone ||
    ""
  );

  setInputValue(
    "organizationAddress",
    organization.address ||
    ""
  );

  setInputValue(
    "organizationCurrency",
    organization.currency ||
    "INR"
  );

  setInputValue(
    "organizationFiscalYearStart",
    organization
      .fiscal_year_start_month ||
    "4"
  );

  renderImagePreview(
    settingsElements
      .organizationLogoPreview,
    settingsState
      .organizationLogoRemoved
      ? null
      : (
          settingsState
            .organizationLogoData ||
          getOrganizationLogo()
        ),
    getInitials(
      getOrganizationName()
    )
  );
}

/* =========================================================
   SYSTEM SETTINGS RENDERING
   ========================================================= */

function populateSystemForm() {
  const settings =
    settingsState
      .systemSettings;

  setInputValue(
    "defaultAssetStatus",
    settings.default_asset_status ||
    "Available"
  );

  setInputValue(
    "assetTagPrefix",
    settings.asset_tag_prefix ||
    "AST"
  );

  setInputValue(
    "defaultUsefulLife",
    settings.default_useful_life_years ??
    5
  );

  setInputValue(
    "defaultDepreciationMethod",
    settings.depreciation_method ||
    "StraightLine"
  );

  setCheckboxValue(
    "requireAssetApproval",
    settings.require_asset_approval,
    false
  );

  setCheckboxValue(
    "requireAllocationApproval",
    settings.require_allocation_approval,
    true
  );

  setCheckboxValue(
    "requireBookingApproval",
    settings.require_booking_approval,
    true
  );

  setCheckboxValue(
    "preventBookingConflicts",
    settings.prevent_booking_conflicts,
    true
  );

  setCheckboxValue(
    "automaticReturnReminders",
    settings.automatic_return_reminders,
    true
  );

  setInputValue(
    "maximumBookingDays",
    settings.maximum_booking_days ??
    30
  );

  setInputValue(
    "returnReminderDays",
    settings.return_reminder_days ??
    3
  );

  setInputValue(
    "maintenanceEscalationHours",
    settings.maintenance_escalation_hours ??
    48
  );

  setInputValue(
    "auditRetentionDays",
    settings.audit_retention_days ??
    365
  );

  setCheckboxValue(
    "automaticMaintenanceEscalation",
    settings
      .automatic_maintenance_escalation,
    true
  );

  setCheckboxValue(
    "detailedAuditHistory",
    settings.detailed_audit_history,
    true
  );
}

/* =========================================================
   MFA RENDERING
   ========================================================= */

function renderMfaStatus() {
  const enabled =
    settingsState.mfa.enabled;

  const statusBadge =
    document.querySelector(
      "[data-mfa-status]"
    );

  const enableButton =
    document.querySelector(
      "[data-enable-mfa]"
    );

  const disableButton =
    document.querySelector(
      "[data-disable-mfa]"
    );

  if (statusBadge) {
    statusBadge.textContent =
      enabled
        ? "Enabled"
        : "Disabled";

    statusBadge.className =
      `badge badge-dot ${
        enabled
          ? "badge-success"
          : "badge-neutral"
      }`;
  }

  if (enableButton) {
    enableButton.hidden =
      enabled;
  }

  if (disableButton) {
    disableButton.hidden =
      !enabled;
  }
}

/* =========================================================
   SESSION RENDERING
   ========================================================= */

function getSessionDeviceName(session) {
  return (
    session.device_name ||
    session.device ||
    session.browser ||
    "Unknown Device"
  );
}

function getSessionLocation(session) {
  return (
    session.location ||
    session.city ||
    session.country ||
    "Location unavailable"
  );
}

function isCurrentSession(session) {
  return toBoolean(
    firstDefined(
      session,
      [
        "is_current",
        "current",
        "active_session"
      ],
      false
    ),
    false
  );
}

function sessionDeviceIcon(session) {
  const device =
    normalizeText(
      getSessionDeviceName(
        session
      )
    );

  if (
    device.includes("mobile") ||
    device.includes("android") ||
    device.includes("iphone")
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

  return `
    <rect
      x="3"
      y="4"
      width="18"
      height="14"
      rx="2"
    ></rect>

    <path d="M8 22h8"></path>
    <path d="M12 18v4"></path>
  `;
}

function renderSessions() {
  const container =
    settingsElements
      .activeSessionList;

  if (!container) {
    return;
  }

  if (
    settingsState.sessions
      .length === 0
  ) {
    container.innerHTML = `
      <div class="settings-empty-state">
        <div class="settings-empty-state-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="14"
              rx="2"
            ></rect>

            <path d="M8 22h8"></path>
            <path d="M12 18v4"></path>
          </svg>
        </div>

        <h3>
          No session information
        </h3>

        <p>
          Active sign-in sessions will appear here when session
          tracking is available.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    settingsState.sessions
      .map((session) => {
        const id =
          getRecordId(session);

        const current =
          isCurrentSession(session);

        return `
          <article
            class="active-session-item ${
              current
                ? "current"
                : ""
            } settings-data-enter"
          >
            <div
              class="active-session-icon"
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
                ${sessionDeviceIcon(
                  session
                )}
              </svg>
            </div>

            <div class="active-session-content">
              <div class="active-session-heading">
                <strong>
                  ${escapeHTML(
                    getSessionDeviceName(
                      session
                    )
                  )}
                </strong>

                ${
                  current
                    ? `
                      <span class="badge badge-success badge-dot">
                        Current Session
                      </span>
                    `
                    : ""
                }
              </div>

              <p>
                ${escapeHTML(
                  session.browser ||
                  session.user_agent ||
                  "Browser information unavailable"
                )}
              </p>

              <div class="active-session-meta">
                <span>
                  ${escapeHTML(
                    getSessionLocation(
                      session
                    )
                  )}
                </span>

                <span>
                  ${escapeHTML(
                    session.ip_address ||
                    "IP unavailable"
                  )}
                </span>

                <span>
                  Active
                  ${escapeHTML(
                    formatRelativeTime(
                      session.last_active_at ||
                      session.updated_at ||
                      session.created_at
                    )
                  )}
                </span>
              </div>
            </div>

            ${
              current
                ? ""
                : `
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    data-revoke-session="${escapeHTML(id)}"
                  >
                    Sign Out
                  </button>
                `
            }
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   API KEY RENDERING
   ========================================================= */

function getApiKeyStatus(key) {
  if (
    toBoolean(
      key.revoked,
      false
    ) ||
    normalizeStatus(
      key.status
    ) === "revoked"
  ) {
    return "Revoked";
  }

  if (key.expires_at) {
    const expiry =
      new Date(
        key.expires_at
      );

    if (
      !Number.isNaN(
        expiry.getTime()
      ) &&
      expiry < new Date()
    ) {
      return "Expired";
    }
  }

  return "Active";
}

function renderApiKeys() {
  const container =
    settingsElements.apiKeyList;

  if (!container) {
    return;
  }

  if (
    settingsState.apiKeys
      .length === 0
  ) {
    container.innerHTML = `
      <div class="settings-empty-state">
        <div class="settings-empty-state-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="15"
              r="4"
            ></circle>

            <path d="m11 12 8-8"></path>
            <path d="m15 4 5 5"></path>
          </svg>
        </div>

        <h3>
          No API keys
        </h3>

        <p>
          Create an API key when an approved external application
          needs access to AssetFlow.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    settingsState.apiKeys
      .map((key) => {
        const id =
          getRecordId(key);

        const status =
          getApiKeyStatus(key);

        const permissions =
          Array.isArray(
            key.permissions
          )
            ? key.permissions
                .join(", ")
            : (
                key.permissions ||
                "No permissions"
              );

        return `
          <article class="api-key-item settings-data-enter">
            <div
              class="api-key-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <circle
                  cx="8"
                  cy="15"
                  r="4"
                ></circle>

                <path d="m11 12 8-8"></path>
                <path d="m15 4 5 5"></path>
              </svg>
            </div>

            <div class="api-key-content">
              <div class="api-key-heading">
                <strong>
                  ${escapeHTML(
                    key.name ||
                    "Unnamed API Key"
                  )}
                </strong>

                <span
                  class="badge badge-dot ${
                    status === "Active"
                      ? "badge-success"
                      : "badge-neutral"
                  }"
                >
                  ${escapeHTML(status)}
                </span>
              </div>

              <p>
                ${escapeHTML(
                  key.key_prefix ||
                  key.prefix ||
                  "af_live_••••••••"
                )}
              </p>

              <div class="api-key-meta">
                <span>
                  Created
                  ${escapeHTML(
                    formatDate(
                      key.created_at
                    )
                  )}
                </span>

                <span>
                  Last used
                  ${escapeHTML(
                    key.last_used_at
                      ? formatRelativeTime(
                          key.last_used_at
                        )
                      : "never"
                  )}
                </span>

                <span>
                  ${escapeHTML(
                    permissions
                  )}
                </span>

                ${
                  key.expires_at
                    ? `
                      <span>
                        Expires
                        ${escapeHTML(
                          formatDate(
                            key.expires_at
                          )
                        )}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

            <div class="api-key-actions">
              ${
                status === "Active"
                  ? `
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      data-revoke-api-key="${escapeHTML(id)}"
                    >
                      Revoke
                    </button>
                  `
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");
}

/* =========================================================
   WEBHOOK RENDERING
   ========================================================= */

function getWebhookStatus(webhook) {
  return toBoolean(
    firstDefined(
      webhook,
      [
        "is_active",
        "active",
        "enabled"
      ],
      true
    ),
    true
  )
    ? "Active"
    : "Inactive";
}

function renderWebhooks() {
  const container =
    settingsElements.webhookList;

  if (!container) {
    return;
  }

  if (
    settingsState.webhooks
      .length === 0
  ) {
    container.innerHTML = `
      <div class="settings-empty-state">
        <div class="settings-empty-state-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            aria-hidden="true"
          >
            <path d="M8 9h8"></path>
            <path d="M8 13h6"></path>

            <rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
            ></rect>
          </svg>
        </div>

        <h3>
          No webhooks
        </h3>

        <p>
          Add a webhook to send AssetFlow events to another
          application.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    settingsState.webhooks
      .map((webhook) => {
        const id =
          getRecordId(webhook);

        const status =
          getWebhookStatus(
            webhook
          );

        const events =
          Array.isArray(
            webhook.events
          )
            ? webhook.events
                .join(", ")
            : (
                webhook.events ||
                "No events selected"
              );

        return `
          <article class="webhook-item settings-data-enter">
            <div
              class="webhook-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <path d="M8 9h8"></path>
                <path d="M8 13h6"></path>

                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                ></rect>
              </svg>
            </div>

            <div class="webhook-content">
              <div class="webhook-heading">
                <strong>
                  ${escapeHTML(
                    webhook.name ||
                    "Unnamed Webhook"
                  )}
                </strong>

                <span
                  class="badge badge-dot ${
                    status === "Active"
                      ? "badge-success"
                      : "badge-neutral"
                  }"
                >
                  ${escapeHTML(status)}
                </span>
              </div>

              <p title="${escapeHTML(
                webhook.url ||
                ""
              )}">
                ${escapeHTML(
                  webhook.url ||
                  "No URL configured"
                )}
              </p>

              <div class="webhook-meta">
                <span>
                  ${escapeHTML(events)}
                </span>

                <span>
                  Last delivery
                  ${escapeHTML(
                    webhook.last_delivery_at
                      ? formatRelativeTime(
                          webhook.last_delivery_at
                        )
                      : "never"
                  )}
                </span>

                ${
                  webhook.last_status_code
                    ? `
                      <span>
                        HTTP
                        ${escapeHTML(
                          webhook.last_status_code
                        )}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

            <div class="webhook-actions">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-test-webhook="${escapeHTML(id)}"
              >
                Test
              </button>

              <button
                type="button"
                class="btn btn-outline btn-sm"
                data-edit-webhook="${escapeHTML(id)}"
              >
                Edit
              </button>

              <button
                type="button"
                class="btn btn-danger btn-sm"
                data-delete-webhook="${escapeHTML(id)}"
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
   INTEGRATION RENDERING
   ========================================================= */

function renderIntegrationStatuses() {
  const integrations =
    settingsState.integrations;

  [
    "smtp",
    "sso",
    "teams",
    "slack"
  ].forEach((name) => {
    const data =
      integrations[name] ||
      integrations.find?.(
        (item) =>
          normalizeText(
            item.name ||
            item.type
          ) === name
      ) ||
      {};

    const connected =
      toBoolean(
        firstDefined(
          data,
          [
            "connected",
            "configured",
            "enabled",
            "is_active"
          ],
          false
        ),
        false
      );

    const status =
      document.querySelector(
        `[data-integration-status="${name}"]`
      );

    const button =
      document.querySelector(
        `[data-configure-integration="${name}"]`
      );

    if (status) {
      status.textContent =
        connected
          ? (
              name === "smtp" ||
              name === "sso"
                ? "Configured"
                : "Connected"
            )
          : (
              name === "smtp" ||
              name === "sso"
                ? "Not Configured"
                : "Not Connected"
            );

      status.className =
        `badge badge-dot ${
          connected
            ? "badge-success"
            : "badge-neutral"
        }`;
    }

    if (button) {
      button.textContent =
        connected
          ? "Manage"
          : (
              name === "smtp" ||
              name === "sso"
                ? "Configure"
                : "Connect"
            );
    }
  });
}

/* =========================================================
   COMPLETE RENDER
   ========================================================= */

function renderSettingsPage() {
  populateProfileForm();
  populateNotificationForm();

  if (isAdmin()) {
    populateOrganizationForm();
    populateSystemForm();
    renderApiKeys();
    renderWebhooks();
    renderIntegrationStatuses();
  }

  renderMfaStatus();
  renderSessions();
  applyRoleVisibility();

  requestAnimationFrame(
    captureAllFormSnapshots
  );
}

/* =========================================================
   VALIDATION
   ========================================================= */

function validateRequiredFields(form) {
  const fields =
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

  fields.forEach((field) => {
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

function validateEmail(field) {
  if (
    !field ||
    !field.value.trim()
  ) {
    return true;
  }

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        field.value.trim()
      );

  if (!valid) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        field,
        "Enter a valid email address."
      );
  }

  return valid;
}

function validateURL(field) {
  if (
    !field ||
    !field.value.trim()
  ) {
    return true;
  }

  try {
    const url =
      new URL(
        field.value.trim()
      );

    const valid =
      [
        "http:",
        "https:"
      ].includes(
        url.protocol
      );

    if (!valid) {
      throw new Error();
    }

    return true;
  } catch (error) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        field,
        "Enter a valid HTTP or HTTPS URL."
      );

    return false;
  }
}

/* =========================================================
   PROFILE IMAGE
   ========================================================= */

async function handleProfilePhoto(
  file
) {
  const validation =
    validateImageFile(file);

  if (!validation.valid) {
    showToast(
      validation.message,
      "warning"
    );

    settingsElements
      .profilePhotoInput.value =
      "";

    return;
  }

  try {
    settingsState.profilePhotoData =
      await readFileAsDataURL(file);

    settingsState.profilePhotoRemoved =
      false;

    renderImagePreview(
      settingsElements
        .profilePhotoPreview,
      settingsState
        .profilePhotoData,
      getInitials(
        getProfileName()
      )
    );

    settingsState.dirtyForms.add(
      "profile"
    );

    updateUnsavedState();
  } catch (error) {
    showToast(
      error.message,
      "danger"
    );
  }
}

function removeProfilePhoto() {
  settingsState.profilePhotoData =
    null;

  settingsState.profilePhotoRemoved =
    true;

  if (
    settingsElements
      .profilePhotoInput
  ) {
    settingsElements
      .profilePhotoInput.value =
      "";
  }

  renderImagePreview(
    settingsElements
      .profilePhotoPreview,
    null,
    getInitials(
      getProfileName()
    )
  );

  settingsState.dirtyForms.add(
    "profile"
  );

  updateUnsavedState();
}

/* =========================================================
   ORGANIZATION LOGO
   ========================================================= */

async function handleOrganizationLogo(
  file
) {
  const validation =
    validateImageFile(file);

  if (!validation.valid) {
    showToast(
      validation.message,
      "warning"
    );

    settingsElements
      .organizationLogoInput.value =
      "";

    return;
  }

  try {
    settingsState
      .organizationLogoData =
      await readFileAsDataURL(file);

    settingsState
      .organizationLogoRemoved =
      false;

    renderImagePreview(
      settingsElements
        .organizationLogoPreview,
      settingsState
        .organizationLogoData,
      getInitials(
        getOrganizationName()
      )
    );

    settingsState.dirtyForms.add(
      "organization"
    );

    updateUnsavedState();
  } catch (error) {
    showToast(
      error.message,
      "danger"
    );
  }
}

function removeOrganizationLogo() {
  settingsState.organizationLogoData =
    null;

  settingsState.organizationLogoRemoved =
    true;

  if (
    settingsElements
      .organizationLogoInput
  ) {
    settingsElements
      .organizationLogoInput.value =
      "";
  }

  renderImagePreview(
    settingsElements
      .organizationLogoPreview,
    null,
    getInitials(
      getOrganizationName()
    )
  );

  settingsState.dirtyForms.add(
    "organization"
  );

  updateUnsavedState();
}

/* =========================================================
   PROFILE FORM
   ========================================================= */

async function submitProfileSettings(
  event
) {
  event.preventDefault();

  const form =
    settingsElements.profileForm;

  clearFormState(
    form,
    settingsElements.profileError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  if (
    !validateEmail(
      document.getElementById(
        "settingsEmail"
      )
    )
  ) {
    return;
  }

  const formData =
    serializeForm(form);

  const profilePayload = {
    name:
      formData.name?.trim(),

    email:
      formData.email?.trim(),

    phone:
      formData.phone?.trim() ||
      null,

    job_title:
      formData.job_title?.trim() ||
      null,

    bio:
      formData.bio?.trim() ||
      null,

    ...(settingsState
      .profilePhotoData
      ? {
          avatar:
            settingsState
              .profilePhotoData
        }
      : {}),

    ...(settingsState
      .profilePhotoRemoved
      ? {
          remove_avatar:
            true
        }
      : {})
  };

  const preferencePayload = {
    language:
      formData.language,

    timezone:
      formData.timezone,

    date_format:
      formData.date_format,

    time_format:
      formData.time_format
  };

  setButtonLoading(
    settingsElements
      .profileSubmit,
    true,
    "Saving..."
  );

  try {
    const [
      profileResponse,
      preferenceResponse
    ] =
      await Promise.all([
        requestWithFallback(
          SETTINGS_CONFIG
            .ENDPOINTS.PROFILE,
          {
            method: "PATCH",
            body:
              profilePayload
          }
        ),

        requestWithFallback(
          SETTINGS_CONFIG
            .ENDPOINTS
            .PROFILE_SETTINGS,
          {
            method: "PATCH",
            body:
              preferencePayload
          }
        ).catch((error) => {
          if (
            [404, 405].includes(
              error.status
            )
          ) {
            return {};
          }

          throw error;
        })
      ]);

    settingsState.profile = {
      ...settingsState.profile,
      ...profilePayload,
      ...unwrapObject(
        profileResponse
      )
    };

    settingsState
      .profilePreferences = {
      ...settingsState
        .profilePreferences,
      ...preferencePayload,
      ...unwrapObject(
        preferenceResponse
      )
    };

    if (
      settingsState
        .profilePhotoRemoved
    ) {
      delete settingsState
        .profile.avatar_url;

      delete settingsState
        .profile.avatar;

      delete settingsState
        .profile.profile_image;
    }

    settingsState.profilePhotoData =
      null;

    settingsState.profilePhotoRemoved =
      false;

    updateStoredUser(
      settingsState.profile
    );

    renderProfileHeader();

    markSectionClean(
      "profile"
    );

    showToast(
      "Profile settings saved successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .profileError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .profileSubmit,
      false
    );
  }
}

/* =========================================================
   PASSWORD
   ========================================================= */

function getPasswordChecks(password) {
  return {
    length:
      password.length >= 8,

    uppercase:
      /[A-Z]/.test(password),

    lowercase:
      /[a-z]/.test(password),

    number:
      /\d/.test(password),

    symbol:
      /[^A-Za-z0-9]/.test(
        password
      )
  };
}

function updatePasswordStrength() {
  const password =
    document.getElementById(
      "newPassword"
    )?.value || "";

  const container =
    document.querySelector(
      "[data-security-password-strength]"
    );

  const bar =
    document.querySelector(
      "[data-security-password-strength-bar]"
    );

  const label =
    document.querySelector(
      "[data-security-password-strength-label]"
    );

  if (
    !container ||
    !bar ||
    !label
  ) {
    return;
  }

  const checks =
    getPasswordChecks(
      password
    );

  Object.entries(checks)
    .forEach(
      ([key, passed]) => {
        document
          .querySelectorAll(
            `[data-password-requirement="${key}"]`
          )
          .forEach((element) => {
            element.classList.toggle(
              "met",
              passed
            );
          });
      }
    );

  container.hidden =
    !password;

  if (!password) {
    return;
  }

  const score =
    Object.values(checks)
      .filter(Boolean)
      .length;

  const levels = [
    {
      width: 15,
      label: "Very weak",
      color:
        "var(--color-danger)"
    },

    {
      width: 30,
      label: "Weak",
      color:
        "var(--color-danger)"
    },

    {
      width: 50,
      label: "Fair",
      color:
        "var(--color-warning)"
    },

    {
      width: 70,
      label: "Good",
      color:
        "var(--color-info)"
    },

    {
      width: 88,
      label: "Strong",
      color:
        "var(--color-success)"
    },

    {
      width: 100,
      label: "Very strong",
      color:
        "var(--color-success)"
    }
  ];

  const level =
    levels[
      Math.min(
        score,
        levels.length - 1
      )
    ];

  bar.style.setProperty(
    "--password-strength",
    `${level.width}%`
  );

  bar.style.setProperty(
    "--password-strength-color",
    level.color
  );

  label.textContent =
    level.label;
}

function resetPasswordForm() {
  settingsElements
    .passwordForm?.reset();

  clearFormState(
    settingsElements
      .passwordForm,
    settingsElements
      .passwordError
  );

  updatePasswordStrength();
}

async function submitPasswordSettings(
  event
) {
  event.preventDefault();

  const form =
    settingsElements.passwordForm;

  clearFormState(
    form,
    settingsElements
      .passwordError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const currentPassword =
    document.getElementById(
      "currentPassword"
    ).value;

  const newPassword =
    document.getElementById(
      "newPassword"
    ).value;

  const confirmation =
    document.getElementById(
      "confirmNewPassword"
    ).value;

  const checks =
    getPasswordChecks(
      newPassword
    );

  if (
    !Object.values(checks)
      .every(Boolean)
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "newPassword"
        ),
        "The new password does not meet all requirements."
      );

    return;
  }

  if (
    newPassword !==
    confirmation
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "confirmNewPassword"
        ),
        "Passwords do not match."
      );

    return;
  }

  if (
    currentPassword ===
    newPassword
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "newPassword"
        ),
        "Choose a password different from your current password."
      );

    return;
  }

  setButtonLoading(
    settingsElements
      .passwordSubmit,
    true,
    "Updating..."
  );

  try {
    await requestWithFallback(
      [
        "/auth/change-password",
        "/users/me/change-password",
        "/profile/change-password"
      ],
      {
        method: "POST",

        body: {
          current_password:
            currentPassword,

          new_password:
            newPassword,

          confirm_password:
            confirmation
        }
      }
    );

    resetPasswordForm();

    showToast(
      "Password updated successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .passwordError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .passwordSubmit,
      false
    );
  }
}

/* =========================================================
   NOTIFICATION FORM
   ========================================================= */

function updateQuietHoursVisibility() {
  const enabled =
    document.getElementById(
      "quietHoursEnabled"
    )?.checked;

  const fields =
    document.querySelector(
      "[data-quiet-hours-fields]"
    );

  if (fields) {
    fields.hidden =
      !enabled;
  }
}

async function submitNotificationSettings(
  event
) {
  event.preventDefault();

  const form =
    settingsElements
      .notificationForm;

  clearFormState(
    form,
    settingsElements
      .notificationError
  );

  const payload =
    serializeForm(form);

  setButtonLoading(
    settingsElements
      .notificationSubmit,
    true,
    "Saving..."
  );

  try {
    const response =
      await requestWithFallback(
        SETTINGS_CONFIG
          .ENDPOINTS
          .NOTIFICATIONS,
        {
          method: "PATCH",
          body: payload
        }
      );

    settingsState
      .notificationSettings = {
      ...settingsState
        .notificationSettings,
      ...payload,
      ...unwrapObject(response)
    };

    markSectionClean(
      "notifications"
    );

    showToast(
      "Notification preferences saved successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .notificationError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .notificationSubmit,
      false
    );
  }
}

/* =========================================================
   ORGANIZATION FORM
   ========================================================= */

async function submitOrganizationSettings(
  event
) {
  event.preventDefault();

  if (!isAdmin()) {
    return;
  }

  const form =
    settingsElements
      .organizationForm;

  clearFormState(
    form,
    settingsElements
      .organizationError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  if (
    !validateEmail(
      document.getElementById(
        "organizationEmail"
      )
    )
  ) {
    return;
  }

  const payload =
    serializeForm(form);

  if (
    settingsState
      .organizationLogoData
  ) {
    payload.logo =
      settingsState
        .organizationLogoData;
  }

  if (
    settingsState
      .organizationLogoRemoved
  ) {
    payload.remove_logo =
      true;
  }

  setButtonLoading(
    settingsElements
      .organizationSubmit,
    true,
    "Saving..."
  );

  try {
    const response =
      await requestWithFallback(
        SETTINGS_CONFIG
          .ENDPOINTS
          .ORGANIZATION,
        {
          method: "PATCH",
          body: payload
        }
      );

    settingsState.organization = {
      ...settingsState.organization,
      ...payload,
      ...unwrapObject(response)
    };

    if (
      settingsState
        .organizationLogoRemoved
    ) {
      delete settingsState
        .organization.logo;

      delete settingsState
        .organization.logo_url;
    }

    settingsState
      .organizationLogoData =
      null;

    settingsState
      .organizationLogoRemoved =
      false;

    markSectionClean(
      "organization"
    );

    showToast(
      "Organization settings saved successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .organizationError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .organizationSubmit,
      false
    );
  }
}

/* =========================================================
   SYSTEM FORM
   ========================================================= */

async function submitSystemSettings(
  event
) {
  event.preventDefault();

  if (!isAdmin()) {
    return;
  }

  const form =
    settingsElements.systemForm;

  clearFormState(
    form,
    settingsElements
      .systemError
  );

  const payload =
    serializeForm(form);

  setButtonLoading(
    settingsElements
      .systemSubmit,
    true,
    "Saving..."
  );

  try {
    const response =
      await requestWithFallback(
        SETTINGS_CONFIG
          .ENDPOINTS.SYSTEM,
        {
          method: "PATCH",
          body: payload
        }
      );

    settingsState.systemSettings = {
      ...settingsState
        .systemSettings,
      ...payload,
      ...unwrapObject(response)
    };

    markSectionClean(
      "system"
    );

    showToast(
      "System settings saved successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .systemError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .systemSubmit,
      false
    );
  }
}

/* =========================================================
   FORM RESET
   ========================================================= */

function resetSettingsForm(section) {
  switch (section) {
    case "profile":
      settingsState.profilePhotoData =
        null;

      settingsState.profilePhotoRemoved =
        false;

      populateProfileForm();
      break;

    case "notifications":
      populateNotificationForm();
      break;

    case "organization":
      settingsState
        .organizationLogoData =
        null;

      settingsState
        .organizationLogoRemoved =
        false;

      populateOrganizationForm();
      break;

    case "system":
      populateSystemForm();
      break;

    case "security":
      resetPasswordForm();
      break;

    default:
      return;
  }

  markSectionClean(section);

  showToast(
    "Unsaved changes were reset.",
    "info"
  );
}

function saveCurrentSettings() {
  const form =
    getActiveSettingsForm();

  if (!form) {
    return;
  }

  form.requestSubmit();
}

function resetCurrentSettings() {
  resetSettingsForm(
    settingsState.activeTab
  );
}

/* =========================================================
   MFA SETUP MODAL
   ========================================================= */

function removeDynamicMfaModal() {
  document
    .getElementById(
      "enableMfaModal"
    )
    ?.remove();
}

function renderEnableMfaModal(
  setupData
) {
  removeDynamicMfaModal();

  const modal =
    document.createElement("div");

  modal.className =
    "modal-overlay";

  modal.id =
    "enableMfaModal";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  const recoveryCodes =
    Array.isArray(
      setupData.recovery_codes
    )
      ? setupData.recovery_codes
      : [];

  modal.innerHTML = `
    <section
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enableMfaModalTitle"
    >
      <header class="modal-header">
        <div class="modal-header-content">
          <h2
            class="modal-title"
            id="enableMfaModalTitle"
          >
            Enable Two-Factor Authentication
          </h2>

          <p class="modal-subtitle">
            Scan the QR code and verify a code from your
            authenticator application.
          </p>
        </div>

        <button
          type="button"
          class="modal-close"
          data-modal-close
          aria-label="Close two-factor setup"
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
      </header>

      <form
        id="enableMfaForm"
        novalidate
      >
        <div class="modal-body">
          <div
            class="alert alert-danger"
            data-enable-mfa-error
            role="alert"
            hidden
          ></div>

          <div class="mfa-setup-card">
            <div class="mfa-qr-code">
              ${
                setupData.qr_code ||
                setupData.qr_code_url
                  ? `
                    <img
                      src="${escapeHTML(
                        setupData.qr_code ||
                        setupData.qr_code_url
                      )}"
                      alt="Authenticator setup QR code"
                    />
                  `
                  : `
                    <div class="settings-empty-state">
                      <p>
                        QR code unavailable. Use the secret key below.
                      </p>
                    </div>
                  `
              }
            </div>

            <p class="mfa-secret">
              ${escapeHTML(
                setupData.secret ||
                setupData.manual_key ||
                "Secret unavailable"
              )}
            </p>

            ${
              recoveryCodes.length > 0
                ? `
                  <div class="recovery-code-grid">
                    ${recoveryCodes
                      .map(
                        (code) => `
                          <code class="recovery-code">
                            ${escapeHTML(code)}
                          </code>
                        `
                      )
                      .join("")}
                  </div>
                `
                : ""
            }
          </div>

          <div class="form-group mt-4">
            <label
              class="form-label-required"
              for="mfaVerificationCode"
            >
              Verification Code
            </label>

            <input
              class="form-control"
              type="text"
              id="mfaVerificationCode"
              name="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern="[0-9]{6}"
              minlength="6"
              maxlength="6"
              placeholder="000000"
              required
            />

            <div class="form-error"></div>
          </div>
        </div>

        <footer class="modal-footer">
          <button
            type="button"
            class="btn btn-outline"
            data-modal-close
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            id="enableMfaSubmitButton"
          >
            Verify and Enable
          </button>
        </footer>
      </form>
    </section>
  `;

  document.body.appendChild(
    modal
  );

  modal
    .querySelector(
      "[data-modal-close]"
    )
    .addEventListener(
      "click",
      () => {
        closeModal(modal);

        setTimeout(
          removeDynamicMfaModal,
          250
        );
      }
    );

  modal
    .querySelector(
      "#enableMfaForm"
    )
    .addEventListener(
      "submit",
      submitMfaVerification
    );

  openModal(modal);
}

async function beginMfaSetup() {
  const button =
    document.querySelector(
      "[data-enable-mfa]"
    );

  setButtonLoading(
    button,
    true,
    "Preparing..."
  );

  try {
    const response =
      await requestWithFallback(
        SETTINGS_CONFIG
          .ENDPOINTS
          .MFA_SETUP,
        {
          method: "POST",
          body: {}
        }
      );

    const setupData =
      unwrapObject(response);

    settingsState.mfa.setupData =
      setupData;

    renderEnableMfaModal(
      setupData
    );
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to start two-factor authentication setup.",
      "danger"
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

async function submitMfaVerification(
  event
) {
  event.preventDefault();

  const form =
    event.currentTarget;

  const errorContainer =
    form.querySelector(
      "[data-enable-mfa-error]"
    );

  clearFormState(
    form,
    errorContainer
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const code =
    document.getElementById(
      "mfaVerificationCode"
    ).value.trim();

  if (
    !/^\d{6}$/.test(code)
  ) {
    window.AssetFlowUtils
      ?.showFieldError?.(
        document.getElementById(
          "mfaVerificationCode"
        ),
        "Enter the 6-digit verification code."
      );

    return;
  }

  const submitButton =
    document.getElementById(
      "enableMfaSubmitButton"
    );

  setButtonLoading(
    submitButton,
    true,
    "Verifying..."
  );

  try {
    await requestWithFallback(
      SETTINGS_CONFIG
        .ENDPOINTS
        .MFA_VERIFY,
      {
        method: "POST",

        body: {
          code,

          secret:
            settingsState.mfa
              .setupData?.secret ||
            undefined
        }
      }
    );

    settingsState.mfa.enabled =
      true;

    renderMfaStatus();

    const modal =
      document.getElementById(
        "enableMfaModal"
      );

    closeModal(modal);

    setTimeout(
      removeDynamicMfaModal,
      250
    );

    showToast(
      "Two-factor authentication enabled successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      errorContainer,
      error
    );
  } finally {
    setButtonLoading(
      submitButton,
      false
    );
  }
}

async function submitDisableMfa(
  event
) {
  event.preventDefault();

  const form =
    settingsElements
      .disableMfaForm;

  clearFormState(
    form,
    settingsElements
      .disableMfaError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const password =
    document.getElementById(
      "disableMfaPassword"
    ).value;

  setButtonLoading(
    settingsElements
      .disableMfaSubmit,
    true,
    "Disabling..."
  );

  try {
    await requestWithFallback(
      SETTINGS_CONFIG
        .ENDPOINTS
        .MFA_DISABLE,
      {
        method: "POST",

        body: {
          password
        }
      }
    );

    settingsState.mfa.enabled =
      false;

    form.reset();

    closeModal(
      settingsElements
        .disableMfaModal
    );

    renderMfaStatus();

    showToast(
      "Two-factor authentication disabled.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .disableMfaError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .disableMfaSubmit,
      false
    );
  }
}

/* =========================================================
   SESSION ACTIONS
   ========================================================= */

function openRevokeSessionModal(
  sessionId
) {
  const session =
    settingsState.sessions
      .find(
        (item) =>
          String(
            getRecordId(item)
          ) ===
          String(sessionId)
      );

  if (!session) {
    showToast(
      "The selected session could not be found.",
      "danger"
    );

    return;
  }

  settingsState.selectedSessionId =
    sessionId;

  document.getElementById(
    "revokeSessionId"
  ).value =
    sessionId;

  setText(
    "[data-revoke-session-description]",
    `${getSessionDeviceName(
      session
    )} in ${getSessionLocation(
      session
    )} will need to sign in again.`
  );

  clearFormState(
    settingsElements
      .revokeSessionForm,
    settingsElements
      .revokeSessionError
  );

  openModal(
    settingsElements
      .revokeSessionModal
  );
}

async function submitRevokeSession(
  event
) {
  event.preventDefault();

  const sessionId =
    document.getElementById(
      "revokeSessionId"
    ).value;

  setButtonLoading(
    settingsElements
      .revokeSessionSubmit,
    true,
    "Signing out..."
  );

  try {
    const encodedId =
      encodeURIComponent(
        sessionId
      );

    await requestWithFallback(
      [
        `/auth/sessions/${encodedId}`,
        `/users/me/sessions/${encodedId}`,
        `/sessions/${encodedId}`
      ],
      {
        method: "DELETE"
      }
    );

    settingsState.sessions =
      settingsState.sessions
        .filter(
          (session) =>
            String(
              getRecordId(session)
            ) !==
            String(sessionId)
        );

    renderSessions();

    closeModal(
      settingsElements
        .revokeSessionModal
    );

    showToast(
      "The device was signed out successfully.",
      "success"
    );
  } catch (error) {
    showFormError(
      settingsElements
        .revokeSessionError,
      error?.message ||
      "Unable to revoke this session."
    );
  } finally {
    setButtonLoading(
      settingsElements
        .revokeSessionSubmit,
      false
    );
  }
}

async function signOutOtherSessions() {
  const otherSessions =
    settingsState.sessions
      .filter(
        (session) =>
          !isCurrentSession(
            session
          )
      );

  if (
    otherSessions.length === 0
  ) {
    showToast(
      "There are no other active sessions.",
      "info"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Sign out ${otherSessions.length} other active ${
        otherSessions.length === 1
          ? "session"
          : "sessions"
      }?`
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.querySelector(
      "[data-sign-out-other-sessions]"
    );

  setButtonLoading(
    button,
    true,
    "Signing out..."
  );

  try {
    await requestWithFallback(
      [
        "/auth/sessions/revoke-others",
        "/users/me/sessions/revoke-others",
        "/sessions/revoke-others"
      ],
      {
        method: "POST",
        body: {}
      }
    );

    settingsState.sessions =
      settingsState.sessions
        .filter(
          isCurrentSession
        );

    renderSessions();

    showToast(
      "All other sessions were signed out.",
      "success"
    );
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to sign out other sessions.",
      "danger"
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   ACCOUNT DEACTIVATION
   ========================================================= */

async function requestAccountDeactivation() {
  const confirmed =
    window.confirm(
      "Deactivate your AssetFlow account? You will be signed out and an administrator will be required to reactivate it."
    );

  if (!confirmed) {
    return;
  }

  const secondConfirmation =
    window.prompt(
      'Type "DEACTIVATE" to confirm.'
    );

  if (
    secondConfirmation !==
    "DEACTIVATE"
  ) {
    showToast(
      "Account deactivation was cancelled.",
      "info"
    );

    return;
  }

  const button =
    document.querySelector(
      "[data-request-account-deactivation]"
    );

  setButtonLoading(
    button,
    true,
    "Deactivating..."
  );

  try {
    await requestWithFallback(
      [
        "/users/me/deactivate",
        "/employees/me/deactivate",
        "/profile/deactivate"
      ],
      {
        method: "POST",

        body: {
          confirmation:
            "DEACTIVATE"
        }
      }
    );

    showToast(
      "Your account has been deactivated.",
      "success"
    );

    window.AssetFlowAuth
      ?.logout?.();

    setTimeout(() => {
      window.location.href =
        "../index.html";
    }, 800);
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to deactivate your account.",
      "danger"
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   API KEY FORM
   ========================================================= */

function resetApiKeyForm() {
  const form =
    settingsElements.apiKeyForm;

  form?.reset();

  if (
    settingsElements.apiKeyResult
  ) {
    settingsElements
      .apiKeyResult.hidden =
      true;
  }

  if (
    settingsElements
      .apiKeyFormFields
  ) {
    settingsElements
      .apiKeyFormFields.hidden =
      false;
  }

  if (
    settingsElements.apiKeySubmit
  ) {
    settingsElements
      .apiKeySubmit.hidden =
      false;

    settingsElements
      .apiKeySubmit.textContent =
      "Create Key";
  }

  clearFormState(
    form,
    settingsElements
      .apiKeyError
  );
}

async function submitApiKeyForm(
  event
) {
  event.preventDefault();

  const form =
    settingsElements.apiKeyForm;

  clearFormState(
    form,
    settingsElements
      .apiKeyError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  const payload =
    serializeForm(form);

  if (
    !Array.isArray(
      payload.permissions
    ) ||
    payload.permissions.length === 0
  ) {
    showFormError(
      settingsElements
        .apiKeyError,
      "Select at least one API permission."
    );

    return;
  }

  setButtonLoading(
    settingsElements
      .apiKeySubmit,
    true,
    "Creating..."
  );

  try {
    const response =
      await requestWithFallback(
        SETTINGS_CONFIG
          .ENDPOINTS.API_KEYS,
        {
          method: "POST",
          body: payload
        }
      );

    const result =
      unwrapObject(response);

    const rawKey =
      result.api_key ||
      result.key ||
      result.token;

    if (!rawKey) {
      throw new Error(
        "The API key was created, but its secret value was not returned."
      );
    }

    settingsElements
      .generatedApiKey
      .textContent =
      rawKey;

    settingsElements
      .apiKeyResult.hidden =
      false;

    settingsElements
      .apiKeyFormFields.hidden =
      true;

    settingsElements
      .apiKeySubmit.hidden =
      true;

    settingsState.apiKeys.unshift({
      ...payload,
      ...result,
      api_key:
        undefined,
      key:
        undefined,
      token:
        undefined
    });

    renderApiKeys();

    showToast(
      "API key created successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .apiKeyError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .apiKeySubmit,
      false
    );
  }
}

async function copyGeneratedApiKey() {
  const value =
    settingsElements
      .generatedApiKey
      ?.textContent
      ?.trim();

  if (!value) {
    return;
  }

  try {
    await navigator.clipboard
      .writeText(value);

    showToast(
      "API key copied to the clipboard.",
      "success"
    );
  } catch (error) {
    showToast(
      "Unable to copy the API key automatically.",
      "warning"
    );
  }
}

async function revokeApiKey(
  apiKeyId
) {
  const key =
    settingsState.apiKeys
      .find(
        (item) =>
          String(
            getRecordId(item)
          ) ===
          String(apiKeyId)
      );

  if (!key) {
    return;
  }

  const confirmed =
    window.confirm(
      `Revoke the API key "${key.name || "Unnamed API Key"}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        apiKeyId
      );

    await requestWithFallback(
      [
        `/api-keys/${encodedId}/revoke`,
        `/settings/api-keys/${encodedId}/revoke`,
        `/api-keys/${encodedId}`
      ],
      {
        method:
          "DELETE"
      }
    );

    settingsState.apiKeys =
      settingsState.apiKeys
        .filter(
          (item) =>
            String(
              getRecordId(item)
            ) !==
            String(apiKeyId)
        );

    renderApiKeys();

    showToast(
      "API key revoked successfully.",
      "success"
    );
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to revoke the API key.",
      "danger"
    );
  }
}

/* =========================================================
   WEBHOOK FORM
   ========================================================= */

function resetWebhookForm() {
  const form =
    settingsElements.webhookForm;

  form?.reset();

  document.getElementById(
    "webhookId"
  ).value =
    "";

  document.getElementById(
    "webhookActive"
  ).checked =
    true;

  setText(
    "[data-webhook-modal-title]",
    "Add Webhook"
  );

  settingsElements
    .webhookSubmit
    .textContent =
    "Add Webhook";

  settingsState.selectedWebhookId =
    null;

  clearFormState(
    form,
    settingsElements
      .webhookError
  );
}

function openWebhookEditor(
  webhookId
) {
  const webhook =
    settingsState.webhooks
      .find(
        (item) =>
          String(
            getRecordId(item)
          ) ===
          String(webhookId)
      );

  if (!webhook) {
    showToast(
      "The selected webhook could not be found.",
      "danger"
    );

    return;
  }

  resetWebhookForm();

  settingsState.selectedWebhookId =
    webhookId;

  document.getElementById(
    "webhookId"
  ).value =
    webhookId;

  setInputValue(
    "webhookName",
    webhook.name ||
    ""
  );

  setInputValue(
    "webhookUrl",
    webhook.url ||
    ""
  );

  const events =
    Array.isArray(
      webhook.events
    )
      ? webhook.events
      : String(
          webhook.events ||
          ""
        )
          .split(",")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

  settingsElements
    .webhookForm
    .querySelectorAll(
      '[name="events"]'
    )
    .forEach((input) => {
      input.checked =
        events.includes(
          input.value
        );
    });

  document.getElementById(
    "webhookActive"
  ).checked =
    toBoolean(
      firstDefined(
        webhook,
        [
          "is_active",
          "active",
          "enabled"
        ],
        true
      ),
      true
    );

  setText(
    "[data-webhook-modal-title]",
    "Edit Webhook"
  );

  settingsElements
    .webhookSubmit
    .textContent =
    "Save Changes";

  openModal(
    settingsElements
      .webhookModal
  );
}

async function submitWebhookForm(
  event
) {
  event.preventDefault();

  const form =
    settingsElements.webhookForm;

  clearFormState(
    form,
    settingsElements
      .webhookError
  );

  if (
    !validateRequiredFields(form)
  ) {
    return;
  }

  if (
    !validateURL(
      document.getElementById(
        "webhookUrl"
      )
    )
  ) {
    return;
  }

  const payload =
    serializeForm(form);

  if (
    !Array.isArray(
      payload.events
    ) ||
    payload.events.length === 0
  ) {
    showFormError(
      settingsElements
        .webhookError,
      "Select at least one webhook event."
    );

    return;
  }

  const webhookId =
    document.getElementById(
      "webhookId"
    ).value;

  delete payload.webhook_id;

  setButtonLoading(
    settingsElements
      .webhookSubmit,
    true,
    webhookId
      ? "Saving..."
      : "Adding..."
  );

  try {
    let response;

    if (webhookId) {
      const encodedId =
        encodeURIComponent(
          webhookId
        );

      response =
        await requestWithFallback(
          [
            `/webhooks/${encodedId}`,
            `/settings/webhooks/${encodedId}`
          ],
          {
            method: "PATCH",
            body: payload
          }
        );
    } else {
      response =
        await requestWithFallback(
          SETTINGS_CONFIG
            .ENDPOINTS.WEBHOOKS,
          {
            method: "POST",
            body: payload
          }
        );
    }

    const result =
      unwrapObject(response);

    if (webhookId) {
      settingsState.webhooks =
        settingsState.webhooks
          .map((webhook) =>
            String(
              getRecordId(webhook)
            ) ===
            String(webhookId)
              ? {
                  ...webhook,
                  ...payload,
                  ...result
                }
              : webhook
          );
    } else {
      settingsState.webhooks.unshift({
        ...payload,
        ...result
      });
    }

    renderWebhooks();

    closeModal(
      settingsElements
        .webhookModal
    );

    showToast(
      webhookId
        ? "Webhook updated successfully."
        : "Webhook added successfully.",
      "success"
    );
  } catch (error) {
    applyApiFormError(
      form,
      settingsElements
        .webhookError,
      error
    );
  } finally {
    setButtonLoading(
      settingsElements
        .webhookSubmit,
      false
    );
  }
}

async function testWebhook(
  webhookId
) {
  const webhook =
    settingsState.webhooks
      .find(
        (item) =>
          String(
            getRecordId(item)
          ) ===
          String(webhookId)
      );

  if (!webhook) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        webhookId
      );

    const response =
      await requestWithFallback(
        [
          `/webhooks/${encodedId}/test`,
          `/settings/webhooks/${encodedId}/test`
        ],
        {
          method: "POST",
          body: {}
        }
      );

    const result =
      unwrapObject(response);

    showToast(
      result.message ||
      "Webhook test delivered successfully.",
      "success"
    );
  } catch (error) {
    showToast(
      error?.message ||
      "The webhook test failed.",
      "danger"
    );
  }
}

async function deleteWebhook(
  webhookId
) {
  const webhook =
    settingsState.webhooks
      .find(
        (item) =>
          String(
            getRecordId(item)
          ) ===
          String(webhookId)
      );

  if (!webhook) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete the webhook "${webhook.name || "Unnamed Webhook"}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const encodedId =
      encodeURIComponent(
        webhookId
      );

    await requestWithFallback(
      [
        `/webhooks/${encodedId}`,
        `/settings/webhooks/${encodedId}`
      ],
      {
        method: "DELETE"
      }
    );

    settingsState.webhooks =
      settingsState.webhooks
        .filter(
          (item) =>
            String(
              getRecordId(item)
            ) !==
            String(webhookId)
        );

    renderWebhooks();

    showToast(
      "Webhook deleted successfully.",
      "success"
    );
  } catch (error) {
    showToast(
      error?.message ||
      "Unable to delete the webhook.",
      "danger"
    );
  }
}

/* =========================================================
   INTEGRATION CONFIGURATION
   ========================================================= */

async function configureIntegration(
  integrationName
) {
  const labelMap = {
    smtp:
      "SMTP Email",

    sso:
      "Single Sign-On",

    teams:
      "Microsoft Teams",

    slack:
      "Slack"
  };

  const label =
    labelMap[
      integrationName
    ] ||
    titleCase(
      integrationName
    );

  const value =
    window.prompt(
      `Enter the ${label} configuration URL, connection token or identifier.`
    );

  if (
    value === null ||
    !value.trim()
  ) {
    return;
  }

  try {
    const response =
      await requestWithFallback(
        [
          `/integrations/${encodeURIComponent(
            integrationName
          )}`,
          `/settings/integrations/${encodeURIComponent(
            integrationName
          )}`
        ],
        {
          method: "PATCH",

          body: {
            value:
              value.trim(),

            connected:
              true,

            enabled:
              true
          }
        }
      );

    settingsState.integrations[
      integrationName
    ] = {
      ...(settingsState
        .integrations[
          integrationName
        ] || {}),

      connected: true,
      enabled: true,

      ...unwrapObject(response)
    };

    renderIntegrationStatuses();

    showToast(
      `${label} configured successfully.`,
      "success"
    );
  } catch (error) {
    showToast(
      error?.message ||
      `Unable to configure ${label}.`,
      "danger"
    );
  }
}

/* =========================================================
   BIO COUNTER
   ========================================================= */

function updateBioCounter() {
  const input =
    document.getElementById(
      "settingsBio"
    );

  const counter =
    document.querySelector(
      "[data-profile-bio-count]"
    );

  if (
    input &&
    counter
  ) {
    counter.textContent =
      String(
        input.value.length
      );
  }
}

/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

function togglePasswordVisibility(
  button
) {
  const selector =
    button.dataset
      .passwordToggle;

  const input =
    document.querySelector(
      selector
    );

  if (!input) {
    return;
  }

  const hidden =
    input.type ===
    "password";

  input.type =
    hidden
      ? "text"
      : "password";

  button.setAttribute(
    "aria-label",
    hidden
      ? "Hide password"
      : "Show password"
  );
}

/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadSettingsData({
  showSuccessToast = false
} = {}) {
  if (
    settingsState.loading
  ) {
    return;
  }

  settingsState
    .abortController
    ?.abort();

  settingsState.abortController =
    new AbortController();

  const signal =
    settingsState
      .abortController.signal;

  setSettingsLoading(true);
  hidePageError();

  try {
    const requests = [
      fetchOptionalObject(
        SETTINGS_CONFIG
          .ENDPOINTS.PROFILE,
        signal
      ),

      fetchOptionalObject(
        SETTINGS_CONFIG
          .ENDPOINTS
          .PROFILE_SETTINGS,
        signal
      ),

      fetchOptionalObject(
        SETTINGS_CONFIG
          .ENDPOINTS
          .NOTIFICATIONS,
        signal
      ),

      fetchOptionalCollection(
        SETTINGS_CONFIG
          .ENDPOINTS.SESSIONS,
        [
          "sessions",
          "active_sessions"
        ],
        signal
      ),

      fetchOptionalObject(
        SETTINGS_CONFIG
          .ENDPOINTS
          .MFA_STATUS,
        signal
      )
    ];

    if (isAdmin()) {
      requests.push(
        fetchOptionalObject(
          SETTINGS_CONFIG
            .ENDPOINTS
            .ORGANIZATION,
          signal
        ),

        fetchOptionalObject(
          SETTINGS_CONFIG
            .ENDPOINTS.SYSTEM,
          signal
        ),

        fetchOptionalCollection(
          SETTINGS_CONFIG
            .ENDPOINTS.API_KEYS,
          [
            "api_keys",
            "keys"
          ],
          signal
        ),

        fetchOptionalCollection(
          SETTINGS_CONFIG
            .ENDPOINTS.WEBHOOKS,
          ["webhooks"],
          signal
        ),

        fetchOptionalObject(
          SETTINGS_CONFIG
            .ENDPOINTS
            .INTEGRATIONS,
          signal
        )
      );
    }

    const results =
      await Promise.allSettled(
        requests
      );

    const profileResult =
      results[0];

    if (
      profileResult.status ===
      "rejected"
    ) {
      throw profileResult.reason;
    }

    settingsState.profile = {
      ...(getCurrentUser() || {}),
      ...profileResult.value
    };

    settingsState
      .profilePreferences =
      results[1].status ===
      "fulfilled"
        ? results[1].value
        : {};

    settingsState
      .notificationSettings =
      results[2].status ===
      "fulfilled"
        ? results[2].value
        : {};

    settingsState.sessions =
      results[3].status ===
      "fulfilled"
        ? results[3].value
        : [];

    const mfaData =
      results[4].status ===
      "fulfilled"
        ? results[4].value
        : {};

    settingsState.mfa.enabled =
      toBoolean(
        firstDefined(
          mfaData,
          [
            "enabled",
            "is_enabled",
            "mfa_enabled",
            "two_factor_enabled"
          ],
          firstDefined(
            settingsState.profile,
            [
              "mfa_enabled",
              "two_factor_enabled"
            ],
            false
          )
        ),
        false
      );

    if (isAdmin()) {
      settingsState.organization =
        results[5].status ===
        "fulfilled"
          ? results[5].value
          : {};

      settingsState.systemSettings =
        results[6].status ===
        "fulfilled"
          ? results[6].value
          : {};

      settingsState.apiKeys =
        results[7].status ===
        "fulfilled"
          ? results[7].value
          : [];

      settingsState.webhooks =
        results[8].status ===
        "fulfilled"
          ? results[8].value
          : [];

      settingsState.integrations =
        results[9].status ===
        "fulfilled"
          ? results[9].value
          : {};
    }

    settingsState.profilePhotoData =
      null;

    settingsState.profilePhotoRemoved =
      false;

    settingsState.organizationLogoData =
      null;

    settingsState.organizationLogoRemoved =
      false;

    settingsState.dirtyForms.clear();

    renderSettingsPage();

    if (showSuccessToast) {
      showToast(
        "Settings refreshed successfully.",
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
      "Settings loading failed:",
      error
    );

    showPageError(
      error?.message ||
      "Unable to load settings."
    );

    showToast(
      error?.message ||
      "Unable to load settings.",
      "danger"
    );
  } finally {
    setSettingsLoading(false);
  }
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function handleDocumentClick(event) {
  const settingsTab =
    event.target.closest(
      "[data-settings-tab]"
    );

  if (settingsTab) {
    activateSettingsTab(
      settingsTab.dataset
        .settingsTab
    );

    return;
  }

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

  const resetFormButton =
    event.target.closest(
      "[data-reset-settings-form]"
    );

  if (resetFormButton) {
    resetSettingsForm(
      resetFormButton.dataset
        .resetSettingsForm
    );

    return;
  }

  if (
    event.target.closest(
      "[data-save-current-settings]"
    )
  ) {
    saveCurrentSettings();
    return;
  }

  if (
    event.target.closest(
      "[data-reset-current-settings]"
    )
  ) {
    resetCurrentSettings();
    return;
  }

  if (
    event.target.closest(
      "[data-remove-profile-photo]"
    )
  ) {
    removeProfilePhoto();
    return;
  }

  if (
    event.target.closest(
      "[data-remove-organization-logo]"
    )
  ) {
    removeOrganizationLogo();
    return;
  }

  if (
    event.target.closest(
      "[data-enable-mfa]"
    )
  ) {
    beginMfaSetup();
    return;
  }

  if (
    event.target.closest(
      "[data-sign-out-other-sessions]"
    )
  ) {
    signOutOtherSessions();
    return;
  }

  const revokeSession =
    event.target.closest(
      "[data-revoke-session]"
    );

  if (revokeSession) {
    openRevokeSessionModal(
      revokeSession.dataset
        .revokeSession
    );

    return;
  }

  if (
    event.target.closest(
      "[data-request-account-deactivation]"
    )
  ) {
    requestAccountDeactivation();
    return;
  }

  if (
    event.target.closest(
      "[data-create-api-key]"
    )
  ) {
    resetApiKeyForm();
    return;
  }

  if (
    event.target.closest(
      "[data-copy-api-key]"
    )
  ) {
    copyGeneratedApiKey();
    return;
  }

  const revokeKey =
    event.target.closest(
      "[data-revoke-api-key]"
    );

  if (revokeKey) {
    revokeApiKey(
      revokeKey.dataset
        .revokeApiKey
    );

    return;
  }

  if (
    event.target.closest(
      "[data-create-webhook]"
    )
  ) {
    resetWebhookForm();
    return;
  }

  const editWebhook =
    event.target.closest(
      "[data-edit-webhook]"
    );

  if (editWebhook) {
    openWebhookEditor(
      editWebhook.dataset
        .editWebhook
    );

    return;
  }

  const testWebhookButton =
    event.target.closest(
      "[data-test-webhook]"
    );

  if (testWebhookButton) {
    testWebhook(
      testWebhookButton.dataset
        .testWebhook
    );

    return;
  }

  const deleteWebhookButton =
    event.target.closest(
      "[data-delete-webhook]"
    );

  if (deleteWebhookButton) {
    deleteWebhook(
      deleteWebhookButton.dataset
        .deleteWebhook
    );

    return;
  }

  const integrationButton =
    event.target.closest(
      "[data-configure-integration]"
    );

  if (integrationButton) {
    configureIntegration(
      integrationButton.dataset
        .configureIntegration
    );
  }
}

function bindSettingsEvents() {
  document.addEventListener(
    "click",
    handleDocumentClick,
    true
  );

  settingsElements.retryButton
    ?.addEventListener(
      "click",
      () => {
        loadSettingsData();
      }
    );

  settingsElements.profileForm
    ?.addEventListener(
      "submit",
      submitProfileSettings
    );

  settingsElements.passwordForm
    ?.addEventListener(
      "submit",
      submitPasswordSettings
    );

  settingsElements.notificationForm
    ?.addEventListener(
      "submit",
      submitNotificationSettings
    );

  settingsElements.organizationForm
    ?.addEventListener(
      "submit",
      submitOrganizationSettings
    );

  settingsElements.systemForm
    ?.addEventListener(
      "submit",
      submitSystemSettings
    );

  settingsElements.disableMfaForm
    ?.addEventListener(
      "submit",
      submitDisableMfa
    );

  settingsElements.revokeSessionForm
    ?.addEventListener(
      "submit",
      submitRevokeSession
    );

  settingsElements.apiKeyForm
    ?.addEventListener(
      "submit",
      submitApiKeyForm
    );

  settingsElements.webhookForm
    ?.addEventListener(
      "submit",
      submitWebhookForm
    );

  settingsElements.profilePhotoInput
    ?.addEventListener(
      "change",
      (event) => {
        handleProfilePhoto(
          event.target.files?.[0]
        );
      }
    );

  settingsElements.organizationLogoInput
    ?.addEventListener(
      "change",
      (event) => {
        handleOrganizationLogo(
          event.target.files?.[0]
        );
      }
    );

  document
    .getElementById(
      "settingsBio"
    )
    ?.addEventListener(
      "input",
      updateBioCounter
    );

  document
    .getElementById(
      "newPassword"
    )
    ?.addEventListener(
      "input",
      updatePasswordStrength
    );

  document
    .getElementById(
      "quietHoursEnabled"
    )
    ?.addEventListener(
      "change",
      updateQuietHoursVisibility
    );

  document
    .querySelectorAll(
      "[data-settings-form]"
    )
    .forEach((form) => {
      const handleDirty =
        debounce(
          () => {
            markFormDirty(form);
          },
          80
        );

      form.addEventListener(
        "input",
        handleDirty
      );

      form.addEventListener(
        "change",
        handleDirty
      );
    });

  window.addEventListener(
    "beforeunload",
    (event) => {
      settingsState
        .abortController
        ?.abort();

      if (
        settingsState.dirtyForms
          .size > 0
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
  );
}

/* =========================================================
   SHARED HEADER
   ========================================================= */

function initializeSettingsHeader() {
  window.AssetFlowLoader
    ?.setPageHeader?.({
      title:
        "Settings",

      subtitle:
        "Profile, security and system preferences"
    });
}

window.addEventListener(
  "assetflow:components-ready",
  initializeSettingsHeader
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeSettings() {
  if (
    settingsState.initialized
  ) {
    return;
  }

  settingsState.initialized =
    true;

  cacheSettingsElements();
  bindSettingsEvents();
  initializeSettingsHeader();
  applyRoleVisibility();

  const initialTab =
    new URLSearchParams(
      window.location.search
    ).get("tab") ||
    "profile";

  activateSettingsTab(
    initialTab,
    {
      updateURL: false
    }
  );

  await loadSettingsData();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:settings-ready"
    )
  );
}

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeSettings
  );
} else {
  initializeSettings();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowSettings =
  Object.freeze({
    initialize:
      initializeSettings,

    refresh:
      loadSettingsData,

    render:
      renderSettingsPage,

    activateTab:
      activateSettingsTab,

    saveCurrent:
      saveCurrentSettings,

    resetCurrent:
      resetCurrentSettings,

    beginMfaSetup,

    signOutOtherSessions,

    resetApiKeyForm,

    resetWebhookForm,

    openWebhookEditor,

    getState() {
      return {
        ...settingsState,

        formSnapshots:
          Object.fromEntries(
            settingsState
              .formSnapshots
          ),

        dirtyForms:
          Array.from(
            settingsState
              .dirtyForms
          ),

        abortController:
          undefined
      };
    }
  });