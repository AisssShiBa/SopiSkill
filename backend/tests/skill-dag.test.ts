import { describe, expect, it } from "vitest";

import { validateSkillDag } from "../src/algorithms/skill-dag.js";

function edge(prerequisiteSkillId: string, skillId: string) {
    return { prerequisiteSkillId, skillId };
}

describe("KC-01 skill DAG", () => {
    it("chấp nhận graph rỗng và graph nhiều nhánh có node độc lập", () => {
        expect(validateSkillDag([], [])).toEqual({ valid: true });
        expect(
            validateSkillDag(["A", "B", "C", "D", "E"], [
                edge("A", "B"),
                edge("A", "C"),
                edge("B", "D"),
                edge("C", "D"),
            ]),
        ).toEqual({ valid: true });
    });

    it("phát hiện A → B → C → A dù graph còn node độc lập", () => {
        expect(
            validateSkillDag(["A", "B", "C", "D"], [
                edge("A", "B"),
                edge("B", "C"),
                edge("C", "A"),
            ]),
        ).toEqual({ valid: false, reason: "CYCLE" });
    });

    it("từ chối cạnh tự nối", () => {
        expect(validateSkillDag(["A"], [edge("A", "A")])).toEqual({
            valid: false,
            reason: "SELF_LOOP",
        });
    });

    it("từ chối hai cạnh giống nhau", () => {
        expect(validateSkillDag(["A", "B"], [edge("A", "B"), edge("A", "B")])).toEqual({
            valid: false,
            reason: "DUPLICATE_EDGE",
        });
    });

    it("từ chối cạnh có một trong hai đầu mút ngoài graph", () => {
        expect(validateSkillDag(["A"], [edge("A", "B")])).toEqual({
            valid: false,
            reason: "UNKNOWN_SKILL",
        });
        expect(validateSkillDag(["A"], [edge("B", "A")])).toEqual({
            valid: false,
            reason: "UNKNOWN_SKILL",
        });
    });
});
