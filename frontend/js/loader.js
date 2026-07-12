/* =========================================================
   AssetFlow — Shared Component Loader
   File: frontend/js/loader.js

   Loads:
   - components/sidebar.html
   - components/navbar.html
   - components/footer.html
   - components/loader.html
   - components/modal.html

   Requires:
   - api.js
   - auth.js
   - utils.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPONENT_CONFIG = Object.freeze({
  COMPONENT_FOLDER: "components",

  COMPONENTS: Object.freeze({
    sidebar: "sidebar.html",
    navbar: "navbar.html",
    footer: "footer.html",
    loader: "loader.html",
    modal: "modal.html"
  }),

  DEFAULT_TARGETS: Object.freeze({
    sidebar: "#sidebar-container",
    navbar: "#navbar-container",
    footer: "#footer-container",
    loader: "#loader-container",
    modal: "#modal-container"
  })
});

/* =========================================================
   PATH HELPERS
   ========================================================= */

/**
 * Returns the relative path from the current page to
 * the frontend root directory.
 *
 * Examples:
 *
 * frontend/index.html
 * returns "./"
 *
 * frontend/dashboard/index.html
 * returns "../"
 *
 * frontend/assets/details/index.html
 * returns "../../"
 */
function getFrontendRootPath() {
  const pathname = window.location.pathname;

  if (!pathname.includes("/frontend/")) {
    const segments = pathname
      .split("/")
      .filter(Boolean);

    const currentFile =
      segments[segments.length - 1] || "";

    const directorySegments =
      currentFile.includes(".")
        ? segments.slice(0, -1)
        : segments;

    if (directorySegments.length === 0) {
      return "./";
    }

    return "../".repeat(
      Math.max(directorySegments.length - 1, 0)
    );
  }

  const relativePath =
    pathname.split("/frontend/")[1] || "";

  const segments = relativePath
    .split("/")
    .filter(Boolean);

  if (segments.length <= 1) {
    return "./";
  }

  return "../".repeat(segments.length - 1);
}

/**
 * Returns the absolute URL to the frontend root.
 */
function getFrontendRootURL() {
  return new URL(
    getFrontendRootPath(),
    window.location.href
  ).href;
}

/**
 * Builds a path relative to the frontend root.
 */
function resolveFrontendPath(path = "") {
  const cleanPath = String(path)
    .replace(/^\.?\//, "");

  return `${getFrontendRootPath()}${cleanPath}`;
}

/**
 * Returns the URL of a shared component file.
 */
function getComponentURL(componentName) {
  const filename =
    COMPONENT_CONFIG.COMPONENTS[componentName];

  if (!filename) {
    throw new Error(
      `Unknown AssetFlow component: ${componentName}`
    );
  }

  return resolveFrontendPath(
    `${COMPONENT_CONFIG.COMPONENT_FOLDER}/${filename}`
  );
}

/* =========================================================
   COMPONENT FETCHING
   ========================================================= */

/**
 * Fetches a component HTML file.
 */
async function fetchComponent(componentName) {
  const componentURL =
    getComponentURL(componentName);

  let response;

  try {
    response = await fetch(componentURL, {
      method: "GET",
      cache: "no-cache",
      headers: {
        Accept: "text/html"
      }
    });
  } catch (error) {
    throw new Error(
      `Unable to connect while loading the ${componentName} component.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Unable to load ${componentName}. ` +
      `Server returned ${response.status}.`
    );
  }

  return response.text();
}

/* =========================================================
   COMPONENT HTML PROCESSING
   ========================================================= */

/**
 * Replaces {{FRONTEND_ROOT}} inside component HTML.
 *
 * Example inside sidebar.html:
 *
 * <a href="{{FRONTEND_ROOT}}dashboard/index.html">
 */
function replaceComponentPlaceholders(html) {
  const frontendRoot =
    getFrontendRootPath();

  return String(html)
    .replaceAll(
      "{{FRONTEND_ROOT}}",
      frontendRoot
    )
    .replaceAll(
      "{{ASSETFLOW_ROOT}}",
      frontendRoot
    );
}

/**
 * Runs any scripts included inside dynamically loaded HTML.
 *
 * Avoid adding scripts to component files unless required.
 */
function executeComponentScripts(container) {
  const scripts = Array.from(
    container.querySelectorAll("script")
  );

  scripts.forEach((oldScript) => {
    const newScript =
      document.createElement("script");

    Array.from(oldScript.attributes).forEach(
      (attribute) => {
        newScript.setAttribute(
          attribute.name,
          attribute.value
        );
      }
    );

    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent =
        oldScript.textContent;
    }

    oldScript.replaceWith(newScript);
  });
}

