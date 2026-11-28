import type { PrerequisiteEdgeDTO } from "@sopiskill/shared";

export type SkillDagResult =
    | { valid: true }
    | {
        valid: false;
        reason: "UNKNOWN_SKILL" | "SELF_LOOP" | "DUPLICATE_EDGE" | "CYCLE";
    };

export function validateSkillDag(
    skillIds: readonly string[],
    prerequisites: readonly PrerequisiteEdgeDTO[],
): SkillDagResult {
    const dependentsBySkill = new Map<string, Set<string>>();
    const remainingPrerequisites = new Map<string, number>();

    for (const skillId of skillIds) {
        dependentsBySkill.set(skillId, new Set());
        remainingPrerequisites.set(skillId, 0);
    }

    for (const { skillId, prerequisiteSkillId } of prerequisites) {
        const dependents = dependentsBySkill.get(prerequisiteSkillId);
        const count = remainingPrerequisites.get(skillId);
        if (!dependents || count === undefined) {
            return { valid: false, reason: "UNKNOWN_SKILL" };
        }
        if (skillId === prerequisiteSkillId) {
            return { valid: false, reason: "SELF_LOOP" };
        }
        if (dependents.has(skillId)) {
            return { valid: false, reason: "DUPLICATE_EDGE" };
        }

        dependents.add(skillId);
        remainingPrerequisites.set(skillId, count + 1);
    }

    const ready: string[] = [];
    for (const [skillId, count] of remainingPrerequisites) {
        if (count === 0) {
            ready.push(skillId);
        }
    }

    // Kahn: kỹ năng chỉ vào hàng đợi sau khi đã xử lý mọi prerequisite.
    for (let index = 0; index < ready.length; index++) {
        for (const dependent of dependentsBySkill.get(ready[index])!) {
            const count = remainingPrerequisites.get(dependent)! - 1;
            remainingPrerequisites.set(dependent, count);
            if (count === 0) {
                ready.push(dependent);
            }
        }
    }

    if (ready.length !== remainingPrerequisites.size) {
        return { valid: false, reason: "CYCLE" };
    }
    return { valid: true };
}
