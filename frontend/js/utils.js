/* =========================================================
   AssetFlow — Shared Utility Functions
   File: frontend/js/utils.js
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const UTILS_CONFIG = Object.freeze({
  TOAST_DURATION: 4000,
  MODAL_CLOSE_DELAY: 180,
  DEBOUNCE_DELAY: 300,

  DATE_LOCALE: "en-IN",
  CURRENCY_LOCALE: "en-IN",
  CURRENCY_CODE: "INR"
});

/* =========================================================
   HTML AND STRING UTILITIES
   ========================================================= */

/**
 * Prevents unsafe HTML from being inserted into the page.
 */
function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Converts a value into a URL-safe slug.
 */
function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Capitalizes the first character.
 */
function capitalize(value = "") {
  const text = String(value).trim();

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

/**
 * Converts camelCase or PascalCase into readable text.
 */
function humanizeText(value = "") {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

/**
 * Truncates long text with an ellipsis.
 */
function truncateText(value = "", maxLength = 80) {
  const text = String(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}

/**
 * Returns initials from a name.
 */
function getInitials(name = "") {
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
 * Generates a random client-side identifier.
 */
function generateId(prefix = "assetflow") {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10);

  const timestamp = Date.now()
    .toString(36);

  return `${prefix}-${timestamp}-${randomPart}`;
}

/* =========================================================
   NUMBER AND CURRENCY UTILITIES
   ========================================================= */

function formatNumber(
  value,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = {}
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    UTILS_CONFIG.CURRENCY_LOCALE,
    {
      minimumFractionDigits,
      maximumFractionDigits
    }
  ).format(number);
}

function formatCurrency(
  value,
  currency = UTILS_CONFIG.CURRENCY_CODE
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    UTILS_CONFIG.CURRENCY_LOCALE,
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }
  ).format(amount);
}

function formatPercentage(
  value,
  maximumFractionDigits = 1
) {
  const percentage = Number(value);

  if (!Number.isFinite(percentage)) {
    return "0%";
  }

  return `${formatNumber(percentage, {
    maximumFractionDigits
  })}%`;
}

function clamp(value, minimum, maximum) {
  return Math.min(
    Math.max(Number(value), minimum),
    maximum
  );
}

/* =========================================================
   DATE AND TIME UTILITIES
   ========================================================= */

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(
  value,
  {
    day = "2-digit",
    month = "short",
    year = "numeric"
  } = {}
) {
  const date = parseDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    UTILS_CONFIG.DATE_LOCALE,
    {
      day,
      month,
      year
    }
  ).format(date);
}

function formatDateTime(
  value,
  {
    day = "2-digit",
    month = "short",
    year = "numeric",
    hour = "2-digit",
    minute = "2-digit"
  } = {}
) {
  const date = parseDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    UTILS_CONFIG.DATE_LOCALE,
    {
      day,
      month,
      year,
      hour,
      minute,
      hour12: true
    }
  ).format(date);
}

function formatTime(value) {
  const date = parseDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    UTILS_CONFIG.DATE_LOCALE,
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }
  ).format(date);
}

