import mongoose from "mongoose";
import Ticket from "./ticket.model.js";
import Activity from "../activities/activity.model.js";

async function recordTicketActivity({
    userId,
    ticket,
    action,
    message,
    changes = [],
}) {
    return Activity.create({
        user: userId,
        ticketId: ticket._id,
        ticketTitle: ticket.title,
        action,
        message,
        changes,
    });
}

function formatStatus(status) {
    return status
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export const createTicket = async (req, res, next) => {
    try {
        const { title, description, priority } = req.validatedBody;

        const ticket = await Ticket.create({
            title,
            description,
            priority,
            createdBy: req.user._id,
        });

        await recordTicketActivity({
            userId: req.user._id,
            ticket,
            action: "ticket.created",
            message: `Created ticket "${ticket.title}".`,
        });

        return res.status(201).json({
            success: true,
            message: "Ticket created successfully.",
            data: {
                ticket: {
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdBy: ticket.createdBy,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const listTickets = async (req, res, next) => {
    try {
        const {
            page,
            limit,
            status,
            priority,
            search,
            sortBy,
            sortOrder,
        } = req.validatedQuery;

        // Always restrict results to the authenticated user.
        const filter = {
            createdBy: req.user._id,
        };

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        // Treat search input as literal text, not a regular expression.
        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&",
            );

            const searchRegex = new RegExp(escapedSearch, "i");

            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
            ];
        }

        const sort = {
            [sortBy]: sortOrder === "asc" ? 1 : -1,
        };

        const skip = (page - 1) * limit;

        const [total, tickets] = await Promise.all([
            Ticket.countDocuments(filter),
            Ticket.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            data: {
                tickets: tickets.map((ticket) => ({
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const updateTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID.",
            });
        }

        const ticket = await Ticket.findOne({
            _id: ticketId,
            createdBy: req.user._id,
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found.",
            });
        }

        const previousValues = {
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
        };

        Object.assign(ticket, req.validatedBody);

        await ticket.save();

        const fields = [
            "title",
            "description",
            "priority",
            "status",
        ];

        const changes = fields
            .filter(
                (field) =>
                    String(previousValues[field] ?? "") !==
                    String(ticket[field] ?? ""),
            )
            .map((field) => ({
                field,
                from: previousValues[field] ?? "",
                to: ticket[field] ?? "",
            }));

        // Avoid creating history entries for no-op updates.
        if (changes.length > 0) {
            const statusChanged = changes.some(
                (change) => change.field === "status",
            );

            const action = statusChanged
                ? "ticket.status_changed"
                : "ticket.updated";

            const message = statusChanged
                ? `Ticket status changed from ${formatStatus(previousValues.status)} to ${formatStatus(ticket.status)}.`
                : `Updated ticket "${ticket.title}".`;

            await recordTicketActivity({
                userId: req.user._id,
                ticket,
                action,
                message,
                changes,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ticket updated successfully.",
            data: {
                ticket: {
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const deleteTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID.",
            });
        }

        const ticket = await Ticket.findOneAndDelete({
            _id: ticketId,
            createdBy: req.user._id,
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found.",
            });
        }

        // Save history separately so it survives ticket deletion.
        await recordTicketActivity({
            userId: req.user._id,
            ticket,
            action: "ticket.deleted",
            message: `Deleted ticket "${ticket.title}".`,
        });

        return res.status(200).json({
            success: true,
            message: "Ticket deleted successfully.",
        });
    } catch (error) {
        return next(error);
    }
};