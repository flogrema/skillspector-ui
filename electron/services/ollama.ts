import type { OllamaModel, OllamaStatus } from '../types';

/**
 * Checks Ollama server status by querying /api/tags with a 5s timeout.
 */
export async function checkOllamaStatus(
  baseUrl = 'http://localhost:11434'
): Promise<OllamaStatus> {
  const cleanUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      online: res.ok,
      url: cleanUrl,
    };
  } catch {
    return {
      online: false,
      url: cleanUrl,
    };
  }
}

/**
 * Fetches available Ollama models by querying /api/tags with a 5s timeout.
 */
export async function getOllamaModels(
  baseUrl = 'http://localhost:11434'
): Promise<OllamaModel[]> {
  const cleanUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        details?: {
          parameter_size?: string;
          family?: string;
        };
      }>;
    };
    if (!data || !Array.isArray(data.models)) {
      return [];
    }
    return data.models.map((m) => ({
      name: m.name,
      parameterSize: m.details?.parameter_size,
      family: m.details?.family,
    }));
  } catch {
    return [];
  }
}