function formatDateInput(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTimeInput(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isPastDate(value) {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

function isFutureDate(value) {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  return date > new Date();
}

function getRelativeTime(value) {
  const date = parseDate(value);

  if (!date) {
    return "Unknown time";
  }

  const now = new Date();
  const difference =
    date.getTime() - now.getTime();

  const absoluteDifference =
    Math.abs(difference);

  const units = [
    {
      limit: 60 * 1000,
      divisor: 1000,
      unit: "second"
    },
    {
      limit: 60 * 60 * 1000,
      divisor: 60 * 1000,
      unit: "minute"
    },
    {
      limit: 24 * 60 * 60 * 1000,
      divisor: 60 * 60 * 1000,
      unit: "hour"
    },
    {
      limit: 30 * 24 * 60 * 60 * 1000,
      divisor: 24 * 60 * 60 * 1000,
      unit: "day"
    },
    {
      limit: 365 * 24 * 60 * 60 * 1000,
      divisor: 30 * 24 * 60 * 60 * 1000,
      unit: "month"
    },
    {
      limit: Infinity,
      divisor: 365 * 24 * 60 * 60 * 1000,
      unit: "year"
    }
  ];

  const selectedUnit = units.find(
    ({ limit }) =>
      absoluteDifference < limit
  );

  const amount = Math.round(
    difference / selectedUnit.divisor
  );

  return new Intl.RelativeTimeFormat(
    UTILS_CONFIG.DATE_LOCALE,
    {
      numeric: "auto"
    }
  ).format(amount, selectedUnit.unit);
}

function daysBetween(startValue, endValue) {
  const startDate = parseDate(startValue);
  const endDate = parseDate(endValue);

  if (!startDate || !endDate) {
    return 0;
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.ceil(
    (endDate - startDate) /
      millisecondsPerDay
  );
}

/* =========================================================
   STATUS UTILITIES
   ========================================================= */

const STATUS_CLASS_MAP = Object.freeze({
  available: "badge-available",
  approved: "badge-approved",
  verified: "badge-verified",
  resolved: "badge-resolved",
  active: "badge-success",

  allocated: "badge-allocated",
  ongoing: "badge-ongoing",
  "in progress": "badge-in-progress",
  inprogress: "badge-in-progress",

  pending: "badge-pending",
  reserved: "badge-reserved",
  "under maintenance":
    "badge-under-maintenance",
  undermaintenance:
    "badge-under-maintenance",
  "technician assigned":
    "badge-technician-assigned",
  technicianassigned:
    "badge-technician-assigned",

  lost: "badge-lost",
  rejected: "badge-rejected",
  overdue: "badge-overdue",
  missing: "badge-missing",
  damaged: "badge-damaged",

  retired: "badge-retired",
  disposed: "badge-disposed",
  cancelled: "badge-cancelled",
  completed: "badge-completed",
  returned: "badge-returned",
  closed: "badge-neutral",
  inactive: "badge-neutral"
});

function normalizeStatus(status = "") {
  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getStatusClass(status) {
  const normalizedStatus =
    normalizeStatus(status);

  return (
    STATUS_CLASS_MAP[normalizedStatus] ||
    "badge-neutral"
  );
}

function getStatusLabel(status) {
  if (!status) {
    return "Unknown";
  }

  return humanizeText(status);
}

function createStatusBadge(
  status,
  {
    dot = true,
    additionalClass = ""
  } = {}
) {
  const badge = document.createElement("span");

  badge.className = [
    "badge",
    dot ? "badge-dot" : "",
    getStatusClass(status),
    additionalClass
  ]
    .filter(Boolean)
    .join(" ");

  badge.textContent =
    getStatusLabel(status);

  return badge;
}

function getPriorityClass(priority) {
  const normalizedPriority =
    normalizeStatus(priority);

  const priorities = {
    low: "badge-neutral",
    medium: "badge-info",
    high: "badge-warning",
    urgent: "badge-danger"
  };

  return (
    priorities[normalizedPriority] ||
    "badge-neutral"
  );
}

/* =========================================================
   DOM UTILITIES
   ========================================================= */

function query(selector, parent = document) {
  return parent.querySelector(selector);
}

function queryAll(
  selector,
  parent = document
) {
  return Array.from(
    parent.querySelectorAll(selector)
  );
}

function createElement(
  tagName,
  {
    className = "",
    text = "",
    html = "",
    attributes = {},
    dataset = {}
  } = {}
) {
  const element =
    document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  if (html !== "") {
    element.innerHTML = html;
  }

  Object.entries(attributes).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null
      ) {
        element.setAttribute(
          key,
          String(value)
        );
      }
    }
  );

  Object.entries(dataset).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null
      ) {
        element.dataset[key] =
          String(value);
      }
    }
  );

  return element;
}

function showElement(element) {
  if (!element) {
    return;
  }

  element.hidden = false;
  element.classList.remove("hidden");
  element.setAttribute(
    "aria-hidden",
    "false"
  );
}

function hideElement(element) {
  if (!element) {
    return;
  }

  element.hidden = true;
  element.classList.add("hidden");
  element.setAttribute(
    "aria-hidden",
    "true"
  );
}

function toggleElement(
  element,
  force = undefined
) {
  if (!element) {
    return false;
  }

  const shouldShow =
    force !== undefined
      ? force
      : element.hidden ||
        element.classList.contains(
          "hidden"
        );

  if (shouldShow) {
    showElement(element);
  } else {
    hideElement(element);
  }

  return shouldShow;
}

function setText(selectorOrElement, value) {
  const element =
    typeof selectorOrElement === "string"
      ? query(selectorOrElement)
      : selectorOrElement;

  if (element) {
    element.textContent =
      value ?? "";
  }
}

function setHTML(selectorOrElement, html) {
  const element =
    typeof selectorOrElement === "string"
      ? query(selectorOrElement)
      : selectorOrElement;

  if (element) {
    element.innerHTML = html ?? "";
  }
}

function scrollToElement(
  element,
  {
    behavior = "smooth",
    block = "center"
  } = {}
) {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior,
    block
  });
}

/* =========================================================
   TOAST NOTIFICATIONS
   ========================================================= */

