import { workflowMain } from "../plugins/meta/skills/graph-workflows/scripts/workflow.ts";

await workflowMain(Bun.argv.slice(2));
