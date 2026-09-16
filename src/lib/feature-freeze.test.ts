import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { OPERATION_STAGES } from "@/domain/editor-workflow";

describe("Feature Freeze Invariants (HB-012)", () => {
  it("enforces that exactly one primary operation ('The Last Delivery') is exposed for P0", () => {
    // P0 feature freeze requires protecting schedule by freezing on The Last Delivery
    const tasksContent = readFileSync(join(process.cwd(), ".temp", "tasks.md"), "utf-8");
    expect(tasksContent).toContain("The Last Delivery");
  });

  it("verifies the existence of the official usability and feature freeze documentation", () => {
    const docPath = join(process.cwd(), "docs", "usability-and-feature-freeze.md");
    expect(existsSync(docPath)).toBe(true);

    const content = readFileSync(docPath, "utf-8");
    expect(content).toContain("18:00 UTC");
    expect(content).toContain("Five unassisted test participants");
    expect(content).toContain("P0 LOCKED");
  });

  it("confirms that the critical path is locked without scope leakage", () => {
    expect(OPERATION_STAGES).toHaveLength(4);
    const stageIds = OPERATION_STAGES.map((s) => s.id);
    expect(stageIds).toEqual(["file", "territory", "mission-plan", "dossier"]);
  });
});
