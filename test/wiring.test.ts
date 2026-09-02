import { test } from "node:test";
import assert from "node:assert/strict";
import { adapters, getAdapter } from "../src/adapters/index.ts";
import registerPlusExtension from "../extensions/plus.ts";

test("registry contains the pi-subagents adapter", () => {
	const adapter = getAdapter("pi-subagents");
	assert.ok(adapter, "pi-subagents adapter missing from registry");
	assert.equal(adapter.packageName, "pi-subagents");
	assert.ok(adapters.length >= 1);
});

test("extension entry exports a register function", () => {
	assert.equal(typeof registerPlusExtension, "function");
});
