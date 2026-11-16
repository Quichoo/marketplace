"use client";

import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import { CATEGORIES } from "@/lib/constants";

export function CategoryFilter({ active }: { active: string | undefined }) {
  const router = useRouter();

  function select(category: string | undefined) {
    router.push(category ? `/?category=${encodeURIComponent(category)}` : "/");
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 3, flexWrap: "wrap" }}>
      <Chip
        label="All"
        clickable
        color={active === undefined ? "primary" : "default"}
        onClick={() => select(undefined)}
      />
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={category}
          clickable
          color={active === category ? "primary" : "default"}
          onClick={() => select(category)}
        />
      ))}
    </Stack>
  );
}