/* =========================================================
   COMPONENT LOADING
   ========================================================= */

/**
 * Loads one component into a target element.
 */
async function loadComponent(
  componentName,
  target,
  {
    executeScripts = false,
    required = false
  } = {}
) {
  const targetElement =
    typeof target === "string"
      ? document.querySelector(target)
      : target;

  if (!targetElement) {
    if (required) {
      throw new Error(
        `Target container for ${componentName} was not found.`
      );
    }

    return null;
  }

  targetElement.setAttribute(
    "aria-busy",
    "true"
  );

  targetElement.dataset.componentState =
    "loading";

  try {
    const rawHTML =
      await fetchComponent(componentName);

    const processedHTML =
      replaceComponentPlaceholders(rawHTML);

    targetElement.innerHTML =
      processedHTML;

    targetElement.dataset.component =
      componentName;

    targetElement.dataset.componentState =
      "loaded";

    targetElement.removeAttribute(
      "aria-busy"
    );

    if (executeScripts) {
      executeComponentScripts(
        targetElement
      );
    }

    targetElement.dispatchEvent(
      new CustomEvent(
        "assetflow:component-loaded",
        {
          bubbles: true,
          detail: {
            componentName,
            target: targetElement
          }
        }
      )
    );

    return targetElement;
  } catch (error) {
    targetElement.dataset.componentState =
      "error";

    targetElement.removeAttribute(
      "aria-busy"
    );

    renderComponentError(
      targetElement,
      componentName,
      error
    );

    console.error(
      `AssetFlow component error (${componentName}):`,
      error
    );

    if (required) {
      throw error;
    }

    return null;
  }
}

/* =========================================================
   ERROR DISPLAY
   ========================================================= */

