#!/usr/bin/env node
/**
 * OmoHealth E2E API Test Suite
 *
 * Usage:
 *   node apps/backend/test/e2e-api.js
 *
 * Flow:
 *   1. Optionally wipe test user from DB (set CLEAN=1)
 *   2. Send OTP to TEST_PHONE (SMS delivered to your phone)
 *   3. Prompt you for the OTP interactively
 *   4. Verify OTP → get JWT
 *   5. Run all API endpoints in sequence
 *   6. Print pass/fail summary
 *
 * Env overrides:
 *   BASE      = https://backend-production-675a9.up.railway.app
 *   DB_URL    = postgresql://... (Supabase connection string)
 *   TEST_PHONE= 07060942709
 *   ROLE      = IYALOJA (or MEMBER)
 *   CLEAN     = 1   (delete user from DB before test)
 */

const https    = require('https');
const readline = require('readline');
const { Client } = require('pg');

const BASE       = process.env.BASE       || 'https://backend-production-675a9.up.railway.app';
const DB_URL     = process.env.DB_URL     || 'postgresql://postgres.xeqisokaznkxmgqdqxrf:aZZO7q2N0q1KqCP1@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';
const TEST_PHONE = process.env.TEST_PHONE || '07060942709';
const ROLE       = process.env.ROLE       || 'IYALOJA';
const CLEAN      = process.env.CLEAN      === '1';

const host = new URL(BASE).hostname;

// ── Helpers ─────────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: host,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token  ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

let PASS = 0, FAIL = 0;
const RESULTS = [];

function pass(name, preview) {
  PASS++;
  RESULTS.push(`  ✅  ${name}`);
  const txt = typeof preview === 'object' ? JSON.stringify(preview) : String(preview ?? '');
  console.log(`  ✅  ${name}${txt ? `\n      ${txt.slice(0, 160)}` : ''}`);
}

function fail(name, reason, body) {
  FAIL++;
  RESULTS.push(`  ❌  ${name}: ${reason}`);
  const txt = typeof body === 'object' ? JSON.stringify(body) : String(body ?? '');
  console.log(`  ❌  ${name}: ${reason}${txt ? `\n      ${txt.slice(0, 180)}` : ''}`);
}

// ── DB cleanup ───────────────────────────────────────────────────────────────