function getToastContainer() {
  let container = query(
    ".toast-container"
  );

  if (!container) {
    container = createElement("div", {
      className: "toast-container",
      attributes: {
        role: "region",
        "aria-label": "Notifications",
        "aria-live": "polite"
      }
    });

    document.body.appendChild(container);
  }

  return container;
}

function getToastIcon(type) {
  const icons = {
    success: `
      <svg viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `,

    danger: `
      <svg viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m15 9-6 6M9 9l6 6"></path>
      </svg>
    `,

    warning: `
      <svg viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           aria-hidden="true">
        <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"></path>
        <path d="M12 9v4"></path>
        <path d="M12 17h.01"></path>
      </svg>
    `,

    info: `
      <svg viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 16v-4"></path>
        <path d="M12 8h.01"></path>
      </svg>
    `
  };

  return icons[type] || icons.info;
}

function getToastTitle(type) {
  const titles = {
    success: "Success",
    danger: "Error",
    warning: "Attention",
    info: "Information"
  };

  return titles[type] || "Notification";
}

function removeToast(toast) {
  if (!toast || toast.dataset.removing) {
    return;
  }

  toast.dataset.removing = "true";
  toast.classList.add("removing");

  window.setTimeout(() => {
    toast.remove();
  }, 260);
}

function showToast(
  message,
  type = "info",
  {
    title = "",
    duration = UTILS_CONFIG.TOAST_DURATION,
    persistent = false
  } = {}
) {
  const supportedTypes = [
    "success",
    "danger",
    "warning",
    "info"
  ];

  const normalizedType =
    supportedTypes.includes(type)
      ? type
      : "info";

  const container =
    getToastContainer();

  const toast = createElement("div", {
    className:
      `toast toast-${normalizedType}`,
    attributes: {
      role:
        normalizedType === "danger"
          ? "alert"
          : "status"
    }
  });

  toast.innerHTML = `
    <div class="toast-icon">
      ${getToastIcon(normalizedType)}
    </div>

    <div class="toast-content">
      <div class="toast-title">
        ${escapeHTML(
          title ||
          getToastTitle(normalizedType)
        )}
      </div>

      <div class="toast-message">
        ${escapeHTML(message)}
      </div>
    </div>

    <button
      type="button"
      class="toast-close"
      aria-label="Close notification"
    >
      <svg viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           aria-hidden="true">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </button>
  `;

  if (!persistent && duration > 0) {
    const progress =
      createElement("div", {
        className: "toast-progress"
      });

    progress.style.animationDuration =
      `${duration}ms`;

    toast.appendChild(progress);

    toast.toastTimeout =
      window.setTimeout(() => {
        removeToast(toast);
      }, duration);
  }

  const closeButton =
    query(".toast-close", toast);

  closeButton?.addEventListener(
    "click",
    () => {
      if (toast.toastTimeout) {
        window.clearTimeout(
          toast.toastTimeout
        );
      }

      removeToast(toast);
    }
  );

  container.appendChild(toast);

  return toast;
}

/* =========================================================
   MODALS
   ========================================================= */

function resolveElement(
  elementOrSelector
) {
  if (!elementOrSelector) {
    return null;
  }

  if (
    typeof elementOrSelector === "string"
  ) {
    return query(elementOrSelector);
  }

  return elementOrSelector;
}

function openModal(
  modalOrSelector,
  {
    focusSelector = null
  } = {}
) {
  const modalElement =
    resolveElement(modalOrSelector);

  if (!modalElement) {
    return false;
  }

  const overlay =
    modalElement.classList.contains(
      "modal-overlay"
    )
      ? modalElement
      : modalElement.closest(
          ".modal-overlay"
        );

  if (!overlay) {
    return false;
  }

  overlay.previousFocusedElement =
    document.activeElement;

  overlay.classList.remove("closing");
  overlay.classList.add("open");

  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );

  const modal =
    query(".modal", overlay);

  modal?.setAttribute(
    "aria-modal",
    "true"
  );

  const focusTarget =
    focusSelector
      ? query(focusSelector, overlay)
      : query(
          [
            "[autofocus]",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "button:not([disabled])",
            "[tabindex]:not([tabindex='-1'])"
          ].join(","),
          overlay
        );

  window.setTimeout(() => {
    focusTarget?.focus();
  }, 100);

  return true;
}

function closeModal(modalOrSelector) {
  const modalElement =
    resolveElement(modalOrSelector);

  if (!modalElement) {
    return false;
  }

  const overlay =
    modalElement.classList.contains(
      "modal-overlay"
    )
      ? modalElement
      : modalElement.closest(
          ".modal-overlay"
        );

  if (!overlay) {
    return false;
  }

  overlay.classList.add("closing");

  window.setTimeout(() => {
    overlay.classList.remove(
      "open",
      "closing"
    );

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    const openedModals =
      queryAll(".modal-overlay.open");

    if (openedModals.length === 0) {
      document.body.classList.remove(
        "no-scroll"
      );
    }

    overlay.previousFocusedElement
      ?.focus?.();
  }, UTILS_CONFIG.MODAL_CLOSE_DELAY);

  return true;
}

