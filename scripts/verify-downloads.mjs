import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
const endpoint = process.argv[2];
const path = resolve("artifacts/downloads");
mkdirSync(path, { recursive: true });
const socket = new WebSocket(endpoint);
let done = 0;
socket.addEventListener("open", () =>
   socket.send(
      JSON.stringify({
         id: 1,
         method: "Browser.setDownloadBehavior",
         params: { behavior: "allow", downloadPath: path, eventsEnabled: true },
      }),
   ),
);
socket.addEventListener("message", e => {
   const msg = JSON.parse(e.data);
   if (msg.method?.startsWith("Browser.download")) {
      console.log(JSON.stringify(msg));
      if (msg.params.state === "completed" && ++done === 2) socket.close();
   } else if (msg.id === 1) console.log("Download capture configured", JSON.stringify(msg));
});
setTimeout(() => socket.close(), 90000);
