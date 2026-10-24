// Exercise every replayed comment-list query with equal clocks and reversed UUIDs.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const changes = new URL("../../../scenarios/crew/changes/", import.meta.url);
let versions = 0;
for (const name of readdirSync(changes)) {
  for (const change of JSON.parse(readFileSync(new URL(name, changes), "utf8"))) {
    if (change.path !== "/packages/server/src/modules/work/comments.js" || change.op !== "write") continue;
    const query = change.content.match(/prepare\('([^']+FROM comments WHERE[^']+ORDER BY[^']+)'\)/)?.[1];
    assert.ok(query, `${name}: comment-list query exists`);
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("CREATE TABLE comments (id TEXT PRIMARY KEY, issue_id TEXT, body TEXT, created_at TEXT)");
      const insert = db.prepare("INSERT INTO comments VALUES (?, 'issue', ?, '2026-10-24T00:00:00.000Z')");
      insert.run("z-first", "First");
      insert.run("a-second", "Second");
      const bodies = () => db.prepare(query).all("issue").map(row => row.body);
      assert.deepEqual(bodies(), ["First", "Second"], `${name}: creation order survives equal timestamps`);
      db.prepare("DELETE FROM comments WHERE id = ?").run("z-first");
      insert.run("0-third", "Third");
      assert.deepEqual(bodies(), ["Second", "Third"], `${name}: deletion preserves the remaining order`);
      versions++;
    } finally {
      db.close();
    }
  }
}
assert.ok(versions > 0);
console.log(`Crew comment order: PASS (${versions} replayed versions)`);
