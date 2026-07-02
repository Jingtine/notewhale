import { clearAuthSession, request, saveAuthSession, saveUser } from "./apiClient";

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

export async function updateProfile({ name }) {
  const user = await request("/api/auth/me", {
    method: "PATCH",
    body: {
      name,
    },
  });

  saveUser(user);
  return user;
}

export async function changePassword({ currentPassword, newPassword }) {
  return request("/api/auth/password", {
    method: "POST",
    body: {
      currentPassword,
      newPassword,
    },
  });
}

export function logoutAccount() {
  clearAuthSession();
}
