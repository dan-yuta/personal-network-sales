"use client";

/**
 * Pane 3: 候補者ダッシュボード。
 *
 * 「人物軸の編集」として、候補者ヘッダー + 候補者情報カード（Collapsible）+ 営業条件カード
 * の 3 要素で構成。アクティブな営業候補の現状（プロフィール・接触経路・営業条件）に
 * スクロールなしで即答できることが目標。
 *
 * セクション順序: 候補者ヘッダー → 候補者情報 → 営業条件
 *
 * `AxisScoreRow` は雛形由来の評価表示用ヘルパー。Phase 1 の画面では未使用だが、
 * 後フェーズで「関係性スコア」等を再導入する際に再利用できるよう残している。
 */

import { useState } from "react";
import {
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  X,
  Star,
  StarHalf,
  User,
  Target,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Profile,
  type Scorecard,
  type StageKey,
  AXIS_ORDER,
  STAGE_ORDER,
} from "@/lib/schema";
import { PANE3_SECTION, STAGE_LABELS, STAGE_THEME, EVALUATION_AXIS } from "@/lib/labels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getScorecardsAverageScore,
  getLatestDoneScorecard,
} from "@/lib/computed/scorecards";
import { calculateAge } from "@/lib/computed/profile";
import { avatarColorFor } from "@/lib/computed/avatar";
import { getDeadlineBadge } from "@/lib/computed/deadline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineTextField,
  InlineDateField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  ScoreLabel,
  SectionLabel,
  type ComboOption,
} from "@/components/primitives";

// ===== AxisScoreRow（雛形由来の評価表示ヘルパー、後フェーズの再利用に備えて export） =====

export function AxisScoreRow({
  label,
  value,
  bold = false,
  editable = false,
  onChange,
  onReset,
}: {
  label: string;
  value: number | null;
  bold?: boolean;
  editable?: boolean;
  onChange?: (value: number) => void;
  onReset?: () => void;
}) {
  if (value === null && !editable) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span
          className={cn(
            "text-muted-foreground",
            bold && "font-medium text-foreground",
          )}
        >
          {label}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="tabular-nums">—</span>
          <span className="text-[11px]">未評価</span>
        </span>
      </div>
    );
  }
  const v = value ?? 0;
  const floor = Math.floor(v);
  const hasHalf = !editable && v - floor >= 0.5;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span
        className={cn(
          "text-muted-foreground",
          bold && "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const isFull = n <= floor;
            const isHalf = hasHalf && n === floor + 1;
            const StarComp = isHalf ? StarHalf : Star;
            const filled = isFull || isHalf;
            const starEl = (
              <StarComp
                className={cn(
                  "size-3",
                  filled
                    ? "fill-primary text-primary"
                    : "fill-muted-foreground/20 text-muted-foreground/30",
                )}
                aria-hidden="true"
              />
            );
            if (editable && onChange) {
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className="rounded-sm transition-opacity outline-none hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`${label} を ${n} に設定`}
                >
                  {starEl}
                </button>
              );
            }
            return <span key={n}>{starEl}</span>;
          })}
        </span>
        <span
          className={cn(
            "min-w-[2.25rem] text-right text-foreground tabular-nums",
            bold && "font-medium",
            value === null && "text-muted-foreground",
          )}
        >
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        {editable && onReset && value !== null && (
          <button
            type="button"
            onClick={onReset}
            className="ml-1 inline-flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`${label} の評価をリセット`}
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    </div>
  );
}

// ===== Card: 営業条件 =====

function RecruitingConditionsCard({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent" className="flex items-center gap-2">
          <Target
            aria-hidden="true"
            className="size-4 text-primary"
          />
          {PANE3_SECTION.recruitingConditions}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="想定取引規模">
            <div className="flex items-center gap-1.5">
              <div className="w-20">
                <InlineTextField
                  value={profile.desiredSalaryMin}
                  onSave={(v) => updateField("desiredSalaryMin", v)}
                  ariaLabel="想定取引規模（下限）"
                  placeholder="—"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">〜</span>
              <div className="w-20">
                <InlineTextField
                  value={profile.desiredSalaryMax}
                  onSave={(v) => updateField("desiredSalaryMax", v)}
                  ariaLabel="想定取引規模（上限）"
                  placeholder="—"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                万円
              </span>
            </div>
          </InlineFieldRow>
          <InlineFieldRow label="次回アクション日">
            <InlineDateField
              value={profile.availableStartDate}
              onSave={(v) => updateField("availableStartDate", v)}
              ariaLabel="次回アクション日"
            />
          </InlineFieldRow>
        </dl>
      </CardContent>
    </Card>
  );
}

