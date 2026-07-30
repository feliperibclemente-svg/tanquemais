/**
 * Design System do Tanque+.
 *
 * Regra do projeto: telas importam SOMENTE daqui (`@/components/ds`).
 * Nada de classes de cor cruas nem botões montados à mão nas rotas.
 *
 * - Ação/ActionLink ....... botões e links de ação (primary, secondary, soft, ghost, danger)
 * - ChoiceGroup ........... chips de seleção única
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
export { TextField, SelectField, ToggleRow } from "./field";
export { ConfirmAction } from "./confirm";
export { NumericField, parseDecimal, maskDecimal, maskInteger } from "@/components/app/NumericField";
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
