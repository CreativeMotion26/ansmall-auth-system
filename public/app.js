const out = document.getElementById("out");
const tokensEl = document.getElementById("tokens");
const statusEl = document.getElementById("status");
const statusDetailEl = document.getElementById("statusDetail");

// New keys (preferred)
const STORAGE_ACCESS = "ansmall_access";
const STORAGE_REFRESH = "ansmall_refresh";

// Old keys (kept for backward compatibility with earlier demo page)
const STORAGE_ACCESS_LEGACY = "accessToken";
const STORAGE_REFRESH_LEGACY = "refreshToken";

function getTokens() {
  const accessToken =
    localStorage.getItem(STORAGE_ACCESS) ||
    localStorage.getItem(STORAGE_ACCESS_LEGACY) ||
    "";
  const refreshToken =
    localStorage.getItem(STORAGE_REFRESH) ||
    localStorage.getItem(STORAGE_REFRESH_LEGACY) ||
    "";
  return { accessToken, refreshToken };
}

function setTokens(body) {
  const { accessToken, refreshToken } = body || {};
  if (typeof accessToken === "string" && accessToken) {
    localStorage.setItem(STORAGE_ACCESS, accessToken);
    localStorage.setItem(STORAGE_ACCESS_LEGACY, accessToken);
  }
  if (typeof refreshToken === "string" && refreshToken) {
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
    localStorage.setItem(STORAGE_REFRESH_LEGACY, refreshToken);
  }
  rememberExpiresIn(body);
  renderTokens();
}

function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_ACCESS_LEGACY);
  localStorage.removeItem(STORAGE_REFRESH_LEGACY);
  sessionStorage.removeItem(STORAGE_EXPIRES_IN);
  renderTokens();
}

function renderTokens() {
  if (!tokensEl) return;
  const { accessToken, refreshToken } = getTokens();
  tokensEl.textContent = JSON.stringify({ accessToken, refreshToken }, null, 2);
}

const STORAGE_EXPIRES_IN = "ansmall_expires_in";

function expiresDetail() {
  const raw = sessionStorage.getItem(STORAGE_EXPIRES_IN);
  const seconds = raw ? Number(raw) : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  return `Access token TTL ~${minutes} min (${seconds}s). Refresh rotates on use.`;
}

function rememberExpiresIn(body) {
  if (typeof body?.expiresIn === "number") {
    sessionStorage.setItem(STORAGE_EXPIRES_IN, String(body.expiresIn));
  }
}

function setStatus(text, detail) {
  if (statusEl) statusEl.textContent = text;
  const extra = expiresDetail();
  const combined = [detail, extra].filter(Boolean).join(" ");
  if (statusDetailEl) statusDetailEl.textContent = combined;
}

function show(payload, isError) {
  if (!out) return;
  out.textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  out.className = isError ? "err" : "";
}

function showPayload(res, body, isError) {
  show({ status: res.status, ok: res.ok, body }, isError);
}

