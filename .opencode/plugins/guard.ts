import { checkToolCall, type ToolArgs } from "../guard/rules";

/**
 * Plugin de OpenCode: antes de ejecutar cualquier herramienta revisa si toca una zona
 * prohibida o sale de la carpeta del proyecto (ver `.opencode/guard/rules.ts`).
 * Lanzar un Error cancela la herramienta y el mensaje le llega al modelo.
 *
 * Soporta los dos formatos de plugin de OpenCode:
 *  - 2.x: `export default` con `id` y `setup(ctx)`; hook `ctx.tool.hook("execute.before", …)`.
 *  - 1.x: módulo con `server`, hook `tool.execute.before`.
 */

/** Hook de OpenCode 1.x. */
type LegacyBeforeHook = (input: { tool: string }, output: { args?: ToolArgs }) => Promise<void>;

/** Lo mínimo que se usa del contexto de OpenCode 2.x. */
interface V2Context {
  location: { directory: string };
  tool: {
    hook: (
      name: "execute.before",
      callback: (event: { tool: string; input: ToolArgs }) => void,
    ) => Promise<object>;
  };
}

function enforce(tool: string, args: ToolArgs | undefined, directory: string): void {
  const reason = checkToolCall(tool, args ?? {}, directory);
  if (reason) {
    throw new Error(reason);
  }
}

export const Guard = async ({
  directory,
}: {
  directory: string;
}): Promise<{ "tool.execute.before": LegacyBeforeHook }> => ({
  "tool.execute.before": async (input, output) => {
    enforce(input.tool, output.args, directory);
  },
});

const guardPlugin = {
  id: "guard",
  server: Guard,
  async setup(ctx: V2Context): Promise<void> {
    await ctx.tool.hook("execute.before", (event) => {
      enforce(event.tool, event.input, ctx.location.directory);
    });
  },
};

export default guardPlugin;
