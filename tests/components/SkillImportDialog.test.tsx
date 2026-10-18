import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SkillImportDialog } from "@/components/skills/SkillImportDialog";

describe("Skills import targets", () => {
  it.each([true, false])(
    "lets users preserve or disable a discovered DeepSeek Harness target (enabled=%s)",
    async (enabled) => {
      const onImport = vi.fn();
      render(
        <SkillImportDialog
          skills={[
            {
              name: "Harness Skill",
              directory: "harness-skill",
              foundIn: ["deepseek-harness"],
              path: "/tmp/.dsh/skills/harness-skill",
            },
          ]}
          visibleAppIds={["claude", "deepseek-harness"]}
          isImporting={false}
          onImport={onImport}
          onClose={vi.fn()}
        />,
      );
      const checkbox = screen.getByRole("checkbox", {
        name: "DeepSeek Harness",
      });
      expect(checkbox).toBeChecked();
      if (!enabled) await userEvent.click(checkbox);
      await userEvent.click(
        screen.getByRole("button", { name: "skillsPage.import.submit" }),
      );
      expect(onImport).toHaveBeenCalledWith([
        {
          directory: "harness-skill",
          apps: expect.objectContaining({
            claude: false,
            "deepseek-harness": enabled,
          }),
        },
      ]);
    },
  );
});
