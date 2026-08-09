function readCookie(name: string) {
  const escapedName = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}


async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const csrfToken = readCookie("csrftoken");
  if (csrfToken && !headers.has("X-CSRFToken")) {
    headers.set("X-CSRFToken", csrfToken);
  }
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = "Não foi possível concluir a operação.";
    try {
      const data = await response.json();
      detail = data.detail ?? detail;
    } catch {
      detail = "Não foi possível concluir a operação.";
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}


export const httpClient = {
  get<T>(url: string, init?: RequestInit) {
    return request<T>(url, { method: "GET", ...init });
  },
  post<T>(url: string, body: unknown, init?: RequestInit) {
    return request<T>(url, { method: "POST", body: JSON.stringify(body), ...init });
  },
};
