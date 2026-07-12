/* =========================================================
   AssetFlow — Authentication and Authorization
   File: frontend/js/auth.js
   Requires: frontend/js/api.js
   ========================================================= */

"use strict";

/* =========================================================
   AUTH CONFIGURATION
   ========================================================= */

const AUTH_CONFIG = Object.freeze({
  LOGIN_PAGE: "index.html",
  DASHBOARD_PAGE: "dashboard/index.html",

  TOKEN_KEY: "assetflow_token",
  USER_KEY: "assetflow_user",

  PASSWORD_MIN_LENGTH: 8,

  ROLES: Object.freeze({
    ADMIN: "Admin",
    ASSET_MANAGER: "AssetManager",
    DEPARTMENT_HEAD: "DepartmentHead",
    EMPLOYEE: "Employee"
  }),

  ROLE_LABELS: Object.freeze({
    Admin: "Administrator",
    AssetManager: "Asset Manager",
    DepartmentHead: "Department Head",
    Employee: "Employee"
  })
});

/* =========================================================
   BASIC SESSION HELPERS
   ========================================================= */

function getToken() {
  if (
    window.AssetFlowAPI &&
    typeof window.AssetFlowAPI.getAuthToken === "function"
  ) {
    return window.AssetFlowAPI.getAuthToken();
  }

  return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
}

function getCurrentUser() {
  if (
    window.AssetFlowAPI &&
    typeof window.AssetFlowAPI.getStoredUser === "function"
  ) {
    return window.AssetFlowAPI.getStoredUser();
  }

  const storedUser = localStorage.getItem(
    AUTH_CONFIG.USER_KEY
  );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);

    return null;
  }
}

function setCurrentUser(user) {
  if (
    window.AssetFlowAPI &&
    typeof window.AssetFlowAPI.setStoredUser === "function"
  ) {
    window.AssetFlowAPI.setStoredUser(user);
    return;
  }

  if (!user) {
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    return;
  }

  localStorage.setItem(
    AUTH_CONFIG.USER_KEY,
    JSON.stringify(user)
  );
}

function saveAuthSession({ token, user } = {}) {
  if (
    window.AssetFlowAPI &&
    typeof window.AssetFlowAPI.saveSession === "function"
  ) {
    window.AssetFlowAPI.saveSession({
      token,
      user
    });

    return;
  }

  if (token) {
    localStorage.setItem(
      AUTH_CONFIG.TOKEN_KEY,
      token
    );
  }

  if (user) {
    setCurrentUser(user);
  }
}

function clearAuthSession() {
  if (
    window.AssetFlowAPI &&
    typeof window.AssetFlowAPI.clearSession === "function"
  ) {
    window.AssetFlowAPI.clearSession();
    return;
  }

  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);
}

function isAuthenticated() {
  return Boolean(getToken());
}

/* =========================================================
   PATH HELPERS
   ========================================================= */

function getFrontendRootPath() {
  const currentPath = window.location.pathname;

  if (!currentPath.includes("/frontend/")) {
    return "";
  }

  const relativePath =
    currentPath.split("/frontend/")[1] || "";

  const segments = relativePath
    .split("/")
    .filter(Boolean);

  /*
   Example:
   frontend/index.html
   segments = ["index.html"]
   root path = "./"

   frontend/dashboard/index.html
   segments = ["dashboard", "index.html"]
   root path = "../"
  */

  if (segments.length <= 1) {
    return "./";
  }

  return "../".repeat(segments.length - 1);
}

function getLoginPageUrl() {
  return `${getFrontendRootPath()}${AUTH_CONFIG.LOGIN_PAGE}`;
}

function getDashboardPageUrl() {
  return `${getFrontendRootPath()}${AUTH_CONFIG.DASHBOARD_PAGE}`;
}

function redirectToLogin() {
  window.location.replace(getLoginPageUrl());
}

function redirectToDashboard() {
  window.location.replace(getDashboardPageUrl());
}

