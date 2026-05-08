process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const toolArgs = JSON.parse(input);
  const toolName = toolArgs.tool_name || "";
  const toolInput = toolArgs.tool_input || {};

  // Block Read tool targeting .env
  if (toolName === "Read") {
    const filePath = toolInput.file_path || "";
    if (/\.env(\b|$)/.test(filePath)) {
      console.error("You cannot read the .env file");
      process.exit(2);
    }
  }

  // Block Bash commands that reference .env
  if (toolName === "Bash") {
    const command = toolInput.command || "";
    if (/\.env(\b|$)/.test(command)) {
      console.error("You cannot read the .env file");
      process.exit(2);
    }
  }

  process.exit(0);
});
