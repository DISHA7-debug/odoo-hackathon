/* =========================================================
   AssetFlow — Sidebar Navigation Controller
   File: frontend/js/sidebar.js

   Requires:
   - loader.js
   - auth.js
   - utils.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const SIDEBAR_CONFIG = Object.freeze({
  STORAGE_KEY: "assetflow_sidebar_collapsed",

  SELECTORS: Object.freeze({
    APP_SHELL: "#appShell, .app-shell",
    SIDEBAR: "#sidebar, .sidebar",
    SIDEBAR_TOGGLE:
      "#sidebarToggle, [data-sidebar-toggle]",
    MOBILE_MENU:
      "#mobileMenuButton, [data-mobile-menu]",
    SIDEBAR_CLOSE:
      "#sidebarClose, [data-sidebar-close]",
    OVERLAY:
      "#sidebarOverlay, .sidebar-overlay",
    NAV_LINK:
      ".sidebar-link, [data-nav-link]"
  }),

  BREAKPOINT: 991
});

/* =========================================================
   STATE
   ========================================================= */

const sidebarState = {
  collapsed: false,
  mobileOpen: false,
  initialized: false
};

/* =========================================================
   ELEMENT HELPERS
   ========================================================= */

function getAppShell() {
  return document.querySelector(
    SIDEBAR_CONFIG.SELECTORS.APP_SHELL
  );
}

function getSidebar() {
  return document.querySelector(
    SIDEBAR_CONFIG.SELECTORS.SIDEBAR
  );
}

function getSidebarOverlay() {
  return document.querySelector(
    SIDEBAR_CONFIG.SELECTORS.OVERLAY
  );
}

function getSidebarToggleButtons() {
  return Array.from(
    document.querySelectorAll(
      SIDEBAR_CONFIG.SELECTORS.SIDEBAR_TOGGLE
    )
  );
}

function getMobileMenuButtons() {
  return Array.from(
    document.querySelectorAll(
      SIDEBAR_CONFIG.SELECTORS.MOBILE_MENU
    )
  );
}

function getSidebarCloseButtons() {
  return Array.from(
    document.querySelectorAll(
      SIDEBAR_CONFIG.SELECTORS.SIDEBAR_CLOSE
    )
  );
}

function isMobileViewport() {
  return window.innerWidth <=
    SIDEBAR_CONFIG.BREAKPOINT;
}

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getSavedCollapsedState() {
  try {
    return (
      localStorage.getItem(
        SIDEBAR_CONFIG.STORAGE_KEY
      ) === "true"
    );
  } catch (error) {
    return false;
  }
}

function saveCollapsedState(collapsed) {
  try {
    localStorage.setItem(
      SIDEBAR_CONFIG.STORAGE_KEY,
      String(collapsed)
    );
  } catch (error) {
    console.warn(
      "Unable to save sidebar state.",
      error
    );
  }
}

/* =========================================================
   DESKTOP COLLAPSE
   ========================================================= */

function setSidebarCollapsed(
  collapsed,
  {
    save = true,
    announce = false
  } = {}
) {
  const appShell = getAppShell();

  if (!appShell) {
    return;
  }

  sidebarState.collapsed = Boolean(collapsed);

  appShell.classList.toggle(
    "sidebar-collapsed",
    sidebarState.collapsed
  );

  getSidebarToggleButtons().forEach(
    (button) => {
      button.setAttribute(
        "aria-expanded",
        String(!sidebarState.collapsed)
      );

      button.setAttribute(
        "aria-label",
        sidebarState.collapsed
          ? "Expand sidebar"
          : "Collapse sidebar"
      );

      button.title =
        sidebarState.collapsed
          ? "Expand sidebar"
          : "Collapse sidebar";
    }
  );

  if (save) {
    saveCollapsedState(
      sidebarState.collapsed
    );
  }

  if (
    announce &&
    window.AssetFlowUtils?.announce
  ) {
    window.AssetFlowUtils.announce(
      sidebarState.collapsed
        ? "Sidebar collapsed."
        : "Sidebar expanded."
    );
  }

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:sidebar-collapse",
      {
        detail: {
          collapsed:
            sidebarState.collapsed
        }
      }
    )
  );
}

function toggleSidebarCollapsed() {
  if (isMobileViewport()) {
    toggleMobileSidebar();
    return;
  }

  setSidebarCollapsed(
    !sidebarState.collapsed,
    {
      announce: true
    }
  );
}

/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function setMobileSidebarOpen(
  open,
  {
    focusSidebar = true
  } = {}
) {
  const sidebar = getSidebar();
  const overlay = getSidebarOverlay();

  if (!sidebar) {
    return;
  }

  sidebarState.mobileOpen =
    Boolean(open);

  sidebar.classList.toggle(
    "mobile-open",
    sidebarState.mobileOpen
  );

  overlay?.classList.toggle(
    "visible",
    sidebarState.mobileOpen
  );

  document.body.classList.toggle(
    "sidebar-open",
    sidebarState.mobileOpen
  );

  sidebar.setAttribute(
    "aria-hidden",
    String(!sidebarState.mobileOpen)
  );

  getMobileMenuButtons().forEach(
    (button) => {
      button.setAttribute(
        "aria-expanded",
        String(sidebarState.mobileOpen)
      );
    }
  );

  if (
    sidebarState.mobileOpen &&
    focusSidebar
  ) {
    window.setTimeout(() => {
      const firstLink =
        sidebar.querySelector(
          SIDEBAR_CONFIG.SELECTORS.NAV_LINK
        );

      firstLink?.focus();
    }, 120);
  }

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:sidebar-mobile",
      {
        detail: {
          open:
            sidebarState.mobileOpen
        }
      }
    )
  );
}

