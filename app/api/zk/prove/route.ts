import {randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {existsSync} from "node:fs";
import {readFile, unlink} from "node:fs/promises";
import path from "node:path";
import {promisify} from "node:util";
import {NextRequest, NextResponse} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const ROOT_DIR = process.cwd();
const CRATE_DIR = path.join(ROOT_DIR, "zk", "qualified-investor");
const KEYS_DIR = path.join(CRATE_DIR, "out");
const MANIFEST = path.join(CRATE_DIR, "Cargo.toml");
const RELEASE_BIN = path.join(CRATE_DIR, "target", "release", "privyields-qualified-investor");
const DEFAULT_THRESHOLD = "1000000000000";

type ProveRequest = {
  user?: string;
  balance?: string;
  threshold?: string;
  salt?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({error: message}, {status});
}

function requireDecimal(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`${label} must be a decimal string`);
  }
  return value;
}

function requireAddress(value: unknown) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("user must be an EVM address");
  }
  return value;
}

async function runProver(args: string[]) {
  if (existsSync(RELEASE_BIN)) {
    return execFileAsync(RELEASE_BIN, args, {cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 8});
  }

  return execFileAsync("cargo", ["run", "--manifest-path", MANIFEST, "--", ...args], {
    cwd: ROOT_DIR,
    maxBuffer: 1024 * 1024 * 8
  });
}

export async function POST(request: NextRequest) {
  let body: ProveRequest;

  try {
    body = (await request.json()) as ProveRequest;
  } catch {
    return jsonError("invalid JSON body");
  }

  try {
    const user = requireAddress(body.user);
    const balance = requireDecimal(body.balance, "balance");
    const threshold = requireDecimal(body.threshold || DEFAULT_THRESHOLD, "threshold");
    const salt = requireDecimal(body.salt, "salt");
    const outPath = path.join("/tmp", `privyields-proof-${randomUUID()}.json`);

    if (!existsSync(path.join(KEYS_DIR, "proving_key.bin")) || !existsSync(path.join(KEYS_DIR, "verifying_key.bin"))) {
      await runProver(["setup", "--out", KEYS_DIR]);
    }

    await runProver([
      "prove",
      "--keys",
      KEYS_DIR,
      "--user",
      user,
      "--balance",
      balance,
      "--threshold",
      threshold,
      "--salt",
      salt,
      "--out",
      outPath
    ]);

    const proof = JSON.parse(await readFile(outPath, "utf8"));
    await unlink(outPath).catch(() => undefined);
    return NextResponse.json(proof);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
