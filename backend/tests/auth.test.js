
import "dotenv/config";
import { createHash } from "node:crypto";
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



test("DELETE /api/tickets/:ticketId deletes the authenticated user's ticket", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Ticket Delete User",
    email: "ticket-delete-test@example.com",
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
      title: "Ticket to delete",
      description: "This ticket will be deleted by its creator.",
      priority: "medium",
    });

  assert.equal(createResponse.status, 201);

  const ticketId = createResponse.body.data.ticket.id;

  // Confirm that the ticket exists before deletion.
  assert.ok(await Ticket.findById(ticketId));

  const deleteResponse = await agent.delete(
    `/api/tickets/${ticketId}`
  );

  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.success, true);
  assert.equal(
    deleteResponse.body.message,
    "Ticket deleted successfully."
  );

  // Confirm that MongoDB no longer contains the ticket.
  const deletedTicket = await Ticket.findById(ticketId);

  assert.equal(deletedTicket, null);
});


test("DELETE /api/tickets/:ticketId prevents another user from deleting a ticket", async () => {
  const agentA = request.agent(app);
  const agentB = request.agent(app);

  const userA = {
    name: "Delete Owner A",
    email: "delete-owner-a@example.com",
    password: "DevDesk@123",
  };

  const userB = {
    name: "Delete Owner B",
    email: "delete-owner-b@example.com",
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
      title: "User A protected ticket",
      description: "Only User A owns this ticket.",
      priority: "high",
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

  // User B attempts to delete User A's ticket.
  const deleteResponse = await agentB.delete(
    `/api/tickets/${ticketId}`
  );

  assert.equal(deleteResponse.status, 404);
  assert.equal(deleteResponse.body.success, false);
  assert.equal(deleteResponse.body.message, "Ticket not found.");

  // The ticket must still exist and remain unchanged.
  const savedTicket = await Ticket.findById(ticketId);

  assert.ok(savedTicket, "Another user must not delete this ticket.");
  assert.equal(savedTicket.title, "User A protected ticket");
  assert.equal(savedTicket.createdBy.toString(), loginA.body.data.user.id);
});


test("GET /api/tickets filters by status and priority", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Ticket Filter User",
    email: "ticket-filter-test@example.com",
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

  // Create a high-priority open ticket.
  const highOpenResponse = await agent
    .post("/api/tickets")
    .send({
      title: "High priority open ticket",
      description: "Needs attention.",
      priority: "high",
    });

  assert.equal(highOpenResponse.status, 201);

  // Create a low-priority open ticket.
  const lowOpenResponse = await agent
    .post("/api/tickets")
    .send({
      title: "Low priority open ticket",
      description: "Can wait.",
      priority: "low",
    });

  assert.equal(lowOpenResponse.status, 201);

  // Create a high-priority ticket, then resolve it.
  const resolvedResponse = await agent
    .post("/api/tickets")
    .send({
      title: "Resolved high priority ticket",
      description: "Already resolved.",
      priority: "high",
    });

  assert.equal(resolvedResponse.status, 201);

  const ticketId = resolvedResponse.body.data.ticket.id;

  const updateResponse = await agent
    .put(`/api/tickets/${ticketId}`)
    .send({ status: "resolved" });

  assert.equal(updateResponse.status, 200);

  // Request tickets that are both open AND high priority.
  const response = await agent.get(
    "/api/tickets?status=open&priority=high"
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.tickets.length, 1);

  assert.equal(
    response.body.data.tickets[0].title,
    "High priority open ticket"
  );

  assert.equal(response.body.data.tickets[0].status, "open");
  assert.equal(response.body.data.tickets[0].priority, "high");

  assert.equal(response.body.data.pagination.total, 1);
});


