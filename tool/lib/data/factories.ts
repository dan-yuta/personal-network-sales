import { type Profile } from "@/lib/schema";

/**
 * 候補者の最小 Profile 生成ヘルパー。
 * 氏名以外は空文字に揃え、Pane 3 では空欄として可視化される。
 * `addCandidate`（Workspace 本体）から参照される。
 */
export function createMinimalProfile(name: string): Profile {
  return {
    // プロフィール (3)
    name,
    furigana: "",
    birthday: "",
    source: "",

    // 連絡先 (3)
    email: "",
    phone: "",
    address: "",

    // 選考状況 (4)
    recruiter: "",
    desiredSalaryMin: "",
    desiredSalaryMax: "",
    availableStartDate: "",

    // 読み物 (2)
    careerText: "",
    motivationFull: "",
  };
}