function isAuthPage() {
  const path = window.location.pathname;

  const lastSegment =
    path.split("/").filter(Boolean).pop() || "";

  const isFrontendRoot =
    path.endsWith("/frontend/") ||
    path.endsWith("/frontend");

  return (
    lastSegment === AUTH_CONFIG.LOGIN_PAGE ||
    isFrontendRoot
  );
}

/* =========================================================
   ROLE HELPERS
   ========================================================= */

function getUserRole() {
  const user = getCurrentUser();

  return user ? user.role : null;
}

function getRoleLabel(role) {
  return AUTH_CONFIG.ROLE_LABELS[role] || role || "User";
}

function hasRole(allowedRoles = []) {
  const role = getUserRole();

  if (!role) {
    return false;
  }

  const normalizedRoles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  return normalizedRoles.includes(role);
}

function isAdmin() {
  return hasRole(AUTH_CONFIG.ROLES.ADMIN);
}

function isAssetManager() {
  return hasRole(
    AUTH_CONFIG.ROLES.ASSET_MANAGER
  );
}

function isDepartmentHead() {
  return hasRole(
    AUTH_CONFIG.ROLES.DEPARTMENT_HEAD
  );
}

function isEmployee() {
  return hasRole(AUTH_CONFIG.ROLES.EMPLOYEE);
}

function canManageAssets() {
  return hasRole([
    AUTH_CONFIG.ROLES.ADMIN,
    AUTH_CONFIG.ROLES.ASSET_MANAGER
  ]);
}

function canApproveRequests() {
  return hasRole([
    AUTH_CONFIG.ROLES.ADMIN,
    AUTH_CONFIG.ROLES.ASSET_MANAGER,
    AUTH_CONFIG.ROLES.DEPARTMENT_HEAD
  ]);
}

function canViewReports() {
  return hasRole([
    AUTH_CONFIG.ROLES.ADMIN,
    AUTH_CONFIG.ROLES.ASSET_MANAGER
  ]);
}

/* =========================================================
   PAGE GUARDS
   ========================================================= */

function requireAuthentication() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }

  return true;
}

function requireGuest() {
  if (isAuthenticated()) {
    redirectToDashboard();
    return false;
  }

  return true;
}

function requireRole(allowedRoles = []) {
  if (!requireAuthentication()) {
    return false;
  }

  if (!hasRole(allowedRoles)) {
    showAuthorizationError();

    return false;
  }

  return true;
}

function guardCurrentPage() {
  const body = document.body;

  if (!body) {
    return;
  }

  const authRequirement =
    body.dataset.auth || "";

  const rolesAttribute =
    body.dataset.roles || "";

  if (authRequirement === "guest") {
    requireGuest();
    return;
  }

  if (authRequirement === "required") {
    if (!requireAuthentication()) {
      return;
    }
  }

  if (rolesAttribute) {
    const allowedRoles = rolesAttribute
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    requireRole(allowedRoles);
  }
}

function showAuthorizationError() {
  const message =
    "You do not have permission to view this page.";

  if (
    window.AssetFlowUtils &&
    typeof window.AssetFlowUtils.showToast === "function"
  ) {
    window.AssetFlowUtils.showToast(
      message,
      "danger"
    );
  } else {
    window.alert(message);
  }

  window.setTimeout(() => {
    redirectToDashboard();
  }, 800);
}

/* =========================================================
   ROLE-BASED ELEMENT VISIBILITY
   ========================================================= */

function applyRoleVisibility() {
  const currentRole = getUserRole();

  const roleElements = document.querySelectorAll(
    "[data-roles]"
  );

  roleElements.forEach((element) => {
    const allowedRoles = element.dataset.roles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    const shouldShow =
      currentRole &&
      allowedRoles.includes(currentRole);

    element.hidden = !shouldShow;

    element.setAttribute(
      "aria-hidden",
      String(!shouldShow)
    );
  });

  const excludedRoleElements =
    document.querySelectorAll(
      "[data-exclude-roles]"
    );

  excludedRoleElements.forEach((element) => {
    const excludedRoles =
      element.dataset.excludeRoles
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean);

    const shouldHide =
      currentRole &&
      excludedRoles.includes(currentRole);

    element.hidden = shouldHide;

    element.setAttribute(
      "aria-hidden",
      String(shouldHide)
    );
  });
}

