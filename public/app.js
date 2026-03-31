const out = document.getElementById("out");
const statusEl = document.getElementById("status");

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

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  const payload = { status: res.status, ok: res.ok, body };
  if (!res.ok) {
    show(payload, true);
    throw new Error(res.statusText);
  }
  show(payload, false);
  return body;
}

async function refreshMe() {
  try {
    const data = await api("/api/me", { method: "GET" });
    setStatus(true, data?.user?.email);
  } catch {
    setStatus(false);
  }
}

document.getElementById("btnRegister").onclick = () => {
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  api("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
    .then(() => refreshMe())
    .catch(() => {});
};

document.getElementById("btnLogin").onclick = () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  api("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
    .then(() => refreshMe())
    .catch(() => {});
};

document.getElementById("btnMe").onclick = () => {
  refreshMe().catch(() => {});
};

document.getElementById("btnLogout").onclick = () => {
  api("/api/logout", { method: "POST" })
    .then(() => refreshMe())
    .catch(() => {});
};

refreshMe().catch(() => {});
