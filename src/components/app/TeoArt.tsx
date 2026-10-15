import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Teo em vetor, com partes separadas para animar (olhos, sobrancelhas, mão).
 * Redesenhado a partir da ilustração original; fonte também em docs/marca/svg/teo.svg.
 *
 * Humores:
 * - "cheer": balança o joinha ao aparecer (marcos, conquistas)
 * - "tip": levanta as sobrancelhas (dicas e constatações)
 * - "neutral": só pisca de vez em quando
 * Todos piscam algumas vezes e param; nada fica em loop infinito.
 */
export type TeoMood = "neutral" | "cheer" | "tip";

const OUTLINE = "#2E5F50";
const FACE = "M292 300 L294 540 Q300 642 425 642 L592 634 Q690 626 688 522 L668 270 Z";

export function TeoArt({
  mood = "neutral",
  animate = true,
  className,
  title = "Teo, assistente do Tanque+",
}: {
  mood?: TeoMood;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  // Ids únicos por instância: vários Teos na mesma tela não compartilham recortes.
  const uid = useId().replace(/:/g, "");
  const circle = `${uid}-circle`;
  const head = `${uid}-head`;

  return (
    <svg
      viewBox="54 52 916 916"
      role="img"
      aria-label={title}
      className={cn("teo", animate && `teo-animate teo-${mood}`, className)}
    >
      <defs>
        <clipPath id={circle}>
          <circle cx="512" cy="510" r="458" />
        </clipPath>
        <clipPath id={head}>
          <path d={FACE} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${circle})`}>
        {/* fundo */}
        <rect width="1024" height="1024" fill="#ECEEE9" />
        <g strokeLinejoin="round">
          <path
            d="M70 650 L160 490 L330 640 L330 1024 L70 1024 Z"
            fill="#E1EAE2"
            stroke="#E1EAE2"
            strokeWidth={70}
          />
          <path
            d="M620 660 L860 480 L1040 600 L1040 1024 L560 1024 Z"
            fill="#D2E1D7"
            stroke="#D2E1D7"
            strokeWidth={90}
          />
          <path
            d="M700 300 L790 240 L900 320 L900 420 L760 420 Z"
            fill="#E4ECE6"
            stroke="#E4ECE6"
            strokeWidth={80}
          />
        </g>

        {/* corpo */}
        <path
          d="M150 830 Q205 690 330 648 L402 645 Q410 712 490 714 Q574 712 584 638 L650 650 Q770 705 880 820 L880 1024 L150 1024 Z"
          fill="#509179"
          stroke={OUTLINE}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        <path d="M300 915 L360 792" stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" />
        <path
          d="M402 640 Q408 706 490 709 Q572 707 582 636 Z"
          fill="#D6CFBD"
          stroke={OUTLINE}
          strokeWidth={7}
          strokeLinejoin="round"
        />

        {/* cabeça */}
        <g className="teo-head">
          <circle cx="292" cy="452" r="46" fill="#CFC8B6" stroke={OUTLINE} strokeWidth={7} />
          <circle cx="300" cy="452" r="26" fill="#B9B19C" opacity={0.55} />
          <path d={FACE} fill="#E4E2D6" />
          <path
            clipPath={`url(#${head})`}
            d="M280 360 L348 380 Q338 560 440 640 L280 660 Z"
            fill="#D3CCBD"
          />
          <path
            d="M292 300 L294 540 Q300 642 425 642 L592 634 Q690 626 688 522 L668 270"
            fill="none"
            stroke={OUTLINE}
            strokeWidth={7}
            strokeLinejoin="round"
          />
          <path
            d="M292 412 L276 300 Q270 238 330 232 Q338 182 396 166 L732 140 Q750 139 746 176 Q738 238 694 262 Q610 292 380 272 Q386 342 348 398 Z"
            fill="#36645A"
            stroke={OUTLINE}
            strokeWidth={6}
            strokeLinejoin="round"
          />

          <g
            className="teo-brows"
            stroke={OUTLINE}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          >
            <path d="M420 376 Q440 349 486 350" />
            <path d="M580 338 Q624 332 648 358" />
          </g>

          <g className="teo-eyes">
            <path d="M428 412 Q462 406 496 414 L496 440 Q462 434 428 440 Z" fill="#FFFFFF" />
            <circle cx="461" cy="423" r="13" fill="#2F5A50" />
            <path d="M580 406 Q614 400 650 410 L650 434 Q614 428 580 434 Z" fill="#FFFFFF" />
            <circle cx="603" cy="416" r="13" fill="#2F5A50" />
          </g>
          <g stroke="#B5B19E" strokeWidth={7} strokeLinecap="round" fill="none">
            <path d="M430 441 Q462 433 497 443" />
            <path d="M582 436 Q614 428 650 436" />
          </g>

          <path
            d="M548 396 Q566 440 576 470 Q580 490 540 488"
            stroke={OUTLINE}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <g stroke={OUTLINE} strokeWidth={7} strokeLinecap="round" fill="none">
            <path d="M437 505 Q440 490 463 488" />
            <path d="M462 505 Q528 546 592 521" />
            <path d="M520 551 Q536 557 553 550" />
          </g>
        </g>

        {/* mão com joinha: gira a partir do punho */}
        <g className="teo-thumb">
          <path
            d="M760 760 Q820 790 880 850 L880 1024 L720 1024 Q760 900 760 760 Z"
            fill="#436F5F"
          />
          <path
            d="M682 706 L692 642 Q700 620 718 625 Q730 633 723 680 L746 718 Q802 758 799 822 Q796 862 740 864 L652 862 Q622 858 626 836 Q600 826 610 802 Q596 782 608 760 Q600 734 616 718 Q632 703 682 706 Z"
            fill="#E5E1D6"
            stroke={OUTLINE}
            strokeWidth={7}
            strokeLinejoin="round"
          />
          <path d="M728 860 Q770 850 790 812 L798 822 Q796 862 740 864 Z" fill="#C9C2AF" />
          <g stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" fill="none">
            <path d="M612 760 Q640 768 660 758" />
            <path d="M612 802 Q640 810 662 800" />
          </g>
        </g>
      </g>
    </svg>
  );
}
