import { useCallback, useState } from "react";
import type { SkillTarget } from "@/lib/api/skills";
import { SKILL_TARGET_IDS } from "@/config/appConfig";
import { useToggleSkillApp } from "@/hooks/useSkills";

const STORAGE_KEY = "cc-switch:skills:install-to";
const DEFAULT_TARGETS: SkillTarget[] = ["claude", "codex"];

function readStored(): SkillTarget[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const apps = parsed.filter((app): app is SkillTarget =>
      SKILL_TARGET_IDS.includes(app as SkillTarget),
    );
    return apps.length ? apps : null;
  } catch {
    return null;
  }
}

function writeStored(apps: SkillTarget[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // 只是记住上次的选择，存不了不影响安装
  }
}

/**
 * 「安装到」：发现、ZIP、备份恢复都显式装进这里选的应用（默认记住上次的选择）。
 * 后端 install_skill_unified 只收一个应用，所以先装到第一个、再逐个启用其余的，不是原子的。
 */
export function useSkillInstallTargets(visibleAppIds: readonly SkillTarget[]) {
  const [stored, setStored] = useState<SkillTarget[]>(
    () => readStored() ?? DEFAULT_TARGETS,
  );
  const toggleMutation = useToggleSkillApp();

  // 只算看得见的应用；一个都不剩时退回第一个可见应用
  const targets = SKILL_TARGET_IDS.filter(
    (app) => stored.includes(app) && visibleAppIds.includes(app),
  );
  const effective =
    targets.length > 0 ? targets : visibleAppIds.slice(0, 1).map((app) => app);

  const setTargets = useCallback((apps: SkillTarget[]) => {
    setStored(apps);
    writeStored(apps);
  }, []);

  /**
   * 先用 first 应用调用 install，再把其余应用逐个打开。
   * 返回装好的 Skill 和没能启用的应用（不抛错；install 本身失败才抛）。
   */
  const installTo = async <T extends { id: string }>(
    install: (firstApp: SkillTarget) => Promise<T[]>,
    apps: SkillTarget[] = effective,
  ) => {
    const [first, ...rest] = apps;
    const installed = await install(first ?? "claude");
    const failures: Array<{ id: string; app: SkillTarget; error: unknown }> =
      [];
    for (const skill of installed) {
      for (const app of rest) {
        try {
          await toggleMutation.mutateAsync({
            id: skill.id,
            app,
            enabled: true,
          });
        } catch (error) {
          failures.push({ id: skill.id, app, error });
        }
      }
    }
    return { installed, failures };
  };

  return { targets: effective, setTargets, installTo };
}
