import { spawn } from "node:child_process";

export function runFlagsmith(args: string[], input?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("flagsmith", args, {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

export function environmentKey(json: string): string {
  const parsed = JSON.parse(json) as { api_key?: string; apiKey?: string };
  const key = parsed.api_key ?? parsed.apiKey ?? "";
  if (!key) throw new Error("flagsmith environment get did not include an environment key.");
  return key;
}
