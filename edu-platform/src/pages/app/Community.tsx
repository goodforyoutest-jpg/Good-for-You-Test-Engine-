import { useState } from "react";
import { MessageSquareText, ThumbsUp, Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Post = { id: string; author: string; text: string; likes: number };

const seed: Post[] = [
  { id: "p1", author: "Mina", text: "Shadowing tip: keep the pace slow, but match intonation first.", likes: 18 },
  { id: "p2", author: "Jun", text: "For listening: replay one sentence until you can predict the next word.", likes: 11 },
];

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(seed);
  const [text, setText] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-white/60">Community</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">Learn with others</h1>
        <div className="mt-2 text-sm text-white/65">Posts, tips, and friendly accountability.</div>
      </div>

      <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <MessageSquareText className="h-4 w-4 text-[color:var(--accent)]" />
          Share a tip
        </div>
        <div className="mt-4 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="What helped you today?" />
          <Button
            disabled={text.trim().length < 3}
            onClick={() => {
              const post: Post = { id: `p_${Date.now()}`, author: "You", text: text.trim(), likes: 0 };
              setPosts([post, ...posts]);
              setText("");
            }}
          >
            <Send className="h-4 w-4" />
            Post
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-white">{p.author}</div>
              <button type="button" className="text-white/40 hover:text-white">
                <Flag className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 text-sm text-white/70">{p.text}</div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPosts(posts.map((x) => (x.id === p.id ? { ...x, likes: x.likes + 1 } : x)))}
              >
                <ThumbsUp className="h-4 w-4" />
                {p.likes}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