/* =========================================================
   USER INTERFACE BINDING
   ========================================================= */

function getInitials(name = "") {
  const words = name
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

function populateUserInterface() {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  document
    .querySelectorAll("[data-user-name]")
    .forEach((element) => {
      element.textContent =
        user.name || "AssetFlow User";
    });

  document
    .querySelectorAll("[data-user-email]")
    .forEach((element) => {
      element.textContent = user.email || "";
    });

  document
    .querySelectorAll("[data-user-role]")
    .forEach((element) => {
      element.textContent =
        getRoleLabel(user.role);
    });

  document
    .querySelectorAll("[data-user-initials]")
    .forEach((element) => {
      element.textContent =
        getInitials(user.name);
    });

  document
    .querySelectorAll("[data-user-department]")
    .forEach((element) => {
      element.textContent =
        user.department_name ||
        user.department?.name ||
        "No department";
    });

  applyRoleVisibility();
}

/* =========================================================
   FORM VALIDATION HELPERS
   ========================================================= */

function isValidEmail(email) {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return emailPattern.test(email.trim());
}

function validatePassword(password) {
  const result = {
    valid: true,
    message: ""
  };

  if (!password) {
    result.valid = false;
    result.message = "Password is required.";

    return result;
  }

  if (
    password.length <
    AUTH_CONFIG.PASSWORD_MIN_LENGTH
  ) {
    result.valid = false;
    result.message =
      `Password must be at least ` +
      `${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters.`;

    return result;
  }

  return result;
}

function getFormGroup(field) {
  return field.closest(".form-group");
}

function clearFieldError(field) {
  if (!field) {
    return;
  }

  const formGroup = getFormGroup(field);

  field.classList.remove("error");
  field.removeAttribute("aria-invalid");

  if (!formGroup) {
    return;
  }

  formGroup.classList.remove("has-error");

  const errorElement =
    formGroup.querySelector(".form-error");

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.remove("visible");
  }
}

function showFieldError(field, message) {
  if (!field) {
    return;
  }

  const formGroup = getFormGroup(field);

  field.classList.add("error");
  field.setAttribute("aria-invalid", "true");

  if (!formGroup) {
    return;
  }

  formGroup.classList.add("has-error");

  let errorElement =
    formGroup.querySelector(".form-error");

  if (!errorElement) {
    errorElement =
      document.createElement("div");

    errorElement.className =
      "form-error visible";

    formGroup.appendChild(errorElement);
  }

  errorElement.textContent = message;
  errorElement.classList.add("visible");
}

function clearFormErrors(form) {
  if (!form) {
    return;
  }

  form
    .querySelectorAll(
      ".form-control, input, select, textarea"
    )
    .forEach((field) => {
      clearFieldError(field);
    });

  const generalError =
    form.querySelector("[data-form-error]");

  if (generalError) {
    generalError.textContent = "";
    generalError.hidden = true;
  }
}

function showFormError(form, message) {
  let errorElement =
    form.querySelector("[data-form-error]");

  if (!errorElement) {
    errorElement =
      document.createElement("div");

    errorElement.className =
      "alert alert-danger";

    errorElement.dataset.formError = "";

    form.prepend(errorElement);
  }

  errorElement.textContent = message;
  errorElement.hidden = false;
}

function setFormSubmitting(
  form,
  submitting,
  loadingText = "Please wait..."
) {
  if (!form) {
    return;
  }

  const submitButton =
    form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

  const fields =
    form.querySelectorAll(
      "input, select, textarea, button"
    );

  fields.forEach((field) => {
    field.disabled = submitting;
  });

  if (!submitButton) {
    return;
  }

  if (submitting) {
    if (!submitButton.dataset.originalText) {
      submitButton.dataset.originalText =
        submitButton.textContent;
    }

    submitButton.textContent = loadingText;
    submitButton.classList.add("btn-loading");
  } else {
    submitButton.textContent =
      submitButton.dataset.originalText ||
      submitButton.textContent;

    submitButton.classList.remove("btn-loading");

    delete submitButton.dataset.originalText;
  }
}

