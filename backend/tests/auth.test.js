
import "dotenv/config";
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/modules/users/user.model.js";
import Ticket from "../src/modules/tickets/ticket.model.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/devdesk_test";

before(async () => {
    await mongoose.connect(TEST_DB_URI);
});

beforeEach(async () => {
    await Ticket.deleteMany({});
    await User.deleteMany({});
});

after(async () => {
    if (mongoose.connection.readyState === 1) {
        await User.deleteMany({});
        await Ticket.deleteMany({});
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


test("POST /api/tickets creates a ticket for the authenticated user", async () => {
  const agent = request.agent(app);

  const userPayload = {
    name: "Ticket Test User",
    email: "ticket-test@example.com",
    password: "DevDesk@123",
  };

  const registerResponse = await agent
    .post("/api/auth/register")
    .send(userPayload);

  assert.equal(registerResponse.status, 201);

  const loginResponse = await agent
    .post("/api/auth/login")
    .send({
      email: userPayload.email,
      password: userPayload.password,
    });

  assert.equal(loginResponse.status, 200);

  const ticketPayload = {
    title: "Login page is not working",
    description: "The login form displays an unexpected error.",
    priority: "high",
  };

  const ticketResponse = await agent
    .post("/api/tickets")
    .send(ticketPayload);

  assert.equal(ticketResponse.status, 201);
  assert.equal(ticketResponse.body.success, true);
  assert.equal(ticketResponse.body.message, "Ticket created successfully.");

  const createdTicket = ticketResponse.body.data.ticket;

  assert.equal(createdTicket.title, ticketPayload.title);
  assert.equal(createdTicket.description, ticketPayload.description);
  assert.equal(createdTicket.priority, "high");
  assert.equal(createdTicket.status, "open");
  assert.ok(createdTicket.id);
  assert.ok(createdTicket.createdBy);

  const savedTicket = await Ticket.findById(createdTicket.id);

  assert.ok(savedTicket, "Ticket should be saved in MongoDB.");
  assert.equal(
    savedTicket.createdBy.toString(),
    loginResponse.body.data.user.id
  );
});


test("POST /api/tickets rejects unauthenticated requests", async () => {
  const response = await request(app)
    .post("/api/tickets")
    .send({
      title: "Unauthorized ticket",
      description: "This ticket must not be created.",
      priority: "high",
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Authentication required."
  );

  const ticketCount = await Ticket.countDocuments({});

  assert.equal(
    ticketCount,
    0,
    "No ticket should be created without authentication."
  );
});


test("GET /api/tickets returns only the authenticated user's tickets", async () => {
  const agentA = request.agent(app);
  const agentB = request.agent(app);

  // Register and log in User A.
  const userA = {
    name: "Ticket Owner A",
    email: "ticket-owner-a@example.com",
    password: "DevDesk@123",
  };

  const registerA = await agentA
    .post("/api/auth/register")
    .send(userA);

  assert.equal(registerA.status, 201);

  const loginA = await agentA
    .post("/api/auth/login")
    .send({
      email: userA.email,
      password: userA.password,
    });

  assert.equal(loginA.status, 200);

  // User A creates a ticket.
  const createA = await agentA
    .post("/api/tickets")
    .send({
      title: "User A ticket",
      description: "This belongs to User A.",
      priority: "high",
    });

  assert.equal(createA.status, 201);

  // Register and log in User B.
  const userB = {
    name: "Ticket Owner B",
    email: "ticket-owner-b@example.com",
    password: "DevDesk@123",
  };

  const registerB = await agentB
    .post("/api/auth/register")
    .send(userB);

  assert.equal(registerB.status, 201);

  const loginB = await agentB
    .post("/api/auth/login")
    .send({
      email: userB.email,
      password: userB.password,
    });

  assert.equal(loginB.status, 200);

  // User B creates a different ticket.
  const createB = await agentB
    .post("/api/tickets")
    .send({
      title: "User B private ticket",
      description: "This belongs to User B.",
      priority: "low",
    });

  assert.equal(createB.status, 201);

  // User A should see only User A's ticket.
  const response = await agentA.get("/api/tickets");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.tickets.length, 1);
  assert.equal(
    response.body.data.tickets[0].title,
    "User A ticket"
  );
  assert.equal(
    response.body.data.tickets.some(
      (ticket) => ticket.title === "User B private ticket"
    ),
    false
  );
});


test("GET /api/tickets rejects unauthenticated requests", async () => {
  const response = await request(app).get("/api/tickets");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Authentication required."
  );
});


test("POST /api/tickets rejects an invalid priority", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Validation Test User",
    email: "ticket-validation-test@example.com",
    password: "DevDesk@123",
  };

  const registerResponse = await agent
    .post("/api/auth/register")
    .send(user);

  assert.equal(registerResponse.status, 201);

  const loginResponse = await agent
    .post("/api/auth/login")
    .send({
      email: user.email,
      password: user.password,
    });

  assert.equal(loginResponse.status, 200);

  const response = await agent
    .post("/api/tickets")
    .send({
      title: "Test ticket",
      description: "Testing invalid priority.",
      priority: "urgent",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed.");

  const ticketCount = await Ticket.countDocuments({});

  assert.equal(
    ticketCount,
    0,
    "Invalid ticket data must not create a database record."
  );
});


test("PUT /api/tickets/:ticketId updates the authenticated user's ticket", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Ticket Update User",
    email: "ticket-update-test@example.com",
    password: "DevDesk@123",
  };

  const registerResponse = await agent
    .post("/api/auth/register")
    .send(user);

  assert.equal(registerResponse.status, 201);

  const loginResponse = await agent
    .post("/api/auth/login")
    .send({
      email: user.email,
      password: user.password,
    });

  assert.equal(loginResponse.status, 200);

  const createResponse = await agent
    .post("/api/tickets")
    .send({
      title: "Original ticket title",
      description: "Original description",
      priority: "medium",
    });

  assert.equal(createResponse.status, 201);

  const ticketId = createResponse.body.data.ticket.id;

  const updateResponse = await agent
    .put(`/api/tickets/${ticketId}`)
    .send({
      title: "Updated ticket title",
      priority: "high",
      status: "in-progress",
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.success, true);
  assert.equal(
    updateResponse.body.message,
    "Ticket updated successfully."
  );

  const updatedTicket = updateResponse.body.data.ticket;

  assert.equal(updatedTicket.id, ticketId);
  assert.equal(updatedTicket.title, "Updated ticket title");
  assert.equal(updatedTicket.description, "Original description");
  assert.equal(updatedTicket.priority, "high");
  assert.equal(updatedTicket.status, "in-progress");

  const savedTicket = await Ticket.findById(ticketId);

  assert.ok(savedTicket);
  assert.equal(savedTicket.title, "Updated ticket title");
  assert.equal(savedTicket.status, "in-progress");
});


test("PUT /api/tickets/:ticketId prevents another user from updating a ticket", async () => {
  const agentA = request.agent(app);
  const agentB = request.agent(app);

  const userA = {
    name: "Ticket Owner A",
    email: "update-owner-a@example.com",
    password: "DevDesk@123",
  };

  const userB = {
    name: "Ticket Owner B",
    email: "update-owner-b@example.com",
    password: "DevDesk@123",
  };

  // Register and log in User A.
  const registerA = await agentA
    .post("/api/auth/register")
    .send(userA);

  assert.equal(registerA.status, 201);

  const loginA = await agentA
    .post("/api/auth/login")
    .send({
      email: userA.email,
      password: userA.password,
    });

  assert.equal(loginA.status, 200);

  // User A creates a ticket.
  const createResponse = await agentA
    .post("/api/tickets")
    .send({
      title: "User A private ticket",
      description: "This ticket belongs to User A.",
      priority: "medium",
    });

  assert.equal(createResponse.status, 201);

  const ticketId = createResponse.body.data.ticket.id;

  // Register and log in User B.
  const registerB = await agentB
    .post("/api/auth/register")
    .send(userB);

  assert.equal(registerB.status, 201);

  const loginB = await agentB
    .post("/api/auth/login")
    .send({
      email: userB.email,
      password: userB.password,
    });

  assert.equal(loginB.status, 200);

  // User B attempts to update User A's ticket.
  const updateResponse = await agentB
    .put(`/api/tickets/${ticketId}`)
    .send({
      title: "Unauthorized title change",
      status: "resolved",
    });

  assert.equal(updateResponse.status, 404);
  assert.equal(updateResponse.body.success, false);
  assert.equal(updateResponse.body.message, "Ticket not found.");

  // Confirm the original ticket remains unchanged.
  const savedTicket = await Ticket.findById(ticketId);

  assert.ok(savedTicket);
  assert.equal(savedTicket.title, "User A private ticket");
  assert.equal(savedTicket.status, "open");
});


