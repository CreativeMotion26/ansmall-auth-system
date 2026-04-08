/**
 * How does this file work?
 * 
 * This is the main frontend authentication logic for interacting with the backend API.
 * 
 * It manages:
 *   - UI updates and status messages for login/register/logout.
 *   - Storage/retrieval of JWT access and refresh tokens in localStorage.
 *   - Sending authenticated fetch requests with the proper Bearer token header.
 *   - Automatically handles token refresh when the access token expires.
 *   - Utility functions to show response data or errors in the page.
 *   - Button event handlers for login, register, fetch-me, refresh, and logout actions.
 * 
 * On page load, it attempts to refresh the session automatically.
 */

// -- DOM Element References --
const out = document.getElementById("out");       // Output box for showing API responses
const statusEl = document.getElementById("status"); // Status display text element

// -- Keys for localStorage --
const STORAGE_ACCESS = "ansmall_access";   // access token key
const STORAGE_REFRESH = "ansmall_refresh"; // refresh token key

// -- Helpers for token management --

// Get access token from localStorage
function getAccess() {
  return localStorage.getItem(STORAGE_ACCESS) || "";
}

// Get refresh token from localStorage
function getRefresh() {
  return localStorage.getItem(STORAGE_REFRESH) || "";
}

// Save access and/or refresh tokens from backend response
function saveTokensFromResponse(body) {
  if (body?.accessToken) {
    localStorage.setItem(STORAGE_ACCESS, body.accessToken);
  }
  if (body?.refreshToken) {
    localStorage.setItem(STORAGE_REFRESH, body.refreshToken);
  }
}

// Clear both tokens from localStorage
function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

// -- UI helpers --

// Update the status text in the DOM based on login state/email
function setStatus(isLoggedIn, email) {
  if (!statusEl) return;
  if (!isLoggedIn) {
    statusEl.textContent = "logged out";
    return;
  }
  statusEl.textContent = email ? `logged in as ${email}` : "logged in";
}

// Show a value (object or string) in the out element, optionally mark as error
function show(payload, isError) {
  out.textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  out.className = isError ? "err" : "";
}

// Shorthand to show a typical API response with its status
function showPayload(res, body, isError) {
  show({ status: res.status, ok: res.ok, body }, isError);
}

// -- API interaction helpers --

// Make a fetch request, optionally with Bearer auth header
async function fetchAuth(path, options = {}, useBearer = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (useBearer && getAccess()) {
    headers.Authorization = `Bearer ${getAccess()}`;
  }
  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  return { res, body };
}

// -- Main session (re)validation workflow --

// Attempts to fetch /api/me with the access token. 
// If unauthorized, tries the refresh token, then retries /api/me.
// If all fails, logs out.
async function refreshMe() {
  const first = await fetchAuth("/api/me", { method: "GET" }, true);
  if (first.res.ok) {
    showPayload(first.res, first.body, false);
    setStatus(true, first.body?.user?.email);
    return;
  }

  showPayload(first.res, first.body, true);

  // If token expired, attempt to refresh
  if (first.res.status === 401 && getRefresh()) {
    const rotated = await fetchAuth("/api/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefresh() }),
    });
    if (rotated.res.ok) {
      saveTokensFromResponse(rotated.body);
      showPayload(rotated.res, rotated.body, false);
      // Try /me again with new token
      const second = await fetchAuth("/api/me", { method: "GET" }, true);
      if (second.res.ok) {
        showPayload(second.res, second.body, false);
        setStatus(true, second.body?.user?.email);
        return;
      }
      showPayload(second.res, second.body, true);
    }
  }

  // Could not validate session, log out
  clearTokens();
  setStatus(false);
}

// -- UI Event Handlers --

// Registration flow: collects email/password, calls /register, saves tokens
document.getElementById("btnRegister").onclick = async () => {
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const { res, body } = await fetchAuth("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    saveTokensFromResponse(body);
    setStatus(true, body?.user?.email);
  }
};

// Login flow: collects email/password, calls /login, saves tokens
document.getElementById("btnLogin").onclick = async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const { res, body } = await fetchAuth("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    saveTokensFromResponse(body);
    setStatus(true, body?.user?.email);
  }
};

// "Me" button: tries to validate current session state
document.getElementById("btnMe").onclick = () => {
  refreshMe().catch(() => {});
};

// Refresh token flow: manually POST refresh token to /api/refresh
document.getElementById("btnRefresh").onclick = async () => {
  if (!getRefresh()) {
    show(
      {
        status: 0,
        ok: false,
        body: { error: "No refresh token in localStorage" },
      },
      true,
    );
    return;
  }
  const { res, body } = await fetchAuth("/api/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: getRefresh() }),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    saveTokensFromResponse(body);
    setStatus(true, body?.user?.email);
  }
};

// Logout flow: calls /api/logout, then clears tokens and UI status
document.getElementById("btnLogout").onclick = async () => {
  if (!getRefresh()) {
    show(
      { status: 400, ok: false, body: { error: "No refresh token stored" } },
      true,
    );
    clearTokens();
    setStatus(false);
    return;
  }
  const { res, body } = await fetchAuth("/api/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken: getRefresh() }),
  });
  showPayload(res, body, !res.ok);
  clearTokens();
  setStatus(false);
};

// On page load, attempt to restore current session
refreshMe().catch(() => {});
