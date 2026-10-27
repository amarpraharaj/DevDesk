import mongoose from "mongoose";

const activityChangeSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    from: {
      type: String,
      default: "",
    },
    to: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },

    ticketTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    action: {
      type: String,
      enum: [
        "ticket.created",
        "ticket.updated",
        "ticket.status_changed",
        "ticket.deleted",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    changes: {
      type: [activityChangeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Efficiently retrieve a user's newest activities first.
activitySchema.index({ user: 1, createdAt: -1, _id: -1 });

// Retrieve activity associated with a particular ticket.
activitySchema.index({ ticketId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
