
import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";

import {
  createTicketSchema,
  updateTicketSchema,
} from "./ticket.schema.js";

import {
  createTicket,
  listTickets,
  updateTicket,
} from "./ticket.controller.js";


const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createTicketSchema),
  createTicket
);

router.get("/", authMiddleware, listTickets);

router.put(
  "/:ticketId",
  authMiddleware,
  validate(updateTicketSchema),
  updateTicket
);

export default router;
