
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
  deleteTicket,
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


router.delete("/:ticketId", authMiddleware, deleteTicket);

export default router;
