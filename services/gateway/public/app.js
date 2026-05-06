const LS_ACCESS = "accessToken";
const LS_REFRESH = "refreshToken";

function getTokens() {
  return {
    accessToken: localStorage.getItem(LS_ACCESS) || "",
    refreshToken: localStorage.getItem(LS_REFRESH) || "",
  };
}

function setTokens({ accessToken, refreshToken }) {
  if (typeof accessToken === "string" && accessToken) {
    localStorage.setItem(LS_ACCESS, accessToken);
  }
  if (typeof refreshToken === "string" && refreshToken) {
    localStorage.setItem(LS_REFRESH, refreshToken);
  }
  renderTokens();
}

function clearTokens() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  renderTokens();
}

function renderTokens() {
  const { accessToken, refreshToken } = getTokens();
  document.getElementById("tokens").textContent = JSON.stringify(
    { accessToken, refreshToken },
    null,
    2,
  );
}

async function callApi(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const { accessToken } = getTokens();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  document.getElementById("out").textContent = JSON.stringify(
    { status: res.status, json },
    null,
    2,
  );
  return { status: res.status, json };
}

function getCreds() {
  return {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };
}

document.getElementById("register").onclick = async () => {
  const r = await callApi("/api/register", {
    method: "POST",
    body: getCreds(),
  });
  if (r?.json?.accessToken && r?.json?.refreshToken) setTokens(r.json);
};

document.getElementById("login").onclick = async () => {
  const r = await callApi("/api/login", { method: "POST", body: getCreds() });
  if (r?.json?.accessToken && r?.json?.refreshToken) setTokens(r.json);
};

document.getElementById("refresh").onclick = async () => {
  const { refreshToken } = getTokens();
  const r = await callApi("/api/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  if (r?.json?.accessToken && r?.json?.refreshToken) setTokens(r.json);
};

document.getElementById("logout").onclick = async () => {
  const { refreshToken } = getTokens();
  await callApi("/api/logout", { method: "POST", body: { refreshToken } });
  clearTokens();
};

document.getElementById("me").onclick = async () => {
  await callApi("/api/me", { auth: true });
};

document.getElementById("clear").onclick = clearTokens;

renderTokens();