test("GET /api/tickets paginates results and returns correct metadata", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Pagination Test User",
    email: "ticket-pagination-test@example.com",
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

  // Create three tickets.
  for (let i = 1; i <= 3; i++) {
    const createResponse = await agent
      .post("/api/tickets")
      .send({
        title: `Pagination ticket ${i}`,
        description: `Test ticket ${i}`,
        priority: "medium",
      });

    assert.equal(createResponse.status, 201);
  }

  // Page 1: expect two tickets.
  const pageOne = await agent.get("/api/tickets?page=1&limit=2");

  assert.equal(pageOne.status, 200);
  assert.equal(pageOne.body.data.tickets.length, 2);
  assert.equal(pageOne.body.data.pagination.page, 1);
  assert.equal(pageOne.body.data.pagination.limit, 2);
  assert.equal(pageOne.body.data.pagination.total, 3);
  assert.equal(pageOne.body.data.pagination.totalPages, 2);
  assert.equal(pageOne.body.data.pagination.hasNextPage, true);
  assert.equal(pageOne.body.data.pagination.hasPrevPage, false);

  // Page 2: expect the remaining ticket.
  const pageTwo = await agent.get("/api/tickets?page=2&limit=2");

  assert.equal(pageTwo.status, 200);
  assert.equal(pageTwo.body.data.tickets.length, 1);
  assert.equal(pageTwo.body.data.pagination.page, 2);
  assert.equal(pageTwo.body.data.pagination.total, 3);
  assert.equal(pageTwo.body.data.pagination.hasNextPage, false);
  assert.equal(pageTwo.body.data.pagination.hasPrevPage, true);

  // The two pages must not contain duplicate tickets.
  const pageOneIds = pageOne.body.data.tickets.map((ticket) => ticket.id);
  const pageTwoIds = pageTwo.body.data.tickets.map((ticket) => ticket.id);

  assert.equal(
    pageOneIds.some((id) => pageTwoIds.includes(id)),
    false
  );
});


test("GET /api/tickets sorts tickets by title in ascending order", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Ticket Sort User",
    email: "ticket-sort-test@example.com",
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

  const titles = [
    "Zebra ticket",
    "Apple ticket",
    "Mango ticket",
  ];

  for (const title of titles) {
    const createResponse = await agent
      .post("/api/tickets")
      .send({
        title,
        description: "Sorting test ticket",
        priority: "medium",
      });

    assert.equal(createResponse.status, 201);
  }

  const response = await agent.get(
    "/api/tickets?sortBy=title&sortOrder=asc"
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.tickets.length, 3);

  const sortedTitles = response.body.data.tickets.map(
    (ticket) => ticket.title
  );

  assert.deepEqual(sortedTitles, [
    "Apple ticket",
    "Mango ticket",
    "Zebra ticket",
  ]);
});


test("GET /api/tickets searches titles and descriptions case-insensitively", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Ticket Search User",
    email: "ticket-search-test@example.com",
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

  const tickets = [
    {
      title: "LOGIN screen is broken",
      description: "The button does not respond.",
    },
    {
      title: "Checkout issue",
      description: "The user cannot login during checkout.",
    },
    {
      title: "Profile settings",
      description: "The avatar cannot be changed.",
    },
  ];

  for (const ticket of tickets) {
    const response = await agent
      .post("/api/tickets")
      .send({
        ...ticket,
        priority: "medium",
      });

    assert.equal(response.status, 201);
  }

  // Search should match both title and description,
  // without being case-sensitive.
  const response = await agent.get("/api/tickets?search=login");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.tickets.length, 2);
  assert.equal(response.body.data.pagination.total, 2);

  const titles = response.body.data.tickets.map(
    (ticket) => ticket.title
  );

  assert.ok(titles.includes("LOGIN screen is broken"));
  assert.ok(titles.includes("Checkout issue"));
  assert.equal(titles.includes("Profile settings"), false);
});


test("GET /api/tickets rejects invalid query parameters", async () => {
  const agent = request.agent(app);

  const user = {
    name: "Invalid Query Test User",
    email: "invalid-query-test@example.com",
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

  const invalidQueries = [
    "/api/tickets?status=pending",
    "/api/tickets?priority=urgent",
    "/api/tickets?page=0",
    "/api/tickets?limit=101",
    "/api/tickets?sortBy=password",
    "/api/tickets?sortOrder=sideways",
  ];

  for (const query of invalidQueries) {
    const response = await agent.get(query);

    assert.equal(response.status, 400, `Expected 400 for ${query}`);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Validation failed.");
  }
});

// Helper: register a test user and seed a hashed password-reset token.
async function createUserWithResetToken({
  email,
  token,
  expiresAt,
  password = "OldPassword@123",
}) {
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Password Reset Test User",
      email,
      password,
    });

  assert.equal(
    registerResponse.status,
    201,
    `Test user registration failed: ${registerResponse.text}`,
  );

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const updateResult = await User.updateOne(
    { email },
    {
      $set: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
      },
    },
  );

  assert.equal(updateResult.matchedCount, 1);

  return { email, token, password };
}


