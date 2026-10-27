
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("GET /api/health returns a healthy response", async () => {
    const response = await request(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, "Service is healthy.");
});

test("GET /api/ready returns service readiness status", async () => {
    const response = await request(app).get("/api/ready");

    assert.ok(response.status === 200 || response.status === 503);
    assert.equal(typeof response.body.success, "boolean");
});
