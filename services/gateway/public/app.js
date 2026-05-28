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

function setTokens({ accessToken, refreshToken }) {
  if (typeof accessToken === "string" && accessToken) {
    localStorage.setItem(STORAGE_ACCESS, accessToken);
    localStorage.setItem(STORAGE_ACCESS_LEGACY, accessToken);
  }
  if (typeof refreshToken === "string" && refreshToken) {
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
    localStorage.setItem(STORAGE_REFRESH_LEGACY, refreshToken);
  }
  renderTokens();
}

function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_ACCESS_LEGACY);
  localStorage.removeItem(STORAGE_REFRESH_LEGACY);
  renderTokens();
}

function renderTokens() {
  if (!tokensEl) return;
  const { accessToken, refreshToken } = getTokens();
  tokensEl.textContent = JSON.stringify({ accessToken, refreshToken }, null, 2);
}

function setStatus(text, detail) {
  if (statusEl) statusEl.textContent = text;
  if (statusDetailEl) statusDetailEl.textContent = detail || "";
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

  clearTokens();
  setStatus("logged out", "Session invalid or expired. Tokens cleared.");
  showPayload(first.res, first.body, true);
}

document.getElementById("register").onclick = async () => {
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

document.getElementById("login").onclick = async () => {
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

document.getElementById("refresh").onclick = async () => {
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

document.getElementById("logout").onclick = async () => {
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

document.getElementById("me").onclick = async () => {
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

document.getElementById("clear").onclick = () => {
  clearTokens();
  setStatus("logged out", "Local tokens cleared.");
};

renderTokens();
validateSession().catch(() => {
  setStatus("error", "Failed to reach API.");
});