function initializeModals() {
  document.addEventListener(
    "click",
    (event) => {
      const openButton =
        event.target.closest(
          "[data-modal-open]"
        );

      if (openButton) {
        event.preventDefault();

        openModal(
          openButton.dataset.modalOpen
        );

        return;
      }

      const closeButton =
        event.target.closest(
          "[data-modal-close]"
        );

      if (closeButton) {
        event.preventDefault();

        closeModal(closeButton);

        return;
      }

      const overlay =
        event.target.classList.contains(
          "modal-overlay"
        )
          ? event.target
          : null;

      if (
        overlay &&
        overlay.dataset.closeOnOverlay !==
          "false"
      ) {
        closeModal(overlay);
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      const openedModal =
        query(".modal-overlay.open");

      if (openedModal) {
        closeModal(openedModal);
      }
    }
  );
}

/* =========================================================
   CONFIRMATION MODAL
   ========================================================= */

function confirmAction({
  title = "Confirm action",
  message =
    "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
} = {}) {
  return new Promise((resolve) => {
    const modalId =
      generateId("confirmation");

    const overlay =
      createElement("div", {
        className:
          "modal-overlay confirmation-overlay",
        attributes: {
          id: modalId,
          "aria-hidden": "true"
        }
      });

    const confirmButtonClass =
      type === "danger"
        ? "btn-danger"
        : type === "warning"
          ? "btn-warning"
          : "btn-primary";

    overlay.innerHTML = `
      <div
        class="modal modal-sm"
        role="dialog"
        aria-labelledby="${modalId}-title"
        aria-describedby="${modalId}-message"
      >
        <div class="modal-header">
          <div>
            <h2
              class="modal-title"
              id="${modalId}-title"
            >
              ${escapeHTML(title)}
            </h2>
          </div>

          <button
            type="button"
            class="modal-close"
            data-confirm-cancel
            aria-label="Close confirmation"
          >
            <svg viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <p id="${modalId}-message">
            ${escapeHTML(message)}
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline"
            data-confirm-cancel
          >
            ${escapeHTML(cancelText)}
          </button>

          <button
            type="button"
            class="btn ${confirmButtonClass}"
            data-confirm-submit
          >
            ${escapeHTML(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let resolved = false;

    const finish = (result) => {
      if (resolved) {
        return;
      }

      resolved = true;
      closeModal(overlay);

      window.setTimeout(() => {
        overlay.remove();
      }, UTILS_CONFIG.MODAL_CLOSE_DELAY + 30);

      resolve(result);
    };

    queryAll(
      "[data-confirm-cancel]",
      overlay
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => finish(false)
      );
    });

    query(
      "[data-confirm-submit]",
      overlay
    )?.addEventListener(
      "click",
      () => finish(true)
    );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          finish(false);
        }
      }
    );

    openModal(overlay, {
      focusSelector:
        "[data-confirm-submit]"
    });
  });
}

/* =========================================================
   DRAWERS
   ========================================================= */

function openDrawer(drawerOrSelector) {
  const drawerElement =
    resolveElement(drawerOrSelector);

  if (!drawerElement) {
    return false;
  }

  const overlay =
    drawerElement.classList.contains(
      "drawer-overlay"
    )
      ? drawerElement
      : drawerElement.closest(
          ".drawer-overlay"
        );

  if (!overlay) {
    return false;
  }

  overlay.classList.remove("closing");
  overlay.classList.add("open");
  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );

  return true;
}

function closeDrawer(drawerOrSelector) {
  const drawerElement =
    resolveElement(drawerOrSelector);

  if (!drawerElement) {
    return false;
  }

  const overlay =
    drawerElement.classList.contains(
      "drawer-overlay"
    )
      ? drawerElement
      : drawerElement.closest(
          ".drawer-overlay"
        );

  if (!overlay) {
    return false;
  }

  overlay.classList.add("closing");

  window.setTimeout(() => {
    overlay.classList.remove(
      "open",
      "closing"
    );

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "no-scroll"
    );
  }, 220);

  return true;
}

function initializeDrawers() {
  document.addEventListener(
    "click",
    (event) => {
      const openButton =
        event.target.closest(
          "[data-drawer-open]"
        );

      if (openButton) {
        event.preventDefault();

        openDrawer(
          openButton.dataset.drawerOpen
        );

        return;
      }

      const closeButton =
        event.target.closest(
          "[data-drawer-close]"
        );

      if (closeButton) {
        event.preventDefault();

        closeDrawer(closeButton);
      }
    }
  );
}

/* =========================================================
   DROPDOWNS
   ========================================================= */

function closeAllDropdowns(
  except = null
) {
  queryAll(".dropdown.open").forEach(
    (dropdown) => {
      if (dropdown !== except) {
        dropdown.classList.remove("open");

        query(
          "[aria-expanded]",
          dropdown
        )?.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );
}

function initializeDropdowns() {
  document.addEventListener(
    "click",
    (event) => {
      const trigger =
        event.target.closest(
          "[data-dropdown-toggle]"
        );

      if (trigger) {
        event.preventDefault();
        event.stopPropagation();

        const dropdown =
          trigger.closest(".dropdown");

        if (!dropdown) {
          return;
        }

        const shouldOpen =
          !dropdown.classList.contains(
            "open"
          );

        closeAllDropdowns(dropdown);

        dropdown.classList.toggle(
          "open",
          shouldOpen
        );

        trigger.setAttribute(
          "aria-expanded",
          String(shouldOpen)
        );

        return;
      }

      if (
        !event.target.closest(".dropdown")
      ) {
        closeAllDropdowns();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeAllDropdowns();
      }
    }
  );
}

/* =========================================================
   TABS
   ========================================================= */

function activateTab(
  tabButton,
  {
    emitEvent = true
  } = {}
) {
  if (!tabButton) {
    return;
  }

  const tabsContainer =
    tabButton.closest("[data-tabs]") ||
    tabButton.closest(".tabs")
      ?.parentElement;

  const targetSelector =
    tabButton.dataset.tabTarget;

  if (!targetSelector) {
    return;
  }

  const relatedButtons = tabsContainer
    ? queryAll(
        "[data-tab-target]",
        tabsContainer
      )
    : queryAll("[data-tab-target]");

  relatedButtons.forEach((button) => {
    const active =
      button === tabButton;

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

  const panelScope =
    tabsContainer || document;

  queryAll(
    "[data-tab-panel]",
    panelScope
  ).forEach((panel) => {
    const active =
      `#${panel.id}` ===
        targetSelector ||
      panel.dataset.tabPanel ===
        targetSelector.replace("#", "");

    panel.classList.toggle(
      "active",
      active
    );

    panel.hidden = !active;
  });

  if (emitEvent) {
    tabButton.dispatchEvent(
      new CustomEvent(
        "assetflow:tab-change",
        {
          bubbles: true,
          detail: {
            target: targetSelector
          }
        }
      )
    );
  }
}

function initializeTabs() {
  document.addEventListener(
    "click",
    (event) => {
      const tabButton =
        event.target.closest(
          "[data-tab-target]"
        );

      if (!tabButton) {
        return;
      }

      event.preventDefault();
      activateTab(tabButton);
    }
  );

  queryAll("[data-tabs]").forEach(
    (tabsContainer) => {
      const activeButton =
        query(
          "[data-tab-target].active",
          tabsContainer
        ) ||
        query(
          "[data-tab-target]",
          tabsContainer
        );

      if (activeButton) {
        activateTab(activeButton, {
          emitEvent: false
        });
      }
    }
  );
}

/* =========================================================
   FORM UTILITIES
   ========================================================= */

function serializeForm(form) {
  if (!form) {
    return {};
  }

  const formData = new FormData(form);
  const result = {};

  formData.forEach((value, key) => {
    if (
      Object.prototype.hasOwnProperty.call(
        result,
        key
      )
    ) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }

      result[key].push(value);
    } else {
      result[key] = value;
    }
  });

  return result;
}

