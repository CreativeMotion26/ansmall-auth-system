const out = document.getElementById("out");
const statusEl = document.getElementById("status");

const STORAGE_ACCESS = "ansmall_access";
const STORAGE_REFRESH = "ansmall_refresh";

function getAccess() {
  return localStorage.getItem(STORAGE_ACCESS) || "";
}

function getRefresh() {
  return localStorage.getItem(STORAGE_REFRESH) || "";
}

function saveTokensFromResponse(body) {
  if (body?.accessToken) {
    localStorage.setItem(STORAGE_ACCESS, body.accessToken);
  }
  if (body?.refreshToken) {
    localStorage.setItem(STORAGE_REFRESH, body.refreshToken);
  }
}

function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

function setStatus(isLoggedIn, email) {
  if (!statusEl) return;
  if (!isLoggedIn) {
    statusEl.textContent = "logged out";
    return;
  }
  statusEl.textContent = email ? `logged in as ${email}` : "logged in";
}

function show(payload, isError) {
  out.textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  out.className = isError ? "err" : "";
}

function showPayload(res, body, isError) {
  show({ status: res.status, ok: res.ok, body }, isError);
}

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

async function refreshMe() {
  const first = await fetchAuth("/api/me", { method: "GET" }, true);
  if (first.res.ok) {
    showPayload(first.res, first.body, false);
    setStatus(true, first.body?.user?.email);
    return;
  }

  showPayload(first.res, first.body, true);

  if (first.res.status === 401 && getRefresh()) {
    const rotated = await fetchAuth("/api/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefresh() }),
    });
    if (rotated.res.ok) {
      saveTokensFromResponse(rotated.body);
      showPayload(rotated.res, rotated.body, false);
      const second = await fetchAuth("/api/me", { method: "GET" }, true);
      if (second.res.ok) {
        showPayload(second.res, second.body, false);
        setStatus(true, second.body?.user?.email);
        return;
      }
      showPayload(second.res, second.body, true);
    }
  }

  clearTokens();
  setStatus(false);
}

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

document.getElementById("btnMe").onclick = () => {
  refreshMe().catch(() => {});
};

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

refreshMe().catch(() => {});
