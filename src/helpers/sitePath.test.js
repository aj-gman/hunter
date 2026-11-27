import { describe, expect, it } from "vitest";

const { normalizeBasePath, withBasePath, withoutBasePath } = require("./sitePath");
const { getFileTree } = require("./filetreeUtils");

describe("site path helpers", () => {
  it("normalizes a project base path", () => {
    expect(normalizeBasePath("/hunter/")).toBe("/hunter");
    expect(normalizeBasePath("")).toBe("");
  });

  it("prefixes site paths without changing their route", () => {
    expect(withBasePath("/notes/example/", "/hunter/")).toBe("/hunter/notes/example/");
    expect(withBasePath("/", "/hunter/")).toBe("/hunter/");
  });

  it("does not double-prefix or rewrite external URLs", () => {
    expect(withBasePath("/hunter/searchIndex.json", "/hunter/")).toBe("/hunter/searchIndex.json");
    expect(withBasePath("https://example.com/page", "/hunter/")).toBe("https://example.com/page");
    expect(withBasePath("#section", "/hunter/")).toBe("#section");
  });

  it("removes a base path before Eleventy rewrites HTML links", () => {
    expect(withoutBasePath("/hunter/notes/example/", "/hunter/")).toBe("/notes/example/");
    expect(withoutBasePath("/hunter/", "/hunter/")).toBe("/");
  });

  it("keeps file-tree note links rooted for Eleventy to prefix", () => {
    const tree = getFileTree({
      collections: {
        note: [{ filePathStem: "/notes/example", data: { permalink: "/example/" } }],
      },
    });

    expect(tree["example.md"].permalink).toBe("/example/");
  });
});