// Replace the known passwords of Cal's demo users with CAL_DEMO_PASSWORD.
//
// `yarn db-seed` creates demo users (all @example.com) whose passwords are
// written in Cal's seed script, e.g. "pro" for pro@example.com. Run this
// right after seeding so every demo user signs in with the private
// password from commons/.env instead.
//
// Run from cal/ (so pg and bcryptjs load from cal/node_modules):
//   site-env CAL node ../support/cal/set-demo-passwords.js
//
// Prints only the number of users updated, never the password.

const path = require("path");
const { createRequire } = require("module");

const calRequire = createRequire(path.join(process.cwd(), "package.json"));

const DEMO_EMAIL_DOMAIN = "@example.com";

async function main() {
  const password = process.env.DEMO_PASSWORD;
  const databaseUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

  if (!password || password.length < 12) {
    console.error("Failed: CAL_DEMO_PASSWORD in commons/.env is missing or shorter than 12 characters.");
    console.error("Run this through site-env from cal/: site-env CAL node ../support/cal/set-demo-passwords.js");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("Failed: CAL_DATABASE_URL in commons/.env is empty.");
    process.exit(1);
  }

  let pg, bcrypt;
  try {
    pg = calRequire("pg");
    bcrypt = calRequire("bcryptjs");
  } catch (err) {
    console.error("Failed: run this from cal/ after yarn install, so pg and bcryptjs can load.");
    process.exit(1);
  }

  // Same hashing as Cal's packages/lib/auth/hashPassword.ts
  const hash = await bcrypt.hash(password, 12);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE "UserPassword" AS up
          SET hash = $1
         FROM users AS u
        WHERE up."userId" = u.id
          AND u.email LIKE $2`,
      [hash, `%${DEMO_EMAIL_DOMAIN}`]
    );
    console.log(`Updated the password of ${result.rowCount} demo user(s) (${DEMO_EMAIL_DOMAIN}) to CAL_DEMO_PASSWORD.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