function renderComponentError(
  container,
  componentName,
  error
) {
  if (!container) {
    return;
  }

  const isLayoutComponent = [
    "sidebar",
    "navbar",
    "footer"
  ].includes(componentName);

  if (isLayoutComponent) {
    container.innerHTML = `
      <div
        class="component-load-error"
        role="alert"
        style="
          margin: 1rem;
          padding: 1rem;
          color: #b52d33;
          background: #ffecee;
          border: 1px solid #f7c2c5;
          border-radius: 10px;
          font-family: sans-serif;
          font-size: 0.875rem;
        "
      >
        Unable to load the
        ${escapeComponentText(componentName)}
        component.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  console.warn(
    error?.message ||
    `Unable to load ${componentName}.`
  );
}

function escapeComponentText(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   AUTOMATIC PLACEHOLDER LOADING
   ========================================================= */

/**
 * Supports this HTML:
 *
 * <div data-component="sidebar"></div>
 * <div data-component="navbar"></div>
 * <div data-component="footer"></div>
 */
async function loadDeclaredComponents() {
  const componentContainers =
    Array.from(
      document.querySelectorAll(
        "[data-component]"
      )
    );

  const loadTasks =
    componentContainers.map(
      async (container) => {
        const componentName =
          container.dataset.component;

        if (
          !COMPONENT_CONFIG
            .COMPONENTS[componentName]
        ) {
          console.warn(
            `Unknown component declared: ${componentName}`
          );

          return null;
        }

        return loadComponent(
          componentName,
          container,
          {
            executeScripts:
              container.dataset.executeScripts ===
              "true",

            required:
              container.dataset.required ===
              "true"
          }
        );
      }
    );

  return Promise.allSettled(loadTasks);
}

/**
 * Loads components into conventional container IDs.
 *
 * Example:
 *
 * <div id="sidebar-container"></div>
 * <div id="navbar-container"></div>
 */
async function loadDefaultComponents() {
  const tasks = [];

  Object.entries(
    COMPONENT_CONFIG.DEFAULT_TARGETS
  ).forEach(
    ([componentName, targetSelector]) => {
      const targetElement =
        document.querySelector(
          targetSelector
        );

      if (
        targetElement &&
        !targetElement.dataset.componentState
      ) {
        tasks.push(
          loadComponent(
            componentName,
            targetElement
          )
        );
      }
    }
  );

  return Promise.allSettled(tasks);
}

/* =========================================================
   POST-LOAD INITIALIZATION
   ========================================================= */

function initializeLoadedComponents() {
  updateComponentLinks();
  initializeCurrentUser();
  initializeRoleVisibility();
  initializeActiveNavigation();
  initializeComponentDropdowns();
  initializeLogoutActions();
  initializeNotificationUI();
  updateCurrentYear();
}

/**
 * Updates links that use data-route.
 *
 * Example:
 *
 * <a data-route="dashboard/index.html">Dashboard</a>
 */
function updateComponentLinks() {
  document
    .querySelectorAll("[data-route]")
    .forEach((element) => {
      const route =
        element.dataset.route;

      if (!route) {
        return;
      }

      element.setAttribute(
        "href",
        resolveFrontendPath(route)
      );
    });

  document
    .querySelectorAll(
      "[data-asset-path]"
    )
    .forEach((element) => {
      const assetPath =
        element.dataset.assetPath;

      if (!assetPath) {
        return;
      }

      const resolvedPath =
        resolveFrontendPath(assetPath);

      if (element.tagName === "IMG") {
        element.src = resolvedPath;
      } else {
        element.setAttribute(
          "href",
          resolvedPath
        );
      }
    });
}

/**
 * Populates user name, role, email and initials.
 */
function initializeCurrentUser() {
  if (
    window.AssetFlowAuth &&
    typeof window.AssetFlowAuth
      .populateUserInterface === "function"
  ) {
    window.AssetFlowAuth
      .populateUserInterface();

    return;
  }

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem(
        "assetflow_user"
      )
    );
  } catch (error) {
    user = null;
  }

  if (!user) {
    return;
  }

  document
    .querySelectorAll(
      "[data-user-name]"
    )
    .forEach((element) => {
      element.textContent =
        user.name || "AssetFlow User";
    });

  document
    .querySelectorAll(
      "[data-user-email]"
    )
    .forEach((element) => {
      element.textContent =
        user.email || "";
    });

  document
    .querySelectorAll(
      "[data-user-role]"
    )
    .forEach((element) => {
      element.textContent =
        humanizeRole(user.role);
    });

  document
    .querySelectorAll(
      "[data-user-initials]"
    )
    .forEach((element) => {
      element.textContent =
        getComponentInitials(
          user.name
        );
    });
}

function humanizeRole(role = "") {
  const roleNames = {
    Admin: "Administrator",
    AssetManager: "Asset Manager",
    DepartmentHead:
      "Department Head",
    Employee: "Employee"
  };

  return roleNames[role] || role || "User";
}

function getComponentInitials(name = "") {
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

/**
 * Applies role-aware visibility after sidebar is loaded.
 */
function initializeRoleVisibility() {
  if (
    window.AssetFlowAuth &&
    typeof window.AssetFlowAuth
      .applyRoleVisibility === "function"
  ) {
    window.AssetFlowAuth
      .applyRoleVisibility();
  }
}

/**
 * Marks the correct sidebar link as active.
 */
function initializeActiveNavigation() {
  const pathname = window.location.pathname
    .replace(/\/index\.html$/, "")
    .replace(/\/$/, "");

  const links =
    Array.from(
      document.querySelectorAll(
        ".sidebar-link[href], [data-nav-link]"
      )
    );

  let bestMatch = null;
  let bestMatchLength = 0;

  links.forEach((link) => {
    const href =
      link.getAttribute("href");

    if (
      !href ||
      href === "#" ||
      href.startsWith("javascript:")
    ) {
      return;
    }

    let linkPath;

    try {
      linkPath = new URL(
        href,
        window.location.href
      ).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
    } catch (error) {
      return;
    }

    const matches =
      pathname === linkPath ||
      (
        linkPath &&
        linkPath !== "/" &&
        pathname.startsWith(
          `${linkPath}/`
        )
      );

    if (
      matches &&
      linkPath.length >
        bestMatchLength
    ) {
      bestMatch = link;
      bestMatchLength =
        linkPath.length;
    }
  });

  links.forEach((link) => {
    const active =
      link === bestMatch;

    link.classList.toggle(
      "active",
      active
    );

    if (active) {
      link.setAttribute(
        "aria-current",
        "page"
      );
    } else {
      link.removeAttribute(
        "aria-current"
      );
    }
  });
}

/**
 * Adds dropdown behaviour when utils.js is not available.
 */
function initializeComponentDropdowns() {
  if (
    window.AssetFlowUtils &&
    typeof window.AssetFlowUtils
      .closeAllDropdowns === "function"
  ) {
    return;
  }

  document
    .querySelectorAll(
      "[data-dropdown-toggle]"
    )
    .forEach((button) => {
      if (
        button.dataset.dropdownReady ===
        "true"
      ) {
        return;
      }

      button.dataset.dropdownReady =
        "true";

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const dropdown =
            button.closest(".dropdown");

          if (!dropdown) {
            return;
          }

          document
            .querySelectorAll(
              ".dropdown.open"
            )
            .forEach((openDropdown) => {
              if (
                openDropdown !== dropdown
              ) {
                openDropdown.classList.remove(
                  "open"
                );
              }
            });

          const opened =
            dropdown.classList.toggle(
              "open"
            );

          button.setAttribute(
            "aria-expanded",
            String(opened)
          );
        }
      );
    });
}

/**
 * Initializes logout buttons included in shared HTML.
 */
function initializeLogoutActions() {
  document
    .querySelectorAll(
      "[data-logout]"
    )
    .forEach((button) => {
      if (
        button.dataset.logoutReady ===
        "true"
      ) {
        return;
      }

      button.dataset.logoutReady =
        "true";

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          if (
            window.AssetFlowAuth &&
            typeof window.AssetFlowAuth
              .logout === "function"
          ) {
            window.AssetFlowAuth.logout();
            return;
          }

          localStorage.removeItem(
            "assetflow_token"
          );

          localStorage.removeItem(
            "assetflow_user"
          );

          window.location.href =
            resolveFrontendPath(
              "index.html"
            );
        }
      );
    });
}

/**
 * Updates notification badges using locally provided count.
 *
 * A page can call:
 *
 * AssetFlowLoader.setNotificationCount(5);
 */
function initializeNotificationUI() {
  const savedCount =
    Number(
      sessionStorage.getItem(
        "assetflow_notification_count"
      )
    ) || 0;

  setNotificationCount(savedCount);
}

/**
 * Updates footer year.
 */
function updateCurrentYear() {
  document
    .querySelectorAll(
      "[data-current-year]"
    )
    .forEach((element) => {
      element.textContent =
        String(
          new Date().getFullYear()
        );
    });
}

/* =========================================================
   NOTIFICATION BADGE
   ========================================================= */

function setNotificationCount(count = 0) {
  const normalizedCount =
    Math.max(0, Number(count) || 0);

  sessionStorage.setItem(
    "assetflow_notification_count",
    String(normalizedCount)
  );

  document
    .querySelectorAll(
      "[data-notification-count]"
    )
    .forEach((badge) => {
      badge.textContent =
        normalizedCount > 99
          ? "99+"
          : String(normalizedCount);

      badge.hidden =
        normalizedCount === 0;

      badge.setAttribute(
        "aria-hidden",
        String(
          normalizedCount === 0
        )
      );
    });

  document
    .querySelectorAll(
      "[data-notification-button]"
    )
    .forEach((button) => {
      button.setAttribute(
        "aria-label",
        normalizedCount > 0
          ? `Notifications, ${normalizedCount} unread`
          : "Notifications"
      );
    });
}

/* =========================================================
   PAGE TITLE HELPERS
   ========================================================= */

/**
 * Updates navbar title and subtitle.
 */
function setPageHeader({
  title = "",
  subtitle = ""
} = {}) {
  document
    .querySelectorAll(
      "[data-page-title]"
    )
    .forEach((element) => {
      element.textContent = title;
    });

  document
    .querySelectorAll(
      "[data-page-subtitle]"
    )
    .forEach((element) => {
      element.textContent =
        subtitle;
    });

  if (title) {
    document.title =
      `${title} | AssetFlow`;
  }
}

/* =========================================================
   RELOAD COMPONENT
   ========================================================= */

async function reloadComponent(
  componentName
) {
  const existingContainer =
    document.querySelector(
      `[data-component="${componentName}"]`
    ) ||
    document.querySelector(
      COMPONENT_CONFIG
        .DEFAULT_TARGETS[
          componentName
        ] || ""
    );

  if (!existingContainer) {
    return null;
  }

  existingContainer.removeAttribute(
    "data-component-state"
  );

  const result =
    await loadComponent(
      componentName,
      existingContainer
    );

  initializeLoadedComponents();

  return result;
}

/* =========================================================
   MAIN INITIALIZATION
   ========================================================= */

let componentLoaderInitialized = false;

async function initializeComponentLoader() {
  if (componentLoaderInitialized) {
    return;
  }

  componentLoaderInitialized = true;

  document.documentElement.classList.add(
    "components-loading"
  );

  try {
    await loadDeclaredComponents();
    await loadDefaultComponents();

    initializeLoadedComponents();

    document.documentElement.classList.add(
      "components-loaded"
    );

    window.dispatchEvent(
      new CustomEvent(
        "assetflow:components-ready",
        {
          detail: {
            frontendRoot:
              getFrontendRootPath()
          }
        }
      )
    );
  } catch (error) {
    console.error(
      "AssetFlow component initialization failed:",
      error
    );

    window.dispatchEvent(
      new CustomEvent(
        "assetflow:components-error",
        {
          detail: {
            error
          }
        }
      )
    );
  } finally {
    document.documentElement.classList.remove(
      "components-loading"
    );
  }
}

/* =========================================================
   LISTEN FOR INDIVIDUAL COMPONENT LOADS
   ========================================================= */

document.addEventListener(
  "assetflow:component-loaded",
  () => {
    updateComponentLinks();
    initializeCurrentUser();
    initializeRoleVisibility();
    initializeActiveNavigation();
    initializeLogoutActions();
    updateCurrentYear();
  }
);

/* =========================================================
   START LOADER
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeComponentLoader
  );
} else {
  initializeComponentLoader();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowLoader = Object.freeze({
  config: COMPONENT_CONFIG,

  getFrontendRootPath,
  getFrontendRootURL,
  resolveFrontendPath,
  getComponentURL,

  fetchComponent,
  loadComponent,
  loadDeclaredComponents,
  loadDefaultComponents,
  reloadComponent,

  updateComponentLinks,
  initializeCurrentUser,
  initializeRoleVisibility,
  initializeActiveNavigation,

  setNotificationCount,
  setPageHeader,

  initialize:
    initializeComponentLoader
});