// ===== 接触経路の選択肢（Pane 3 ヘッダー帯トグル内で使用） =====
// 人脈営業ツールに合わせ、人脈ベースの接触経路に書き換え。

const INITIAL_SOURCE_OPTIONS: ComboOption[] = [
  { value: "既存知人", description: "前職同僚・友人など以前からの知り合い" },
  { value: "紹介経由（バック人脈）", description: "知人からの紹介で接触" },
  { value: "コミュニティ・同期", description: "学校同期・コミュニティ経由" },
  { value: "交流会・イベント", description: "ビジネス交流会や勉強会で名刺交換" },
  { value: "仕事先で出会う", description: "仕事の場で出会った人" },
];

// ===== ヘッダー帯トグル内の連絡先行 =====

function ContactRow({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  /** Tailwind カラークラス: `bg-XXX-100 text-XXX-700` 形式。
   *  Mail = blue / Phone = emerald / MapPin = orange など、種別ごとに色分け */
  color: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          color,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="sr-only">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

// ===== Card: 候補者情報（折りたたみ可能） =====

function ApplicationInfoCardContent({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const [sourceOptions, setSourceOptions] = useState<ComboOption[]>(
    INITIAL_SOURCE_OPTIONS,
  );

  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleAddSource = (newOpt: ComboOption) =>
    setSourceOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div className="flex flex-col">
      {/* 基本（名前 / 生年月日 / 接触経路 / 営業担当） — Card タイトル「候補者情報」が見出しを兼ねる */}
      <section className="flex flex-col gap-3 pb-4">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="名前">
            <InlineTextField
              value={profile.name}
              onSave={(v) => updateField("name", v)}
              ariaLabel="名前"
            />
          </InlineFieldRow>
          <InlineFieldRow label="生年月日">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <InlineDateField
                  value={profile.birthday}
                  onSave={(v) => updateField("birthday", v)}
                  ariaLabel="生年月日"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {calculateAge(profile.birthday)}
              </span>
            </div>
          </InlineFieldRow>
          <InlineFieldRow label="接触経路">
            <InlineComboboxField
              value={profile.source}
              options={sourceOptions}
              onSave={(v) => updateField("source", v)}
              onCreate={handleAddSource}
              ariaLabel="接触経路"
            />
          </InlineFieldRow>
          <InlineFieldRow label="営業担当">
            <InlineTextField
              value={profile.recruiter}
              onSave={(v) => updateField("recruiter", v)}
              ariaLabel="営業担当"
            />
          </InlineFieldRow>
        </dl>
      </section>

      <Separator />

      {/* 連絡先 */}
      <section className="flex flex-col gap-3 py-4">
        <SectionLabel>連絡先</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          <ContactRow
            icon={<Mail className="size-3.5" />}
            label="メールアドレス"
            color="bg-blue-100 text-blue-700"
          >
            <InlineTextField
              value={profile.email}
              onSave={(v) => updateField("email", v)}
              ariaLabel="メールアドレス"
              inputType="email"
            />
          </ContactRow>
          <ContactRow
            icon={<Phone className="size-3.5" />}
            label="電話番号"
            color="bg-emerald-100 text-emerald-700"
          >
            <InlineTextField
              value={profile.phone}
              onSave={(v) => updateField("phone", v)}
              ariaLabel="電話番号"
              inputType="tel"
            />
          </ContactRow>
          <ContactRow
            icon={<MapPin className="size-3.5" />}
            label="住所"
            color="bg-orange-100 text-orange-700"
          >
            <InlineTextField
              value={profile.address}
              onSave={(v) => updateField("address", v)}
              ariaLabel="住所"
            />
          </ContactRow>
        </ul>
      </section>

      <Separator />

      {/* 会社・職務メモ */}
      <section className="flex flex-col gap-2 py-4">
        <SectionLabel>会社・職務メモ</SectionLabel>
        <InlineTextareaField
          value={profile.careerText}
          onSave={(v) => updateField("careerText", v)}
          ariaLabel="会社・職務メモ"
        />
      </section>

      <Separator />

      {/* 営業メモ */}
      <section className="flex flex-col gap-2 pt-4">
        <SectionLabel>営業メモ</SectionLabel>
        <InlineTextareaField
          value={profile.motivationFull}
          onSave={(v) => updateField("motivationFull", v)}
          ariaLabel="営業メモ"
        />
      </section>
    </div>
  );
}

function ApplicationInfoCard({
  profile,
  setProfile,
  open,
  onOpenChange,
  candidateKey,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateKey: string;
}) {
  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="group/trigger cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          }
        >
          <CardTitle emphasis="prominent" className="flex items-center gap-2">
            <User aria-hidden="true" className="size-4 text-primary" />
            {PANE3_SECTION.applicationInfo}
          </CardTitle>
          <CardAction>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-[color,transform] group-hover/trigger:text-foreground in-data-[panel-open]:rotate-180"
            />
            <span className="sr-only">{`${PANE3_SECTION.applicationInfo}を開く`}</span>
          </CardAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <ApplicationInfoCardContent
              key={candidateKey}
              profile={profile}
              setProfile={setProfile}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ===== Card: 現時点評価（4軸スコア + 平均、AxisScoreRow を活用） =====

function EvaluationCard({ scorecards }: { scorecards: Scorecard[] }) {
  const latest = getLatestDoneScorecard(scorecards);
  if (!latest) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent" className="flex items-center gap-2">
          <Star
            aria-hidden="true"
            className="size-4 fill-current text-primary"
          />
          現時点評価 (4軸)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5">
          {AXIS_ORDER.map((axisKey) => (
            <AxisScoreRow
              key={axisKey}
              label={EVALUATION_AXIS[axisKey]}
              value={latest.axisScores[axisKey]}
            />
          ))}
          <Separator />
          <AxisScoreRow
            label="平均スコア"
            value={getScorecardsAverageScore(scorecards)}
            bold
          />
        </dl>
      </CardContent>
    </Card>
  );
}

// ===== 候補者ヘッダー（固定。Avatar + 名前 + 年齢 / スコア） =====

function CandidateHeader({
  profile,
  scorecards,
  stage,
  onChangeStage,
}: {
  profile: Profile;
  scorecards: Scorecard[];
  stage: StageKey;
  onChangeStage: (next: StageKey) => void;
}) {
  const stageTheme = STAGE_THEME[stage];
  const stageLabel = STAGE_LABELS[stage];
  const deadline = getDeadlineBadge(profile.availableStartDate);

  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-16">
        <AvatarFallback
          className={cn(
            "text-xl font-semibold",
            avatarColorFor(profile.name),
          )}
        >
          {profile.name[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-heading truncate text-xl font-semibold text-foreground">
          {profile.name || "名前未設定"}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {/* ステージバッジ自体をクリック可能にして、ドロップダウンでステージ変更 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50",
                    stageTheme.bg,
                    stageTheme.text,
                  )}
                  aria-label={`ステージ: ${stageLabel} (クリックで変更)`}
                  title="クリックでステージ変更"
                />
              }
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full bg-current", stageTheme.dot)}
              />
              {stageLabel}
              <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {STAGE_ORDER.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onSelect={() => onChangeStage(s)}
                    className={cn(
                      s === stage && "font-semibold text-primary",
                    )}
                  >
                    {s === stage && (
                      <span aria-hidden="true" className="text-primary">
                        ●
                      </span>
                    )}
                    <span>{STAGE_LABELS[s]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {profile.birthday && <span>{calculateAge(profile.birthday)}</span>}
          {profile.birthday && <span aria-hidden="true">·</span>}
          <ScoreLabel value={getScorecardsAverageScore(scorecards)} />
          {deadline && (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium",
                  deadline.className,
                )}
              >
                次回: {deadline.text}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Pane 3 メイン =====

export function CandidateDashboardPane({
  profile,
  scorecards,
  stage,
  setProfile,
  applicationInfoOpen,
  onApplicationInfoOpenChange,
  selectedCandidateId,
  onChangeStage,
}: {
  profile: Profile;
  scorecards: Scorecard[];
  stage: StageKey;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  applicationInfoOpen: boolean;
  onApplicationInfoOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
  /** ステージバッジドロップダウンからのステージ変更要求 */
  onChangeStage: (next: StageKey) => void;
}) {
  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <CandidateHeader
            profile={profile}
            scorecards={scorecards}
            stage={stage}
            onChangeStage={onChangeStage}
          />

          <ApplicationInfoCard
            profile={profile}
            setProfile={setProfile}
            open={applicationInfoOpen}
            onOpenChange={onApplicationInfoOpenChange}
            candidateKey={selectedCandidateId}
          />

          <EvaluationCard scorecards={scorecards} />

          {/* key={selectedCandidateId} で候補者切替時に remount。
              これがないと InlineTextField (uncontrolled) の defaultValue
              変更が無視され、Base UI が console.warn を出す。 */}
          <RecruitingConditionsCard
            key={selectedCandidateId}
            profile={profile}
            setProfile={setProfile}
          />
        </div>
      </ScrollArea>
    </section>
  );
}