function showAuthToast(message, type = "info") {
  if (
    window.AssetFlowUtils &&
    typeof window.AssetFlowUtils.showToast === "function"
  ) {
    window.AssetFlowUtils.showToast(
      message,
      type
    );

    return;
  }

  if (type === "danger") {
    console.error(message);
  } else {
    console.log(message);
  }
}

/* =========================================================
   AUTH TAB MANAGEMENT
   ========================================================= */

function activateAuthTab(tabName) {
  const tabs = document.querySelectorAll(
    "[data-auth-tab]"
  );

  const panels = document.querySelectorAll(
    "[data-auth-panel]"
  );

  tabs.forEach((tab) => {
    const isActive =
      tab.dataset.authTab === tabName;

    tab.classList.toggle("active", isActive);

    tab.setAttribute(
      "aria-selected",
      String(isActive)
    );

    tab.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isActive =
      panel.dataset.authPanel === tabName;

    panel.hidden = !isActive;
    panel.classList.toggle(
      "active",
      isActive
    );
  });

  const url = new URL(window.location.href);

  url.searchParams.set("tab", tabName);

  window.history.replaceState(
    {},
    "",
    url.toString()
  );
}

function initializeAuthTabs() {
  const tabs = document.querySelectorAll(
    "[data-auth-tab]"
  );

  if (tabs.length === 0) {
    return;
  }

  const queryTab =
    new URLSearchParams(
      window.location.search
    ).get("tab");

  const defaultTab =
    queryTab === "signup"
      ? "signup"
      : "login";

  activateAuthTab(defaultTab);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateAuthTab(
        tab.dataset.authTab
      );
    });
  });
}

/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

function togglePasswordVisibility(button) {
  const targetSelector =
    button.dataset.passwordToggle;

  const passwordField = targetSelector
    ? document.querySelector(targetSelector)
    : button
        .closest(".form-input-wrapper")
        ?.querySelector(
          'input[type="password"], input[data-password]'
        );

  if (!passwordField) {
    return;
  }

  const isPassword =
    passwordField.type === "password";

  passwordField.type =
    isPassword ? "text" : "password";

  button.setAttribute(
    "aria-label",
    isPassword
      ? "Hide password"
      : "Show password"
  );

  button.setAttribute(
    "aria-pressed",
    String(isPassword)
  );

  const showIcon =
    button.querySelector("[data-icon-show]");

  const hideIcon =
    button.querySelector("[data-icon-hide]");

  if (showIcon) {
    showIcon.hidden = isPassword;
  }

  if (hideIcon) {
    hideIcon.hidden = !isPassword;
  }
}

function initializePasswordToggles() {
  document
    .querySelectorAll("[data-password-toggle]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        togglePasswordVisibility(button);
      });
    });
}

/* =========================================================
   LOGIN
   ========================================================= */

function validateLoginForm(form) {
  let valid = true;

  const emailField =
    form.querySelector(
      '[name="email"], #loginEmail'
    );

  const passwordField =
    form.querySelector(
      '[name="password"], #loginPassword'
    );

  clearFormErrors(form);

  const email =
    emailField?.value.trim() || "";

  const password =
    passwordField?.value || "";

  if (!email) {
    showFieldError(
      emailField,
      "Email address is required."
    );

    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(
      emailField,
      "Enter a valid email address."
    );

    valid = false;
  }

  if (!password) {
    showFieldError(
      passwordField,
      "Password is required."
    );

    valid = false;
  }

  return {
    valid,
    email,
    password
  };
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const validation =
    validateLoginForm(form);

  if (!validation.valid) {
    const firstInvalidField =
      form.querySelector(".error");

    firstInvalidField?.focus();

    return;
  }

  setFormSubmitting(
    form,
    true,
    "Signing in..."
  );

  try {
    if (
      !window.AssetFlowAPI ||
      !window.AssetFlowAPI.auth
    ) {
      throw new Error(
        "AssetFlow API client is not available."
      );
    }

    const response =
      await window.AssetFlowAPI.auth.login({
        email: validation.email,
        password: validation.password
      });

    saveAuthSession(response);

    showAuthToast(
      `Welcome back, ${
        response.user?.name || "User"
      }!`,
      "success"
    );

    window.setTimeout(() => {
      redirectToDashboard();
    }, 450);
  } catch (error) {
    const message =
      error.message ||
      "Unable to sign in.";

    if (error.field) {
      const field =
        form.querySelector(
          `[name="${error.field}"]`
        );

      if (field) {
        showFieldError(field, message);
        field.focus();
      } else {
        showFormError(form, message);
      }
    } else {
      showFormError(form, message);
    }

    showAuthToast(message, "danger");
  } finally {
    setFormSubmitting(form, false);
  }
}