function populateForm(form, data = {}) {
  if (!form) {
    return;
  }

  Object.entries(data).forEach(
    ([name, value]) => {
      const fields = queryAll(
        `[name="${CSS.escape(name)}"]`,
        form
      );

      fields.forEach((field) => {
        if (
          field.type === "checkbox"
        ) {
          if (Array.isArray(value)) {
            field.checked =
              value.includes(field.value);
          } else {
            field.checked =
              Boolean(value);
          }

          return;
        }

        if (field.type === "radio") {
          field.checked =
            String(field.value) ===
            String(value);

          return;
        }

        field.value =
          value ?? "";
      });
    }
  );
}

function clearFormValidation(form) {
  if (!form) {
    return;
  }

  queryAll(
    ".form-group",
    form
  ).forEach((group) => {
    group.classList.remove(
      "has-error",
      "has-success"
    );
  });

  queryAll(
    ".form-error",
    form
  ).forEach((errorElement) => {
    errorElement.textContent = "";
    errorElement.classList.remove(
      "visible"
    );
  });

  queryAll(
    "input, select, textarea",
    form
  ).forEach((field) => {
    field.classList.remove(
      "error",
      "success"
    );

    field.removeAttribute(
      "aria-invalid"
    );
  });
}

function showFieldError(
  fieldOrName,
  message,
  form = document
) {
  const field =
    typeof fieldOrName === "string"
      ? query(
          `[name="${CSS.escape(
            fieldOrName
          )}"]`,
          form
        )
      : fieldOrName;

  if (!field) {
    return;
  }

  const group =
    field.closest(".form-group");

  field.classList.add("error");
  field.setAttribute(
    "aria-invalid",
    "true"
  );

  if (!group) {
    return;
  }

  group.classList.add("has-error");
  group.classList.remove("has-success");

  let errorElement =
    query(".form-error", group);

  if (!errorElement) {
    errorElement =
      createElement("div", {
        className: "form-error"
      });

    group.appendChild(errorElement);
  }

  errorElement.textContent = message;
  errorElement.classList.add("visible");
}

