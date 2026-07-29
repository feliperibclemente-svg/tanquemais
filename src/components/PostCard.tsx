import { Bookmark, Flag, Heart, MessageCircle, Share2, ShieldCheck } from "lucide-react";
import { Card } from "./MobileShell";
import { brl, num } from "@/lib/tanque";
import { reliability, timeAgo, type CommunityPost } from "@/lib/community";

export function PostCard({
  post,
  liked,
  saved,
  reported,
  onLike,
  onSave,
  onReport,
  onShare,
  onConfirm,
}: {
  post: CommunityPost;
  liked: boolean;
  saved: boolean;
  reported: boolean;
  onLike: () => void;
  onSave: () => void;
  onReport: () => void;
  onShare: () => void;
  onConfirm: () => void;
}) {
  const rel = reliability(post.confirmations);
  const priceOnly = post.visibility === "somente-preco";

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {post.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {post.author}
            {post.mine ? " (você)" : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {post.city} · {timeAgo(post.createdAt)}
            {post.club ? ` · ${post.club}` : ""}
          </p>
        </div>
        {priceOnly ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            só preço
          </span>
        ) : null}
      </div>

      {post.photo ? (
        <div className="h-32 rounded-2xl bg-[linear-gradient(135deg,var(--primary-soft),var(--muted))]" />
      ) : null}

      <div className="rounded-2xl bg-muted p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{post.station}</p>
            <p className="text-xs text-muted-foreground">{post.fuel}</p>
          </div>
          <p className="text-lg font-semibold text-primary">{brl(post.pricePerLiter)}/L</p>
        </div>

        {!priceOnly && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="Abastecido" value={post.amountPaid ? brl(post.amountPaid) : "—"} />
            <Mini label="Consumo" value={post.kmPerLiter ? `${num(post.kmPerLiter)} km/L` : "—"} />
            <Mini label="Economia" value={post.savings ? brl(post.savings) : "—"} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Atualizado {timeAgo(post.createdAt)} · {post.confirmations} confirmações · confiabilidade{" "}
          <span className="font-medium text-foreground">{rel.label}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${rel.pct}%` }} />
        </div>
        <button
          onClick={onConfirm}
          className="mt-3 w-full rounded-2xl border border-primary/40 bg-card px-4 py-2 text-xs font-semibold text-primary"
        >
          Confirmar este preço
        </button>
      </div>

      {post.comment ? <p className="text-sm text-muted-foreground">{post.comment}</p> : null}

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <Action
          active={liked}
          onClick={onLike}
          icon={<Heart className="h-4 w-4" />}
          label={String(post.likes + (liked ? 1 : 0))}
        />
        <Action
          icon={<MessageCircle className="h-4 w-4" />}
          label={String(post.comments)}
          onClick={() => {}}
        />
        <Action icon={<Share2 className="h-4 w-4" />} label="Compartilhar" onClick={onShare} />
        <Action
          active={saved}
          icon={<Bookmark className="h-4 w-4" />}
          label="Salvar"
          onClick={onSave}
        />
        <Action
          active={reported}
          icon={<Flag className="h-4 w-4" />}
          label={reported ? "Reportado" : "Reportar"}
          onClick={onReport}
        />
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
