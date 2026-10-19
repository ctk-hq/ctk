import { API_SERVER_URL } from "../constants";
import { requireBackend } from "./backend";
import { getLocalStorageJWTKeys } from "./utils";
import type { PrivateVariable } from "../types";

async function privateRequest(path: string, method = "GET", body?: unknown) {
  requireBackend();
  const token = getLocalStorageJWTKeys()?.access_token;
  if (!token) throw new Error("Log in to manage private values.");
  const response = await fetch(`${API_SERVER_URL}${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "Unable to access private values. Try again."
    );
  }
  return response;
}

export async function listPrivateVariables(projectUuid?: string): Promise<{
  storage_available: boolean;
  storage_error?: string | null;
  variables: PrivateVariable[];
}> {
  return (
    await privateRequest(
      `/variables/${projectUuid ? `?project_uuid=${encodeURIComponent(projectUuid)}` : ""}`
    )
  ).json();
}

export async function savePrivateVariable(
  name: string,
  value: string,
  secret: boolean,
  projectUuid?: string
): Promise<PrivateVariable> {
  return (
    await privateRequest(`/variables/${encodeURIComponent(name)}/`, "PUT", {
      value,
      secret,
      project_uuid: projectUuid ?? null
    })
  ).json();
}

export async function revealPrivateVariable(id: string): Promise<string> {
  return (
    await (
      await privateRequest(
        `/variables/${encodeURIComponent(id)}/reveal/`,
        "POST"
      )
    ).json()
  ).value;
}

export async function updatePrivateVariable(
  id: string,
  changes: { project_uuid: string | null; secret: boolean; value?: string }
): Promise<PrivateVariable> {
  return (
    await privateRequest(
      `/variables/${encodeURIComponent(id)}/`,
      "PATCH",
      changes
    )
  ).json();
}

export async function deletePrivateVariable(id: string): Promise<void> {
  await privateRequest(`/variables/${encodeURIComponent(id)}/`, "DELETE");
}

export async function exportPrivateEnv(projectUuid: string): Promise<string> {
  return (
    await privateRequest(
      `/projects/${encodeURIComponent(projectUuid)}/env/`,
      "POST"
    )
  ).text();
}
