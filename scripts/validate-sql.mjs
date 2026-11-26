/**
 * SQL validation harness — runs the Supabase migrations on an in-process
 * Postgres (PGlite) with stubbed auth/storage schemas, then asserts RLS,
 * triggers and the seed function behave as expected.
 *
 *   node scripts/validate-sql.mjs
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

const db = new PGlite();

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function asUser(id) {
  await db.exec(`
    reset role;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${id}', false);
    select set_config('request.jwt.claim.role', 'authenticated', false);
  `);
}

async function asService() {
  await db.exec(`
    reset role;
    set role service_role;
    select set_config('request.jwt.claim.role', 'service_role', false);
  `);
}

async function count(table) {
  const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
  return rows[0].n;
}

console.log("→ bootstrapping auth/storage stubs");
await db.exec(`
  create schema auth;
  create schema storage;

  create table auth.users (id uuid primary key, email text);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create or replace function auth.role() returns text language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
  $$;

  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant execute on function auth.role() to anon, authenticated, service_role;

  create table storage.buckets (
    id text primary key,
    name text,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz default now()
  );
  grant usage on schema storage to authenticated, service_role;
  grant all on storage.objects, storage.buckets to authenticated, service_role;
  alter table storage.objects enable row level security;
  alter table storage.buckets enable row level security;

  insert into auth.users (id, email) values ('${USER_A}', 'a@example.com'), ('${USER_B}', 'b@example.com');
`);

for (const file of ["0001_schema.sql", "0002_rls.sql", "0003_seed.sql", "0004_views.sql"]) {
  console.log(`→ applying ${file}`);
  const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8")
    // PGlite has no pgvector build; the extension and the embedding column are
    // validated separately on Supabase. Everything else runs verbatim.
    .replace('create extension if not exists "pgcrypto";', "")
    .replace('create extension if not exists "vector";', "")
    .replace("embedding   vector(768)", "embedding   text");
  await db.exec(sql);
}

console.log("\n→ seed as user A");
await asUser(USER_A);
const seeded = await db.query("select public.seed_demo_data(false) as result");
const result = seeded.rows[0].result;
check("seed returns counts", result && result.clients === 10 && result.campaigns === 25 && result.leads === 500,
  JSON.stringify(result));
check("seed created 3 documents", (await count("documents")) === 3);
check("seed created ~3000 metric rows", (await count("campaign_metrics")) === 3000,
  String(await count("campaign_metrics")));
check("seed generated hot leads", (await db.query(
  "select count(*)::int as n from public.leads where lead_category = 'Hot'")).rows[0].n > 0);

console.log("\n→ user A visibility");
check("user A sees 10 clients", (await count("clients")) === 10);
check("user A sees 25 campaigns", (await count("campaigns")) === 25);
check("user A sees 500 leads", (await count("leads")) === 500);
const kpis = await db.query("select count(*)::int as n, round(sum(spend),2) as spend from public.v_campaign_kpis");
check("KPI view returns 25 campaigns", kpis.rows[0].n === 25, String(kpis.rows[0].n));
check("KPI view aggregates spend", Number(kpis.rows[0].spend) > 0, String(kpis.rows[0].spend));

console.log("\n→ user B isolation");
await asUser(USER_B);
check("user B sees 0 clients", (await count("clients")) === 0);
check("user B sees 0 campaigns", (await count("campaigns")) === 0);
check("user B sees 0 leads", (await count("leads")) === 0);
check("user B sees 0 documents", (await count("documents")) === 0);
check("user B sees 0 KPI rows", (await db.query("select count(*)::int as n from public.v_campaign_kpis")).rows[0].n === 0);

const userBSeesA = (await db.query("select client_id from public.clients limit 1")).rows[0];
check("user B cannot read user A client by id", userBSeesA === undefined, JSON.stringify(userBSeesA));

console.log("\n→ guardrails");
await asUser(USER_A);
const aClient = (await db.query("select client_id from public.clients limit 1")).rows[0];
const leadId = (await db.query("select lead_id from public.leads limit 1")).rows[0].lead_id;
let scoreBlocked = false;
try {
  await db.exec(`update public.leads set lead_score = 99 where lead_id = '${leadId}'`);
} catch (error) {
  scoreBlocked = String(error.message).includes("Lead Intelligence");
}
check("authenticated cannot change lead_score", scoreBlocked);

await asService();
await db.exec(`update public.leads set lead_score = 99 where lead_id = '${leadId}'`);
const serviceScore = (await db.query(`select lead_score from public.leads where lead_id = '${leadId}'`)).rows[0].lead_score;
check("service_role can change lead_score", serviceScore === 99, String(serviceScore));

await asUser(USER_A);
let docPolicyBlocked = false;
try {
  await db.exec(`
    insert into public.documents (client_id, file_name, storage_path, status)
    values ('${aClient.client_id}', 'x.pdf', '${aClient.client_id}/x.pdf', 'ready')
  `);
} catch (error) {
  docPolicyBlocked = String(error.message).includes("row-level security");
}
check("documents insert must start as queued", docPolicyBlocked);

const userAStorage = await db.query(
  `insert into storage.objects (bucket_id, name) values ('documents', '${aClient.client_id}/a.pdf') returning id`);
check("user A can write own storage folder", userAStorage.rows.length === 1);

await asUser(USER_B);
let storageBlocked = false;
try {
  await db.exec(`insert into storage.objects (bucket_id, name) values ('documents', '${aClient.client_id}/stolen.pdf')`);
} catch (error) {
  storageBlocked = String(error.message).includes("row-level security");
}
check("user B cannot write user A storage folder", storageBlocked);

await asUser(USER_A);
await db.exec(`delete from storage.objects where name like '${aClient.client_id}/%'`);

console.log("\n→ campaign/client consistency trigger");
let mismatchBlocked = false;
const otherCampaign = (await db.query("select campaign_id from public.campaigns limit 1")).rows[0];
const otherClient = (await db.query(
  `select client_id from public.clients where client_id <> '${aClient.client_id}' limit 1`)).rows[0];
try {
  await db.exec(`
    insert into public.leads (client_id, campaign_id, name, status)
    values ('${otherClient.client_id}', '${otherCampaign.campaign_id}', 'Mismatch Test', 'new')
  `);
} catch (error) {
  mismatchBlocked = String(error.message).includes("does not belong to client");
}
check("lead campaign must belong to the lead client", mismatchBlocked);

console.log("\n→ reseed");
const reset = await db.query("select public.seed_demo_data(true) as result");
check("reset reseeds", reset.rows[0].result.clients === 10);
check("reset removes duplicates", (await count("clients")) === 10, String(await count("clients")));

await db.close();
console.log(failures === 0 ? "\nAll SQL checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
