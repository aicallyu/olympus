import type { Project } from "./types.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function supabaseRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const projects = await supabaseRequest<Project[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&select=*&limit=1`
  );
  return projects[0] || null;
}

export async function getActiveProjects(): Promise<Project[]> {
  return supabaseRequest<Project[]>(
    `/projects?is_active=eq.true&select=*`
  );
}

export async function sendNotification(payload: {
  type: string;
  project_id: string;
  task_id: string;
  message: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/send-notification`;
  try {
    await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}
