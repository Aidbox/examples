"use client";

import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SyncButton({
  onClickAction,
}: {
  onClickAction: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={refreshing}
      onClick={() => {
        setRefreshing(true);
        onClickAction().finally(() => setRefreshing(false));
      }}
    >
      <RefreshCwIcon
        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
      />
    </Button>
  );
}