async function fetchJson(path, options = {}, { bearer = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (bearer) {
    const { accessToken } = getTokens();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

function getCreds() {
  return {
    email: document.getElementById("email")?.value || "",
    password: document.getElementById("password")?.value || "",
  };
}

// Attempts /api/me with access token; if 401 and refresh exists, rotates via /api/refresh and retries /api/me.
async function validateSession() {
  renderTokens();
  const { accessToken, refreshToken } = getTokens();

  if (!accessToken && !refreshToken) {
    setStatus("logged out", "No tokens stored.");
    return;
  }

  setStatus("checking…", "");
  const first = await fetchJson("/api/me", { method: "GET" }, { bearer: true });
  if (first.res.ok) {
    setStatus(
      "logged in",
      first.body?.user?.email ? `as ${first.body.user.email}` : "",
    );
    showPayload(first.res, first.body, false);
    return;
  }

  // If unauthorized, try refresh (rotation) then retry /me
  if (first.res.status === 401 && refreshToken) {
    const rotated = await fetchJson("/api/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    showPayload(rotated.res, rotated.body, !rotated.res.ok);
    if (rotated.res.ok) {
      setTokens(rotated.body || {});
      const second = await fetchJson(
        "/api/me",
        { method: "GET" },
        { bearer: true },
      );
      showPayload(second.res, second.body, !second.res.ok);
      if (second.res.ok) {
        setStatus(
          "logged in",
          second.body?.user?.email ? `as ${second.body.user.email}` : "",
        );
        return;
      }
    }
  }

  // Could not validate: clear local tokens for a clean slate
  clearTokens();
  setStatus("logged out", "Session invalid or expired. Tokens cleared.");
  showPayload(first.res, first.body, true);
}

document.getElementById("btnRegister").onclick = async () => {
  const { res, body } = await fetchJson("/api/register", {
    method: "POST",
    body: JSON.stringify(getCreds()),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    setTokens(body || {});
    await validateSession();
  }
};

document.getElementById("btnLogin").onclick = async () => {
  const { res, body } = await fetchJson("/api/login", {
    method: "POST",
    body: JSON.stringify(getCreds()),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    setTokens(body || {});
    await validateSession();
  }
};

document.getElementById("btnMe").onclick = async () => {
  const { res, body } = await fetchJson(
    "/api/me",
    { method: "GET" },
    { bearer: true },
  );
  showPayload(res, body, !res.ok);
  if (res.ok) {
    setStatus(
      "logged in",
      body?.user?.email ? `as ${body.user.email}` : "",
    );
  } else if (res.status === 401) {
    setStatus("unauthorized", "Access token missing/expired. Try refresh.");
  }
};

document.getElementById("btnRefresh").onclick = async () => {
  const { refreshToken } = getTokens();
  if (!refreshToken) {
    show(
      { status: 0, ok: false, body: { error: "No refresh token stored" } },
      true,
    );
    return;
  }
  const { res, body } = await fetchJson("/api/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  showPayload(res, body, !res.ok);
  if (res.ok) {
    setTokens(body || {});
    await validateSession();
  }
};

document.getElementById("btnLogout").onclick = async () => {
  const { refreshToken } = getTokens();
  if (!refreshToken) {
    clearTokens();
    setStatus("logged out", "No refresh token stored. Local tokens cleared.");
    return;
  }
  const { res, body } = await fetchJson("/api/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  showPayload(res, body, !res.ok);
  clearTokens();
  setStatus("logged out", "Refresh token revoked (if it existed).");
};

document.getElementById("btnLogoutAll").onclick = async () => {
  const { res, body } = await fetchJson(
    "/api/logout-all",
    { method: "POST" },
    { bearer: true },
  );
  showPayload(res, body, !res.ok);
  if (res.ok) {
    clearTokens();
    setStatus("logged out", "All refresh tokens revoked.");
  }
};

document.getElementById("btnChangePassword").onclick = async () => {
  const currentPassword = document.getElementById("currentPassword")?.value || "";
  const newPassword = document.getElementById("newPassword")?.value || "";
  const { res, body } = await fetchJson(
    "/api/me/password",
    {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    { bearer: true },
  );
  showPayload(res, body, !res.ok);
  if (res.ok) {
    clearTokens();
    setStatus("logged out", "Password changed; sign in again.");
  }
};

document.getElementById("btnDeleteAccount").onclick = async () => {
  const password = document.getElementById("password")?.value || "";
  const { res, body } = await fetchJson(
    "/api/me",
    {
      method: "DELETE",
      body: JSON.stringify({ password }),
    },
    { bearer: true },
  );
  showPayload(res, body, !res.ok);
  if (res.ok) {
    clearTokens();
    setStatus("logged out", "Account deleted.");
  }
};

document.getElementById("btnClear").onclick = () => {
  clearTokens();
  setStatus("logged out", "Local tokens cleared.");
};

// On load: health check + session validation
async function bootstrap() {
  renderTokens();
  try {
    const health = await fetchJson("/api/health", { method: "GET" });
    if (health.res.ok) {
      setStatus("ready", `API healthy (${health.body?.service ?? "auth"})`);
    }
  } catch {
    setStatus("error", "Failed to reach API. Run npm run dev.");
    return;
  }
  await validateSession();
}

bootstrap().catch(() => {
  setStatus("error", "Failed to reach API.");
});
