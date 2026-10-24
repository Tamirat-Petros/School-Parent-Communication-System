import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../src/app.js";

test("GET /api/health reports the API and database state", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "spcs-api");
  assert.equal(response.body.database, "disconnected");
  assert.ok(Number.isFinite(Date.parse(response.body.timestamp)));
});

test("unknown API routes return a structured 404", async () => {
  const response = await request(app).get("/api/not-a-route");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});