import { vi } from "vitest";

type FetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | Promise<Response>;

export function createQueuedFetch(...handlers: FetchHandler[]) {
  const queue = [...handlers];

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const handler = queue.shift();

    if (!handler) {
      throw new Error(`Unexpected fetch call for ${String(input)}.`);
    }

    return handler(input, init);
  });
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    ...init
  });
}

export function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

export function readJsonBody(init?: RequestInit): unknown {
  if (typeof init?.body !== "string") {
    return undefined;
  }

  return JSON.parse(init.body);
}
