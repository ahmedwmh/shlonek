/** One segmented-control look for every admin tab bar (pass to TabsList / TabsTrigger). */
export const segmentedTabs = {
  list: "h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto",
  trigger:
    "h-9 shrink-0 grow-0 gap-1.5 rounded-lg px-3.5 text-sm text-muted-foreground data-[state=active]:bg-background data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  count: "rounded-full bg-foreground/8 px-1.5 text-[0.7rem] tabular-nums",
} as const;
