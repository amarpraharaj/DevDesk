
import "dotenv/config";
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/modules/users/user.model.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/devdesk_test";

before(async () => {
    await mongoose.connect(TEST_DB_URI);
});

beforeEach(async () => {
    await User.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState === 1) {
        await User.deleteMany({});
        await mongoose.disconnect();
    }
});

test("POST /api/auth/register creates a user successfully", async () => {
    const payload = {
        name: "Test User",
        email: "registration-test@example.com",
        password: "DevDesk@123",
    };

    const response = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.name, payload.name);
    assert.equal(response.body.data.user.email, payload.email);
    assert.equal("passwordHash" in response.body.data.user, false);

    const user = await User.findOne({
        email: payload.email,
    }).select("+passwordHash");

    assert.ok(user);
    assert.notEqual(user.passwordHash, payload.password);
    assert.match(user.passwordHash, /^\$2[aby]\$/);
});



test("POST /api/auth/register rejects a duplicate email", async () => {
    const payload = {
        name: "Test User",
        email: "duplicate-test@example.com",
        password: "DevDesk@123",
    };

    const firstResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(firstResponse.status, 201);

    const secondResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(secondResponse.status, 409);
    assert.equal(secondResponse.body.success, false);
    assert.equal(
        secondResponse.body.message,
        "An account with this email already exists."
    );
});


test("POST /api/auth/login authenticates a user and sets a secure cookie attribute", async () => {
    const payload = {
        name: "Login Test User",
        email: "login-test@example.com",
        password: "DevDesk@123",
    };

    // Create the user first.
    const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(registerResponse.status, 201);

    // Log in with the registered credentials.
    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email: payload.email,
            password: payload.password,
        });

    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.success, true);
    assert.equal(loginResponse.body.message, "Login successful.");
    assert.equal(loginResponse.body.data.user.email, payload.email);

    const cookies = loginResponse.headers["set-cookie"];

    assert.ok(cookies, "Login should set an authentication cookie.");
    assert.ok(
        cookies.some((cookie) => cookie.startsWith("accessToken=")),
        "The accessToken cookie should be set."
    );
    assert.ok(
        cookies.some((cookie) => /;\s*httponly/i.test(cookie)),
        "The authentication cookie should be HttpOnly."
    );
    assert.ok(
        cookies.some((cookie) => /;\s*samesite=lax/i.test(cookie)),
        "The authentication cookie should use SameSite=Lax."
    );
});


test("POST /api/auth/login rejects an incorrect password", async () => {
    const payload = {
        name: "Wrong Password User",
        email: "wrong-password-test@example.com",
        password: "DevDesk@123",
    };

    const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(registerResponse.status, 201);

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email: payload.email,
            password: "WrongPassword@123",
        });

    assert.equal(loginResponse.status, 401);
    assert.equal(loginResponse.body.success, false);
    assert.equal(
        loginResponse.body.message,
        "Invalid email or password."
    );
    assert.equal(
        loginResponse.headers["set-cookie"],
        undefined,
        "Failed login must not set an authentication cookie."
    );
});


test("GET /api/auth/me rejects requests without authentication", async () => {
    const response = await request(app).get("/api/auth/me");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(
        response.body.message,
        "Authentication required."
    );
});


test("GET /api/auth/me returns user details with a valid token", async () => {
    const payload = {
        name: "Authenticated User",
        email: "authenticated-test@example.com",
        password: "DevDesk@123",
    };

    const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

    assert.equal(registerResponse.status, 201);

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email: payload.email,
            password: payload.password,
        });

    assert.equal(loginResponse.status, 200);

    const setCookie = loginResponse.headers["set-cookie"];
    assert.ok(setCookie, "Login should set an authentication cookie.");

    // Send only the cookie name and value, not its attributes.
    const authCookie = setCookie
        .find((cookie) => cookie.startsWith("accessToken="))
        .split(";")[0];

    const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", authCookie);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.name, payload.name);
    assert.equal(response.body.data.user.email, payload.email);
    assert.ok(response.body.data.user.id);
});


test("POST /api/auth/logout clears the cookie and blocks protected access", async () => {
    const agent = request.agent(app);

    const payload = {
        name: "Logout Test User",
        email: "logout-test@example.com",
        password: "DevDesk@123",
    };

    const registerResponse = await agent
        .post("/api/auth/register")
        .send(payload);

    assert.equal(registerResponse.status, 201);

    const loginResponse = await agent
        .post("/api/auth/login")
        .send({
            email: payload.email,
            password: payload.password,
        });

    assert.equal(loginResponse.status, 200);

    // Confirm authentication works before logout.
    const beforeLogout = await agent.get("/api/auth/me");
    assert.equal(beforeLogout.status, 200);

    // Log out and verify the cookie-clearing response.
    const logoutResponse = await agent.post("/api/auth/logout");

    assert.equal(logoutResponse.status, 200);
    assert.equal(logoutResponse.body.success, true);
    assert.equal(logoutResponse.body.message, "Logout successful.");

    const cookies = logoutResponse.headers["set-cookie"] ?? [];

    const clearedCookie = cookies.find((cookie) =>
        cookie.startsWith("accessToken=")
    );

    assert.ok(clearedCookie, "Logout should clear the accessToken cookie.");
    assert.match(
        clearedCookie,
        /expires=thu, 01 jan 1970/i
    );

    // The same session should no longer authenticate.
    const afterLogout = await agent.get("/api/auth/me");

    assert.equal(afterLogout.status, 401);
    assert.equal(afterLogout.body.message, "Authentication required.");
});
