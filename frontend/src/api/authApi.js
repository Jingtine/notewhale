import { clearAuthSession, request, saveAuthSession } from "./apiClient";

export async function registerAccount({
  account,
  password,
  name,
  role = "学生",
  studentId = "",
}) {
  const session = await request("/api/auth/register", {
    method: "POST",
    body: {
      account,
      password,
      name,
      role,
      studentId,
    },
  });

  saveAuthSession(session);
  return session;
}

export async function loginAccount({ account, password }) {
  const session = await request("/api/auth/login", {
    method: "POST",
    body: {
      account,
      password,
    },
  });

  saveAuthSession(session);
  return session;
}

export async function getCurrentUser() {
  return request("/api/auth/me");
}

export function logoutAccount() {
  clearAuthSession();
}