function clearFieldError(field) {
  if (!field) {
    return;
  }

  const group =
    field.closest(".form-group");

  field.classList.remove("error");
  field.removeAttribute(
    "aria-invalid"
  );

  if (!group) {
    return;
  }

  group.classList.remove("has-error");

  const errorElement =
    query(".form-error", group);

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.remove(
      "visible"
    );
  }
}

function applyApiFieldError(
  form,
  error
) {
  if (!form || !error) {
    return false;
  }

  const fieldName =
    error.field ||
    error.data?.field;

  if (!fieldName) {
    return false;
  }

  const field = query(
    `[name="${CSS.escape(
      fieldName
    )}"]`,
    form
  );

  if (!field) {
    return false;
  }

  showFieldError(
    field,
    error.message
  );

  field.focus();

  return true;
}

function setButtonLoading(
  button,
  loading,
  loadingText = "Please wait..."
) {
  if (!button) {
    return;
  }

  if (loading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent.trim();
    }

    button.disabled = true;
    button.classList.add(
      "btn-loading"
    );

    button.setAttribute(
      "aria-busy",
      "true"
    );

    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.classList.remove(
      "btn-loading"
    );

    button.removeAttribute(
      "aria-busy"
    );

    if (button.dataset.originalText) {
      button.textContent =
        button.dataset.originalText;

      delete button.dataset.originalText;
    }
  }
}

function setFormLoading(
  form,
  loading,
  loadingText = "Please wait..."
) {
  if (!form) {
    return;
  }

  const submitButton = query(
    '[type="submit"]',
    form
  );

  queryAll(
    "input, select, textarea, button",
    form
  ).forEach((field) => {
    field.disabled = loading;
  });

  setButtonLoading(
    submitButton,
    loading,
    loadingText
  );
}

/* =========================================================
   PAGE AND COMPONENT LOADING
   ========================================================= */

function showPageLoader(
  message = "Loading AssetFlow..."
) {
  let loader = query(
    ".full-page-loader"
  );

  if (!loader) {
    loader =
      createElement("div", {
        className: "full-page-loader",
        attributes: {
          role: "status",
          "aria-live": "polite"
        }
      });

    loader.innerHTML = `
      <div class="full-page-loader-content">
        <div class="loader-spinner"></div>
        <span data-loader-message></span>
      </div>
    `;

    document.body.appendChild(loader);
  }

  setText(
    query(
      "[data-loader-message]",
      loader
    ),
    message
  );

  loader.classList.add("visible");
  loader.setAttribute(
    "aria-hidden",
    "false"
  );
}

function hidePageLoader() {
  const loader = query(
    ".full-page-loader"
  );

  if (!loader) {
    return;
  }

  loader.classList.remove("visible");
  loader.setAttribute(
    "aria-hidden",
    "true"
  );
}

function renderSkeletonRows(
  container,
  {
    rows = 5,
    columns = 5
  } = {}
) {
  if (!container) {
    return;
  }

  const skeletonRows =
    Array.from(
      { length: rows },
      () => `
        <tr>
          ${Array.from(
            { length: columns },
            () => `
              <td>
                <div class="skeleton skeleton-text"></div>
              </td>
            `
          ).join("")}
        </tr>
      `
    ).join("");

  container.innerHTML = skeletonRows;
}

/* =========================================================
   EMPTY AND ERROR STATES
   ========================================================= */