/* =========================================================
   SIGNUP
   ========================================================= */

function validateSignupForm(form) {
  let valid = true;

  const nameField =
    form.querySelector(
      '[name="name"], #signupName'
    );

  const emailField =
    form.querySelector(
      '[name="email"], #signupEmail'
    );

  const passwordField =
    form.querySelector(
      '[name="password"], #signupPassword'
    );

  const confirmPasswordField =
    form.querySelector(
      '[name="confirm_password"], #confirmPassword'
    );

  const termsField =
    form.querySelector(
      '[name="terms"], #signupTerms'
    );

  clearFormErrors(form);

  const name =
    nameField?.value.trim() || "";

  const email =
    emailField?.value.trim() || "";

  const password =
    passwordField?.value || "";

  const confirmPassword =
    confirmPasswordField?.value || "";

  if (!name) {
    showFieldError(
      nameField,
      "Full name is required."
    );

    valid = false;
  } else if (name.length < 2) {
    showFieldError(
      nameField,
      "Enter at least 2 characters."
    );

    valid = false;
  }

  if (!email) {
    showFieldError(
      emailField,
      "Email address is required."
    );

    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(
      emailField,
      "Enter a valid email address."
    );

    valid = false;
  }

  const passwordValidation =
    validatePassword(password);

  if (!passwordValidation.valid) {
    showFieldError(
      passwordField,
      passwordValidation.message
    );

    valid = false;
  }

  if (confirmPasswordField) {
    if (!confirmPassword) {
      showFieldError(
        confirmPasswordField,
        "Confirm your password."
      );

      valid = false;
    } else if (password !== confirmPassword) {
      showFieldError(
        confirmPasswordField,
        "Passwords do not match."
      );

      valid = false;
    }
  }

  if (termsField && !termsField.checked) {
    showFieldError(
      termsField,
      "You must accept the terms to continue."
    );

    valid = false;
  }

  return {
    valid,
    name,
    email,
    password
  };
}

async function handleSignupSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const validation =
    validateSignupForm(form);

  if (!validation.valid) {
    const firstInvalidField =
      form.querySelector(".error");

    firstInvalidField?.focus();

    return;
  }

  setFormSubmitting(
    form,
    true,
    "Creating account..."
  );

  try {
    if (
      !window.AssetFlowAPI ||
      !window.AssetFlowAPI.auth
    ) {
      throw new Error(
        "AssetFlow API client is not available."
      );
    }

    /*
     Do not send a role field.
     The backend always creates an Employee account.
    */

    await window.AssetFlowAPI.auth.signup({
      name: validation.name,
      email: validation.email,
      password: validation.password
    });

    showAuthToast(
      "Account created successfully. Sign in to continue.",
      "success"
    );

    form.reset();

    activateAuthTab("login");

    const loginEmail =
      document.querySelector(
        '#loginForm [name="email"], #loginEmail'
      );

    if (loginEmail) {
      loginEmail.value =
        validation.email;

      loginEmail.focus();
    }
  } catch (error) {
    const message =
      error.message ||
      "Unable to create your account.";

    if (error.field) {
      const field =
        form.querySelector(
          `[name="${error.field}"]`
        );

      if (field) {
        showFieldError(field, message);
        field.focus();
      } else {
        showFormError(form, message);
      }
    } else {
      showFormError(form, message);
    }

    showAuthToast(message, "danger");
  } finally {
    setFormSubmitting(form, false);
  }
}