function openMobileSidebar() {
  setMobileSidebarOpen(true);
}

function closeMobileSidebar() {
  setMobileSidebarOpen(false, {
    focusSidebar: false
  });
}

function toggleMobileSidebar() {
  setMobileSidebarOpen(
    !sidebarState.mobileOpen
  );
}

/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

function normalizePath(pathname = "") {
  return String(pathname)
    .replace(/\/index\.html$/i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function setActiveNavigation() {
  const currentPath = normalizePath(
    window.location.pathname
  );

  const links = Array.from(
    document.querySelectorAll(
      SIDEBAR_CONFIG.SELECTORS.NAV_LINK
    )
  );

  let activeLink = null;
  let activeLength = -1;

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
      linkPath = normalizePath(
        new URL(
          href,
          window.location.href
        ).pathname
      );
    } catch (error) {
      return;
    }

    const exactMatch =
      currentPath === linkPath;

    const nestedMatch =
      linkPath &&
      linkPath !== "/" &&
      currentPath.startsWith(
        `${linkPath}/`
      );

    if (
      (exactMatch || nestedMatch) &&
      linkPath.length > activeLength
    ) {
      activeLink = link;
      activeLength = linkPath.length;
    }
  });

  links.forEach((link) => {
    const active =
      link === activeLink;

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

/* =========================================================
   ROLE-AWARE NAVIGATION
   ========================================================= */

function applySidebarRoleVisibility() {
  if (
    window.AssetFlowAuth &&
    typeof window.AssetFlowAuth
      .applyRoleVisibility === "function"
  ) {
    window.AssetFlowAuth
      .applyRoleVisibility();

    return;
  }

  const user = JSON.parse(
    localStorage.getItem(
      "assetflow_user"
    ) || "null"
  );

  if (!user?.role) {
    return;
  }

  document
    .querySelectorAll(
      ".sidebar [data-roles]"
    )
    .forEach((element) => {
      const allowedRoles =
        element.dataset.roles
          .split(",")
          .map((role) =>
            role.trim()
          )
          .filter(Boolean);

      element.hidden =
        !allowedRoles.includes(
          user.role
        );
    });
}

/* =========================================================
   TOOLTIP FOR COLLAPSED SIDEBAR
   ========================================================= */

function updateCollapsedTooltips() {
  const links =
    document.querySelectorAll(
      ".sidebar-link"
    );

  links.forEach((link) => {
    const label =
      link.querySelector(
        ".sidebar-link-label"
      )?.textContent.trim();

    if (!label) {
      return;
    }

    link.dataset.tooltip = label;
    link.setAttribute(
      "aria-label",
      label
    );
  });
}

/* =========================================================
   KEYBOARD NAVIGATION
   ========================================================= */

function handleSidebarKeyboard(event) {
  const sidebar = getSidebar();

  if (!sidebar) {
    return;
  }

  if (
    event.key === "Escape" &&
    sidebarState.mobileOpen
  ) {
    closeMobileSidebar();

    getMobileMenuButtons()[0]
      ?.focus();

    return;
  }

  const activeElement =
    document.activeElement;

  if (
    !activeElement ||
    !activeElement.matches(
      SIDEBAR_CONFIG.SELECTORS.NAV_LINK
    )
  ) {
    return;
  }

  const visibleLinks = Array.from(
    sidebar.querySelectorAll(
      SIDEBAR_CONFIG.SELECTORS.NAV_LINK
    )
  ).filter((link) => {
    return (
      !link.hidden &&
      link.offsetParent !== null
    );
  });

  const currentIndex =
    visibleLinks.indexOf(
      activeElement
    );

  if (currentIndex === -1) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();

    const nextIndex =
      (currentIndex + 1) %
      visibleLinks.length;

    visibleLinks[nextIndex]
      ?.focus();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    const previousIndex =
      (
        currentIndex -
        1 +
        visibleLinks.length
      ) %
      visibleLinks.length;

    visibleLinks[previousIndex]
      ?.focus();
  }

  if (event.key === "Home") {
    event.preventDefault();
    visibleLinks[0]?.focus();
  }

  if (event.key === "End") {
    event.preventDefault();

    visibleLinks[
      visibleLinks.length - 1
    ]?.focus();
  }
}

/* =========================================================
   RESIZE HANDLING
   ========================================================= */

function handleViewportChange() {
  if (isMobileViewport()) {
    const appShell = getAppShell();

    appShell?.classList.remove(
      "sidebar-collapsed"
    );

    if (!sidebarState.mobileOpen) {
      getSidebar()?.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  } else {
    closeMobileSidebar();

    getSidebar()?.setAttribute(
      "aria-hidden",
      "false"
    );

    setSidebarCollapsed(
      getSavedCollapsedState(),
      {
        save: false
      }
    );
  }
}

const debouncedViewportChange =
  window.AssetFlowUtils?.debounce
    ? window.AssetFlowUtils.debounce(
        handleViewportChange,
        150
      )
    : (() => {
        let timeoutId;

        return () => {
          window.clearTimeout(
            timeoutId
          );

          timeoutId =
            window.setTimeout(
              handleViewportChange,
              150
            );
        };
      })();

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindSidebarEvents() {
  getSidebarToggleButtons().forEach(
    (button) => {
      if (
        button.dataset.sidebarReady ===
        "true"
      ) {
        return;
      }

      button.dataset.sidebarReady =
        "true";

      button.addEventListener(
        "click",
        toggleSidebarCollapsed
      );
    }
  );

  getMobileMenuButtons().forEach(
    (button) => {
      if (
        button.dataset.sidebarReady ===
        "true"
      ) {
        return;
      }

      button.dataset.sidebarReady =
        "true";

      button.addEventListener(
        "click",
        toggleMobileSidebar
      );
    }
  );

  getSidebarCloseButtons().forEach(
    (button) => {
      if (
        button.dataset.sidebarReady ===
        "true"
      ) {
        return;
      }

      button.dataset.sidebarReady =
        "true";

      button.addEventListener(
        "click",
        closeMobileSidebar
      );
    }
  );

  const overlay =
    getSidebarOverlay();

  if (
    overlay &&
    overlay.dataset.sidebarReady !==
      "true"
  ) {
    overlay.dataset.sidebarReady =
      "true";

    overlay.addEventListener(
      "click",
      closeMobileSidebar
    );
  }

  document
    .querySelectorAll(
      ".sidebar-link"
    )
    .forEach((link) => {
      if (
        link.dataset.sidebarLinkReady ===
        "true"
      ) {
        return;
      }

      link.dataset.sidebarLinkReady =
        "true";

      link.addEventListener(
        "click",
        () => {
          if (isMobileViewport()) {
            closeMobileSidebar();
          }
        }
      );
    });

  document.removeEventListener(
    "keydown",
    handleSidebarKeyboard
  );

  document.addEventListener(
    "keydown",
    handleSidebarKeyboard
  );
}

/* =========================================================
   OVERLAY CREATION
   ========================================================= */

function ensureSidebarOverlay() {
  let overlay =
    getSidebarOverlay();

  if (overlay) {
    return overlay;
  }

  overlay =
    document.createElement("div");

  overlay.id =
    "sidebarOverlay";

  overlay.className =
    "sidebar-overlay";

  overlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.appendChild(
    overlay
  );

  return overlay;
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeSidebar() {
  const sidebar = getSidebar();

  if (!sidebar) {
    return false;
  }

  ensureSidebarOverlay();

  sidebarState.collapsed =
    getSavedCollapsedState();

  if (isMobileViewport()) {
    sidebar.setAttribute(
      "aria-hidden",
      "true"
    );
  } else {
    sidebar.setAttribute(
      "aria-hidden",
      "false"
    );

    setSidebarCollapsed(
      sidebarState.collapsed,
      {
        save: false
      }
    );
  }

  applySidebarRoleVisibility();
  setActiveNavigation();
  updateCollapsedTooltips();
  bindSidebarEvents();

  sidebarState.initialized = true;

  window.dispatchEvent(
    new CustomEvent(
      "assetflow:sidebar-ready"
    )
  );

  return true;
}

/* =========================================================
   COMPONENT LOADER INTEGRATION
   ========================================================= */

window.addEventListener(
  "assetflow:components-ready",
  initializeSidebar
);

document.addEventListener(
  "assetflow:component-loaded",
  (event) => {
    if (
      event.detail?.componentName ===
      "sidebar"
    ) {
      initializeSidebar();
    }

    if (
      event.detail?.componentName ===
      "navbar"
    ) {
      bindSidebarEvents();
    }
  }
);

/* =========================================================
   WINDOW EVENTS
   ========================================================= */

window.addEventListener(
  "resize",
  debouncedViewportChange
);

window.addEventListener(
  "popstate",
  setActiveNavigation
);

/* =========================================================
   INITIAL START
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      /*
       The sidebar might not yet be loaded.
       initializeSidebar() runs again after
       assetflow:components-ready.
      */
      initializeSidebar();
    }
  );
} else {
  initializeSidebar();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowSidebar =
  Object.freeze({
    config: SIDEBAR_CONFIG,

    initialize: initializeSidebar,

    setCollapsed:
      setSidebarCollapsed,

    toggleCollapsed:
      toggleSidebarCollapsed,

    openMobile:
      openMobileSidebar,

    closeMobile:
      closeMobileSidebar,

    toggleMobile:
      toggleMobileSidebar,

    setActiveNavigation,
    applyRoleVisibility:
      applySidebarRoleVisibility,

    getState() {
      return {
        ...sidebarState
      };
    }
  });