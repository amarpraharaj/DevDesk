import Activity from "./activity.model.js";

export const listActivities = async (req, res, next) => {
    try {
        const rawPage = req.query.page ?? "1";
        const rawLimit = req.query.limit ?? "20";

        if (
            typeof rawPage !== "string" ||
            !/^[1-9]\d*$/.test(rawPage) ||
            typeof rawLimit !== "string" ||
            !/^[1-9]\d*$/.test(rawLimit)
        ) {
            return res.status(400).json({
                success: false,
                message: "Validation failed.",
            });
        }

        const page = Number(rawPage);
        const limit = Number(rawLimit);

        if (
            !Number.isSafeInteger(page) ||
            !Number.isSafeInteger(limit) ||
            limit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Validation failed.",
            });
        }

        // Users can only retrieve their own activity history.
        const filter = {
            user: req.user._id,
        };

        const skip = (page - 1) * limit;

        const [total, activities] = await Promise.all([
            Activity.countDocuments(filter),

            Activity.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            data: {
                activities: activities.map((activity) => ({
                    id: activity._id,
                    ticketId: activity.ticketId,
                    ticketTitle: activity.ticketTitle,
                    action: activity.action,
                    message: activity.message,
                    changes: activity.changes,
                    createdAt: activity.createdAt,
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