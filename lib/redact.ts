const SECRET_ASSIGNMENT = /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE)[A-Z0-9_]*)\s*[=:]\s*([^\s,;"'}]+)/gi;
const AUTHORIZATION = /\b(authorization\s*[:=]\s*(?:bearer\s+)?)([^\s,;"'}]+)/gi;
const TOKEN_PREFIXES = /\b(?:sk|gh[pousr]|xox[baprs]|npm)_[A-Za-z0-9_-]{12,}\b/g;
const OPENAI_STYLE_KEY = /\bsk-[A-Za-z0-9_-]{16,}\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const HOME_PATH = /\/Users\/[^/\s"']+/g;
const SENSITIVE_QUERY = /([?&](?:token|key|secret|password|signature)=)[^&#\s]+/gi;

export type RedactionResult = {
  text: string;
  count: number;
};

export function redactText(input: string): RedactionResult {
  let count = 0;
  let text = input;
  const replace = (pattern: RegExp, replacement: string | ((...args: string[]) => string)) => {
    text = text.replace(pattern, (...args) => {
      count += 1;
      return typeof replacement === "string" ? replacement : replacement(...(args as string[]));
    });
  };

  replace(SECRET_ASSIGNMENT, (_match, key) => `${key}=[REDACTED]`);
  replace(AUTHORIZATION, (_match, prefix) => `${prefix}[REDACTED]`);
  replace(TOKEN_PREFIXES, "[REDACTED_TOKEN]");
  replace(OPENAI_STYLE_KEY, "[REDACTED_TOKEN]");
  replace(JWT, "[REDACTED_JWT]");
  replace(EMAIL, "[REDACTED_EMAIL]");
  replace(HOME_PATH, "~");
  replace(SENSITIVE_QUERY, (_match, prefix) => `${prefix}[REDACTED]`);

  return { text, count };
}
