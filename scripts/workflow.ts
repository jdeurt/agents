import { workflowMain } from "../plugins/meta/skills/workflow-execution/scripts/workflow.ts";

await workflowMain(Bun.argv.slice(2));
