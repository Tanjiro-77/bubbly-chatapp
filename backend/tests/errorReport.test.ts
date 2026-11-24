import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { submitErrorReport, updateReportStatus, getErrorReports } from "../controllers/errorReport.controller";
import AppErrorReport from "../modals/AppErrorReport";

describe("Error Reporting Controller", () => {
    test("rejects reports with missing title or description", async () => {
        let statusCode = 0;
        let responseJson: any = null;

        const req: any = {
            body: {
                title: "",
                description: "Test description",
            },
        };

        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return res;
            },
            json: (data: any) => {
                responseJson = data;
            },
        };

        await submitErrorReport(req, res);

        assert.equal(statusCode, 400);
        assert.equal(responseJson.success, false);
        assert.match(responseJson.msg, /Title and description are required/);
    });

    test("successfully formats and submits a report payload", async () => {
        let statusCode = 0;
        let responseJson: any = null;

        const originalCreate = AppErrorReport.create;
        // Mock Mongoose create
        (AppErrorReport as any).create = async (doc: any) => {
            return {
                _id: "mock_report_12345",
                ...doc,
            };
        };

        try {
            const req: any = {
                body: {
                    title: "Audio call glitch on iOS",
                    description: "Mic muted unexpectedly during call",
                    category: "audio_call",
                    type: "bug_report",
                    deviceInfo: {
                        os: "iOS 17.5",
                        deviceModel: "iPhone 15 Pro",
                        appVersion: "3.4.0",
                        currentRoute: "/(main)/callScreen",
                    },
                },
                userId: "user_67890",
            };

            const res: any = {
                status: (code: number) => {
                    statusCode = code;
                    return res;
                },
                json: (data: any) => {
                    responseJson = data;
                },
            };

            await submitErrorReport(req, res);

            assert.equal(statusCode, 201);
            assert.equal(responseJson.success, true);
            assert.equal(responseJson.reportId, "mock_report_12345");
        } finally {
            AppErrorReport.create = originalCreate;
        }
    });

    test("validates status in updateReportStatus", async () => {
        let statusCode = 0;
        let responseJson: any = null;

        const req: any = {
            params: { id: "mock_id" },
            body: {
                status: "invalid_status_value",
            },
        };

        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return res;
            },
            json: (data: any) => {
                responseJson = data;
            },
        };

        await updateReportStatus(req, res);

        assert.equal(statusCode, 400);
        assert.equal(responseJson.success, false);
        assert.match(responseJson.msg, /Valid status/);
    });
});
