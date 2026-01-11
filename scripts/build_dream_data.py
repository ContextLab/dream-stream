#!/usr/bin/env python3
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
NARRATIVES_DIR = SCRIPT_DIR / "narratives"
METADATA_PATH = NARRATIVES_DIR / "metadata.json"
OUTPUT_PATH = SCRIPT_DIR.parent / "lib" / "dreamData.ts"


def build_dream_data():
    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    categories = metadata["categories"]
    dreams = metadata["dreams"]

    output_lines = []

    output_lines.append(
        "import type { Category, DreamListItem, Dream, MusicStyle } from '@/types/database';"
    )
    output_lines.append("")
    output_lines.append("export const CATEGORIES: Category[] = [")

    for cat in categories:
        output_lines.append(f"  {{")
        output_lines.append(f"    id: '{cat['id']}',")
        output_lines.append(f"    name: '{cat['name']}',")
        output_lines.append(f"    slug: '{cat['slug']}',")
        output_lines.append(f"    color: '{cat['color']}',")
        output_lines.append(f"    icon: '{cat['icon']}',")
        output_lines.append(f"    sort_order: {cat['sort_order']},")
        output_lines.append(f"  }},")

    output_lines.append("];")
    output_lines.append("")
    output_lines.append("interface DreamContent {")
    output_lines.append("  title: string;")
    output_lines.append("  music: MusicStyle;")
    output_lines.append("  content: string;")
    output_lines.append("  categoryId?: string;")
    output_lines.append("}")
    output_lines.append("")
    output_lines.append("const DREAM_SCRIPTS: DreamContent[] = [")

    for i, dream in enumerate(dreams):
        narrative_path = NARRATIVES_DIR / dream["file"]
        if not narrative_path.exists():
            print(f"Warning: {dream['file']} not found, skipping")
            continue

        with open(narrative_path, "r") as f:
            content = f.read().strip()

        content_escaped = (
            content.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
        )

        title_escaped = dream["title"].replace("'", "\\'")
        output_lines.append("  {")
        output_lines.append(f"    title: '{title_escaped}',")
        output_lines.append(f"    music: '{dream['music']}',")
        output_lines.append(f"    content: `{content_escaped}`,")
        if dream.get("categoryId"):
            output_lines.append(f"    categoryId: '{dream['categoryId']}',")
        output_lines.append("  },")

    output_lines.append("];")
    output_lines.append("")

    output_lines.append("function estimateDuration(text: string): number {")
    output_lines.append("  const wordCount = text.split(/\\s+/).length;")
    output_lines.append("  return Math.round(wordCount / 2.5);")
    output_lines.append("}")
    output_lines.append("")
    output_lines.append("function generateDreams(): DreamListItem[] {")
    output_lines.append("  return DREAM_SCRIPTS.map((dream, index) => {")
    output_lines.append("    const category = dream.categoryId")
    output_lines.append(
        "      ? CATEGORIES.find((c) => c.id === dream.categoryId) || CATEGORIES[index % CATEGORIES.length]"
    )
    output_lines.append("      : CATEGORIES[index % CATEGORIES.length];")
    output_lines.append("    const summaryText = dream.content.split('\\n\\n')[0];")
    output_lines.append("")
    output_lines.append("    return {")
    output_lines.append("      id: `dream-${index + 1}`,")
    output_lines.append("      title: dream.title,")
    output_lines.append(
        "      preview_duration_seconds: estimateDuration(summaryText),"
    )
    output_lines.append("      full_duration_seconds: estimateDuration(dream.content),")
    output_lines.append("      is_featured: index < 5,")
    output_lines.append("      category: {")
    output_lines.append("        name: category.name,")
    output_lines.append("        slug: category.slug,")
    output_lines.append("        color: category.color,")
    output_lines.append("      },")
    output_lines.append("    };")
    output_lines.append("  });")
    output_lines.append("}")
    output_lines.append("")
    output_lines.append("export const DREAMS: DreamListItem[] = generateDreams();")
    output_lines.append("")
    output_lines.append("export function getDreamById(id: string): Dream | null {")
    output_lines.append("  const index = DREAMS.findIndex((d) => d.id === id);")
    output_lines.append("  if (index === -1) return null;")
    output_lines.append("")
    output_lines.append("  const listItem = DREAMS[index];")
    output_lines.append("  const dreamScript = DREAM_SCRIPTS[index];")
    output_lines.append("  const category = dreamScript.categoryId")
    output_lines.append(
        "    ? CATEGORIES.find((c) => c.id === dreamScript.categoryId) || CATEGORIES[index % CATEGORIES.length]"
    )
    output_lines.append("    : CATEGORIES[index % CATEGORIES.length];")
    output_lines.append("")
    output_lines.append("  return {")
    output_lines.append("    id: listItem.id,")
    output_lines.append("    title: listItem.title,")
    output_lines.append("    summary: dreamScript.content.split('\\n\\n')[0],")
    output_lines.append("    content: dreamScript.content,")
    output_lines.append("    voice_id: 'alloy',")
    output_lines.append("    default_music: {")
    output_lines.append("      style: dreamScript.music,")
    output_lines.append("      base_intensity: 0.4,")
    output_lines.append("      adaptive: true,")
    output_lines.append("    },")
    output_lines.append(
        "    preview_duration_seconds: listItem.preview_duration_seconds,"
    )
    output_lines.append("    full_duration_seconds: listItem.full_duration_seconds,")
    output_lines.append("    play_count: Math.floor(Math.random() * 10000) + 100,")
    output_lines.append("    is_featured: listItem.is_featured,")
    output_lines.append("    category_id: category.id,")
    output_lines.append("    category,")
    output_lines.append("    tags: ['relaxing', category.slug],")
    output_lines.append(
        "    created_at: new Date(Date.now() - index * 86400000).toISOString(),"
    )
    output_lines.append("  };")
    output_lines.append("}")
    output_lines.append("")
    output_lines.append(
        "export function searchDreams(query: string): DreamListItem[] {"
    )
    output_lines.append("  const lowerQuery = query.toLowerCase();")
    output_lines.append("  return DREAMS.filter((dream, index) => {")
    output_lines.append(
        "    if (dream.title.toLowerCase().includes(lowerQuery)) return true;"
    )
    output_lines.append(
        "    if (dream.category?.name.toLowerCase().includes(lowerQuery)) return true;"
    )
    output_lines.append("    const script = DREAM_SCRIPTS[index];")
    output_lines.append(
        "    if (script?.content.toLowerCase().includes(lowerQuery)) return true;"
    )
    output_lines.append("    return false;")
    output_lines.append("  });")
    output_lines.append("}")
    output_lines.append("")

    output = "\n".join(output_lines)

    with open(OUTPUT_PATH, "w") as f:
        f.write(output)

    print(
        f"Generated {OUTPUT_PATH} with {len(dreams)} dreams and {len(categories)} categories"
    )


if __name__ == "__main__":
    build_dream_data()
