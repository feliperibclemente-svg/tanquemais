/**
 * Design System do Tanque+.
 *
 * Regra do projeto: telas importam SOMENTE daqui (`@/components/ds`).
 * Nada de classes de cor cruas nem botões montados à mão nas rotas.
 *
 * - Ação/ActionLink ....... botões e links de ação (primary, secondary, soft, ghost, danger)
 * - ChoiceGroup ........... chips de seleção única
 * - BrandModelFields ...... marca e modelo pelo catálogo, com opção "Outra"
 * - TextField/SelectField . campos de formulário
 * - ToggleRow ............. linha de ligar/desligar
 * - NumericField .......... campo numérico grande (abastecimento)
 * - AppCard/PageHeader .... superfícies e cabeçalhos
 * - EmptyState ............ estados vazios
 * - Skeletons ............. carregamento
 * - ConfirmAction ......... confirmação de ação destrutiva
 */
export { Action, ActionLink, actionVariants } from "./action";
export { ChoiceGroup } from "./choice";
export { TextField, TextAreaField, SelectField, ToggleRow } from "./field";
export { ConfirmAction } from "./confirm";
export {
  NumericField,
  parseDecimal,
  maskDecimal,
  maskCents,
  formatCents,
  maskInteger,
} from "@/components/app/NumericField";
export {
  AppCard,
  PageHeader,
  SectionHeader,
  StatTile,
  EmptyState,
  CardSkeleton,
  ScreenSkeleton,
} from "@/components/app/Surface";
export { AppShell } from "@/components/app/AppShell";
export { BrandModelFields } from "@/components/app/BrandModelFields";
export { PrimaryStar } from "@/components/app/PrimaryStar";
export { InstallCard } from "@/components/app/InstallCard";
export { MomentCard } from "@/components/app/MomentCard";
export { Shortcuts } from "@/components/app/Shortcuts";
export { CheapestNearby } from "@/components/app/CheapestNearby";
export { InviteButton } from "@/components/app/InviteButton";
export { BrandMark, Logo, BRAND_GREEN } from "@/components/app/Logo";
export { TeoAvatar, TeoSays } from "@/components/app/Teo";
export { TeoArt } from "@/components/app/TeoArt";
export { ErrorState } from "@/components/app/ErrorState";
export { VerdictCard, VerdictPill } from "@/components/app/Verdict";