function renderEmptyState(
  container,
  {
    title = "Nothing here yet",
    message =
      "There is currently no data to display.",
    actionText = "",
    actionId = ""
  } = {}
) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="state-container">
      <div class="state-icon">
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.8"
             aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M8 6V4h8v2"></path>
          <rect x="4" y="6" width="16" height="14" rx="2"></rect>
          <path d="M9 11h6"></path>
        </svg>
      </div>

      <h3 class="state-title">
        ${escapeHTML(title)}
      </h3>

      <p class="state-description">
        ${escapeHTML(message)}
      </p>

      ${
        actionText
          ? `
            <div class="state-action">
              <button
                type="button"
                class="btn btn-primary"
                ${actionId
                  ? `id="${escapeHTML(actionId)}"`
                  : ""}
              >
                ${escapeHTML(actionText)}
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderErrorState(
  container,
  {
    title = "Unable to load data",
    message =
      "Something went wrong while loading this section.",
    retryText = "Try again",
    retryId = ""
  } = {}
) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="state-container error">
      <div class="state-icon">
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.8"
             aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </div>

      <h3 class="state-title">
        ${escapeHTML(title)}
      </h3>

      <p class="state-description">
        ${escapeHTML(message)}
      </p>

      <div class="state-action">
        <button
          type="button"
          class="btn btn-outline"
          ${retryId
            ? `id="${escapeHTML(retryId)}"`
            : ""}
        >
          ${escapeHTML(retryText)}
        </button>
      </div>
    </div>
  `;
}

/* =========================================================
   SEARCH, SORTING AND FILTERING
   ========================================================= */

function debounce(
  callback,
  delay = UTILS_CONFIG.DEBOUNCE_DELAY
) {
  let timeoutId;

  return function debouncedFunction(
    ...args
  ) {
    window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(
      () => {
        callback.apply(this, args);
      },
      delay
    );
  };
}

function throttle(
  callback,
  delay = 250
) {
  let waiting = false;

  return function throttledFunction(
    ...args
  ) {
    if (waiting) {
      return;
    }

    callback.apply(this, args);
    waiting = true;

    window.setTimeout(() => {
      waiting = false;
    }, delay);
  };
}

function filterBySearch(
  items,
  searchTerm,
  fields = []
) {
  const normalizedSearch =
    String(searchTerm)
      .trim()
      .toLowerCase();

  if (!normalizedSearch) {
    return [...items];
  }

  return items.filter((item) => {
    if (fields.length === 0) {
      return JSON.stringify(item)
        .toLowerCase()
        .includes(normalizedSearch);
    }

    return fields.some((field) => {
      const value = getNestedValue(
        item,
        field
      );

      return String(value ?? "")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  });
}

function sortItems(
  items,
  field,
  direction = "asc"
) {
  const multiplier =
    direction === "desc" ? -1 : 1;

  return [...items].sort(
    (firstItem, secondItem) => {
      const firstValue =
        getNestedValue(
          firstItem,
          field
        );

      const secondValue =
        getNestedValue(
          secondItem,
          field
        );

      if (
        firstValue === null ||
        firstValue === undefined
      ) {
        return 1;
      }

      if (
        secondValue === null ||
        secondValue === undefined
      ) {
        return -1;
      }

      if (
        typeof firstValue === "number" &&
        typeof secondValue === "number"
      ) {
        return (
          (firstValue - secondValue) *
          multiplier
        );
      }

      return (
        String(firstValue).localeCompare(
          String(secondValue),
          undefined,
          {
            numeric: true,
            sensitivity: "base"
          }
        ) * multiplier
      );
    }
  );
}

function getNestedValue(
  object,
  path
) {
  return String(path)
    .split(".")
    .reduce(
      (value, key) =>
        value?.[key],
      object
    );
}

/* =========================================================
   LOCAL STORAGE UTILITIES
   ========================================================= */

function saveLocalData(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(
      `Unable to save "${key}" in local storage.`,
      error
    );

    return false;
  }
}

function getLocalData(
  key,
  fallback = null
) {
  try {
    const value =
      localStorage.getItem(key);

    return value === null
      ? fallback
      : JSON.parse(value);
  } catch (error) {
    console.error(
      `Unable to read "${key}" from local storage.`,
      error
    );

    return fallback;
  }
}

function removeLocalData(key) {
  localStorage.removeItem(key);
}

/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportToCSV(
  rows,
  filename = "assetflow-export.csv"
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    showToast(
      "There is no data available to export.",
      "warning"
    );

    return;
  }

  const headers =
    Array.from(
      new Set(
        rows.flatMap((row) =>
          Object.keys(row)
        )
      )
    );

  const escapeCSVValue = (value) => {
    const stringValue =
      value === null ||
      value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

    return `"${stringValue.replaceAll(
      '"',
      '""'
    )}"`;
  };

  const csvContent = [
    headers
      .map(escapeCSVValue)
      .join(","),

    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCSVValue(row[header])
        )
        .join(",")
    )
  ].join("\n");

  const blob = new Blob(
    [`\uFEFF${csvContent}`],
    {
      type:
        "text/csv;charset=utf-8;"
    }
  );

  const downloadUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}

