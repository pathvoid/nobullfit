import type { Request, Response } from "express";
import getPool from "../../db/connection.js";

interface MaintenanceSchedule {
    id: number;
    start_time: Date;
    end_time: Date;
    is_active: boolean;
}

interface MaintenanceStatus {
    hasUpcoming: boolean;
    isInProgress: boolean;
    maintenance: {
        startTime: string;
        endTime: string;
    } | null;
}

// Get current maintenance status (public endpoint - no auth required)
export async function handleGetMaintenanceStatus(req: Request, res: Response): Promise<void> {
    try {
        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const now = new Date();
        // Look for maintenance within the next 5 days
        const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        // Get the most relevant maintenance schedule:
        // 1. Currently in progress (start_time <= now <= end_time)
        // 2. Upcoming within 5 days (now < start_time <= 5 days from now)
        const result = await pool.query<MaintenanceSchedule>(
            `SELECT id, start_time, end_time, is_active
             FROM maintenance_schedules
             WHERE is_active = true
               AND end_time > $1
               AND start_time <= $2
             ORDER BY start_time ASC
             LIMIT 1`,
            [now.toISOString(), fiveDaysFromNow.toISOString()]
        );

        if (result.rows.length === 0) {
            const status: MaintenanceStatus = {
                hasUpcoming: false,
                isInProgress: false,
                maintenance: null
            };
            res.status(200).json(status);
            return;
        }

        const maintenance = result.rows[0];
        const startTime = new Date(maintenance.start_time);
        const endTime = new Date(maintenance.end_time);
        const isInProgress = now >= startTime && now <= endTime;

        const status: MaintenanceStatus = {
            hasUpcoming: !isInProgress,
            isInProgress,
            maintenance: {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            }
        };

        res.status(200).json(status);
    } catch (error) {
        console.error("Error fetching maintenance status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
