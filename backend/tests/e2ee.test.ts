import test from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { formatMessagePayload, validateAttachment } from "../utils/messageFormat";
import { formatMessageNotificationBody } from "../services/pushNotificationService";
import { publishE2EEKey } from "../controllers/e2ee.controller";

test("End-to-End Encryption (E2EE) Protocol & Privacy", async (t) => {
    await t.test("X25519 key wrap + XSalsa20-Poly1305 message encryption roundtrip & tamper detection", () => {
        const alice = nacl.box.keyPair();
        const bob = nacl.box.keyPair();
        const convKey = nacl.randomBytes(32);

        // Alice wraps convKey for Bob
        const wrapNonce = nacl.randomBytes(nacl.box.nonceLength);
        const wrapped = nacl.box(convKey, wrapNonce, bob.publicKey, alice.secretKey);

        // Bob unwraps convKey
        const unwrapped = nacl.box.open(wrapped, wrapNonce, alice.publicKey, bob.secretKey);
        assert.ok(unwrapped);
        assert.deepEqual(unwrapped, convKey);

        // Alice encrypts message
        const msgNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        const plaintext = new TextEncoder().encode(JSON.stringify({ content: "Hello Bob 🔒", type: "text" }));
        const ciphertext = nacl.secretbox(plaintext, msgNonce, convKey);

        // Bob decrypts message
        const decrypted = nacl.secretbox.open(ciphertext, msgNonce, unwrapped!);
        assert.ok(decrypted);
        assert.equal(JSON.parse(new TextDecoder().decode(decrypted!)).content, "Hello Bob 🔒");

        // Tampered ciphertext must fail authentication
        const tampered = new Uint8Array(ciphertext);
        tampered[0] ^= 0xff;
        assert.equal(nacl.secretbox.open(tampered, msgNonce, unwrapped!), null);
    });

    await t.test("formatMessagePayload preserves e2ee for active messages and scrubs e2ee when deleted", () => {
        const active = formatMessagePayload({
            _id: "m1",
            conversationId: "c1",
            content: "",
            type: "text",
            isEncrypted: true,
            e2ee: { v: 1, alg: "x25519-xsalsa20poly1305", iv: "abc", ciphertext: "xyz", keyVersion: 1 },
            createdAt: new Date(),
        });
        assert.equal(active.isEncrypted, true);
        assert.equal(active.e2ee?.ciphertext, "xyz");

        const deleted = formatMessagePayload({
            _id: "m2",
            conversationId: "c1",
            content: "",
            type: "text",
            isDeleted: true,
            isEncrypted: true,
            e2ee: { v: 1, alg: "x25519-xsalsa20poly1305", iv: "abc", ciphertext: "xyz", keyVersion: 1 },
            createdAt: new Date(),
        });
        assert.equal(deleted.isDeleted, true);
        assert.equal(deleted.e2ee, null);
    });

    await t.test("formatMessageNotificationBody never leaks plaintext for encrypted messages", () => {
        assert.equal(
            formatMessageNotificationBody({ type: "text", content: "secret", isEncrypted: true }),
            "🔒 New encrypted message"
        );
        assert.equal(
            formatMessageNotificationBody({ type: "image", content: "secret", isEncrypted: true }),
            "🔒 Encrypted photo"
        );
        assert.equal(
            formatMessageNotificationBody({ type: "voice", isEncrypted: true }),
            "🔒 Encrypted voice message"
        );
        assert.equal(
            formatMessageNotificationBody({ type: "image", isViewOnce: true, isEncrypted: true }),
            "🔒 Encrypted view-once media"
        );
    });

    await t.test("validateAttachment allows encrypted application/octet-stream blobs and blocks SVG", () => {
        assert.doesNotThrow(() =>
            validateAttachment({
                url: "https://res.cloudinary.com/demo/raw/upload/enc.bin",
                mimeType: "application/octet-stream",
                size: 1024,
            })
        );
        assert.throws(() =>
            validateAttachment({
                url: "https://res.cloudinary.com/demo/image/upload/evil.svg",
                mimeType: "image/svg+xml",
                size: 500,
            })
        );
    });

    await t.test("publishE2EEKey rejects invalid public keys", async () => {
        let statusCode = 200;
        let body: any = null;
        const req: any = { user: { id: "507f1f77bcf86cd799439011" }, body: { publicKey: "not-a-valid-key" } };
        const res: any = {
            status(code: number) {
                statusCode = code;
                return this;
            },
            json(payload: any) {
                body = payload;
                return this;
            },
        };
        await publishE2EEKey(req, res);
        assert.equal(statusCode, 400);
        assert.equal(body.success, false);
    });
});
