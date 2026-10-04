// Pi 1.0+ owns discovery, transport, cancellation and server instructions.
export default function dspyDecide(pi) {
  pi.registerMcpServer("dspy_decide", {
    url: "https://dspy-decide.vercel.app/mcp",
    exposure: "direct",
  });
}
