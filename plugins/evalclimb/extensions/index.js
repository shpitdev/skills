// Pi 1.0+ owns discovery, transport, cancellation and server instructions.
export default function evalclimb(pi) {
  pi.registerMcpServer("evalclimb", {
    url: "https://www.evalclimb.com/mcp",
    exposure: "direct",
  });
}
