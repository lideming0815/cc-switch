import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSkillInstallTargets } from "@/components/skills/useSkillInstallTargets";

const toggle = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useSkills", () => ({
  useToggleSkillApp: () => ({ mutateAsync: toggle }),
}));

describe("Skills install targets", () => {
  beforeEach(() => {
    window.localStorage.clear();
    toggle.mockReset().mockResolvedValue(true);
  });

  it("remembers DeepSeek Harness and installs directly into its target", async () => {
    window.localStorage.setItem(
      "cc-switch:skills:install-to",
      JSON.stringify(["deepseek-harness"]),
    );
    const { result } = renderHook(() =>
      useSkillInstallTargets(["claude", "deepseek-harness"]),
    );
    expect(result.current.targets).toEqual(["deepseek-harness"]);
    const install = vi.fn().mockResolvedValue([{ id: "skill" }]);
    await act(async () => {
      await result.current.installTo(install);
    });
    expect(install).toHaveBeenCalledWith("deepseek-harness");
    expect(toggle).not.toHaveBeenCalled();
  });

  it("reuses secondary-target sync when installing for Claude and DeepSeek Harness", async () => {
    const { result } = renderHook(() =>
      useSkillInstallTargets(["claude", "deepseek-harness"]),
    );
    act(() => result.current.setTargets(["claude", "deepseek-harness"]));
    const install = vi.fn().mockResolvedValue([{ id: "skill" }]);
    await act(async () => {
      await result.current.installTo(install);
    });
    expect(install).toHaveBeenCalledWith("claude");
    expect(toggle).toHaveBeenCalledWith({
      id: "skill",
      app: "deepseek-harness",
      enabled: true,
    });
    expect(
      JSON.parse(window.localStorage.getItem("cc-switch:skills:install-to")!),
    ).toEqual(["claude", "deepseek-harness"]);
  });
});