// Test 1: Weak passwords must be rejected.
test("POST /api/auth/reset-password rejects weak passwords", async () => {
  const weakPasswords = [
    "abcdefgh",
    "HELLO@123",
    "Hello@abc",
    "Hello123",
    "hello@123",
  ];

  for (const password of weakPasswords) {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: "unused-test-token",
        password,
      });

    assert.equal(
      response.status,
      400,
      `Weak password should be rejected: ${password}`,
    );

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Validation failed.");
  }
});


// Test 2: An unknown reset token must be rejected.
test("POST /api/auth/reset-password rejects an invalid token", async () => {
  const response = await request(app)
    .post("/api/auth/reset-password")
    .send({
      token: "invalid-reset-token",
      password: "NewStrong@456",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Reset token is invalid or has expired.",
  );
});


// Test 3: An expired reset token must be rejected.
test("POST /api/auth/reset-password rejects an expired token", async () => {
  const token = "expired-reset-token";

  await createUserWithResetToken({
    email: "expired-reset@example.com",
    token,
    expiresAt: new Date(Date.now() - 60_000),
  });

  const response = await request(app)
    .post("/api/auth/reset-password")
    .send({
      token,
      password: "NewStrong@456",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Reset token is invalid or has expired.",
  );
});


// Test 4: A valid reset changes the password and consumes the token.
test("POST /api/auth/reset-password changes the password and rejects token reuse", async () => {
  const email = "valid-reset@example.com";
  const token = "valid-reset-token";
  const oldPassword = "OldPassword@123";
  const newPassword = "NewStrong@456";

  await createUserWithResetToken({
    email,
    token,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    password: oldPassword,
  });

  const resetResponse = await request(app)
    .post("/api/auth/reset-password")
    .send({
      token,
      password: newPassword,
    });

  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.body.success, true);
  assert.equal(
    resetResponse.body.message,
    "Password has been reset successfully. Please log in again.",
  );

  // The same token must not work a second time.
  const reuseResponse = await request(app)
    .post("/api/auth/reset-password")
    .send({
      token,
      password: "AnotherStrong@789",
    });

  assert.equal(reuseResponse.status, 400);
  assert.equal(reuseResponse.body.success, false);

  // The old password must no longer authenticate.
  const oldLoginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password: oldPassword,
    });

  assert.equal(oldLoginResponse.status, 401);

  // The new password must authenticate successfully.
  const newLoginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password: newPassword,
    });

  assert.equal(newLoginResponse.status, 200);
  assert.equal(newLoginResponse.body.success, true);
});

// Test 1: Registered email gets a generic response even if email delivery fails.
test("POST /api/auth/forgot-password handles email delivery failure safely", async () => {
  const email = "forgot-password-test@example.com";

  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Forgot Password Test User",
      email,
      password: "DevDesk@123",
    });

  assert.equal(registerResponse.status, 201);

  // Ensure this test never sends a real email.
  const originalApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  let response;

  try {
    response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email });
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.message,
    "If an account exists with that email, password reset instructions will be sent.",
  );

  // Failed delivery should clean up the unused reset token.
  const savedUser = await User.findOne({ email }).select(
    "+resetPasswordTokenHash +resetPasswordExpiresAt",
  );

  assert.ok(savedUser);
  assert.equal(savedUser.resetPasswordTokenHash, undefined);
  assert.equal(savedUser.resetPasswordExpiresAt, undefined);
});


// Test 2: Unknown email gets the same generic response.
test("POST /api/auth/forgot-password returns a generic response for an unknown email", async () => {
  const response = await request(app)
    .post("/api/auth/forgot-password")
    .send({
      email: "unknown-account@example.com",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.message,
    "If an account exists with that email, password reset instructions will be sent.",
  );
});


// Test 3: Invalid email is rejected by request validation.
test("POST /api/auth/forgot-password rejects an invalid email", async () => {
  const response = await request(app)
    .post("/api/auth/forgot-password")
    .send({
      email: "not-an-email",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed.");
});