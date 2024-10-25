import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import UnoCSS from "unocss/vite";

const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 13213;

export default defineConfig({
  plugins: [UnoCSS(), solidPlugin()],
  server: {
    host: SERVER_HOST,
    port: SERVER_PORT,
  },
  build: {
    target: "esnext",
  },
});
