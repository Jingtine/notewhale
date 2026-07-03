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
  const body = { name };
  let user;

  try {
    user = await request("/api/auth/me", {
      method: "PATCH",
      body,
    });
  } catch (error) {
    if (!isMethodNotAllowed(error)) throw error;

    user = await request("/api/auth/profile", {
      method: "POST",
      body,
    });
  }

  saveUser(user);
  return user;
}

export async function changePassword({ currentPassword, newPassword }) {
  const body = {
    currentPassword,
    newPassword,
  };

  try {
    return await request("/api/auth/password", {
      method: "POST",
      body,
    });
  } catch (error) {
    if (!isMethodNotAllowed(error)) throw error;

    return request("/api/auth/password", {
      method: "PUT",
      body,
    });
  }
}

export function logoutAccount() {
  clearAuthSession();
}

function isMethodNotAllowed(error) {
  return /method not allowed|405/i.test(error?.message || "");
}