/* =========================================================
   INLINE VALIDATION
   ========================================================= */

function initializeInlineValidation() {
  document
    .querySelectorAll(
      'input[type="email"]'
    )
    .forEach((field) => {
      field.addEventListener("blur", () => {
        const value = field.value.trim();

        if (!value) {
          return;
        }

        if (!isValidEmail(value)) {
          showFieldError(
            field,
            "Enter a valid email address."
          );
        } else {
          clearFieldError(field);
        }
      });

      field.addEventListener("input", () => {
        if (field.classList.contains("error")) {
          clearFieldError(field);
        }
      });
    });

  document
    .querySelectorAll(
      'input[type="password"]'
    )
    .forEach((field) => {
      field.addEventListener("input", () => {
        if (field.classList.contains("error")) {
          clearFieldError(field);
        }
      });
    });

  document
    .querySelectorAll(
      'input[type="text"]'
    )
    .forEach((field) => {
      field.addEventListener("input", () => {
        if (field.classList.contains("error")) {
          clearFieldError(field);
        }
      });
    });
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logout({
  redirect = true,
  message = true
} = {}) {
  clearAuthSession();

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:logged-out"
    )
  );

  if (message) {
    showAuthToast(
      "You have been signed out.",
      "info"
    );
  }

  if (redirect) {
    window.setTimeout(() => {
      redirectToLogin();
    }, 250);
  }
}

function initializeLogoutButtons() {
  document
    .querySelectorAll(
      "[data-logout], #logoutButton"
    )
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        logout();
      });
    });
}

/* =========================================================
   SESSION REFRESH
   ========================================================= */

async function refreshCurrentUser() {
  if (!isAuthenticated()) {
    return null;
  }

  try {
    const user =
      await window.AssetFlowAPI.auth.getCurrentUser();

    setCurrentUser(user);
    populateUserInterface();

    return user;
  } catch (error) {
    if (error.status === 401) {
      clearAuthSession();
      redirectToLogin();
    }

    throw error;
  }
}

/* =========================================================
   AUTH FORM INITIALIZATION
   ========================================================= */

function initializeAuthForms() {
  const loginForm =
    document.querySelector(
      "#loginForm, [data-login-form]"
    );

  const signupForm =
    document.querySelector(
      "#signupForm, [data-signup-form]"
    );

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLoginSubmit
    );
  }

  if (signupForm) {
    signupForm.addEventListener(
      "submit",
      handleSignupSubmit
    );
  }
}

/* =========================================================
   UNAUTHORIZED EVENT HANDLING
   ========================================================= */

function initializeUnauthorizedListener() {
  window.addEventListener(
    "assetflow:unauthorized",
    () => {
      clearAuthSession();

      if (!isAuthPage()) {
        showAuthToast(
          "Your session has expired. Please sign in again.",
          "warning"
        );
      }
    }
  );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeAuthentication() {
  guardCurrentPage();

  initializeAuthTabs();
  initializeAuthForms();
  initializePasswordToggles();
  initializeInlineValidation();
  initializeLogoutButtons();
  initializeUnauthorizedListener();

  if (isAuthenticated()) {
    populateUserInterface();
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeAuthentication
  );
} else {
  initializeAuthentication();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowAuth = Object.freeze({
  config: AUTH_CONFIG,

  getToken,
  getCurrentUser,
  setCurrentUser,
  saveSession: saveAuthSession,
  clearSession: clearAuthSession,

  isAuthenticated,
  requireAuthentication,
  requireGuest,
  requireRole,

  getUserRole,
  getRoleLabel,
  hasRole,

  isAdmin,
  isAssetManager,
  isDepartmentHead,
  isEmployee,

  canManageAssets,
  canApproveRequests,
  canViewReports,

  getInitials,
  populateUserInterface,
  applyRoleVisibility,

  isValidEmail,
  validatePassword,

  activateAuthTab,
  refreshCurrentUser,

  redirectToLogin,
  redirectToDashboard,

  logout
});