/* =========================================================
   COPY TO CLIPBOARD
   ========================================================= */

async function copyToClipboard(
  value,
  successMessage =
    "Copied to clipboard."
) {
  try {
    await navigator.clipboard.writeText(
      String(value)
    );

    showToast(
      successMessage,
      "success"
    );

    return true;
  } catch (error) {
    console.error(
      "Unable to copy to clipboard.",
      error
    );

    showToast(
      "Unable to copy this value.",
      "danger"
    );

    return false;
  }
}

/* =========================================================
   URL QUERY UTILITIES
   ========================================================= */

function getQueryParameter(name) {
  return new URLSearchParams(
    window.location.search
  ).get(name);
}

function setQueryParameters(
  parameters,
  {
    replace = true
  } = {}
) {
  const url =
    new URL(window.location.href);

  Object.entries(parameters).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  const method = replace
    ? "replaceState"
    : "pushState";

  window.history[method](
    {},
    "",
    url.toString()
  );
}

/* =========================================================
   GENERAL ERROR HANDLING
   ========================================================= */

function handleApiError(
  error,
  {
    form = null,
    fallbackMessage =
      "Something went wrong. Please try again.",
    showNotification = true
  } = {}
) {
  const message =
    error?.message ||
    fallbackMessage;

  let fieldErrorApplied = false;

  if (form) {
    fieldErrorApplied =
      applyApiFieldError(
        form,
        error
      );
  }

  if (
    showNotification &&
    !fieldErrorApplied
  ) {
    showToast(
      message,
      "danger"
    );
  }

  console.error(
    "AssetFlow API error:",
    error
  );

  return message;
}

/* =========================================================
   ACCESSIBILITY HELPERS
   ========================================================= */

function announce(
  message,
  priority = "polite"
) {
  let liveRegion = query(
    "#assetflow-live-region"
  );

  if (!liveRegion) {
    liveRegion =
      createElement("div", {
        className: "sr-only",
        attributes: {
          id: "assetflow-live-region",
          "aria-live": priority,
          "aria-atomic": "true"
        }
      });

    document.body.appendChild(
      liveRegion
    );
  }

  liveRegion.setAttribute(
    "aria-live",
    priority
  );

  liveRegion.textContent = "";

  window.setTimeout(() => {
    liveRegion.textContent =
      message;
  }, 50);
}

/* =========================================================
   GLOBAL EVENT INITIALIZATION
   ========================================================= */

function initializeUtilityEvents() {
  initializeModals();
  initializeDrawers();
  initializeDropdowns();
  initializeTabs();

  document.addEventListener(
    "input",
    (event) => {
      const field =
        event.target.closest(
          "input, select, textarea"
        );

      if (
        field &&
        field.classList.contains(
          "error"
        )
      ) {
        clearFieldError(field);
      }
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      const copyButton =
        event.target.closest(
          "[data-copy-value]"
        );

      if (copyButton) {
        copyToClipboard(
          copyButton.dataset.copyValue
        );
      }
    }
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeUtilityEvents
  );
} else {
  initializeUtilityEvents();
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */

window.AssetFlowUtils = Object.freeze({
  config: UTILS_CONFIG,

  escapeHTML,
  slugify,
  capitalize,
  humanizeText,
  truncateText,
  getInitials,
  generateId,

  formatNumber,
  formatCurrency,
  formatPercentage,
  clamp,

  parseDate,
  formatDate,
  formatDateTime,
  formatTime,
  formatDateInput,
  formatDateTimeInput,
  isPastDate,
  isFutureDate,
  getRelativeTime,
  daysBetween,

  normalizeStatus,
  getStatusClass,
  getStatusLabel,
  getPriorityClass,
  createStatusBadge,

  query,
  queryAll,
  createElement,
  showElement,
  hideElement,
  toggleElement,
  setText,
  setHTML,
  scrollToElement,

  showToast,
  removeToast,

  openModal,
  closeModal,
  confirmAction,

  openDrawer,
  closeDrawer,

  closeAllDropdowns,
  activateTab,

  serializeForm,
  populateForm,
  clearFormValidation,
  showFieldError,
  clearFieldError,
  applyApiFieldError,
  setButtonLoading,
  setFormLoading,

  showPageLoader,
  hidePageLoader,
  renderSkeletonRows,
  renderEmptyState,
  renderErrorState,

  debounce,
  throttle,
  filterBySearch,
  sortItems,
  getNestedValue,

  saveLocalData,
  getLocalData,
  removeLocalData,

  exportToCSV,
  copyToClipboard,

  getQueryParameter,
  setQueryParameters,

  handleApiError,
  announce
});