import type { Provider } from "@inference-providers/schema"

/** Credential + optional auth-entry selector passed to {@link authHeaders}. */
export type AuthHeadersOptions = {
  credential: string
  /** Selects `provider.auth` by `id`; defaults to the first entry. */
  authId?: string
}

/**
 * Build the request headers that authenticate a call to a provider endpoint.
 * Picks the provider's first auth entry, or the one whose id matches
 * {@link AuthHeadersOptions.authId}. Extra headers from the auth entry are
 * merged in, but a collision with the credential header always resolves in
 * favor of the credential. Request-signing auths (sigv4) are not expressible
 * as headers and throw.
 */
export function authHeaders(provider: Provider, opts: AuthHeadersOptions): Record<string, string> {
  const { credential, authId } = opts
  const auth = authId ? provider.auth.find((a) => a.id === authId) : provider.auth[0]
  if (!auth) throw new Error(`auth method ${authId} not found`)
  if (auth.transport === "request_signing") {
    throw new Error(`${auth.type} requires request signing — not a header scheme`)
  }
  if (auth.transport !== "header" || !auth.header) {
    throw new Error(`auth method ${auth.id} does not use a header transport`)
  }

  const headers: Record<string, string> = { ...auth.extra_headers }
  const sep = auth.header.indexOf(": ")
  if (sep === -1) {
    headers[auth.header] = credential
  } else {
    headers[auth.header.slice(0, sep)] = `${auth.header.slice(sep + 2)} ${credential}`
  }
  return headers
}