async function cleanUser(phone) {
  const altPhone = phone.startsWith('0') ? '+234' + phone.slice(1) : phone;
  const db = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    const phones = [phone, altPhone];
    for (const p of phones) {
      await db.query('DELETE FROM otp_codes WHERE phone = $1', [p]);
      const u = await db.query('SELECT id FROM users WHERE phone = $1', [p]);
      if (!u.rows.length) continue;
      const uid = u.rows[0].id;
      const assocs = await db.query('SELECT id FROM associations WHERE "userId" = $1', [uid]);
      for (const a of assocs.rows) {
        const mems = await db.query('SELECT id FROM members WHERE "associationId" = $1', [a.id]);
        for (const m of mems.rows) {
          await db.query('DELETE FROM contributions WHERE "memberId" = $1', [m.id]);
          await db.query('DELETE FROM claims WHERE "memberId" = $1', [m.id]);
          await db.query('DELETE FROM wallets WHERE "memberId" = $1', [m.id]);
        }
        await db.query('DELETE FROM members WHERE "associationId" = $1', [a.id]);
        await db.query('DELETE FROM claims WHERE "associationId" = $1', [a.id]);
        await db.query('DELETE FROM contributions WHERE "associationId" = $1', [a.id]);
        await db.query('DELETE FROM associations WHERE id = $1', [a.id]);
      }
      await db.query('DELETE FROM clinic_admins WHERE "userId" = $1', [uid]);
      await db.query('DELETE FROM users WHERE id = $1', [uid]);
      console.log(`  🗑  Deleted user ${p}`);
    }
  } finally {
    await db.end();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║    OmoHealth E2E API Test Suite                  ║');
  console.log(`║    ${BASE.padEnd(46)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── Step 0: Optional DB cleanup ──────────────────────────────────────────
  if (CLEAN) {
    console.log('── DB Cleanup ──────────────────────────────────────');
    await cleanUser(TEST_PHONE);
  }

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  console.log('\n── Auth ────────────────────────────────────────────');
  const otpResp = await request('POST', '/auth/send-otp', { phone: TEST_PHONE });
  if (otpResp.status === 200) {
    pass('POST /auth/send-otp', { phone: TEST_PHONE, ...otpResp.body });
  } else {
    fail('POST /auth/send-otp', `HTTP ${otpResp.status}`, otpResp.body);
    process.exit(1);
  }

  const otp = await prompt(`\n📱 Enter OTP received on ${TEST_PHONE}: `);

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const verifyResp = await request('POST', '/auth/verify-otp', {
    phone: TEST_PHONE,
    code:  otp,
    role:  ROLE,
  });

  if (!verifyResp.body?.accessToken) {
    fail('POST /auth/verify-otp', `HTTP ${verifyResp.status}`, verifyResp.body);
    process.exit(1);
  }
  const token = verifyResp.body.accessToken;
  pass('POST /auth/verify-otp', {
    role: verifyResp.body.user?.role,
    isNewUser: verifyResp.body.isNewUser,
    hasAssociation: verifyResp.body.hasAssociation,
  });

  // ── Step 3: Create Association ───────────────────────────────────────────
  console.log('\n── Associations ────────────────────────────────────');
  let assocId;
  const createAssoc = await request('POST', '/associations', {
    name: 'Oja Oba Market Cooperative',
    plan: 'SILVER',
    monthlyDues: 1600,
  }, token);
  if (createAssoc.body?.id) {
    assocId = createAssoc.body.id;
    pass('POST /associations', {
      id: assocId,
      walletId: createAssoc.body.walletId ?? 'provisioning...',
      walletAccountNumber: createAssoc.body.walletAccountNumber,
    });
  } else {
    fail('POST /associations', `HTTP ${createAssoc.status}`, createAssoc.body);
  }

  // ── Step 4: List Associations ────────────────────────────────────────────
  const listAssoc = await request('GET', '/associations', null, token);
  if (Array.isArray(listAssoc.body)) {
    if (!assocId) assocId = listAssoc.body[0]?.id;
    pass('GET /associations', { count: listAssoc.body.length });
  } else {
    fail('GET /associations', `HTTP ${listAssoc.status}`, listAssoc.body);
  }

  if (!assocId) {
    fail('Association tests', 'No associationId — skipping sub-tests', null);
  } else {
    // ── Step 5: Dashboard ────────────────────────────────────────────────
    const dash = await request('GET', `/associations/${assocId}/dashboard`, null, token);
    if (dash.status === 200) pass('GET /associations/:id/dashboard', dash.body);
    else fail('GET /associations/:id/dashboard', `HTTP ${dash.status}`, dash.body);

    // ── Step 6: Wallet ───────────────────────────────────────────────────
    const wallet = await request('GET', `/associations/${assocId}/wallet`, null, token);
    if (wallet.status === 200) pass('GET /associations/:id/wallet', wallet.body);
    else fail('GET /associations/:id/wallet', `HTTP ${wallet.status}`, wallet.body);

    // ── Step 7: Enroll Member ────────────────────────────────────────────
    console.log('\n── Members ─────────────────────────────────────────');
    const enroll = await request('POST', `/associations/${assocId}/members/enroll`, {
      members: [
        { fullName: 'Bola Adekunle', phoneNumber: '08033451234', bvn: '22222222222' },
      ],
    }, token);

    let memberId;
    if (enroll.body?.results || enroll.body?.enrolled !== undefined) {
      memberId = enroll.body.results?.[0]?.memberId;
      pass('POST /associations/:id/members/enroll', {
        enrolled: enroll.body.enrolled,
        skipped:  enroll.body.skipped,
        failed:   enroll.body.failed,
      });
    } else {
      fail('POST /associations/:id/members/enroll', `HTTP ${enroll.status}`, enroll.body);
    }

    // ── Step 8: List Members ─────────────────────────────────────────────
    const members = await request('GET', `/associations/${assocId}/members?page=1&limit=10`, null, token);
    if (members.status === 200) {
      if (!memberId) memberId = members.body.data?.[0]?.id;
      pass('GET /associations/:id/members', { total: members.body.total, page: members.body.page });
    } else {
      fail('GET /associations/:id/members', `HTTP ${members.status}`, members.body);
    }

    // ── Step 9: Member Detail ────────────────────────────────────────────
    if (memberId) {
      const member = await request('GET', `/associations/${assocId}/members/${memberId}`, null, token);
      if (member.status === 200) {
        pass('GET /associations/:id/members/:memberId', {
          name: member.body.name, status: member.body.status, walletStatus: member.body.walletStatus,
        });
      } else {
        fail('GET .../members/:memberId', `HTTP ${member.status}`, member.body);
      }

      // ── Step 10: Retry Wallet ──────────────────────────────────────
      const retry = await request('POST', `/associations/${assocId}/members/${memberId}/retry-wallet`, {}, token);
      if (retry.status === 200 || retry.body?.message) pass('POST .../retry-wallet', retry.body);
      else fail('POST .../retry-wallet', `HTTP ${retry.status}`, retry.body);
    }

    // ── Step 11: Claims list ─────────────────────────────────────────────
    console.log('\n── Payments ────────────────────────────────────────');
    const claims = await request('GET', `/associations/${assocId}/claims?page=1&limit=10`, null, token);
    if (claims.status === 200) pass('GET /associations/:id/claims', { total: claims.body.total });
    else fail('GET /associations/:id/claims', `HTTP ${claims.status}`, claims.body);

    // ── Step 12: Transactions ────────────────────────────────────────────
    const txns = await request('GET', `/associations/${assocId}/transactions?page=1&limit=10`, null, token);
    if (txns.status === 200) pass('GET /associations/:id/transactions', { total: txns.body.total });
    else fail('GET /associations/:id/transactions', `HTTP ${txns.status}`, txns.body);
  }

  // ── Step 13: My Claims ───────────────────────────────────────────────────
  const myClaims = await request('GET', '/payments/claims', null, token);
  if (myClaims.status === 200) pass('GET /payments/claims', { count: myClaims.body?.length });
  else fail('GET /payments/claims', `HTTP ${myClaims.status}`, myClaims.body);

  // ── Step 14: Banks ───────────────────────────────────────────────────────
  const banks = await request('GET', '/payments/banks', null, token);
  if (banks.status === 200 && Array.isArray(banks.body))
    pass('GET /payments/banks', { count: banks.body.length });
  else fail('GET /payments/banks', `HTTP ${banks.status}`, banks.body);

  // ── Step 15: Submit Claim ────────────────────────────────────────────────
  if (assocId) {
    const claim = await request('POST', '/payments/claims', {
      associationId:          assocId,
      hospitalName:           'UCH Ibadan',
      hospitalAccountNumber:  '0123456789',
      hospitalBankCode:       '058',
      amountNGN:              20000,
      description:            'E2E test claim — malaria treatment',
    }, token);
    if (claim.body?.id || claim.status === 201) {
      pass('POST /payments/claims', { id: claim.body.id, status: claim.body.status });
    } else {
      fail('POST /payments/claims', `HTTP ${claim.status}`, claim.body);
    }
  }

  // ── Step 16: Scheduler trigger ───────────────────────────────────────────
  console.log('\n── Scheduler ───────────────────────────────────────');
  const sched = await request('POST', '/scheduler/trigger-debit', {}, token);
  if (sched.status === 200 || sched.body?.message) pass('POST /scheduler/trigger-debit', sched.body);
  else fail('POST /scheduler/trigger-debit', `HTTP ${sched.status}`, sched.body);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  PASS: ${String(PASS).padEnd(4)} │ FAIL: ${String(FAIL).padEnd(4)}              ║`);
  console.log('╚══════════════════════════════════════╝\n');
  RESULTS.forEach(r => console.log(r));
  console.log();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('\nFatal error:', e.message); process.exit(1); });
